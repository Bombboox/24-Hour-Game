const { Bullet } = require('./bullet');
const { MAP_RADIUS } = require('./constants');
const { circleRectCollision, circleRotatedRectCollision, hasRotation } = require('./collision');

class GrenadeProjectile {
    constructor(options = {}) {
        this.id = options.id || `grenade_${options.ownerId}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.radius = options.radius || 20;
        this.ownerId = options.ownerId || null;
        this.angle = options.angle || 0;

        this.velocityX = options.velocityX || 0;
        this.velocityY = options.velocityY || 0;
        this.acceleration = options.acceleration || 1.5;
        this.accelerationTime = options.accelerationTime || 10;
        this.remainingAcceleration = this.accelerationTime;

        this.spin = options.spin || 0.45;
        this.angularVelocity = options.angularVelocity || 0.35;

        this.drag = options.drag || 0.93;
        this.angularDrag = options.angularDrag || 0.92;
        this.minSpeed = options.minSpeed || 0.18;
        this.minAngularSpeed = options.minAngularSpeed || 0.01;
        this.stationaryFuse = options.stationaryFuse || 35;
        this.stationaryTimer = 0;
        this.lifetime = options.lifetime || 170;
        this.age = 0;

        this.explosionRadius = options.explosionRadius || 175;
        this.explosionDamage = options.explosionDamage || 60;

        this.shrapnelCount = options.shrapnelCount || 18;
        this.shrapnelSpeed = options.shrapnelSpeed || 18;
        this.shrapnelDamage = options.shrapnelDamage || 9;
        this.shrapnelLifetime = options.shrapnelLifetime || 45;

        this.active = true;
    }

    update(deltaTime, gameState) {
        if (!this.active) return;

        this.age += deltaTime;
        if (this.age >= this.lifetime) {
            this.explode(gameState);
            return;
        }

        if (this.remainingAcceleration > 0) {
            const accelStep = Math.min(deltaTime, this.remainingAcceleration);
            this.velocityX += Math.cos(this.angle) * this.acceleration * accelStep;
            this.velocityY += Math.sin(this.angle) * this.acceleration * accelStep;
            this.remainingAcceleration -= accelStep;
        }

        const dragStep = Math.pow(this.drag, Math.max(1, deltaTime));
        const angularDragStep = Math.pow(this.angularDrag, Math.max(1, deltaTime));
        this.velocityX *= dragStep;
        this.velocityY *= dragStep;
        this.angularVelocity *= angularDragStep;

        const speed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
        if (speed < this.minSpeed) {
            this.velocityX = 0;
            this.velocityY = 0;
        }
        if (Math.abs(this.angularVelocity) < this.minAngularSpeed) {
            this.angularVelocity = 0;
        }

        this.x += this.velocityX * deltaTime;
        this.y += this.velocityY * deltaTime;
        this.spin += this.angularVelocity * deltaTime;

        const distanceFromCenter = Math.sqrt(this.x * this.x + this.y * this.y);
        if (distanceFromCenter + this.radius >= MAP_RADIUS) {
            this.explode(gameState);
            return;
        }

        const obstacleHit = this.collidesWithObstacle(gameState.obstacles);
        if (obstacleHit) {
            if (obstacleHit.health) {
                obstacleHit.takeDamage(55, gameState);
            }
            this.explode(gameState);
            return;
        }

        if (this.collidesWithPlayer(gameState.players)) {
            this.explode(gameState);
            return;
        }

        if (this.velocityX === 0 && this.velocityY === 0 && this.angularVelocity === 0) {
            this.stationaryTimer += deltaTime;
            if (this.stationaryTimer >= this.stationaryFuse) {
                this.explode(gameState);
            }
        } else {
            this.stationaryTimer = 0;
        }
    }

    collidesWithObstacle(obstacles = []) {
        for (const obstacle of obstacles) {
            if (hasRotation(obstacle)) {
                if (circleRotatedRectCollision(this.x, this.y, this.radius, obstacle)) {
                    return obstacle;
                }
                continue;
            }

            if (circleRectCollision(this.x, this.y, this.radius, obstacle)) {
                return obstacle;
            }
        }
        return null;
    }

    collidesWithPlayer(players = []) {
        for (const player of players) {
            if (player.id === this.ownerId) continue;
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const radiusSum = player.radius + this.radius;
            if (dx * dx + dy * dy < radiusSum * radiusSum) {
                return true;
            }
        }
        return false;
    }

    explode(gameState) {
        if (!this.active) return;
        this.active = false;

        for (const player of gameState.players) {
            if (player.id === this.ownerId) continue;
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > this.explosionRadius) continue;

            const falloff = 1 - (distance / this.explosionRadius);
            const damage = this.explosionDamage * Math.max(0.35, falloff);
            player.takeDamage(damage, this.ownerId);
            player.flashingTimer = 1;
        }

        const angleStep = (Math.PI * 2) / this.shrapnelCount;
        for (let i = 0; i < this.shrapnelCount; i++) {
            const shrapnelAngle = i * angleStep;
            const shrapnel = new Bullet({
                x: this.x,
                y: this.y,
                speed: this.shrapnelSpeed,
                angle: shrapnelAngle,
                damage: this.shrapnelDamage,
                radius: 2,
                color: '#ffcc66',
                playerId: this.ownerId,
                lifetime: this.shrapnelLifetime
            });
            gameState.bullets.push(shrapnel);
        }

        this.destroy(gameState);
    }

    destroy(gameState) {
        const index = gameState.grenades.indexOf(this);
        if (index > -1) {
            gameState.grenades.splice(index, 1);
        }
    }

}

module.exports = {
    GrenadeProjectile
};
