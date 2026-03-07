const { Bullet } = require('./bullet');
const { MAP_RADIUS } = require('./constants');
const { circleRectCollision, circleRotatedRectCollision, hasRotation } = require('./collision');
const { applyDamage } = require('./combat');

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
        this.stationaryFuse = options.stationaryFuse || 5;
        this.stationaryTimer = 0;
        this.lifetime = options.lifetime || 120;
        this.age = 0;

        this.explosionRadius = options.explosionRadius || 175;
        this.explosionDamage = options.explosionDamage || 60;

        this.shrapnelCount = options.shrapnelCount || 18;
        this.shrapnelSpeed = options.shrapnelSpeed || 18;
        this.shrapnelDamage = options.shrapnelDamage || 9;
        this.shrapnelLifetime = options.shrapnelLifetime || 45;

        this.active = true;
    }

    update(deltaTime, gameState, io = null) {
        if (!this.active) return;
        const owner = gameState.players.find((player) => player.id === this.ownerId);

        this.age += deltaTime;
        if (this.age >= this.lifetime) {
            this.explode(gameState, io);
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
            this.explode(gameState, io);
            return;
        }

        const obstacleHit = this.collidesWithObstacle(gameState.obstacles, owner);
        if (obstacleHit) {
            if (obstacleHit.health) {
                obstacleHit.takeDamage(55, gameState);
            }
            this.explode(gameState, io);
            return;
        }

        if (this.collidesWithPlayer(gameState.players)) {
            this.explode(gameState, io);
            return;
        }

        if (this.velocityX === 0 && this.velocityY === 0 && this.angularVelocity === 0) {
            this.stationaryTimer += deltaTime;
            if (this.stationaryTimer >= this.stationaryFuse) {
                this.explode(gameState, io);
            }
        } else {
            this.stationaryTimer = 0;
        }
    }

    collidesWithObstacle(obstacles = [], owner = null) {
        for (const obstacle of obstacles) {
            if (this.isFriendlyObstacle(obstacle, owner)) {
                continue;
            }
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

    isFriendlyObstacle(obstacle, owner = null) {
        if (!obstacle) return false;
        if (obstacle.ownerId && obstacle.ownerId === this.ownerId) {
            return true;
        }
        if (owner?.team && obstacle.ownerTeam && owner.team === obstacle.ownerTeam) {
            return true;
        }
        return false;
    }

    collidesWithPlayer(players = []) {
        const owner = players.find((player) => player.id === this.ownerId);
        for (const player of players) {
            if (player.id === this.ownerId) continue;
            if (
                owner &&
                owner.team &&
                player.team &&
                owner.team === player.team
            ) {
                continue;
            }
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const radiusSum = player.radius + this.radius;
            if (dx * dx + dy * dy < radiusSum * radiusSum) {
                return true;
            }
        }
        return false;
    }

    explode(gameState, io = null) {
        if (!this.active) return;
        this.active = false;
        const owner = gameState.players.find((player) => player.id === this.ownerId);

        for (const player of gameState.players) {
            if (player.id === this.ownerId) continue;
            if (
                gameState.gameMode === '2v2' &&
                owner &&
                owner.team &&
                player.team &&
                owner.team === player.team
            ) {
                continue;
            }
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > this.explosionRadius) continue;

            const falloff = 1 - (distance / this.explosionRadius);
            const damage = this.explosionDamage * Math.max(0.35, falloff);
            applyDamage({
                gameState,
                target: player,
                amount: damage,
                sourceId: this.ownerId,
                attacker: owner
            });
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

class DemoExplosive {
    constructor(options = {}) {
        this.id = options.id || `demo_explosive_${options.ownerId}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        this.kind = 'demoExplosive';
        this.createdAt = Date.now();
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.radius = options.radius || 14;
        this.ownerId = options.ownerId || null;
        this.angle = options.angle || 0;
        this.velocityX = options.velocityX || 0;
        this.velocityY = options.velocityY || 0;
        this.drag = options.drag || 0.9;
        this.minSpeed = options.minSpeed || 0.35;
        this.active = true;
        this.isStationary = false;
        this.hiddenForEnemies = false;
        this.spin = options.spin || 0;
        this.angularVelocity = options.angularVelocity || 0.32;
        this.explosionRadius = options.explosionRadius || 155;
        this.explosionDamage = options.explosionDamage || 80;
        this.explosionForce = options.explosionForce || 18;
        this.selfDamageMultiplier = options.selfDamageMultiplier || 0.2;
    }

    update(deltaTime, gameState, io = null) {
        if (!this.active) return;
        const owner = gameState.players.find((player) => player.id === this.ownerId);
        if (this.isStationary) {
            this.hiddenForEnemies = true;
            this.angularVelocity = 0;
            return;
        }

        this.velocityX *= Math.pow(this.drag, Math.max(1, deltaTime));
        this.velocityY *= Math.pow(this.drag, Math.max(1, deltaTime));
        this.spin += this.angularVelocity * deltaTime;

        const oldX = this.x;
        const oldY = this.y;
        this.x += this.velocityX * deltaTime;
        this.y += this.velocityY * deltaTime;

        const distanceFromCenter = Math.sqrt(this.x * this.x + this.y * this.y);
        if (distanceFromCenter + this.radius >= MAP_RADIUS) {
            const normalX = this.x / Math.max(0.0001, distanceFromCenter);
            const normalY = this.y / Math.max(0.0001, distanceFromCenter);
            this.x = normalX * (MAP_RADIUS - this.radius - 1);
            this.y = normalY * (MAP_RADIUS - this.radius - 1);
            this.stick();
            return;
        }

        const obstacleHit = this.collidesWithObstacle(gameState.obstacles, owner);
        if (obstacleHit) {
            this.x = oldX;
            this.y = oldY;
            this.stick();
            return;
        }

        const speed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
        if (speed <= this.minSpeed) {
            this.stick();
        }
    }

    collidesWithObstacle(obstacles = [], owner = null) {
        for (const obstacle of obstacles) {
            if (this.isFriendlyObstacle(obstacle, owner)) {
                continue;
            }
            if (hasRotation(obstacle)) {
                if (circleRotatedRectCollision(this.x, this.y, this.radius, obstacle)) {
                    return obstacle;
                }
            } else if (circleRectCollision(this.x, this.y, this.radius, obstacle)) {
                return obstacle;
            }
        }
        return null;
    }

    isFriendlyObstacle(obstacle, owner = null) {
        if (!obstacle) return false;
        if (obstacle.ownerId && obstacle.ownerId === this.ownerId) {
            return true;
        }
        if (owner?.team && obstacle.ownerTeam && owner.team === obstacle.ownerTeam) {
            return true;
        }
        return false;
    }

    stick() {
        this.isStationary = true;
        this.hiddenForEnemies = true;
        this.velocityX = 0;
        this.velocityY = 0;
        this.angularVelocity = 0;
    }

    detonate(gameState, io = null) {
        if (!this.active) return;
        this.active = false;
        const owner = gameState.players.find((p) => p.id === this.ownerId);

        for (const player of gameState.players) {
            if (
                gameState.gameMode === '2v2' &&
                owner &&
                owner.team &&
                player.team &&
                owner.team === player.team &&
                player.id !== this.ownerId
            ) {
                continue;
            }

            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > this.explosionRadius) continue;

            const normalizedX = dx / Math.max(0.0001, distance);
            const normalizedY = dy / Math.max(0.0001, distance);
            const falloff = Math.max(0.25, 1 - (distance / this.explosionRadius));
            const selfMultiplier = player.id === this.ownerId ? this.selfDamageMultiplier : 1;
            const damage = this.explosionDamage * falloff * selfMultiplier;
            const impulse = this.explosionForce * falloff;

            applyDamage({
                gameState,
                target: player,
                amount: damage,
                sourceId: this.ownerId,
                attacker: owner
            });

            player.forceVX = (player.forceVX || 0) + normalizedX * impulse;
            player.forceVY = (player.forceVY || 0) + normalizedY * impulse;
            if (player.passiveAbility && typeof player.passiveAbility.onForceApplied === 'function') {
                player.passiveAbility.onForceApplied(player, impulse);
            }
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

class WaffleDrone {
    constructor(options = {}) {
        this.id = options.id || `waffle_drone_${options.ownerId}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        this.kind = 'waffleDrone';
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.radius = options.radius || 14;
        this.ownerId = options.ownerId || null;
        this.ownerTeam = options.ownerTeam || null;
        this.angle = options.angle || 0;
        this.spin = this.angle;
        this.velocityX = options.velocityX || 0;
        this.velocityY = options.velocityY || 0;
        this.speed = options.speed || Math.sqrt((this.velocityX ** 2) + (this.velocityY ** 2)) || 17;
        this.active = true;
        this.range = options.range || 360;
        this.fireCooldown = options.fireCooldown || 14;
        this.currentCooldown = 0;
        this.bulletSpeed = options.bulletSpeed || 18;
        this.bulletDamage = options.bulletDamage || 8;
        this.bulletRadius = options.bulletRadius || 3;
        this.explosionRadius = options.explosionRadius || 95;
        this.explosionDamage = options.explosionDamage || 18;
        this.maxLifetime = options.maxLifetime || 225;
        this.age = 0;
    }

    isFriendlyObstacle(obstacle, owner = null) {
        if (!obstacle) return false;
        if (obstacle.ownerId && obstacle.ownerId === this.ownerId) return true;
        if (owner?.team && obstacle.ownerTeam && owner.team === obstacle.ownerTeam) return true;
        return false;
    }

    collidesWithObstacle(obstacles = [], owner = null) {
        for (const obstacle of obstacles) {
            if (this.isFriendlyObstacle(obstacle, owner)) {
                continue;
            }
            if (hasRotation(obstacle)) {
                if (circleRotatedRectCollision(this.x, this.y, this.radius, obstacle)) {
                    return obstacle;
                }
            } else if (circleRectCollision(this.x, this.y, this.radius, obstacle)) {
                return obstacle;
            }
        }
        return null;
    }

    findNearestTarget(players = []) {
        const owner = players.find((player) => player.id === this.ownerId);
        const ownerTeam = this.ownerTeam || owner?.team || null;
        if (!this.ownerTeam && ownerTeam) {
            this.ownerTeam = ownerTeam;
        }

        let nearest = null;
        let nearestDistance = Infinity;
        for (const player of players) {
            if (!player || player.id === this.ownerId || player.HP <= 0 || player.isRespawning) continue;
            if (ownerTeam && player.team && ownerTeam === player.team) continue;
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

    collidesWithEnemyPlayer(players = []) {
        const owner = players.find((player) => player.id === this.ownerId);
        for (const player of players) {
            if (!player || player.id === this.ownerId || player.HP <= 0 || player.isRespawning) continue;
            if (owner?.team && player.team && owner.team === player.team) continue;
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const radiusSum = (player.radius || 0) + this.radius;
            if (dx * dx + dy * dy <= radiusSum * radiusSum) {
                return player;
            }
        }
        return null;
    }

    fireAtTarget(target, gameState) {
        if (!target || !gameState?.bullets) return;
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        this.angle = Math.atan2(dy, dx);
        this.spin = this.angle;
        gameState.bullets.push(new Bullet({
            x: this.x + Math.cos(this.angle) * (this.radius + 5),
            y: this.y + Math.sin(this.angle) * (this.radius + 5),
            speed: this.bulletSpeed,
            angle: this.angle,
            damage: this.bulletDamage,
            radius: this.bulletRadius,
            color: '#ffd56c',
            playerId: this.ownerId
        }));
        this.currentCooldown = this.fireCooldown;
    }

    update(deltaTime, gameState, io = null) {
        if (!this.active) return;
        const owner = gameState.players.find((player) => player.id === this.ownerId);
        this.age += deltaTime;
        if (this.age >= this.maxLifetime) {
            this.explode(gameState, io);
            return;
        }

        const velocityMagnitude = Math.sqrt((this.velocityX ** 2) + (this.velocityY ** 2));
        if (velocityMagnitude > 0) {
            this.velocityX = (this.velocityX / velocityMagnitude) * this.speed;
            this.velocityY = (this.velocityY / velocityMagnitude) * this.speed;
        } else {
            this.velocityX = Math.cos(this.spin) * this.speed;
            this.velocityY = Math.sin(this.spin) * this.speed;
        }

        this.x += this.velocityX * deltaTime;
        this.y += this.velocityY * deltaTime;

        const distanceFromCenter = Math.sqrt(this.x * this.x + this.y * this.y);
        if (distanceFromCenter + this.radius >= MAP_RADIUS) {
            this.explode(gameState, io);
            return;
        }

        const obstacleHit = this.collidesWithObstacle(gameState.obstacles, owner);
        if (obstacleHit) {
            if (obstacleHit.health) {
                obstacleHit.takeDamage(20, gameState);
            }
            this.explode(gameState, io);
            return;
        }

        if (this.collidesWithEnemyPlayer(gameState.players)) {
            this.explode(gameState, io);
            return;
        }

        if (this.currentCooldown > 0) {
            this.currentCooldown = Math.max(0, this.currentCooldown - deltaTime);
        }

        const target = this.findNearestTarget(gameState.players);
        if (!target) {
            return;
        }

        this.angle = Math.atan2(target.y - this.y, target.x - this.x);
        this.spin = this.angle;
        if (this.currentCooldown <= 0) {
            this.fireAtTarget(target, gameState);
        }
    }

    explode(gameState, io = null) {
        if (!this.active) return;
        this.active = false;
        const owner = gameState.players.find((player) => player.id === this.ownerId);

        for (const player of gameState.players || []) {
            if (!player || player.id === this.ownerId || player.HP <= 0 || player.isRespawning) continue;
            if (owner?.team && player.team && owner.team === player.team) continue;
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > this.explosionRadius) continue;

            const falloff = Math.max(0.35, 1 - (distance / this.explosionRadius));
            applyDamage({
                gameState,
                target: player,
                amount: this.explosionDamage * falloff,
                sourceId: this.ownerId,
                attacker: owner
            });
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
    GrenadeProjectile,
    DemoExplosive,
    WaffleDrone
};
