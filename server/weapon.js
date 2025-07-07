const { Bullet } = require('./bullet');

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

module.exports = {
    Weapon,
    Shotgun,
    M4,
    Sniper,
    Pistol
}