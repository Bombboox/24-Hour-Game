class Obstacle {
    constructor(options = {x, y, w, h, color}) {
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.w = options.w || 50;
        this.h = options.h || 50;
        this.color = options.color || 'gray';
        this.id = options.id || `obstacle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    destroy(gameState) {
        gameState.obstacles.splice(gameState.obstacles.indexOf(this), 1);
    }
    
    render(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.w, this.h);
    }
}

class Shield extends Obstacle {
    constructor(options = {}) {
        super(options);
        this.health = options.health ?? 120;
        this.image = "shield.png";
        this.angle = options.angle || 0;
        this.ownerId = options.ownerId || null;
        this.duration = options.duration ?? 750;
        this.age = 0;
    }

    takeDamage(damage, gameState) {
        this.health -= damage;
        if(this.health <= 0) {
            this.destroy(gameState);
        }
    }

    update(deltaTime, gameState) {
        this.age += deltaTime;
        if (this.age >= this.duration) {
            this.destroy(gameState);
        }
    }
}

class AutoTurret extends Obstacle {
    constructor(options = {}) {
        super(options);
        this.kind = 'autoTurret';
        this.image = 'turret_base.png';
        this.headImage = 'turret_head.png';
        this.health = options.health ?? 110;
        this.ownerId = options.ownerId || null;
        this.duration = options.duration ?? 750;
        this.age = 0;
        this.range = options.range ?? 520;
        this.fireCooldown = options.fireCooldown ?? 10;
        this.currentCooldown = 0;
        this.bulletSpeed = options.bulletSpeed ?? 20;
        this.bulletDamage = options.bulletDamage ?? 8;
        this.bulletRadius = options.bulletRadius ?? 3;
        this.angle = options.angle || 0;
        this.muzzleOffset = options.muzzleOffset ?? Math.max(this.w, this.h) * 0.42;
    }

    takeDamage(damage, gameState) {
        this.health -= damage;
        if (this.health <= 0) {
            this.destroy(gameState);
        }
    }

    findNearestTarget(gameState) {
        if (!gameState?.players) return null;

        let nearest = null;
        let nearestDistance = Infinity;
        for (const player of gameState.players) {
            if (!player || player.id === this.ownerId || player.HP <= 0) continue;
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance <= this.range && distance < nearestDistance) {
                nearestDistance = distance;
                nearest = player;
            }
        }

        return nearest;
    }

    update(deltaTime, gameState) {
        this.age += deltaTime;
        if (this.age >= this.duration) {
            this.destroy(gameState);
            return;
        }

        if (this.currentCooldown > 0) {
            this.currentCooldown -= deltaTime;
        }

        const target = this.findNearestTarget(gameState);
        if (!target) return;

        this.angle = Math.atan2(target.y - this.y, target.x - this.x);

        if (this.currentCooldown > 0 || !gameState?.bullets) return;

        const spawnX = this.x + Math.cos(this.angle) * this.muzzleOffset;
        const spawnY = this.y + Math.sin(this.angle) * this.muzzleOffset;
        const { Bullet } = require('./bullet');
        const bullet = new Bullet({
            x: spawnX,
            y: spawnY,
            speed: this.bulletSpeed,
            angle: this.angle,
            damage: this.bulletDamage,
            radius: this.bulletRadius,
            color: '#ffd56c',
            playerId: this.ownerId
        });
        gameState.bullets.push(bullet);
        this.currentCooldown = this.fireCooldown;
    }
}

module.exports = {
    Obstacle,
    Shield,
    AutoTurret
}
