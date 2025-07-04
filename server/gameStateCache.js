const msgpack = require('msgpack-lite');

class GameStateCache {
    constructor() {
        this.previousState = null;
        this.frameNumber = 0;
    }

    // Deep clone an object for comparison
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

    // Serialize game state to a simple object structure
    serializeGameState(gameState) {
        return {
            players: gameState.players.map(player => ({
                id: player.id,
                x: Math.round(player.x * 100) / 100, // Round to 2 decimal places
                y: Math.round(player.y * 100) / 100,
                angle: Math.round(player.angle * 1000) / 1000, // Round to 3 decimal places
                HP: Math.round(player.HP),
                maxHP: player.maxHP,
                radius: player.radius,
                name: player.name,
                kills: player.kills,
                flashingTimer: Math.round(player.flashingTimer * 100) / 100,
                enlarged: player.enlarged || false,
                berserked: player.berserked || false,
                dashing: player.dashing || false,
                primaryWeapon: {
                    ammo: player.primaryWeapon?.ammo || 0,
                    maxAmmo: player.primaryWeapon?.maxAmmo || 0,
                    isReloading: player.primaryWeapon?.isReloading || false,
                    name: player.primaryWeapon?.name || 'Weapon'
                },
                specialAbility: player.specialAbility ? {
                    name: player.specialAbility.name,
                    currentCooldown: Math.round(player.specialAbility.currentCooldown * 100) / 100,
                    cooldown: player.specialAbility.cooldown,
                    isActive: player.specialAbility.isActive || false
                } : null
            })),
            bullets: gameState.bullets.map(bullet => ({
                id: bullet.id || `${bullet.playerId}_${bullet.x}_${bullet.y}`,
                x: Math.round(bullet.x * 100) / 100,
                y: Math.round(bullet.y * 100) / 100,
                radius: bullet.radius,
                color: bullet.color,
                playerId: bullet.playerId,
                active: bullet.active
            })),
            obstacles: gameState.obstacles.map(obstacle => ({
                id: obstacle.id || `${obstacle.x}_${obstacle.y}_${obstacle.w}_${obstacle.h}`,
                x: obstacle.x,
                y: obstacle.y,
                w: obstacle.w,
                h: obstacle.h,
                color: obstacle.color
            })),
            gameMode: gameState.gameMode || '1v1',
            frameNumber: ++this.frameNumber
        };
    }

    // Compare two serialized states and return only the differences
    getDeltaChanges(currentState, previousState) {
        if (!previousState) {
            return currentState; // First frame, send everything
        }

        const delta = {
            frameNumber: currentState.frameNumber,
            gameMode: currentState.gameMode,
            players: [],
            bullets: [],
            obstacles: [],
            removedBullets: [],
            removedObstacles: []
        };

        // Compare players
        const currentPlayers = new Map(currentState.players.map(p => [p.id, p]));
        const previousPlayers = new Map(previousState.players.map(p => [p.id, p]));

        // Check for new or changed players
        for (const [id, currentPlayer] of currentPlayers) {
            const previousPlayer = previousPlayers.get(id);
            if (!previousPlayer || this.hasPlayerChanged(currentPlayer, previousPlayer)) {
                delta.players.push(currentPlayer);
            }
        }

        // Check for removed players
        for (const [id, previousPlayer] of previousPlayers) {
            if (!currentPlayers.has(id)) {
                delta.players.push({ id, removed: true });
            }
        }

        // Compare bullets
        const currentBullets = new Map(currentState.bullets.map(b => [b.id, b]));
        const previousBullets = new Map(previousState.bullets.map(b => [b.id, b]));

        // Check for new or changed bullets
        for (const [id, currentBullet] of currentBullets) {
            const previousBullet = previousBullets.get(id);
            if (!previousBullet || this.hasBulletChanged(currentBullet, previousBullet)) {
                delta.bullets.push(currentBullet);
            }
        }

        // Check for removed bullets
        for (const [id, previousBullet] of previousBullets) {
            if (!currentBullets.has(id)) {
                delta.removedBullets.push(id);
            }
        }

        // Compare obstacles (usually static, but check for changes)
        const currentObstacles = new Map(currentState.obstacles.map(o => [o.id, o]));
        const previousObstacles = new Map(previousState.obstacles.map(o => [o.id, o]));

        // Check for new or changed obstacles
        for (const [id, currentObstacle] of currentObstacles) {
            const previousObstacle = previousObstacles.get(id);
            if (!previousObstacle || this.hasObstacleChanged(currentObstacle, previousObstacle)) {
                delta.obstacles.push(currentObstacle);
            }
        }

        // Check for removed obstacles
        for (const [id, previousObstacle] of previousObstacles) {
            if (!currentObstacles.has(id)) {
                delta.removedObstacles.push(id);
            }
        }

        // Only return delta if there are actual changes
        const hasChanges = delta.players.length > 0 || 
                          delta.bullets.length > 0 || 
                          delta.obstacles.length > 0 ||
                          delta.removedBullets.length > 0 ||
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
               current.kills !== previous.kills ||
               current.primaryWeapon.ammo !== previous.primaryWeapon.ammo ||
               current.primaryWeapon.isReloading !== previous.primaryWeapon.isReloading ||
               (current.specialAbility && previous.specialAbility && 
                current.specialAbility.currentCooldown !== previous.specialAbility.currentCooldown) ||
               (current.specialAbility && !previous.specialAbility) ||
               (!current.specialAbility && previous.specialAbility);
    }

    hasBulletChanged(current, previous) {
        return current.x !== previous.x ||
               current.y !== previous.y ||
               current.active !== previous.active;
    }

    hasObstacleChanged(current, previous) {
        return current.x !== previous.x ||
               current.y !== previous.y ||
               current.w !== previous.w ||
               current.h !== previous.h ||
               current.color !== previous.color;
    }

    // Update the cached state and return delta changes
    updateAndGetDelta(gameState) {
        const serializedState = this.serializeGameState(gameState);
        const delta = this.getDeltaChanges(serializedState, this.previousState);
        
        if (delta) {
            this.previousState = this.deepClone(serializedState);
        }
        
        return delta;
    }

    // Reset cache (useful when game state changes significantly)
    reset() {
        this.previousState = null;
        this.frameNumber = 0;
    }
}

module.exports = {
    GameStateCache
}; 