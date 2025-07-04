const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const menu = document.getElementById("menu");
const characterMenu = document.getElementById("characterMenu");
const searchingMenu = document.getElementById("searchingMenu");
const gameScreen = document.getElementById("gameScreen");
const healthBar = document.getElementById("healthBar");
const healthFill = document.getElementById("healthFill");
const healthText = document.getElementById("healthText");
const ammoDisplay = document.getElementById("ammoDisplay");
const weaponName = document.getElementById("weaponName");
const abilityOverlay = document.getElementById("abilityOverlay");
const abilityText = document.getElementById("abilityText");

const MAP_COLOR = "#8383b8";

const playerImages = {
    King: new Image(),
    Ninja: new Image(),
    Berserker: new Image(),
}

playerImages.King.src = 'sprites/king.png';
playerImages.Ninja.src = 'sprites/ninja.png';
playerImages.Berserker.src = 'sprites/berserker.png';

const socket = io();

var gameState = {
    players: [],
    bullets: [],
    obstacles: [],
}

var mapRadius = 1500;
var gameActive = false;
var gameMode = '1v1'; // Track current game mode

let playerSettings = loadCharacterSettings();

function main() {
    canvas.width = 800;
    canvas.height = 600;

    document.getElementById('characterSelect').value = playerSettings.characterType;
    document.getElementById('weaponSelect').value = playerSettings.weaponType;

    socket.on('gameState', handleGameState);
    socket.on('gameStarting', () => {
        hideAllMenus();
        gameScreen.style.display = 'flex';
        gameActive = true;
    });
    socket.on('kill', handleKill);
    socket.on('opponentLeft', handleOpponentLeft);
    socket.on('playerLeft', handlePlayerLeft);
    socket.on('reload', handleReload);
    socket.on('hit', handleHit);
    socket.on('gotHit', handleGotHit);
    socket.on('firedWeapon', handleFiredWeapon);

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
    
    // Apply saved settings to dropdowns when showing character menu
    document.getElementById('characterSelect').value = playerSettings.characterType;
    document.getElementById('weaponSelect').value = playerSettings.weaponType;
}

function showSearching() {
    hideAllMenus();
    searchingMenu.style.display = 'block';
}

function save() {
    const characterType = document.getElementById('characterSelect').value;
    const weaponType = document.getElementById('weaponSelect').value;
    
    saveCharacterSettings(characterType, weaponType);
    
    playerSettings = {
        characterType: characterType,
        weaponType: weaponType
    };
    
    showMainMenu();
}

function cancelSearch() {
    // Cancel any ongoing search
    socket.emit('cancelSearch');
    showMainMenu();
}

function handleGameState(gameState) {
    if(!gameActive) return;
    
    gameState = JSON.parse(gameState);
    requestAnimationFrame(() => draw(gameState));
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
    
    for (const player of gameState.players) {
        drawPlayer(player);
    }
    
   ctx.restore();
}

function drawObstacle(obstacle) {
    ctx.fillStyle = obstacle.color;
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
}

function drawPlayer(player) {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    
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
    
    if (player.image) {
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
    ctx.strokeStyle = 'orange';
    ctx.stroke(); 
}

function startGame() {
    gameMode = '1v1';
    showSearching();
    socket.emit('findGame', {
        characterType: playerSettings.characterType,
        weaponType: playerSettings.weaponType,
    });
    main();
}

function startFreeForAll() {
    gameMode = 'ffa';
    showSearching();
    socket.emit('findFreeForAll', {
        characterType: playerSettings.characterType,
        weaponType: playerSettings.weaponType,
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