const { MAP_RADIUS } = require('./constants');
const { circleObstacleCollision } = require('./collision');

const LOS_STEP = 18;
const LOS_SAMPLE_RADIUS = 3;
const MAP_EDGE_BUFFER = 120;
const MAP_CENTER_PULL = 0.6;
const BOT_VISION_RANGE = 900;
const BOT_MAX_CHASE_RANGE = 1300;
const BOT_TARGET_FORGET = 90;
const TARGET_STICK_MIN = 55;
const TARGET_STICK_MAX = 120;
const RETARGET_SCORE_RATIO = 0.78;
const AGGRO_CLOSE_RANGE = 260;
const AGGRO_HIT_RANGE = 600;

const TURN_SPEED_MIN = 0.07;
const TURN_SPEED_MAX = 0.16;

const AIM_ERROR_MIN = 0.04;
const AIM_ERROR_MAX = 0.18;

const STRAFE_INTERVAL_MIN = 18;
const STRAFE_INTERVAL_MAX = 42;

const WANDER_INTERVAL_MIN = 70;
const WANDER_INTERVAL_MAX = 160;

const FIRE_BURST_MIN = 12;
const FIRE_BURST_MAX = 34;
const FIRE_COOLDOWN_MIN = 10;
const FIRE_COOLDOWN_MAX = 28;

const REACTION_TIME_MIN = 8;
const REACTION_TIME_MAX = 20;

const SPECIAL_INTENT_MIN = 80;
const SPECIAL_INTENT_MAX = 160;

const SHARED_INTENT_MIN = 65;
const SHARED_INTENT_MAX = 140;

const WEAPON_PROFILES = {
    'Shotgun': { preferredRange: 190, fireRange: 320 },
    'Sniper': { preferredRange: 700, fireRange: 900 },
    'M4': { preferredRange: 420, fireRange: 560 },
    'Pistol': { preferredRange: 330, fireRange: 470 },
    'Laser Gun': { preferredRange: 430, fireRange: 580 },
    'Taser': { preferredRange: 170, fireRange: 260 },
    'Rocket Launcher': { preferredRange: 480, fireRange: 720 },
    'Bubble Launcher': { preferredRange: 380, fireRange: 520 },
    'Flamethrower': { preferredRange: 210, fireRange: 260 }
};

function randomRange(minValue, maxValue) {
    return minValue + Math.random() * Math.max(0, maxValue - minValue);
}

function normalizeAngle(angle) {
    let adjusted = angle;
    while (adjusted > Math.PI) adjusted -= Math.PI * 2;
    while (adjusted < -Math.PI) adjusted += Math.PI * 2;
    return adjusted;
}

function approachAngle(current, target, maxDelta) {
    const diff = normalizeAngle(target - current);
    if (Math.abs(diff) <= maxDelta) {
        return target;
    }
    return current + Math.sign(diff) * maxDelta;
}

function getWeaponProfile(player) {
    const name = player?.primaryWeapon?.name || 'M4';
    return WEAPON_PROFILES[name] || WEAPON_PROFILES.M4;
}

function ensureBotState(player) {
    if (player.botState) return player.botState;
    player.botState = {
        turnSpeed: randomRange(TURN_SPEED_MIN, TURN_SPEED_MAX),
        baseAimError: randomRange(AIM_ERROR_MIN, AIM_ERROR_MAX),
        aimOffset: 0,
        aimOffsetTimer: randomRange(20, 55),
        targetId: null,
        targetLostTimer: 0,
        targetStickTimer: 0,
        lastKnownX: null,
        lastKnownY: null,
        strafeDir: Math.random() < 0.5 ? -1 : 1,
        strafeTimer: randomRange(STRAFE_INTERVAL_MIN, STRAFE_INTERVAL_MAX),
        wanderTimer: randomRange(WANDER_INTERVAL_MIN, WANDER_INTERVAL_MAX),
        wanderAngle: Math.random() * Math.PI * 2,
        fireBurstTimer: 0,
        fireCooldownTimer: randomRange(FIRE_COOLDOWN_MIN, FIRE_COOLDOWN_MAX),
        reactionTimer: randomRange(REACTION_TIME_MIN, REACTION_TIME_MAX),
        specialIntentTimer: randomRange(SPECIAL_INTENT_MIN, SPECIAL_INTENT_MAX),
        sharedIntentTimer: randomRange(SHARED_INTENT_MIN, SHARED_INTENT_MAX),
        specialHoldRemaining: 0,
        sharedPressPending: false,
        specialPressPending: false
    };
    return player.botState;
}

function isEnemy(bot, candidate) {
    if (!candidate || candidate.id === bot.id) return false;
    if (candidate.HP <= 0 || candidate.isRespawning) return false;
    if (bot.team && candidate.team && bot.team === candidate.team) return false;
    return true;
}

function hasLineOfSight(fromX, fromY, toX, toY, obstacles) {
    if (!Array.isArray(obstacles) || obstacles.length === 0) {
        return true;
    }
    const dx = toX - fromX;
    const dy = toY - fromY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance <= LOS_STEP) {
        return true;
    }
    const steps = Math.floor(distance / LOS_STEP);
    for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const x = fromX + dx * t;
        const y = fromY + dy * t;
        for (const obstacle of obstacles) {
            if (circleObstacleCollision(x, y, LOS_SAMPLE_RADIUS, obstacle)) {
                return false;
            }
        }
    }
    return true;
}

function getTargetInfo(bot, enemy, obstacles) {
    const dx = enemy.x - bot.x;
    const dy = enemy.y - bot.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > BOT_MAX_CHASE_RANGE) {
        return null;
    }
    const visible = distance <= BOT_VISION_RANGE && hasLineOfSight(bot.x, bot.y, enemy.x, enemy.y, obstacles);
    return { enemy, distance, visible };
}

function scoreTarget(bot, state, info) {
    let score = info.visible ? info.distance : info.distance * 1.25;

    if (info.enemy.id === bot.lastDamagedBy) {
        score *= 0.55;
    }
    if (info.distance < AGGRO_CLOSE_RANGE) {
        score *= 0.6;
    }
    if (info.enemy.id === state.targetId) {
        score *= 0.9;
    }

    return score;
}

function findBestTarget(bot, gameState, state) {
    const obstacles = gameState.obstacles || [];
    const enemies = gameState.players.filter((player) => isEnemy(bot, player));
    let best = null;
    let bestScore = Infinity;
    let bestInfo = null;

    for (const enemy of enemies) {
        const info = getTargetInfo(bot, enemy, obstacles);
        if (!info) continue;
        const score = scoreTarget(bot, state, info);
        if (score < bestScore) {
            bestScore = score;
            best = enemy;
            bestInfo = info;
        }
    }

    if (!best || !bestInfo) {
        return null;
    }

    return {
        target: best,
        info: bestInfo,
        score: bestScore
    };
}

function updateAim(bot, state, target, visible, deltaTime) {
    if (!target) {
        return;
    }

    const dx = target.x - bot.x;
    const dy = target.y - bot.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const profile = getWeaponProfile(bot);
    const distanceRatio = Math.min(1, distance / Math.max(1, profile.fireRange));
    const aimError = state.baseAimError + distanceRatio * 0.12;

    if ((state.aimOffsetTimer || 0) <= 0) {
        state.aimOffsetTimer = randomRange(18, 52);
        state.aimOffset = randomRange(-aimError, aimError);
    }

    const desired = Math.atan2(dy, dx) + state.aimOffset;
    const maxTurn = state.turnSpeed * deltaTime;
    bot.angle = approachAngle(bot.angle, desired, maxTurn);
}

function findClearDirection(bot, desiredAngle, obstacles) {
    const offsets = [0, 0.4, -0.4, 0.75, -0.75, 1.1, -1.1];
    const lookahead = bot.radius + 26;

    for (const offset of offsets) {
        const angle = desiredAngle + offset;
        const testX = bot.x + Math.cos(angle) * lookahead;
        const testY = bot.y + Math.sin(angle) * lookahead;
        const distanceFromCenter = Math.sqrt(testX * testX + testY * testY);
        if (distanceFromCenter > MAP_RADIUS - bot.radius - 6) {
            continue;
        }
        let blocked = false;
        for (const obstacle of obstacles) {
            if (circleObstacleCollision(testX, testY, bot.radius, obstacle)) {
                blocked = true;
                break;
            }
        }
        if (!blocked) {
            return angle;
        }
    }

    return desiredAngle + Math.PI;
}

function applyMovement(bot, state, desiredDir, obstacles) {
    let angle = Math.atan2(desiredDir.y, desiredDir.x);
    angle = findClearDirection(bot, angle, obstacles);
    const moveX = Math.cos(angle);
    const moveY = Math.sin(angle);

    const inputs = {};
    if (moveY < -0.2) inputs[87] = true;
    if (moveY > 0.2) inputs[83] = true;
    if (moveX < -0.2) inputs[65] = true;
    if (moveX > 0.2) inputs[68] = true;
    bot.inputs = inputs;
}

function updateCombat(bot, state, target, visible, deltaTime) {
    const profile = getWeaponProfile(bot);
    if (!target || !visible) {
        bot.isFiring = false;
        state.fireBurstTimer = Math.max(0, state.fireBurstTimer - deltaTime);
        state.fireCooldownTimer = Math.max(0, state.fireCooldownTimer - deltaTime);
        return;
    }

    const dx = target.x - bot.x;
    const dy = target.y - bot.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const desiredAngle = Math.atan2(dy, dx);
    const angleDiff = Math.abs(normalizeAngle(desiredAngle - bot.angle));

    state.reactionTimer = Math.max(0, state.reactionTimer - deltaTime);
    state.fireBurstTimer = Math.max(0, state.fireBurstTimer - deltaTime);
    state.fireCooldownTimer = Math.max(0, state.fireCooldownTimer - deltaTime);

    const inRange = distance <= profile.fireRange;
    const aimOk = angleDiff <= 0.3;

    if (state.fireBurstTimer <= 0 && state.fireCooldownTimer <= 0 && inRange && aimOk) {
        state.fireBurstTimer = randomRange(FIRE_BURST_MIN, FIRE_BURST_MAX);
        state.fireCooldownTimer = randomRange(FIRE_COOLDOWN_MIN, FIRE_COOLDOWN_MAX);
    }

    const canFire = inRange && aimOk && state.reactionTimer <= 0 && state.fireBurstTimer > 0;
    bot.isFiring = canFire;
}

function updateAbilities(bot, state, target, visible, deltaTime) {
    state.specialIntentTimer = Math.max(0, state.specialIntentTimer - deltaTime);
    state.sharedIntentTimer = Math.max(0, state.sharedIntentTimer - deltaTime);
    state.specialHoldRemaining = Math.max(0, state.specialHoldRemaining - deltaTime);
    state.sharedPressPending = false;
    state.specialPressPending = false;

    if (!target || !visible) {
        return;
    }

    const dx = target.x - bot.x;
    const dy = target.y - bot.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (bot.sharedAbility && bot.sharedAbility.currentCooldown <= 0 && state.sharedIntentTimer <= 0) {
        if (distance <= 420) {
            state.sharedPressPending = true;
            state.sharedIntentTimer = randomRange(SHARED_INTENT_MIN, SHARED_INTENT_MAX);
        }
    }

    if (bot.specialAbility && bot.specialAbility.currentCooldown <= 0 && state.specialIntentTimer <= 0) {
        if (distance <= 380 || bot.HP / bot.maxHP < 0.45) {
            if (bot.specialAbility.isChargeBased && bot.specialAbility.holdToFire) {
                state.specialHoldRemaining = randomRange(10, 24);
            } else {
                state.specialPressPending = true;
            }
            state.specialIntentTimer = randomRange(SPECIAL_INTENT_MIN, SPECIAL_INTENT_MAX);
        }
    }
}

function updateMovement(bot, state, target, visible, deltaTime, gameState) {
    const obstacles = gameState.obstacles || [];
    const profile = getWeaponProfile(bot);

    let desiredDir = { x: Math.cos(state.wanderAngle), y: Math.sin(state.wanderAngle) };

    if (target) {
        const dx = target.x - bot.x;
        const dy = target.y - bot.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const norm = distance > 0 ? 1 / distance : 0;
        const toward = { x: dx * norm, y: dy * norm };
        const away = { x: -toward.x, y: -toward.y };

        if (!visible && state.lastKnownX != null && state.lastKnownY != null) {
            const lx = state.lastKnownX - bot.x;
            const ly = state.lastKnownY - bot.y;
            const ldist = Math.sqrt(lx * lx + ly * ly) || 1;
            desiredDir = { x: lx / ldist, y: ly / ldist };
        } else if (distance > profile.preferredRange + 70) {
            desiredDir = toward;
        } else if (distance < profile.preferredRange - 60) {
            desiredDir = away;
        } else {
            state.strafeTimer -= deltaTime;
            if (state.strafeTimer <= 0) {
                state.strafeDir = Math.random() < 0.5 ? -1 : 1;
                state.strafeTimer = randomRange(STRAFE_INTERVAL_MIN, STRAFE_INTERVAL_MAX);
            }
            desiredDir = { x: -toward.y * state.strafeDir, y: toward.x * state.strafeDir };
        }
    } else {
        state.wanderTimer -= deltaTime;
        if (state.wanderTimer <= 0) {
            state.wanderTimer = randomRange(WANDER_INTERVAL_MIN, WANDER_INTERVAL_MAX);
            state.wanderAngle = Math.random() * Math.PI * 2;
            desiredDir = { x: Math.cos(state.wanderAngle), y: Math.sin(state.wanderAngle) };
        }
    }

    const distanceFromCenter = Math.sqrt(bot.x * bot.x + bot.y * bot.y);
    if (distanceFromCenter > MAP_RADIUS - MAP_EDGE_BUFFER) {
        const toCenter = {
            x: -bot.x / Math.max(1, distanceFromCenter),
            y: -bot.y / Math.max(1, distanceFromCenter)
        };
        desiredDir = {
            x: desiredDir.x + toCenter.x * MAP_CENTER_PULL,
            y: desiredDir.y + toCenter.y * MAP_CENTER_PULL
        };
    }

    const length = Math.sqrt(desiredDir.x * desiredDir.x + desiredDir.y * desiredDir.y) || 1;
    desiredDir = { x: desiredDir.x / length, y: desiredDir.y / length };
    applyMovement(bot, state, desiredDir, obstacles);
}

function updateBot(bot, gameState, deltaTime) {
    const state = ensureBotState(bot);
    if (bot.isRespawning || bot.HP <= 0) {
        bot.inputs = {};
        bot.isFiring = false;
        return;
    }

    state.aimOffsetTimer = Math.max(0, (state.aimOffsetTimer || 0) - deltaTime);
    const previousTargetId = state.targetId;
    state.targetStickTimer = Math.max(0, (state.targetStickTimer || 0) - deltaTime);

    let target = null;
    let visible = false;
    let currentScore = Infinity;
    if (state.targetId) {
        const candidate = gameState.players.find((player) => player.id === state.targetId);
        if (isEnemy(bot, candidate)) {
            target = candidate;
            const info = getTargetInfo(bot, candidate, gameState.obstacles || []);
            if (info) {
                visible = info.visible;
                currentScore = scoreTarget(bot, state, info);
            }
            if (!visible) {
                state.targetLostTimer += deltaTime;
            } else {
                state.targetLostTimer = 0;
                state.lastKnownX = candidate.x;
                state.lastKnownY = candidate.y;
            }
        } else {
            state.targetId = null;
        }
    }

    let shouldSwitch = false;
    if (!target || state.targetLostTimer > BOT_TARGET_FORGET) {
        shouldSwitch = true;
    }

    const best = findBestTarget(bot, gameState, state);
    if (best) {
        const isLastDamager = best.target.id === bot.lastDamagedBy;
        const lastDamagerClose = best.info.distance <= AGGRO_HIT_RANGE;
        const closeThreat = best.info.distance <= AGGRO_CLOSE_RANGE && best.info.visible;
        if (isLastDamager && (best.info.visible || lastDamagerClose)) {
            shouldSwitch = true;
        } else if (state.targetStickTimer <= 0 && target && best.target.id !== target.id) {
            if (best.score < currentScore * RETARGET_SCORE_RATIO || closeThreat) {
                shouldSwitch = true;
            }
        } else if (!target) {
            shouldSwitch = true;
        }
    }

    if (shouldSwitch) {
        if (best) {
            state.targetId = best.target.id;
            state.targetLostTimer = 0;
            state.targetStickTimer = randomRange(TARGET_STICK_MIN, TARGET_STICK_MAX);
            target = best.target;
            visible = best.info.visible;
            currentScore = best.score;
            if (state.targetId !== previousTargetId) {
                state.reactionTimer = randomRange(REACTION_TIME_MIN, REACTION_TIME_MAX);
            }
            if (visible) {
                state.lastKnownX = target.x;
                state.lastKnownY = target.y;
            }
        } else {
            state.targetId = null;
            target = null;
            visible = false;
        }
    }

    updateMovement(bot, state, target, visible, deltaTime, gameState);
    updateAim(bot, state, target, visible, deltaTime);
    updateCombat(bot, state, target, visible, deltaTime);
    updateAbilities(bot, state, target, visible, deltaTime);

    if (state.specialHoldRemaining > 0) {
        bot.inputs[69] = true;
    } else if (state.specialPressPending) {
        bot.inputs[69] = true;
    }

    if (state.sharedPressPending) {
        bot.inputs[67] = true;
    }
}

function updateBots(gameState, deltaTime) {
    if (!gameState || !Array.isArray(gameState.players)) {
        return;
    }

    for (const player of gameState.players) {
        if (!player?.isBot) continue;
        updateBot(player, gameState, deltaTime);
    }
}

module.exports = {
    updateBots,
    ensureBotState
};
