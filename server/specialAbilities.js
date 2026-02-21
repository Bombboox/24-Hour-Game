const { Shield } = require('./obstacle');
const { GrenadeProjectile } = require('./grenade');

class SpecialAbility {
    constructor(options = {}) {
        this.name = options.name;
        this.cooldown = options.cooldown;
        this.currentCooldown = 0;
        this.duration = options.duration;
        this.currentDuration = 0;
        this.isActive = false;
        this.gameState = options.gameState ?? null;
    }

    initiate(character, gameState) {
        if(this.currentCooldown > 0) return false;

        this.isActive = true;
        this.currentCooldown = this.cooldown;
        this.currentDuration = this.duration;
        this.onStart(character, gameState);
        return true;
    }

    update(deltaTime, character, gameState) {
        if(this.isActive) {
            this.onUpdate(character);
            this.currentDuration -= deltaTime;
            if(this.currentDuration <= 0) {
                this.isActive = false;
                this.onEnd(character, gameState);
            }
        } else {
            this.currentCooldown -= deltaTime;
        }
    }

    onStart(character) {
        // override this :3
    }

    onEnd(character) {
        // override this :3
    }

    onUpdate(character) {
        // override this :3
    }

    cancel(character, gameState) {
        if (!this.isActive) return false;
        this.isActive = false;
        this.currentDuration = 0;
        this.onEnd(character, gameState);
        return true;
    }
}

class Dash extends SpecialAbility {
    constructor(options = {}) {
        super({
            name: "Dash",
            cooldown: 50,
            duration: 50,
            ...options
        })
        this.originalSpeed = null;
        this.maxSpeedMultiplier = 2.2;
    }

    onStart(character) {
        this.originalSpeed = character.speed;
        character.speed = this.originalSpeed * this.maxSpeedMultiplier;
        character.dashing = true;
    }

    onUpdate(character) {
        const decayFactor = this.currentDuration / this.duration;
        const currentMultiplier = 1 + (this.maxSpeedMultiplier - 1) * decayFactor;
        character.speed = this.originalSpeed * currentMultiplier;
    }

    onEnd(character) {
        character.speed = this.originalSpeed;
        character.dashing = false;
    }
}

class Enlarge extends SpecialAbility {
    constructor(options = {}) {
        super({
            name: "Enlarge",
            cooldown: 500,
            duration: 150,
            ...options
        });
        this.originalRadius = null;
        this.originalMaxHP = null;
        this.originalDefense = null;
        this.radiusMultiplier = 1.4;
        this.healthMultiplier = 1.5;
    }

    onStart(character) {
        this.originalRadius = character.radius;
        this.originalMaxHP = character.maxHP;
        this.originalDefense = character.defense ?? 1;

        character.radius = this.originalRadius * this.radiusMultiplier;
        character.maxHP = this.originalMaxHP * this.healthMultiplier;
        character.HP = Math.min(character.HP * 1.5 + 100, character.maxHP);
        character.enlarged = true;
        character.defense = 0.5;
    }

    onEnd(character) {
        character.radius = this.originalRadius;
        character.maxHP = this.originalMaxHP;
        character.HP = Math.min(character.HP, character.maxHP);
        character.enlarged = false;
        character.defense = this.originalDefense;
    }
}

class Berserk extends SpecialAbility {
    constructor(options = {}) {
        super({
            name: "Berserk",
            cooldown: 500,
            duration: 150,
            ...options
        });
        this.originalDamage = null;
        this.originalFireCooldown = null;
        this.damageMultiplier = 1.2;
        this.fireCooldownMultiplier = 0.5;
    }

    onStart(character) {
        if (character.primaryWeapon) {
            this.originalDamage = character.primaryWeapon.damage;
            this.originalFireCooldown = character.primaryWeapon.fireCooldown;
            
            character.primaryWeapon.damage = this.originalDamage * this.damageMultiplier;
            character.primaryWeapon.fireCooldown = this.originalFireCooldown * this.fireCooldownMultiplier;
            character.primaryWeapon.ammo = 9999;
        }
        if (character.secondaryWeapon) {
            this.originalSecondaryDamage = character.secondaryWeapon.damage;
            this.originalSecondaryFireCooldown = character.secondaryWeapon.fireCooldown;

            character.secondaryWeapon.damage = this.originalSecondaryDamage * this.damageMultiplier;
            character.secondaryWeapon.fireCooldown = this.originalSecondaryFireCooldown * this.fireCooldownMultiplier;
            character.secondaryWeapon.ammo = 9999;
        }
        character.berserked = true;
    }

    onEnd(character) {
        if (character.primaryWeapon && this.originalDamage !== null && this.originalFireCooldown !== null) {
            character.primaryWeapon.damage = this.originalDamage;
            character.primaryWeapon.fireCooldown = this.originalFireCooldown;
            character.primaryWeapon.ammo = character.primaryWeapon.maxAmmo;
        }
        if (character.secondaryWeapon && this.originalSecondaryDamage !== undefined && this.originalSecondaryFireCooldown !== undefined) {
            character.secondaryWeapon.damage = this.originalSecondaryDamage;
            character.secondaryWeapon.fireCooldown = this.originalSecondaryFireCooldown;
            character.secondaryWeapon.ammo = character.secondaryWeapon.maxAmmo;
        }
        character.berserked = false;
    }
}

class ShieldAbility extends SpecialAbility {
    constructor(options = {}) {
        super({
            name: "Shield",
            cooldown: 500,
            duration: 450,
            ...options
        });
        this.shield = null;
    }

    onStart(character, gameState) {
        this.shield = new Shield({
            x: character.x,
            y: character.y,
            w: character.radius * 2,
            h: character.radius * 2 * (40/12),
            angle: character.angle,
            color: "blue"
        });
        
        if (gameState && gameState.obstacles) {
            gameState.obstacles.push(this.shield);
        }
    }

    onEnd(character, gameState) {
        if (this.shield && gameState && gameState.obstacles) {
            const index = gameState.obstacles.indexOf(this.shield);
            if (index > -1) {
                gameState.obstacles.splice(index, 1);
            }
        }
        this.shield = null;
    }
}

class Grenade extends SpecialAbility {
    constructor(options = {}) {
        super({
            name: "Grenade",
            cooldown: 180,
            duration: 0,
            ...options
        });
        this.initialSpeed = options.initialSpeed ?? 16.5;
        this.acceleration = options.acceleration ?? 2.25;
        this.accelerationTime = options.accelerationTime ?? 18;
        this.spinSpeed = options.spinSpeed ?? 0.45;
    }

    onStart(character, gameState) {
        if (!gameState?.grenades) return;

        const spawnOffset = character.radius + 16;
        const grenade = new GrenadeProjectile({
            x: character.x + Math.cos(character.angle) * spawnOffset,
            y: character.y + Math.sin(character.angle) * spawnOffset,
            angle: character.angle,
            ownerId: character.id,
            velocityX: Math.cos(character.angle) * this.initialSpeed,
            velocityY: Math.sin(character.angle) * this.initialSpeed,
            acceleration: this.acceleration,
            accelerationTime: this.accelerationTime,
            angularVelocity: this.spinSpeed
        });

        gameState.grenades.push(grenade);
    }
}

class ShieldBarrier extends SpecialAbility {
    constructor(options = {}) {
        super({
            name: "Shield",
            cooldown: 360,
            duration: 0,
            ...options
        });
    }

    onStart(character, gameState) {
        if (!gameState?.obstacles) return;

        const spawnOffset = character.radius + 20;
        const shieldX = character.x + Math.cos(character.angle) * spawnOffset;
        const shieldY = character.y + Math.sin(character.angle) * spawnOffset;

        const shieldSize = 50;

        const shield = new Shield({
            x: shieldX,
            y: shieldY,
            w: shieldSize,
            h: shieldSize * 10/3,
            angle: character.angle,
            color: 'rgba(50, 180, 255, 0.25)',
            ownerId: character.id,
            health: 120,
            duration: 750
        });

        gameState.obstacles.push(shield);
    }
}

class Invisibility extends SpecialAbility {
    constructor(options = {}) {
        super({
            name: "Invisibility",
            cooldown: 260,
            duration: 250,
            ...options
        });
    }

    onStart(character) {
        character.invisible = true;
        character.opacity = 0;
    }

    onEnd(character) {
        character.invisible = false;
        character.opacity = 1;
    }
}

module.exports = { SpecialAbility, Dash, Enlarge, Berserk, Grenade, Invisibility, ShieldBarrier };
