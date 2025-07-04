const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const msgpack = require('msgpack-lite');
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

const CHARACTER_CLASSES = {
    ninja: Ninja,
    king: King,
    berserker: Berserker
};

const WEAPON_CLASSES = {
    m4: M4,
    shotgun: Shotgun,
    pistol: Pistol
};

const VALID_CHARACTERS = Object.keys(CHARACTER_CLASSES);
const VALID_WEAPONS = Object.keys(WEAPON_CLASSES);

// 1v1 spawns
const SPAWN_POSITIONS = {
    1: { x: -MAP_RADIUS + 50, y: 0 },
    2: { x: MAP_RADIUS - 50, y: 0 }
};

// Rate limiting configuration
const RATE_LIMITS = {
    findGame: { maxRequests: 5, windowMs: 60000 }, // 5 requests per minute
    findFreeForAll: { maxRequests: 5, windowMs: 60000 }, // 5 requests per minute
    keydown: { maxRequests: 100, windowMs: 1000 }, // 100 requests per second
    keyup: { maxRequests: 100, windowMs: 1000 }, // 100 requests per second
    changeAngle: { maxRequests: 360, windowMs: 1000 }, // 360 requests per second
    mouseDown: { maxRequests: 30, windowMs: 1000 }, // 30 requests per second
    mouseUp: { maxRequests: 30, windowMs: 1000 } // 30 requests per second
};

// Rate limiting storage
const rateLimitStore = new Map();

function isRateLimited(socketId, eventType) {
    const key = `${socketId}:${eventType}`;
    const now = Date.now();
    const limit = RATE_LIMITS[eventType];
    
    if (!limit) return false;
    
    if (!rateLimitStore.has(key)) {
        rateLimitStore.set(key, { count: 1, resetTime: now + limit.windowMs });
        return false;
    }
    
    const record = rateLimitStore.get(key);
    
    if (now > record.resetTime) {
        record.count = 1;
        record.resetTime = now + limit.windowMs;
        return false;
    }
    
    if (record.count >= limit.maxRequests) {
        return true;
    }
    
    record.count++;
    return false;
}


setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
        if (now > record.resetTime) {
            rateLimitStore.delete(key);
        }
    }
}, 60000); 

app.use(express.static(path.join(__dirname, '../client')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});


const ID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const ID_CHARS_LENGTH = ID_CHARS.length;

function makeID(length) {
    let result = '';
    for (let i = 0; i < length; i++) {
        result += ID_CHARS[Math.floor(Math.random() * ID_CHARS_LENGTH)];
    }
    return result;
}

function createPlayer(characterType, weaponType, playerNumber, id, spawnX = null, spawnY = null) {
    const charType = characterType?.toLowerCase();
    const weapType = weaponType?.toLowerCase();

    const CharacterClass = CHARACTER_CLASSES[charType] || Berserker;
    const WeaponClass = WEAPON_CLASSES[weapType] || M4;

    const spawnPos = SPAWN_POSITIONS[playerNumber];
    const x = spawnPos ? spawnPos.x : spawnX;
    const y = spawnPos ? spawnPos.y : spawnY;
    
    const baseOptions = {
        x,
        y,
        id,
        primaryWeapon: new WeaponClass(),
        spawnX: x,
        spawnY: y
    };
    
    return new CharacterClass(baseOptions);
}

function findAvailableRoom() {
    for (const roomName in state) {
        if (state[roomName].players.length === 1) {
            return roomName;
        }
    }
    return null;
}

const RANDOM_PLAYER_MIN = 3;
const RANDOM_PLAYER_RANGE = 1000;

function getRandomPlayerNumber() {
    return Math.floor(Math.random() * RANDOM_PLAYER_RANGE) + RANDOM_PLAYER_MIN;
}

const SPAWN_DISTANCE_MIN = 50;
const SPAWN_DISTANCE_RANGE = MAP_RADIUS - 150;
const TWO_PI = 2 * Math.PI;

function getRandomSpawnPosition() {
    const angle = Math.random() * TWO_PI;
    const distance = Math.random() * SPAWN_DISTANCE_RANGE + SPAWN_DISTANCE_MIN;
    return {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance
    };
}

const findPlayer = (client) => {
    const roomName = clientRooms[client.id];
    if (!roomName || !state[roomName]) {
        return null;
    }
    return state[roomName].players.find(p => p.id === client.id);
};

io.on('connection', (socket) => {
    const handleFindGame = (data) => {
        if (isRateLimited(socket.id, 'findGame')) {
            socket.emit('error', 'Rate limit exceeded. Please try again later.');
            return;
        }
        
        if (clientRooms[socket.id]) {
            socket.emit('error', 'Already in a match or searching for one');
            return;
        }
        
        let roomName = findAvailableRoom();
        
        if (roomName) {
            clientRooms[socket.id] = roomName;
            socket.join(roomName);
            socket.number = 2;
            
            const player = createPlayer(data?.characterType, data?.weaponType, 2, socket.id);
            state[roomName].players.push(player);
            
            socket.emit('init', 2);
            socket.emit('gameFound', roomName);
            
            io.sockets.in(roomName).emit('gameStarting');
            startGameInterval(roomName);
        } else {
            // Create new room as player 1
            roomName = makeID(5);
            clientRooms[socket.id] = roomName;
            
            state[roomName] = createGameState();
            state[roomName].obstacles = generateNewMap();
            
            const player = createPlayer(data?.characterType, data?.weaponType, 1, socket.id);
            state[roomName].players.push(player);

            socket.join(roomName);
            socket.number = 1;
            socket.emit('init', 1);
            socket.emit('gameFound', roomName);
            socket.emit('waitingForPlayer');
        }
    };

    const handleFindFreeForAll = (data) => {
        if (isRateLimited(socket.id, 'findFreeForAll')) {
            socket.emit('error', 'Rate limit exceeded. Please try again later.');
            return;
        }
        
        if (clientRooms[socket.id]) {
            socket.emit('error', 'Already in a match');
            return;
        }

        if (!state[FREE_FOR_ALL_ROOM]) {
            state[FREE_FOR_ALL_ROOM] = createGameState();
            state[FREE_FOR_ALL_ROOM].obstacles = generateNewMap();
            state[FREE_FOR_ALL_ROOM].gameMode = 'freeForAll';
            startGameInterval(FREE_FOR_ALL_ROOM);
        }

        clientRooms[socket.id] = FREE_FOR_ALL_ROOM;
        socket.join(FREE_FOR_ALL_ROOM);
        socket.number = getRandomPlayerNumber();

        const spawnPos = getRandomSpawnPosition();
        const player = createPlayer(data?.characterType, data?.weaponType, socket.number, socket.id, spawnPos.x, spawnPos.y);
        player.randomSpawn(state[FREE_FOR_ALL_ROOM]);
        state[FREE_FOR_ALL_ROOM].players.push(player);

        const playerCount = state[FREE_FOR_ALL_ROOM].players.length;

        socket.emit('init', socket.number);
        socket.emit('gameFound', FREE_FOR_ALL_ROOM);
        socket.emit('gameStarting');
        socket.emit('freeForAllJoined', { playerCount });

        io.sockets.in(FREE_FOR_ALL_ROOM).emit('playerJoined', {
            playerCount,
            playerId: socket.id
        });
    };

    const handleChangeAngle = (angle) => {
        if (isRateLimited(socket.id, 'changeAngle')) {
            return; // Silently ignore rate limited angle changes
        }
        
        const player = findPlayer(socket);
        if (player) {
            player.angle = angle;
        }
    };

    const handleKeydown = (key) => {
        if (isRateLimited(socket.id, 'keydown')) {
            return; // Silently ignore rate limited key events
        }
        
        const player = findPlayer(socket);
        if (player) {
            if (!player.inputs) player.inputs = {};
            player.inputs[key] = true;
        }
    };
    
    const handleKeyup = (key) => {
        if (isRateLimited(socket.id, 'keyup')) {
            return; // Silently ignore rate limited key events
        }
        
        const player = findPlayer(socket);
        if (player) {
            if (!player.inputs) player.inputs = {};
            player.inputs[key] = false;
        }
    };

    const handleMouseDown = () => {
        if (isRateLimited(socket.id, 'mouseDown')) {
            return; // Silently ignore rate limited mouse events
        }
        
        const player = findPlayer(socket);
        if (player) {
            player.isFiring = true;
        }
    };

    const handleMouseUp = () => {
        if (isRateLimited(socket.id, 'mouseUp')) {
            return; // Silently ignore rate limited mouse events
        }
        
        const player = findPlayer(socket);
        if (player) {
            player.isFiring = false;
        }
    };

    const handleDisconnect = () => {
        const roomName = clientRooms[socket.id];
        if (!roomName) return;

        // Clean up rate limiting data for this socket
        for (const key of rateLimitStore.keys()) {
            if (key.startsWith(socket.id + ':')) {
                rateLimitStore.delete(key);
            }
        }

        if (roomName === FREE_FOR_ALL_ROOM) {
            // Handle free for all disconnect
            const roomState = state[roomName];
            if (roomState?.players) {
                roomState.players = roomState.players.filter(p => p.id !== socket.id);
                
                io.sockets.in(roomName).emit('playerLeft', {
                    playerCount: roomState.players.length,
                    playerId: socket.id
                });
            }
        } else {
            // Handle 1v1 disconnect
            const roomState = state[roomName];
            if (roomState?.players) {
                roomState.players.forEach(player => {
                    delete clientRooms[player.id];
                });
            }
            
            // Clean up game interval
            if (gameIntervals[roomName]) {
                clearInterval(gameIntervals[roomName]);
                delete gameIntervals[roomName];
            }
            
            if (roomState) {
                io.sockets.in(roomName).emit('opponentLeft');
            }
            
            delete state[roomName];
        }
        
        delete clientRooms[socket.id];
    };

    socket.on('findGame', handleFindGame);
    socket.on('findFreeForAll', handleFindFreeForAll);
    socket.on('keydown', handleKeydown);
    socket.on('keyup', handleKeyup);
    socket.on('changeAngle', handleChangeAngle);
    socket.on('mouseDown', handleMouseDown);
    socket.on('mouseUp', handleMouseUp);
    socket.on('disconnect', handleDisconnect);
});


const FRAME_INTERVAL = 1000 / FRAME_RATE;
const DELTA_TIME_DIVISOR = 40;

function startGameInterval(gameCode) {
    if (gameIntervals[gameCode]) {
        return;
    }
    
    let lastTime = Date.now();
    const intervalID = setInterval(() => {
        const gameState = state[gameCode];
        if (!gameState) {
            clearInterval(intervalID);
            delete gameIntervals[gameCode];
            return;
        }
        
        const currentTime = Date.now();
        const deltaTime = (currentTime - lastTime) / DELTA_TIME_DIVISOR;
        lastTime = currentTime;
        
        gameLoop(gameState, deltaTime, io);
        emitGameState(gameCode, gameState);
    }, FRAME_INTERVAL);
    
    gameIntervals[gameCode] = intervalID;
}

function emitGameState(gameCode, gameState) {
    const packedData = msgpack.encode(gameState);
    io.sockets.in(gameCode).emit('gameState', packedData);
}

// Start server
const port = 3000;
server.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${port}`);
});