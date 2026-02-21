function circleRectCollision(circleX, circleY, circleRadius, rect) {
    const closestX = Math.max(rect.x, Math.min(circleX, rect.x + rect.w));
    const closestY = Math.max(rect.y, Math.min(circleY, rect.y + rect.h));

    const dx = circleX - closestX;
    const dy = circleY - closestY;
    return dx * dx + dy * dy < circleRadius * circleRadius;
}

function hasRotation(rect) {
    return typeof rect?.angle === 'number';
}

function circleRotatedRectCollision(circleX, circleY, circleRadius, rect) {
    const dx = circleX - rect.x;
    const dy = circleY - rect.y;

    const cos = Math.cos(-rect.angle);
    const sin = Math.sin(-rect.angle);
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;

    const halfW = rect.w / 2;
    const halfH = rect.h / 2;

    const closestX = Math.max(-halfW, Math.min(localX, halfW));
    const closestY = Math.max(-halfH, Math.min(localY, halfH));

    const distX = localX - closestX;
    const distY = localY - closestY;
    return distX * distX + distY * distY < circleRadius * circleRadius;
}

function circleObstacleCollision(circleX, circleY, circleRadius, obstacle) {
    if (hasRotation(obstacle)) {
        return circleRotatedRectCollision(circleX, circleY, circleRadius, obstacle);
    }
    return circleRectCollision(circleX, circleY, circleRadius, obstacle);
}

function getCircleRectSeparationVector(circleX, circleY, circleRadius, rect) {
    const closestX = Math.max(rect.x, Math.min(circleX, rect.x + rect.w));
    const closestY = Math.max(rect.y, Math.min(circleY, rect.y + rect.h));

    const dx = circleX - closestX;
    const dy = circleY - closestY;
    const distSq = dx * dx + dy * dy;
    const radiusSq = circleRadius * circleRadius;
    if (distSq >= radiusSq) {
        return null;
    }

    const dist = Math.sqrt(distSq);
    if (dist > 0) {
        const penetration = circleRadius - dist;
        return {
            x: (dx / dist) * penetration,
            y: (dy / dist) * penetration
        };
    }

    const insideX = circleX >= rect.x && circleX <= rect.x + rect.w;
    const insideY = circleY >= rect.y && circleY <= rect.y + rect.h;
    if (!(insideX && insideY)) {
        return null;
    }

    const left = circleX - rect.x;
    const right = rect.x + rect.w - circleX;
    const top = circleY - rect.y;
    const bottom = rect.y + rect.h - circleY;

    const min = Math.min(left, right, top, bottom);
    if (min === left) return { x: -(circleRadius + left), y: 0 };
    if (min === right) return { x: circleRadius + right, y: 0 };
    if (min === top) return { x: 0, y: -(circleRadius + top) };
    return { x: 0, y: circleRadius + bottom };
}

function getCircleRotatedRectSeparationVector(circleX, circleY, circleRadius, rect) {
    const dx = circleX - rect.x;
    const dy = circleY - rect.y;

    const cos = Math.cos(-rect.angle);
    const sin = Math.sin(-rect.angle);
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;

    const halfW = rect.w / 2;
    const halfH = rect.h / 2;
    const closestX = Math.max(-halfW, Math.min(localX, halfW));
    const closestY = Math.max(-halfH, Math.min(localY, halfH));

    const distX = localX - closestX;
    const distY = localY - closestY;
    const distSq = distX * distX + distY * distY;
    const radiusSq = circleRadius * circleRadius;
    if (distSq >= radiusSq) {
        return null;
    }

    let pushLocalX = 0;
    let pushLocalY = 0;
    const dist = Math.sqrt(distSq);
    if (dist > 0) {
        const penetration = circleRadius - dist;
        pushLocalX = (distX / dist) * penetration;
        pushLocalY = (distY / dist) * penetration;
    } else {
        const left = halfW + localX;
        const right = halfW - localX;
        const top = halfH + localY;
        const bottom = halfH - localY;
        const min = Math.min(left, right, top, bottom);

        if (min === left) pushLocalX = -(circleRadius + left);
        else if (min === right) pushLocalX = circleRadius + right;
        else if (min === top) pushLocalY = -(circleRadius + top);
        else pushLocalY = circleRadius + bottom;
    }

    const worldCos = Math.cos(rect.angle);
    const worldSin = Math.sin(rect.angle);
    return {
        x: pushLocalX * worldCos - pushLocalY * worldSin,
        y: pushLocalX * worldSin + pushLocalY * worldCos
    };
}

function getCircleObstacleSeparationVector(circleX, circleY, circleRadius, obstacle) {
    if (hasRotation(obstacle)) {
        return getCircleRotatedRectSeparationVector(circleX, circleY, circleRadius, obstacle);
    }
    return getCircleRectSeparationVector(circleX, circleY, circleRadius, obstacle);
}

function resolveCircleObstacleOverlaps(circleX, circleY, circleRadius, obstacles = [], maxIterations = 6) {
    let resolvedX = circleX;
    let resolvedY = circleY;

    for (let i = 0; i < maxIterations; i++) {
        let totalPushX = 0;
        let totalPushY = 0;
        let hadOverlap = false;

        for (const obstacle of obstacles) {
            const push = getCircleObstacleSeparationVector(resolvedX, resolvedY, circleRadius, obstacle);
            if (!push) continue;
            hadOverlap = true;
            totalPushX += push.x;
            totalPushY += push.y;
        }

        if (!hadOverlap) {
            break;
        }

        resolvedX += totalPushX;
        resolvedY += totalPushY;
    }

    return { x: resolvedX, y: resolvedY };
}

module.exports = {
    circleRectCollision,
    circleRotatedRectCollision,
    circleObstacleCollision,
    resolveCircleObstacleOverlaps,
    hasRotation
};
