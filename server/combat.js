function getCombatTextPosition(target) {
    if (!target) {
        return { x: 0, y: 0 };
    }

    return {
        x: target.x || 0,
        y: (target.y || 0) - (target.radius || 0) - 10
    };
}

function emitCombatText(gameState, recipientId, type, amount, target) {
    if (!gameState?.io || !recipientId || amount <= 0) {
        return;
    }

    const { x, y } = getCombatTextPosition(target);
    gameState.io.to(recipientId).emit('combatText', {
        type: type === 'healing' ? 'healing' : 'damage',
        amount,
        x,
        y
    });
}

function applyHealing({
    gameState,
    target,
    amount,
    recipientId,
    maxHpCap,
    emitText = true
}) {
    if (!target || amount <= 0) {
        return 0;
    }

    const hpBefore = target.HP;
    const healCap = Number.isFinite(maxHpCap) ? maxHpCap : target.maxHP;
    target.HP = Math.min(healCap, target.HP + amount);
    const healedAmount = Math.max(0, target.HP - hpBefore);

    if (healedAmount > 0 && emitText) {
        emitCombatText(gameState, recipientId || target.id, 'healing', healedAmount, target);
    }

    return healedAmount;
}

function triggerOnDamageDealtHealing(gameState, attacker, damageDealt, target) {
    if (!attacker?.passiveAbility || damageDealt <= 0) {
        return 0;
    }

    const healedAmount = attacker.passiveAbility.onDamageDealt(attacker, damageDealt, target, gameState) || 0;
    if (healedAmount > 0) {
        emitCombatText(gameState, attacker.id, 'healing', healedAmount, attacker);
    }
    return healedAmount;
}

function applyDamage({
    gameState,
    target,
    amount,
    sourceId = null,
    attacker = null,
    emitText = true,
    emitHitAudio = false,
    applyPassiveHealing = true,
    flashTarget = true
}) {
    if (!target || amount <= 0) {
        return 0;
    }

    const hpBefore = target.HP;
    target.takeDamage(amount, sourceId, gameState);
    const damageDealt = Math.max(0, hpBefore - target.HP);

    if (damageDealt <= 0) {
        return 0;
    }

    if (flashTarget) {
        target.flashingTimer = 1;
    }

    if (emitHitAudio && gameState?.io) {
        if (sourceId) {
            gameState.io.to(sourceId).emit('hit');
        }
        if (target.id) {
            gameState.io.to(target.id).emit('gotHit');
        }
    }

    if (emitText && sourceId) {
        emitCombatText(gameState, sourceId, 'damage', damageDealt, target);
    }

    if (applyPassiveHealing) {
        triggerOnDamageDealtHealing(gameState, attacker, damageDealt, target);
    }

    return damageDealt;
}

module.exports = {
    emitCombatText,
    applyHealing,
    applyDamage,
    triggerOnDamageDealtHealing
};
