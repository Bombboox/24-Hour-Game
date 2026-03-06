const { circleRectCollision, circleRotatedRectCollision, hasRotation } = require('./collision');
const { applyDamage } = require('./combat');

function isFriendlyObstacleForShooter(obstacle, owner) {
    if (!obstacle || !owner) return false;
    if (obstacle.ownerId && obstacle.ownerId === owner.id) {
        return true;
    }
    if (owner.team && obstacle.ownerTeam && owner.team === obstacle.ownerTeam) {
        return true;
    }
    return false;
}

class Bullet {
    constructor(options = {x, y, radius, color, speed, angle, playerId, damage}) {
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.radius = options.radius || 3;
        this.color = options.color || 'yellow';
        this.speed = options.speed || 10;
        this.angle = options.angle || 0;
        this.active = true;
        this.playerId = options.playerId || null;
        this.damage = options.damage || 1;
        this.id = options.id || `${this.playerId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.lifetime = options.lifetime || 100; 
        this.age = 0; 
        this.stunDuration = options.stunDuration || 0;
        this.kind = options.kind || 'bullet';
        this.explosionRadius = options.explosionRadius || 0;
        this.explosionDamage = options.explosionDamage || this.damage;
        this.piercePlayers = !!options.piercePlayers;
        this.burnDuration = options.burnDuration || 0;
        this.burnDamagePerSecond = options.burnDamagePerSecond || 0;
        this.hitPlayers = new Set();
    }
    
    update(deltaTime, gameState, io = null) {
        if (!this.active) return;
        this.age += deltaTime;
        
        if (this.age >= this.lifetime) {
            this.active = false;
            this.destroy(gameState);
            return;
        }

        const obstacles = gameState.obstacles;
        const owner = (gameState.players || []).find((player) => player.id === this.playerId);

        if (this.kind !== 'bubble') {
            for (const other of gameState.bullets || []) {
                if (!other || other === this || !other.active || other.kind !== 'bubble') continue;

                const dxToBubble = this.x - other.x;
                const dyToBubble = this.y - other.y;
                const radii = this.radius + other.radius;
                if ((dxToBubble * dxToBubble + dyToBubble * dyToBubble) <= (radii * radii)) {
                    this.destroy(gameState);
                    return;
                }
            }
        }
        
        const dx = Math.cos(this.angle) * this.speed * deltaTime;
        const dy = Math.sin(this.angle) * this.speed * deltaTime;
        
        this.x += dx;
        this.y += dy;
        
        for (const obstacle of obstacles) {
            if (isFriendlyObstacleForShooter(obstacle, owner)) {
                continue;
            }
            if (hasRotation(obstacle)) {
                if (circleRotatedRectCollision(this.x, this.y, this.radius, obstacle)) {
                    if (this.kind === 'rocket') {
                        this.explode(gameState, io);
                    } else {
                        this.active = false;
                        this.destroy(gameState);
                    }
                    if(obstacle.health) {
                        obstacle.takeDamage(this.damage, gameState);
                    }
                    break;
                }
            } else if (circleRectCollision(this.x, this.y, this.radius, obstacle)) {
                if (this.kind === 'rocket') {
                    this.explode(gameState, io);
                } else {
                    this.active = false;
                    this.destroy(gameState);
                }
                if(obstacle.health) {
                    obstacle.takeDamage(this.damage, gameState);
                }
                break;
            }
        }
    }
    
    render(ctx) {
        if (!this.active) return;
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = 'orange';
        ctx.stroke();
    }

    destroy(gameState) {
        this.active = false;
        const index = gameState.bullets.indexOf(this);
        if (index > -1) {
            gameState.bullets.splice(index, 1);
        }
    }

    explode(gameState, io = null) {
        if (!this.active || this.kind !== 'rocket') {
            return;
        }
        this.active = false;
        const owner = gameState.players.find((player) => player.id === this.playerId);

        for (const player of gameState.players || []) {
            if (!player || player.id === this.playerId) continue;

            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > this.explosionRadius) continue;

            const falloff = Math.max(0.3, 1 - (distance / this.explosionRadius));
            const damage = this.explosionDamage * falloff;
            applyDamage({
                gameState,
                target: player,
                amount: damage,
                sourceId: this.playerId,
                attacker: owner
            });
        }

        this.destroy(gameState);
    }
}



module.exports = {
    Bullet
}
