const { createCanvas, loadImage, Image } = require('canvas');
const { SpecialAbility, Dash, Enlarge, Berserk } = require('./specialAbilities');
const { MAP_RADIUS } = require('./constants');

class Character {
    constructor(options = {x, y, radius, image, speed, maxHP, primaryWeapon, angle, damage, id}) {
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.radius = options.radius || 20;
        this.image = options.image || null;
        this.speed = options.speed || 5;
        this.maxHP = options.maxHP || 100;
        this.HP = this.maxHP;
        this.primaryWeapon = options.primaryWeapon || null;
        this.angle = options.angle || 0;
        this.damage = options.damage || 1.0;
        this.inputs = [];
        this.id = options.id || null;
        this.name = options.name || 'Player';
        this.isFiring = false;
        this.flashingTimer = 0;
        this.spawnX = options.spawnX || 0;
        this.spawnY = options.spawnY || 0;
        this.kills = options.kills || 0;
        this.specialAbility = options.specialAbility || null;
        this.defense = options.defense ?? 1;
    }
    
    takeDamage(damage) {
        this.HP -= damage * this.defense;
        if (this.HP < 0) {
            this.HP = 0;
        }
    }
    
    move(dx, dy, obstacles = [], bullets = []) {
        const newX = this.x + dx * this.speed;
        const newY = this.y + dy * this.speed;
        
        let canMoveX = true;
        let canMoveY = true;
        
        for (const obstacle of obstacles) {
            if (this.checkCircleRectCollision(newX, this.y, this.radius, obstacle)) {
                canMoveX = false;
            }
            
            if (this.checkCircleRectCollision(this.x, newY, this.radius, obstacle)) {
                canMoveY = false;
            }
        }
        
        if (canMoveX) {
            this.x = newX;
        }
        if (canMoveY) {
            this.y = newY;
        }
    }
    
    checkCircleRectCollision(circleX, circleY, circleRadius, rect) {
        const closestX = Math.max(rect.x, Math.min(circleX, rect.x + rect.w));
        const closestY = Math.max(rect.y, Math.min(circleY, rect.y + rect.h));
        
        const distanceX = circleX - closestX;
        const distanceY = circleY - closestY;
        const distanceSquared = distanceX * distanceX + distanceY * distanceY;
        
        return distanceSquared < (circleRadius * circleRadius);
    }
    
    checkCircleCircleCollision(x1, y1, radius1, x2, y2, radius2) {
        const distanceX = x1 - x2;
        const distanceY = y1 - y2;
        const distanceSquared = distanceX * distanceX + distanceY * distanceY;
        const radiusSum = radius1 + radius2;
        
        return distanceSquared < (radiusSum * radiusSum);
    }
    
    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        if (this.image) {
            ctx.drawImage(this.image, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
        } else {
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, 2 * Math.PI);
            ctx.fillStyle = 'blue';
            ctx.fill();
            ctx.strokeStyle = 'darkblue';
            ctx.stroke();
        }
        
        ctx.restore();
    }

    reload() {
        this.primaryWeapon.reload();
    }

    respawn() {
        this.x = this.spawnX;
        this.y = this.spawnY;
        this.HP = this.maxHP;
        this.primaryWeapon.ammo = this.primaryWeapon.maxAmmo;
        if(this.specialAbility) {
            if(this.specialAbility.isActive) this.specialAbility.onEnd(this);
            this.specialAbility.currentCooldown = 0;
            this.specialAbility.currentDuration = 0;
            this.specialAbility.isActive = false;
        }
    }

    randomSpawn(gameState) {
        let attempts = 0;
        let validPosition = false;
        let x, y;
        
        while (!validPosition && attempts < 100) {
            // Generate random position within map bounds
            const angle = Math.random() * 2 * Math.PI;
            const distance = Math.random() * (MAP_RADIUS - this.radius);
            x = Math.cos(angle) * distance;
            y = Math.sin(angle) * distance;
            
            // Check if position overlaps with any obstacles
            validPosition = true;
            for (const obstacle of gameState.obstacles) {
                if (this.checkCircleRectCollision(x, y, this.radius, obstacle)) {
                    validPosition = false;
                    break;
                }
            }
            
            attempts++;
        }
        
        // If we couldn't find a valid position after many attempts, use center
        if (!validPosition) {
            x = 0;
            y = 0;
        }
        
        this.x = x;
        this.y = y;
        this.spawnX = x;
        this.spawnY = y;
        this.HP = this.maxHP;
        this.primaryWeapon.ammo = this.primaryWeapon.maxAmmo;
        if(this.specialAbility) {
            if(this.specialAbility.isActive) this.specialAbility.onEnd(this);
            this.specialAbility.currentCooldown = 0;
            this.specialAbility.currentDuration = 0;
            this.specialAbility.isActive = false;
        }
    }
}

class Ninja extends Character {
    constructor(options = {}) {
        const ninjaImage = new Image();
        ninjaImage.src = 'sprites/ninja.png';
        
        super({
            ...options,
            speed: options.speed || 8,
            maxHP: options.maxHP || 75,
            damage: options.damage || 1.2,
            radius: options.radius || 18,
            image: options.image || ninjaImage,
            name: options.name || 'Ninja',
        });
        this.specialAbility = new Dash({
            character: this
        });
    }
    
    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        if (this.image) {
            ctx.drawImage(this.image, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
        } else {
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, 2 * Math.PI);
            ctx.fillStyle = 'black';
            ctx.fill();
            ctx.strokeStyle = 'gray';
            ctx.stroke();
        }
        
        ctx.restore();
    }
}

class King extends Character {
    constructor(options = {}) {
        const kingImage = new Image();
        kingImage.src = 'sprites/king.png';
        
        super({
            ...options,
            speed: options.speed || 3,
            maxHP: options.maxHP || 200,
            damage: options.damage || 1.5,
            radius: options.radius || 25,
            image: options.image || kingImage,
            name: options.name || 'King',
            specialAbility: new Enlarge()
        });
    }
    
    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        if (this.image) {
            ctx.drawImage(this.image, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
        } else {
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, 2 * Math.PI);
            ctx.fillStyle = 'gold';
            ctx.fill();
            ctx.strokeStyle = 'darkgoldenrod';
            ctx.lineWidth = 3;
            ctx.stroke();
        }
        
        ctx.restore();
    }
}

class Berserker extends Character {
    constructor(options = {}) {
        const berserkerImage = new Image();
        berserkerImage.src = 'sprites/berserker.png';
        
        super({
            ...options,
            speed: options.speed || 6,
            maxHP: options.maxHP || 120,
            damage: options.damage || 2.0,
            radius: options.radius || 22,
            image: options.image || berserkerImage,
            name: options.name || 'Berserker',
            specialAbility: new Berserk()
        });
    }
    
    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        if (this.image) {
            ctx.drawImage(this.image, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
        } else {
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, 2 * Math.PI);
            ctx.fillStyle = 'red';
            ctx.fill();
            ctx.strokeStyle = 'darkred';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        
        ctx.restore();
    }
}

module.exports = {
    Character,
    Ninja,
    King,
    Berserker
}