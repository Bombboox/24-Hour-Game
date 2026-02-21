const msgpack = require('msgpack-lite');

class GameStateCache {
    constructor() {
        this.previousState = null;
        this.frameNumber = 0;
    }

    // deep clone for comparison
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (Array.isArray(obj)) return obj.map(item => this.deepClone(item));
        
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = this.deepClone(obj[key]);
            }
        }
        return cloned;
    }

    // serialize game state 
    serializeGameState(gameState) {
        return {
            players: gameState.players.map(player => ({
                id: player.id,
                x: Math.round(player.x * 100) / 100, // round to 2 decimal places
                y: Math.round(player.y * 100) / 100,
                angle: Math.round(player.angle * 1000) / 1000, // round to 3 decimal places
                HP: Math.round(player.HP),
                maxHP: player.maxHP,
                radius: player.radius,
                name: player.name,
                kills: player.kills,
                flashingTimer: Math.round(player.flashingTimer * 100) / 100,
                enlarged: player.enlarged || false,
                berserked: player.berserked || false,
                dashing: player.dashing || false,
                auraSlowed: player.auraSlowed || false,
                kingAuraPulseTimer: Math.round((player.kingAuraPulseTimer || 0) * 100) / 100,
                stunned: player.stunned || false,
                reaverStacks: player.reaverStacks || 0,
                reaverBolts: (player.reaverBolts || []).map((bolt) => ({
                    targetX: Math.round((bolt.targetX || 0) * 100) / 100,
                    targetY: Math.round((bolt.targetY || 0) * 100) / 100,
                    expiresAt: bolt.expiresAt || 0
                })),
                laserBeam: player.laserBeam ? {
                    startX: Math.round((player.laserBeam.startX || 0) * 100) / 100,
                    startY: Math.round((player.laserBeam.startY || 0) * 100) / 100,
                    endX: Math.round((player.laserBeam.endX || 0) * 100) / 100,
                    endY: Math.round((player.laserBeam.endY || 0) * 100) / 100,
                    color: player.laserBeam.color || '#3fd7ff'
                } : null,
                opacity: player.opacity,
                invisible: player.invisible || false,
                primaryWeapon: {
                    ammo: player.primaryWeapon?.ammo || 0,
                    maxAmmo: player.primaryWeapon?.maxAmmo || 0,
                    isReloading: player.primaryWeapon?.isReloading || false,
                    name: player.primaryWeapon?.name || 'Weapon'
                },
                secondaryWeapon: {
                    ammo: player.secondaryWeapon?.ammo || 0,
                    maxAmmo: player.secondaryWeapon?.maxAmmo || 0,
                    isReloading: player.secondaryWeapon?.isReloading || false,
                    name: player.secondaryWeapon?.name || 'Weapon'
                },
                specialAbility: player.specialAbility ? {
                    name: player.specialAbility.name,
                    currentCooldown: Math.round(player.specialAbility.currentCooldown * 100) / 100,
                    cooldown: player.specialAbility.cooldown,
                    isActive: player.specialAbility.isActive || false,
                    charges: player.specialAbility.charges,
                    maxCharges: player.specialAbility.maxCharges,
                    holdRatio: player.specialAbility?.isChargeBased
                        ? Math.max(0, Math.min(1, (player.specialAbilityHoldTime || 0) / (player.specialAbility.maxThrowCharge || 1)))
                        : 0
                } : null,
                sharedAbility: player.sharedAbility ? {
                    name: player.sharedAbility.name,
                    currentCooldown: Math.round(player.sharedAbility.currentCooldown * 100) / 100,
                    cooldown: player.sharedAbility.cooldown,
                    isActive: player.sharedAbility.isActive || false
                } : null,
                passiveAbility: player.passiveAbility ? {
                    name: player.passiveAbility.name,
                    description: player.passiveAbility.description || '',
                    key: player.passiveAbility.key || 'Passive',
                    duration: player.passiveAbility.duration || 0,
                    currentCooldown: Math.round((player.passiveAbility.currentCooldown || 0) * 100) / 100,
                    cooldown: player.passiveAbility.cooldown || 0,
                    isActive: player.passiveAbility.isActive || false,
                    currentDuration: Math.round((player.passiveAbility.currentDuration || 0) * 100) / 100
                } : null
            })),
            bullets: gameState.bullets.map(bullet => ({
                id: bullet.id || `${bullet.playerId}_${bullet.x}_${bullet.y}`,
                x: Math.round(bullet.x * 100) / 100,
                y: Math.round(bullet.y * 100) / 100,
                angle: Math.round((bullet.angle || 0) * 1000) / 1000,
                radius: bullet.radius,
                color: bullet.color,
                playerId: bullet.playerId,
                active: bullet.active,
                kind: bullet.kind || 'bullet'
            })),
            grenades: (gameState.grenades || []).map(grenade => ({
                id: grenade.id,
                x: Math.round(grenade.x * 100) / 100,
                y: Math.round(grenade.y * 100) / 100,
                radius: grenade.radius,
                spin: Math.round(grenade.spin * 1000) / 1000,
                active: grenade.active,
                kind: grenade.kind || 'grenade',
                ownerId: grenade.ownerId || null,
                hiddenForEnemies: grenade.hiddenForEnemies || false,
                isStationary: grenade.isStationary || false
            })),
            obstacles: gameState.obstacles.map(obstacle => ({
                id: obstacle.id || `${obstacle.x}_${obstacle.y}_${obstacle.w}_${obstacle.h}`,
                x: obstacle.x,
                y: obstacle.y,
                w: obstacle.w,
                h: obstacle.h,
                color: obstacle.color,
                health: obstacle.health,
                image: obstacle.image,
                angle: obstacle.angle
            })),
            gameMode: gameState.gameMode || '1v1',
            frameNumber: ++this.frameNumber
        };
    }

    // compare two serialized states and return only the differences
    getDeltaChanges(currentState, previousState) {
        if (!previousState) {
            return currentState; 
        }

        const delta = {
            frameNumber: currentState.frameNumber,
            gameMode: currentState.gameMode,
            players: [],
            bullets: [],
            grenades: [],
            obstacles: [],
            removedBullets: [],
            removedGrenades: [],
            removedObstacles: []
        };

        const currentPlayers = new Map(currentState.players.map(p => [p.id, p]));
        const previousPlayers = new Map(previousState.players.map(p => [p.id, p]));

        for (const [id, currentPlayer] of currentPlayers) {
            const previousPlayer = previousPlayers.get(id);
            if (!previousPlayer || this.hasPlayerChanged(currentPlayer, previousPlayer)) {
                delta.players.push(currentPlayer);
            }
        }


        for (const [id, previousPlayer] of previousPlayers) {
            if (!currentPlayers.has(id)) {
                delta.players.push({ id, removed: true });
            }
        }

        const currentBullets = new Map(currentState.bullets.map(b => [b.id, b]));
        const previousBullets = new Map(previousState.bullets.map(b => [b.id, b]));

        for (const [id, currentBullet] of currentBullets) {
            const previousBullet = previousBullets.get(id);
            if (!previousBullet || this.hasBulletChanged(currentBullet, previousBullet)) {
                delta.bullets.push(currentBullet);
            }
        }

        for (const [id, previousBullet] of previousBullets) {
            if (!currentBullets.has(id)) {
                delta.removedBullets.push(id);
            }
        }

        const currentObstacles = new Map(currentState.obstacles.map(o => [o.id, o]));
        const previousObstacles = new Map(previousState.obstacles.map(o => [o.id, o]));

        for (const [id, currentObstacle] of currentObstacles) {
            const previousObstacle = previousObstacles.get(id);
            if (!previousObstacle || this.hasObstacleChanged(currentObstacle, previousObstacle)) {
                delta.obstacles.push(currentObstacle);
            }
        }

        for (const [id, previousObstacle] of previousObstacles) {
            if (!currentObstacles.has(id)) {
                delta.removedObstacles.push(id);
            }
        }

        const currentGrenades = new Map(currentState.grenades.map(g => [g.id, g]));
        const previousGrenades = new Map(previousState.grenades.map(g => [g.id, g]));

        for (const [id, currentGrenade] of currentGrenades) {
            const previousGrenade = previousGrenades.get(id);
            if (!previousGrenade || this.hasGrenadeChanged(currentGrenade, previousGrenade)) {
                delta.grenades.push(currentGrenade);
            }
        }

        for (const [id] of previousGrenades) {
            if (!currentGrenades.has(id)) {
                delta.removedGrenades.push(id);
            }
        }

        const hasChanges = delta.players.length > 0 || 
                          delta.bullets.length > 0 || 
                          delta.grenades.length > 0 ||
                          delta.obstacles.length > 0 ||
                          delta.removedBullets.length > 0 ||
                          delta.removedGrenades.length > 0 ||
                          delta.removedObstacles.length > 0;

        return hasChanges ? delta : null;
    }

    hasPlayerChanged(current, previous) {
        return current.x !== previous.x ||
               current.y !== previous.y ||
               current.angle !== previous.angle ||
               current.HP !== previous.HP ||
               current.flashingTimer !== previous.flashingTimer ||
               current.enlarged !== previous.enlarged ||
               current.berserked !== previous.berserked ||
               current.dashing !== previous.dashing ||
               current.auraSlowed !== previous.auraSlowed ||
               current.kingAuraPulseTimer !== previous.kingAuraPulseTimer ||
               current.stunned !== previous.stunned ||
               current.reaverStacks !== previous.reaverStacks ||
               JSON.stringify(current.reaverBolts) !== JSON.stringify(previous.reaverBolts) ||
               JSON.stringify(current.laserBeam) !== JSON.stringify(previous.laserBeam) ||
               current.kills !== previous.kills ||
               current.primaryWeapon.ammo !== previous.primaryWeapon.ammo ||
               current.primaryWeapon.isReloading !== previous.primaryWeapon.isReloading ||
               current.primaryWeapon.name !== previous.primaryWeapon.name ||
               current.secondaryWeapon.name !== previous.secondaryWeapon.name ||
               (current.specialAbility && previous.specialAbility && 
                (current.specialAbility.currentCooldown !== previous.specialAbility.currentCooldown ||
                 current.specialAbility.charges !== previous.specialAbility.charges ||
                 current.specialAbility.maxCharges !== previous.specialAbility.maxCharges ||
                 current.specialAbility.holdRatio !== previous.specialAbility.holdRatio)) ||
               (current.specialAbility && !previous.specialAbility) ||
               (!current.specialAbility && previous.specialAbility) ||
               (current.sharedAbility && previous.sharedAbility && 
                current.sharedAbility.currentCooldown !== previous.sharedAbility.currentCooldown) ||
               (current.sharedAbility && !previous.sharedAbility) ||
               (!current.sharedAbility && previous.sharedAbility) ||
               (current.passiveAbility && previous.passiveAbility &&
                (current.passiveAbility.currentCooldown !== previous.passiveAbility.currentCooldown ||
                 current.passiveAbility.isActive !== previous.passiveAbility.isActive ||
                 current.passiveAbility.currentDuration !== previous.passiveAbility.currentDuration)) ||
               (current.passiveAbility && !previous.passiveAbility) ||
               (!current.passiveAbility && previous.passiveAbility) ||
               current.invisible !== previous.invisible ||
               current.opacity !== previous.opacity;
    }

    hasBulletChanged(current, previous) {
        return current.x !== previous.x ||
               current.y !== previous.y ||
               current.angle !== previous.angle ||
               current.active !== previous.active ||
               current.kind !== previous.kind;
    }

    hasGrenadeChanged(current, previous) {
        return current.x !== previous.x ||
               current.y !== previous.y ||
               current.spin !== previous.spin ||
               current.active !== previous.active ||
               current.kind !== previous.kind ||
               current.hiddenForEnemies !== previous.hiddenForEnemies ||
               current.isStationary !== previous.isStationary;
    }

    hasObstacleChanged(current, previous) {
        return current.x !== previous.x ||
               current.y !== previous.y ||
               current.w !== previous.w ||
               current.h !== previous.h ||
               current.angle !== previous.angle ||
               current.color !== previous.color ||
               current.health !== previous.health ||
               current.image !== previous.image;
    }

    updateAndGetDelta(gameState) {
        const serializedState = this.serializeGameState(gameState);
        const delta = this.getDeltaChanges(serializedState, this.previousState);
        
        if (delta) {
            this.previousState = this.deepClone(serializedState);
        }
        
        return delta;
    }

    // reset cache
    reset() {
        this.previousState = null;
        this.frameNumber = 0;
    }
}

module.exports = {
    GameStateCache
}; 
