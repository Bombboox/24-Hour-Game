const { createCanvas, loadImage, Image } = require('canvas');
const { Dash, Enlarge, Berserk, NinjaMomentum, KingGoldenDomain, BerserkerBloodrush, DemomanSatchel, DemomanMomentum, ReaverArcPassive, ReaverShards, WaffleDroneAbility, WaffleSiliconeSkin } = require('./specialAbilities');
const { MAP_RADIUS } = require('./constants');
const { circleRectCollision, circleObstacleCollision, resolveCircleObstacleOverlaps } = require('./collision');

function isFriendlyObstacleForPlayer(player, obstacle) {
    if (!player || !obstacle) return false;
    if (obstacle.kind === 'shield') {
        return false;
    }
    if (obstacle.ownerId && obstacle.ownerId === player.id) {
        return true;
    }
    if (player.team && obstacle.ownerTeam && player.team === obstacle.ownerTeam) {
        return true;
    }
    return false;
}

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
        this.secondaryWeapon = options.secondaryWeapon || null;
        this.angle = options.angle || 0;
        this.damage = options.damage || 1.0;
        this.inputs = [];
        this.id = options.id || null;
        this.name = options.name || 'Player';
        this.isFiring = false;
        this.flashingTimer = 0;
        this.lastDamagedBy = options.lastDamagedBy || null;
        this.spawnX = options.spawnX || 0;
        this.spawnY = options.spawnY || 0;
        this.kills = options.kills || 0;
        this.specialAbility = options.specialAbility || null;
        this.sharedAbility = options.sharedAbility || null;
        this.defense = options.defense ?? 1;
        this.opacity = options.opacity ?? 1;
        this.invisible = options.invisible ?? false;
        this.swapCooldown = options.swapCooldown ?? 20;
        this.swapCooldownTimer = 0;
        this.sharedAbilityKeyHeld = false;
        this.passiveAbilityKeyHeld = false;
        this.specialAbilityKeyHeld = false;
        this.specialAbilityHoldTime = 0;
        this.passiveAbility = options.passiveAbility || null;
        this.passiveSpeedBonus = 1;
        this.passiveSpeedDebuff = 1;
        this.kingAuraSlowTimer = 0;
        this.kingAuraSlowMultiplier = 0.75;
        this.kingAuraPulseTimer = 0;
        this.auraSlowed = false;
        this.stunnedTimer = 0;
        this.stunned = false;
        this.laserBeam = null;
        this.laserBeamTimer = 0;
        this.forceVX = 0;
        this.forceVY = 0;
        this.reaverStackTimers = [];
        this.reaverStacks = 0;
        this.reaverStackDecayTimer = 0;
        this.reaverSourceId = null;
        this.reaverDotEffects = [];
        this.burnEffects = [];
        this.reaverBolts = [];
        this.team = options.team || null;
        this.isRespawning = false;
        this.respawnTimer = 0;
        this.invulnerableTimer = 0;
        this.coinsCollected = 0;
        this.pickupHealOverTimeEffects = [];
        this.shieldHP = options.shieldHP ?? 0;
        this.maxShieldHP = options.maxShieldHP ?? 0;
        this.shieldVisible = options.shieldVisible ?? false;
    }
    
    takeDamage(damage, sourceId = null, gameState = null) {
        if (this.isRespawning || (this.invulnerableTimer || 0) > 0) {
            return;
        }
        let adjustedDamage = damage;
        if (this.passiveAbility && typeof this.passiveAbility.onBeforeTakeDamage === 'function') {
            adjustedDamage = this.passiveAbility.onBeforeTakeDamage(this, adjustedDamage, sourceId, gameState);
        }
        this.HP -= adjustedDamage * this.defense;
        if (sourceId) {
            this.lastDamagedBy = sourceId;
        }
        if (this.HP < 0) {
            this.HP = 0;
        }
    }

    swapWeapons() {
        if(this.swapCooldownTimer > 0) return;
        this.swapCooldownTimer = this.swapCooldown;
        let temp = this.primaryWeapon;
        this.primaryWeapon = this.secondaryWeapon;
        this.secondaryWeapon = temp;
    }
    
    getMoveSpeed() {
        return this.speed * this.passiveSpeedBonus * this.passiveSpeedDebuff;
    }

    move(dx, dy, obstacles = [], bullets = []) {
        const effectiveSpeed = this.getMoveSpeed();
        const newX = this.x + dx * effectiveSpeed;
        const newY = this.y + dy * effectiveSpeed;
        const collidableObstacles = obstacles.filter((obstacle) => {
            if (isFriendlyObstacleForPlayer(this, obstacle)) {
                return false;
            }
            return true;
        });
        
        let canMoveX = true;
        let canMoveY = true;
        
        for (const obstacle of collidableObstacles) {
            if (circleObstacleCollision(newX, this.y, this.radius, obstacle)) {
                canMoveX = false;
            }
            
            if (circleObstacleCollision(this.x, newY, this.radius, obstacle)) {
                canMoveY = false;
            }
        }
        
        if (canMoveX) {
            this.x = newX;
        }
        if (canMoveY) {
            this.y = newY;
        }

        // If already intersecting (e.g. spawned inside a shield), push out.
        const resolved = resolveCircleObstacleOverlaps(this.x, this.y, this.radius, collidableObstacles);
        this.x = resolved.x;
        this.y = resolved.y;
    }
    
    checkCircleRectCollision(circleX, circleY, circleRadius, rect) {
        return circleRectCollision(circleX, circleY, circleRadius, rect);
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

    breakInvisibility(gameState) {
        if (!this.sharedAbility || this.sharedAbility.name !== 'Invisibility') return;
        this.sharedAbility.cancel(this, gameState);
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
            if (typeof this.specialAbility.onRespawn === 'function') {
                this.specialAbility.onRespawn(this);
            }
        }
        if(this.sharedAbility) {
            if(this.sharedAbility.isActive) this.sharedAbility.onEnd(this);
            this.sharedAbility.currentCooldown = 0;
            this.sharedAbility.currentDuration = 0;
            this.sharedAbility.isActive = false;
        }
        this.passiveSpeedBonus = 1;
        this.passiveSpeedDebuff = 1;
        this.kingAuraSlowTimer = 0;
        this.kingAuraPulseTimer = 0;
        this.auraSlowed = false;
        this.stunnedTimer = 0;
        this.stunned = false;
        this.laserBeam = null;
        this.laserBeamTimer = 0;
        this.forceVX = 0;
        this.forceVY = 0;
        this.reaverStackTimers = [];
        this.reaverStacks = 0;
        this.reaverStackDecayTimer = 0;
        this.reaverSourceId = null;
        this.reaverDotEffects = [];
        this.burnEffects = [];
        this.reaverBolts = [];
        this.isRespawning = false;
        this.respawnTimer = 0;
        this.invulnerableTimer = 0;
        this.pickupHealOverTimeEffects = [];
        this.sharedAbilityKeyHeld = false;
        this.passiveAbilityKeyHeld = false;
        this.specialAbilityKeyHeld = false;
        this.specialAbilityHoldTime = 0;
        if (this.passiveAbility) {
            this.passiveAbility.currentCooldown = 0;
            this.passiveAbility.currentDuration = 0;
            this.passiveAbility.isActive = false;
            this.passiveAbility.onRespawn(this);
        }
        this.invisible = false;
        this.opacity = 1;
    }

    randomSpawn(gameState) {
        let attempts = 0;
        let validPosition = false;
        let x, y;
        
        while (!validPosition && attempts < 100) {
            // generate random position within map bounds
            const angle = Math.random() * 2 * Math.PI;
            const distance = Math.random() * (MAP_RADIUS - this.radius);
            x = Math.cos(angle) * distance;
            y = Math.sin(angle) * distance;
            
            // check if position overlaps with any obstacles
            validPosition = true;
            for (const obstacle of gameState.obstacles) {
                if (isFriendlyObstacleForPlayer(this, obstacle)) {
                    continue;
                }
                if (circleObstacleCollision(x, y, this.radius, obstacle)) {
                    validPosition = false;
                    break;
                }
            }
            
            attempts++;
        }
        
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
            if (typeof this.specialAbility.onRespawn === 'function') {
                this.specialAbility.onRespawn(this);
            }
        }
        if (gameState?.grenades) {
            gameState.grenades = gameState.grenades.filter(
                (grenade) => !(
                    (grenade.kind === 'demoExplosive' || grenade.kind === 'waffleDrone') &&
                    grenade.ownerId === this.id
                )
            );
        }
        if(this.sharedAbility) {
            if(this.sharedAbility.isActive) this.sharedAbility.onEnd(this);
            this.sharedAbility.currentCooldown = 0;
            this.sharedAbility.currentDuration = 0;
            this.sharedAbility.isActive = false;
        }
        this.passiveSpeedBonus = 1;
        this.passiveSpeedDebuff = 1;
        this.kingAuraSlowTimer = 0;
        this.kingAuraPulseTimer = 0;
        this.auraSlowed = false;
        this.stunnedTimer = 0;
        this.stunned = false;
        this.laserBeam = null;
        this.laserBeamTimer = 0;
        this.forceVX = 0;
        this.forceVY = 0;
        this.reaverStackTimers = [];
        this.reaverStacks = 0;
        this.reaverStackDecayTimer = 0;
        this.reaverSourceId = null;
        this.reaverDotEffects = [];
        this.burnEffects = [];
        this.reaverBolts = [];
        this.isRespawning = false;
        this.respawnTimer = 0;
        this.invulnerableTimer = 0;
        this.pickupHealOverTimeEffects = [];
        this.sharedAbilityKeyHeld = false;
        this.passiveAbilityKeyHeld = false;
        this.specialAbilityKeyHeld = false;
        this.specialAbilityHoldTime = 0;
        if (this.passiveAbility) {
            this.passiveAbility.currentCooldown = 0;
            this.passiveAbility.currentDuration = 0;
            this.passiveAbility.isActive = false;
            this.passiveAbility.onRespawn(this);
        }
        this.invisible = false;
        this.opacity = 1;
    }
}

class Ninja extends Character {
    constructor(options = {}) {
        const ninjaImage = new Image();
        ninjaImage.src = 'sprites/ninja.png';
        
        super({
            ...options,
            speed: options.speed || 8,
            maxHP: options.maxHP || 85,
            damage: options.damage || 1.2,
            radius: options.radius || 18,
            image: options.image || ninjaImage,
            name: options.name || 'Ninja',
        });
        this.specialAbility = new Dash({    
            character: this
        });
        this.passiveAbility = new NinjaMomentum();
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
            speed: options.speed || 4,
            maxHP: options.maxHP || 200,
            damage: options.damage || 1.5,
            radius: options.radius || 25,
            image: options.image || kingImage,
            name: options.name || 'King',
            specialAbility: new Enlarge()
        });
        this.passiveAbility = new KingGoldenDomain();
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
            maxHP: options.maxHP || 125,
            damage: options.damage || 2.0,
            radius: options.radius || 22,
            image: options.image || berserkerImage,
            name: options.name || 'Berserker',
            specialAbility: new Berserk()
        });
        this.passiveAbility = new BerserkerBloodrush();
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

class Demoman extends Character {
    constructor(options = {}) {
        const demoImage = new Image();
        demoImage.src = 'sprites/demo.png';

        super({
            ...options,
            speed: options.speed || 5.5,
            maxHP: options.maxHP || 150,
            damage: options.damage || 1.35,
            radius: options.radius || 24,
            image: options.image || demoImage,
            name: options.name || 'Demoman',
            specialAbility: new DemomanSatchel()
        });
        this.passiveAbility = new DemomanMomentum();
    }
}

class Reaver extends Character {
    constructor(options = {}) {
        const reaverImage = new Image();
        reaverImage.src = 'sprites/reaver.png';

        super({
            ...options,
            speed: options.speed || 5.8,
            maxHP: options.maxHP || 125,
            damage: options.damage || 1.0,
            radius: options.radius || 22,
            image: options.image || reaverImage,
            name: options.name || 'Reaver',
            specialAbility: new ReaverShards()
        });
        this.passiveAbility = new ReaverArcPassive();
    }
}

class Waffle extends Character {
    constructor(options = {}) {
        const waffleImage = new Image();
        waffleImage.src = 'sprites/waffle.png';

        super({
            ...options,
            speed: options.speed || 5.4,
            maxHP: options.maxHP || 120,
            damage: options.damage || 1.0,
            radius: options.radius || 22,
            image: options.image || waffleImage,
            name: options.name || 'Waffle'
        });
        this.specialAbility = new WaffleDroneAbility();
        this.passiveAbility = new WaffleSiliconeSkin();
        this.passiveAbility.onRespawn(this);
    }
}

module.exports = {
    Character,
    Ninja,
    King,
    Berserker,
    Demoman,
    Reaver,
    Waffle
}
