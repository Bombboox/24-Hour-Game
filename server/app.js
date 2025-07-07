const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const socketIo = require('socket.io');
const path = require('path');
const msgpack = require('msgpack-lite');
const { createGameState, gameLoop, generateNewMap } = require('./game');
const { Berserker, Ninja, King } = require('./character');
const { M4, Sniper, Pistol, Shotgun } = require('./weapon');
const { MAP_RADIUS, FRAME_RATE } = require('./constants');
const { GameStateCache } = require('./gameStateCache');
const { Worker } = require('worker_threads');

const app = express();

let server;
let protocol = 'https';
let port = process.env.PORT || 443;

try {
    const httpsOptions = {
        key: fs.readFileSync('/etc/ssl/private/private-key.pem'),
        cert: fs.readFileSync(path.join(__dirname, 'public-key.pem'))
    };
    server = https.createServer(httpsOptions, app);
    console.log('HTTPS server created successfully');
} catch (error) {
    console.warn('HTTPS setup failed, falling back to HTTP:', error.message);
    server = http.createServer(app);
    protocol = 'http';
    port = process.env.PORT || 3000;
}

const io = socketIo(server);

const state = new Map();
const clientRooms = new Map();
const gameIntervals = new Map();
const gameStateCaches = new Map();
const roomPlayers = new Map();

const FREE_FOR_ALL_ROOM = 'freeForAll';

const CHARACTER_CLASSES = {
    ninja: Ninja,
    king: King,
    berserker: Berserker
};

const WEAPON_CLASSES = {
    m4: M4,
    shotgun: Shotgun,
    pistol: Pistol,
    sniper: Sniper
};

const SECONDARY_WEAPON_CLASSES = {
    m4: M4,
    shotgun: Shotgun,
    pistol: Pistol,
    sniper: Sniper
};

const VALID_CHARACTERS = Object.keys(CHARACTER_CLASSES);
const VALID_WEAPONS = Object.keys(WEAPON_CLASSES);
const VALID_SECONDARY_WEAPONS = Object.keys(SECONDARY_WEAPON_CLASSES);

// 1v1 spawns
const SPAWN_POSITIONS = {
    1: { x: -MAP_RADIUS + 50, y: 0 },
    2: { x: MAP_RADIUS - 50, y: 0 }
};

// rate limiting
const RATE_LIMITS = {
    findGame: { maxRequests: 5, windowMs: 60000 }, // 5 requests per minute
    findFreeForAll: { maxRequests: 5, windowMs: 60000 }, // 5 requests per minute
    keydown: { maxRequests: 100, windowMs: 1000 }, // 100 requests per second
    keyup: { maxRequests: 100, windowMs: 1000 }, // 100 requests per second
    changeAngle: { maxRequests: 360, windowMs: 1000 }, // 360 requests per second
    mouseDown: { maxRequests: 30, windowMs: 1000 }, // 30 requests per second
    mouseUp: { maxRequests: 30, windowMs: 1000 } // 30 requests per second
};

// rate limiting storage
const rateLimitStore = new Map();

const logger = {
    info: (message, data = {}) => {
        console.log(`[INFO] ${new Date().toISOString()} - ${message}`, data);
    },
    error: (message, error = null) => {
        console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error);
    },
    warn: (message, data = {}) => {
        console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, data);
    },
    debug: (message, data = {}) => {
        if (process.env.NODE_ENV === 'development') {
            console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`, data);
        }
    }
};

// Health monitoring
const healthMetrics = {
    connections: 0,
    activeRooms: 0,
    memoryUsage: 0,
    uptime: Date.now(),
    errors: 0
};

/*setInterval(() => {
    updateHealthMetrics();
    console.log(healthMetrics);
}, 3000);*/

function updateHealthMetrics() {
    healthMetrics.connections = io.engine.clientsCount;
    healthMetrics.activeRooms = state.size;
    healthMetrics.memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024; // MB
}


app.get('/health', (req, res) => {
    updateHealthMetrics();
    res.json({
        status: 'healthy',
        uptime: Date.now() - healthMetrics.uptime,
        metrics: healthMetrics
    });
});

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

// Cleanup functions
function cleanupRateLimitStore() {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
        if (now > record.resetTime) {
            rateLimitStore.delete(key);
        }
    }
}

function cleanupPlayerFromRoom(socketId) {
    const roomName = clientRooms.get(socketId);
    if (!roomName) {
        for (const [gameCode, gameState] of state.entries()) {
            if (gameState?.players?.some(p => p.id === socketId)) {
                const updatedPlayers = gameState.players.filter(p => p.id !== socketId);
                gameState.players = updatedPlayers;
                gameState.cacheReset = true;
                roomPlayers.delete(socketId);
                clientRooms.delete(socketId);
                return;
            }
        }
        return;
    }

    const gameState = state.get(roomName);

    if (gameState?.players) {
        gameState.players = gameState.players.filter(p => p.id !== socketId);
        gameState.cacheReset = true;
    }
    
    roomPlayers.delete(socketId);
    clientRooms.delete(socketId);
}

function cleanupRoom(roomName) {
    const gameState = state.get(roomName);
    if (gameState?.players) {
        gameState.players.forEach(player => {
            roomPlayers.delete(player.id);
            clientRooms.delete(player.id);
        });
    }
    
    const intervalId = gameIntervals.get(roomName);
    if (intervalId) {
        clearInterval(intervalId);
        gameIntervals.delete(roomName);
    }
    
    state.delete(roomName);
    gameStateCaches.delete(roomName);
    
    logger.info(`Room cleaned up: ${roomName}`);
}

function cleanupSocketResources(socketId) {
    // Clean up rate limiting data
    for (const key of rateLimitStore.keys()) {
        if (key.startsWith(socketId + ':')) {
            rateLimitStore.delete(key);
        }
    }
    
    roomPlayers.delete(socketId);
    clientRooms.delete(socketId);
}

// Periodic cleanup
setInterval(() => {
    cleanupRateLimitStore();
    updateHealthMetrics();
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

function createPlayer(characterType, weaponType, secondaryWeaponType, playerNumber, id, spawnX = null, spawnY = null) {
    const charType = characterType?.toLowerCase();
    const weapType = weaponType?.toLowerCase();
    const secondaryWeapType = secondaryWeaponType?.toLowerCase();

    const CharacterClass = CHARACTER_CLASSES[charType] || Berserker;
    const WeaponClass = WEAPON_CLASSES[weapType] || M4;
    const SecondaryWeaponClass = SECONDARY_WEAPON_CLASSES[secondaryWeapType] || Pistol;

    const spawnPos = SPAWN_POSITIONS[playerNumber];
    const x = spawnPos ? spawnPos.x : spawnX;
    const y = spawnPos ? spawnPos.y : spawnY;
    
    const baseOptions = {
        x,
        y,
        id,
        primaryWeapon: new WeaponClass(),
        secondaryWeapon: new SecondaryWeaponClass(),
        spawnX: x,
        spawnY: y
    };
    
    const player = new CharacterClass(baseOptions);
    roomPlayers.set(id, player); // Store in player lookup map
    return player;
}

function findAvailableRoom() {
    for (const [roomName, gameState] of state.entries()) {
        if (gameState.players.length === 1 && gameState.gameMode === '1v1') {
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

// Optimized player lookup using Map
const findPlayer = (client) => {
    return roomPlayers.get(client.id) || null;
};

function sendFullGameState(socket, gameCode) {
    const cache = gameStateCaches.get(gameCode);
    const gameState = state.get(gameCode);
    if (!cache || !gameState) return;
    
    const fullState = cache.serializeGameState(gameState);
    delete fullState.frameNumber; 
    const packedData = msgpack.encode(fullState);
    socket.emit('gameState', packedData);
}

io.on('connection', (socket) => {
    healthMetrics.connections++;
    logger.info(`Client connected: ${socket.id}`);

    const handleFindGame = (data) => {
        try {
            if (isRateLimited(socket.id, 'findGame')) {
                socket.emit('error', 'Rate limit exceeded. Please try again later.');
                return;
            }
            
            if (clientRooms.has(socket.id)) {
                socket.emit('error', 'Already in a match or searching for one');
                return;
            }
            
            let roomName = findAvailableRoom();
            
            if (roomName) {
                clientRooms.set(socket.id, roomName);
                socket.join(roomName);
                socket.number = 2;
                
                const player = createPlayer(data?.characterType, data?.weaponType, data?.secondaryWeaponType, 2, socket.id);
                state.get(roomName).players.push(player);
                
                socket.emit('init', 2);
                socket.emit('gameFound', roomName);
                
                io.sockets.in(roomName).emit('gameStarting');
                
                sendFullGameState(socket, roomName);
                startGameInterval(roomName);
                
                logger.info(`Player joined existing room: ${roomName}`);
            } else {
                roomName = makeID(5);
                clientRooms.set(socket.id, roomName);
                
                state.set(roomName, createGameState());
                state.get(roomName).obstacles = generateNewMap();
                gameStateCaches.set(roomName, new GameStateCache());
                
                const player = createPlayer(data?.characterType, data?.weaponType, data?.secondaryWeaponType, 1, socket.id);
                state.get(roomName).players.push(player);

                socket.join(roomName);
                socket.number = 1;
                socket.emit('init', 1);
                socket.emit('gameFound', roomName);
                socket.emit('waitingForPlayer');
                
                sendFullGameState(socket, roomName);
                
                logger.info(`New room created: ${roomName}`);
            }
        } catch (error) {
            logger.error('Error in handleFindGame', error);
            healthMetrics.errors++;
            socket.emit('error', 'Internal server error');
        }
    };

    const handleFindFreeForAll = (data) => {
        try {
            if (isRateLimited(socket.id, 'findFreeForAll')) {
                socket.emit('error', 'Rate limit exceeded. Please try again later.');
                return;
            }
            
            if (clientRooms.has(socket.id)) {
                socket.emit('error', 'Already in a match');
                return;
            }

            if (!state.has(FREE_FOR_ALL_ROOM)) {
                state.set(FREE_FOR_ALL_ROOM, createGameState());
                state.get(FREE_FOR_ALL_ROOM).obstacles = generateNewMap();
                state.get(FREE_FOR_ALL_ROOM).gameMode = 'freeForAll';
                gameStateCaches.set(FREE_FOR_ALL_ROOM, new GameStateCache());
                startGameInterval(FREE_FOR_ALL_ROOM);
                
                logger.info('Free for all room created');
            }

            clientRooms.set(socket.id, FREE_FOR_ALL_ROOM);
            socket.join(FREE_FOR_ALL_ROOM);
            socket.number = getRandomPlayerNumber();

            const spawnPos = getRandomSpawnPosition();
            const player = createPlayer(data?.characterType, data?.weaponType, data?.secondaryWeaponType, socket.number, socket.id, spawnPos.x, spawnPos.y);
            player.randomSpawn(state.get(FREE_FOR_ALL_ROOM));
            state.get(FREE_FOR_ALL_ROOM).players.push(player);

            const playerCount = state.get(FREE_FOR_ALL_ROOM).players.length;

            socket.emit('init', socket.number);
            socket.emit('gameFound', FREE_FOR_ALL_ROOM);
            socket.emit('gameStarting');
            socket.emit('freeForAllJoined', { playerCount });

            sendFullGameState(socket, FREE_FOR_ALL_ROOM);

            io.sockets.in(FREE_FOR_ALL_ROOM).emit('playerJoined', {
                playerCount,
                playerId: socket.id
            });
            
            logger.info(`Player joined free for all: ${socket.id}`);
        } catch (error) {
            logger.error('Error in handleFindFreeForAll', error);
            healthMetrics.errors++;
            socket.emit('error', 'Internal server error');
        }
    };

    const handleChangeAngle = (angle) => {
        if (isRateLimited(socket.id, 'changeAngle')) {
            return; 
        }
        
        const player = findPlayer(socket);
        if (player) {
            player.angle = angle;
        }
    };

    const handleKeydown = (key) => {
        if (isRateLimited(socket.id, 'keydown')) {
            return; 
        }
        
        const player = findPlayer(socket);
        if (player) {
            if (!player.inputs) player.inputs = {};
            player.inputs[key] = true;
        }
    };
    
    const handleKeyup = (key) => {
        if (isRateLimited(socket.id, 'keyup')) {
            return; 
        }
        
        const player = findPlayer(socket);
        if (player) {
            if (!player.inputs) player.inputs = {};
            player.inputs[key] = false;
        }
    };

    const handleMouseDown = () => {
        if (isRateLimited(socket.id, 'mouseDown')) {
            return; 
        }
        
        const player = findPlayer(socket);
        if (player) {
            player.isFiring = true;
        }
    };

    const handleMouseUp = () => {
        if (isRateLimited(socket.id, 'mouseUp')) {
            return; 
        }
        
        const player = findPlayer(socket);
        if (player) {
            player.isFiring = false;
        }
    };

    const handleDisconnect = () => {
        try {
            const roomName = clientRooms.get(socket.id);
            if (!roomName) return;

            cleanupSocketResources(socket.id);

            if (roomName === FREE_FOR_ALL_ROOM) {
                cleanupPlayerFromRoom(socket.id);
                const roomState = state.get(roomName);
                if (roomState) {
                    io.sockets.in(roomName).emit('playerLeft', {
                        playerCount: roomState.players.length,
                        playerId: socket.id
                    });
                }
                logger.info(`Player left free for all: ${socket.id}`);
            } else {
                const roomState = state.get(roomName);
                if (roomState) {
                    io.sockets.in(roomName).emit('opponentLeft');
                }
                cleanupRoom(roomName);
                logger.info(`1v1 room ended due to disconnect: ${roomName}`);
            }
            
            healthMetrics.connections--;
            logger.info(`Client disconnected: ${socket.id}`);
        } catch (error) {
            logger.error('Error in handleDisconnect', error);
            healthMetrics.errors++;
        }
    };

    const handleCancelSearch = () => {
        if (clientRooms.has(socket.id)) {
            const roomName = clientRooms.get(socket.id);
            cleanupSocketResources(socket.id);
            if (roomName && roomName !== FREE_FOR_ALL_ROOM) {
                cleanupRoom(roomName);
            }
        }
    };

    socket.on('findGame', handleFindGame);
    socket.on('findFreeForAll', handleFindFreeForAll);
    socket.on('keydown', handleKeydown);
    socket.on('keyup', handleKeyup);
    socket.on('changeAngle', handleChangeAngle);
    socket.on('mouseDown', handleMouseDown);
    socket.on('mouseUp', handleMouseUp);
    socket.on('disconnect', handleDisconnect);
    socket.on('cancelSearch', handleCancelSearch);
});

const FRAME_INTERVAL = 1000 / FRAME_RATE;
const DELTA_TIME_DIVISOR = 40;

function startGameInterval(gameCode) {
    if (gameIntervals.has(gameCode)) {
        return;
    }
    
    let lastTime = Date.now();
    const intervalID = setInterval(() => {
        const gameState = state.get(gameCode);
        if (!gameState) {
            clearInterval(intervalID);
            gameIntervals.delete(gameCode);
            return;
        }
        
        const currentTime = Date.now();
        const deltaTime = (currentTime - lastTime) / DELTA_TIME_DIVISOR;
        lastTime = currentTime;
        
        // Use worker thread for heavy computations if needed
        gameLoop(gameState, deltaTime, io);
        emitGameState(gameCode, gameState);
    }, FRAME_INTERVAL);
    
    gameIntervals.set(gameCode, intervalID);
}

function emitGameState(gameCode, gameState) {
    const cache = gameStateCaches.get(gameCode);
    if (!cache) return;
    
    // send gamestate async to not block game loop
    setImmediate(() => {
        try {
            if (gameState.cacheReset) {
                cache.reset();
                delete gameState.cacheReset;
                const fullState = cache.serializeGameState(gameState);
                delete fullState.frameNumber; 
                const packedData = msgpack.encode(fullState);
                io.sockets.in(gameCode).emit('gameState', packedData);
                return;
            }
            
            const delta = cache.updateAndGetDelta(gameState);
            if (delta) {
                const packedData = msgpack.encode(delta);
                const fullStateSize = msgpack.encode(cache.serializeGameState(gameState)).length;
                const compressionRatio = ((fullStateSize - packedData.length) / fullStateSize * 100).toFixed(1);

                io.sockets.in(gameCode).emit('gameState', packedData);
            }
        } catch (error) {
            logger.error('Error in emitGameState', error);
            healthMetrics.errors++;
        }
    });
}

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    
    // Clean up all intervals
    for (const intervalId of gameIntervals.values()) {
        clearInterval(intervalId);
    }
    
    // Close server
    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    
    // Clean up all intervals
    for (const intervalId of gameIntervals.values()) {
        clearInterval(intervalId);
    }
    
    // Close server
    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});

// Start server
server.listen(port, '0.0.0.0', () => {
    logger.info(`Server running at ${protocol}://localhost:${port}`);
});