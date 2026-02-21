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

module.exports = {
    Obstacle,
    Shield
}
