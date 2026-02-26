const fs = require('fs');
const path = require('path');
const uWS = require('uWebSockets.js');
const msgpack = require('msgpack-lite');
const { createGameState, gameLoop, generateNewMap } = require('./game');
const { Berserker, Ninja, King, Demoman, Reaver } = require('./character');
const { M4, Sniper, Pistol, Shotgun, LaserGun, Taser, RocketLauncher, BubbleLauncher } = require('./weapon');
const { Grenade, Invisibility, ShieldBarrier, TurretAbility, HealingCircle } = require('./specialAbilities');
const { MAP_RADIUS, FRAME_RATE } = require('./constants');
const { GameStateCache } = require('./gameStateCache');
const { Worker } = require('worker_threads');

let protocol = 'https';
let port = process.env.PORT || 443;
const CLIENT_ROOT = path.resolve(__dirname, '../client');
const TOPIC_USER_PREFIX = 'user:';
const TOPIC_ROOM_PREFIX = 'room:';

let wsApp;
const socketsById = new Map();
const socketState = new Map();
const connectionHandlers = [];

const serializerWorker = new Worker(path.join(__dirname, 'serializationWorker.js'));
let nextSerializationJobId = 1;
const pendingSerializationJobs = new Map();
const roomEmitSequence = new Map();

serializerWorker.on('message', (result) => {
    const pending = pendingSerializationJobs.get(result.id);
    if (!pending) {
        return;
    }

    pendingSerializationJobs.delete(result.id);

    if (result.error) {
        pending.reject(new Error(result.error));
        return;
    }

    pending.resolve(result.encoded);
});

serializerWorker.on('error', (error) => {
    console.error('[ERROR] Serialization worker error', error);
});

function serializePacketAsync(event, payload) {
    return new Promise((resolve, reject) => {
        const id = nextSerializationJobId++;
        pendingSerializationJobs.set(id, { resolve, reject });
        serializerWorker.postMessage({ id, event, payload });
    });
}

function socketTopic(id) {
    return `${TOPIC_USER_PREFIX}${id}`;
}

function roomTopic(roomName) {
    return `${TOPIC_ROOM_PREFIX}${roomName}`;
}

function encodePacket(event, payload) {
    return msgpack.encode({ e: event, d: payload });
}

function sendSocketPacket(ws, event, payload) {
    if (!ws) {
        return;
    }
    ws.send(encodePacket(event, payload), true);
}

function publishRoomPacket(roomName, event, payload) {
    wsApp.publish(roomTopic(roomName), encodePacket(event, payload), true);
}

function publishRoomEncoded(roomName, encodedPacket) {
    wsApp.publish(roomTopic(roomName), encodedPacket, true);
}

function publishUserPacket(socketId, event, payload) {
    wsApp.publish(socketTopic(socketId), encodePacket(event, payload), true);
}

const io = {
    engine: {
        get clientsCount() {
            return socketsById.size;
        }
    },
    on(eventName, handler) {
        if (eventName === 'connection') {
            connectionHandlers.push(handler);
        }
    },
    to(socketId) {
        return {
            emit(event, payload) {
                publishUserPacket(socketId, event, payload);
            }
        };
    },
    sockets: {
        in(roomName) {
            return {
                emit(event, payload) {
                    publishRoomPacket(roomName, event, payload);
                },
                emitEncoded(encodedPacket) {
                    publishRoomEncoded(roomName, encodedPacket);
                }
            };
        }
    }
};

const state = new Map();
const clientRooms = new Map();
const gameIntervals = new Map();
const gameStateCaches = new Map();
const roomPlayers = new Map();

const FREE_FOR_ALL_ROOM = 'freeForAll';

const CHARACTER_CLASSES = {
    ninja: Ninja,
    king: King,
    berserker: Berserker,
    demoman: Demoman,
    reaver: Reaver
};

const WEAPON_CLASSES = {
    m4: M4,
    shotgun: Shotgun,
    pistol: Pistol,
    sniper: Sniper,
    laser: LaserGun,
    taser: Taser,
    rocket: RocketLauncher,
    bubble: BubbleLauncher
};

const SECONDARY_WEAPON_CLASSES = {
    m4: M4,
    shotgun: Shotgun,
    pistol: Pistol,
    sniper: Sniper,
    laser: LaserGun,
    taser: Taser,
    rocket: RocketLauncher,
    bubble: BubbleLauncher
};

const VALID_CHARACTERS = Object.keys(CHARACTER_CLASSES);
const VALID_WEAPONS = Object.keys(WEAPON_CLASSES);
const VALID_SECONDARY_WEAPONS = Object.keys(SECONDARY_WEAPON_CLASSES);
const SHARED_ABILITY_CLASSES = {
    grenade: Grenade,
    invisibility: Invisibility,
    shield: ShieldBarrier,
    turret: TurretAbility,
    healingcircle: HealingCircle
};
const VALID_SHARED_ABILITIES = Object.keys(SHARED_ABILITY_CLASSES);
const DEFAULT_PRIMARY_WEAPON = 'm4';
const DEFAULT_SECONDARY_WEAPON = 'pistol';
const DEFAULT_SHARED_ABILITY = 'grenade';

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

const ID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const ID_CHARS_LENGTH = ID_CHARS.length;

function makeID(length) {
    let result = '';
    for (let i = 0; i < length; i++) {
        result += ID_CHARS[Math.floor(Math.random() * ID_CHARS_LENGTH)];
    }
    return result;
}

function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case '.html':
            return 'text/html; charset=utf-8';
        case '.js':
            return 'application/javascript; charset=utf-8';
        case '.css':
            return 'text/css; charset=utf-8';
        case '.json':
            return 'application/json; charset=utf-8';
        case '.png':
            return 'image/png';
        case '.jpg':
        case '.jpeg':
            return 'image/jpeg';
        case '.svg':
            return 'image/svg+xml';
        case '.ico':
            return 'image/x-icon';
        case '.mp3':
            return 'audio/mpeg';
        case '.wav':
            return 'audio/wav';
        case '.otf':
            return 'font/otf';
        case '.ttf':
            return 'font/ttf';
        default:
            return 'application/octet-stream';
    }
}

function serveClientFile(res, requestedPath) {
    let aborted = false;
    res.onAborted(() => {
        aborted = true;
    });

    const sendResponse = (status, body, contentType = null) => {
        if (aborted) {
            return;
        }

        res.cork(() => {
            res.writeStatus(status);
            if (contentType) {
                res.writeHeader('Content-Type', contentType);
            }
            res.end(body);
        });
    };

    const cleanPath = requestedPath === '/' ? '/index.html' : requestedPath;
    let decodedPath;
    try {
        decodedPath = decodeURIComponent(cleanPath);
    } catch (error) {
        sendResponse('400 Bad Request', 'Bad Request');
        return;
    }
    const normalized = path.normalize(path.join(CLIENT_ROOT, decodedPath));

    if (!normalized.startsWith(CLIENT_ROOT)) {
        sendResponse('403 Forbidden', 'Forbidden');
        return;
    }

    fs.readFile(normalized, (error, data) => {
        if (error) {
          sendResponse('404 Not Found', 'Not Found');
          return;
        }
        
        res.cork(() => {
            res.writeStatus('200 OK');
            res.writeHeader('Content-Type', getMimeType(normalized));
          
            // Disable ALL caching
            res.writeHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.writeHeader('Pragma', 'no-cache');
            res.writeHeader('Expires', '0');
            res.writeHeader('Surrogate-Control', 'no-store');
          
            res.end(data);
          });
      });
}

function createSocketFacade(ws, socketId) {
    const handlers = new Map();
    const joinedTopics = new Set();

    const socket = {
        id: socketId,
        number: null,
        emit(event, payload) {
            sendSocketPacket(ws, event, payload);
        },
        emitEncoded(encodedPacket) {
            ws.send(encodedPacket, true);
        },
        on(event, handler) {
            handlers.set(event, handler);
        },
        join(roomName) {
            const topic = roomTopic(roomName);
            ws.subscribe(topic);
            joinedTopics.add(topic);
        }
    };

    socketState.set(socketId, { socket, handlers, joinedTopics });
    return socket;
}

function initializeWebServer() {
    const keyPath = '/etc/ssl/private/private-key.pem';
    const certPath = path.join(__dirname, 'public-key.pem');

    try {
        if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
            wsApp = uWS.SSLApp({
                key_file_name: keyPath,
                cert_file_name: certPath
            });
            protocol = 'https';
            port = process.env.PORT || 443;
            logger.info('uWebSockets SSL app initialized');
            return;
        }
    } catch (error) {
        logger.warn('Failed to initialize SSL app, falling back to HTTP', { error: error.message });
    }

    wsApp = uWS.App();
    protocol = 'http';
    port = process.env.PORT || 3000;
    logger.info('uWebSockets HTTP app initialized');
}

function bootstrapWebSocketRoutes() {
    wsApp.ws('/ws', {
        compression: uWS.DEDICATED_COMPRESSOR_16KB,
        maxPayloadLength: 16 * 1024,
        idleTimeout: 30,
        upgrade(res, req, context) {
            const socketId = makeID(14);
            res.upgrade(
                { socketId },
                req.getHeader('sec-websocket-key'),
                req.getHeader('sec-websocket-protocol'),
                req.getHeader('sec-websocket-extensions'),
                context
            );
        },
        open(ws) {
            const socketId = ws.getUserData().socketId;
            socketsById.set(socketId, ws);
            ws.subscribe(socketTopic(socketId));

            const socket = createSocketFacade(ws, socketId);
            socket.emit('__welcome', { id: socketId });

            for (const handler of connectionHandlers) {
                handler(socket);
            }
        },
        message(ws, message) {
            try {
                const socketId = ws.getUserData().socketId;
                const info = socketState.get(socketId);
                if (!info) {
                    return;
                }

                const decoded = msgpack.decode(Buffer.from(message));
                const eventName = decoded?.e;
                const payload = decoded?.d;

                if (typeof eventName !== 'string') {
                    return;
                }

                const handler = info.handlers.get(eventName);
                if (handler) {
                    handler(payload);
                }
            } catch (error) {
                logger.warn('Failed to decode client packet', { error: error.message });
            }
        },
        close(ws) {
            const socketId = ws.getUserData().socketId;
            const info = socketState.get(socketId);
            if (!info) {
                return;
            }

            const disconnectHandler = info.handlers.get('disconnect');
            if (disconnectHandler) {
                disconnectHandler();
            }

            socketsById.delete(socketId);
            socketState.delete(socketId);
        }
    });

    wsApp.get('/health', (res) => {
        let aborted = false;
        res.onAborted(() => {
            aborted = true;
        });

        updateHealthMetrics();
        if (aborted) {
            return;
        }

        const payload = JSON.stringify({
            status: 'healthy',
            uptime: Date.now() - healthMetrics.uptime,
            metrics: healthMetrics
        });

        res.cork(() => {
            res.writeStatus('200 OK');
            res.writeHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(payload);
        });
    });

    wsApp.get('/*', (res, req) => {
        serveClientFile(res, req.getUrl());
    });
}

function getFallbackSecondaryWeapon(primaryWeaponType) {
    const fallbackOrder = [DEFAULT_SECONDARY_WEAPON, DEFAULT_PRIMARY_WEAPON, 'shotgun', 'sniper', 'laser', 'taser', 'rocket', 'bubble'];
    return fallbackOrder.find((weapon) => weapon !== primaryWeaponType) || DEFAULT_SECONDARY_WEAPON;
}

function normalizeLoadout(weaponType, secondaryWeaponType) {
    const primaryType = weaponType?.toLowerCase();
    const secondaryType = secondaryWeaponType?.toLowerCase();

    const normalizedPrimary = VALID_WEAPONS.includes(primaryType) ? primaryType : DEFAULT_PRIMARY_WEAPON;
    let normalizedSecondary = VALID_SECONDARY_WEAPONS.includes(secondaryType)
        ? secondaryType
        : getFallbackSecondaryWeapon(normalizedPrimary);

    if (normalizedSecondary === normalizedPrimary) {
        normalizedSecondary = getFallbackSecondaryWeapon(normalizedPrimary);
    }

    return {
        primary: normalizedPrimary,
        secondary: normalizedSecondary
    };
}

function normalizeSharedAbility(sharedAbilityType) {
    const sharedType = sharedAbilityType?.toLowerCase();
    return VALID_SHARED_ABILITIES.includes(sharedType) ? sharedType : DEFAULT_SHARED_ABILITY;
}

function createPlayer(characterType, weaponType, secondaryWeaponType, sharedAbilityType, playerNumber, id, spawnX = null, spawnY = null) {
    const charType = characterType?.toLowerCase();
    const normalizedLoadout = normalizeLoadout(weaponType, secondaryWeaponType);
    const normalizedSharedAbility = normalizeSharedAbility(sharedAbilityType);

    const CharacterClass = CHARACTER_CLASSES[charType] || Berserker;
    const WeaponClass = WEAPON_CLASSES[normalizedLoadout.primary] || M4;
    const SecondaryWeaponClass = SECONDARY_WEAPON_CLASSES[normalizedLoadout.secondary] || Pistol;
    const SharedAbilityClass = SHARED_ABILITY_CLASSES[normalizedSharedAbility] || Grenade;

    const spawnPos = SPAWN_POSITIONS[playerNumber];
    const x = spawnPos ? spawnPos.x : spawnX;
    const y = spawnPos ? spawnPos.y : spawnY;
    
    const baseOptions = {
        x,
        y,
        id,
        primaryWeapon: new WeaponClass(),
        secondaryWeapon: new SecondaryWeaponClass(),
        sharedAbility: new SharedAbilityClass(),
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
    socket.emit('gameState', fullState);
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
                
                const player = createPlayer(data?.characterType, data?.weaponType, data?.secondaryWeaponType, data?.sharedAbilityType, 2, socket.id);
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
                state.get(roomName).gameMode = '1v1';
                gameStateCaches.set(roomName, new GameStateCache());
                
                const player = createPlayer(data?.characterType, data?.weaponType, data?.secondaryWeaponType, data?.sharedAbilityType, 1, socket.id);
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
            const player = createPlayer(data?.characterType, data?.weaponType, data?.secondaryWeaponType, data?.sharedAbilityType, socket.number, socket.id, spawnPos.x, spawnPos.y);
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

    const leaveCurrentRoom = () => {
        const roomName = clientRooms.get(socket.id);
        if (!roomName) {
            return false;
        }

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
            return true;
        }

        const roomState = state.get(roomName);
        if (roomState) {
            io.sockets.in(roomName).emit('opponentLeft');
        }
        cleanupRoom(roomName);
        logger.info(`1v1 room ended due to player leaving: ${roomName}`);
        return true;
    };

    const handleLeaveMatch = () => {
        leaveCurrentRoom();
    };

    const handleDisconnect = () => {
        try {
            leaveCurrentRoom();
            
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
    socket.on('leaveMatch', handleLeaveMatch);
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

        if (
            gameState.gameMode === '1v1' &&
            gameState.matchEnded &&
            !gameState.matchCleanupScheduled
        ) {
            gameState.matchCleanupScheduled = true;
            setTimeout(() => {
                const latestGameState = state.get(gameCode);
                if (!latestGameState) return;
                io.sockets.in(gameCode).emit('matchClosed');
                cleanupRoom(gameCode);
            }, 9000);
        }
    }, FRAME_INTERVAL);
    
    gameIntervals.set(gameCode, intervalID);
}

function emitGameState(gameCode, gameState) {
    const cache = gameStateCaches.get(gameCode);
    if (!cache) return;
    
    // send gamestate async to not block game loop
    setImmediate(() => {
        try {
            let payload;
            if (gameState.cacheReset) {
                cache.reset();
                delete gameState.cacheReset;
                payload = cache.serializeGameState(gameState);
                delete payload.frameNumber;
            } else {
                payload = cache.updateAndGetDelta(gameState);
            }

            if (!payload) {
                return;
            }

            const sequence = (roomEmitSequence.get(gameCode) || 0) + 1;
            roomEmitSequence.set(gameCode, sequence);

            serializePacketAsync('gameState', payload)
                .then((encodedPacket) => {
                    if (roomEmitSequence.get(gameCode) !== sequence) {
                        return;
                    }
                    io.sockets.in(gameCode).emitEncoded(encodedPacket);
                })
                .catch((error) => {
                    logger.error('Error serializing gameState packet', error);
                    healthMetrics.errors++;
                });
        } catch (error) {
            logger.error('Error in emitGameState', error);
            healthMetrics.errors++;
        }
    });
}

initializeWebServer();
bootstrapWebSocketRoutes();

let listenToken = null;

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    
    // Clean up all intervals
    for (const intervalId of gameIntervals.values()) {
        clearInterval(intervalId);
    }

    serializerWorker.terminate();
    if (listenToken) {
        uWS.us_listen_socket_close(listenToken);
    }

    logger.info('Server closed');
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    
    // Clean up all intervals
    for (const intervalId of gameIntervals.values()) {
        clearInterval(intervalId);
    }

    serializerWorker.terminate();
    if (listenToken) {
        uWS.us_listen_socket_close(listenToken);
    }

    logger.info('Server closed');
    process.exit(0);
});

// Start server
wsApp.listen('0.0.0.0', Number(port), (token) => {
    if (!token) {
        logger.error(`Failed to listen on port ${port}`);
        process.exit(1);
        return;
    }

    listenToken = token;
    logger.info(`Server running at ${protocol}://localhost:${port}`);
});
