const { Bullet } = require('./bullet');
const { circleRectCollision, circleRotatedRectCollision, hasRotation } = require('./collision');

class Weapon {
    constructor(options = {}) {
        this.damage = options.damage || 10;
        this.bulletSpeed = options.bulletSpeed || 15;
        this.fireCooldown = options.fireCooldown || 5; 
        this.angle = options.angle || 0;
        this.spread = options.spread || 0; // radians
        this.currentCooldown = 0;
        this.offsetDistance = options.offsetDistance || 25; // distance from player center
        this.ammo = options.ammo || 30;
        this.maxAmmo = options.maxAmmo || 30;
        this.reloadTime = options.reloadTime || 25.5;
        this.currentReloadTime = 0;
        this.isReloading = false;
        this.name = options.name || 'Weapon';
    }
    
    canFire() {
        return this.currentCooldown <= 0 && this.ammo > 0 && !this.isReloading;
    }
    
    fire(x, y, targetAngle, gameState, playerId) {
        if (!this.canFire()) return false;
        
        this.currentCooldown = this.fireCooldown;
        this.angle = targetAngle;
        this.ammo--;
        
        // Auto-reload if ammo is 0
        if (this.ammo === 0) {
            this.reload();
        }
        
        const bullets = [];
        const bullet = new Bullet({
            x: x,
            y: y,
            speed: this.bulletSpeed,
            angle: this.angle + (Math.random() - 0.5) * this.spread,
            damage: this.damage,
            playerId: playerId
        });
        bullets.push(bullet);
        gameState.bullets.push(bullet);
        
        return true;
    }
    
    reload() {
        if (this.ammo < this.maxAmmo && !this.isReloading) {
            this.isReloading = true;
            this.currentReloadTime = this.reloadTime;
            return true;
        }
        return false;
    }
    
    update(deltaTime) {
        if (this.isReloading) {
            this.currentReloadTime -= deltaTime;
            if (this.currentReloadTime <= 0) {
                this.ammo = this.maxAmmo;
                this.isReloading = false;
                this.currentReloadTime = 0;
            }
        }
    }
    
    render(ctx, playerX, playerY, playerAngle) {
        const weaponX = playerX + Math.cos(playerAngle) * this.offsetDistance;
        const weaponY = playerY + Math.sin(playerAngle) * this.offsetDistance;
        
        ctx.save();
        ctx.translate(weaponX, weaponY);
        ctx.rotate(playerAngle);
        
        ctx.fillStyle = '#333';
        ctx.fillRect(-8, -2, 16, 4);
        
        ctx.restore();
    }
}

class Shotgun extends Weapon {
    constructor(options = {}) {
        super({
            damage: options.damage || 16,
            bulletSpeed: options.bulletSpeed || 25,
            fireCooldown: options.fireCooldown || 24,
            spread: options.spread || Math.PI / 5, 
            offsetDistance: options.offsetDistance || 22,
            ammo: options.ammo || 8,
            maxAmmo: options.maxAmmo || 8,
            reloadTime: options.reloadTime || 35.0,
            name: 'Shotgun',
            ...options
        });
        this.pelletCount = options.pelletCount || 6;
    }
    
    fire(x, y, targetAngle, gameState, playerId) {
        if (!this.canFire()) return false;
        
        this.currentCooldown = this.fireCooldown;
        this.angle = targetAngle;
        this.ammo--;
        
        if (this.ammo === 0) {
            this.reload();
        }
        
        const bullets = [];
        for (let i = 0; i < this.pelletCount; i++) {
            const spreadAngle = (Math.random() - 0.5) * this.spread;
            const bullet = new Bullet({
                x: x,
                y: y,
                speed: this.bulletSpeed,
                angle: this.angle + spreadAngle,
                damage: this.damage,
                radius: 2,
                playerId: playerId
            });
            bullets.push(bullet);
            gameState.bullets.push(bullet);
        }
        
        return true;
    }
    
    render(ctx, playerX, playerY, playerAngle) {
        const weaponX = playerX + Math.cos(playerAngle) * this.offsetDistance;
        const weaponY = playerY + Math.sin(playerAngle) * this.offsetDistance;
        
        ctx.save();
        ctx.translate(weaponX, weaponY);
        ctx.rotate(playerAngle);
        
        // Shotgun - wider barrel
        ctx.fillStyle = '#654321';
        ctx.fillRect(-10, -3, 20, 6);
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(-12, -2, 4, 4);
        
        ctx.restore();
    }
}

class M4 extends Weapon {
    constructor(options = {}) {
        super({
            damage: options.damage || 6.5,
            bulletSpeed: options.bulletSpeed || 20,
            fireCooldown: options.fireCooldown || 3,
            spread: options.spread || Math.PI / 24, 
            offsetDistance: options.offsetDistance || 28,
            ammo: options.ammo || 30,
            maxAmmo: options.maxAmmo || 30,
            reloadTime: options.reloadTime || 25.5,
            playerId: options.playerId || null,
            name: 'M4',
            ...options
        });
    }
    
    render(ctx, playerX, playerY, playerAngle) {
        const weaponX = playerX + Math.cos(playerAngle) * this.offsetDistance;
        const weaponY = playerY + Math.sin(playerAngle) * this.offsetDistance;
        
        ctx.save();
        ctx.translate(weaponX, weaponY);
        ctx.rotate(playerAngle);
        
        // M4 - assault rifle shape
        ctx.fillStyle = '#2F4F2F';
        ctx.fillRect(-14, -2, 28, 4);
        ctx.fillStyle = '#1C1C1C';
        ctx.fillRect(-16, -1, 4, 2);
        ctx.fillRect(10, -3, 4, 6);
        
        ctx.restore();
    }
}

class Sniper extends Weapon {
    constructor(options = {}) {
        super({
            damage: options.damage || 35,
            bulletSpeed: options.bulletSpeed || 50,
            fireCooldown: options.fireCooldown || 75,
            spread: options.spread || Math.PI / 180, // 1 degree
            offsetDistance: options.offsetDistance || 35,
            ammo: options.ammo || 5,
            maxAmmo: options.maxAmmo || 5,
            reloadTime: options.reloadTime || 35.5,
            name: 'Sniper',
            ...options
        });
    }
    
    fire(x, y, targetAngle, gameState, playerId) {
        if (!this.canFire()) return false;
        
        this.currentCooldown = this.fireCooldown;
        this.angle = targetAngle;
        this.ammo--;
        
        const bullets = [];
        const bullet = new Bullet({
            x: x,
            y: y,
            speed: this.bulletSpeed,
            angle: this.angle + (Math.random() - 0.5) * this.spread,
            damage: this.damage,
            radius: 4,
            color: 'red',
            playerId: playerId
        });
        bullets.push(bullet);
        gameState.bullets.push(bullet);
        
        return true;
    }
    
    render(ctx, playerX, playerY, playerAngle) {
        const weaponX = playerX + Math.cos(playerAngle) * this.offsetDistance;
        const weaponY = playerY + Math.sin(playerAngle) * this.offsetDistance;
        
        ctx.save();
        ctx.translate(weaponX, weaponY);
        ctx.rotate(playerAngle);
        
        // Sniper - long thin barrel with scope
        ctx.fillStyle = '#4A4A4A';
        ctx.fillRect(-18, -1.5, 36, 3);
        ctx.fillStyle = '#000';
        ctx.fillRect(-20, -1, 4, 2);
        // Scope
        ctx.fillStyle = '#333';
        ctx.fillRect(-5, -4, 8, 8);
        
        ctx.restore();
    }
}

class Pistol extends Weapon {
    constructor(options = {}) {
        super({
            damage: options.damage || 18,
            bulletSpeed: options.bulletSpeed || 30,
            fireCooldown: options.fireCooldown || 9.5,
            spread: options.spread || Math.PI / 36, 
            offsetDistance: options.offsetDistance || 18,
            ammo: options.ammo || 15,
            maxAmmo: options.maxAmmo || 15,
            reloadTime: options.reloadTime || 25.0,
            playerId: options.playerId || null,
            name: 'Pistol',
            ...options
        });
    }
    
    render(ctx, playerX, playerY, playerAngle) {
        const weaponX = playerX + Math.cos(playerAngle) * this.offsetDistance;
        const weaponY = playerY + Math.sin(playerAngle) * this.offsetDistance;
        
        ctx.save();
        ctx.translate(weaponX, weaponY);
        ctx.rotate(playerAngle);
        
        // Pistol - small compact shape
        ctx.fillStyle = '#696969';
        ctx.fillRect(-6, -2, 12, 4);
        ctx.fillStyle = '#2F2F2F';
        ctx.fillRect(-8, -3, 4, 6);
        
        ctx.restore();
    }
}

class LaserGun extends Weapon {
    constructor(options = {}) {
        super({
            damage: options.damage || 0.78,
            fireCooldown: options.fireCooldown || 1.0,
            offsetDistance: options.offsetDistance || 30,
            ammo: options.ammo || 190,
            maxAmmo: options.maxAmmo || 190,
            reloadTime: options.reloadTime || 34.0,
            name: 'Laser Gun',
            ...options
        });
        this.range = options.range || 430;
        this.rampStep = options.rampStep || 0.12;
        this.maxDamage = options.maxDamage || 1.75;
        this.baseDamage = this.damage;
        this.currentDamage = this.baseDamage;
        this.timeSinceLastHit = 1000;
        this.rampResetDelay = options.rampResetDelay || 25;
    }

    update(deltaTime) {
        super.update(deltaTime);
        this.timeSinceLastHit += deltaTime;
        if (this.timeSinceLastHit > this.rampResetDelay) {
            this.currentDamage = this.baseDamage;
        }
    }

    raycast(x, y, angle, gameState, playerId) {
        const stepSize = 6;
        const rayRadius = 2;
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);

        let endX = x + dx * this.range;
        let endY = y + dy * this.range;
        let hitPlayer = null;

        for (let dist = 0; dist <= this.range; dist += stepSize) {
            const px = x + dx * dist;
            const py = y + dy * dist;

            for (const obstacle of gameState.obstacles || []) {
                if (obstacle.ownerId && obstacle.ownerId === playerId) {
                    continue;
                }
                const hitObstacle = hasRotation(obstacle)
                    ? circleRotatedRectCollision(px, py, rayRadius, obstacle)
                    : circleRectCollision(px, py, rayRadius, obstacle);
                if (hitObstacle) {
                    endX = x + dx * Math.max(0, dist - stepSize);
                    endY = y + dy * Math.max(0, dist - stepSize);
                    return { endX, endY, hitPlayer: null };
                }
            }

            for (const player of gameState.players || []) {
                if (!player || player.id === playerId) continue;
                const pdx = player.x - px;
                const pdy = player.y - py;
                if ((pdx * pdx + pdy * pdy) <= (player.radius + rayRadius) * (player.radius + rayRadius)) {
                    endX = px;
                    endY = py;
                    hitPlayer = player;
                    return { endX, endY, hitPlayer };
                }
            }
        }

        return { endX, endY, hitPlayer: null };
    }

    fire(x, y, targetAngle, gameState, playerId, io = null, owner = null) {
        if (!this.canFire()) return false;

        this.currentCooldown = this.fireCooldown;
        this.angle = targetAngle;
        this.ammo--;

        if (this.ammo === 0) {
            this.reload();
        }

        const { endX, endY, hitPlayer } = this.raycast(x, y, this.angle, gameState, playerId);

        if (owner) {
            owner.laserBeam = {
                startX: x,
                startY: y,
                endX,
                endY,
                color: '#3fd7ff'
            };
            owner.laserBeamTimer = 2;
        }

        if (hitPlayer) {
            const hpBefore = hitPlayer.HP;
            hitPlayer.takeDamage(this.currentDamage, playerId);
            const damageDealt = Math.max(0, hpBefore - hitPlayer.HP);
            if (damageDealt > 0) {
                this.timeSinceLastHit = 0;
                this.currentDamage = Math.min(this.maxDamage, this.currentDamage + this.rampStep);

                if (io && playerId) {
                    io.to(playerId).emit('hit');
                    io.to(hitPlayer.id).emit('gotHit');
                    io.to(playerId).emit('combatText', {
                        type: 'damage',
                        amount: damageDealt,
                        x: hitPlayer.x,
                        y: hitPlayer.y - hitPlayer.radius - 10
                    });
                }

                if (owner?.passiveAbility) {
                    const healedAmount = owner.passiveAbility.onDamageDealt(owner, damageDealt, hitPlayer, gameState) || 0;
                    if (healedAmount > 0 && io && playerId) {
                        io.to(playerId).emit('combatText', {
                            type: 'healing',
                            amount: healedAmount,
                            x: owner.x,
                            y: owner.y - owner.radius - 10
                        });
                    }
                }

                hitPlayer.flashingTimer = 1;
            }
        }

        return true;
    }
}

class Taser extends Weapon {
    constructor(options = {}) {
        super({
            damage: options.damage || 10,
            bulletSpeed: options.bulletSpeed || 37,
            fireCooldown: options.fireCooldown || 22,
            spread: options.spread || Math.PI / 80,
            offsetDistance: options.offsetDistance || 20,
            ammo: options.ammo || 1,
            maxAmmo: options.maxAmmo || 1,
            reloadTime: options.reloadTime || 42,
            name: 'Taser',
            ...options
        });
        this.range = options.range || 250;
        this.stunDuration = options.stunDuration || 30;
    }

    fire(x, y, targetAngle, gameState, playerId) {
        if (!this.canFire()) return false;

        this.currentCooldown = this.fireCooldown;
        this.angle = targetAngle;
        this.ammo--;

        if (this.ammo === 0) {
            this.reload();
        }

        const lifetime = this.range / this.bulletSpeed;
        const bolt = new Bullet({
            x,
            y,
            speed: this.bulletSpeed,
            angle: this.angle + (Math.random() - 0.5) * this.spread,
            damage: this.damage,
            radius: 3,
            color: '#4aa8ff',
            stunDuration: this.stunDuration,
            lifetime,
            playerId
        });
        gameState.bullets.push(bolt);

        return true;
    }
}

module.exports = {
    Weapon,
    Shotgun,
    M4,
    Sniper,
    Pistol,
    LaserGun,
    Taser
}
