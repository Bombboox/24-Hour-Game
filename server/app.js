require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const uWS = require('uWebSockets.js');
const msgpack = require('msgpack-lite');
const { Pool } = require('pg');
const { createGameState, gameLoop, generateNewMap, TWO_VS_TWO_TEAM_LIVES } = require('./game');
const { Berserker, Ninja, King, Demoman, Reaver, Waffle } = require('./character');
const { M4, Sniper, Pistol, Shotgun, LaserGun, Taser, RocketLauncher, BubbleLauncher, Flamethrower } = require('./weapon');
const { Grenade, Invisibility, ShieldBarrier, TurretAbility, HealingCircle } = require('./specialAbilities');
const { ensureBotState } = require('./botAI');
const { MAP_RADIUS, FRAME_RATE, SNAPSHOT_RATE } = require('./constants');
const { GameStateCache } = require('./gameStateCache');
const { Worker } = require('worker_threads');

let protocol = 'https';
let port = process.env.PORT || 443;
const CLIENT_ROOT = path.resolve(__dirname, '../client');
const TOPIC_USER_PREFIX = 'user:';
const TOPIC_ROOM_PREFIX = 'room:';
const SESSION_COOKIE_NAME = 'boox_session';
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7;
const SESSION_TOKEN_BYTES = 32;
const SESSION_CLEANUP_INTERVAL_MS = 1000 * 60 * 30;
const AUTH_ENDPOINT_TIMEOUT_MS = 1000 * 12;
const DEFAULT_ELO = 500;
const DEFAULT_BUX = 0;
const ELO_K_FACTOR = 32;
const MIN_ACCOUNT_ELO = 100;
const ONE_VS_ONE_KILL_TARGET = 5;
const TWO_VS_TWO_MAX_PLAYERS = 4;
const BOT_FFA_COUNT = Math.max(0, Number(process.env.BOT_FFA_COUNT ?? 4));
const BOT_ONE_VS_ONE_QUEUE = Math.max(0, Number(process.env.BOT_1V1_QUEUE ?? 2));
const BOT_FFA_REFRESH_MS = Math.max(60000, Number(process.env.BOT_FFA_REFRESH_MS ?? (1000 * 60 * 30)));
const BOT_MAINTENANCE_INTERVAL_MS = Math.max(2000, Number(process.env.BOT_MAINTENANCE_INTERVAL_MS ?? 5000));

let wsApp;
const socketsById = new Map();
const socketState = new Map();
const socketIdentities = new Map();
const connectionHandlers = [];
const responseStates = new WeakMap();

let dbPool = null;

const serializerWorker = new Worker(path.join(__dirname, 'serializationWorker.js'));
let nextSerializationJobId = 1;
const pendingSerializationJobs = new Map();

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
const gameLoops = new Map();
const gameStateCaches = new Map();
const roomPlayers = new Map();

const FREE_FOR_ALL_ROOM = 'freeForAll';
const TWO_VS_TWO_ROOM_PREFIX = '2v2_';

const CHARACTER_CLASSES = {
    ninja: Ninja,
    king: King,
    berserker: Berserker,
    demoman: Demoman,
    reaver: Reaver,
    waffle: Waffle
};

const WEAPON_CLASSES = {
    m4: M4,
    shotgun: Shotgun,
    pistol: Pistol,
    sniper: Sniper,
    laser: LaserGun,
    taser: Taser,
    rocket: RocketLauncher,
    bubble: BubbleLauncher,
    flamethrower: Flamethrower
};

const SECONDARY_WEAPON_CLASSES = {
    m4: M4,
    shotgun: Shotgun,
    pistol: Pistol,
    sniper: Sniper,
    laser: LaserGun,
    taser: Taser,
    rocket: RocketLauncher,
    bubble: BubbleLauncher,
    flamethrower: Flamethrower
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
const SHOP_WEAPONS = Object.freeze({
    bubble: {
        price: 100
    },
    flamethrower: {
        price: 250
    }
});
const SHOP_WEAPON_CODES = Object.freeze(Object.keys(SHOP_WEAPONS));

// 1v1 spawns
const SPAWN_POSITIONS = {
    1: { x: -MAP_RADIUS + 50, y: 0 },
    2: { x: MAP_RADIUS - 50, y: 0 }
};

// rate limiting
const RATE_LIMITS = {
    findGame: { maxRequests: 5, windowMs: 60000 }, // 5 requests per minute
    findFreeForAll: { maxRequests: 5, windowMs: 60000 }, // 5 requests per minute
    findTwoVsTwo: { maxRequests: 5, windowMs: 60000 }, // 5 requests per minute
    chatMessage: { maxRequests: 8, windowMs: 4000 }, // 8 messages per 4 seconds
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

function isProduction() {
    return process.env.NODE_ENV === 'production';
}

function parseCookieHeader(cookieHeader = '') {
    if (!cookieHeader) {
        return {};
    }

    return cookieHeader
        .split(';')
        .map((part) => part.trim())
        .filter(Boolean)
        .reduce((acc, part) => {
            const separatorIndex = part.indexOf('=');
            if (separatorIndex <= 0) {
                return acc;
            }

            const key = part.slice(0, separatorIndex).trim();
            const value = part.slice(separatorIndex + 1).trim();
            acc[key] = value;
            return acc;
        }, {});
}

function createSessionCookieValue(sessionToken) {
    const attributes = [
        `${SESSION_COOKIE_NAME}=${sessionToken}`,
        'Path=/',
        'HttpOnly',
        'SameSite=Lax',
        `Max-Age=${Math.floor(SESSION_DURATION_MS / 1000)}`
    ];

    if (isProduction()) {
        attributes.push('Secure');
    }

    return attributes.join('; ');
}

function createClearSessionCookieValue() {
    const attributes = [
        `${SESSION_COOKIE_NAME}=`,
        'Path=/',
        'HttpOnly',
        'SameSite=Lax',
        'Max-Age=0'
    ];

    if (isProduction()) {
        attributes.push('Secure');
    }

    return attributes.join('; ');
}

function hashSessionToken(sessionToken) {
    return crypto.createHash('sha256').update(sessionToken).digest('hex');
}

function generateSessionToken() {
    return crypto.randomBytes(SESSION_TOKEN_BYTES).toString('base64url');
}

function getResponseState(res) {
    let state = responseStates.get(res);
    if (state) {
        return state;
    }

    state = {
        aborted: false,
        completed: false,
        abortListeners: []
    };
    responseStates.set(res, state);

    res.onAborted(() => {
        state.aborted = true;
        const listeners = state.abortListeners.splice(0, state.abortListeners.length);
        for (const listener of listeners) {
            try {
                listener();
            } catch (_error) {
                // Ignore listener errors to avoid crashing abort path.
            }
        }
    });

    return state;
}

function onResponseAborted(res, callback) {
    const state = getResponseState(res);
    if (state.aborted) {
        callback();
        return () => {};
    }

    state.abortListeners.push(callback);
    return () => {
        const index = state.abortListeners.indexOf(callback);
        if (index >= 0) {
            state.abortListeners.splice(index, 1);
        }
    };
}

function createJsonResponse(res, status, payload, extraHeaders = []) {
    const state = getResponseState(res);
    if (state.aborted || state.completed) {
        return;
    }

    const body = JSON.stringify(payload);
    try {
        res.cork(() => {
            if (state.aborted || state.completed) {
                return;
            }
            res.writeStatus(status);
            res.writeHeader('Content-Type', 'application/json; charset=utf-8');
            for (const [key, value] of extraHeaders) {
                res.writeHeader(key, value);
            }
            res.end(body);
            state.completed = true;
        });
    } catch (_error) {
        // If response was already aborted/completed, ignore to keep server alive.
    }
}

function readJsonBody(res, maxBytes = 32 * 1024) {
    return new Promise((resolve, reject) => {
        const state = getResponseState(res);
        let buffer = Buffer.alloc(0);
        let completed = false;

        const detachAbortListener = onResponseAborted(res, () => {
            if (!completed) {
                completed = true;
                reject(new Error('Request aborted'));
            }
        });

        res.onData((chunk, isLast) => {
            if (state.aborted || completed) {
                return;
            }

            const dataChunk = Buffer.from(chunk);
            if (buffer.length + dataChunk.length > maxBytes) {
                completed = true;
                reject(new Error('Payload too large'));
                return;
            }

            buffer = Buffer.concat([buffer, dataChunk]);

            if (!isLast) {
                return;
            }

            completed = true;
            detachAbortListener();

            if (buffer.length === 0) {
                resolve({});
                return;
            }

            try {
                resolve(JSON.parse(buffer.toString('utf8')));
            } catch (error) {
                reject(new Error('Invalid JSON'));
            }
        });
    });
}

function getDatabaseConfig() {
    return {
        host: process.env.DB_HOST || '127.0.0.1',
        port: Number(process.env.DB_PORT || 5432),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'boox_shoot',
        max: Number(process.env.DB_CONNECTION_LIMIT || 10),
        idleTimeoutMillis: 30_000
    };
}

async function initializeDatabase() {
    try {
        dbPool = new Pool(getDatabaseConfig());
        await dbPool.query('SELECT 1');
        await dbPool.query(`
            CREATE TABLE IF NOT EXISTS accounts (
                id BIGSERIAL PRIMARY KEY,
                google_sub VARCHAR(191) NOT NULL UNIQUE,
                email VARCHAR(320) NOT NULL,
                display_name VARCHAR(120) NULL,
                avatar_url TEXT NULL,
                bux INTEGER NOT NULL DEFAULT 0,
                elo INTEGER NOT NULL DEFAULT 500,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);
        await dbPool.query(`
            ALTER TABLE accounts
            ALTER COLUMN display_name DROP NOT NULL
        `);
        await dbPool.query(`
            ALTER TABLE accounts
            ADD COLUMN IF NOT EXISTS owned_weapons TEXT[] NOT NULL DEFAULT '{}'
        `);
        await dbPool.query(`
            CREATE TABLE IF NOT EXISTS account_sessions (
                id BIGSERIAL PRIMARY KEY,
                account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
                token_hash CHAR(64) NOT NULL UNIQUE,
                expires_at TIMESTAMPTZ NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);
        await dbPool.query(`
            CREATE INDEX IF NOT EXISTS idx_account_sessions_account_id
            ON account_sessions (account_id)
        `);
        await dbPool.query(`
            CREATE INDEX IF NOT EXISTS idx_account_sessions_expires_at
            ON account_sessions (expires_at)
        `);

        await cleanupExpiredSessions();
        logger.info('PostgreSQL auth tables ready');
    } catch (error) {
        dbPool = null;
        logger.error('Failed to initialize PostgreSQL pool', error);
    }
}

async function cleanupExpiredSessions() {
    if (!dbPool) {
        return;
    }

    try {
        await dbPool.query('DELETE FROM account_sessions WHERE expires_at <= NOW()');
    } catch (error) {
        logger.warn('Failed cleaning expired sessions', { error: error.message });
    }
}

function sanitizeAccount(accountRow) {
    if (!accountRow) {
        return null;
    }

    return {
        id: accountRow.id,
        email: accountRow.email,
        displayName: accountRow.display_name,
        avatarUrl: accountRow.avatar_url,
        bux: Number(accountRow.bux ?? DEFAULT_BUX),
        elo: Number(accountRow.elo ?? DEFAULT_ELO),
        ownedWeapons: normalizeOwnedWeapons(accountRow.owned_weapons)
    };
}

function normalizeOwnedWeapons(ownedWeapons) {
    if (!Array.isArray(ownedWeapons)) {
        return [];
    }

    return [...new Set(
        ownedWeapons
            .map((weaponType) => typeof weaponType === 'string' ? weaponType.trim().toLowerCase() : '')
            .filter((weaponType) => SHOP_WEAPON_CODES.includes(weaponType))
    )];
}

function isWeaponOwned(weaponType, ownedWeapons = []) {
    if (!VALID_WEAPONS.includes(weaponType)) {
        return false;
    }

    if (!SHOP_WEAPON_CODES.includes(weaponType)) {
        return true;
    }

    return normalizeOwnedWeapons(ownedWeapons).includes(weaponType);
}

function normalizeDisplayName(value) {
    if (typeof value !== 'string') {
        return '';
    }

    return value.trim().replace(/\s+/g, ' ');
}

function isValidDisplayName(displayName) {
    if (displayName.length < 3 || displayName.length > 24) {
        return false;
    }

    return /^[A-Za-z0-9 _\-]+$/.test(displayName);
}

function getGoogleClientId() {
    return (process.env.GOOGLE_CLIENT_ID || '').trim();
}

async function verifyGoogleIdToken(idToken) {
    const googleClientId = getGoogleClientId();
    if (!googleClientId) {
        throw new Error('GOOGLE_CLIENT_ID is not configured');
    }

    const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AUTH_ENDPOINT_TIMEOUT_MS);

    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
            throw new Error('Google token verification failed');
        }

        const data = await response.json();
        const issuerValid = data.iss === 'https://accounts.google.com' || data.iss === 'accounts.google.com';
        const audienceValid = data.aud === googleClientId;
        const expiresAt = Number(data.exp || 0) * 1000;
        const notExpired = Number.isFinite(expiresAt) && expiresAt > Date.now();
        const emailVerified = data.email_verified === 'true' || data.email_verified === true;

        if (!issuerValid || !audienceValid || !notExpired || !emailVerified || !data.sub || !data.email) {
            throw new Error('Invalid Google token claims');
        }

        return {
            sub: data.sub,
            email: data.email,
            displayName: data.name || data.email,
            picture: data.picture || null
        };
    } finally {
        clearTimeout(timeout);
    }
}

async function upsertGoogleAccount(profile) {
    if (!dbPool) {
        throw new Error('Database unavailable');
    }

    const rows = await dbPool.query(
        `
            INSERT INTO accounts (google_sub, email, display_name, avatar_url, bux, elo, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            ON CONFLICT (google_sub) DO UPDATE SET
                email = EXCLUDED.email,
                avatar_url = EXCLUDED.avatar_url,
                updated_at = NOW()
            RETURNING id, email, display_name, avatar_url, bux, elo, owned_weapons
        `,
        [profile.sub, profile.email, null, profile.picture, DEFAULT_BUX, DEFAULT_ELO]
    );

    return sanitizeAccount(rows.rows[0]);
}

async function createSessionForAccount(accountId) {
    if (!dbPool) {
        throw new Error('Database unavailable');
    }

    const token = generateSessionToken();
    const tokenHash = hashSessionToken(token);
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    await dbPool.query(
        `INSERT INTO account_sessions (account_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
        [accountId, tokenHash, expiresAt]
    );

    return token;
}

async function getAccountBySessionToken(sessionToken) {
    if (!dbPool || !sessionToken) {
        return null;
    }

    const tokenHash = hashSessionToken(sessionToken);
    const rows = await dbPool.query(
        `
            SELECT a.id, a.email, a.display_name, a.avatar_url, a.bux, a.elo, a.owned_weapons
            FROM account_sessions AS s
            INNER JOIN accounts AS a ON a.id = s.account_id
            WHERE s.token_hash = $1 AND s.expires_at > NOW()
            LIMIT 1
        `,
        [tokenHash]
    );

    return sanitizeAccount(rows.rows[0]);
}

async function invalidateSession(sessionToken) {
    if (!dbPool || !sessionToken) {
        return;
    }

    const tokenHash = hashSessionToken(sessionToken);
    await dbPool.query(`DELETE FROM account_sessions WHERE token_hash = $1`, [tokenHash]);
}

async function updateAccountDisplayNameBySessionToken(sessionToken, displayName) {
    if (!dbPool || !sessionToken) {
        return null;
    }

    const tokenHash = hashSessionToken(sessionToken);
    const result = await dbPool.query(
        `
            UPDATE accounts AS a
            SET display_name = $1, updated_at = NOW()
            FROM account_sessions AS s
            WHERE s.token_hash = $2
              AND s.expires_at > NOW()
              AND s.account_id = a.id
              AND a.display_name IS NULL
            RETURNING a.id, a.email, a.display_name, a.avatar_url, a.bux, a.elo, a.owned_weapons
        `,
        [displayName, tokenHash]
    );

    return sanitizeAccount(result.rows[0]);
}

function createGuestIdentity() {
    return {
        mode: 'guest',
        accountId: null,
        displayName: null,
        bux: DEFAULT_BUX,
        elo: DEFAULT_ELO,
        effectiveElo: DEFAULT_ELO,
        ownedWeapons: []
    };
}

function getEffectiveElo(identity) {
    if (!identity) {
        return DEFAULT_ELO;
    }
    if (identity.mode !== 'account') {
        return DEFAULT_ELO;
    }
    return Number.isFinite(Number(identity.elo)) ? Number(identity.elo) : DEFAULT_ELO;
}

function calculateExpectedScore(playerElo, opponentElo) {
    return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
}

function calculateEloDelta(playerElo, opponentElo, actualScore) {
    const expectedScore = calculateExpectedScore(playerElo, opponentElo);
    return Math.round(ELO_K_FACTOR * (actualScore - expectedScore));
}

async function updateAccountEloById(accountId, nextElo) {
    if (!dbPool || !accountId) {
        return null;
    }

    const normalizedElo = Math.max(MIN_ACCOUNT_ELO, Math.round(Number(nextElo) || DEFAULT_ELO));
    const result = await dbPool.query(
        `
            UPDATE accounts
            SET elo = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING id, email, display_name, avatar_url, bux, elo, owned_weapons
        `,
        [normalizedElo, accountId]
    );

    return sanitizeAccount(result.rows[0]);
}

async function updateAccountBuxById(accountId, buxDelta) {
    if (!dbPool || !accountId) {
        return null;
    }

    const normalizedDelta = Math.max(0, Math.round(Number(buxDelta) || 0));
    if (normalizedDelta <= 0) {
        const result = await dbPool.query(
            `
                SELECT id, email, display_name, avatar_url, bux, elo, owned_weapons
                FROM accounts
                WHERE id = $1
                LIMIT 1
            `,
            [accountId]
        );
        return sanitizeAccount(result.rows[0]);
    }

    const result = await dbPool.query(
        `
            UPDATE accounts
            SET bux = bux + $1, updated_at = NOW()
            WHERE id = $2
            RETURNING id, email, display_name, avatar_url, bux, elo, owned_weapons
        `,
        [normalizedDelta, accountId]
    );

    return sanitizeAccount(result.rows[0]);
}

async function resolveSocketIdentity(socket) {
    if (!socket) {
        return createGuestIdentity();
    }

    const sessionToken = typeof socket.sessionToken === 'string' ? socket.sessionToken : '';
    if (!sessionToken) {
        socket.identityResolved = true;
        socket.identity = createGuestIdentity();
        socketIdentities.set(socket.id, socket.identity);
        return socket.identity;
    }

    try {
        const account = await getAccountBySessionToken(sessionToken);
        if (!account) {
            socket.identityResolved = true;
            socket.identity = createGuestIdentity();
            socketIdentities.set(socket.id, socket.identity);
            return socket.identity;
        }

        socket.identityResolved = true;
        socket.identity = {
            mode: 'account',
            accountId: account.id,
            displayName: normalizeDisplayName(account.displayName || ''),
            bux: Number(account.bux ?? DEFAULT_BUX),
            elo: Number(account.elo ?? DEFAULT_ELO),
            effectiveElo: Number(account.elo ?? DEFAULT_ELO),
            ownedWeapons: normalizeOwnedWeapons(account.ownedWeapons)
        };
        socketIdentities.set(socket.id, socket.identity);
        return socket.identity;
    } catch (_error) {
        if (socket.identityResolved && socket.identity) {
            socketIdentities.set(socket.id, socket.identity);
            return socket.identity;
        }
        socket.identityResolved = true;
        socket.identity = createGuestIdentity();
        socketIdentities.set(socket.id, socket.identity);
        return socket.identity;
    }
}

async function purchaseAccountWeapon(accountId, weaponType) {
    if (!dbPool || !accountId) {
        throw new Error('Database unavailable');
    }

    const normalizedWeaponType = typeof weaponType === 'string' ? weaponType.trim().toLowerCase() : '';
    const listing = SHOP_WEAPONS[normalizedWeaponType];
    if (!listing) {
        return { error: 'Weapon is not sold in the shop', status: '400 Bad Request' };
    }

    const client = await dbPool.connect();
    try {
        await client.query('BEGIN');
        const result = await client.query(
            `
                SELECT id, email, display_name, avatar_url, bux, elo, owned_weapons
                FROM accounts
                WHERE id = $1
                FOR UPDATE
            `,
            [accountId]
        );

        const account = result.rows[0];
        if (!account) {
            await client.query('ROLLBACK');
            return { error: 'Authentication required', status: '401 Unauthorized' };
        }

        const ownedWeapons = normalizeOwnedWeapons(account.owned_weapons);
        if (ownedWeapons.includes(normalizedWeaponType)) {
            await client.query('ROLLBACK');
            return { error: 'Weapon already purchased', status: '409 Conflict' };
        }

        const currentBux = Number(account.bux ?? DEFAULT_BUX);
        if (currentBux < listing.price) {
            await client.query('ROLLBACK');
            return { error: 'Not enough bux', status: '409 Conflict' };
        }

        const nextOwnedWeapons = [...ownedWeapons, normalizedWeaponType];
        const updateResult = await client.query(
            `
                UPDATE accounts
                SET bux = bux - $1,
                    owned_weapons = $2::text[],
                    updated_at = NOW()
                WHERE id = $3
                RETURNING id, email, display_name, avatar_url, bux, elo, owned_weapons
            `,
            [listing.price, nextOwnedWeapons, accountId]
        );

        await client.query('COMMIT');
        return { account: sanitizeAccount(updateResult.rows[0]) };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

function isSameAccountIdentity(leftIdentity, rightIdentity) {
    if (!leftIdentity || !rightIdentity) {
        return false;
    }

    if (leftIdentity.mode !== 'account' || rightIdentity.mode !== 'account') {
        return false;
    }

    if (!leftIdentity.accountId || !rightIdentity.accountId) {
        return false;
    }

    return leftIdentity.accountId === rightIdentity.accountId;
}

function getAccountActiveRooms(identity, excludedSocketId = null) {
    if (!identity || identity.mode !== 'account' || !identity.accountId) {
        return [];
    }

    const rooms = [];
    const seen = new Set();

    for (const [socketId, roomName] of clientRooms.entries()) {
        if (excludedSocketId && socketId === excludedSocketId) {
            continue;
        }

        const otherIdentity = socketIdentities.get(socketId);
        if (!isSameAccountIdentity(identity, otherIdentity)) {
            continue;
        }

        if (!seen.has(roomName)) {
            seen.add(roomName);
            rooms.push(roomName);
        }
    }

    return rooms;
}

function normalizeHostHeader(hostHeader = '') {
    const value = `${hostHeader || ''}`.trim().toLowerCase();
    if (!value) {
        return '';
    }

    const firstHost = value.split(',')[0].trim();
    if (!firstHost) {
        return '';
    }

    if (firstHost.startsWith('[')) {
        const closingBracketIndex = firstHost.indexOf(']');
        if (closingBracketIndex > 1) {
            return firstHost.slice(1, closingBracketIndex);
        }
    }

    const colonCount = (firstHost.match(/:/g) || []).length;
    if (colonCount === 1) {
        return firstHost.split(':')[0];
    }

    return firstHost;
}

function isSocketFromLocalhost(socket) {
    const normalizedHost = normalizeHostHeader(socket?.requestHost || '');
    return normalizedHost === 'localhost' || normalizedHost === '127.0.0.1' || normalizedHost === '::1';
}

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
    
    stopGameLoop(roomName);
    
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

setInterval(() => {
    cleanupExpiredSessions().catch((error) => {
        logger.warn('Session cleanup interval failed', { error: error.message });
    });
}, SESSION_CLEANUP_INTERVAL_MS);

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
    const sessionToken = ws.getUserData()?.sessionToken || '';
    const requestHost = ws.getUserData()?.requestHost || '';

    const socket = {
        id: socketId,
        number: null,
        sessionToken,
        requestHost,
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
            const cookies = parseCookieHeader(req.getHeader('cookie'));
            const sessionToken = typeof cookies[SESSION_COOKIE_NAME] === 'string'
                ? cookies[SESSION_COOKIE_NAME]
                : '';
            const requestHost = req.getHeader('host') || '';
            res.upgrade(
                { socketId, sessionToken, requestHost },
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
            socketIdentities.delete(socketId);
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

    wsApp.get('/api/auth/config', (res) => {
        createJsonResponse(res, '200 OK', {
            googleClientId: getGoogleClientId()
        });
    });

    wsApp.get('/api/mode-status', (res) => {
        createJsonResponse(res, '200 OK', getModeStatus());
    });

    wsApp.get('/api/auth/me', async (res, req) => {
        const responseState = getResponseState(res);

        try {
            const cookies = parseCookieHeader(req.getHeader('cookie'));
            const sessionToken = cookies[SESSION_COOKIE_NAME];
            const account = await getAccountBySessionToken(sessionToken);
            if (responseState.aborted) {
                return;
            }
            createJsonResponse(res, '200 OK', {
                authenticated: Boolean(account),
                account
            });
        } catch (error) {
            if (responseState.aborted) {
                return;
            }
            logger.error('Failed getting auth session', error);
            createJsonResponse(res, '500 Internal Server Error', { error: 'Failed to load session' });
        }
    });

    wsApp.post('/api/auth/google', async (res) => {
        const responseState = getResponseState(res);

        try {
            if (!dbPool) {
                createJsonResponse(res, '503 Service Unavailable', { error: 'Authentication unavailable' });
                return;
            }

            const body = await readJsonBody(res);
            if (responseState.aborted) {
                return;
            }
            const idToken = typeof body.idToken === 'string' ? body.idToken.trim() : '';
            if (!idToken) {
                createJsonResponse(res, '400 Bad Request', { error: 'Missing Google ID token' });
                return;
            }

            const profile = await verifyGoogleIdToken(idToken);
            const account = await upsertGoogleAccount(profile);
            const sessionToken = await createSessionForAccount(account.id);
            if (responseState.aborted) {
                return;
            }

            createJsonResponse(
                res,
                '200 OK',
                { authenticated: true, account },
                [['Set-Cookie', createSessionCookieValue(sessionToken)]]
            );
        } catch (error) {
            if (responseState.aborted) {
                return;
            }
            logger.warn('Google auth failed', { error: error.message });
            createJsonResponse(res, '401 Unauthorized', { error: 'Authentication failed' });
        }
    });

    wsApp.post('/api/auth/logout', async (res, req) => {
        const responseState = getResponseState(res);

        try {
            const cookies = parseCookieHeader(req.getHeader('cookie'));
            const sessionToken = cookies[SESSION_COOKIE_NAME];
            await invalidateSession(sessionToken);
            if (responseState.aborted) {
                return;
            }
            createJsonResponse(
                res,
                '200 OK',
                { success: true },
                [['Set-Cookie', createClearSessionCookieValue()]]
            );
        } catch (error) {
            if (responseState.aborted) {
                return;
            }
            logger.warn('Logout failed', { error: error.message });
            createJsonResponse(res, '500 Internal Server Error', { error: 'Logout failed' });
        }
    });

    wsApp.post('/api/account/display-name', async (res, req) => {
        const responseState = getResponseState(res);

        try {
            const cookies = parseCookieHeader(req.getHeader('cookie'));
            const sessionToken = cookies[SESSION_COOKIE_NAME];
            if (!sessionToken) {
                createJsonResponse(res, '401 Unauthorized', { error: 'Authentication required' });
                return;
            }

            // Attach request body listener immediately for uWS POST handling.
            const bodyPromise = readJsonBody(res);

            const currentAccount = await getAccountBySessionToken(sessionToken);
            if (responseState.aborted) {
                return;
            }

            if (!currentAccount) {
                createJsonResponse(res, '401 Unauthorized', { error: 'Authentication required' });
                return;
            }

            if (normalizeDisplayName(currentAccount.displayName || '')) {
                createJsonResponse(res, '409 Conflict', { error: 'Display name is already set and cannot be changed' });
                return;
            }

            const body = await bodyPromise;
            if (responseState.aborted) {
                return;
            }

            const displayName = normalizeDisplayName(body?.displayName);
            if (!isValidDisplayName(displayName)) {
                createJsonResponse(res, '400 Bad Request', {
                    error: 'Display name must be 3-24 chars and use letters, numbers, spaces, _ or -'
                });
                return;
            }

            const account = await updateAccountDisplayNameBySessionToken(sessionToken, displayName);
            if (responseState.aborted) {
                return;
            }

            if (!account) {
                createJsonResponse(res, '409 Conflict', { error: 'Display name is already set and cannot be changed' });
                return;
            }

            createJsonResponse(res, '200 OK', { success: true, account });
        } catch (error) {
            if (responseState.aborted) {
                return;
            }
            logger.warn('Display name update failed', { error: error.message });
            createJsonResponse(res, '500 Internal Server Error', { error: 'Failed to update display name' });
        }
    });

    wsApp.post('/api/shop/purchase-weapon', async (res, req) => {
        const responseState = getResponseState(res);

        try {
            if (!dbPool) {
                createJsonResponse(res, '503 Service Unavailable', { error: 'Shop unavailable' });
                return;
            }

            const cookies = parseCookieHeader(req.getHeader('cookie'));
            const sessionToken = cookies[SESSION_COOKIE_NAME];
            if (!sessionToken) {
                createJsonResponse(res, '401 Unauthorized', { error: 'Authentication required' });
                return;
            }

            const bodyPromise = readJsonBody(res);
            const currentAccount = await getAccountBySessionToken(sessionToken);
            if (responseState.aborted) {
                return;
            }

            if (!currentAccount) {
                createJsonResponse(res, '401 Unauthorized', { error: 'Authentication required' });
                return;
            }

            const body = await bodyPromise;
            if (responseState.aborted) {
                return;
            }

            const purchaseResult = await purchaseAccountWeapon(currentAccount.id, body?.weaponType);
            if (responseState.aborted) {
                return;
            }

            if (purchaseResult?.error) {
                createJsonResponse(res, purchaseResult.status || '400 Bad Request', { error: purchaseResult.error });
                return;
            }

            createJsonResponse(res, '200 OK', {
                success: true,
                account: purchaseResult.account
            });
        } catch (error) {
            if (responseState.aborted) {
                return;
            }
            logger.warn('Weapon purchase failed', { error: error.message });
            createJsonResponse(res, '500 Internal Server Error', { error: 'Failed to purchase weapon' });
        }
    });

    wsApp.get('/*', (res, req) => {
        serveClientFile(res, req.getUrl());
    });
}

function getFallbackSecondaryWeapon(primaryWeaponType, ownedWeapons = []) {
    const fallbackOrder = [DEFAULT_SECONDARY_WEAPON, DEFAULT_PRIMARY_WEAPON, 'shotgun', 'sniper', 'laser', 'taser', 'rocket', 'bubble', 'flamethrower'];
    return fallbackOrder.find((weapon) => weapon !== primaryWeaponType && isWeaponOwned(weapon, ownedWeapons)) || DEFAULT_SECONDARY_WEAPON;
}

function normalizeLoadout(weaponType, secondaryWeaponType, ownedWeapons = []) {
    const primaryType = weaponType?.toLowerCase();
    const secondaryType = secondaryWeaponType?.toLowerCase();

    const normalizedPrimary = (VALID_WEAPONS.includes(primaryType) && isWeaponOwned(primaryType, ownedWeapons))
        ? primaryType
        : DEFAULT_PRIMARY_WEAPON;
    let normalizedSecondary = VALID_SECONDARY_WEAPONS.includes(secondaryType)
        && isWeaponOwned(secondaryType, ownedWeapons)
        ? secondaryType
        : getFallbackSecondaryWeapon(normalizedPrimary, ownedWeapons);

    if (normalizedSecondary === normalizedPrimary) {
        normalizedSecondary = getFallbackSecondaryWeapon(normalizedPrimary, ownedWeapons);
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

function createPlayer(characterType, weaponType, secondaryWeaponType, sharedAbilityType, playerNumber, id, spawnX = null, spawnY = null, ownedWeapons = []) {
    const charType = characterType?.toLowerCase();
    const normalizedLoadout = normalizeLoadout(weaponType, secondaryWeaponType, ownedWeapons);
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

const oneVsOneBotQueue = [];

function pickRandom(list) {
    if (!Array.isArray(list) || list.length === 0) {
        return null;
    }
    return list[Math.floor(Math.random() * list.length)];
}

function createRandomBotLoadout() {
    const characterType = pickRandom(VALID_CHARACTERS) || 'berserker';
    const weaponType = pickRandom(VALID_WEAPONS) || DEFAULT_PRIMARY_WEAPON;
    const secondaryChoices = VALID_SECONDARY_WEAPONS.filter((weapon) => weapon !== weaponType);
    const secondaryWeaponType = pickRandom(secondaryChoices) || DEFAULT_SECONDARY_WEAPON;
    const sharedAbilityType = pickRandom(VALID_SHARED_ABILITIES) || DEFAULT_SHARED_ABILITY;
    return {
        characterType,
        weaponType,
        secondaryWeaponType,
        sharedAbilityType
    };
}

function makeBotId(prefix = 'bot') {
    return `${prefix}_${makeID(8)}`;
}

function decorateBotPlayer(player) {
    player.isBot = true;
    player.name = `Bot ${player.name || 'Player'}`;
    ensureBotState(player);
    return player;
}

function createBotPlayer(loadout, playerNumber, botId, spawnX = null, spawnY = null) {
    const ownedWeapons = [...SHOP_WEAPON_CODES];
    const bot = createPlayer(
        loadout.characterType,
        loadout.weaponType,
        loadout.secondaryWeaponType,
        loadout.sharedAbilityType,
        playerNumber,
        botId,
        spawnX,
        spawnY,
        ownedWeapons
    );
    return decorateBotPlayer(bot);
}

function ensureOneVsOneBotQueue() {
    if (BOT_ONE_VS_ONE_QUEUE <= 0) {
        oneVsOneBotQueue.length = 0;
        return;
    }
    while (oneVsOneBotQueue.length < BOT_ONE_VS_ONE_QUEUE) {
        oneVsOneBotQueue.push({ queuedAt: Date.now() });
    }
}

function takeOneVsOneBotLoadout() {
    ensureOneVsOneBotQueue();
    if (oneVsOneBotQueue.length === 0) {
        return null;
    }
    oneVsOneBotQueue.shift();
    ensureOneVsOneBotQueue();
    return createRandomBotLoadout();
}

function removeBotFromRoom(roomState, bot) {
    if (!roomState || !bot) return;
    roomState.players = roomState.players.filter((player) => player.id !== bot.id);
    roomPlayers.delete(bot.id);
}

function addBotToFreeForAll(roomState) {
    const spawn = getRandomSpawnPosition();
    const loadout = createRandomBotLoadout();
    const botId = makeBotId('bot_ffa');
    const bot = createBotPlayer(loadout, getRandomPlayerNumber(), botId, spawn.x, spawn.y);
    bot.randomSpawn(roomState);
    roomState.players.push(bot);
}

function refreshFreeForAllBots(roomState) {
    if (!roomState) return;
    const bots = roomState.players.filter((player) => player.isBot);
    for (const bot of bots) {
        removeBotFromRoom(roomState, bot);
    }
    roomState.cacheReset = true;
}

function ensureFreeForAllBots(roomState, forceRefresh = false) {
    if (!roomState) return;
    const now = Date.now();
    if (!roomState.botRefreshAtMs) {
        roomState.botRefreshAtMs = now + BOT_FFA_REFRESH_MS;
    }

    if (forceRefresh || now >= roomState.botRefreshAtMs) {
        refreshFreeForAllBots(roomState);
        roomState.botRefreshAtMs = now + BOT_FFA_REFRESH_MS;
    }

    const bots = roomState.players.filter((player) => player.isBot);
    if (bots.length < BOT_FFA_COUNT) {
        const missing = BOT_FFA_COUNT - bots.length;
        for (let i = 0; i < missing; i++) {
            addBotToFreeForAll(roomState);
        }
        roomState.cacheReset = true;
    } else if (bots.length > BOT_FFA_COUNT) {
        const extra = bots.length - BOT_FFA_COUNT;
        for (let i = 0; i < extra; i++) {
            removeBotFromRoom(roomState, bots[i]);
        }
        roomState.cacheReset = true;
    }
}

function findAvailableRoom(seekerElo = DEFAULT_ELO, options = {}) {
    const seekerIdentity = options.seekerIdentity || null;
    const allowSelfMatch = options.allowSelfMatch === true;
    let selectedRoomName = null;
    let bestDelta = Number.POSITIVE_INFINITY;

    for (const [roomName, gameState] of state.entries()) {
        if (gameState.players.length !== 1 || gameState.gameMode !== '1v1' || gameState.matchEnded) {
            continue;
        }

        const waitingPlayerId = gameState.players[0]?.id;
        const waitingIdentity = waitingPlayerId
            ? (gameState.playerRatings?.[waitingPlayerId] || socketIdentities.get(waitingPlayerId))
            : null;
        if (!allowSelfMatch && isSameAccountIdentity(waitingIdentity, seekerIdentity)) {
            continue;
        }

        const waitingElo = Number(gameState.waitingPlayerElo ?? DEFAULT_ELO);
        const delta = Math.abs(waitingElo - seekerElo);
        if (delta < bestDelta) {
            bestDelta = delta;
            selectedRoomName = roomName;
        }
    }

    return selectedRoomName;
}

function findAvailableTwoVsTwoRoom() {
    for (const [roomName, gameState] of state.entries()) {
        if (!gameState || gameState.gameMode !== '2v2' || gameState.matchEnded) {
            continue;
        }

        const currentPlayers = Array.isArray(gameState.players) ? gameState.players.length : 0;
        if (currentPlayers > 0 && currentPlayers < TWO_VS_TWO_MAX_PLAYERS) {
            return roomName;
        }
    }

    return null;
}

function getTwoVsTwoSpawn(team, teamSlot = 0) {
    const slotY = teamSlot === 0 ? -90 : 90;
    if (team === 'red') {
        return { x: -MAP_RADIUS + 90, y: slotY };
    }

    return { x: MAP_RADIUS - 90, y: slotY };
}

const CHAT_MAX_LENGTH = 180;

function sanitizeChatMessage(value) {
    if (typeof value !== 'string') {
        return '';
    }

    return value
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, CHAT_MAX_LENGTH);
}

function getSocketChatName(socket) {
    const normalizedDisplayName = normalizeDisplayName(socket?.identity?.displayName || '');
    if (normalizedDisplayName) {
        return normalizedDisplayName;
    }

    if (Number.isFinite(Number(socket?.number))) {
        return `Guest-${Number(socket.number)}`;
    }

    const idSuffix = typeof socket?.id === 'string' ? socket.id.slice(-4) : '????';
    return `Guest-${idSuffix}`;
}

function getModeStatus() {
    let oneVsOneQueued = 0;
    let oneVsOnePlaying = 0;
    let freeForAllPlaying = 0;
    let twoVsTwoQueued = 0;
    let twoVsTwoPlaying = 0;

    for (const [roomName, gameState] of state.entries()) {
        if (!gameState) {
            continue;
        }

        if (gameState.gameMode === '1v1') {
            if (gameState.matchEnded) {
                continue;
            }

            const playersInRoom = Array.isArray(gameState.players) ? gameState.players.length : 0;
            if (playersInRoom === 1) {
                oneVsOneQueued += 1;
            } else if (playersInRoom >= 2) {
                oneVsOnePlaying += playersInRoom;
            }
            continue;
        }

        if (roomName === FREE_FOR_ALL_ROOM || gameState.gameMode === 'freeForAll') {
            freeForAllPlaying += Array.isArray(gameState.players) ? gameState.players.length : 0;
            continue;
        }

        if (gameState.gameMode === '2v2') {
            const playersInRoom = Array.isArray(gameState.players) ? gameState.players.length : 0;
            if (playersInRoom > 0 && playersInRoom < TWO_VS_TWO_MAX_PLAYERS) {
                twoVsTwoQueued += playersInRoom;
            } else if (playersInRoom >= TWO_VS_TWO_MAX_PLAYERS) {
                twoVsTwoPlaying += playersInRoom;
            }
        }
    }

    return {
        oneVsOne: {
            queued: oneVsOneQueued + BOT_ONE_VS_ONE_QUEUE,
            playing: oneVsOnePlaying
        },
        freeForAll: {
            queued: 0,
            playing: freeForAllPlaying
        },
        twoVsTwo: {
            queued: twoVsTwoQueued,
            playing: twoVsTwoPlaying
        }
    };
}

const RANDOM_PLAYER_MIN = 3;
const RANDOM_PLAYER_RANGE = 1000;

function getRandomPlayerNumber() {
    return Math.floor(Math.random() * RANDOM_PLAYER_RANGE) + RANDOM_PLAYER_MIN;
}

function ensureFreeForAllRoom() {
    if (state.has(FREE_FOR_ALL_ROOM)) {
        return state.get(FREE_FOR_ALL_ROOM);
    }

    const roomState = createGameState();
    roomState.obstacles = generateNewMap();
    roomState.gameMode = 'freeForAll';
    state.set(FREE_FOR_ALL_ROOM, roomState);
    gameStateCaches.set(FREE_FOR_ALL_ROOM, new GameStateCache());
    startGameLoop(FREE_FOR_ALL_ROOM);
    logger.info('Free for all room created for bots');
    return roomState;
}

function initializeBotSystem() {
    ensureOneVsOneBotQueue();

    if (BOT_FFA_COUNT > 0) {
        const roomState = ensureFreeForAllRoom();
        ensureFreeForAllBots(roomState, true);
    }

    setInterval(() => {
        ensureOneVsOneBotQueue();
        if (BOT_FFA_COUNT <= 0) {
            return;
        }
        const roomState = state.get(FREE_FOR_ALL_ROOM);
        if (!roomState) {
            return;
        }
        ensureFreeForAllBots(roomState);
    }, BOT_MAINTENANCE_INTERVAL_MS);
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
    fullState.isFullState = true;
    socket.emit('gameState', fullState);
}

function broadcastFullGameState(gameCode) {
    const cache = gameStateCaches.get(gameCode);
    const gameState = state.get(gameCode);
    if (!cache || !gameState) return;

    const fullState = cache.serializeGameState(gameState);
    fullState.isFullState = true;

    for (const player of gameState.players || []) {
        if (!player?.id) continue;
        io.to(player.id).emit('gameState', fullState);
    }
}

function calculateMatchBuxReward(player, didWin) {
    const coins = Math.max(0, Math.round(Number(player?.coinsCollected || 0)));
    const kills = Math.max(0, Math.round(Number(player?.kills || 0)));
    const victoryBonus = didWin ? 5 : 0;
    return coins + kills + victoryBonus;
}

async function applyMatchBuxReward(identity, socketId, buxEarned) {
    const normalizedEarned = Math.max(0, Math.round(Number(buxEarned) || 0));
    if (identity?.mode !== 'account' || !identity.accountId) {
        return {
            applied: 0,
            newBux: Number(identity?.bux ?? DEFAULT_BUX)
        };
    }

    try {
        const updatedAccount = await updateAccountBuxById(identity.accountId, normalizedEarned);
        const resultingBux = Number(updatedAccount?.bux ?? (Number(identity.bux ?? DEFAULT_BUX) + normalizedEarned));
        if (socketId && socketIdentities.has(socketId)) {
            const updatedIdentity = {
                ...socketIdentities.get(socketId),
                bux: resultingBux
            };
            socketIdentities.set(socketId, updatedIdentity);
            const socketInfo = socketState.get(socketId);
            if (socketInfo?.socket) {
                socketInfo.socket.identityResolved = true;
                socketInfo.socket.identity = updatedIdentity;
            }
        }
        return {
            applied: normalizedEarned,
            newBux: resultingBux
        };
    } catch (error) {
        logger.warn('Failed to update bux rewards', { error: error.message, socketId });
        return {
            applied: 0,
            newBux: Number(identity?.bux ?? DEFAULT_BUX)
        };
    }
}

async function emitFreeForAllDepartureResult(socket, player) {
    const kills = Math.max(0, Math.round(Number(player?.kills || 0)));
    const coinsCollected = Math.max(0, Math.round(Number(player?.coinsCollected || 0)));
    if (kills < 1 && coinsCollected < 1) {
        return false;
    }

    const identity = await resolveSocketIdentity(socket);
    const buxEarned = calculateMatchBuxReward(player, false);
    const buxResult = await applyMatchBuxReward(identity, socket.id, buxEarned);

    socket.emit('matchEnded', {
        gameMode: 'freeForAll',
        reason: 'leave',
        yourKills: kills,
        opponentKills: 0,
        coinsCollected,
        buxEarned,
        buxDelta: buxResult.applied,
        newBux: buxResult.newBux
    });

    return true;
}

async function finalizeOneVsOneMatch(gameCode, options = {}) {
    const gameState = state.get(gameCode);
    if (!gameState || gameState.gameMode !== '1v1' || gameState.matchResultEmitted) {
        return;
    }

    const participants = gameState.players.slice(0, 2);
    if (participants.length < 2) {
        gameState.matchResultEmitted = true;
        gameState.matchResultProcessing = false;
        return;
    }

    const winnerId = options.winnerId || gameState.matchWinnerId;
    if (!winnerId) {
        gameState.matchResultProcessing = false;
        return;
    }

    const loser = participants.find((player) => player.id !== winnerId);
    const winner = participants.find((player) => player.id === winnerId);
    if (!winner || !loser) {
        gameState.matchResultProcessing = false;
        return;
    }

    const ratingSnapshots = gameState.playerRatings || {};
    const winnerIdentity = ratingSnapshots[winner.id] || socketIdentities.get(winner.id) || createGuestIdentity();
    const loserIdentity = ratingSnapshots[loser.id] || socketIdentities.get(loser.id) || createGuestIdentity();
    const winnerEloBefore = getEffectiveElo(winnerIdentity);
    const loserEloBefore = getEffectiveElo(loserIdentity);

    const winnerDeltaRaw = calculateEloDelta(winnerEloBefore, loserEloBefore, 1);
    const loserDeltaRaw = -winnerDeltaRaw;
    const winnerDeltaApplied = winnerIdentity.mode === 'account' ? winnerDeltaRaw : 0;
    const loserDeltaApplied = loserIdentity.mode === 'account' ? loserDeltaRaw : 0;
    const winnerEloAfter = winnerIdentity.mode === 'account'
        ? Math.max(MIN_ACCOUNT_ELO, winnerEloBefore + winnerDeltaApplied)
        : DEFAULT_ELO;
    const loserEloAfter = loserIdentity.mode === 'account'
        ? Math.max(MIN_ACCOUNT_ELO, loserEloBefore + loserDeltaApplied)
        : DEFAULT_ELO;

    const updates = [];
    if (winnerIdentity.mode === 'account' && winnerIdentity.accountId) {
        updates.push(updateAccountEloById(winnerIdentity.accountId, winnerEloAfter));
    } else {
        updates.push(Promise.resolve(null));
    }
    if (loserIdentity.mode === 'account' && loserIdentity.accountId) {
        updates.push(updateAccountEloById(loserIdentity.accountId, loserEloAfter));
    } else {
        updates.push(Promise.resolve(null));
    }

    try {
        const [winnerAccountUpdate, loserAccountUpdate] = await Promise.all(updates);
        if (winnerAccountUpdate && socketIdentities.has(winner.id)) {
            const updatedIdentity = {
                ...socketIdentities.get(winner.id),
                bux: Number(winnerAccountUpdate.bux ?? socketIdentities.get(winner.id)?.bux ?? DEFAULT_BUX),
                elo: Number(winnerAccountUpdate.elo ?? winnerEloAfter),
                effectiveElo: Number(winnerAccountUpdate.elo ?? winnerEloAfter)
            };
            socketIdentities.set(winner.id, updatedIdentity);
            const winnerSocketState = socketState.get(winner.id);
            if (winnerSocketState?.socket) {
                winnerSocketState.socket.identityResolved = true;
                winnerSocketState.socket.identity = updatedIdentity;
            }
        }
        if (loserAccountUpdate && socketIdentities.has(loser.id)) {
            const updatedIdentity = {
                ...socketIdentities.get(loser.id),
                bux: Number(loserAccountUpdate.bux ?? socketIdentities.get(loser.id)?.bux ?? DEFAULT_BUX),
                elo: Number(loserAccountUpdate.elo ?? loserEloAfter),
                effectiveElo: Number(loserAccountUpdate.elo ?? loserEloAfter)
            };
            socketIdentities.set(loser.id, updatedIdentity);
            const loserSocketState = socketState.get(loser.id);
            if (loserSocketState?.socket) {
                loserSocketState.socket.identityResolved = true;
                loserSocketState.socket.identity = updatedIdentity;
            }
        }
    } catch (error) {
        logger.warn('Failed to update Elo ratings', { error: error.message, gameCode });
    }

    const winnerBuxEarned = calculateMatchBuxReward(winner, true);
    const loserBuxEarned = calculateMatchBuxReward(loser, false);
    const [winnerBuxResult, loserBuxResult] = await Promise.all([
        applyMatchBuxReward(winnerIdentity, winner.id, winnerBuxEarned),
        applyMatchBuxReward(loserIdentity, loser.id, loserBuxEarned)
    ]);

    const targetKills = gameState.matchTargetKills || ONE_VS_ONE_KILL_TARGET;
    const reason = options.reason || gameState.matchEndReason || 'elimination';
    for (const participant of participants) {
        const isWinner = participant.id === winner.id;
        const yourIdentity = isWinner ? winnerIdentity : loserIdentity;
        const yourDelta = isWinner ? winnerDeltaApplied : loserDeltaApplied;
        const yourEloAfter = isWinner ? winnerEloAfter : loserEloAfter;
        const opponentEloBefore = isWinner ? loserEloBefore : winnerEloBefore;
        const yourBuxEarned = isWinner ? winnerBuxEarned : loserBuxEarned;
        const yourBuxApplied = isWinner ? winnerBuxResult.applied : loserBuxResult.applied;
        const yourNewBux = isWinner ? winnerBuxResult.newBux : loserBuxResult.newBux;
        const yourCoinsCollected = Math.max(0, Math.round(Number(participant.coinsCollected || 0)));
        io.to(participant.id).emit('matchEnded', {
            winnerId: winner.id,
            youWon: isWinner,
            yourKills: participant.kills,
            opponentKills: participants.find((p) => p.id !== participant.id)?.kills ?? 0,
            coinsCollected: yourCoinsCollected,
            buxEarned: yourBuxEarned,
            buxDelta: yourBuxApplied,
            newBux: yourNewBux,
            targetKills,
            reason,
            rated: yourIdentity.mode === 'account',
            eloDelta: yourDelta,
            newElo: yourIdentity.mode === 'account' ? yourEloAfter : DEFAULT_ELO,
            opponentElo: opponentEloBefore
        });
    }

    gameState.matchResultEmitted = true;
    gameState.matchResultProcessing = false;
}

async function finalizeTwoVsTwoMatch(gameCode, options = {}) {
    const gameState = state.get(gameCode);
    if (!gameState || gameState.gameMode !== '2v2' || gameState.matchResultEmitted) {
        return;
    }

    const teamLives = gameState.teamLives || { red: 0, blue: 0 };
    const winnerTeam = options.winnerTeam === 'red'
        ? 'red'
        : (options.winnerTeam === 'blue'
            ? 'blue'
            : (gameState.matchWinnerTeam === 'red'
                ? 'red'
                : (gameState.matchWinnerTeam === 'blue'
                    ? 'blue'
                    : (Number(teamLives.red || 0) > Number(teamLives.blue || 0) ? 'red' : 'blue'))));
    const reason = options.reason || gameState.matchEndReason || 'elimination';
    const participants = Array.isArray(gameState.players) ? gameState.players : [];
    const ratingSnapshots = gameState.playerRatings || {};

    const rewardResults = new Map();
    const rewardTasks = participants.map(async (participant) => {
        const identity = ratingSnapshots[participant.id] || socketIdentities.get(participant.id) || createGuestIdentity();
        const didWin = participant.team === winnerTeam;
        const buxEarned = calculateMatchBuxReward(participant, didWin);
        const buxResult = await applyMatchBuxReward(identity, participant.id, buxEarned);
        rewardResults.set(participant.id, {
            buxEarned,
            buxApplied: buxResult.applied,
            newBux: buxResult.newBux
        });
    });
    await Promise.all(rewardTasks);

    for (const participant of participants) {
        const rewards = rewardResults.get(participant.id) || { buxEarned: 0, buxApplied: 0, newBux: DEFAULT_BUX };
        io.to(participant.id).emit('matchEnded', {
            youWon: participant.team === winnerTeam,
            yourKills: participant.kills || 0,
            opponentKills: 0,
            targetKills: 0,
            reason,
            rated: false,
            eloDelta: 0,
            newElo: DEFAULT_ELO,
            opponentElo: DEFAULT_ELO,
            winnerTeam,
            teamLives,
            coinsCollected: Math.max(0, Math.round(Number(participant.coinsCollected || 0))),
            buxEarned: rewards.buxEarned,
            buxDelta: rewards.buxApplied,
            newBux: rewards.newBux
        });
    }

    gameState.matchResultEmitted = true;
    gameState.matchResultProcessing = false;
}

io.on('connection', (socket) => {
    healthMetrics.connections++;
    logger.info(`Client connected: ${socket.id}`);

    const handleFindGame = async (data) => {
        try {
            if (isRateLimited(socket.id, 'findGame')) {
                socket.emit('error', 'Rate limit exceeded. Please try again later.');
                return;
            }
            
            if (clientRooms.has(socket.id)) {
                socket.emit('error', 'Already in a match or searching for one');
                return;
            }
            
            const identity = await resolveSocketIdentity(socket);
            const localhostSelfMatchAllowed = isSocketFromLocalhost(socket);
            const activeAccountRooms = getAccountActiveRooms(identity, socket.id);
            let roomName = null;

            if (activeAccountRooms.length > 0) {
                const selfMatchRoomName = activeAccountRooms.find((candidateRoomName) => {
                    const candidateRoomState = state.get(candidateRoomName);
                    if (!candidateRoomState || candidateRoomState.gameMode !== '1v1' || candidateRoomState.matchEnded) {
                        return false;
                    }
                    if (candidateRoomState.players.length !== 1) {
                        return false;
                    }

                    const waitingPlayerId = candidateRoomState.players[0]?.id;
                    const waitingIdentity = waitingPlayerId
                        ? (candidateRoomState.playerRatings?.[waitingPlayerId] || socketIdentities.get(waitingPlayerId))
                        : null;

                    return isSameAccountIdentity(waitingIdentity, identity);
                });

                if (!localhostSelfMatchAllowed || !selfMatchRoomName || activeAccountRooms.length > 1) {
                    socket.emit('error', 'Already in a match or searching for one');
                    return;
                }

                roomName = selfMatchRoomName;
            } else {
                roomName = findAvailableRoom(identity.effectiveElo, {
                    seekerIdentity: identity,
                    allowSelfMatch: localhostSelfMatchAllowed
                });
            }
            
            if (roomName) {
                clientRooms.set(socket.id, roomName);
                socket.join(roomName);
                socket.number = 2;
                
                const player = createPlayer(data?.characterType, data?.weaponType, data?.secondaryWeaponType, data?.sharedAbilityType, 2, socket.id, null, null, identity.ownedWeapons);
                const roomState = state.get(roomName);
                roomState.players.push(player);
                roomState.playerRatings = roomState.playerRatings || {};
                roomState.playerRatings[socket.id] = {
                    mode: identity.mode,
                    accountId: identity.accountId || null,
                    elo: identity.effectiveElo,
                    effectiveElo: identity.effectiveElo
                };
                delete roomState.waitingPlayerElo;
                
                socket.emit('init', 2);
                socket.emit('gameFound', roomName);
                
                io.sockets.in(roomName).emit('gameStarting');
                broadcastFullGameState(roomName);
                startGameLoop(roomName);
                
                logger.info(`Player joined existing room: ${roomName}`);
            } else {
                roomName = makeID(5);
                clientRooms.set(socket.id, roomName);
                
                state.set(roomName, createGameState());
                state.get(roomName).obstacles = generateNewMap();
                state.get(roomName).gameMode = '1v1';
                state.get(roomName).playerRatings = {
                    [socket.id]: {
                        mode: identity.mode,
                        accountId: identity.accountId || null,
                        elo: identity.effectiveElo,
                        effectiveElo: identity.effectiveElo
                    }
                };
                state.get(roomName).waitingPlayerElo = identity.effectiveElo;
                gameStateCaches.set(roomName, new GameStateCache());
                
                const player = createPlayer(data?.characterType, data?.weaponType, data?.secondaryWeaponType, data?.sharedAbilityType, 1, socket.id, null, null, identity.ownedWeapons);
                state.get(roomName).players.push(player);

                socket.join(roomName);
                socket.number = 1;
                socket.emit('init', 1);
                socket.emit('gameFound', roomName);

                const botLoadout = takeOneVsOneBotLoadout();
                if (botLoadout) {
                    const botId = makeBotId('bot_1v1');
                    const botPlayer = createBotPlayer(botLoadout, 2, botId, null, null);
                    const roomState = state.get(roomName);
                    roomState.players.push(botPlayer);
                    roomState.playerRatings = roomState.playerRatings || {};
                    roomState.playerRatings[botId] = {
                        mode: 'guest',
                        accountId: null,
                        elo: DEFAULT_ELO,
                        effectiveElo: DEFAULT_ELO
                    };
                    delete roomState.waitingPlayerElo;
                    io.sockets.in(roomName).emit('gameStarting');
                    broadcastFullGameState(roomName);
                    startGameLoop(roomName);
                    logger.info(`New 1v1 room started with bot: ${roomName}`);
                } else {
                    socket.emit('waitingForPlayer');
                    sendFullGameState(socket, roomName);
                    logger.info(`New room created: ${roomName}`);
                }
            }
        } catch (error) {
            logger.error('Error in handleFindGame', error);
            healthMetrics.errors++;
            socket.emit('error', 'Internal server error');
        }
    };

    const handleFindFreeForAll = async (data) => {
        try {
            if (isRateLimited(socket.id, 'findFreeForAll')) {
                socket.emit('error', 'Rate limit exceeded. Please try again later.');
                return;
            }
            
            if (clientRooms.has(socket.id)) {
                socket.emit('error', 'Already in a match');
                return;
            }

            const identity = await resolveSocketIdentity(socket);
            if (getAccountActiveRooms(identity, socket.id).length > 0) {
                socket.emit('error', 'Already in a match or searching for one');
                return;
            }

            if (!state.has(FREE_FOR_ALL_ROOM)) {
                state.set(FREE_FOR_ALL_ROOM, createGameState());
                state.get(FREE_FOR_ALL_ROOM).obstacles = generateNewMap();
                state.get(FREE_FOR_ALL_ROOM).gameMode = 'freeForAll';
                gameStateCaches.set(FREE_FOR_ALL_ROOM, new GameStateCache());
                startGameLoop(FREE_FOR_ALL_ROOM);
                
                logger.info('Free for all room created');
            }
            ensureFreeForAllBots(state.get(FREE_FOR_ALL_ROOM));

            clientRooms.set(socket.id, FREE_FOR_ALL_ROOM);
            socket.join(FREE_FOR_ALL_ROOM);
            socket.number = getRandomPlayerNumber();

            const spawnPos = getRandomSpawnPosition();
            const player = createPlayer(data?.characterType, data?.weaponType, data?.secondaryWeaponType, data?.sharedAbilityType, socket.number, socket.id, spawnPos.x, spawnPos.y, identity.ownedWeapons);
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

    const handleFindTwoVsTwo = async (data) => {
        try {
            if (isRateLimited(socket.id, 'findTwoVsTwo')) {
                socket.emit('error', 'Rate limit exceeded. Please try again later.');
                return;
            }

            if (clientRooms.has(socket.id)) {
                socket.emit('error', 'Already in a match or searching for one');
                return;
            }

            const identity = await resolveSocketIdentity(socket);
            if (getAccountActiveRooms(identity, socket.id).length > 0) {
                socket.emit('error', 'Already in a match or searching for one');
                return;
            }

            let roomName = findAvailableTwoVsTwoRoom();
            if (!roomName) {
                roomName = `${TWO_VS_TWO_ROOM_PREFIX}${makeID(5)}`;
                state.set(roomName, createGameState());
                state.get(roomName).obstacles = generateNewMap();
                state.get(roomName).gameMode = '2v2';
                state.get(roomName).teamLives = {
                    red: TWO_VS_TWO_TEAM_LIVES,
                    blue: TWO_VS_TWO_TEAM_LIVES
                };
                gameStateCaches.set(roomName, new GameStateCache());
            }

            const roomState = state.get(roomName);
            const currentPlayers = roomState.players.length;
            const redCount = roomState.players.filter((player) => player.team === 'red').length;
            const blueCount = roomState.players.filter((player) => player.team === 'blue').length;
            const team = redCount <= blueCount ? 'red' : 'blue';
            const teamSlot = team === 'red' ? redCount : blueCount;
            const spawn = getTwoVsTwoSpawn(team, teamSlot);

            clientRooms.set(socket.id, roomName);
            socket.join(roomName);
            socket.number = currentPlayers + 1;

            const player = createPlayer(
                data?.characterType,
                data?.weaponType,
                data?.secondaryWeaponType,
                data?.sharedAbilityType,
                socket.number,
                socket.id,
                spawn.x,
                spawn.y,
                identity.ownedWeapons
            );
            player.team = team;
            player.isRespawning = false;
            player.respawnTimer = 0;
            player.invulnerableTimer = 0;
            roomState.players.push(player);

            socket.emit('init', socket.number);
            socket.emit('gameFound', roomName);

            const joinedCount = roomState.players.length;
            if (joinedCount >= TWO_VS_TWO_MAX_PLAYERS) {
                io.sockets.in(roomName).emit('gameStarting');
                broadcastFullGameState(roomName);
                startGameLoop(roomName);
                logger.info(`2v2 room started: ${roomName}`);
            } else {
                socket.emit('waitingForPlayer');
                io.sockets.in(roomName).emit('playerJoined', {
                    playerCount: joinedCount,
                    playerId: socket.id
                });
                sendFullGameState(socket, roomName);
                logger.info(`Player queued for 2v2: ${socket.id} in ${roomName}`);
            }
        } catch (error) {
            logger.error('Error in handleFindTwoVsTwo', error);
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

    const handleChatMessage = async (data) => {
        try {
            if (isRateLimited(socket.id, 'chatMessage')) {
                return;
            }

            const roomName = clientRooms.get(socket.id);
            if (!roomName) {
                return;
            }

            const message = sanitizeChatMessage(data?.message);
            if (!message) {
                return;
            }

            if (!socket.identityResolved) {
                await resolveSocketIdentity(socket);
            }

            io.sockets.in(roomName).emit('chatMessage', {
                name: getSocketChatName(socket),
                message,
                sentAt: Date.now()
            });
        } catch (error) {
            logger.warn('Failed to process chat message', { error: error.message, socketId: socket.id });
        }
    };

    const leaveCurrentRoom = async () => {
        const roomName = clientRooms.get(socket.id);
        if (!roomName) {
            return false;
        }

        if (roomName === FREE_FOR_ALL_ROOM) {
            const roomState = state.get(roomName);
            const player = roomState?.players?.find((candidate) => candidate.id === socket.id) || null;
            try {
                if (player) {
                    await emitFreeForAllDepartureResult(socket, player);
                }
            } catch (error) {
                logger.warn('Failed to finalize free for all departure', {
                    error: error.message,
                    roomName,
                    socketId: socket.id
                });
            } finally {
                cleanupPlayerFromRoom(socket.id);
                cleanupSocketResources(socket.id);
            }

            const updatedRoomState = state.get(roomName);
            if (updatedRoomState) {
                io.sockets.in(roomName).emit('playerLeft', {
                    playerCount: updatedRoomState.players.length,
                    playerId: socket.id
                });
            }
            logger.info(`Player left free for all: ${socket.id}`);
            return true;
        }

        const roomState = state.get(roomName);
        if (
            roomState &&
            roomState.gameMode === '2v2' &&
            roomState.players.length < TWO_VS_TWO_MAX_PLAYERS &&
            !roomState.matchEnded
        ) {
            cleanupPlayerFromRoom(socket.id);
            if (roomState.players.length <= 0) {
                cleanupRoom(roomName);
            } else {
                io.sockets.in(roomName).emit('playerLeft', {
                    playerCount: roomState.players.length,
                    playerId: socket.id
                });
            }
            logger.info(`Player left 2v2 queue: ${socket.id}`);
            return true;
        }

        try {
            if (roomState && roomState.gameMode === '1v1' && roomState.players.length >= 2 && !roomState.matchEnded) {
                const winner = roomState.players.find((player) => player.id !== socket.id);
                if (winner) {
                    roomState.matchEnded = true;
                    roomState.matchWinnerId = winner.id;
                    roomState.matchTargetKills = ONE_VS_ONE_KILL_TARGET;
                    roomState.matchEndReason = 'forfeit';
                    roomState.cacheReset = true;
                    await finalizeOneVsOneMatch(roomName, {
                        winnerId: winner.id,
                        reason: 'forfeit'
                    });
                }
            } else if (roomState && roomState.gameMode === '2v2' && !roomState.matchEnded) {
                const leavingPlayer = roomState.players.find((player) => player.id === socket.id);
                const leavingTeam = leavingPlayer?.team === 'blue' ? 'blue' : 'red';
                const winnerTeam = leavingTeam === 'red' ? 'blue' : 'red';
                roomState.matchEnded = true;
                roomState.matchWinnerTeam = winnerTeam;
                roomState.matchEndReason = 'forfeit';
                await finalizeTwoVsTwoMatch(roomName, {
                    winnerTeam,
                    reason: 'forfeit'
                });
            } else if (roomState) {
                io.sockets.in(roomName).emit('opponentLeft');
            }
        } catch (error) {
            logger.warn('Failed to finalize room departure', {
                error: error.message,
                roomName,
                socketId: socket.id
            });
        } finally {
            cleanupSocketResources(socket.id);
            cleanupRoom(roomName);
        }
        logger.info(`Room ended due to player leaving: ${roomName}`);
        return true;
    };

    const handleLeaveMatch = () => {
        leaveCurrentRoom().catch((error) => {
            logger.error('Error while leaving match', error);
        });
    };

    const handleDisconnect = () => {
        try {
            leaveCurrentRoom().catch((error) => {
                logger.error('Error while disconnecting from match', error);
            });
            
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
            const roomState = roomName ? state.get(roomName) : null;

            if (
                roomState &&
                roomState.gameMode === '2v2' &&
                roomState.players.length < TWO_VS_TWO_MAX_PLAYERS &&
                !roomState.matchEnded
            ) {
                cleanupPlayerFromRoom(socket.id);
                if (roomState.players.length <= 0) {
                    cleanupRoom(roomName);
                } else {
                    io.sockets.in(roomName).emit('playerLeft', {
                        playerCount: roomState.players.length,
                        playerId: socket.id
                    });
                }
                return;
            }

            cleanupSocketResources(socket.id);
            if (roomName && roomName !== FREE_FOR_ALL_ROOM) {
                cleanupRoom(roomName);
            }
        }
    };

    socket.on('findGame', handleFindGame);
    socket.on('findFreeForAll', handleFindFreeForAll);
    socket.on('findTwoVsTwo', handleFindTwoVsTwo);
    socket.on('keydown', handleKeydown);
    socket.on('keyup', handleKeyup);
    socket.on('changeAngle', handleChangeAngle);
    socket.on('mouseDown', handleMouseDown);
    socket.on('mouseUp', handleMouseUp);
    socket.on('chatMessage', handleChatMessage);
    socket.on('leaveMatch', handleLeaveMatch);
    socket.on('disconnect', handleDisconnect);
    socket.on('cancelSearch', handleCancelSearch);
});

const FRAME_INTERVAL = 1000 / FRAME_RATE;
const SNAPSHOT_INTERVAL = 1000 / SNAPSHOT_RATE;
const DELTA_TIME_DIVISOR = 40;

function stopGameLoop(gameCode) {
    const loopState = gameLoops.get(gameCode);
    if (!loopState) {
        return;
    }

    loopState.running = false;
    if (loopState.immediateHandle) {
        clearImmediate(loopState.immediateHandle);
    }
    gameLoops.delete(gameCode);
}

function startGameLoop(gameCode) {
    if (gameLoops.has(gameCode)) {
        return;
    }

    const loopState = {
        running: true,
        lastTime: performance.now(),
        accumulator: 0,
        snapshotAccumulator: 0,
        immediateHandle: null
    };

    const step = () => {
        if (!loopState.running) {
            return;
        }

        const gameState = state.get(gameCode);
        if (!gameState) {
            stopGameLoop(gameCode);
            return;
        }

        const currentTime = performance.now();
        const frameDeltaMs = Math.max(0, currentTime - loopState.lastTime);
        loopState.lastTime = currentTime;

        // Cap accumulator to avoid spiral-of-death after stalls.
        const maxAccumulation = FRAME_INTERVAL * 5;
        loopState.accumulator = Math.min(loopState.accumulator + frameDeltaMs, maxAccumulation);
        loopState.snapshotAccumulator = Math.min(loopState.snapshotAccumulator + frameDeltaMs, SNAPSHOT_INTERVAL * 4);

        while (loopState.accumulator >= FRAME_INTERVAL) {
            gameLoop(gameState, FRAME_INTERVAL / DELTA_TIME_DIVISOR, io);
            loopState.accumulator -= FRAME_INTERVAL;
        }

        if (loopState.snapshotAccumulator >= SNAPSHOT_INTERVAL) {
            loopState.snapshotAccumulator = loopState.snapshotAccumulator % SNAPSHOT_INTERVAL;
            emitGameState(gameCode, gameState);
        }

        if (
            gameState.gameMode === '1v1' &&
            gameState.matchEnded &&
            !gameState.matchResultEmitted &&
            !gameState.matchResultProcessing
        ) {
            gameState.matchResultProcessing = true;
            finalizeOneVsOneMatch(gameCode, {
                winnerId: gameState.matchWinnerId,
                reason: gameState.matchEndReason || 'elimination'
            }).catch((error) => {
                logger.error('Error finalizing 1v1 match', error);
                gameState.matchResultProcessing = false;
            });
        }

        if (
            gameState.gameMode === '2v2' &&
            gameState.matchEnded &&
            !gameState.matchResultEmitted &&
            !gameState.matchResultProcessing
        ) {
            gameState.matchResultProcessing = true;
            finalizeTwoVsTwoMatch(gameCode, {
                winnerTeam: gameState.matchWinnerTeam,
                reason: gameState.matchEndReason || 'elimination'
            }).catch((error) => {
                logger.error('Error finalizing 2v2 match', error);
                gameState.matchResultProcessing = false;
            });
        }

        if (
            (gameState.gameMode === '1v1' || gameState.gameMode === '2v2') &&
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

        loopState.immediateHandle = setImmediate(step);
    };

    loopState.immediateHandle = setImmediate(step);
    gameLoops.set(gameCode, loopState);
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
                payload.isFullState = true;
            } else {
                payload = cache.updateAndGetDelta(gameState);
            }

            if (!payload) {
                return;
            }

            serializePacketAsync('gameState', payload)
                .then((encodedPacket) => {
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

initializeDatabase().catch((error) => {
    logger.error('Database initialization failed', error);
});
initializeWebServer();
bootstrapWebSocketRoutes();
initializeBotSystem();

let listenToken = null;

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    
    // Clean up all intervals
    for (const gameCode of gameLoops.keys()) {
        stopGameLoop(gameCode);
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
    for (const gameCode of gameLoops.keys()) {
        stopGameLoop(gameCode);
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
