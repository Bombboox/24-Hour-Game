const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d")
const menuBackdropCanvas = document.getElementById("menuBackdrop");
const menuBackdropCtx = menuBackdropCanvas ? menuBackdropCanvas.getContext("2d") : null;
const authChoiceMenu = document.getElementById("authChoiceMenu");
const registerMenu = document.getElementById("registerMenu");
const displayNameMenu = document.getElementById("displayNameMenu");
const menu = document.getElementById("menu");
const mainMenuContent = document.getElementById("mainMenuContent");
const playMenuContent = document.getElementById("playMenuContent");
const characterMenu = document.getElementById("characterMenu");
const shopMenu = document.getElementById("shopMenu");
const searchingMenu = document.getElementById("searchingMenu");
const controlsMenu = document.getElementById("controlsMenu");
const oneVsOneModeIndicator = document.getElementById("oneVsOneModeIndicator");
const twoVsTwoModeIndicator = document.getElementById("twoVsTwoModeIndicator");
const freeForAllModeIndicator = document.getElementById("freeForAllModeIndicator");
const menuLink = document.querySelector(".menu-link");
const gameScreen = document.getElementById("gameScreen");
const healthBar = document.getElementById("healthBar");
const healthFill = document.getElementById("healthFill");
const shieldFill = document.getElementById("shieldFill");
const healthText = document.getElementById("healthText");
const ammoDisplay = document.getElementById("ammoDisplay");
const weaponName = document.getElementById("weaponName");
const abilityOverlay = document.getElementById("abilityOverlay");
const abilityText = document.getElementById("abilityText");
const abilityContainer = document.getElementById("abilityContainer");
const sharedAbilityOverlay = document.getElementById("sharedAbilityOverlay");
const sharedAbilityText = document.getElementById("sharedAbilityText");
const sharedAbilityContainer = document.getElementById("sharedAbilityContainer");
const sharedAbilityKey = document.getElementById("sharedAbilityKey");
const passiveAbilityOverlay = document.getElementById("passiveAbilityOverlay");
const passiveAbilityText = document.getElementById("passiveAbilityText");
const passiveAbilityKey = document.getElementById("passiveAbilityKey");
const passiveAbilityContainer = document.getElementById("passiveAbilityContainer");
const killProgressContainer = document.getElementById("killProgressContainer");
const killProgressText = document.getElementById("killProgressText");
const killProgressTitle = killProgressContainer
    ? killProgressContainer.querySelector('.kill-progress-title')
    : null;
const matchEndOverlay = document.getElementById("matchEndOverlay");
const matchEndCard = document.getElementById("matchEndCard");
const matchEndTitle = document.getElementById("matchEndTitle");
const matchEndScore = document.getElementById("matchEndScore");
const matchEndSubtitle = document.getElementById("matchEndSubtitle");
const secondaryWeaponName = document.getElementById("secondaryWeaponName");
const patchNotesList = document.getElementById("patchNotesList");
const patchNotesVersion = document.getElementById("patchNotesVersion");
const installButton = document.getElementById("installButton");
const mobileHud = document.getElementById("mobileHud");
const moveStick = document.getElementById("moveStick");
const moveStickKnob = document.getElementById("moveStickKnob");
const aimStick = document.getElementById("aimStick");
const aimStickKnob = document.getElementById("aimStickKnob");
const mobileReloadButton = document.getElementById("mobileReloadButton");
const mobileSwapButton = document.getElementById("mobileSwapButton");
const mobileAbilityButton = document.getElementById("mobileAbilityButton");
const mobileSharedButton = document.getElementById("mobileSharedButton");
const mobilePassiveButton = document.getElementById("mobilePassiveButton");
const mobileQuitButton = document.getElementById("mobileQuitButton");
const leaveMatchButton = document.getElementById("leaveMatchButton");
const chatContainer = document.getElementById("chatContainer");
const chatToggleButton = document.getElementById("chatToggleButton");
const chatMiniButton = document.getElementById("chatMiniButton");
const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const registerStatus = document.getElementById("registerStatus");
const googleSignInButton = document.getElementById("googleSignInButton");
const logoutButton = document.getElementById("logoutButton");
const displayNameInput = document.getElementById("displayNameInput");
const displayNameStatus = document.getElementById("displayNameStatus");
const accountSummary = document.getElementById("accountSummary");
const accountSummaryName = document.getElementById("accountSummaryName");
const accountSummaryStats = document.getElementById("accountSummaryStats");
const shopCardBubble = document.getElementById("shopCardBubble");
const shopCardFlamethrower = document.getElementById("shopCardFlamethrower");
const shopStatusBubble = document.getElementById("shopStatusBubble");
const shopStatusFlamethrower = document.getElementById("shopStatusFlamethrower");
const shopButtonBubble = document.getElementById("shopButtonBubble");
const shopButtonFlamethrower = document.getElementById("shopButtonFlamethrower");

const MAP_COLOR = "#d3d3d3";
const GRID_MINOR_SIZE = 35;
const GRID_MAJOR_EVERY = 5;
const GRID_MINOR_COLOR = "rgba(255, 255, 255, 0.23)";
const GRID_MAJOR_COLOR = "rgba(255, 255, 255, 0.21)";
const MENU_BACKDROP_SPRITES = ["King", "Ninja", "Berserker", "Demoman", "Reaver", "Waffle"];
const MENU_BACKDROP_ACTOR_COUNT = 8;
const MENU_BACKDROP_FPS = 24;
const MODE_STATUS_REFRESH_MS = 5000;
const CHAT_IDLE_FADE_MS = 7000;
const CHAT_MAX_MESSAGES = 60;
const MENU_AUDIO_UNLOCK_SELECTOR = '.menu-button, .equip-option, .equip-tab, .menu-link';
const MENU_BUTTON_SOUND_SELECTOR = '.menu-button, .equip-option, .equip-tab, .menu-link';
const MENU_HOVER_VOLUME = 0.18;
const MENU_CLICK_VOLUME = 0.15;
const MOVEMENT_KEY_CODES = [87, 83, 65, 68];
const TEAM_COLORS = Object.freeze({
    red: 'rgba(255, 72, 72, 0.42)',
    blue: 'rgba(86, 158, 255, 0.42)'
});
const AMBIENCE_VOLUME = 0.2;
const AMBIENCE_START_RETRY_MS = 220;
const AMBIENCE_START_MAX_ATTEMPTS = 12;
const LASER_LOOP_VOLUME = 0.2;
const FLAME_LOOP_VOLUME = 0.24;

const playerImages = {
    King: new Image(),
    Ninja: new Image(),
    Berserker: new Image(),
    Demoman: new Image(),
    Reaver: new Image(),
    Waffle: new Image(),
    Grenade: new Image(),
    Explosive: new Image(),
    ReaverShard: new Image(),
    Missile: new Image(),
    TurretBase: new Image(),
    TurretHead: new Image(),
    WaffleDrone: new Image(),
}
const obstacleImages = {
    shield: new Image(),
};

playerImages.King.src = 'sprites/king.png';
playerImages.Ninja.src = 'sprites/ninja.png';
playerImages.Berserker.src = 'sprites/berserker.png';
playerImages.Demoman.src = 'sprites/demo.png';
playerImages.Reaver.src = 'sprites/reaver.png';
playerImages.Waffle.src = 'sprites/waffle.png';
playerImages.Grenade.src = 'sprites/grenade.png';
playerImages.Explosive.src = 'sprites/explosive.png';
playerImages.ReaverShard.src = 'sprites/reaver_shard.png';
playerImages.Missile.src = 'sprites/missle.png';
playerImages.TurretBase.src = 'sprites/turret_base.png';
playerImages.TurretHead.src = 'sprites/turret_head.png';
playerImages.WaffleDrone.src = 'sprites/waffle_drone.png';
obstacleImages.shield.src = 'sprites/shield.png';

const CHARACTER_LOADOUT_INFO = Object.freeze({
    berserker: {
        title: 'Berserker',
        subtitle: 'Character',
        description: 'Close-range bruiser with high damage and strong sustain windows.',
        preview: { type: 'playerImage', key: 'Berserker' },
        stats: [
            { label: 'HP', value: '125' },
            { label: 'Speed', value: '6.0' },
            { label: 'Damage', value: 'x2.0' }
        ]
    },
    ninja: {
        title: 'Ninja',
        subtitle: 'Character',
        description: 'Fast assassin focused on mobility and burst picks.',
        preview: { type: 'playerImage', key: 'Ninja' },
        stats: [
            { label: 'HP', value: '85' },
            { label: 'Speed', value: '8.0' },
            { label: 'Damage', value: 'x1.2' }
        ]
    },
    king: {
        title: 'King',
        subtitle: 'Character',
        description: 'Durable frontline anchor with strong team-zone pressure.',
        preview: { type: 'playerImage', key: 'King' },
        stats: [
            { label: 'HP', value: '200' },
            { label: 'Speed', value: '3.0' },
            { label: 'Damage', value: 'x1.5' }
        ]
    },
    demoman: {
        title: 'Demoman',
        subtitle: 'Character',
        description: 'Area-control fighter with explosive zoning tools.',
        preview: { type: 'playerImage', key: 'Demoman' },
        stats: [
            { label: 'HP', value: '150' },
            { label: 'Speed', value: '5.5' },
            { label: 'Damage', value: 'x1.15' }
        ]
    },
    reaver: {
        title: 'Reaver',
        subtitle: 'Character',
        description: 'Skirmisher that snowballs through sustained pressure.',
        preview: { type: 'playerImage', key: 'Reaver' },
        stats: [
            { label: 'HP', value: '125' },
            { label: 'Speed', value: '5.8' },
            { label: 'Damage', value: 'x1.0' }
        ]
    },
    waffle: {
        title: 'Waffle',
        subtitle: 'Character',
        description: 'Mid-range controller with a deployable drone and a regenerating shield.',
        preview: { type: 'playerImage', key: 'Waffle' },
        stats: [
            { label: 'HP', value: '120' },
            { label: 'Speed', value: '5.4' },
            { label: 'Shield', value: '50' }
        ]
    }
});

const WEAPON_LOADOUT_INFO = Object.freeze({
    m4: {
        title: 'M4',
        subtitle: 'Weapon',
        stats: [
            { label: 'Damage', value: '8' },
            { label: 'Fire Rate', value: '13.3 /s' },
            { label: 'Mag', value: '30' },
            { label: 'Reload', value: '0.64s' }
        ]
    },
    pistol: {
        title: 'Pistol',
        subtitle: 'Weapon',
        stats: [
            { label: 'Damage', value: '18' },
            { label: 'Fire Rate', value: '4.2 /s' },
            { label: 'Mag', value: '15' },
            { label: 'Reload', value: '0.63s' }
        ]
    },
    shotgun: {
        title: 'Shotgun',
        subtitle: 'Weapon',
        stats: [
            { label: 'Damage', value: '8 x 6 pellets' },
            { label: 'Fire Rate', value: '1.7 /s' },
            { label: 'Mag', value: '8' },
            { label: 'Reload', value: '0.88s' }
        ]
    },
    sniper: {
        title: 'Sniper',
        subtitle: 'Weapon',
        stats: [
            { label: 'Damage', value: '35' },
            { label: 'Fire Rate', value: '0.5 /s' },
            { label: 'Mag', value: '5' },
            { label: 'Reload', value: '0.89s' }
        ]
    },
    laser: {
        title: 'Laser Gun',
        subtitle: 'Weapon',
        stats: [
            { label: 'Damage', value: '0.78 -> 1.75' },
            { label: 'Fire Rate', value: '40.0 /s' },
            { label: 'Mag', value: '190' },
            { label: 'Reload', value: '0.85s' }
        ]
    },
    taser: {
        title: 'Taser',
        subtitle: 'Weapon',
        stats: [
            { label: 'Damage', value: '10' },
            { label: 'Fire Rate', value: '1.8 /s' },
            { label: 'Mag', value: '1' },
            { label: 'Reload', value: '2.63s' }
        ]
    },
    rocket: {
        title: 'Rocket Launcher',
        subtitle: 'Weapon',
        stats: [
            { label: 'Damage', value: '48 + splash' },
            { label: 'Fire Rate', value: '1.2 /s' },
            { label: 'Mag', value: '3' },
            { label: 'Reload', value: '1.05s' }
        ]
    },
    bubble: {
        title: 'Bubble Launcher',
        subtitle: 'Weapon',
        stats: [
            { label: 'Damage', value: '50' },
            { label: 'Fire Rate', value: '1.0 /s' },
            { label: 'Mag', value: '2' },
            { label: 'Reload', value: '1.95s' }
        ]
    },
    flamethrower: {
        title: 'Flamethrower',
        subtitle: 'Weapon',
        stats: [
            { label: 'Damage', value: '1.2 + light burn' },
            { label: 'Fire Rate', value: '25.0 /s' },
            { label: 'Mag', value: '65' },
            { label: 'Reload', value: '1.05s' }
        ]
    }
});

const SHARED_ABILITY_LOADOUT_INFO = Object.freeze({
    grenade: {
        title: 'Grenade',
        subtitle: 'Shared Ability',
        description: 'Throw a fast grenade that accelerates before detonation.',
        preview: { type: 'playerImage', key: 'Grenade' },
        stats: [
            { label: 'Cooldown', value: '4.5s' },
            { label: 'Type', value: 'Projectile explosion' }
        ]
    },
    invisibility: {
        title: 'Invisibility',
        subtitle: 'Shared Ability',
        description: 'Become invisible for a short duration until it expires.',
        preview: { type: 'glyph', label: 'INVIS' },
        stats: [
            { label: 'Duration', value: '6.3s' },
            { label: 'Cooldown', value: '6.5s' }
        ]
    },
    shield: {
        title: 'Shield',
        subtitle: 'Shared Ability',
        description: 'Deploy a forward barrier to block incoming damage.',
        preview: { type: 'obstacleImage', key: 'shield' },
        stats: [
            { label: 'Health', value: '120' },
            { label: 'Duration', value: '18.8s' },
            { label: 'Cooldown', value: '9.0s' }
        ]
    },
    turret: {
        title: 'Auto Turret',
        subtitle: 'Shared Ability',
        description: 'Place a turret that attacks enemies in range.',
        preview: { type: 'playerImage', key: 'TurretHead' },
        stats: [
            { label: 'Health', value: '110' },
            { label: 'Duration', value: '18.8s' },
            { label: 'Cooldown', value: '9.0s' }
        ]
    },
    healingcircle: {
        title: 'Healing Circle',
        subtitle: 'Shared Ability',
        description: 'Create a zone that heals while you stay inside it.',
        preview: { type: 'ring' },
        stats: [
            { label: 'Heal Rate', value: '5% max HP/s' },
            { label: 'Duration', value: '3.8s' },
            { label: 'Cooldown', value: '9.0s' }
        ]
    }
});

class WebSocketGameClient {
    constructor() {
        this.id = null;
        this.listeners = new Map();
        this.pendingPackets = [];
        this.connect();
    }

    connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const socketUrl = `${protocol}//${window.location.host}/ws`;
        this.ws = new WebSocket(socketUrl);
        this.ws.binaryType = 'arraybuffer';

        this.ws.addEventListener('open', () => {
            while (this.pendingPackets.length > 0) {
                this.ws.send(this.pendingPackets.shift());
            }
        });

        this.ws.addEventListener('message', (event) => {
            let payloadBuffer = event.data;
            if (!(payloadBuffer instanceof ArrayBuffer)) {
                return;
            }

            const packet = msgpack.decode(new Uint8Array(payloadBuffer));
            const eventName = packet?.e;
            const eventPayload = packet?.d;

            if (eventName === '__welcome') {
                this.id = eventPayload?.id || null;
                return;
            }

            const handlers = this.listeners.get(eventName);
            if (!handlers) {
                return;
            }

            for (const handler of handlers) {
                handler(eventPayload);
            }
        });
    }

    on(eventName, handler) {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, []);
        }
        this.listeners.get(eventName).push(handler);
    }

    emit(eventName, payload) {
        const encoded = msgpack.encode({ e: eventName, d: payload });
        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(encoded);
            return;
        }

        this.pendingPackets.push(encoded);
    }

    reconnect() {
        this.id = null;
        try {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.close();
            }
        } catch (_error) {
            // ignore close failures and still attempt reconnect
        }
        this.connect();
    }

    close(code = 1000, reason) {
        if (!this.ws) {
            return;
        }

        if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
            this.ws.close(code, reason);
        }
    }
}

const socket = new WebSocketGameClient();

var gameState = {
    players: [],
    bullets: [],
    grenades: [],
    pickups: [],
    obstacles: [],
    teamLives: null,
}
let latestTeamLives = null;
const SNAPSHOT_BUFFER_SIZE = 90;
const RENDER_INTERPOLATION_DELAY_MS = 80;
const MAX_RENDER_INTERPOLATION_DELAY_MS = 160;
const MAX_EXTRAPOLATION_MS = 140;
const MIN_EXTRAPOLATION_SAMPLE_MS = 12;
const MAX_LINEAR_EXTRAPOLATION_STEP = 42;
const MAX_ANGULAR_EXTRAPOLATION_STEP = Math.PI * 0.35;
const MAX_EXTRAPOLATION_ALPHA = 0.65;
const EXTRAPOLATION_ALPHA_EASING = 1.2;
const SNAPSHOT_INTERVAL_SMOOTHING = 0.15;
const SNAPSHOT_JITTER_SMOOTHING = 0.2;
const SERVER_DELTA_TIME_DIVISOR = 40;
const PROJECTILE_PRESENTATION_BLEND = 0.72;
const MAX_PROJECTILE_PRESENTATION_EXTRAPOLATION_MS = 220;
const MAX_PREDICTION_STEP_MS = 50;
const LOCAL_RECONCILIATION_LERP = 0.24;
const LOCAL_RECONCILIATION_SNAP_DISTANCE = 170;
const PREDICTION_OVERLAP_ITERATIONS = 6;
const FALLBACK_MOVE_SPEED_BY_NAME = Object.freeze({
    Ninja: 8,
    King: 3,
    Berserker: 6,
    Demoman: 5.5,
    Reaver: 5.8,
    Waffle: 5.4
});
const NET_DEBUG_OVERLAY_DEFAULT = false;
const NET_DEBUG_TOGGLE_KEY = 'l';
let snapshotBuffer = [];
let lastProcessedGameStateFrameNumber = null;
let snapshotTiming = {
    lastReceivedAt: null,
    intervalEwma: 1000 / 30,
    jitterEwma: 0
};
let netDebugOverlayEnabled = NET_DEBUG_OVERLAY_DEFAULT;
let netDebugOverlayElement = null;
let renderFpsEwma = 60;
let lastRenderLoopTimestamp = null;
let lastLocalPredictionTimestamp = null;
let netDebugStats = {
    mode: 'none',
    lastInterpolationDelayMs: RENDER_INTERPOLATION_DELAY_MS,
    lastInterpolationAlpha: 0,
    lastExtrapolationAlpha: 0,
    lastExtrapolationMs: 0,
    lastSnapshotAgeMs: 0,
    extrapolationFrames: 0,
    extrapolationFramesTotal: 0,
    extrapolationWindowStartedAt: 0
};
let renderLoopId = null;
let mainInitialized = false;
let pageExitCleanupSent = false;
let localPredictionState = null;
let localAimAngle = 0;
const localInputState = {
    up: false,
    down: false,
    left: false,
    right: false
};

const combatTexts = [];
const explosiveEffects = [];

var clientGameStateCache = {
    players: new Map(),
    bullets: new Map(),
    grenades: new Map(),
    pickups: new Map(),
    obstacles: new Map()
};

var mapRadius = 1500;
var gameActive = false;
var gameMode = '1v1'; // Track current game mode
const ONE_VS_ONE_KILL_TARGET = 5;
let matchEndTimeout = null;
let forfeitReturnTimeout = null;
let ambienceStartRetryTimer = null;
let freeForAllSessionProgress = {
    kills: 0,
    coins: 0
};
const SCORE_POPUP_VISIBLE_MS = 2600;
const SCORE_POPUP_FADE_MS = 900;
let scorePopupShownAt = 0;
let lastScoreSignature = '';
let menuBackdropInitialized = false;
let menuBackdropActors = [];
let menuBackdropAnimationId = null;
let menuBackdropLastTime = 0;
let menuBackdropLastDrawTime = 0;
let deferredInstallPrompt = null;
let modeStatusRefreshTimer = null;
let chatFadeTimer = null;
let chatHiddenByUser = false;
let loadoutTooltipElement = null;
let loadoutTooltipActiveButton = null;
let loadoutTooltipsBound = false;
let loadoutTooltipLastPointerX = null;
let loadoutTooltipLastPointerY = null;
let mouseX = null;
let mouseY = null;
let authState = {
    initialized: false,
    authenticated: false,
    account: null,
    googleClientId: '',
    googleButtonRendered: false,
    mode: null
};
const MOBILE_INPUT_KEYS = {
    up: 87,
    down: 83,
    left: 65,
    right: 68,
    reload: 82,
    swap: 81,
    ability: 69,
    shared: 67,
    passive: 90
};
const virtualPressedKeys = new Set();
const isTouchDevice = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const mobileControlState = {
    movePointerId: null,
    aimPointerId: null,
    firePressed: false,
    movementDirections: {
        up: false,
        down: false,
        left: false,
        right: false
    }
};

let playerSettings = loadCharacterSettings();
const VALID_CHARACTERS = ['berserker', 'ninja', 'king', 'demoman', 'reaver', 'waffle'];
const VALID_WEAPONS = ['m4', 'pistol', 'shotgun', 'sniper', 'laser', 'taser', 'rocket', 'bubble', 'flamethrower'];
const VALID_SHARED_ABILITIES = ['grenade', 'invisibility', 'shield', 'turret', 'healingcircle'];
const SHOP_WEAPONS = Object.freeze({
    bubble: {
        name: 'Bubble Launcher',
        price: 100,
        card: shopCardBubble,
        status: shopStatusBubble,
        button: shopButtonBubble
    },
    flamethrower: {
        name: 'Flamethrower',
        price: 250,
        card: shopCardFlamethrower,
        status: shopStatusFlamethrower,
        button: shopButtonFlamethrower
    }
});
const SHOP_WEAPON_CODES = Object.freeze(Object.keys(SHOP_WEAPONS));
let loadoutDraft = sanitizePlayerSettings(playerSettings);
playerSettings = { ...loadoutDraft };
let lastAutoAdjustedSecondary = null;

renderPatchNotes();
initializeMenuBackdrop();
registerServiceWorker();
setupPwaInstallButton();
setupMobileControls();
setupDesktopLeaveButton();
setupChatUi();
setupModeStatusRefresh();
setupMenuAudioUnlock();
setupMenuButtonSounds();
setupLoadoutTooltips();
initializeAuth();

function sanitizePlayerSettings(settings) {
    const characterType = VALID_CHARACTERS.includes(settings?.characterType) ? settings.characterType : 'berserker';
    const weaponType = VALID_WEAPONS.includes(settings?.weaponType) && isWeaponUnlocked(settings?.weaponType)
        ? settings.weaponType
        : 'm4';

    let secondaryWeaponType = VALID_WEAPONS.includes(settings?.secondaryWeaponType)
        && isWeaponUnlocked(settings?.secondaryWeaponType)
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

function normalizeOwnedWeapons(ownedWeapons) {
    if (!Array.isArray(ownedWeapons)) {
        return [];
    }

    return [...new Set(
        ownedWeapons
            .map((weaponType) => typeof weaponType === 'string' ? weaponType.trim().toLowerCase() : '')
            .filter((weaponType) => SHOP_WEAPON_CODES.includes(weaponType))
    )];
}

function getOwnedWeapons() {
    return normalizeOwnedWeapons(authState.account?.ownedWeapons);
}

function isWeaponUnlocked(weaponType) {
    if (!VALID_WEAPONS.includes(weaponType)) {
        return false;
    }

    if (!SHOP_WEAPON_CODES.includes(weaponType)) {
        return true;
    }

    return getOwnedWeapons().includes(weaponType);
}

function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        return;
    }

    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {
            // Non-blocking: game should still run if service worker registration fails.
        });
    });
}

function setupPwaInstallButton() {
    if (!installButton) {
        return;
    }

    installButton.addEventListener('click', async () => {
        if (!deferredInstallPrompt) {
            return;
        }

        deferredInstallPrompt.prompt();
        try {
            await deferredInstallPrompt.userChoice;
        } finally {
            deferredInstallPrompt = null;
            installButton.style.display = 'none';
        }
    });

    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredInstallPrompt = event;
        installButton.style.display = 'block';
    });

    window.addEventListener('appinstalled', () => {
        deferredInstallPrompt = null;
        installButton.style.display = 'none';
        Toastify({
            text: 'App installed successfully.',
            duration: 2200,
            gravity: "top",
            position: "right"
        }).showToast();
    });
}

function setupMenuAudioUnlock() {
    if (!soundManager || typeof soundManager.unlockAudio !== 'function') return;

    const cleanup = () => {
        document.removeEventListener('pointerdown', tryUnlock, true);
        document.removeEventListener('keydown', tryUnlock, true);
    };

    const tryUnlock = (event) => {
        let unlockTargetValid = false;
        if (MENU_AUDIO_UNLOCK_SELECTOR) {
            let targetEl = event.target;
            if (targetEl instanceof Element && targetEl.closest(MENU_AUDIO_UNLOCK_SELECTOR)) {
                unlockTargetValid = true;
            }
        } else {
            unlockTargetValid = true;
        }

        if (!unlockTargetValid) return;

        soundManager.unlockAudio();

        let unlocked = false;
        try {
            unlocked = typeof soundManager.isAudioUnlocked === "function"
                ? soundManager.isAudioUnlocked()
                : !!soundManager.isAudioUnlocked;
        } catch (e) {}

        if (unlocked) cleanup();
    };

    document.addEventListener('pointerdown', tryUnlock, true);
    document.addEventListener('keydown', tryUnlock, true);
}

function setupMenuButtonSounds() {
    if (!menu || !soundManager || typeof soundManager.play !== 'function') {
        return;
    }

    const menuButtons = menu.querySelectorAll(MENU_BUTTON_SOUND_SELECTOR);
    if (menuButtons.length === 0) {
        return;
    }

    menuButtons.forEach((button) => {
        button.addEventListener('pointerenter', (event) => {
            if (event.pointerType === 'touch') {
                return;
            }
            soundManager.play('hover', MENU_HOVER_VOLUME);
        });

        button.addEventListener('click', () => {
            soundManager.play('click', MENU_CLICK_VOLUME);
        });
    });
}

function setupMobileControls() {
    if (!isTouchDevice || !mobileHud) {
        return;
    }

    setupMovementStick();
    setupAimStick();
    setupMobileActionButtons();
    setupMobileQuitButton();
    updateMobileHudVisibility();
}

function escapeHtml(value) {
    return `${value ?? ''}`
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function updateRegisterUi() {
    if (!registerStatus || !googleSignInButton) {
        return;
    }

    if (!authState.initialized) {
        registerStatus.textContent = 'Loading register options...';
        return;
    }

    if (!authState.googleClientId) {
        registerStatus.textContent = 'Google sign-in unavailable. Missing GOOGLE_CLIENT_ID.';
        return;
    }

    if (authState.authenticated && authState.account) {
        const account = authState.account;
        if (normalizeDisplayName(account.displayName || '')) {
            registerStatus.textContent = `Signed in as ${account.displayName}.`;
        } else {
            registerStatus.textContent = 'Signed in. You must create a display name to continue.';
        }
        return;
    }

    registerStatus.textContent = 'Register options:';
}

function updateMainMenuTopActions() {
    const inPlayableMode = authState.mode === 'account' || authState.mode === 'guest';

    if (logoutButton) {
        logoutButton.style.display = inPlayableMode ? 'inline-block' : 'none';
    }
}

function setMainMenuView(view) {
    if (mainMenuContent) {
        mainMenuContent.style.display = view === 'play' ? 'none' : 'block';
    }

    if (playMenuContent) {
        playMenuContent.style.display = view === 'play' ? 'block' : 'none';
    }
}

function formatModeIndicator(modeStatus) {
    const queued = Number(modeStatus?.queued || 0);
    const playing = Number(modeStatus?.playing || 0);
    return `Queued: ${queued} | Playing: ${playing}`;
}

function applyModeStatus(status) {
    if (oneVsOneModeIndicator) {
        oneVsOneModeIndicator.textContent = formatModeIndicator(status?.oneVsOne);
    }

    if (twoVsTwoModeIndicator) {
        twoVsTwoModeIndicator.textContent = formatModeIndicator(status?.twoVsTwo);
    }

    if (freeForAllModeIndicator) {
        freeForAllModeIndicator.textContent = formatModeIndicator(status?.freeForAll);
    }
}

async function fetchModeStatus() {
    try {
        const response = await fetch('/api/mode-status', {
            credentials: 'same-origin',
            cache: 'no-store'
        });
        if (!response.ok) {
            return;
        }

        const payload = await response.json();
        applyModeStatus(payload);
    } catch (_error) {
        // Non-blocking: menu should remain usable even if status fetch fails.
    }
}

function setupModeStatusRefresh() {
    fetchModeStatus();

    if (modeStatusRefreshTimer) {
        clearInterval(modeStatusRefreshTimer);
    }

    modeStatusRefreshTimer = setInterval(() => {
        fetchModeStatus();
    }, MODE_STATUS_REFRESH_MS);
}

function isChatFocused() {
    return !!chatInput && document.activeElement === chatInput;
}

function setChatHidden(hidden) {
    chatHiddenByUser = !!hidden;
    if (!chatContainer) {
        return;
    }

    chatContainer.classList.toggle('chat-hidden', chatHiddenByUser);
    document.body.classList.toggle('chat-hidden', chatHiddenByUser);
    if (chatToggleButton) {
        chatToggleButton.textContent = chatHiddenByUser ? 'Show' : 'Hide';
    }
}

function scheduleChatFade() {
    if (!chatContainer || chatHiddenByUser) {
        return;
    }

    if (chatFadeTimer) {
        clearTimeout(chatFadeTimer);
    }

    chatFadeTimer = setTimeout(() => {
        if (!chatHiddenByUser && !isChatFocused()) {
            chatContainer.classList.add('chat-faded');
        }
    }, CHAT_IDLE_FADE_MS);
}

function revealChat() {
    if (!chatContainer || chatHiddenByUser) {
        return;
    }

    chatContainer.classList.remove('chat-faded');
    scheduleChatFade();
}

function resetChatForRoom() {
    if (chatMessages) {
        chatMessages.innerHTML = '';
    }
    if (chatInput) {
        chatInput.value = '';
        chatInput.blur();
    }
    if (chatFadeTimer) {
        clearTimeout(chatFadeTimer);
        chatFadeTimer = null;
    }
    if (chatContainer) {
        chatContainer.classList.remove('chat-faded');
    }
    setChatHidden(false);
    scheduleChatFade();
}

function releaseMovementKeys() {
    for (const keyCode of MOVEMENT_KEY_CODES) {
        updateLocalInputState(keyCode, false);
        socket.emit('keyup', keyCode);
    }
    clearVirtualControls();
}

function focusChatInput() {
    if (!chatInput || !gameActive) {
        return;
    }

    if (chatHiddenByUser) {
        setChatHidden(false);
    }

    releaseMovementKeys();
    revealChat();
    chatInput.focus();
}

function sendChatFromInput() {
    if (!chatInput || !gameActive) {
        return;
    }

    const message = `${chatInput.value || ''}`.trim().slice(0, 180);
    if (message) {
        socket.emit('chatMessage', { message });
    }

    chatInput.value = '';
    chatInput.blur();
    scheduleChatFade();
}

function appendChatMessage(data) {
    if (!chatMessages || !data) {
        return;
    }

    const name = `${data.name || 'Player'}`.trim() || 'Player';
    const message = `${data.message || ''}`.trim();
    if (!message) {
        return;
    }

    const line = document.createElement('div');
    line.className = 'chat-line';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'chat-name';
    nameSpan.textContent = `${name}:`;

    const textSpan = document.createElement('span');
    textSpan.textContent = message;

    line.appendChild(nameSpan);
    line.appendChild(textSpan);
    chatMessages.appendChild(line);

    while (chatMessages.children.length > CHAT_MAX_MESSAGES) {
        chatMessages.removeChild(chatMessages.firstChild);
    }

    chatMessages.scrollTop = chatMessages.scrollHeight;
    revealChat();
}

function handleChatMessage(data) {
    appendChatMessage(data);
}

function setupChatUi() {
    if (!chatContainer || !chatInput || !chatToggleButton) {
        return;
    }

    setChatHidden(false);
    scheduleChatFade();

    chatToggleButton.addEventListener('click', () => {
        const nextHidden = !chatHiddenByUser;
        setChatHidden(nextHidden);
        if (!nextHidden) {
            revealChat();
        }
    });

    if (chatMiniButton) {
        chatMiniButton.addEventListener('click', () => {
            setChatHidden(false);
            revealChat();
            chatInput.focus();
        });
    }

    chatInput.addEventListener('focus', () => {
        revealChat();
    });

    chatInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();
            sendChatFromInput();
            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            chatInput.blur();
            scheduleChatFade();
        }
    });
}

function hasDisplayName() {
    return Boolean(normalizeDisplayName(authState.account?.displayName || ''));
}

function updateAccountSummaryUi() {
    if (!accountSummary || !accountSummaryName || !accountSummaryStats) {
        return;
    }

    if (authState.mode === 'account' && authState.account) {
        accountSummary.style.display = 'block';
        accountSummaryName.textContent = authState.account.displayName || 'Unnamed';
        accountSummaryStats.textContent = `Elo: ${Number(authState.account.elo || 500)} | Bux: ${Number(authState.account.bux || 0)}`;
        return;
    }

    accountSummary.style.display = 'none';
}

function normalizeDisplayName(value) {
    if (typeof value !== 'string') {
        return '';
    }

    return value.trim().replace(/\s+/g, ' ');
}

function isValidDisplayName(value) {
    if (value.length < 3 || value.length > 24) {
        return false;
    }

    return /^[A-Za-z0-9 _\-]+$/.test(value);
}

async function fetchAuthConfig() {
    const response = await fetch('/api/auth/config');
    if (!response.ok) {
        throw new Error('Failed to load auth config');
    }

    return response.json();
}

async function fetchCurrentSession() {
    const response = await fetch('/api/auth/me');
    if (!response.ok) {
        throw new Error('Failed to load session');
    }

    return response.json();
}

function renderGoogleSignInButton() {
    if (authState.googleButtonRendered || !googleSignInButton) {
        return;
    }

    if (!window.google?.accounts?.id || !authState.googleClientId) {
        return;
    }

    window.google.accounts.id.initialize({
        client_id: authState.googleClientId,
        callback: handleGoogleCredentialResponse,
        auto_select: false
    });

    googleSignInButton.innerHTML = '';
    window.google.accounts.id.renderButton(googleSignInButton, {
        theme: 'filled_blue',
        size: 'large',
        width: 260,
        text: 'signin_with'
    });

    authState.googleButtonRendered = true;
}

function scheduleGoogleButtonRenderAttempts() {
    let attempts = 0;
    const maxAttempts = 20;
    const timer = setInterval(() => {
        attempts += 1;
        renderGoogleSignInButton();
        if (authState.googleButtonRendered || attempts >= maxAttempts) {
            clearInterval(timer);
        }
    }, 300);
}

async function handleGoogleCredentialResponse(response) {
    const idToken = response?.credential;
    if (!idToken) {
        Toastify({
            text: 'Google login failed. Please try again.',
            duration: 2600,
            gravity: 'top',
            position: 'right'
        }).showToast();
        return;
    }

    try {
        const authResponse = await fetch('/api/auth/google', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ idToken })
        });

        const payload = await authResponse.json().catch(() => ({}));
        if (!authResponse.ok) {
            throw new Error(payload?.error || 'Authentication failed');
        }

        authState.authenticated = true;
        authState.account = payload.account
            ? { ...payload.account, ownedWeapons: normalizeOwnedWeapons(payload.account.ownedWeapons) }
            : null;
        authState.initialized = true;
        authState.mode = 'account';
        playerSettings = loadCharacterSettings();
        loadoutDraft = sanitizePlayerSettings(playerSettings);
        socket.reconnect();
        updateRegisterUi();
        updateMainMenuTopActions();
        updateAccountSummaryUi();
        refreshOwnedWeaponState();
        showMainMenu();

        Toastify({
            text: 'Signed in successfully.',
            duration: 2200,
            gravity: 'top',
            position: 'right'
        }).showToast();
    } catch (error) {
        Toastify({
            text: escapeHtml(error.message || 'Authentication failed'),
            duration: 3200,
            gravity: 'top',
            position: 'right'
        }).showToast();
    }
}

async function initializeAuth() {
    updateRegisterUi();

    try {
        const [config, session] = await Promise.all([fetchAuthConfig(), fetchCurrentSession()]);
        authState.googleClientId = typeof config.googleClientId === 'string' ? config.googleClientId : '';
        authState.authenticated = Boolean(session?.authenticated && session?.account);
        authState.account = session?.account
            ? { ...session.account, ownedWeapons: normalizeOwnedWeapons(session.account.ownedWeapons) }
            : null;
        authState.initialized = true;
        authState.mode = authState.authenticated ? 'account' : null;
        playerSettings = loadCharacterSettings();
        loadoutDraft = sanitizePlayerSettings(playerSettings);
        updateRegisterUi();
        updateMainMenuTopActions();
        updateAccountSummaryUi();
        refreshOwnedWeaponState();
        renderGoogleSignInButton();
        if (!authState.googleButtonRendered) {
            scheduleGoogleButtonRenderAttempts();
        }

        if (authState.authenticated) {
            showMainMenu();
        } else {
            showAuthChoiceMenu();
        }
    } catch (_error) {
        authState.initialized = true;
        authState.authenticated = false;
        authState.account = null;
        authState.mode = null;
        updateRegisterUi();
        updateMainMenuTopActions();
        updateAccountSummaryUi();
        refreshOwnedWeaponState();
        Toastify({
            text: 'Auth setup unavailable. Check server config.',
            duration: 3500,
            gravity: 'top',
            position: 'right'
        }).showToast();
        showAuthChoiceMenu();
    }
}

function continueAsGuest() {
    authState.mode = 'guest';
    updateMainMenuTopActions();
    updateAccountSummaryUi();
    refreshOwnedWeaponState();
    showMainMenu();
}

function showAuthChoiceMenu() {
    hideAllMenus();
    gameScreen.style.display = 'none';
    if (authChoiceMenu) {
        authChoiceMenu.style.display = 'block';
    }
    if (menuLink) {
        menuLink.style.display = 'none';
    }
    hideLoadoutTooltip();
}

function showRegisterMenu() {
    hideAllMenus();
    if (registerMenu) {
        registerMenu.style.display = 'block';
    }
    updateRegisterUi();
    renderGoogleSignInButton();
    if (!authState.googleButtonRendered) {
        scheduleGoogleButtonRenderAttempts();
    }
}

function showDisplayNameMenu() {
    if (authState.mode !== 'account' || !authState.account) {
        return;
    }

    hideAllMenus();
    if (displayNameMenu) {
        displayNameMenu.style.display = 'block';
    }

    if (displayNameInput) {
        displayNameInput.value = authState.account.displayName || '';
        const locked = hasDisplayName();
        displayNameInput.disabled = locked;
        if (!locked) {
            displayNameInput.focus();
            displayNameInput.select();
        }
    }

    if (displayNameStatus) {
        if (hasDisplayName()) {
            displayNameStatus.textContent = 'Display name is already set and cannot be changed.';
        } else {
            displayNameStatus.textContent = 'Display name is required to continue.';
        }
    }
}

async function saveDisplayName() {
    if (authState.mode !== 'account') {
        return;
    }

    if (hasDisplayName()) {
        if (displayNameStatus) {
            displayNameStatus.textContent = 'Display name is already set and cannot be changed.';
        }
        return;
    }

    const nextName = normalizeDisplayName(displayNameInput?.value || '');
    if (!isValidDisplayName(nextName)) {
        if (displayNameStatus) {
            displayNameStatus.textContent = 'Invalid name. Use 3-24 chars: letters, numbers, spaces, _ or -';
        }
        return;
    }

    if (displayNameStatus) {
        displayNameStatus.textContent = 'Saving...';
    }

    let timeout = null;
    try {
        const controller = new AbortController();
        timeout = setTimeout(() => controller.abort(), 10000);
        const response = await fetch('/api/account/display-name', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ displayName: nextName }),
            signal: controller.signal
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(payload?.error || 'Failed to save display name');
        }

        if (payload?.account) {
            authState.account = {
                ...payload.account,
                ownedWeapons: normalizeOwnedWeapons(payload.account.ownedWeapons)
            };
        }
        updateRegisterUi();
        updateMainMenuTopActions();
        updateAccountSummaryUi();

        if (displayNameStatus) {
            displayNameStatus.textContent = 'Saved.';
        }

        Toastify({
            text: 'Display name updated.',
            duration: 2200,
            gravity: 'top',
            position: 'right'
        }).showToast();
        showMainMenu();
    } catch (error) {
        if (displayNameStatus) {
            displayNameStatus.textContent = error?.name === 'AbortError'
                ? 'Request timed out. Please try again.'
                : (error.message || 'Failed to save display name');
        }
    } finally {
        if (timeout) {
            clearTimeout(timeout);
        }
    }
}

async function logoutToAuthChoice() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
    } catch (_error) {
        // local logout state still applies.
    }

    authState.mode = null;
    authState.authenticated = false;
    authState.account = null;
    socket.reconnect();
    updateRegisterUi();
    updateMainMenuTopActions();
    updateAccountSummaryUi();
    refreshOwnedWeaponState();
    showAuthChoiceMenu();
}

async function purchaseShopWeapon(weaponType) {
    const listing = SHOP_WEAPONS[weaponType];
    if (!listing) {
        return;
    }

    if (authState.mode !== 'account' || !authState.account) {
        Toastify({
            text: 'Sign in to buy shop weapons.',
            duration: 2200,
            gravity: 'top',
            position: 'right'
        }).showToast();
        return;
    }

    if (isWeaponUnlocked(weaponType)) {
        return;
    }

    try {
        const response = await fetch('/api/shop/purchase-weapon', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ weaponType })
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(payload?.error || 'Purchase failed');
        }

        authState.account = payload.account
            ? { ...payload.account, ownedWeapons: normalizeOwnedWeapons(payload.account.ownedWeapons) }
            : authState.account;
        updateAccountSummaryUi();
        refreshOwnedWeaponState();
        soundManager.play('chaching', 0.28);

        Toastify({
            text: `${listing.name} purchased.`,
            duration: 2200,
            gravity: 'top',
            position: 'right'
        }).showToast();
    } catch (error) {
        Toastify({
            text: escapeHtml(error.message || 'Purchase failed'),
            duration: 2800,
            gravity: 'top',
            position: 'right'
        }).showToast();
    }
}

function setupMovementStick() {
    if (!moveStick || !moveStickKnob) {
        return;
    }

    const release = () => {
        mobileControlState.movePointerId = null;
        setMovementDirection('up', false);
        setMovementDirection('down', false);
        setMovementDirection('left', false);
        setMovementDirection('right', false);
        positionStickKnob(moveStickKnob, 0, 0);
    };

    const updateFromEvent = (event) => {
        const rect = moveStick.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = event.clientX - centerX;
        const dy = event.clientY - centerY;
        const maxDistance = rect.width * 0.34;
        const distance = Math.hypot(dx, dy);
        const scale = distance > maxDistance && distance > 0 ? maxDistance / distance : 1;
        const clampedX = dx * scale;
        const clampedY = dy * scale;
        const normalizedX = clampedX / maxDistance;
        const normalizedY = clampedY / maxDistance;
        const threshold = 0.34;

        positionStickKnob(moveStickKnob, clampedX, clampedY);
        setMovementDirection('left', normalizedX < -threshold);
        setMovementDirection('right', normalizedX > threshold);
        setMovementDirection('up', normalizedY < -threshold);
        setMovementDirection('down', normalizedY > threshold);
    };

    moveStick.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        mobileControlState.movePointerId = event.pointerId;
        moveStick.setPointerCapture(event.pointerId);
        updateFromEvent(event);
    });

    moveStick.addEventListener('pointermove', (event) => {
        if (event.pointerId !== mobileControlState.movePointerId) {
            return;
        }
        event.preventDefault();
        updateFromEvent(event);
    });

    moveStick.addEventListener('pointerup', (event) => {
        if (event.pointerId !== mobileControlState.movePointerId) {
            return;
        }
        event.preventDefault();
        release();
    });

    moveStick.addEventListener('pointercancel', (event) => {
        if (event.pointerId !== mobileControlState.movePointerId) {
            return;
        }
        event.preventDefault();
        release();
    });
}

function setupAimStick() {
    if (!aimStick || !aimStickKnob) {
        return;
    }

    const release = () => {
        mobileControlState.aimPointerId = null;
        positionStickKnob(aimStickKnob, 0, 0);
        stopMobileFire();
    };

    const updateFromEvent = (event) => {
        const rect = aimStick.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = event.clientX - centerX;
        const dy = event.clientY - centerY;
        const maxDistance = rect.width * 0.34;
        const distance = Math.hypot(dx, dy);
        const scale = distance > maxDistance && distance > 0 ? maxDistance / distance : 1;
        const clampedX = dx * scale;
        const clampedY = dy * scale;
        positionStickKnob(aimStickKnob, clampedX, clampedY);

        if (Math.hypot(clampedX, clampedY) > 5) {
            const angle = Math.atan2(clampedY, clampedX);
            localAimAngle = angle;
            socket.emit('changeAngle', angle);
        }
    };

    aimStick.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        mobileControlState.aimPointerId = event.pointerId;
        aimStick.setPointerCapture(event.pointerId);
        startMobileFire();
        updateFromEvent(event);
    });

    aimStick.addEventListener('pointermove', (event) => {
        if (event.pointerId !== mobileControlState.aimPointerId) {
            return;
        }
        event.preventDefault();
        updateFromEvent(event);
    });

    aimStick.addEventListener('pointerup', (event) => {
        if (event.pointerId !== mobileControlState.aimPointerId) {
            return;
        }
        event.preventDefault();
        release();
    });

    aimStick.addEventListener('pointercancel', (event) => {
        if (event.pointerId !== mobileControlState.aimPointerId) {
            return;
        }
        event.preventDefault();
        release();
    });
}

function setupMobileActionButtons() {
    bindMobileHoldKeyButton(mobileReloadButton, MOBILE_INPUT_KEYS.reload);
    bindMobileHoldKeyButton(mobileSwapButton, MOBILE_INPUT_KEYS.swap);
    bindMobileHoldKeyButton(mobileAbilityButton, MOBILE_INPUT_KEYS.ability);
    bindMobileHoldKeyButton(mobileSharedButton, MOBILE_INPUT_KEYS.shared);
    bindMobileHoldKeyButton(mobilePassiveButton, MOBILE_INPUT_KEYS.passive);
}

function startMobileFire() {
    if (mobileControlState.firePressed) {
        return;
    }
    mobileControlState.firePressed = true;
    socket.emit('mouseDown', 0);
}

function stopMobileFire() {
    if (!mobileControlState.firePressed) {
        return;
    }
    mobileControlState.firePressed = false;
    socket.emit('mouseUp', 0);
}

function setupMobileQuitButton() {
    if (!mobileQuitButton) {
        return;
    }

    mobileQuitButton.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        requestLeaveMatch();
    });
}

function setupDesktopLeaveButton() {
    if (!leaveMatchButton) {
        return;
    }

    leaveMatchButton.addEventListener('click', () => {
        requestLeaveMatch();
    });
}

function requestLeaveMatch() {
    if (!gameActive) {
        return;
    }

    const shouldQuit = window.confirm('Quit current match and return to the main menu?');
    if (!shouldQuit) {
        return;
    }

    clearVirtualControls();
    clearLocalInputState();
    clearAmbienceStartRetry();
    soundManager.stop('ambience');
    const shouldAwaitMatchResult = gameMode === '1v1' ||
        gameMode === '2v2' ||
        (
            isFreeForAllMode() &&
            (
                freeForAllSessionProgress.kills > 0 ||
                freeForAllSessionProgress.coins > 0
            )
        );
    socket.emit('leaveMatch');

    gameActive = false;
    updateMobileHudVisibility();
    if (forfeitReturnTimeout) {
        clearTimeout(forfeitReturnTimeout);
    }
    if (!shouldAwaitMatchResult) {
        showMainMenu();
        return;
    }
    // Fallback in case the matchEnded packet is missed.
    forfeitReturnTimeout = setTimeout(() => {
        showMainMenu();
    }, 3000);
}

function bindMobileHoldKeyButton(button, keyCode) {
    if (!button) {
        return;
    }

    let pointerId = null;

    button.addEventListener('pointerdown', (event) => {
        if (pointerId !== null) {
            return;
        }
        event.preventDefault();
        pointerId = event.pointerId;
        button.setPointerCapture(event.pointerId);
        setVirtualKey(keyCode, true);
    });

    const release = (event) => {
        if (pointerId === null || event.pointerId !== pointerId) {
            return;
        }
        event.preventDefault();
        pointerId = null;
        setVirtualKey(keyCode, false);
    };

    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
}

function positionStickKnob(knob, x, y) {
    if (!knob) {
        return;
    }
    knob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
}

function setMovementDirection(direction, pressed) {
    if (mobileControlState.movementDirections[direction] === pressed) {
        return;
    }
    mobileControlState.movementDirections[direction] = pressed;
    setVirtualKey(MOBILE_INPUT_KEYS[direction], pressed);
}

function setVirtualKey(keyCode, pressed) {
    if (pressed) {
        if (virtualPressedKeys.has(keyCode)) {
            return;
        }
        virtualPressedKeys.add(keyCode);
        updateLocalInputState(keyCode, true);
        socket.emit('keydown', keyCode);
        return;
    }

    if (!virtualPressedKeys.has(keyCode)) {
        return;
    }
    virtualPressedKeys.delete(keyCode);
    updateLocalInputState(keyCode, false);
    socket.emit('keyup', keyCode);
}

function clearVirtualControls() {
    for (const keyCode of Array.from(virtualPressedKeys)) {
        setVirtualKey(keyCode, false);
    }

    stopMobileFire();

    positionStickKnob(moveStickKnob, 0, 0);
    positionStickKnob(aimStickKnob, 0, 0);
    mobileControlState.movePointerId = null;
    mobileControlState.aimPointerId = null;
    mobileControlState.movementDirections.up = false;
    mobileControlState.movementDirections.down = false;
    mobileControlState.movementDirections.left = false;
    mobileControlState.movementDirections.right = false;
}

function updateMobileHudVisibility() {
    if (!mobileHud) {
        return;
    }

    const visible = isTouchDevice && gameActive;
    mobileHud.style.display = visible ? 'block' : 'none';
}

function clearAmbienceStartRetry() {
    if (!ambienceStartRetryTimer) {
        return;
    }
    clearTimeout(ambienceStartRetryTimer);
    ambienceStartRetryTimer = null;
}

function isSearchingForMatch() {
    return Boolean(searchingMenu) && searchingMenu.style.display === 'block';
}

function notifyServerOfPageExit() {
    if (pageExitCleanupSent) {
        return;
    }
    pageExitCleanupSent = true;

    try {
        if (socket.ws?.readyState === WebSocket.OPEN) {
            if (gameActive) {
                socket.emit('leaveMatch');
            } else if (isSearchingForMatch()) {
                socket.emit('cancelSearch');
            }
        }
        socket.close(1000, 'page exit');
    } catch (_error) {
        // Ignore page exit cleanup failures.
    }
}

function startMatchAmbience() {
    clearAmbienceStartRetry();

    let attemptCount = 0;
    const tryStart = () => {
        if (!gameActive) {
            clearAmbienceStartRetry();
            return;
        }

        soundManager.playLoop('ambience', AMBIENCE_VOLUME);
        if (soundManager.isLoopPlaying('ambience')) {
            clearAmbienceStartRetry();
            return;
        }

        attemptCount += 1;
        if (attemptCount >= AMBIENCE_START_MAX_ATTEMPTS) {
            clearAmbienceStartRetry();
            return;
        }

        ambienceStartRetryTimer = setTimeout(tryStart, AMBIENCE_START_RETRY_MS);
    };

    tryStart();
}

function main() {
    if (mainInitialized) {
        return;
    }
    mainInitialized = true;

    canvas.width = 800;
    canvas.height = 600;

    socket.on('gameState', handleGameState);
    socket.on('gameStarting', () => {
        hideAllMenus();
        gameScreen.style.display = 'flex';
        gameActive = true;
        startMatchAmbience();
        resetChatForRoom();
        updateMobileHudVisibility();
        matchEndOverlay.classList.remove('show');
        matchEndCard.classList.remove('victory', 'defeat');
        scorePopupShownAt = Date.now();
        lastScoreSignature = '';
        resetClientCache();
    });
    socket.on('kill', handleKill);
    socket.on('opponentLeft', handleOpponentLeft);
    socket.on('playerLeft', handlePlayerLeft);
    socket.on('reload', handleReload);
    socket.on('hit', handleHit);
    socket.on('gotHit', handleGotHit);
    socket.on('firedWeapon', handleFiredWeapon);
    socket.on('specialAbility', handleSpecialAbility);
    socket.on('sharedAbility', handleSharedAbility);
    socket.on('kingAuraPulse', handleKingAuraPulse);
    socket.on('reaverZap', handleReaverZap);
    socket.on('pickupCollected', handlePickupCollected);
    socket.on('swapWeapons', handleSwapWeapons);
    socket.on('combatText', handleCombatText);
    socket.on('chatMessage', handleChatMessage);
    socket.on('matchEnded', handleMatchEnded);
    socket.on('matchClosed', handleMatchClosed);
    socket.on('error', handleServerError);

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('pagehide', notifyServerOfPageExit);
    window.addEventListener('beforeunload', notifyServerOfPageExit);
    window.addEventListener('pageshow', () => {
        pageExitCleanupSent = false;
        if (socket.ws?.readyState === WebSocket.CLOSING || socket.ws?.readyState === WebSocket.CLOSED) {
            socket.reconnect();
        }
    });

    ensureNetDebugOverlayElement();
    startRenderLoop();
}

function hideAllMenus() {
    if (authChoiceMenu) {
        authChoiceMenu.style.display = 'none';
    }
    if (registerMenu) {
        registerMenu.style.display = 'none';
    }
    if (displayNameMenu) {
        displayNameMenu.style.display = 'none';
    }
    menu.style.display = 'none';
    characterMenu.style.display = 'none';
    if (shopMenu) {
        shopMenu.style.display = 'none';
    }
    searchingMenu.style.display = 'none';
    controlsMenu.style.display = 'none';
    if (accountSummary) {
        accountSummary.style.display = 'none';
    }
    if (menuLink) {
        menuLink.style.display = 'none';
    }
}

function showMainMenu() {
    if (!authState.mode) {
        showAuthChoiceMenu();
        return;
    }

    if (authState.mode === 'account' && !hasDisplayName()) {
        showDisplayNameMenu();
        return;
    }

    hideAllMenus();
    gameScreen.style.display = 'none';
    setMainMenuView('main');
    menu.style.display = 'block';
    updateMainMenuTopActions();
    updateAccountSummaryUi();
    if (menuLink) {
        menuLink.style.display = 'flex';
    }
    gameActive = false;
    clearVirtualControls();
    updateMobileHudVisibility();
    resetChatForRoom();
    gameMode = '1v1';
    soundManager.stop('laser');
    soundManager.stop('flame');
    clearAmbienceStartRetry();
    soundManager.stop('ambience');
    matchEndOverlay.classList.remove('show');
    matchEndCard.classList.remove('victory', 'defeat');
    if (matchEndSubtitle) {
        matchEndSubtitle.textContent = 'Returning to menu...';
    }
    if (matchEndTimeout) {
        clearTimeout(matchEndTimeout);
        matchEndTimeout = null;
    }

    fetchModeStatus();
}

function showPlayMenu() {
    hideAllMenus();
    gameScreen.style.display = 'none';
    menu.style.display = 'block';
    setMainMenuView('play');
    updateMainMenuTopActions();
    updateAccountSummaryUi();
    if (menuLink) {
        menuLink.style.display = 'flex';
    }
    resetChatForRoom();
    fetchModeStatus();
}

function showCharacter() {
    hideAllMenus();
    characterMenu.style.display = 'block';
    refreshOwnedWeaponState();
    loadoutDraft = sanitizePlayerSettings(playerSettings);
    enforceDistinctWeapons();
    syncLoadoutSelectionUI();
    showEquipmentTab('weapon');
}

function showShop() {
    hideAllMenus();
    if (shopMenu) {
        shopMenu.style.display = 'block';
    }
    updateAccountSummaryUi();
    refreshOwnedWeaponState();
    showShopTab('weapons');
    if (menuLink) {
        menuLink.style.display = 'flex';
    }
}

function showShopTab(tabName) {
    const tabs = {
        weapons: { tabId: 'shopTabWeapons', panelId: 'shopPanelWeapons' }
    };

    Object.values(tabs).forEach((tabInfo) => {
        document.getElementById(tabInfo.tabId)?.classList.remove('active');
        document.getElementById(tabInfo.panelId)?.classList.remove('active');
    });

    const selectedTab = tabs[tabName];
    if (!selectedTab) {
        return;
    }

    document.getElementById(selectedTab.tabId)?.classList.add('active');
    document.getElementById(selectedTab.panelId)?.classList.add('active');
}

function showControls() {
    hideAllMenus();
    controlsMenu.style.display = 'block';
}

function showSearching() {
    hideAllMenus();
    searchingMenu.style.display = 'block';
    resetChatForRoom();
}

function getFallbackSecondary(primaryWeaponType) {
    const fallbackOrder = ['pistol', 'm4', 'shotgun', 'sniper', 'laser', 'taser', 'rocket', 'bubble', 'flamethrower'];
    return fallbackOrder.find((weapon) => weapon !== primaryWeaponType && isWeaponUnlocked(weapon)) || 'pistol';
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

function getLoadoutTooltipData(type, value) {
    if (!value) {
        return null;
    }

    if (type === 'character') {
        return CHARACTER_LOADOUT_INFO[value] || null;
    }

    if (type === 'weapon' || type === 'secondary') {
        return WEAPON_LOADOUT_INFO[value] || null;
    }

    if (type === 'sharedAbility') {
        return SHARED_ABILITY_LOADOUT_INFO[value] || null;
    }

    return null;
}

function getLoadoutTooltipElement() {
    if (loadoutTooltipElement) {
        return loadoutTooltipElement;
    }

    const tooltip = document.createElement('div');
    tooltip.id = 'loadoutTooltip';
    tooltip.className = 'loadout-tooltip';
    tooltip.setAttribute('aria-hidden', 'true');
    tooltip.style.left = '-9999px';
    tooltip.style.top = '-9999px';
    document.body.appendChild(tooltip);
    loadoutTooltipElement = tooltip;
    return loadoutTooltipElement;
}

function renderLoadoutTooltipPreview(preview, title) {
    if (!preview || typeof preview !== 'object') {
        return `<div class="loadout-tooltip-glyph">${escapeHtml((title || '?').slice(0, 2).toUpperCase())}</div>`;
    }

    if (preview.type === 'playerImage') {
        const image = playerImages[preview.key];
        if (image?.src) {
            return `<img class="loadout-tooltip-preview-image" src="${escapeHtml(image.src)}" alt="${escapeHtml(title || '')}" />`;
        }
    }

    if (preview.type === 'obstacleImage') {
        const image = obstacleImages[preview.key];
        if (image?.src) {
            return `<img class="loadout-tooltip-preview-image" src="${escapeHtml(image.src)}" alt="${escapeHtml(title || '')}" />`;
        }
    }

    if (preview.type === 'ring') {
        return '<div class="loadout-tooltip-ring"></div>';
    }

    if (preview.type === 'glyph') {
        return `<div class="loadout-tooltip-glyph">${escapeHtml(preview.label || '')}</div>`;
    }

    return `<div class="loadout-tooltip-glyph">${escapeHtml((title || '?').slice(0, 2).toUpperCase())}</div>`;
}

function createLoadoutTooltipMarkup(data) {
    if (!data) {
        return '';
    }

    const statsMarkup = Array.isArray(data.stats) && data.stats.length > 0
        ? data.stats.map((stat) => (
            `<div class="loadout-tooltip-stat-row">
                <span class="loadout-tooltip-stat-label">${escapeHtml(stat.label || '')}</span>
                <span class="loadout-tooltip-stat-value">${escapeHtml(stat.value || '')}</span>
            </div>`
        )).join('')
        : '';

    const descriptionMarkup = data.description
        ? `<div class="loadout-tooltip-description">${escapeHtml(data.description)}</div>`
        : '';

    return `
        <div class="loadout-tooltip-header">
            <div class="loadout-tooltip-preview">
                ${renderLoadoutTooltipPreview(data.preview, data.title)}
            </div>
            <div class="loadout-tooltip-heading">
                <div class="loadout-tooltip-title">${escapeHtml(data.title || '')}</div>
                <div class="loadout-tooltip-subtitle">${escapeHtml(data.subtitle || '')}</div>
            </div>
        </div>
        ${descriptionMarkup}
        <div class="loadout-tooltip-stats">${statsMarkup}</div>
    `;
}

function positionLoadoutTooltip() {
    const tooltip = getLoadoutTooltipElement();
    const offset = 14;
    tooltip.style.left = `${mouseX + offset}px`;
    tooltip.style.top = `${mouseY + offset}px`;
    return true;
}

function showLoadoutTooltipForButton(button, anchorX = null, anchorY = null) {
    if (!button) {
        return;
    }

    const data = getLoadoutTooltipData(button.dataset.type, button.dataset.value);
    if (!data) {
        hideLoadoutTooltip();
        return;
    }

    const tooltip = getLoadoutTooltipElement();
    tooltip.innerHTML = createLoadoutTooltipMarkup(data);

    const buttonRect = button.getBoundingClientRect();
    const fallbackX = buttonRect.right;
    const fallbackY = buttonRect.top + (buttonRect.height / 2);
    const hasPointerAnchor = Number.isFinite(Number(anchorX)) && Number.isFinite(Number(anchorY));
    const hasGlobalPointerAnchor =
        Number.isFinite(mouseX) &&
        Number.isFinite(mouseY);
    const canReusePointerAnchor =
        Number.isFinite(loadoutTooltipLastPointerX) &&
        Number.isFinite(loadoutTooltipLastPointerY);
    const nextX = hasPointerAnchor
        ? Number(anchorX)
        : (hasGlobalPointerAnchor
            ? mouseX
            : (canReusePointerAnchor ? loadoutTooltipLastPointerX : fallbackX));
    const nextY = hasPointerAnchor
        ? Number(anchorY)
        : (hasGlobalPointerAnchor
            ? mouseY
            : (canReusePointerAnchor ? loadoutTooltipLastPointerY : fallbackY));
    const positioned = positionLoadoutTooltip();
    if (!positioned) {
        hideLoadoutTooltip();
        return;
    }
    tooltip.classList.add('show');
    tooltip.setAttribute('aria-hidden', 'false');
    loadoutTooltipActiveButton = button;
}

function hideLoadoutTooltip() {
    if (!loadoutTooltipElement) {
        loadoutTooltipActiveButton = null;
        return;
    }

    loadoutTooltipElement.classList.remove('show');
    loadoutTooltipElement.setAttribute('aria-hidden', 'true');
    loadoutTooltipActiveButton = null;
}

function setupLoadoutTooltips() {
    if (loadoutTooltipsBound || !characterMenu) {
        return;
    }

    const optionButtons = characterMenu.querySelectorAll('.equip-option');
    if (optionButtons.length === 0) {
        return;
    }

    const trackPointerPosition = (event) => {
        const x = Number(event?.clientX);
        const y = Number(event?.clientY);
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            return;
        }
        mouseX = x;
        mouseY = y;
    };

    document.addEventListener('pointermove', trackPointerPosition, { passive: true });
    document.addEventListener('mousemove', trackPointerPosition, { passive: true });
    document.addEventListener('pointerdown', trackPointerPosition, { passive: true });
    document.addEventListener('mousedown', trackPointerPosition, { passive: true });

    optionButtons.forEach((button) => {
        button.addEventListener('pointerenter', (event) => {
            if (event.pointerType === 'touch') {
                return;
            }
            mouseX = event.clientX;
            mouseY = event.clientY;
            showLoadoutTooltipForButton(button, event.clientX, event.clientY);
        });

        button.addEventListener('pointermove', (event) => {
            if (event.pointerType === 'touch' || loadoutTooltipActiveButton !== button) {
                return;
            }

            positionLoadoutTooltip();
        });

        button.addEventListener('pointerdown', (event) => {
            if (event.pointerType === 'touch') {
                return;
            }
            mouseX = event.clientX;
            mouseY = event.clientY;
            loadoutTooltipLastPointerX = event.clientX;
            loadoutTooltipLastPointerY = event.clientY;
            showLoadoutTooltipForButton(button, event.clientX, event.clientY);
        });

        button.addEventListener('click', (event) => {
            mouseX = event.clientX;
            mouseY = event.clientY;
            showLoadoutTooltipForButton(button, event.clientX, event.clientY);
        });

        button.addEventListener('pointerleave', () => {
            if (loadoutTooltipActiveButton === button) {
                hideLoadoutTooltip();
            }
        });

        button.addEventListener('focus', () => {
            showLoadoutTooltipForButton(button);
        });

        button.addEventListener('blur', () => {
            if (loadoutTooltipActiveButton === button) {
                hideLoadoutTooltip();
            }
        });
    });

    window.addEventListener('resize', hideLoadoutTooltip);
    loadoutTooltipsBound = true;
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

function syncWeaponOwnershipUi() {
    const optionButtons = document.querySelectorAll('.equip-option[data-type="weapon"], .equip-option[data-type="secondary"]');
    optionButtons.forEach((button) => {
        const weaponType = button.dataset.value;
        button.style.display = isWeaponUnlocked(weaponType) ? '' : 'none';
    });
}

function syncShopUi() {
    Object.entries(SHOP_WEAPONS).forEach(([weaponType, config]) => {
        if (!config.card || !config.status || !config.button) {
            return;
        }

        const owned = isWeaponUnlocked(weaponType);
        const signedIn = authState.mode === 'account' && authState.account;
        const currentBux = Number(authState.account?.bux || 0);
        const canAfford = currentBux >= config.price;

        config.card.classList.toggle('owned', owned);

        if (owned) {
            config.status.textContent = 'Purchased';
            config.button.textContent = 'Owned';
            config.button.disabled = true;
            return;
        }

        if (!signedIn) {
            config.status.textContent = 'Sign in to purchase';
            config.button.textContent = 'Buy';
            config.button.disabled = true;
            return;
        }

        config.status.textContent = canAfford ? 'Ready to purchase' : `Need ${config.price - currentBux} more bux`;
        config.button.textContent = 'Buy';
        config.button.disabled = !canAfford;
    });
}

function refreshOwnedWeaponState() {
    playerSettings = sanitizePlayerSettings(playerSettings);
    loadoutDraft = sanitizePlayerSettings(loadoutDraft);
    enforceDistinctWeapons();
    syncWeaponOwnershipUi();
    syncLoadoutSelectionUI();
    syncShopUi();
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

function renderPatchNotes() {
    if (!patchNotesList) return;

    const source = window.PATCH_NOTES || {};
    const entries = Array.isArray(source)
        ? source
        : (Array.isArray(source.entries) ? source.entries : []);
    const version = typeof source.version === 'string' ? source.version.trim() : '';

    patchNotesList.innerHTML = '';

    const safeEntries = entries
        .map((entry) => `${entry ?? ''}`.trim())
        .filter(Boolean);

    if (safeEntries.length === 0) {
        const item = document.createElement('li');
        item.textContent = 'Add notes in client/patchNotes.js';
        patchNotesList.appendChild(item);
    } else {
        for (const entry of safeEntries) {
            const item = document.createElement('li');
            item.textContent = entry;
            patchNotesList.appendChild(item);
        }
    }

    if (patchNotesVersion) {
        patchNotesVersion.textContent = version;
    }
}

function initializeMenuBackdrop() {
    if (!menuBackdropCtx || menuBackdropInitialized) return;
    menuBackdropInitialized = true;
    resizeMenuBackdropCanvas();
    spawnMenuBackdropActors();
    window.addEventListener('resize', resizeMenuBackdropCanvas);
    menuBackdropAnimationId = requestAnimationFrame(animateMenuBackdrop);
}

function resizeMenuBackdropCanvas() {
    if (!menuBackdropCanvas) return;
    menuBackdropCanvas.width = window.innerWidth;
    menuBackdropCanvas.height = window.innerHeight;
}

function spawnMenuBackdropActors() {
    if (!menuBackdropCanvas) return;

    const width = menuBackdropCanvas.width || window.innerWidth;
    const height = menuBackdropCanvas.height || window.innerHeight;
    menuBackdropActors = [];

    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const actorCount = reducedMotion ? 4 : MENU_BACKDROP_ACTOR_COUNT;

    for (let i = 0; i < actorCount; i++) {
        const spriteName = MENU_BACKDROP_SPRITES[Math.floor(Math.random() * MENU_BACKDROP_SPRITES.length)];
        const speed = 22 + Math.random() * 34;
        const direction = Math.random() * Math.PI * 2;
        const size = 48 + Math.random() * 28;

        menuBackdropActors.push({
            spriteName,
            x: Math.random() * width,
            y: Math.random() * height,
            vx: Math.cos(direction) * speed,
            vy: Math.sin(direction) * speed,
            size,
            bobOffset: Math.random() * Math.PI * 2
        });
    }
}

function animateMenuBackdrop(timestamp) {
    menuBackdropAnimationId = requestAnimationFrame(animateMenuBackdrop);
    if (!menuBackdropCtx || !menuBackdropCanvas) return;

    const frameInterval = 1000 / MENU_BACKDROP_FPS;
    if (menuBackdropLastDrawTime && (timestamp - menuBackdropLastDrawTime) < frameInterval) {
        return;
    }
    menuBackdropLastDrawTime = timestamp;

    const deltaSeconds = Math.min(
        0.04,
        menuBackdropLastTime ? (timestamp - menuBackdropLastTime) / 1000 : 0.016
    );
    menuBackdropLastTime = timestamp;

    const width = menuBackdropCanvas.width;
    const height = menuBackdropCanvas.height;
    menuBackdropCtx.clearRect(0, 0, width, height);

    if (gameActive) {
        return;
    }

    const margin = 76;
    const time = timestamp * 0.001;

    menuBackdropCtx.save();
    menuBackdropCtx.globalAlpha = 0.28;

    for (const actor of menuBackdropActors) {
        actor.x += actor.vx * deltaSeconds;
        actor.y += actor.vy * deltaSeconds;

        if (actor.x < -margin || actor.x > width + margin) {
            actor.vx *= -1;
        }
        if (actor.y < -margin || actor.y > height + margin) {
            actor.vy *= -1;
        }

        actor.x = Math.max(-margin, Math.min(width + margin, actor.x));
        actor.y = Math.max(-margin, Math.min(height + margin, actor.y));

        const bob = Math.sin(time * 1.4 + actor.bobOffset) * 2.2;
        const drawX = actor.x;
        const drawY = actor.y + bob;
        const angle = Math.atan2(actor.vy, actor.vx);
        const sprite = playerImages[actor.spriteName];

        if (!sprite || !sprite.complete) continue;

        menuBackdropCtx.save();
        menuBackdropCtx.translate(drawX, drawY);
        menuBackdropCtx.rotate(angle);
        menuBackdropCtx.drawImage(sprite, -actor.size / 2, -actor.size / 2, actor.size, actor.size);
        menuBackdropCtx.restore();
    }

    menuBackdropCtx.restore();

    menuBackdropCtx.fillStyle = 'rgba(9, 15, 26, 0.22)';
    menuBackdropCtx.fillRect(0, 0, width, height);
}

function selectEquip(type, value) {
    if ((type === 'weapon' || type === 'secondary') && !isWeaponUnlocked(value)) {
        Toastify({
            text: 'Purchase that weapon in the shop first.',
            duration: 2200,
            gravity: "top",
            position: "right"
        }).showToast();
        return;
    }

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
    loadoutDraft = sanitizePlayerSettings(loadoutDraft);
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

function isFreeForAllMode(modeValue = gameMode) {
    return modeValue === 'ffa' || modeValue === 'freeForAll';
}

function cancelSearch() {
    // Cancel any ongoing search
    socket.emit('cancelSearch');
    clearVirtualControls();
    showMainMenu();
}

function handleGameState(deltaData) {
    if(!gameActive) return;

    const isFullState = deltaData?.isFullState === true || !deltaData?.frameNumber;
    const frameNumber = Number(deltaData?.frameNumber);
    if (!isFullState && Number.isFinite(frameNumber)) {
        if (
            Number.isFinite(lastProcessedGameStateFrameNumber) &&
            frameNumber <= lastProcessedGameStateFrameNumber
        ) {
            return;
        }
        lastProcessedGameStateFrameNumber = frameNumber;
    } else if (isFullState) {
        lastProcessedGameStateFrameNumber = Number.isFinite(frameNumber) ? frameNumber : null;
    }

    // Apply delta updates to local game state
    applyDeltaToGameState(deltaData);

    pushStateSnapshot(gameState, deltaData?.frameNumber);
}

function resetClientCache() {
    gameState.players = [];
    gameState.bullets = [];
    gameState.grenades = [];
    gameState.pickups = [];
    gameState.obstacles = [];
    gameState.teamLives = null;
    latestTeamLives = null;
    freeForAllSessionProgress.kills = 0;
    freeForAllSessionProgress.coins = 0;
    clientGameStateCache.players.clear();
    clientGameStateCache.bullets.clear();
    clientGameStateCache.grenades.clear();
    clientGameStateCache.pickups.clear();
    clientGameStateCache.obstacles.clear();
    combatTexts.length = 0;
    explosiveEffects.length = 0;
    snapshotBuffer = [];
    lastProcessedGameStateFrameNumber = null;
    snapshotTiming.lastReceivedAt = null;
    snapshotTiming.intervalEwma = 1000 / 30;
    snapshotTiming.jitterEwma = 0;
    localPredictionState = null;
    lastLocalPredictionTimestamp = null;
    clearLocalInputState();
}

function startRenderLoop() {
    if (renderLoopId !== null) {
        return;
    }

    const step = (timestamp) => {
        renderLoopId = requestAnimationFrame(step);

        if (typeof timestamp === 'number') {
            if (typeof lastRenderLoopTimestamp === 'number') {
                const frameMs = Math.max(1, timestamp - lastRenderLoopTimestamp);
                const currentFps = 1000 / frameMs;
                renderFpsEwma = lerp(renderFpsEwma, currentFps, 0.1);
            }
            lastRenderLoopTimestamp = timestamp;
        }

        if (!gameActive) {
            return;
        }

        const renderState = getInterpolatedRenderState();
        if (!renderState) {
            return;
        }

        applyLocalPlayerPrediction(renderState, timestamp);
        applyProjectilePresentationPrediction(renderState, timestamp);
        draw(renderState);
    };

    renderLoopId = requestAnimationFrame(step);
}

function getNowMs() {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        return performance.now();
    }
    return Date.now();
}

function cloneStateSnapshot(state) {
    return {
        players: ensureArray(state.players).map((player) => ({ ...player })),
        bullets: ensureArray(state.bullets).map((bullet) => ({ ...bullet })),
        grenades: ensureArray(state.grenades).map((grenade) => ({ ...grenade })),
        pickups: ensureArray(state.pickups).map((pickup) => ({ ...pickup })),
        obstacles: ensureArray(state.obstacles).map((obstacle) => ({ ...obstacle })),
        teamLives: state.teamLives || null,
        gameMode: state.gameMode || null,
    };
}

function pushStateSnapshot(state, frameNumber = null) {
    const receivedAt = getNowMs();
    if (snapshotTiming.lastReceivedAt !== null) {
        const sampleInterval = Math.max(1, receivedAt - snapshotTiming.lastReceivedAt);
        const intervalDelta = Math.abs(sampleInterval - snapshotTiming.intervalEwma);
        snapshotTiming.intervalEwma = lerp(snapshotTiming.intervalEwma, sampleInterval, SNAPSHOT_INTERVAL_SMOOTHING);
        snapshotTiming.jitterEwma = lerp(snapshotTiming.jitterEwma, intervalDelta, SNAPSHOT_JITTER_SMOOTHING);
    }
    snapshotTiming.lastReceivedAt = receivedAt;
    netDebugStats.lastSnapshotAgeMs = 0;

    snapshotBuffer.push({
        frameNumber: typeof frameNumber === 'number' ? frameNumber : null,
        receivedAt,
        state: cloneStateSnapshot(state)
    });

    if (snapshotBuffer.length > SNAPSHOT_BUFFER_SIZE) {
        snapshotBuffer.splice(0, snapshotBuffer.length - SNAPSHOT_BUFFER_SIZE);
    }
}

function getInterpolatedRenderState() {
    if (snapshotBuffer.length === 0) {
        return null;
    }
    if (snapshotBuffer.length === 1) {
        return cloneStateSnapshot(snapshotBuffer[0].state);
    }

    const now = getNowMs();
    if (!netDebugStats.extrapolationWindowStartedAt) {
        netDebugStats.extrapolationWindowStartedAt = now;
    } else if (now - netDebugStats.extrapolationWindowStartedAt >= 1000) {
        netDebugStats.extrapolationFrames = 0;
        netDebugStats.extrapolationWindowStartedAt = now;
    }

    const interpolationDelay = getDynamicInterpolationDelayMs();
    netDebugStats.lastInterpolationDelayMs = interpolationDelay;
    netDebugStats.lastSnapshotAgeMs = Math.max(0, now - snapshotBuffer[snapshotBuffer.length - 1].receivedAt);
    const targetTime = now - interpolationDelay;

    let newerIndex = -1;
    for (let i = 0; i < snapshotBuffer.length; i++) {
        if (snapshotBuffer[i].receivedAt >= targetTime) {
            newerIndex = i;
            break;
        }
    }

    if (newerIndex === 0) {
        netDebugStats.mode = 'hold';
        netDebugStats.lastInterpolationAlpha = 0;
        netDebugStats.lastExtrapolationAlpha = 0;
        netDebugStats.lastExtrapolationMs = 0;
        return cloneStateSnapshot(snapshotBuffer[0].state);
    }

    if (newerIndex === -1) {
        const latest = snapshotBuffer[snapshotBuffer.length - 1];
        const previous = getPreviousDistinctSnapshot(snapshotBuffer.length - 1);
        return extrapolateSnapshot(latest, previous, now);
    }

    const newer = snapshotBuffer[newerIndex];
    const older = snapshotBuffer[newerIndex - 1];
    netDebugStats.mode = 'interpolate';
    netDebugStats.lastExtrapolationAlpha = 0;
    netDebugStats.lastExtrapolationMs = 0;
    return interpolateSnapshots(older, newer, targetTime);
}

function interpolateSnapshots(olderSnapshot, newerSnapshot, targetTime) {
    const olderTime = olderSnapshot.receivedAt;
    const newerTime = newerSnapshot.receivedAt;
    const timeSpan = Math.max(1, newerTime - olderTime);
    const alpha = Math.max(0, Math.min(1, (targetTime - olderTime) / timeSpan));
    netDebugStats.lastInterpolationAlpha = alpha;

    const olderState = olderSnapshot.state;
    const newerState = newerSnapshot.state;

    return {
        players: interpolateEntities(olderState.players, newerState.players, alpha, ['x', 'y'], ['angle']),
        bullets: interpolateEntities(olderState.bullets, newerState.bullets, alpha, ['x', 'y'], ['angle']),
        grenades: interpolateEntities(olderState.grenades, newerState.grenades, alpha, ['x', 'y'], ['spin']),
        pickups: ensureArray(newerState.pickups).map((pickup) => ({ ...pickup })),
        obstacles: interpolateEntities(olderState.obstacles, newerState.obstacles, alpha, ['x', 'y'], ['angle']),
        teamLives: newerState.teamLives || null,
        gameMode: newerState.gameMode || null,
    };
}

function getPreviousDistinctSnapshot(fromIndex) {
    const latest = snapshotBuffer[fromIndex];
    if (!latest) {
        return null;
    }

    for (let i = fromIndex - 1; i >= 0; i--) {
        const candidate = snapshotBuffer[i];
        if (candidate && candidate.receivedAt < latest.receivedAt) {
            return candidate;
        }
    }

    return null;
}

function extrapolateSnapshot(latestSnapshot, previousSnapshot, now) {
    if (!previousSnapshot) {
        return cloneStateSnapshot(latestSnapshot.state);
    }

    const sampleSpan = latestSnapshot.receivedAt - previousSnapshot.receivedAt;
    if (sampleSpan <= 0) {
        return cloneStateSnapshot(latestSnapshot.state);
    }

    const dynamicExtrapolationCap = Math.min(
        MAX_EXTRAPOLATION_MS,
        Math.max(90, snapshotTiming.intervalEwma * 2.5 + snapshotTiming.jitterEwma * 1.8)
    );
    const extrapolationMs = Math.max(0, Math.min(dynamicExtrapolationCap, now - latestSnapshot.receivedAt));
    const safeSampleSpan = Math.max(
        MIN_EXTRAPOLATION_SAMPLE_MS,
        sampleSpan,
        snapshotTiming.intervalEwma * 0.65
    );
    const rawAlpha = Math.max(0, extrapolationMs / safeSampleSpan);
    const cappedAlpha = Math.min(MAX_EXTRAPOLATION_ALPHA, rawAlpha);
    const alpha = 1 - Math.exp(-cappedAlpha * EXTRAPOLATION_ALPHA_EASING);
    netDebugStats.mode = 'extrapolate';
    netDebugStats.lastInterpolationAlpha = 0;
    netDebugStats.lastExtrapolationAlpha = alpha;
    netDebugStats.lastExtrapolationMs = extrapolationMs;
    netDebugStats.extrapolationFrames += 1;
    netDebugStats.extrapolationFramesTotal += 1;
    const latestState = cloneStateSnapshot(latestSnapshot.state);
    const previousState = previousSnapshot.state;

    return {
        players: extrapolateEntities(previousState.players, latestState.players, alpha, ['x', 'y'], ['angle']),
        bullets: extrapolateEntities(previousState.bullets, latestState.bullets, alpha, ['x', 'y'], ['angle']),
        grenades: extrapolateEntities(previousState.grenades, latestState.grenades, alpha, ['x', 'y'], ['spin']),
        pickups: latestState.pickups,
        obstacles: extrapolateEntities(previousState.obstacles, latestState.obstacles, alpha, ['x', 'y'], ['angle']),
        teamLives: latestState.teamLives || null,
        gameMode: latestState.gameMode || null,
    };
}

function getDynamicInterpolationDelayMs() {
    const lastSnapshotAgeMs = snapshotTiming.lastReceivedAt === null
        ? 0
        : Math.max(0, getNowMs() - snapshotTiming.lastReceivedAt);
    const stalenessBoost = Math.max(0, lastSnapshotAgeMs - snapshotTiming.intervalEwma) * 0.45;
    const estimatedDelay = snapshotTiming.intervalEwma * 2.35 + snapshotTiming.jitterEwma * 2.8 + stalenessBoost;
    return Math.max(RENDER_INTERPOLATION_DELAY_MS, Math.min(MAX_RENDER_INTERPOLATION_DELAY_MS, estimatedDelay));
}

function getLatestSnapshotState() {
    if (snapshotBuffer.length === 0) {
        return null;
    }
    return snapshotBuffer[snapshotBuffer.length - 1].state;
}

function getCollidableObstacles(obstacles = [], player = null) {
    return obstacles.filter((obstacle) => {
        if (!obstacle) return false;
        if (obstacle.kind === 'shield') {
            return true;
        }
        if (player?.id && obstacle.ownerId === player.id) {
            return false;
        }
        if (player?.team && obstacle.ownerTeam && player.team === obstacle.ownerTeam) {
            return false;
        }
        return true;
    });
}

function hasObstacleRotation(obstacle) {
    return typeof obstacle?.angle === 'number';
}

function circleRectCollision(circleX, circleY, circleRadius, rect) {
    const closestX = Math.max(rect.x, Math.min(circleX, rect.x + rect.w));
    const closestY = Math.max(rect.y, Math.min(circleY, rect.y + rect.h));
    const dx = circleX - closestX;
    const dy = circleY - closestY;
    return dx * dx + dy * dy < circleRadius * circleRadius;
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
    if (hasObstacleRotation(obstacle)) {
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
    if (distSq >= circleRadius * circleRadius) {
        return null;
    }
    const dist = Math.sqrt(distSq);
    if (dist > 0) {
        const penetration = circleRadius - dist;
        return { x: (dx / dist) * penetration, y: (dy / dist) * penetration };
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
    const minSide = Math.min(left, right, top, bottom);
    if (minSide === left) return { x: -(circleRadius + left), y: 0 };
    if (minSide === right) return { x: circleRadius + right, y: 0 };
    if (minSide === top) return { x: 0, y: -(circleRadius + top) };
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
    if (distSq >= circleRadius * circleRadius) {
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
        const minSide = Math.min(left, right, top, bottom);
        if (minSide === left) pushLocalX = -(circleRadius + left);
        else if (minSide === right) pushLocalX = circleRadius + right;
        else if (minSide === top) pushLocalY = -(circleRadius + top);
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
    if (hasObstacleRotation(obstacle)) {
        return getCircleRotatedRectSeparationVector(circleX, circleY, circleRadius, obstacle);
    }
    return getCircleRectSeparationVector(circleX, circleY, circleRadius, obstacle);
}

function resolveCircleObstacleOverlaps(circleX, circleY, circleRadius, obstacles = []) {
    let resolvedX = circleX;
    let resolvedY = circleY;
    for (let i = 0; i < PREDICTION_OVERLAP_ITERATIONS; i++) {
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

function getInputAxis() {
    let dx = 0;
    let dy = 0;
    if (localInputState.up) dy = -1;
    if (localInputState.down) dy = 1;
    if (localInputState.left) dx = -1;
    if (localInputState.right) dx = 1;
    if (dx !== 0 && dy !== 0) {
        dx *= 0.707;
        dy *= 0.707;
    }
    return { dx, dy };
}

function getFallbackMoveSpeed(playerName) {
    return FALLBACK_MOVE_SPEED_BY_NAME[playerName] || 6;
}

function reconcileLocalPrediction(localPlayer, authoritativePlayer) {
    const errorX = authoritativePlayer.x - localPlayer.x;
    const errorY = authoritativePlayer.y - localPlayer.y;
    const distance = Math.sqrt(errorX * errorX + errorY * errorY);
    if (distance > LOCAL_RECONCILIATION_SNAP_DISTANCE) {
        localPlayer.x = authoritativePlayer.x;
        localPlayer.y = authoritativePlayer.y;
        return;
    }
    localPlayer.x += errorX * LOCAL_RECONCILIATION_LERP;
    localPlayer.y += errorY * LOCAL_RECONCILIATION_LERP;
}

function applyPredictedMovement(localPlayer, authoritativePlayer, obstacles, deltaMs) {
    if (authoritativePlayer.stunned) {
        return;
    }
    const { dx, dy } = getInputAxis();
    if (dx === 0 && dy === 0) {
        return;
    }
    const moveSpeed = typeof authoritativePlayer.moveSpeed === 'number'
        ? authoritativePlayer.moveSpeed
        : getFallbackMoveSpeed(authoritativePlayer.name);
    const deltaTime = deltaMs / SERVER_DELTA_TIME_DIVISOR;
    const movementX = dx * deltaTime * moveSpeed;
    const movementY = dy * deltaTime * moveSpeed;
    const radius = typeof authoritativePlayer.radius === 'number' ? authoritativePlayer.radius : 20;
    const nextX = localPlayer.x + movementX;
    const nextY = localPlayer.y + movementY;
    let canMoveX = true;
    let canMoveY = true;

    for (const obstacle of obstacles) {
        if (canMoveX && circleObstacleCollision(nextX, localPlayer.y, radius, obstacle)) {
            canMoveX = false;
        }
        if (canMoveY && circleObstacleCollision(localPlayer.x, nextY, radius, obstacle)) {
            canMoveY = false;
        }
        if (!canMoveX && !canMoveY) {
            break;
        }
    }

    if (canMoveX) {
        localPlayer.x = nextX;
    }
    if (canMoveY) {
        localPlayer.y = nextY;
    }

    const resolvedPosition = resolveCircleObstacleOverlaps(localPlayer.x, localPlayer.y, radius, obstacles);
    localPlayer.x = resolvedPosition.x;
    localPlayer.y = resolvedPosition.y;

    const distanceFromCenter = Math.sqrt(localPlayer.x * localPlayer.x + localPlayer.y * localPlayer.y);
    const maxDistance = mapRadius - radius;
    if (distanceFromCenter > maxDistance) {
        const normalX = localPlayer.x / Math.max(0.0001, distanceFromCenter);
        const normalY = localPlayer.y / Math.max(0.0001, distanceFromCenter);
        localPlayer.x = normalX * maxDistance;
        localPlayer.y = normalY * maxDistance;
    }
}

function applyLocalPlayerPrediction(renderState, timestamp) {
    if (!renderState?.players?.length || !socket.id) {
        localPredictionState = null;
        return;
    }

    const localPlayerIndex = renderState.players.findIndex((player) => player.id === socket.id);
    if (localPlayerIndex < 0) {
        localPredictionState = null;
        return;
    }

    const latestSnapshotState = getLatestSnapshotState();
    const authoritativePlayer = latestSnapshotState?.players?.find((player) => player.id === socket.id)
        || renderState.players[localPlayerIndex];
    if (!authoritativePlayer) {
        return;
    }

    const now = typeof timestamp === 'number' ? timestamp : getNowMs();
    if (
        !localPredictionState ||
        typeof localPredictionState.x !== 'number' ||
        typeof localPredictionState.y !== 'number'
    ) {
        localPredictionState = {
            x: authoritativePlayer.x,
            y: authoritativePlayer.y,
            angle: authoritativePlayer.angle
        };
        lastLocalPredictionTimestamp = now;
    }

    const rawDeltaMs = typeof lastLocalPredictionTimestamp === 'number' ? now - lastLocalPredictionTimestamp : 0;
    const deltaMs = clamp(rawDeltaMs, 0, MAX_PREDICTION_STEP_MS);
    lastLocalPredictionTimestamp = now;

    reconcileLocalPrediction(localPredictionState, authoritativePlayer);
    const collidableObstacles = getCollidableObstacles(
        latestSnapshotState?.obstacles || renderState.obstacles || [],
        authoritativePlayer
    );
    applyPredictedMovement(localPredictionState, authoritativePlayer, collidableObstacles, deltaMs);

    localPredictionState.angle = localAimAngle;
    renderState.players[localPlayerIndex] = {
        ...renderState.players[localPlayerIndex],
        ...authoritativePlayer,
        x: localPredictionState.x,
        y: localPredictionState.y,
        angle: localPredictionState.angle
    };
}

function shouldPredictBulletPresentation(bullet) {
    if (!bullet || typeof bullet.angle !== 'number') {
        return false;
    }

    return (
        bullet.kind === 'bullet' ||
        bullet.kind === 'reaverShard' ||
        bullet.kind === 'rocket' ||
        bullet.kind === 'flame' ||
        bullet.kind === 'bubble'
    );
}

function shouldPredictGrenadePresentation(grenade) {
    if (!grenade) {
        return false;
    }

    if (grenade.isStationary) {
        return false;
    }

    return typeof grenade.angle === 'number' || typeof grenade.spin === 'number';
}

function getProjectileVelocityPerMs(latestEntity, previousEntity, latestSnapshot, previousSnapshot, type) {
    if (!latestEntity || !latestSnapshot) {
        return null;
    }

    if (type === 'grenade' && (
        typeof latestEntity.velocityX === 'number' ||
        typeof latestEntity.velocityY === 'number'
    )) {
        const velocityX = Number(latestEntity.velocityX) || 0;
        const velocityY = Number(latestEntity.velocityY) || 0;
        return {
            vxPerMs: velocityX / SERVER_DELTA_TIME_DIVISOR,
            vyPerMs: velocityY / SERVER_DELTA_TIME_DIVISOR
        };
    }

    if (typeof latestEntity.speed === 'number' && latestEntity.speed > 0 && typeof latestEntity.angle === 'number') {
        return {
            vxPerMs: Math.cos(latestEntity.angle) * latestEntity.speed / SERVER_DELTA_TIME_DIVISOR,
            vyPerMs: Math.sin(latestEntity.angle) * latestEntity.speed / SERVER_DELTA_TIME_DIVISOR
        };
    }

    if (!previousEntity || !previousSnapshot) {
        return null;
    }

    const dtMs = Math.max(1, latestSnapshot.receivedAt - previousSnapshot.receivedAt);
    return {
        vxPerMs: (latestEntity.x - previousEntity.x) / dtMs,
        vyPerMs: (latestEntity.y - previousEntity.y) / dtMs
    };
}

function applyPredictionToProjectileSet(renderEntities, latestEntities, previousEntities, latestSnapshot, previousSnapshot, extrapolationMs, renderState, type, blendOverride = null) {
    if (!Array.isArray(renderEntities) || renderEntities.length === 0) {
        return;
    }

    const latestById = new Map((latestEntities || []).map((entity) => [entity.id, entity]));
    const previousById = new Map((previousEntities || []).map((entity) => [entity.id, entity]));

    for (const renderEntity of renderEntities) {
        if (!renderEntity?.id) continue;

        const latestEntity = latestById.get(renderEntity.id);
        if (!latestEntity) continue;

        const previousEntity = previousById.get(renderEntity.id);
        const velocity = getProjectileVelocityPerMs(latestEntity, previousEntity, latestSnapshot, previousSnapshot, type);
        if (!velocity) continue;

        const predictedX = latestEntity.x + velocity.vxPerMs * extrapolationMs;
        const predictedY = latestEntity.y + velocity.vyPerMs * extrapolationMs;
        const dx = predictedX - renderEntity.x;
        const dy = predictedY - renderEntity.y;
        const dot = dx * velocity.vxPerMs + dy * velocity.vyPerMs;
        if (dot <= 0) {
            continue;
        }
        const blend = typeof blendOverride === 'number' ? blendOverride : PROJECTILE_PRESENTATION_BLEND;
        renderEntity.x = lerp(renderEntity.x, predictedX, blend);
        renderEntity.y = lerp(renderEntity.y, predictedY, blend);
    }
}

function applyProjectilePresentationPrediction(renderState, timestamp) {
    if (!renderState || (!renderState.bullets?.length && !renderState.grenades?.length)) {
        return;
    }

    const latestSnapshotIndex = snapshotBuffer.length - 1;
    if (latestSnapshotIndex < 0) {
        return;
    }

    const latestSnapshot = snapshotBuffer[latestSnapshotIndex];
    const previousSnapshot = getPreviousDistinctSnapshot(latestSnapshotIndex);
    const now = typeof timestamp === 'number' ? timestamp : getNowMs();
    const extrapolationMs = clamp(
        now - latestSnapshot.receivedAt,
        0,
        MAX_PROJECTILE_PRESENTATION_EXTRAPOLATION_MS
    );

    const blend = netDebugStats.mode === 'extrapolate'
        ? PROJECTILE_PRESENTATION_BLEND
        : PROJECTILE_PRESENTATION_BLEND * 0.35;

    applyPredictionToProjectileSet(
        (renderState.bullets || []).filter(shouldPredictBulletPresentation),
        latestSnapshot?.state?.bullets || [],
        previousSnapshot?.state?.bullets || [],
        latestSnapshot,
        previousSnapshot,
        extrapolationMs,
        renderState,
        'bullet',
        blend
    );

    applyPredictionToProjectileSet(
        (renderState.grenades || []).filter(shouldPredictGrenadePresentation),
        latestSnapshot?.state?.grenades || [],
        previousSnapshot?.state?.grenades || [],
        latestSnapshot,
        previousSnapshot,
        extrapolationMs,
        renderState,
        'grenade',
        blend
    );
}

function interpolateEntities(previousEntities = [], nextEntities = [], alpha = 0, linearKeys = [], angularKeys = []) {
    const previousById = new Map(previousEntities.map((entity) => [entity.id, entity]));

    return nextEntities.map((nextEntity) => {
        const previousEntity = previousById.get(nextEntity.id);
        if (!previousEntity) {
            return { ...nextEntity };
        }

        const merged = { ...nextEntity };
        for (const key of linearKeys) {
            if (typeof previousEntity[key] === 'number' && typeof nextEntity[key] === 'number') {
                merged[key] = lerp(previousEntity[key], nextEntity[key], alpha);
            }
        }
        for (const key of angularKeys) {
            if (typeof previousEntity[key] === 'number' && typeof nextEntity[key] === 'number') {
                merged[key] = lerpAngle(previousEntity[key], nextEntity[key], alpha);
            }
        }
        return merged;
    });
}

function extrapolateEntities(previousEntities = [], latestEntities = [], alpha = 0, linearKeys = [], angularKeys = []) {
    const previousById = new Map(previousEntities.map((entity) => [entity.id, entity]));

    return latestEntities.map((latestEntity) => {
        const previousEntity = previousById.get(latestEntity.id);
        if (!previousEntity) {
            return { ...latestEntity };
        }

        const projected = { ...latestEntity };
        for (const key of linearKeys) {
            if (typeof previousEntity[key] === 'number' && typeof latestEntity[key] === 'number') {
                const velocity = latestEntity[key] - previousEntity[key];
                const projectedDelta = clamp(velocity * alpha, -MAX_LINEAR_EXTRAPOLATION_STEP, MAX_LINEAR_EXTRAPOLATION_STEP);
                projected[key] = latestEntity[key] + projectedDelta;
            }
        }
        for (const key of angularKeys) {
            if (typeof previousEntity[key] === 'number' && typeof latestEntity[key] === 'number') {
                const delta = shortestAngleDelta(previousEntity[key], latestEntity[key]);
                const projectedDelta = clamp(delta * alpha, -MAX_ANGULAR_EXTRAPOLATION_STEP, MAX_ANGULAR_EXTRAPOLATION_STEP);
                projected[key] = latestEntity[key] + projectedDelta;
            }
        }
        return projected;
    });
}

function lerp(start, end, alpha) {
    return start + (end - start) * alpha;
}

function lerpAngle(start, end, alpha) {
    return start + shortestAngleDelta(start, end) * alpha;
}

function ensureArray(value) {
    return Array.isArray(value) ? value : [];
}

function clamp(value, minValue, maxValue) {
    return Math.max(minValue, Math.min(maxValue, value));
}

function shortestAngleDelta(start, end) {
    let delta = end - start;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    return delta;
}

function applyDeltaToGameState(delta) {
    // Check if this is a full state update.
    if (delta?.isFullState === true || !delta.frameNumber) {
        // Full state update - replace everything
        gameState.players = ensureArray(delta.players);
        gameState.bullets = ensureArray(delta.bullets);
        gameState.grenades = ensureArray(delta.grenades);
        gameState.pickups = ensureArray(delta.pickups);
        gameState.obstacles = ensureArray(delta.obstacles);
        gameState.teamLives = Object.prototype.hasOwnProperty.call(delta, 'teamLives')
            ? (delta.teamLives || null)
            : gameState.teamLives;
        latestTeamLives = gameState.teamLives;
        if (delta.gameMode) {
            gameMode = delta.gameMode;
        }
        
        // Update cache
        clientGameStateCache.players.clear();
        clientGameStateCache.bullets.clear();
        clientGameStateCache.grenades.clear();
        clientGameStateCache.pickups.clear();
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
        for (const pickup of gameState.pickups) {
            clientGameStateCache.pickups.set(pickup.id, pickup);
        }
        for (const obstacle of gameState.obstacles) {
            clientGameStateCache.obstacles.set(obstacle.id, obstacle);
        }
        return;
    }
    
    // Handle player updates
    if (Array.isArray(delta.players)) {
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
    if (Array.isArray(delta.bullets)) {
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
    if (Array.isArray(delta.grenades)) {
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

    // Handle pickup updates
    if (Array.isArray(delta.pickups)) {
        for (const pickupUpdate of delta.pickups) {
            const existingIndex = gameState.pickups.findIndex((pickup) => pickup.id === pickupUpdate.id);
            if (existingIndex >= 0) {
                gameState.pickups[existingIndex] = { ...gameState.pickups[existingIndex], ...pickupUpdate };
            } else {
                gameState.pickups.push(pickupUpdate);
            }
            clientGameStateCache.pickups.set(pickupUpdate.id, pickupUpdate);
        }
    }
    
    // Handle removed bullets
    if (Array.isArray(delta.removedBullets)) {
        for (const bulletId of delta.removedBullets) {
            const removedBullet = clientGameStateCache.bullets.get(bulletId);
            if (removedBullet?.kind === 'rocket') {
                spawnExplosiveEffect(removedBullet.x, removedBullet.y);
                soundManager.play('explosion', 0.3);
            }
            gameState.bullets = gameState.bullets.filter(b => b.id !== bulletId);
            clientGameStateCache.bullets.delete(bulletId);
        }
    }

    // Handle removed grenades
    if (Array.isArray(delta.removedGrenades)) {
        for (const grenadeId of delta.removedGrenades) {
            const removedGrenade = clientGameStateCache.grenades.get(grenadeId);
            if (
                removedGrenade?.kind === 'demoExplosive' ||
                removedGrenade?.kind === 'grenade' ||
                removedGrenade?.kind === 'waffleDrone'
            ) {
                spawnExplosiveEffect(removedGrenade.x, removedGrenade.y);
                soundManager.play('explosion', 0.3);
            }
            gameState.grenades = gameState.grenades.filter(g => g.id !== grenadeId);
            clientGameStateCache.grenades.delete(grenadeId);
        }
    }

    // Handle removed pickups
    if (Array.isArray(delta.removedPickups)) {
        for (const pickupId of delta.removedPickups) {
            gameState.pickups = gameState.pickups.filter((pickup) => pickup.id !== pickupId);
            clientGameStateCache.pickups.delete(pickupId);
        }
    }
    
    // Handle obstacle updates
    if (Array.isArray(delta.obstacles)) {
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
    if (Array.isArray(delta.removedObstacles)) {
        for (const obstacleId of delta.removedObstacles) {
            gameState.obstacles = gameState.obstacles.filter(o => o.id !== obstacleId);
            clientGameStateCache.obstacles.delete(obstacleId);
        }
    }
    
    // Update game mode if changed
    if (delta.gameMode) {
        gameMode = delta.gameMode;
    }

    if (Object.prototype.hasOwnProperty.call(delta, 'teamLives')) {
        gameState.teamLives = delta.teamLives || null;
        latestTeamLives = gameState.teamLives;
    }
}

function draw(gameState) {
    const thisPlayer = gameState.players.find(player => player.id === socket.id) ?? gameState.players[0];
    if (!thisPlayer) {
        soundManager.stop('laser');
        soundManager.stop('flame');
        return; // don't render if player not found
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // update health bar
    const healthRatio = thisPlayer.maxHP > 0 ? (thisPlayer.HP / thisPlayer.maxHP) : 0;
    const overhealed = thisPlayer.HP > thisPlayer.maxHP;
    const clampedPercent = Math.max(0, Math.min(100, healthRatio * 100));
    const shieldRatio = thisPlayer.passiveAbility?.maxShieldHP > 0
        ? (thisPlayer.passiveAbility.shieldHP / thisPlayer.passiveAbility.maxShieldHP)
        : 0;
    healthFill.style.width = `${clampedPercent}%`;
    if (shieldFill) {
        shieldFill.style.width = `${Math.max(0, Math.min(100, shieldRatio * 100))}%`;
        shieldFill.style.opacity = shieldRatio > 0 ? '1' : '0';
    }
    healthText.textContent = `${Math.round(thisPlayer.HP)}/${Math.round(thisPlayer.maxHP)}`;
    if (healthBar) {
        healthBar.classList.toggle('overhealed', overhealed);
    }
    healthFill.classList.toggle('overhealed', overhealed);
    
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

    updateWeaponLoopAudio(thisPlayer);

    if (gameMode === '1v1') {
        killProgressContainer.style.display = 'block';
        killProgressContainer.style.borderColor = '';
        if (killProgressTitle) {
            killProgressTitle.textContent = 'First to 5';
        }
        const yourKills = thisPlayer.kills || 0;
        const opponent = gameState.players.find((player) => player.id !== thisPlayer.id);
        const opponentKills = opponent?.kills || 0;
        const scoreSignature = `${yourKills}:${opponentKills}`;
        if (scoreSignature !== lastScoreSignature) {
            scorePopupShownAt = Date.now();
            lastScoreSignature = scoreSignature;
        }
        killProgressText.textContent = `You ${yourKills}/${ONE_VS_ONE_KILL_TARGET} | Opp ${opponentKills}/${ONE_VS_ONE_KILL_TARGET}`;

        const elapsed = Date.now() - scorePopupShownAt;
        if (elapsed <= SCORE_POPUP_VISIBLE_MS) {
            killProgressContainer.style.opacity = '1';
        } else if (elapsed <= SCORE_POPUP_VISIBLE_MS + SCORE_POPUP_FADE_MS) {
            const fadeProgress = (elapsed - SCORE_POPUP_VISIBLE_MS) / SCORE_POPUP_FADE_MS;
            killProgressContainer.style.opacity = `${Math.max(0, 1 - fadeProgress)}`;
        } else {
            killProgressContainer.style.opacity = '0';
        }
    } else if (gameMode === '2v2') {
        killProgressContainer.style.display = 'block';
        killProgressContainer.style.opacity = '1';
        if (killProgressTitle) {
            killProgressTitle.textContent = 'Team Lives';
        }
        const redLives = Number(latestTeamLives?.red ?? 10);
        const blueLives = Number(latestTeamLives?.blue ?? 10);
        killProgressText.textContent = `Red ${redLives} | Blue ${blueLives}`;
        const yourTeam = thisPlayer.team === 'red' ? 'red' : 'blue';
        killProgressContainer.style.borderColor = yourTeam === 'red'
            ? 'rgba(255, 105, 105, 0.75)'
            : 'rgba(114, 170, 255, 0.75)';
    } else {
        killProgressContainer.style.display = 'none';
        killProgressContainer.style.opacity = '0';
    }
    
    // update ability UI
    if (thisPlayer.specialAbility) {
        // Update ability name
        if (
            typeof thisPlayer.specialAbility.charges === 'number' &&
            typeof thisPlayer.specialAbility.maxCharges === 'number'
        ) {
            abilityText.textContent = `${thisPlayer.specialAbility.name} ${thisPlayer.specialAbility.charges}/${thisPlayer.specialAbility.maxCharges}`;
        } else {
            abilityText.textContent = thisPlayer.specialAbility.name;
        }
        abilityContainer.dataset.tooltip = `${thisPlayer.specialAbility.name}: Active class ability (E).`;
        
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
        const sharedKey = 'C';
        sharedAbilityKey.textContent = `(${sharedKey})`;
        sharedAbilityContainer.dataset.tooltip = `${thisPlayer.sharedAbility.name}: Shared ability (${sharedKey}).`;

        if (thisPlayer.sharedAbility.currentCooldown > 0) {
            const cooldownPercent = (thisPlayer.sharedAbility.currentCooldown / thisPlayer.sharedAbility.cooldown) * 100;
            sharedAbilityOverlay.style.height = `${cooldownPercent}%`;
        } else {
            sharedAbilityOverlay.style.height = '0%';
        }
    }

    if (thisPlayer.passiveAbility) {
        passiveAbilityText.textContent = thisPlayer.passiveAbility.name;
        const passiveKey = thisPlayer.passiveAbility.key || 'Passive';
        passiveAbilityKey.textContent = `(${passiveKey})`;
        passiveAbilityContainer.dataset.tooltip = `${thisPlayer.passiveAbility.name}: ${thisPlayer.passiveAbility.description || 'Passive class ability.'}`;

        if (thisPlayer.passiveAbility.cooldown > 0 && thisPlayer.passiveAbility.currentCooldown > 0) {
            const cooldownPercent = (thisPlayer.passiveAbility.currentCooldown / thisPlayer.passiveAbility.cooldown) * 100;
            passiveAbilityOverlay.style.height = `${cooldownPercent}%`;
        } else if (
            thisPlayer.passiveAbility.isActive &&
            thisPlayer.passiveAbility.currentDuration > 0 &&
            thisPlayer.passiveAbility.duration > 0
        ) {
            const activePercent = (thisPlayer.passiveAbility.currentDuration / thisPlayer.passiveAbility.duration) * 100;
            passiveAbilityOverlay.style.height = `${Math.max(0, Math.min(100, activePercent))}%`;
        } else {
            passiveAbilityOverlay.style.height = '0%';
        }
    } else {
        passiveAbilityText.textContent = 'Passive';
        passiveAbilityKey.textContent = '(Passive)';
        passiveAbilityOverlay.style.height = '0%';
        passiveAbilityContainer.dataset.tooltip = 'Class passive ability.';
    }
    
    const cameraX = thisPlayer.x - canvas.width / 2;
    const cameraY = thisPlayer.y - canvas.height / 2;
    
    ctx.save();
    ctx.translate(-cameraX, -cameraY);
    drawMapBackground(cameraX, cameraY);
    
    for (const obstacle of gameState.obstacles) {
        drawObstacle(obstacle);
    }

    for (const pickup of gameState.pickups) {
        drawPickup(pickup);
    }
    
    for (const bullet of gameState.bullets) {
        drawBullet(bullet);
    }

    for (const grenade of gameState.grenades) {
        drawGrenade(grenade, thisPlayer);
    }
    
    for (const player of gameState.players) {
        if (player.laserBeam) {
            drawLaserBeam(player.laserBeam);
        }
    }

    for (const player of gameState.players) {
        drawHealingCircle(player);
    }
    
    for (const player of gameState.players) {
        drawPlayer(player, thisPlayer);
    }
    for (const player of gameState.players) {
        if (player.reaverBolts?.length) {
            drawReaverBolts(player);
        }
    }

    drawExplosiveEffects();
    drawCombatTexts();
    
   ctx.restore();

    drawNetworkDebugOverlay();
}

function drawNetworkDebugOverlay() {
    ensureNetDebugOverlayElement();
    if (!netDebugOverlayElement) {
        return;
    }

    if (!netDebugOverlayEnabled) {
        netDebugOverlayElement.style.display = 'none';
        return;
    }

    const snapshotHz = 1000 / Math.max(1, snapshotTiming.intervalEwma);
    const lines = [
        `mode: ${netDebugStats.mode}`,
        `render fps: ${renderFpsEwma.toFixed(1)}`,
        `snapshot hz: ${snapshotHz.toFixed(1)}`,
        `snapshot interval: ${snapshotTiming.intervalEwma.toFixed(1)} ms`,
        `jitter: ${snapshotTiming.jitterEwma.toFixed(1)} ms`,
        `interp delay: ${netDebugStats.lastInterpolationDelayMs.toFixed(1)} ms`,
        `interp alpha: ${netDebugStats.lastInterpolationAlpha.toFixed(2)}`,
        `snapshot age: ${netDebugStats.lastSnapshotAgeMs.toFixed(1)} ms`,
        `extrap ms: ${netDebugStats.lastExtrapolationMs.toFixed(1)} ms`,
        `extrap alpha: ${netDebugStats.lastExtrapolationAlpha.toFixed(2)}`,
        `extrap frames: ${netDebugStats.extrapolationFrames}`,
        `extrap total: ${netDebugStats.extrapolationFramesTotal}`,
        `buffer: ${snapshotBuffer.length}`
    ];

    netDebugOverlayElement.style.display = 'block';
    netDebugOverlayElement.textContent = lines.join('\n');
}

function ensureNetDebugOverlayElement() {
    if (netDebugOverlayElement || typeof document === 'undefined') {
        return;
    }

    const el = document.createElement('pre');
    el.id = 'netDebugOverlay';
    el.style.position = 'fixed';
    el.style.top = '12px';
    el.style.left = '12px';
    el.style.zIndex = '9999';
    el.style.margin = '0';
    el.style.padding = '8px';
    el.style.minWidth = '240px';
    el.style.whiteSpace = 'pre';
    el.style.pointerEvents = 'none';
    el.style.borderRadius = '6px';
    el.style.background = 'rgba(7, 12, 20, 0.86)';
    el.style.color = '#b8f7ff';
    el.style.font = '12px monospace';
    el.style.lineHeight = '1.25';
    el.style.display = netDebugOverlayEnabled ? 'block' : 'none';
    document.body.appendChild(el);
    netDebugOverlayElement = el;
}

function drawMapBackground(cameraX, cameraY) {
    ctx.save();

    ctx.beginPath();
    ctx.arc(0, 0, mapRadius, 0, 2 * Math.PI);
    ctx.fillStyle = MAP_COLOR;
    ctx.fill();
    ctx.clip();

    const maxX = cameraX + canvas.width;
    const maxY = cameraY + canvas.height;
    const startX = Math.floor(cameraX / GRID_MINOR_SIZE) * GRID_MINOR_SIZE;
    const startY = Math.floor(cameraY / GRID_MINOR_SIZE) * GRID_MINOR_SIZE;

    for (let x = startX; x <= maxX; x += GRID_MINOR_SIZE) {
        const gridIndex = Math.round(x / GRID_MINOR_SIZE);
        const major = gridIndex % GRID_MAJOR_EVERY === 0;
        ctx.strokeStyle = major ? GRID_MAJOR_COLOR : GRID_MINOR_COLOR;
        ctx.lineWidth = major ? 1.4 : 1;
        ctx.beginPath();
        ctx.moveTo(x, cameraY);
        ctx.lineTo(x, maxY);
        ctx.stroke();
    }

    for (let y = startY; y <= maxY; y += GRID_MINOR_SIZE) {
        const gridIndex = Math.round(y / GRID_MINOR_SIZE);
        const major = gridIndex % GRID_MAJOR_EVERY === 0;
        ctx.strokeStyle = major ? GRID_MAJOR_COLOR : GRID_MINOR_COLOR;
        ctx.lineWidth = major ? 1.4 : 1;
        ctx.beginPath();
        ctx.moveTo(cameraX, y);
        ctx.lineTo(maxX, y);
        ctx.stroke();
    }

    const vignette = ctx.createRadialGradient(0, 0, mapRadius * 0.55, 0, 0, mapRadius);
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignette.addColorStop(1, "rgba(0, 0, 0, 0.14)");
    ctx.fillStyle = vignette;
    ctx.beginPath();
    ctx.arc(0, 0, mapRadius, 0, 2 * Math.PI);
    ctx.fill();

    ctx.restore();

    ctx.beginPath();
    ctx.arc(0, 0, mapRadius, 0, 2 * Math.PI);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 3;
    ctx.stroke();
}

function drawCombatTexts() {
    for (let i = combatTexts.length - 1; i >= 0; i--) {
        const text = combatTexts[i];
        text.life -= 1;
        text.floatOffset += 0.8;
        text.x += text.driftX;

        if (text.life <= 0) {
            combatTexts.splice(i, 1);
            continue;
        }

        const alpha = Math.max(0, text.life / text.maxLife);
        const y = text.y - text.floatOffset;
        const isHealing = text.type === 'healing';
        const prefix = isHealing ? '+' : '-';

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = 'bold 22px CustomFont';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 4;
        ctx.strokeStyle = isHealing ? 'rgba(10, 60, 10, 0.9)' : 'rgba(60, 0, 0, 0.9)';
        ctx.fillStyle = isHealing ? '#6cff85' : '#ff6a5f';
        ctx.strokeText(`${prefix}${text.amount}`, text.x, y);
        ctx.fillText(`${prefix}${text.amount}`, text.x, y);
        ctx.restore();
    }
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

    if (obstacle.image === 'turret_base.png') {
        const baseW = obstacle.w || 36;
        const baseH = obstacle.h || 36;

        ctx.save();
        ctx.translate(obstacle.x, obstacle.y);
        if (playerImages.TurretBase.complete) {
            ctx.drawImage(playerImages.TurretBase, -baseW / 2, -baseH / 2, baseW, baseH);
        } else {
            ctx.fillStyle = '#6f7683';
            ctx.beginPath();
            ctx.arc(0, 0, Math.max(baseW, baseH) * 0.5, 0, 2 * Math.PI);
            ctx.fill();
        }

        ctx.rotate(obstacle.angle || 0);
        if (playerImages.TurretHead.complete) {
            ctx.drawImage(playerImages.TurretHead, -baseW / 2, -baseH / 2, baseW, baseH);
        } else {
            ctx.fillStyle = '#444b57';
            ctx.fillRect(0, -3, baseW * 0.55, 6);
        }
        ctx.restore();
        return;
    }

    const obstacleColor = obstacle.color || '#7b8794';
    const x = obstacle.x;
    const y = obstacle.y;
    const w = obstacle.w;
    const h = obstacle.h;

    ctx.save();

    ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = obstacleColor;
    ctx.fillRect(x, y, w, h);

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    const bevel = ctx.createLinearGradient(x, y, x + w, y + h);
    bevel.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
    bevel.addColorStop(0.45, 'rgba(255, 255, 255, 0.05)');
    bevel.addColorStop(1, 'rgba(0, 0, 0, 0.22)');
    ctx.fillStyle = bevel;
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.38)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, Math.max(0, w - 2), Math.max(0, h - 2));

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 1, y + h - 1);
    ctx.lineTo(x + 1, y + 1);
    ctx.lineTo(x + w - 1, y + 1);
    ctx.stroke();

    ctx.restore();
}

function getDistanceBetweenPlayers(playerA, playerB) {
    const dx = playerA.x - playerB.x;
    const dy = playerA.y - playerB.y;
    return Math.sqrt(dx * dx + dy * dy);
}

const INVISIBILITY_REVEAL_RADIUS = 160;

function isInvisiblePlayerRevealedToViewer(player, viewer) {
    if (!player?.invisible || !viewer || player.id === viewer.id) {
        return false;
    }

    return getDistanceBetweenPlayers(player, viewer) <= INVISIBILITY_REVEAL_RADIUS;
}

function isInvisiblePlayerRevealedToAnyOtherPlayer(player, players) {
    if (!player?.invisible || !Array.isArray(players)) {
        return false;
    }

    return players.some((otherPlayer) => isInvisiblePlayerRevealedToViewer(player, otherPlayer));
}

function getPlayerOpacity(player, thisPlayer) {
    const MIN_VISIBLE_ALPHA = 0.35;
    const TRANSPARENT_ALPHA = 0.2;

    if (!player.invisible) {
        return 1;
    }

    if (player.id === thisPlayer.id) {
        return MIN_VISIBLE_ALPHA;
    }

    if (isInvisiblePlayerRevealedToViewer(player, thisPlayer)) {
        return TRANSPARENT_ALPHA;
    }

    return 0;
}

function drawPlayer(player, thisPlayer, isRevealedToAnyOtherPlayer = false) {
    if (player.isRespawning) {
        return;
    }

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
        if (player.name === 'King' && player.passiveAbility?.isActive) {
            const baseAuraRadius = player.radius + 12;
            ctx.save();
            ctx.globalAlpha = 0.22;
            ctx.fillStyle = '#ffd34d';
            ctx.beginPath();
            ctx.arc(0, 0, baseAuraRadius, 0, 2 * Math.PI);
            ctx.fill();
            ctx.restore();
        }

        if (player.name === 'King' && (player.kingAuraPulseTimer || 0) > 0) {
            const pulseProgress = 1 - Math.max(0, Math.min(1, player.kingAuraPulseTimer / 20));
            const pulseRadius = player.radius + 20 + pulseProgress * 240;
            const pulseAlpha = Math.max(0, 0.45 - pulseProgress * 0.45);
            ctx.save();
            ctx.globalAlpha = pulseAlpha;
            ctx.strokeStyle = '#ffcc33';
            ctx.lineWidth = 6 - pulseProgress * 4;
            ctx.beginPath();
            ctx.arc(0, 0, pulseRadius, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.restore();
        }

        if (player.name === 'Waffle' && player.passiveAbility?.shieldVisible) {
            const pulse = 1 + Math.sin(Date.now() / 150) * 0.06;
            const auraRadius = player.radius + 8 + pulse * 4;
            ctx.save();
            ctx.globalAlpha = 0.2;
            ctx.fillStyle = '#d7d9de';
            ctx.beginPath();
            ctx.arc(0, 0, auraRadius, 0, 2 * Math.PI);
            ctx.fill();
            ctx.globalAlpha = 0.55;
            ctx.strokeStyle = '#f3f5f8';
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.arc(0, 0, auraRadius + 2, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.restore();
        }

        ctx.drawImage(playerImages[player.name], -player.radius, -player.radius, player.radius * 2, player.radius * 2);
    } else {
        ctx.beginPath();
        ctx.arc(0, 0, player.radius, 0, 2 * Math.PI);
        ctx.fillStyle = player.flashingTimer > 0 ? 'red' : 'blue';
        ctx.fill();
        ctx.strokeStyle = player.flashingTimer > 0 ? 'darkred' : 'darkblue';
        ctx.stroke();
    }

    if (gameMode === '2v2' && (player.team === 'red' || player.team === 'blue')) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, player.radius, 0, 2 * Math.PI);
        ctx.clip();
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = TEAM_COLORS[player.team];
        ctx.beginPath();
        ctx.arc(0, 0, player.radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
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

    if (player.auraSlowed) {
        ctx.globalAlpha = 0.24;
        ctx.fillStyle = '#ffd84a';
        ctx.beginPath();
        ctx.arc(0, 0, player.radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }

    if ((player.invulnerableTimer || 0) > 0) {
        const pulse = 1 + Math.sin(Date.now() / 130) * 0.08;
        const auraRadius = (player.radius + 14) * pulse;
        const auraColor = player.team === 'red' ? '#ff8f8f' : '#8fb8ff';
        ctx.save();
        ctx.globalAlpha = 0.42;
        ctx.strokeStyle = auraColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, auraRadius, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = auraColor;
        ctx.beginPath();
        ctx.arc(0, 0, player.radius + 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
    }

    if (
        player.name === 'Demoman' &&
        player.id === thisPlayer.id &&
        typeof player.specialAbility?.holdRatio === 'number' &&
        player.specialAbility.holdRatio > 0
    ) {
        const width = 44;
        const height = 6;
        const fillWidth = Math.max(0, Math.min(width, width * player.specialAbility.holdRatio));
        const y = -player.radius - 22;

        ctx.save();
        ctx.rotate(-player.angle);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(-width / 2, y, width, height);
        ctx.fillStyle = '#ffbf47';
        ctx.fillRect(-width / 2, y, fillWidth, height);
        ctx.strokeStyle = '#fff0ba';
        ctx.lineWidth = 1;
        ctx.strokeRect(-width / 2, y, width, height);
        ctx.restore();
    }

    if (player.stunned) {
        ctx.save();
        ctx.rotate(-player.angle);
        drawStunStars(player);
        ctx.restore();
    }

    if (player.reaverStacks > 0) {
        ctx.save();
        ctx.rotate(-player.angle);
        if (player.reaverStacks >= 3) {
            const pulse = 1 + Math.sin(Date.now() / 120) * 0.15;
            const auraRadius = player.radius + 10 + pulse * 5;
            ctx.globalAlpha = 0.38;
            ctx.fillStyle = '#9a46ff';
            ctx.beginPath();
            ctx.arc(0, 0, auraRadius, 0, 2 * Math.PI);
            ctx.fill();

            ctx.globalAlpha = 0.7;
            ctx.strokeStyle = '#c78bff';
            ctx.lineWidth = 2.6;
            ctx.beginPath();
            ctx.arc(0, 0, auraRadius + 2, 0, 2 * Math.PI);
            ctx.stroke();

            ctx.globalAlpha = 0.45;
            ctx.strokeStyle = '#6d1fd9';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, auraRadius + 7, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
        drawReaverStacks(player);
        ctx.restore();
    }

    if (player.id === thisPlayer.id && player.invisible) {
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(44, 11, 11, 0.09)';
        ctx.beginPath();
        ctx.arc(0, 0, INVISIBILITY_REVEAL_RADIUS, 0, 2 * Math.PI);
        ctx.stroke();

        if (isRevealedToAnyOtherPlayer) {
            ctx.rotate(-player.angle);
            ctx.fillStyle = 'rgba(255, 239, 184, 0.9)';
            ctx.strokeStyle = 'rgba(32, 24, 18, 0.7)';
            ctx.lineWidth = 3;
            ctx.font = 'bold 24px Georgia';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.strokeText('!', 0, -player.radius - 24);
            ctx.fillText('!', 0, -player.radius - 24);
        }
        ctx.restore();
    }
    
    ctx.restore();
}

function drawHealingCircle(player) {
    if (
        player.sharedAbility?.name !== 'Healing Circle' ||
        !player.sharedAbility?.isActive ||
        player.sharedAbility?.duration <= 0
    ) {
        return;
    }

    const centerX = player.sharedAbility.effectX ?? player.x;
    const centerY = player.sharedAbility.effectY ?? player.y;
    const baseRadius = player.sharedAbility.effectRadius || 165;
    const progress = 1 - Math.max(0, Math.min(1, (player.sharedAbility.currentDuration || 0) / player.sharedAbility.duration));
    const animatedRadius = baseRadius + Math.sin(Date.now() / 120) * 3 + progress * 5;
    const alpha = 0.42 * (1 - progress * 0.35);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#66ff9f';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(centerX, centerY, animatedRadius, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.globalAlpha = alpha * 0.24;
    ctx.fillStyle = '#66ff9f';
    ctx.beginPath();
    ctx.arc(centerX, centerY, Math.max(0, animatedRadius - 2), 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
}

function drawPickup(pickup) {
    if (!pickup || typeof pickup.x !== 'number' || typeof pickup.y !== 'number') {
        return;
    }

    if (pickup.type === 'heal') {
        const pulse = 1 + Math.sin(Date.now() / 170) * 0.14;
        const size = (pickup.radius || 18) * 1.25 * pulse;
        const arm = size * 0.95;
        const thickness = Math.max(5, size * 0.42);

        ctx.save();
        ctx.translate(pickup.x, pickup.y);
        ctx.shadowColor = 'rgba(80, 255, 120, 0.7)';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#5dff87';
        ctx.globalAlpha = 0.95;
        ctx.fillRect(-thickness / 2, -arm / 2, thickness, arm);
        ctx.fillRect(-arm / 2, -thickness / 2, arm, thickness);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 0.28;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.95, 0, Math.PI * 2);
        ctx.fillStyle = '#89ffad';
        ctx.fill();
        ctx.restore();
        return;
    }

    if (pickup.type === 'coin') {
        const radius = pickup.radius || 14;
        const pulse = 1 + Math.sin(Date.now() / 190 + pickup.x * 0.01) * 0.1;
        const drawR = radius * pulse;
        ctx.save();
        ctx.translate(pickup.x, pickup.y);
        ctx.shadowColor = 'rgba(255, 220, 60, 0.55)';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#ffd447';
        ctx.beginPath();
        ctx.arc(0, 0, drawR, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#f4b300';
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff1a3';
        ctx.font = `bold ${Math.max(10, Math.round(drawR * 0.9))}px CustomFont`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 1);
        ctx.restore();
    }
}

function drawStunStars(player) {
    const time = Date.now() / 180;
    const baseY = -player.radius - 15;
    const bob = Math.sin(time) * 2.6;

    for (let i = 0; i < 3; i++) {
        const angle = time + i * (Math.PI * 2 / 3);
        const orbitX = Math.cos(angle) * 10;
        const orbitY = Math.sin(angle) * 4 + bob;
        const x = orbitX;
        const y = baseY + orbitY;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(time + i * 0.45);
        ctx.fillStyle = '#ffd857';
        ctx.strokeStyle = '#e6b91f';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(0, -4.8);
        ctx.lineTo(1.9, -1.3);
        ctx.lineTo(5.2, -1.0);
        ctx.lineTo(2.4, 1.1);
        ctx.lineTo(3.4, 4.8);
        ctx.lineTo(0, 2.7);
        ctx.lineTo(-3.4, 4.8);
        ctx.lineTo(-2.4, 1.1);
        ctx.lineTo(-5.2, -1.0);
        ctx.lineTo(-1.9, -1.3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
}

function drawReaverStacks(player) {
    const total = 3;
    const spacing = 11;
    const startX = -spacing;
    const y = -player.radius - 34;
    for (let i = 0; i < total; i++) {
        const x = startX + i * spacing;
        ctx.beginPath();
        ctx.arc(x, y, 4.2, 0, 2 * Math.PI);
        const filled = i < (player.reaverStacks || 0);
        ctx.fillStyle = filled ? '#a552ff' : 'rgba(255,255,255,0.2)';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#e4ccff';
        ctx.stroke();
    }
}

function drawReaverBolts(player) {
    const now = Date.now();
    for (const bolt of player.reaverBolts) {
        if (!bolt || bolt.expiresAt < now) continue;
        const life = Math.max(0, Math.min(1, (bolt.expiresAt - now) / 220));
        ctx.save();
        ctx.strokeStyle = '#b681ff';
        ctx.shadowColor = '#cf9dff';
        ctx.shadowBlur = 8;
        ctx.globalAlpha = 0.7 + life * 0.3;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(player.x, player.y);
        const midX = (player.x + bolt.targetX) / 2 + (Math.random() * 12 - 6);
        const midY = (player.y + bolt.targetY) / 2 + (Math.random() * 12 - 6);
        ctx.lineTo(midX, midY);
        ctx.lineTo(bolt.targetX, bolt.targetY);
        ctx.stroke();
        ctx.restore();
    }
}

function updateWeaponLoopAudio(thisPlayer) {
    const usingLaser = thisPlayer.primaryWeapon?.name === 'Laser Gun';
    const beamActive = !!thisPlayer.laserBeam;
    const usingFlamethrower = thisPlayer.primaryWeapon?.name === 'Flamethrower';
    const canFlameFire = Number(thisPlayer.primaryWeapon?.ammo || 0) > 0 && !thisPlayer.primaryWeapon?.isReloading;
    const flameActive = !!thisPlayer.isFiring && canFlameFire && !thisPlayer.stunned && !thisPlayer.isRespawning;

    if (usingLaser && beamActive && gameActive) {
        soundManager.playLoop('laser', LASER_LOOP_VOLUME);
    } else {
        soundManager.stop('laser');
    }

    if (usingFlamethrower && flameActive && gameActive) {
        soundManager.playLoop('flame', FLAME_LOOP_VOLUME);
    } else {
        soundManager.stop('flame');
    }
}

function drawBullet(bullet) {
    if (bullet.kind === 'bubble') {
        ctx.save();
        ctx.globalAlpha = 0.78;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius, 0, 2 * Math.PI);
        ctx.fillStyle = bullet.color || 'rgba(90, 195, 255, 0.62)';
        ctx.fill();
        ctx.globalAlpha = 0.95;
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#c6f2ff';
        ctx.stroke();
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.arc(bullet.x - bullet.radius * 0.28, bullet.y - bullet.radius * 0.28, Math.max(3, bullet.radius * 0.32), 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.restore();
        return;
    }
    if (bullet.kind === 'rocket') {
        const width = 40;
        const height = 25;
        const rotation = bullet.angle || 0;
        if (playerImages.Missile.complete) {
            ctx.save();
            ctx.translate(bullet.x, bullet.y);
            ctx.rotate(rotation);
            ctx.drawImage(playerImages.Missile, -width / 2, -height / 2, width, height);
            ctx.restore();
            return;
        }
    }
    if (bullet.kind === 'reaverShard') {
        const size = 24;
        if (playerImages.ReaverShard.complete) {
            ctx.save();
            ctx.translate(bullet.x, bullet.y);
            ctx.rotate(bullet.angle || 0);
            ctx.drawImage(playerImages.ReaverShard, -size / 2, -size / 2, size, size);
            ctx.restore();
            return;
        }
    }
    if (bullet.kind === 'flame') {
        const outerRadius = bullet.radius || 4;
        const innerRadius = outerRadius * 0.55;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, outerRadius, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255, 190, 30, 0.8)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, innerRadius, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255, 240, 120, 0.95)';
        ctx.fill();
        return;
    }
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, 2 * Math.PI);
    ctx.fillStyle = bullet.color;
    ctx.fill();
    ctx.strokeStyle = bullet.strokeColor;
    ctx.stroke(); 
}

function drawLaserBeam(beam) {
    ctx.save();
    ctx.strokeStyle = beam.color || '#3fd7ff';
    ctx.lineWidth = 5;
    ctx.shadowColor = beam.color || '#3fd7ff';
    ctx.shadowBlur = 12;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(beam.startX, beam.startY);
    ctx.lineTo(beam.endX, beam.endY);
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#d8ffff';
    ctx.beginPath();
    ctx.moveTo(beam.startX, beam.startY);
    ctx.lineTo(beam.endX, beam.endY);
    ctx.stroke();
    ctx.restore();
}

function drawGrenade(grenade, thisPlayer) {
    const GRENADE_SIZE = grenade.kind === 'demoExplosive'
        ? 19
        : grenade.kind === 'waffleDrone'
            ? 30
            : 48;

    if (
        grenade.kind === 'demoExplosive' &&
        grenade.hiddenForEnemies &&
        grenade.ownerId &&
        thisPlayer?.id !== grenade.ownerId
    ) {
        return;
    }

    ctx.save();
    ctx.translate(grenade.x, grenade.y);
    ctx.rotate((grenade.kind === 'waffleDrone' ? grenade.angle : grenade.spin) || 0);

    const sprite = grenade.kind === 'demoExplosive'
        ? playerImages.Explosive
        : grenade.kind === 'waffleDrone'
            ? playerImages.WaffleDrone
            : playerImages.Grenade;
    if (sprite.complete) {
        ctx.drawImage(sprite, -GRENADE_SIZE / 2, -GRENADE_SIZE / 2, GRENADE_SIZE, GRENADE_SIZE);
    } else {
        ctx.beginPath();
        ctx.arc(0, 0, grenade.radius || 20, 0, 2 * Math.PI);
        ctx.fillStyle = grenade.kind === 'demoExplosive'
            ? '#ff7f5f'
            : grenade.kind === 'waffleDrone'
                ? '#d8c18b'
                : '#75ff8f';
        ctx.fill();
        ctx.strokeStyle = grenade.kind === 'demoExplosive'
            ? '#8f3d2c'
            : grenade.kind === 'waffleDrone'
                ? '#81725a'
                : '#2c8f44';
        ctx.stroke();
    }

    ctx.restore();
}

function spawnExplosiveEffect(x, y) {
    explosiveEffects.push({
        x,
        y,
        life: 18,
        maxLife: 18,
        maxRadius: 64
    });
}

function drawExplosiveEffects() {
    for (let i = explosiveEffects.length - 1; i >= 0; i--) {
        const fx = explosiveEffects[i];
        fx.life -= 1;
        if (fx.life <= 0) {
            explosiveEffects.splice(i, 1);
            continue;
        }

        const progress = 1 - (fx.life / fx.maxLife);
        const radius = 8 + progress * fx.maxRadius;
        const alpha = Math.max(0, (1 - progress) * 0.75);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ffd44d';
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.globalAlpha = alpha * 0.9;
        ctx.strokeStyle = '#fff2ad';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }
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

function startTwoVsTwo() {
    gameMode = '2v2';
    showSearching();
    socket.emit('findTwoVsTwo', {
        characterType: playerSettings.characterType,
        weaponType: playerSettings.weaponType,
        secondaryWeaponType: playerSettings.secondaryWeaponType,
        sharedAbilityType: playerSettings.sharedAbilityType,
    });
    main();
}

function handleKeyDown(event) {
    const key = typeof event.key === 'string' ? event.key.toLowerCase() : '';

    if (gameActive && key === 'enter') {
        event.preventDefault();
        if (isChatFocused()) {
            sendChatFromInput();
        } else {
            focusChatInput();
        }
        return;
    }

    if (isChatFocused()) {
        return;
    }

    if (key === NET_DEBUG_TOGGLE_KEY || event.code === 'KeyL') {
        event.preventDefault();
        netDebugOverlayEnabled = !netDebugOverlayEnabled;
        return;
    }
    updateLocalInputState(event.keyCode, true);
    socket.emit('keydown', event.keyCode);
}

function handleKeyUp(event) {
    if (isChatFocused()) {
        return;
    }
    updateLocalInputState(event.keyCode, false);
    socket.emit('keyup', event.keyCode);
}

function handleMouseMove(event) {
    mouseX = event.clientX;
    mouseY = event.clientY;

    if (isChatFocused()) {
        return;
    }

    const rect = canvas.getBoundingClientRect();
    const canvasMouseX = event.clientX - rect.left;
    const canvasMouseY = event.clientY - rect.top;
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    const angle = Math.atan2(canvasMouseY - centerY, canvasMouseX - centerX);
    localAimAngle = angle;
    socket.emit('changeAngle', angle);
}

function handleMouseDown(event) {
    if (chatContainer && chatContainer.contains(event.target)) {
        return;
    }
    socket.emit('mouseDown', event.button);
}

function handleMouseUp(event) {
    if (chatContainer && chatContainer.contains(event.target)) {
        return;
    }
    socket.emit('mouseUp', event.button);
}

function updateLocalInputState(keyCode, pressed) {
    switch (keyCode) {
        case 87:
        case 119:
            localInputState.up = pressed;
            break;
        case 83:
        case 115:
            localInputState.down = pressed;
            break;
        case 65:
        case 97:
            localInputState.left = pressed;
            break;
        case 68:
        case 100:
            localInputState.right = pressed;
            break;
        default:
            break;
    }
}

function clearLocalInputState() {
    localInputState.up = false;
    localInputState.down = false;
    localInputState.left = false;
    localInputState.right = false;
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
    if (isFreeForAllMode()) {
        Toastify({
            text: `A player left the game. ${data.playerCount} players remaining.`,
            duration: 3000,
            gravity: "top",
            position: "right",
        }).showToast();
    } else if (gameMode === '2v2' && Number.isFinite(Number(data?.playerCount))) {
        Toastify({
            text: `A player left the queue. ${Number(data.playerCount)} player(s) waiting.`,
            duration: 2800,
            gravity: "top",
            position: "right",
        }).showToast();
    }
}

function handleKill(data) {
    if (isFreeForAllMode()) {
        freeForAllSessionProgress.kills = Math.max(
            freeForAllSessionProgress.kills + 1,
            Math.max(0, Math.round(Number(data?.killCount || 0)))
        );
    }
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
    const thisPlayer = gameState.players.find((player) => player.id === socket.id);
    if (
        thisPlayer?.primaryWeapon?.name === 'Laser Gun' ||
        thisPlayer?.primaryWeapon?.name === 'Flamethrower'
    ) {
        return;
    }
    if (thisPlayer?.primaryWeapon?.name === 'Rocket Launcher') {
        soundManager.play('rocket_launch', 0.3);
        return;
    }
    soundManager.play("shoot", 0.25);
}

function handleSpecialAbility() {
    const thisPlayer = gameState.players.find((player) => player.id === socket.id);
    if (thisPlayer?.specialAbility?.name === 'Reaver Shard') {
        soundManager.play('reaver_fire', 0.25);
    }
}

function handleSharedAbility() {
    const thisPlayer = gameState.players.find((player) => player.id === socket.id);
    if (thisPlayer?.sharedAbility?.name === 'Healing Circle') {
        soundManager.play('heal2', 0.28);
    }
}

function handleKingAuraPulse() {
    soundManager.play('bell', 0.28);
}

function handleReaverZap() {
    soundManager.play('zap', 0.3);
}

function handlePickupCollected(data) {
    if (data?.type === 'heal') {
        soundManager.play('heal', 0.25);
        return;
    }
    if (data?.type === 'coin') {
        if (isFreeForAllMode()) {
            freeForAllSessionProgress.coins += 1;
        }
        soundManager.play('coin', 0.25);
    }
}

function handleCombatText(data) {
    if (!data || typeof data.x !== 'number' || typeof data.y !== 'number') return;

    const roundedAmount = Math.max(1, Math.round(data.amount || 0));
    combatTexts.push({
        type: data.type === 'healing' ? 'healing' : 'damage',
        amount: roundedAmount,
        x: data.x + (Math.random() * 16 - 8),
        y: data.y,
        driftX: Math.random() * 0.4 - 0.2,
        life: 45,
        maxLife: 45,
        floatOffset: 0
    });
}

function handleMatchEnded(data) {
    if (!data) return;

    if (forfeitReturnTimeout) {
        clearTimeout(forfeitReturnTimeout);
        forfeitReturnTimeout = null;
    }

    gameActive = false;
    soundManager.stop('laser');
    soundManager.stop('flame');
    clearAmbienceStartRetry();
    soundManager.stop('ambience');
    const isFreeForAllResult = isFreeForAllMode(data.gameMode) || isFreeForAllMode();
    matchEndTitle.textContent = isFreeForAllResult
        ? 'Match Ended'
        : (data.youWon ? 'Victory' : 'Defeat');
    if (gameMode === '2v2' || data.winnerTeam) {
        const redLives = Number(data.teamLives?.red ?? gameState.teamLives?.red ?? 0);
        const blueLives = Number(data.teamLives?.blue ?? gameState.teamLives?.blue ?? 0);
        matchEndScore.textContent = `Red ${redLives} - Blue ${blueLives}`;
    } else if (isFreeForAllResult) {
        const kills = Math.max(0, Math.round(Number(data.yourKills || 0)));
        const coinsCollected = Math.max(0, Math.round(Number(data.coinsCollected || 0)));
        matchEndScore.textContent = `${kills} Kills - ${coinsCollected} Coins`;
    } else {
        matchEndScore.textContent = `${data.yourKills || 0} - ${data.opponentKills || 0}`;
    }
    if (matchEndSubtitle) {
        let subtitle = 'Returning to menu...';
        if (data.reason === 'forfeit') {
            subtitle = data.youWon ? 'Opponent forfeited.' : 'Forfeit counted as a loss.';
        }

        const isTwoVsTwoMatch = gameMode === '2v2' || data.winnerTeam;
        const hasEloDelta = Number.isFinite(Number(data.eloDelta));
        if (isFreeForAllResult) {
            subtitle = 'Returning to menu...';
        } else if (isTwoVsTwoMatch) {
            const winnerTeam = data.winnerTeam === 'red' ? 'Red' : 'Blue';
            subtitle = `${subtitle} ${winnerTeam} team wins!`;
        } else if (hasEloDelta) {
            const eloDelta = Number(data.eloDelta);
            const deltaText = eloDelta > 0 ? `+${eloDelta}` : `${eloDelta}`;
            const newElo = Number(data.newElo);
            const eloSuffix = Number.isFinite(newElo) ? ` (${newElo})` : '';
            subtitle = `${subtitle} Elo ${deltaText}${eloSuffix}.`;

            if (authState.mode === 'account' && authState.account) {
                authState.account.elo = Number.isFinite(newElo)
                    ? newElo
                    : Number(authState.account.elo || 500) + eloDelta;
                updateAccountSummaryUi();
            }
        } else if (data.rated === false) {
            subtitle = `${subtitle} Guest rating stays at 500.`;
        }

        const hasBuxDelta = Number.isFinite(Number(data.buxDelta));
        const hasBuxEarned = Number.isFinite(Number(data.buxEarned));
        if (hasBuxDelta || hasBuxEarned) {
            const buxEarned = hasBuxEarned ? Number(data.buxEarned) : Number(data.buxDelta || 0);
            const buxDelta = hasBuxDelta ? Number(data.buxDelta) : buxEarned;
            const buxSuffix = Number.isFinite(Number(data.newBux)) ? ` (${Number(data.newBux)})` : '';
            subtitle = `${subtitle} Bux ${buxDelta >= 0 ? '+' : ''}${buxDelta}${buxSuffix}.`;

            if (authState.mode === 'account' && authState.account && Number.isFinite(Number(data.newBux))) {
                authState.account.bux = Number(data.newBux);
                updateAccountSummaryUi();
            }
        }
        matchEndSubtitle.textContent = subtitle;
    }
    matchEndCard.classList.remove('victory', 'defeat');
    matchEndCard.classList.add((isFreeForAllResult || data.youWon) ? 'victory' : 'defeat');
    matchEndCard.style.animation = 'none';
    // Force reflow so pop animation restarts each match end.
    void matchEndCard.offsetWidth;
    matchEndCard.style.animation = '';
    matchEndOverlay.classList.add('show');

    if (matchEndTimeout) {
        clearTimeout(matchEndTimeout);
    }
    matchEndTimeout = setTimeout(() => {
        showMainMenu();
    }, 8000);
}

function handleMatchClosed() {
    if (forfeitReturnTimeout) {
        clearTimeout(forfeitReturnTimeout);
        forfeitReturnTimeout = null;
    }
    soundManager.stop('laser');
    soundManager.stop('flame');
    clearAmbienceStartRetry();
    soundManager.stop('ambience');
    showMainMenu();
}

function handleServerError(message) {
    const text = typeof message === 'string' && message.trim() ? message : 'Server error';
    Toastify({
        text: escapeHtml(text),
        duration: 3200,
        gravity: "top",
        position: "right",
        style: {
            background: "linear-gradient(to right, #a11a1a, #d64545)"
        }
    }).showToast();
}
