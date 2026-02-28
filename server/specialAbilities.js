const { Shield, AutoTurret } = require('./obstacle');
const { GrenadeProjectile, DemoExplosive } = require('./grenade');
const { Bullet } = require('./bullet');

function emitHealingCombatText(gameState, character, amount) {
    if (!gameState?.io || !character?.id || amount <= 0) return;
    gameState.io.to(character.id).emit('combatText', {
        type: 'healing',
        amount,
        x: character.x,
        y: character.y - character.radius - 10
    });
}

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

class PassiveAbility {
    constructor(options = {}) {
        this.name = options.name || 'Passive';
        this.description = options.description || '';
        this.key = options.key || 'Passive';
        this.keyCode = options.keyCode ?? null;
        this.cooldown = options.cooldown ?? 0;
        this.currentCooldown = 0;
        this.duration = options.duration ?? 0;
        this.currentDuration = 0;
        this.isActive = false;
    }

    update(deltaTime, character, gameState) {
        if (this.currentCooldown > 0) {
            this.currentCooldown = Math.max(0, this.currentCooldown - deltaTime);
        }

        if (this.isActive && this.duration > 0) {
            this.currentDuration = Math.max(0, this.currentDuration - deltaTime);
            if (this.currentDuration <= 0) {
                this.isActive = false;
                this.onEnd(character, gameState);
            }
        }

        this.onUpdate(deltaTime, character, gameState);
    }

    canTrigger() {
        return this.currentCooldown <= 0;
    }

    activate() {
        this.isActive = true;
        this.currentDuration = this.duration;
    }

    startCooldown() {
        this.currentCooldown = this.cooldown;
    }

    onUpdate(deltaTime, character, gameState) {
        // override as needed
    }

    onKill(character, victim, gameState) {
        // override as needed
    }

    onDamageDealt(character, damageAmount, target, gameState) {
        return 0;
    }

    onRespawn(character, gameState) {
        // override as needed
    }

    onEnd(character, gameState) {
        // override as needed
    }
}

class NinjaMomentum extends PassiveAbility {
    constructor(options = {}) {
        super({
            name: 'Unrelenting',
            key: 'Passive',
            cooldown: 0,
            duration: 125,
            description: 'Kill: +5% permanent speed (max 10 stacks). Also gain +20% speed for 5s after each kill as well as immediate healing.',
            ...options
        });
        this.maxStacks = 10;
        this.stackBonus = 0.05;
        this.tempBonus = 0.2;
        this.stacks = 0;
    }

    updateSpeedBuff(character) {
        const stackMultiplier = this.stacks * this.stackBonus;
        const tempMultiplier = this.isActive ? this.tempBonus : 0;
        character.passiveSpeedBonus = 1 + stackMultiplier + tempMultiplier;
    }

    onKill(character, victim, gameState) {
        const hpBefore = character.HP;
        this.stacks = Math.min(this.maxStacks, this.stacks + 1);
        this.activate();
        this.updateSpeedBuff(character);
        character.HP = Math.min(character.HP + 50, character.maxHP * 2);
        const healedAmount = Math.max(0, character.HP - hpBefore);
        emitHealingCombatText(gameState, character, healedAmount);
    }

    onUpdate(deltaTime, character) {
        this.updateSpeedBuff(character);
    }

    onEnd(character) {
        this.updateSpeedBuff(character);
    }

    onRespawn(character) {
        this.updateSpeedBuff(character);
    }
}

class BerserkerBloodrush extends PassiveAbility {
    constructor(options = {}) {
        super({
            name: 'Bloodrush',
            key: 'Passive',
            cooldown: 750,
            duration: 150,
            description: 'Below 40% HP: gain 40% lifesteal for 6s. 30s cooldown.',
            ...options
        });
        this.triggerThreshold = 0.4;
        this.lifestealAmount = 0.4;
    }

    onUpdate(deltaTime, character) {
        if (this.isActive || !this.canTrigger()) return;
        if (character.maxHP <= 0) return;
        if (character.HP / character.maxHP > this.triggerThreshold) return;

        this.activate();
        this.startCooldown();
    }

    onDamageDealt(character, damageAmount) {
        if (!this.isActive || damageAmount <= 0) return 0;
        const previousHP = character.HP;
        character.HP = Math.min(character.maxHP, character.HP + damageAmount * this.lifestealAmount);
        return Math.max(0, character.HP - previousHP);
    }
}

class KingGoldenDomain extends PassiveAbility {
    constructor(options = {}) {
        super({
            name: 'Golden Domain',
            key: 'Z',
            keyCode: 90,
            cooldown: 0,
            duration: 0,
            description: 'Press Z to toggle. While active, emits a golden aura every 5s that slows nearby enemies by 25%.',
            ...options
        });
        this.isToggledOn = false;
        this.pulseInterval = 75;
        this.pulseTimer = this.pulseInterval;
        this.auraRadius = 260;
        this.slowDuration = 125;
        this.slowMultiplier = 0.70;
        this.visualPulseDuration = 20;
    }

    toggle() {
        this.isToggledOn = !this.isToggledOn;
        this.isActive = this.isToggledOn;
        if (this.isToggledOn) {
            this.pulseTimer = 0;
        }
        return this.isToggledOn;
    }

    onUpdate(deltaTime, character, gameState) {
        this.isActive = this.isToggledOn;
        if (!this.isToggledOn || !gameState?.players) return;

        this.pulseTimer -= deltaTime;
        if (this.pulseTimer > 0) return;

        this.pulseTimer = this.pulseInterval;
        character.kingAuraPulseTimer = this.visualPulseDuration;
        if (gameState?.io && character?.id) {
            gameState.io.to(character.id).emit('kingAuraPulse');
        }

        for (const target of gameState.players) {
            if (!target || target.id === character.id) continue;
            const dx = target.x - character.x;
            const dy = target.y - character.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > this.auraRadius) continue;
            target.kingAuraSlowTimer = Math.max(target.kingAuraSlowTimer || 0, this.slowDuration);
            target.kingAuraSlowMultiplier = this.slowMultiplier;
        }
    }

    onRespawn(character) {
        this.isToggledOn = false;
        this.isActive = false;
        this.pulseTimer = this.pulseInterval;
        character.kingAuraPulseTimer = 0;
    }
}

class DemomanMomentum extends PassiveAbility {
    constructor(options = {}) {
        super({
            name: 'Blast Runner',
            key: 'Passive',
            cooldown: 0,
            duration: 120,
            description: 'Getting pushed by force grants a decaying movement speed boost.',
            ...options
        });
        this.maxBonus = 1;
        this.currentBonus = 0;
    }

    onForceApplied(character, magnitude) {
        const gained = Math.min(this.maxBonus, Math.max(0.55, magnitude / 28));
        this.currentBonus = Math.max(this.currentBonus, gained);
        this.activate();
    }

    onUpdate(deltaTime, character) {
        if (!this.isActive || this.duration <= 0) {
            character.passiveSpeedBonus = 1;
            return;
        }
        const decay = Math.max(0, this.currentDuration / this.duration);
        character.passiveSpeedBonus = 1 + this.currentBonus * decay;
    }

    onEnd(character) {
        this.currentBonus = 0;
        character.passiveSpeedBonus = 1;
    }

    onRespawn(character) {
        this.currentBonus = 0;
        character.passiveSpeedBonus = 1;
    }
}

class DemomanSatchel extends SpecialAbility {
    constructor(options = {}) {
        super({
            name: 'Satchel',
            cooldown: 150,
            duration: 0,
            ...options
        });
        this.maxCharges = options.maxCharges || 5;
        this.charges = this.maxCharges;
        this.chargeRegenInterval = options.chargeRegenInterval || 150;
        this.chargeRegenTimer = 0;
        this.maxThrowCharge = options.maxThrowCharge || 30;
        this.maxLaunchSpeed = options.maxLaunchSpeed || 68;
        this.minLaunchSpeed = options.minLaunchSpeed || 0;
        this.maxPlaced = options.maxPlaced || 5;
        this.isChargeBased = true;
        this.holdToFire = true;
    }

    initiate(character, gameState) {
        if (this.charges <= 0) return false;
        if (!gameState?.grenades) return false;

        this.charges -= 1;
        if (this.charges < this.maxCharges && this.chargeRegenTimer <= 0) {
            this.chargeRegenTimer = 0.01;
        }
        const holdTime = Math.max(0, character.specialAbilityHoldTime || 0);
        const holdRatio = Math.max(0, Math.min(1, holdTime / this.maxThrowCharge));
        const launchSpeed = this.minLaunchSpeed + (this.maxLaunchSpeed - this.minLaunchSpeed) * holdRatio;

        const spawnOffset = character.radius + 16;
        const explosive = new DemoExplosive({
            x: character.x + Math.cos(character.angle) * spawnOffset,
            y: character.y + Math.sin(character.angle) * spawnOffset,
            angle: character.angle,
            ownerId: character.id,
            velocityX: Math.cos(character.angle) * launchSpeed,
            velocityY: Math.sin(character.angle) * launchSpeed
        });

        const ownedExplosives = gameState.grenades.filter((g) => g.kind === 'demoExplosive' && g.ownerId === character.id);
        if (ownedExplosives.length >= this.maxPlaced) {
            ownedExplosives.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
            ownedExplosives[0].destroy(gameState);
        }

        gameState.grenades.push(explosive);
        return true;
    }

    update(deltaTime, character, gameState) {
        if (this.charges >= this.maxCharges) {
            this.chargeRegenTimer = 0;
            this.currentCooldown = 0;
            return;
        }
        this.chargeRegenTimer += deltaTime;
        this.currentCooldown = Math.max(0, this.chargeRegenInterval - this.chargeRegenTimer);
        while (this.chargeRegenTimer >= this.chargeRegenInterval && this.charges < this.maxCharges) {
            this.chargeRegenTimer -= this.chargeRegenInterval;
            this.charges += 1;
            this.currentCooldown = this.charges >= this.maxCharges
                ? 0
                : Math.max(0, this.chargeRegenInterval - this.chargeRegenTimer);
        }
    }

    detonateAll(character, gameState, io) {
        if (!gameState?.grenades) return false;
        const explosives = [...gameState.grenades].filter((g) => g.kind === 'demoExplosive' && g.ownerId === character.id);
        if (explosives.length === 0) return false;
        for (const explosive of explosives) {
            explosive.detonate(gameState, io);
        }
        return true;
    }

    onRespawn() {
        this.charges = this.maxCharges;
        this.chargeRegenTimer = 0;
        this.currentCooldown = 0;
    }
}

class ReaverArcPassive extends PassiveAbility {
    constructor(options = {}) {
        super({
            name: 'Arc Surge',
            key: 'Z',
            keyCode: 90,
            cooldown: 30,
            duration: 75,
            description: 'Press Z to zap nearby enemies with 3 Reaver stacks, stunning and damaging them while boosting movement speed.',
            ...options
        });
        this.range = options.range || 300;
        this.damage = options.damage || 5;
        this.stunDuration = options.stunDuration || 25;
        this.speedPerZap = options.speedPerZap || 0.08;
        this.maxBonus = options.maxBonus || 0.4;
        this.bonus = 0;
    }

    onUpdate(deltaTime, character, gameState) {
        if (!gameState?.players) return;

        const now = Date.now();
        character.reaverBolts = (character.reaverBolts || []).filter((bolt) => bolt.expiresAt > now);

        if (this.isActive && this.duration > 0) {
            const decay = Math.max(0, this.currentDuration / this.duration);
            character.passiveSpeedBonus = 1 + this.bonus * decay;
        } else if (character.passiveSpeedBonus !== 1) {
            character.passiveSpeedBonus = 1;
            this.bonus = 0;
        }
    }

    activateZap(character, gameState) {
        if (!this.canTrigger() || !gameState?.players) return false;

        const now = Date.now();
        const targets = gameState.players.filter((target) => {
            if (!target || target.id === character.id) return false;
            if (
                gameState.gameMode === '2v2' &&
                character.team &&
                target.team &&
                character.team === target.team
            ) {
                return false;
            }
            if ((target.reaverStacks || 0) < 3) return false;
            const dx = target.x - character.x;
            const dy = target.y - character.y;
            return Math.sqrt(dx * dx + dy * dy) <= this.range;
        });

        if (targets.length === 0) return false;

        for (const target of targets) {
            const hpBefore = target.HP;
            target.takeDamage(this.damage, character.id);
            target.flashingTimer = 1;
            target.stunnedTimer = Math.max(target.stunnedTimer || 0, this.stunDuration);
            target.reaverStackTimers = [];
            target.reaverStacks = 0;
            target.reaverStackDecayTimer = 0;
            this.bonus = Math.min(this.maxBonus, this.bonus + this.speedPerZap);

            character.reaverBolts.push({
                targetX: target.x,
                targetY: target.y,
                expiresAt: now + 220
            });

            const damageDealt = Math.max(0, hpBefore - target.HP);
            if (damageDealt > 0 && gameState?.io) {
                gameState.io.to(character.id).emit('combatText', {
                    type: 'damage',
                    amount: damageDealt,
                    x: target.x,
                    y: target.y - target.radius - 10
                });
            }
        }

        this.activate();
        this.startCooldown();
        if (gameState?.io && character?.id) {
            gameState.io.to(character.id).emit('reaverZap');
        }
        return true;
    }

    onEnd(character) {
        this.bonus = 0;
        character.passiveSpeedBonus = 1;
    }

    onRespawn(character) {
        this.bonus = 0;
        character.passiveSpeedBonus = 1;
        character.reaverBolts = [];
    }
}

class ReaverShards extends SpecialAbility {
    constructor(options = {}) {
        super({
            name: 'Reaver Shard',
            cooldown: 62.5,
            duration: 0,
            ...options
        });
        this.maxCharges = options.maxCharges || 3;
        this.charges = this.maxCharges;
        this.chargeRegenInterval = options.chargeRegenInterval || 62.5;
        this.chargeRegenTimer = 0;
        this.isChargeBased = true;
        this.holdToFire = false;
        this.projectileSpeed = options.projectileSpeed || 28;
        this.projectileRange = options.projectileRange || 950;
    }

    initiate(character, gameState) {
        if (this.charges <= 0) return false;
        if (!gameState?.bullets) return false;

        this.charges -= 1;
        
        if (this.charges < this.maxCharges && this.chargeRegenTimer <= 0) {
            this.chargeRegenTimer = 0.01;
        }

        const lifetime = this.projectileRange / this.projectileSpeed;
        const shard = new Bullet({
            x: character.x,
            y: character.y,
            speed: this.projectileSpeed,
            angle: character.angle,
            damage: 0,
            radius: 12,
            color: '#b35cff',
            playerId: character.id,
            lifetime,
            kind: 'reaverShard'
        });
        gameState.bullets.push(shard);
        return true;
    }

    update(deltaTime) {
        if (this.charges >= this.maxCharges) {
            this.chargeRegenTimer = 0;
            this.currentCooldown = 0;
            return;
        }
        this.chargeRegenTimer += deltaTime;
        this.currentCooldown = Math.max(0, this.chargeRegenInterval - this.chargeRegenTimer);
        while (this.chargeRegenTimer >= this.chargeRegenInterval && this.charges < this.maxCharges) {
            this.chargeRegenTimer -= this.chargeRegenInterval;
            this.charges += 1;
            this.currentCooldown = this.charges >= this.maxCharges
                ? 0
                : Math.max(0, this.chargeRegenInterval - this.chargeRegenTimer);
        }
    }

    onRespawn() {
        this.charges = this.maxCharges;
        this.chargeRegenTimer = 0;
        this.currentCooldown = 0;
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

    onStart(character, gameState) {
        this.originalRadius = character.radius;
        this.originalMaxHP = character.maxHP;
        this.originalDefense = character.defense ?? 1;
        const hpBefore = character.HP;

        character.radius = this.originalRadius * this.radiusMultiplier;
        character.maxHP = this.originalMaxHP * this.healthMultiplier;
        character.HP = Math.min(character.HP * 1.5 + 100, character.maxHP);
        const healedAmount = Math.max(0, character.HP - hpBefore);
        emitHealingCombatText(gameState, character, healedAmount);
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

class TurretAbility extends SpecialAbility {
    constructor(options = {}) {
        super({
            name: 'Auto Turret',
            cooldown: 360,
            duration: 0,
            ...options
        });
    }

    onStart(character, gameState) {
        if (!gameState?.obstacles) return;

        const turretSize = 36;
        const turret = new AutoTurret({
            x: character.x,
            y: character.y,
            w: turretSize,
            h: turretSize,
            ownerId: character.id,
            health: 110,
            duration: 750
        });

        gameState.obstacles.push(turret);
    }
}

class HealingCircle extends SpecialAbility {
    constructor(options = {}) {
        super({
            name: 'Healing Circle',
            cooldown: 360,
            duration: 150,
            ...options
        });
        this.healPerSecondRatio = options.healPerSecondRatio ?? 0.05;
        this.effectRadius = options.effectRadius ?? 165;
        this.effectX = null;
        this.effectY = null;
        this.healTextTimer = 0;
        this.healTextInterval = options.healTextInterval ?? 10;
        this.pendingHealText = 0;
    }

    onStart(character) {
        this.effectX = character.x;
        this.effectY = character.y;
        this.healTextTimer = 0;
        this.pendingHealText = 0;
    }

    update(deltaTime, character, gameState) {
        if (this.isActive) {
            const dx = character.x - (this.effectX ?? character.x);
            const dy = character.y - (this.effectY ?? character.y);
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= this.effectRadius) {
                const hpBefore = character.HP;
                const healAmount = character.maxHP * this.healPerSecondRatio * (deltaTime / 25);
                if(character.HP < character.maxHP) character.HP = Math.min(character.maxHP, character.HP + healAmount);
                this.pendingHealText += Math.max(0, character.HP - hpBefore);
            }

            this.healTextTimer += deltaTime;
            if (this.healTextTimer >= this.healTextInterval) {
                emitHealingCombatText(gameState, character, this.pendingHealText);
                this.pendingHealText = 0;
                this.healTextTimer = 0;
            }

            this.currentDuration -= deltaTime;
            if (this.currentDuration <= 0) {
                this.isActive = false;
                this.currentDuration = 0;
                emitHealingCombatText(gameState, character, this.pendingHealText);
                this.pendingHealText = 0;
                this.onEnd(character, gameState);
            }
        } else {
            this.currentCooldown -= deltaTime;
        }
    }

    onEnd() {
        this.effectX = null;
        this.effectY = null;
        this.healTextTimer = 0;
        this.pendingHealText = 0;
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

module.exports = {
    SpecialAbility,
    PassiveAbility,
    NinjaMomentum,
    BerserkerBloodrush,
    KingGoldenDomain,
    DemomanMomentum,
    DemomanSatchel,
    ReaverArcPassive,
    ReaverShards,
    Dash,
    Enlarge,
    Berserk,
    Grenade,
    Invisibility,
    ShieldBarrier,
    TurretAbility,
    HealingCircle
};
