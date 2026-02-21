const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const menu = document.getElementById("menu");
const characterMenu = document.getElementById("characterMenu");
const searchingMenu = document.getElementById("searchingMenu");
const controlsMenu = document.getElementById("controlsMenu");
const gameScreen = document.getElementById("gameScreen");
const healthBar = document.getElementById("healthBar");
const healthFill = document.getElementById("healthFill");
const healthText = document.getElementById("healthText");
const ammoDisplay = document.getElementById("ammoDisplay");
const weaponName = document.getElementById("weaponName");
const abilityOverlay = document.getElementById("abilityOverlay");
const abilityText = document.getElementById("abilityText");
const sharedAbilityOverlay = document.getElementById("sharedAbilityOverlay");
const sharedAbilityText = document.getElementById("sharedAbilityText");
const secondaryWeaponName = document.getElementById("secondaryWeaponName");

const MAP_COLOR = "#8383b8";

const playerImages = {
    King: new Image(),
    Ninja: new Image(),
    Berserker: new Image(),
    Grenade: new Image(),
}
const obstacleImages = {
    shield: new Image(),
};

playerImages.King.src = 'sprites/king.png';
playerImages.Ninja.src = 'sprites/ninja.png';
playerImages.Berserker.src = 'sprites/berserker.png';
playerImages.Grenade.src = 'sprites/grenade.png';
obstacleImages.shield.src = 'sprites/shield.png';

const socket = io();

var gameState = {
    players: [],
    bullets: [],
    grenades: [],
    obstacles: [],
}

var clientGameStateCache = {
    players: new Map(),
    bullets: new Map(),
    grenades: new Map(),
    obstacles: new Map()
};

var mapRadius = 1500;
var gameActive = false;
var gameMode = '1v1'; // Track current game mode

let playerSettings = loadCharacterSettings();
const VALID_CHARACTERS = ['berserker', 'ninja', 'king'];
const VALID_WEAPONS = ['m4', 'pistol', 'shotgun', 'sniper'];
const VALID_SHARED_ABILITIES = ['grenade', 'invisibility', 'shield'];
let loadoutDraft = sanitizePlayerSettings(playerSettings);
playerSettings = { ...loadoutDraft };
let lastAutoAdjustedSecondary = null;

function sanitizePlayerSettings(settings) {
    const characterType = VALID_CHARACTERS.includes(settings?.characterType) ? settings.characterType : 'berserker';
    const weaponType = VALID_WEAPONS.includes(settings?.weaponType) ? settings.weaponType : 'm4';

    let secondaryWeaponType = VALID_WEAPONS.includes(settings?.secondaryWeaponType)
        ? settings.secondaryWeaponType
        : getFallbackSecondary(weaponType);
    const sharedAbilityType = VALID_SHARED_ABILITIES.includes(settings?.sharedAbilityType)
        ? settings.sharedAbilityType
        : 'grenade';

    if (secondaryWeaponType === weaponType) {
        secondaryWeaponType = getFallbackSecondary(weaponType);
    }

    return {
        characterType,
        weaponType,
        secondaryWeaponType,
        sharedAbilityType
    };
}

function main() {
    canvas.width = 800;
    canvas.height = 600;

    socket.on('gameState', handleGameState);
    socket.on('gameStarting', () => {
        hideAllMenus();
        gameScreen.style.display = 'flex';
        gameActive = true;
        resetClientCache();
    });
    socket.on('kill', handleKill);
    socket.on('opponentLeft', handleOpponentLeft);
    socket.on('playerLeft', handlePlayerLeft);
    socket.on('reload', handleReload);
    socket.on('hit', handleHit);
    socket.on('gotHit', handleGotHit);
    socket.on('firedWeapon', handleFiredWeapon);
    socket.on('swapWeapons', handleSwapWeapons);

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
}

function hideAllMenus() {
    menu.style.display = 'none';
    characterMenu.style.display = 'none';
    searchingMenu.style.display = 'none';
    controlsMenu.style.display = 'none';
}

function showMainMenu() {
    hideAllMenus();
    gameScreen.style.display = 'none';
    menu.style.display = 'block';
    gameActive = false;
    gameMode = '1v1';
}

function showCharacter() {
    hideAllMenus();
    characterMenu.style.display = 'block';
    loadoutDraft = sanitizePlayerSettings(playerSettings);
    enforceDistinctWeapons();
    syncLoadoutSelectionUI();
    showEquipmentTab('weapon');
}

function showControls() {
    hideAllMenus();
    controlsMenu.style.display = 'block';
}

function showSearching() {
    hideAllMenus();
    searchingMenu.style.display = 'block';
}

function getFallbackSecondary(primaryWeaponType) {
    const fallbackOrder = ['pistol', 'm4', 'shotgun', 'sniper'];
    return fallbackOrder.find((weapon) => weapon !== primaryWeaponType) || 'pistol';
}

function showEquipmentTab(tabName) {
    const tabs = {
        weapon: { tabId: 'tabWeapon', panelId: 'panelWeapon' },
        secondary: { tabId: 'tabSecondary', panelId: 'panelSecondary' },
        character: { tabId: 'tabCharacter', panelId: 'panelCharacter' },
        sharedAbility: { tabId: 'tabSharedAbility', panelId: 'panelSharedAbility' }
    };

    Object.values(tabs).forEach((tabInfo) => {
        const tab = document.getElementById(tabInfo.tabId);
        const panel = document.getElementById(tabInfo.panelId);

        if (tab) {
            tab.classList.remove('active');
        }

        if (panel) {
            panel.classList.remove('active');
        }
    });

    const selectedTab = tabs[tabName];
    if (!selectedTab) return;

    document.getElementById(selectedTab.tabId)?.classList.add('active');
    document.getElementById(selectedTab.panelId)?.classList.add('active');
}

function syncLoadoutSelectionUI() {
    const optionButtons = document.querySelectorAll('.equip-option');
    optionButtons.forEach((button) => {
        const type = button.dataset.type;
        const value = button.dataset.value;

        const isActive =
            (type === 'character' && value === loadoutDraft.characterType) ||
            (type === 'weapon' && value === loadoutDraft.weaponType) ||
            (type === 'secondary' && value === loadoutDraft.secondaryWeaponType) ||
            (type === 'sharedAbility' && value === loadoutDraft.sharedAbilityType);

        button.classList.toggle('active', isActive);
    });
}

function enforceDistinctWeapons() {
    if (loadoutDraft.weaponType === loadoutDraft.secondaryWeaponType) {
        loadoutDraft.secondaryWeaponType = getFallbackSecondary(loadoutDraft.weaponType);
        lastAutoAdjustedSecondary = loadoutDraft.secondaryWeaponType;
        return true;
    }

    lastAutoAdjustedSecondary = null;
    return false;
}

function selectEquip(type, value) {
    if (type === 'character') {
        loadoutDraft.characterType = value;
    } else if (type === 'weapon') {
        loadoutDraft.weaponType = value;
    } else if (type === 'secondary') {
        loadoutDraft.secondaryWeaponType = value;
    } else if (type === 'sharedAbility') {
        loadoutDraft.sharedAbilityType = value;
    } else {
        return;
    }

    const wasAdjusted = enforceDistinctWeapons();
    syncLoadoutSelectionUI();

    if (type === 'secondary' && wasAdjusted && lastAutoAdjustedSecondary) {
        Toastify({
            text: 'Primary and secondary weapons must be different.',
            duration: 2200,
            gravity: "top",
            position: "right"
        }).showToast();
    }
}

function save() {
    enforceDistinctWeapons();
    const { characterType, weaponType, secondaryWeaponType, sharedAbilityType } = loadoutDraft;
    
    saveCharacterSettings(characterType, weaponType, secondaryWeaponType, sharedAbilityType);
    
    playerSettings = {
        characterType: characterType,
        weaponType: weaponType,
        secondaryWeaponType: secondaryWeaponType,
        sharedAbilityType: sharedAbilityType
    };
    
    showMainMenu();
}

function cancelSearch() {
    // Cancel any ongoing search
    socket.emit('cancelSearch');
    showMainMenu();
}

function handleGameState(deltaData) {
    if(!gameActive) return;
    
    const delta = msgpack.decode(new Uint8Array(deltaData));
    
    // Apply delta updates to local game state
    applyDeltaToGameState(delta);
    
    requestAnimationFrame(() => draw(gameState));
}

function resetClientCache() {
    gameState.players = [];
    gameState.bullets = [];
    gameState.grenades = [];
    gameState.obstacles = [];
    clientGameStateCache.players.clear();
    clientGameStateCache.bullets.clear();
    clientGameStateCache.grenades.clear();
    clientGameStateCache.obstacles.clear();
}

function applyDeltaToGameState(delta) {
    // Check if this is a full state update (no frameNumber means it's a full state)
    if (!delta.frameNumber) {
        // Full state update - replace everything
        gameState.players = delta.players || [];
        gameState.bullets = delta.bullets || [];
        gameState.grenades = delta.grenades || [];
        gameState.obstacles = delta.obstacles || [];
        
        // Update cache
        clientGameStateCache.players.clear();
        clientGameStateCache.bullets.clear();
        clientGameStateCache.grenades.clear();
        clientGameStateCache.obstacles.clear();
        
        for (const player of gameState.players) {
            clientGameStateCache.players.set(player.id, player);
        }
        for (const bullet of gameState.bullets) {
            clientGameStateCache.bullets.set(bullet.id, bullet);
        }
        for (const grenade of gameState.grenades) {
            clientGameStateCache.grenades.set(grenade.id, grenade);
        }
        for (const obstacle of gameState.obstacles) {
            clientGameStateCache.obstacles.set(obstacle.id, obstacle);
        }
        return;
    }
    
    // Handle player updates
    if (delta.players) {
        for (const playerUpdate of delta.players) {
            if (playerUpdate.removed) {
                // Remove player
                gameState.players = gameState.players.filter(p => p.id !== playerUpdate.id);
                clientGameStateCache.players.delete(playerUpdate.id);
            } else {
                // Update or add player
                const existingIndex = gameState.players.findIndex(p => p.id === playerUpdate.id);
                if (existingIndex >= 0) {
                    gameState.players[existingIndex] = { ...gameState.players[existingIndex], ...playerUpdate };
                } else {
                    gameState.players.push(playerUpdate);
                }
                clientGameStateCache.players.set(playerUpdate.id, playerUpdate);
            }
        }
    }
    
    // Handle bullet updates
    if (delta.bullets) {
        for (const bulletUpdate of delta.bullets) {
            const existingIndex = gameState.bullets.findIndex(b => b.id === bulletUpdate.id);
            if (existingIndex >= 0) {
                gameState.bullets[existingIndex] = { ...gameState.bullets[existingIndex], ...bulletUpdate };
            } else {
                gameState.bullets.push(bulletUpdate);
            }
            clientGameStateCache.bullets.set(bulletUpdate.id, bulletUpdate);
        }
    }

    // Handle grenade updates
    if (delta.grenades) {
        for (const grenadeUpdate of delta.grenades) {
            const existingIndex = gameState.grenades.findIndex(g => g.id === grenadeUpdate.id);
            if (existingIndex >= 0) {
                gameState.grenades[existingIndex] = { ...gameState.grenades[existingIndex], ...grenadeUpdate };
            } else {
                gameState.grenades.push(grenadeUpdate);
            }
            clientGameStateCache.grenades.set(grenadeUpdate.id, grenadeUpdate);
        }
    }
    
    // Handle removed bullets
    if (delta.removedBullets) {
        for (const bulletId of delta.removedBullets) {
            gameState.bullets = gameState.bullets.filter(b => b.id !== bulletId);
            clientGameStateCache.bullets.delete(bulletId);
        }
    }

    // Handle removed grenades
    if (delta.removedGrenades) {
        for (const grenadeId of delta.removedGrenades) {
            gameState.grenades = gameState.grenades.filter(g => g.id !== grenadeId);
            clientGameStateCache.grenades.delete(grenadeId);
        }
    }
    
    // Handle obstacle updates
    if (delta.obstacles) {
        for (const obstacleUpdate of delta.obstacles) {
            const existingIndex = gameState.obstacles.findIndex(o => o.id === obstacleUpdate.id);
            if (existingIndex >= 0) {
                const previousObstacle = gameState.obstacles[existingIndex];
                if (
                    previousObstacle?.image === 'shield.png' &&
                    typeof previousObstacle.health === 'number' &&
                    typeof obstacleUpdate.health === 'number' &&
                    obstacleUpdate.health < previousObstacle.health
                ) {
                    soundManager.play('gotHit', 0.15);
                }
                gameState.obstacles[existingIndex] = { ...gameState.obstacles[existingIndex], ...obstacleUpdate };
            } else {
                gameState.obstacles.push(obstacleUpdate);
            }
            clientGameStateCache.obstacles.set(obstacleUpdate.id, obstacleUpdate);
        }
    }
    
    // Handle removed obstacles
    if (delta.removedObstacles) {
        for (const obstacleId of delta.removedObstacles) {
            gameState.obstacles = gameState.obstacles.filter(o => o.id !== obstacleId);
            clientGameStateCache.obstacles.delete(obstacleId);
        }
    }
    
    // Update game mode if changed
    if (delta.gameMode) {
        gameMode = delta.gameMode;
    }
}

function draw(gameState) {
    const thisPlayer = gameState.players.find(player => player.id === socket.id) ?? gameState.players[0];
    if (!thisPlayer) return; // don't render if player not found
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // update health bar
    healthFill.style.width = `${thisPlayer.HP / thisPlayer.maxHP * 100}%`;
    healthText.textContent = `${thisPlayer.HP}/${thisPlayer.maxHP}`;
    
    // update ammo display
    if (thisPlayer.primaryWeapon && thisPlayer.primaryWeapon.isReloading) {
        ammoDisplay.textContent = "(reloading)";
    } else if (thisPlayer.primaryWeapon) {
        ammoDisplay.textContent = `${thisPlayer.primaryWeapon.ammo}/${thisPlayer.primaryWeapon.maxAmmo}`;
    }

    //update weapon name
    if(thisPlayer.primaryWeapon.name) {
        weaponName.textContent = thisPlayer.primaryWeapon.name;
    }

    if (thisPlayer.secondaryWeapon?.name) {
        secondaryWeaponName.textContent = `Secondary: ${thisPlayer.secondaryWeapon.name}`;
    }
    
    // update ability UI
    if (thisPlayer.specialAbility) {
        // Update ability name
        abilityText.textContent = thisPlayer.specialAbility.name;
        
        // Update ability overlay based on cooldown
        if (thisPlayer.specialAbility.currentCooldown > 0) {
            const cooldownPercent = (thisPlayer.specialAbility.currentCooldown / thisPlayer.specialAbility.cooldown) * 100;
            abilityOverlay.style.height = `${cooldownPercent}%`;
        } else {
            abilityOverlay.style.height = '0%';
        }
    }

    if (thisPlayer.sharedAbility) {
        sharedAbilityText.textContent = thisPlayer.sharedAbility.name;

        if (thisPlayer.sharedAbility.currentCooldown > 0) {
            const cooldownPercent = (thisPlayer.sharedAbility.currentCooldown / thisPlayer.sharedAbility.cooldown) * 100;
            sharedAbilityOverlay.style.height = `${cooldownPercent}%`;
        } else {
            sharedAbilityOverlay.style.height = '0%';
        }
    }
    
    const cameraX = thisPlayer.x - canvas.width / 2;
    const cameraY = thisPlayer.y - canvas.height / 2;
    
    ctx.save();
    ctx.translate(-cameraX, -cameraY);
    
    ctx.beginPath();
    ctx.arc(0, 0, mapRadius, 0, 2 * Math.PI);
    ctx.fillStyle = MAP_COLOR;
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    for (const obstacle of gameState.obstacles) {
        drawObstacle(obstacle);
    }
    
    for (const bullet of gameState.bullets) {
        drawBullet(bullet);
    }

    for (const grenade of gameState.grenades) {
        drawGrenade(grenade);
    }
    
    for (const player of gameState.players) {
        drawPlayer(player, thisPlayer);
    }
    
   ctx.restore();
}

function drawObstacle(obstacle) {
    if (obstacle.image === 'shield.png') {
        ctx.save();
        ctx.translate(obstacle.x, obstacle.y);
        ctx.rotate(obstacle.angle || 0);
        if (obstacleImages.shield.complete) {
            ctx.drawImage(obstacleImages.shield, -obstacle.w / 2, -obstacle.h / 2, obstacle.w, obstacle.h);
        } else {
            ctx.fillStyle = obstacle.color || 'rgba(50, 180, 255, 0.25)';
            ctx.fillRect(-obstacle.w / 2, -obstacle.h / 2, obstacle.w, obstacle.h);
        }
        ctx.restore();
        return;
    }

    ctx.fillStyle = obstacle.color;
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
}

function getDistanceBetweenPlayers(playerA, playerB) {
    const dx = playerA.x - playerB.x;
    const dy = playerA.y - playerB.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function getPlayerOpacity(player, thisPlayer) {
    const MIN_VISIBLE_ALPHA = 0.35;
    const TRANSPARENT_ALPHA = 0.2;
    const REVEAL_DISTANCE = 220;

    if (!player.invisible) {
        return 1;
    }

    if (player.id === thisPlayer.id) {
        return MIN_VISIBLE_ALPHA;
    }

    if (getDistanceBetweenPlayers(player, thisPlayer) <= REVEAL_DISTANCE) {
        return TRANSPARENT_ALPHA;
    }

    return 0;
}

function drawPlayer(player, thisPlayer) {
    const computedOpacity = getPlayerOpacity(player, thisPlayer);
    if (computedOpacity <= 0) {
        return;
    }

    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    ctx.globalAlpha *= computedOpacity;
    
    // draw glow effects for special abilities
    if (player.enlarged) {
        ctx.shadowColor = 'yellow';
        ctx.shadowBlur = 20;
    } 
    
    if (player.berserked) {
        ctx.shadowColor = 'red';
        ctx.shadowBlur = 20;
    }
    
    if (player.flashingTimer > 0) {
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = 'red';
        ctx.globalAlpha = 0.55;
    } else if (player.dashing) {
        ctx.globalAlpha = 0.6;
    }
    
    if (player.name) {
        ctx.drawImage(playerImages[player.name], -player.radius, -player.radius, player.radius * 2, player.radius * 2);
    } else {
        ctx.beginPath();
        ctx.arc(0, 0, player.radius, 0, 2 * Math.PI);
        ctx.fillStyle = player.flashingTimer > 0 ? 'red' : 'blue';
        ctx.fill();
        ctx.strokeStyle = player.flashingTimer > 0 ? 'darkred' : 'darkblue';
        ctx.stroke();
    }
    
    // Reset shadow effects
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    
    if (player.flashingTimer > 0) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
    } else if (player.dashing) {
        ctx.globalAlpha = 1.0;
    }
    
    ctx.restore();
}

function drawBullet(bullet) {
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, 2 * Math.PI);
    ctx.fillStyle = bullet.color;
    ctx.fill();
    ctx.strokeStyle = bullet.strokeColor;
    ctx.stroke(); 
}

function drawGrenade(grenade) {
    const GRENADE_SIZE = 48;

    ctx.save();
    ctx.translate(grenade.x, grenade.y);
    ctx.rotate(grenade.spin || 0);

    if (playerImages.Grenade.complete) {
        ctx.drawImage(playerImages.Grenade, -GRENADE_SIZE / 2, -GRENADE_SIZE / 2, GRENADE_SIZE, GRENADE_SIZE);
    } else {
        ctx.beginPath();
        ctx.arc(0, 0, grenade.radius || 20, 0, 2 * Math.PI);
        ctx.fillStyle = '#75ff8f';
        ctx.fill();
        ctx.strokeStyle = '#2c8f44';
        ctx.stroke();
    }

    ctx.restore();
}

function startGame() {
    gameMode = '1v1';
    showSearching();
    socket.emit('findGame', {
        characterType: playerSettings.characterType,
        weaponType: playerSettings.weaponType,
        secondaryWeaponType: playerSettings.secondaryWeaponType,
        sharedAbilityType: playerSettings.sharedAbilityType,
    });
    main();
}

function startFreeForAll() {
    gameMode = 'ffa';
    showSearching();
    socket.emit('findFreeForAll', {
        characterType: playerSettings.characterType,
        weaponType: playerSettings.weaponType,
        secondaryWeaponType: playerSettings.secondaryWeaponType,
        sharedAbilityType: playerSettings.sharedAbilityType,
    });
    main();
}

function handleKeyDown(event) {
    socket.emit('keydown', event.keyCode);
}

function handleKeyUp(event) {
    socket.emit('keyup', event.keyCode);
}

function handleMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    const angle = Math.atan2(mouseY - centerY, mouseX - centerX);
    
    socket.emit('changeAngle', angle);
}

function handleMouseDown(event) {
    socket.emit('mouseDown', event.button);
}

function handleMouseUp(event) {
    socket.emit('mouseUp', event.button);
}


function handleOpponentLeft() {
    Toastify({
        text: `Your opponent left the game.`,
        duration: 3000,
        gravity: "top",
        position: "right",
    }).showToast();
    showMainMenu();
}

function handlePlayerLeft(data) {
    if (gameMode === 'ffa') {
        Toastify({
            text: `A player left the game. ${data.playerCount} players remaining.`,
            duration: 3000,
            gravity: "top",
            position: "right",
        }).showToast();
    }
}

function handleKill(data) {
    Toastify({
        text: `You killed ${data.killedPlayer}! You have ${data.killCount} kills.`,
        duration: 3000,
        gravity: "top",
        position: "right",
        style: {
            background: "linear-gradient(to right, #00b09b,rgb(218, 40, 40))"
        },
        stopOnFocus: true
    }).showToast();
    soundManager.play('ding', 0.25);
}

function handleSwapWeapons(weaponName) {
    secondaryWeaponName.textContent = `Secondary: ${weaponName}`;
}

function handleReload() {
    soundManager.play('reload', 0.25);
}

function handleHit() {
    soundManager.play('hit', 0.25);
}

function handleGotHit() {
    soundManager.play('gotHit', 0.15);
}

function handleFiredWeapon() {
    soundManager.play("shoot", 0.25);
}
