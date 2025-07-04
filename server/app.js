const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { createGameState, gameLoop, generateNewMap } = require('./game');
const { Berserker, Ninja, King } = require('./character');
const { M4, Sniper, Pistol, Shotgun } = require('./weapon');
const { MAP_RADIUS, FRAME_RATE } = require('./constants');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const state = {};
const clientRooms = {};
const gameIntervals = {};

const FREE_FOR_ALL_ROOM = 'freeForAll';

app.use(express.static(path.join(__dirname, '../client')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

function makeID(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

function createPlayer(characterType, weaponType, playerNumber, id, spawnX = null, spawnY = null) {
    const validCharacters = ['berserker', 'ninja', 'king'];
    const validWeapons = ['m4', 'shotgun', 'pistol'];
    
    const charType = validCharacters.includes(characterType?.toLowerCase()) ? characterType.toLowerCase() : 'berserker';
    const weapType = validWeapons.includes(weaponType?.toLowerCase()) ? weaponType.toLowerCase() : 'm4';
    
    let weapon;
    switch(weapType) {
        case 'm4':
            weapon = new M4();
            break;
        case 'shotgun':
            weapon = new Shotgun();
            break;
        case 'pistol':
            weapon = new Pistol();
            break;
        default:
            weapon = new M4();
    }

    const baseOptions = {
        x: playerNumber === 1 ? -MAP_RADIUS + 50 : playerNumber === 2 ? MAP_RADIUS - 50 : spawnX,
        y: playerNumber === 1 ? 0 : playerNumber === 2 ? 0 : spawnY,
        id: id,
        primaryWeapon: weapon,
        spawnX: playerNumber === 1 ? -MAP_RADIUS + 50 : playerNumber === 2 ? MAP_RADIUS - 50 : spawnX,
        spawnY: playerNumber === 1 ? 0 : playerNumber === 2 ? 0 : spawnY
    };
    
    switch (charType) {
        case 'ninja':
            return new Ninja(baseOptions);
        case 'king':
            return new King(baseOptions);
        default:
            return new Berserker(baseOptions);
    }
}

function findAvailableRoom() {
    for (const roomName in state) {
        if (state[roomName].players.length === 1) {
            return roomName;
        }
    }
    return null;
}

function getRandomPlayerNumber() {
    return Math.floor(Math.random() * 1000) + 3; // Start from 3 to avoid conflicts with 1v1 mode
}

function getRandomSpawnPosition() {
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * (MAP_RADIUS - 100) + 50;
    return {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance
    };
}

io.on('connection', (socket) => {
    socket.on('findGame', (data) => handleFindGame(socket, data));
    socket.on('findFreeForAll', (data) => handleFindFreeForAll(socket, data));
    socket.on('keydown', (key) => handleKeydown(socket, key));
    socket.on('keyup', (key) => handleKeyup(socket, key));
    socket.on('changeAngle', (angle) => handleChangeAngle(socket, angle));
    socket.on('mouseDown', (button) => handleMouseDown(socket, button));
    socket.on('mouseUp', (button) => handleMouseUp(socket, button));
    
    function handleFindGame(client, data) {
        // Check if player is already in a room or searching for a match
        if (clientRooms[client.id]) {
            client.emit('error', 'Already in a match or searching for one');
            return;
        }
        
        // First, try to find an existing room with 1 player
        let roomName = findAvailableRoom();
        
        if (roomName) {
            // Join existing room as player 2
            clientRooms[client.id] = roomName;
            client.join(roomName);
            client.number = 2;
            
            const player = createPlayer(data?.characterType, data?.weaponType, 2, client.id);
            state[roomName].players.push(player);
            
            client.emit('init', 2);
            client.emit('gameFound', roomName);
            
            // Notify both players that the game is starting
            io.sockets.in(roomName).emit('gameStarting');
            startGameInterval(roomName);
        } else {
            // Create new room as player 1
            roomName = makeID(5);
            clientRooms[client.id] = roomName;
            
            state[roomName] = createGameState();
            // Generate obstacles for the new room
            state[roomName].obstacles = generateNewMap();
            
            const player = createPlayer(data?.characterType, data?.weaponType, 1, client.id);
            state[roomName].players.push(player);

            client.join(roomName);
            client.number = 1;
            client.emit('init', 1);
            client.emit('gameFound', roomName);
            client.emit('waitingForPlayer');
        }
    }

    function handleFindFreeForAll(client, data) {
        if (clientRooms[client.id]) {
            client.emit('error', 'Already in a match');
            console.log('Already in a match');
            return;
        }

        if (!state[FREE_FOR_ALL_ROOM]) {
            state[FREE_FOR_ALL_ROOM] = createGameState();
            state[FREE_FOR_ALL_ROOM].obstacles = generateNewMap();
            state[FREE_FOR_ALL_ROOM].gameMode = 'freeForAll';
            startGameInterval(FREE_FOR_ALL_ROOM);
        }

        clientRooms[client.id] = FREE_FOR_ALL_ROOM;
        client.join(FREE_FOR_ALL_ROOM);
        client.number = getRandomPlayerNumber();

        const spawnPos = getRandomSpawnPosition();
        const player = createPlayer(data?.characterType, data?.weaponType, client.number, client.id, spawnPos.x, spawnPos.y);
        player.randomSpawn(state[FREE_FOR_ALL_ROOM]);
        state[FREE_FOR_ALL_ROOM].players.push(player);

        client.emit('init', client.number);
        client.emit('gameFound', FREE_FOR_ALL_ROOM);
        client.emit('gameStarting');
        client.emit('freeForAllJoined', { 
            playerCount: state[FREE_FOR_ALL_ROOM].players.length 
        });

        io.sockets.in(FREE_FOR_ALL_ROOM).emit('playerJoined', {
            playerCount: state[FREE_FOR_ALL_ROOM].players.length,
            playerId: client.id
        });
    }

    function handleChangeAngle(client, angle) {
        const player = findPlayer(client);

        if(player) {
            player.angle = angle;
        }
    }

    function handleKeydown(client, key) {
        const player = findPlayer(client);

        if(player) {
            if(!player.inputs) player.inputs = {};
            player.inputs[key] = true;
        }
    }
    
    function handleKeyup(client, key) {
        const player = findPlayer(client);
        
        if(player) {
            if(!player.inputs) player.inputs = {};
            player.inputs[key] = false;
        }
    }

    function handleMouseDown(client, button) {
        const player = findPlayer(client);

        if(player) {
            player.isFiring = true;
        }
    }

    function handleMouseUp(client, button) {
        const player = findPlayer(client);

        if(player) {
            player.isFiring = false;
        }
    }

    function findPlayer(client) {
        const roomName = clientRooms[client.id];
        if(!roomName || !state[roomName]) {
            return null;
        }
        return state[roomName].players.find(p => p.id === client.id);
    } 

    socket.on('disconnect', () => {
        const roomName = clientRooms[socket.id];
        if(roomName) {
            if (roomName === FREE_FOR_ALL_ROOM) {
                // Handle free for all disconnect
                if (state[roomName] && state[roomName].players) {
                    state[roomName].players = state[roomName].players.filter(p => p.id !== socket.id);
                    
                    // Notify remaining players
                    io.sockets.in(roomName).emit('playerLeft', {
                        playerCount: state[roomName].players.length,
                        playerId: socket.id
                    });
                    
                    // Don't close free for all room, just remove the player
                }
            } else {
                // Handle 1v1 disconnect (original logic)
                if(state[roomName] && state[roomName].players) {
                    state[roomName].players.forEach(player => {
                        delete clientRooms[player.id];
                    });
                }
                
                // Close the room when any player leaves
                if(gameIntervals[roomName]) {
                    clearInterval(gameIntervals[roomName]);
                    delete gameIntervals[roomName];
                }
                
                // Notify remaining players that opponent disconnected
                if(state[roomName]) {
                    io.sockets.in(roomName).emit('opponentLeft');
                }
                
                // Clean up room state
                delete state[roomName];
            }
            
            delete clientRooms[socket.id];
        }
    });
});

function startGameInterval(gameCode) {
    if(gameIntervals[gameCode]) {
        return;
    }
    
    let lastTime = Date.now();
    const intervalID = setInterval(() => {
        if(!state[gameCode]) {
            clearInterval(intervalID);
            delete gameIntervals[gameCode];
            return;
        }
        
        const currentTime = Date.now();
        const deltaTime = (currentTime - lastTime) / 40; 
        lastTime = currentTime;
        
        gameLoop(state[gameCode], deltaTime, io);
        emitGameState(gameCode, state[gameCode]);
    }, 1000 / FRAME_RATE);
    
    gameIntervals[gameCode] = intervalID;
}

function emitGameState(gameCode, gameState) {
    io.sockets.in(gameCode).emit('gameState', JSON.stringify(gameState));
}

// start server
const port = 3000;
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});