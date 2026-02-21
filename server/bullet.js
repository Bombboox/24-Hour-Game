const { circleRectCollision, circleRotatedRectCollision, hasRotation } = require('./collision');

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
    }
    
    update(deltaTime, gameState) {
        if (!this.active) return;
        this.age += deltaTime;
        
        if (this.age >= this.lifetime) {
            this.active = false;
            this.destroy(gameState);
            return;
        }

        const obstacles = gameState.obstacles;
        
        const dx = Math.cos(this.angle) * this.speed * deltaTime;
        const dy = Math.sin(this.angle) * this.speed * deltaTime;
        
        this.x += dx;
        this.y += dy;
        
        for (const obstacle of obstacles) {
            if (obstacle.ownerId && obstacle.ownerId === this.playerId) {
                continue;
            }
            if (hasRotation(obstacle)) {
                if (circleRotatedRectCollision(this.x, this.y, this.radius, obstacle)) {
                    this.active = false;
                    this.destroy(gameState);
                    if(obstacle.health) {
                        obstacle.takeDamage(this.damage, gameState);
                    }
                    break;
                }
            } else if (circleRectCollision(this.x, this.y, this.radius, obstacle)) {
                this.active = false;
                this.destroy(gameState);
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
        gameState.bullets.splice(gameState.bullets.indexOf(this), 1);
    }
}



module.exports = {
    Bullet
}
