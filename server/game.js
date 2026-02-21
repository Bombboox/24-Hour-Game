const { Character, Ninja, King, Berserker } = require('./character');
const { Bullet } = require('./bullet');
const { Obstacle } = require('./obstacle');
const { MAP_RADIUS } = require('./constants');
const ONE_VS_ONE_KILL_TARGET = 5;
const FORCE_STUN_THRESHOLD = 0.15;
const FORCE_STUN_DURATION = 12.5;
const REAVER_STACK_TIMEOUT = 200;
const REAVER_DOT_DURATION = 125;

function createGameState() {
    return {
        players: [],
        bullets: [],
        grenades: [],
        obstacles: [],
        gameMode: '1v1',
    }
}

function gameLoop(gameState, deltaTime, io) {
    gameState.io = io;
    if (gameState.matchEnded) {
        return;
    }

    let shouldRespawnAll = false;

    for (const player of gameState.players) {
        if ((player.stunnedTimer || 0) > 0) {
            player.stunnedTimer = Math.max(0, player.stunnedTimer - deltaTime);
            player.stunned = true;
        } else {
            player.stunned = false;
        }

        if ((player.laserBeamTimer || 0) > 0) {
            player.laserBeamTimer = Math.max(0, player.laserBeamTimer - deltaTime);
            if (player.laserBeamTimer <= 0) {
                player.laserBeam = null;
            }
        }

        if ((player.kingAuraSlowTimer || 0) > 0) {
            player.kingAuraSlowTimer = Math.max(0, player.kingAuraSlowTimer - deltaTime);
            player.passiveSpeedDebuff = player.kingAuraSlowMultiplier || 0.75;
            player.auraSlowed = true;
        } else {
            player.passiveSpeedDebuff = 1;
            player.auraSlowed = false;
        }
        if ((player.kingAuraPulseTimer || 0) > 0) {
            player.kingAuraPulseTimer = Math.max(0, player.kingAuraPulseTimer - deltaTime);
        }
        if ((player.reaverStackDecayTimer || 0) > 0) {
            player.reaverStackDecayTimer = Math.max(0, player.reaverStackDecayTimer - deltaTime);
            if (player.reaverStackDecayTimer <= 0) {
                player.reaverStacks = 0;
                player.reaverSourceId = null;
            }
        }
        if (player.reaverDotEffects?.length) {
            const dotDamagePerSecond = 5;
            const dotDamage = dotDamagePerSecond * (deltaTime / 25);
            const nextEffects = [];
            for (const effect of player.reaverDotEffects) {
                const remaining = Math.max(0, (effect.timer || 0) - deltaTime);
                if (remaining <= 0) continue;
                player.takeDamage(dotDamage, effect.sourceId || null);
                nextEffects.push({ timer: remaining, sourceId: effect.sourceId || null });
            }
            player.reaverDotEffects = nextEffects;
        }

        if (Math.abs(player.forceVX || 0) > 0.01 || Math.abs(player.forceVY || 0) > 0.01) {
            const startX = player.x;
            const startY = player.y;
            const forceDx = (player.forceVX || 0) * deltaTime;
            const forceDy = (player.forceVY || 0) * deltaTime;
            const intendedDistance = Math.sqrt(forceDx * forceDx + forceDy * forceDy);

            if (intendedDistance > 0) {
                player.move(forceDx, forceDy, gameState.obstacles, gameState.bullets);
                const distanceFromCenter = Math.sqrt(player.x * player.x + player.y * player.y);
                const maxDistance = MAP_RADIUS - player.radius;
                if (distanceFromCenter > maxDistance) {
                    const normalX = player.x / Math.max(0.0001, distanceFromCenter);
                    const normalY = player.y / Math.max(0.0001, distanceFromCenter);
                    player.x = normalX * maxDistance;
                    player.y = normalY * maxDistance;
                }
                const movedX = player.x - startX;
                const movedY = player.y - startY;
                const movedDistance = Math.sqrt(movedX * movedX + movedY * movedY);
                const impactSpeed = Math.sqrt((player.forceVX || 0) ** 2 + (player.forceVY || 0) ** 2);

                if (movedDistance < intendedDistance * 0.45 && impactSpeed >= FORCE_STUN_THRESHOLD) {
                    player.stunnedTimer = Math.max(player.stunnedTimer || 0, FORCE_STUN_DURATION);
                }
            }

            const decay = Math.pow(0.84, Math.max(1, deltaTime));
            player.forceVX *= decay;
            player.forceVY *= decay;
            if (Math.abs(player.forceVX) < 0.04) player.forceVX = 0;
            if (Math.abs(player.forceVY) < 0.04) player.forceVY = 0;
        }

        let dx = 0;
        let dy = 0;
        
        if (!player.stunned) {
            if (player.inputs[87] || player.inputs[119]) { 
                dy = -1;
            }
            if (player.inputs[83] || player.inputs[115]) { 
                dy = 1;
            }
            if (player.inputs[65] || player.inputs[97]) { 
                dx = -1;
            }
            if (player.inputs[68] || player.inputs[100]) { 
                dx = 1;
            }
        }

        if (!player.stunned && (player.inputs[81] || player.inputs[113])) { 
            if(player.swapWeapons()) {
                io.to(player.id).emit('swapWeapons', player.primaryWeapon.name);
            }
        }

        const specialPressed = !!player.inputs[69];
        if (!player.stunned && player.specialAbility) {
            if (player.specialAbility.isChargeBased && player.specialAbility.holdToFire) {
                if (specialPressed) {
                    player.specialAbilityHoldTime = Math.min(
                        player.specialAbility.maxThrowCharge || 65,
                        (player.specialAbilityHoldTime || 0) + deltaTime
                    );
                    player.specialAbilityKeyHeld = true;
                } else if (player.specialAbilityKeyHeld) {
                    player.breakInvisibility(gameState);
                    if (player.specialAbility.initiate(player, gameState)) {
                        io.to(player.id).emit('specialAbility');
                    }
                    player.specialAbilityKeyHeld = false;
                    player.specialAbilityHoldTime = 0;
                }
            } else if (player.specialAbility.isChargeBased) {
                const justPressed = specialPressed && !player.specialAbilityKeyHeld;
                player.specialAbilityKeyHeld = specialPressed;
                if (justPressed) {
                    player.breakInvisibility(gameState);
                    if (player.specialAbility.initiate(player, gameState)) {
                        io.to(player.id).emit('specialAbility');
                    }
                }
            } else if (specialPressed) {
                player.breakInvisibility(gameState);
                if (player.specialAbility.initiate(player, gameState)) {
                    io.to(player.id).emit('specialAbility');
                }
            }
        } else if (!specialPressed) {
            player.specialAbilityKeyHeld = false;
            player.specialAbilityHoldTime = 0;
        }

        const reloadPressed = !!(player.inputs[82] || player.inputs[114]);
        if (!player.stunned && reloadPressed) {
            if (player.primaryWeapon.reload()) {
                io.to(player.id).emit('reload');
            }
        }

        const passiveTogglePressed = !!(player.inputs[90] || player.inputs[122]);
        const passiveToggleJustPressed = passiveTogglePressed && !player.passiveAbilityKeyHeld;
        player.passiveAbilityKeyHeld = passiveTogglePressed;
        if (passiveToggleJustPressed && !player.stunned) {
            if (player.specialAbility && typeof player.specialAbility.detonateAll === 'function') {
                player.specialAbility.detonateAll(player, gameState, io);
            }
            if (player.passiveAbility && typeof player.passiveAbility.activateZap === 'function') {
                player.passiveAbility.activateZap(player, gameState);
            }
            if (player.passiveAbility?.keyCode === 90 && typeof player.passiveAbility.toggle === 'function') {
                player.passiveAbility.toggle(player, gameState);
            }
        }

        const sharedPressed = !!(player.inputs[67] || player.inputs[99]);
        const sharedJustPressed = sharedPressed && !player.sharedAbilityKeyHeld;
        player.sharedAbilityKeyHeld = sharedPressed;

        if (!player.stunned && sharedJustPressed) {
            if(!player.sharedAbility) continue;
            
            if (player.sharedAbility.name !== 'Invisibility' || player.sharedAbility.isActive) {
                player.breakInvisibility(gameState);
            }

            if(player.sharedAbility.initiate(player, gameState)) {
                io.to(player.id).emit('sharedAbility');
            }
        }
        
        if (dx !== 0 && dy !== 0) {
            dx *= 0.707; 
            dy *= 0.707;
        }
        
        dx *= deltaTime;
        dy *= deltaTime;
        
        if (dx !== 0 || dy !== 0) {
            const newX = player.x + dx;
            const newY = player.y + dy;
            
            const distanceFromCenter = Math.sqrt(newX * newX + newY * newY);
            const maxDistance = MAP_RADIUS - player.radius;
            
            if (distanceFromCenter <= maxDistance) {
                player.move(dx, dy, gameState.obstacles, gameState.bullets);
            } else {
                const currentDistance = Math.sqrt(player.x * player.x + player.y * player.y);
                
                if (currentDistance < maxDistance) {
                    const angle = Math.atan2(newY, newX);
                    const clampedX = Math.cos(angle) * (maxDistance - 1);
                    const clampedY = Math.sin(angle) * (maxDistance - 1);
                    
                    const clampedDx = clampedX - player.x;
                    const clampedDy = clampedY - player.y;
                    player.move(clampedDx, clampedDy, gameState.obstacles, gameState.bullets);
                } else {
                    // push player away from boundary if they're too close
                    if (currentDistance > maxDistance) {
                        const pushDistance = 0; // might wanna increase but 0 is working fine somehow 🤔

                        const normalX = player.x / currentDistance;
                        const normalY = player.y / currentDistance;
                        
                        const targetDistance = maxDistance - pushDistance;
                        const targetX = normalX * targetDistance;
                        const targetY = normalY * targetDistance;
                        
                        player.x = targetX;
                        player.y = targetY;
                    }
                    
                    const normalX = player.x / currentDistance;
                    const normalY = player.y / currentDistance;
                    
                    const dotProduct = dx * normalX + dy * normalY;
                    const tangentDx = dx - dotProduct * normalX;
                    const tangentDy = dy - dotProduct * normalY;
                    
                    if (Math.abs(tangentDx) > 0.001 || Math.abs(tangentDy) > 0.001) {
                        player.move(tangentDx, tangentDy, gameState.obstacles, gameState.bullets);
                    }
                }
            }
        }

        if(player.isFiring && !player.stunned) {
            player.breakInvisibility(gameState);
            if(player.primaryWeapon.fire(player.x, player.y, player.angle, gameState, player.id, io, player)) {
                io.to(player.id).emit('firedWeapon');
                if(player.primaryWeapon.ammo === 0) {
                    player.reload();
                    io.to(player.id).emit('reload');
                }
            }
        }

        if(player.primaryWeapon) player.primaryWeapon.update(deltaTime);
        if(player.secondaryWeapon) player.secondaryWeapon.update(deltaTime);
        if(player.specialAbility) player.specialAbility.update(deltaTime, player, gameState);
        if(player.sharedAbility) player.sharedAbility.update(deltaTime, player, gameState);
        if(player.passiveAbility) player.passiveAbility.update(deltaTime, player, gameState);
        if(player.swapCooldownTimer > 0) player.swapCooldownTimer -= deltaTime;
    
        for (const bullet of gameState.bullets) {
            if (bullet.playerId === player.id) continue;

            const hitter = bullet.playerId;
 
            if (player.checkCircleCircleCollision(player.x, player.y, player.radius, bullet.x, bullet.y, bullet.radius)) {
                const hpBeforeDamage = player.HP;
                player.takeDamage(bullet.damage, hitter);
                const damageDealt = Math.max(0, hpBeforeDamage - player.HP);
                if (bullet.stunDuration > 0) {
                    player.stunnedTimer = Math.max(player.stunnedTimer || 0, bullet.stunDuration);
                }
                bullet.destroy(gameState);
                io.to(hitter).emit('hit');
                io.to(player.id).emit('gotHit');
                if (damageDealt > 0 && hitter) {
                    io.to(hitter).emit('combatText', {
                        type: 'damage',
                        amount: damageDealt,
                        x: player.x,
                        y: player.y - player.radius - 10
                    });
                }
                const damageDealer = gameState.players.find((p) => p.id === hitter);
                if (damageDealer?.passiveAbility) {
                    const healedAmount = damageDealer.passiveAbility.onDamageDealt(damageDealer, damageDealt, player, gameState) || 0;
                    if (healedAmount > 0) {
                        io.to(hitter).emit('combatText', {
                            type: 'healing',
                            amount: healedAmount,
                            x: damageDealer.x,
                            y: damageDealer.y - damageDealer.radius - 10
                        });
                    }
                }
            
                player.flashingTimer = 1;
            } else if (player.checkCircleCircleCollision(player.x, player.y, player.radius, bullet.x, bullet.y, bullet.radius)) {
                const hpBeforeDamage = player.HP;
                player.takeDamage(bullet.damage, hitter);
                const damageDealt = Math.max(0, hpBeforeDamage - player.HP);
                if (bullet.stunDuration > 0) {
                    player.stunnedTimer = Math.max(player.stunnedTimer || 0, bullet.stunDuration);
                }
                bullet.destroy(gameState);
                io.to(hitter).emit('hit');
                io.to(player.id).emit('gotHit');
                if (damageDealt > 0 && hitter) {
                    io.to(hitter).emit('combatText', {
                        type: 'damage',
                        amount: damageDealt,
                        x: player.x,
                        y: player.y - player.radius - 10
                    });
                }
                const damageDealer = gameState.players.find((p) => p.id === hitter);
                if (damageDealer?.passiveAbility) {
                    const healedAmount = damageDealer.passiveAbility.onDamageDealt(damageDealer, damageDealt, player, gameState) || 0;
                    if (healedAmount > 0) {
                        io.to(hitter).emit('combatText', {
                            type: 'healing',
                            amount: healedAmount,
                            x: damageDealer.x,
                            y: damageDealer.y - damageDealer.radius - 10
                        });
                    }
                }

                player.flashingTimer = 1;
            }

            if (bullet.kind === 'reaverShard' && player.checkCircleCircleCollision(player.x, player.y, player.radius, bullet.x, bullet.y, bullet.radius)) {
                player.reaverStacks = Math.min(3, (player.reaverStacks || 0) + 1);
                player.reaverStackDecayTimer = REAVER_STACK_TIMEOUT;
                player.reaverSourceId = hitter;
                player.reaverDotEffects = player.reaverDotEffects || [];
                player.reaverDotEffects.push({
                    timer: REAVER_DOT_DURATION,
                    sourceId: hitter
                });
            }
        }

        player.primaryWeapon.currentCooldown -= deltaTime;
        player.secondaryWeapon.currentCooldown -= deltaTime;
        if(player.flashingTimer > 0) {
            player.flashingTimer -= deltaTime;
        }

        if (player.HP <= 0) {
            const killerId = player.lastDamagedBy;
            const killerPlayer = gameState.players.find(p => p.id === killerId);

            if (killerPlayer && killerPlayer.id !== player.id) {
                killerPlayer.kills++;
                if (killerPlayer.passiveAbility) {
                    killerPlayer.passiveAbility.onKill(killerPlayer, player, gameState);
                }
                io.to(killerPlayer.id).emit('kill', {
                    killedPlayer: player.name,
                    killCount: killerPlayer.kills
                });

                if (
                    gameState.gameMode !== 'freeForAll' &&
                    killerPlayer.kills >= ONE_VS_ONE_KILL_TARGET &&
                    !gameState.matchEnded
                ) {
                    gameState.matchEnded = true;
                    gameState.matchWinnerId = killerPlayer.id;
                    gameState.matchTargetKills = ONE_VS_ONE_KILL_TARGET;
                    gameState.cacheReset = true;

                    for (const participant of gameState.players) {
                        io.to(participant.id).emit('matchEnded', {
                            winnerId: killerPlayer.id,
                            youWon: participant.id === killerPlayer.id,
                            yourKills: participant.kills,
                            opponentKills: gameState.players.find((p) => p.id !== participant.id)?.kills ?? 0,
                            targetKills: ONE_VS_ONE_KILL_TARGET
                        });
                    }
                    break;
                }
            }

            if (gameState.gameMode === 'freeForAll') {
                player.randomSpawn(gameState);
                player.lastDamagedBy = null;
            } else {
                if (!gameState.matchEnded) {
                    shouldRespawnAll = true;
                }
            }
        }
    }

    if (shouldRespawnAll) {
        respawnAll(gameState);
        for (const player of gameState.players) {
            player.lastDamagedBy = null;
        }
    }
    
    for (const bullet of gameState.bullets) {
        bullet.update(deltaTime, gameState);
    }

    for (const grenade of [...gameState.grenades]) {
        grenade.update(deltaTime, gameState, io);
    }

    for (const obstacle of [...gameState.obstacles]) {
        if (typeof obstacle.update === 'function') {
            obstacle.update(deltaTime, gameState);
        }
    }
}

function respawnAll(gameState) {
    gameState.bullets = [];
    gameState.grenades = [];
    gameState.obstacles = generateNewMap();

    for (const player of gameState.players) {
        player.respawn();
    }
    
    // Signal that the cache should be reset due to significant state change
    gameState.cacheReset = true;
}

function generateNewMap() {
    const { Obstacle } = require('./obstacle');
    const { MAP_RADIUS } = require('./constants');
    
    const r1 = Math.floor(Math.random() * 255);
    const g1 = Math.floor(Math.random() * 255);
    const b1 = Math.floor(Math.random() * 255);
    const color1 = `rgb(${r1}, ${g1}, ${b1})`;
    const color2 = `rgb(${255 - r1}, ${255 - g1}, ${255 - b1})`;

    const obstacles = [];
    const numObstacles = Math.floor(MAP_RADIUS / 50); 
    
    const leftSpawnArea = { x: -MAP_RADIUS, y: -100, w: 150, h: 200 };
    const rightSpawnArea = { x: MAP_RADIUS - 150, y: -100, w: 150, h: 200 };
    
    for (let i = 0; i < numObstacles; i++) {
        let attempts = 0;
        let validPosition = false;
        let x, y, w, h;
        
        while (!validPosition && attempts < 50) {
            w = 50 + Math.random() * 200;
            h = 50 + Math.random() * 200;
            
            x = -MAP_RADIUS + w/2 + Math.random() * (2 * MAP_RADIUS - w);
            y = -MAP_RADIUS + h/2 + Math.random() * (2 * MAP_RADIUS - h);
            
            const overlapsLeftSpawn = !(x > leftSpawnArea.x + leftSpawnArea.w || 
                                      x + w < leftSpawnArea.x || 
                                      y > leftSpawnArea.y + leftSpawnArea.h || 
                                      y + h < leftSpawnArea.y);
                                      
            const overlapsRightSpawn = !(x > rightSpawnArea.x + rightSpawnArea.w || 
                                       x + w < rightSpawnArea.x || 
                                       y > rightSpawnArea.y + rightSpawnArea.h || 
                                       y + h < rightSpawnArea.y);
            

            let overlapsExisting = false;
            for (const existing of obstacles) {
                if (!(x > existing.x + existing.w || 
                      x + w < existing.x || 
                      y > existing.y + existing.h || 
                      y + h < existing.y)) {
                    overlapsExisting = true;
                    break;
                }
            }
            
            if (!overlapsLeftSpawn && !overlapsRightSpawn && !overlapsExisting) {
                validPosition = true;
            }
            
            attempts++;
        }
        
        if (validPosition) {
            obstacles.push(new Obstacle({
                x: x,
                y: y,
                w: w,
                h: h,
                color: Math.random() < 0.5 ? color1 : color2
            }));
        }
    }
    
    return obstacles;
}

module.exports = {
    createGameState,
    gameLoop,
    generateNewMap
}
