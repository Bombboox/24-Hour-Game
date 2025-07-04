const { Character, Ninja, King, Berserker } = require('./character');
const { Bullet } = require('./bullet');
const { Obstacle } = require('./obstacle');
const { MAP_RADIUS } = require('./constants');

function createGameState() {
    return {
        players: [],
        bullets: [],
        obstacles: [],
    }
}

function gameLoop(gameState, deltaTime, io) {
    for (const player of gameState.players) {
        let dx = 0;
        let dy = 0;
        
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
        if (player.inputs[82] || player.inputs[114]) {
            if(player.primaryWeapon.reload()) {
                io.to(player.id).emit('reload');
            }
        }

        if (player.inputs[69]) {
            if(!player.specialAbility) continue;
            
            if(player.specialAbility.initiate(player)) {
                io.to(player.id).emit('specialAbility');
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
                    // Push player away from boundary if they're too close
                    if (currentDistance > maxDistance) {
                        const pushDistance = 0; // Push them 2 units away from boundary
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

        if(player.isFiring) {
            if(player.primaryWeapon.fire(player.x, player.y, player.angle, gameState, player.id)) {
                io.to(player.id).emit('firedWeapon');
                if(player.primaryWeapon.ammo === 0) {
                    player.reload();
                    io.to(player.id).emit('reload');
                }
            }
        }

        if(player.primaryWeapon) player.primaryWeapon.update(deltaTime);
        if(player.specialAbility) player.specialAbility.update(deltaTime, player);
    
        for (const bullet of gameState.bullets) {
            if (bullet.playerId === player.id) continue;

            const hitter = bullet.playerId;
            const hitterPlayer = gameState.players.find(p => p.id === hitter);
 
            if (player.checkCircleCircleCollision(player.x, player.y, player.radius, bullet.x, bullet.y, bullet.radius)) {
                player.takeDamage(bullet.damage);
                bullet.destroy(gameState);
                io.to(hitter).emit('hit');
                io.to(player.id).emit('gotHit');
            
                player.flashingTimer = 1;
                continue;
            }
            
            if (player.checkCircleCircleCollision(player.x, player.y, player.radius, bullet.x, bullet.y, bullet.radius)) {
                player.takeDamage(bullet.damage);
                bullet.destroy(gameState);
                io.to(hitter).emit('hit');
                io.to(player.id).emit('gotHit');

                player.flashingTimer = 1;
                continue;
            }

            if(player.HP <= 0) {
                if(hitterPlayer) {
                    hitterPlayer.kills++;
                    io.to(hitter).emit('kill', {
                        killedPlayer: player.name,
                        killCount: hitterPlayer.kills
                    });
                }

                if (gameState.gameMode === 'freeForAll') {
                    player.randomSpawn(gameState);
                } else {
                    respawnAll(gameState);
                }
            }
        }

        player.primaryWeapon.currentCooldown -= deltaTime;
        if(player.flashingTimer > 0) {
            player.flashingTimer -= deltaTime;
        }
    }
    
    for (const bullet of gameState.bullets) {
        bullet.update(deltaTime, gameState);
    }
}

function respawnAll(gameState) {
    gameState.bullets = [];
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