class Obstacle {
    constructor(options = {x, y, w, h, color}) {
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.w = options.w || 50;
        this.h = options.h || 50;
        this.color = options.color || 'gray';
    }
    
    render(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.w, this.h);
    }
}

module.exports = {
    Obstacle
}