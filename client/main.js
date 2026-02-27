const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d")
const menuBackdropCanvas = document.getElementById("menuBackdrop");
const menuBackdropCtx = menuBackdropCanvas ? menuBackdropCanvas.getContext("2d") : null;
const authChoiceMenu = document.getElementById("authChoiceMenu");
const registerMenu = document.getElementById("registerMenu");
const displayNameMenu = document.getElementById("displayNameMenu");
const menu = document.getElementById("menu");
const characterMenu = document.getElementById("characterMenu");
const searchingMenu = document.getElementById("searchingMenu");
const controlsMenu = document.getElementById("controlsMenu");
const menuLink = document.querySelector(".menu-link");
const gameScreen = document.getElementById("gameScreen");
const healthBar = document.getElementById("healthBar");
const healthFill = document.getElementById("healthFill");
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
const matchEndOverlay = document.getElementById("matchEndOverlay");
const matchEndCard = document.getElementById("matchEndCard");
const matchEndTitle = document.getElementById("matchEndTitle");
const matchEndScore = document.getElementById("matchEndScore");
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
const registerStatus = document.getElementById("registerStatus");
const googleSignInButton = document.getElementById("googleSignInButton");
const logoutButton = document.getElementById("logoutButton");
const displayNameInput = document.getElementById("displayNameInput");
const displayNameStatus = document.getElementById("displayNameStatus");
const accountSummary = document.getElementById("accountSummary");
const accountSummaryName = document.getElementById("accountSummaryName");
const accountSummaryStats = document.getElementById("accountSummaryStats");

const MAP_COLOR = "#d3d3d3";
const GRID_MINOR_SIZE = 35;
const GRID_MAJOR_EVERY = 5;
const GRID_MINOR_COLOR = "rgba(255, 255, 255, 0.23)";
const GRID_MAJOR_COLOR = "rgba(255, 255, 255, 0.21)";
const MENU_BACKDROP_SPRITES = ["King", "Ninja", "Berserker", "Demoman", "Reaver"];
const MENU_BACKDROP_ACTOR_COUNT = 8;
const MENU_BACKDROP_FPS = 24;

const playerImages = {
    King: new Image(),
    Ninja: new Image(),
    Berserker: new Image(),
    Demoman: new Image(),
    Reaver: new Image(),
    Grenade: new Image(),
    Explosive: new Image(),
    ReaverShard: new Image(),
    Missile: new Image(),
    TurretBase: new Image(),
    TurretHead: new Image(),
}
const obstacleImages = {
    shield: new Image(),
};

playerImages.King.src = 'sprites/king.png';
playerImages.Ninja.src = 'sprites/ninja.png';
playerImages.Berserker.src = 'sprites/berserker.png';
playerImages.Demoman.src = 'sprites/demo.png';
playerImages.Reaver.src = 'sprites/reaver.png';
playerImages.Grenade.src = 'sprites/grenade.png';
playerImages.Explosive.src = 'sprites/explosive.png';
playerImages.ReaverShard.src = 'sprites/reaver_shard.png';
playerImages.Missile.src = 'sprites/missle.png';
playerImages.TurretBase.src = 'sprites/turret_base.png';
playerImages.TurretHead.src = 'sprites/turret_head.png';
obstacleImages.shield.src = 'sprites/shield.png';

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
}

const socket = new WebSocketGameClient();

var gameState = {
    players: [],
    bullets: [],
    grenades: [],
    obstacles: [],
}
const SNAPSHOT_BUFFER_SIZE = 90;
const RENDER_INTERPOLATION_DELAY_MS = 120;
const MAX_RENDER_INTERPOLATION_DELAY_MS = 240;
const MAX_EXTRAPOLATION_MS = 140;
const MIN_EXTRAPOLATION_SAMPLE_MS = 12;
const MAX_LINEAR_EXTRAPOLATION_STEP = 42;
const MAX_ANGULAR_EXTRAPOLATION_STEP = Math.PI * 0.35;
const MAX_EXTRAPOLATION_ALPHA = 0.65;
const EXTRAPOLATION_ALPHA_EASING = 1.2;
const SNAPSHOT_INTERVAL_SMOOTHING = 0.15;
const SNAPSHOT_JITTER_SMOOTHING = 0.2;
const SERVER_DELTA_TIME_DIVISOR = 40;
const MAX_PREDICTION_STEP_MS = 50;
const LOCAL_RECONCILIATION_LERP = 0.24;
const LOCAL_RECONCILIATION_SNAP_DISTANCE = 170;
const PREDICTION_OVERLAP_ITERATIONS = 6;
const FALLBACK_MOVE_SPEED_BY_NAME = Object.freeze({
    Ninja: 8,
    King: 3,
    Berserker: 6,
    Demoman: 5.5,
    Reaver: 5.8
});
const NET_DEBUG_OVERLAY_DEFAULT = false;
const NET_DEBUG_TOGGLE_KEY = 'l';
let snapshotBuffer = [];
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
    obstacles: new Map()
};

var mapRadius = 1500;
var gameActive = false;
var gameMode = '1v1'; // Track current game mode
const ONE_VS_ONE_KILL_TARGET = 5;
let matchEndTimeout = null;
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
const VALID_CHARACTERS = ['berserker', 'ninja', 'king', 'demoman', 'reaver'];
const VALID_WEAPONS = ['m4', 'pistol', 'shotgun', 'sniper', 'laser', 'taser', 'rocket', 'bubble'];
const VALID_SHARED_ABILITIES = ['grenade', 'invisibility', 'shield', 'turret', 'healingcircle'];
let loadoutDraft = sanitizePlayerSettings(playerSettings);
playerSettings = { ...loadoutDraft };
let lastAutoAdjustedSecondary = null;

renderPatchNotes();
initializeMenuBackdrop();
registerServiceWorker();
setupPwaInstallButton();
setupMobileControls();
initializeAuth();

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
        authState.account = payload.account || null;
        authState.initialized = true;
        authState.mode = 'account';
        updateRegisterUi();
        updateMainMenuTopActions();
        updateAccountSummaryUi();
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
        authState.account = session?.account || null;
        authState.initialized = true;
        authState.mode = authState.authenticated ? 'account' : null;
        updateRegisterUi();
        updateMainMenuTopActions();
        updateAccountSummaryUi();
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
            authState.account = payload.account;
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
    updateRegisterUi();
    updateMainMenuTopActions();
    updateAccountSummaryUi();
    showAuthChoiceMenu();
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
        if (!gameActive) {
            return;
        }

        const shouldQuit = window.confirm('Quit current match and return to the main menu?');
        if (!shouldQuit) {
            return;
        }

        clearVirtualControls();
        socket.emit('leaveMatch');
        showMainMenu();
    });
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
    socket.on('kingAuraPulse', handleKingAuraPulse);
    socket.on('reaverZap', handleReaverZap);
    socket.on('swapWeapons', handleSwapWeapons);
    socket.on('combatText', handleCombatText);
    socket.on('matchEnded', handleMatchEnded);
    socket.on('matchClosed', handleMatchClosed);
    socket.on('error', handleServerError);

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);

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
    menu.style.display = 'block';
    updateMainMenuTopActions();
    updateAccountSummaryUi();
    if (menuLink) {
        menuLink.style.display = 'flex';
    }
    gameActive = false;
    clearVirtualControls();
    updateMobileHudVisibility();
    gameMode = '1v1';
    soundManager.stop('laser');
    matchEndOverlay.classList.remove('show');
    matchEndCard.classList.remove('victory', 'defeat');
    if (matchEndTimeout) {
        clearTimeout(matchEndTimeout);
        matchEndTimeout = null;
    }
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
    const fallbackOrder = ['pistol', 'm4', 'shotgun', 'sniper', 'laser', 'taser', 'rocket', 'bubble'];
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
    clearVirtualControls();
    showMainMenu();
}

function handleGameState(deltaData) {
    if(!gameActive) return;

    // Apply delta updates to local game state
    applyDeltaToGameState(deltaData);

    pushStateSnapshot(gameState, deltaData?.frameNumber);
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
    combatTexts.length = 0;
    explosiveEffects.length = 0;
    snapshotBuffer = [];
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
        players: (state.players || []).map((player) => ({ ...player })),
        bullets: (state.bullets || []).map((bullet) => ({ ...bullet })),
        grenades: (state.grenades || []).map((grenade) => ({ ...grenade })),
        obstacles: (state.obstacles || []).map((obstacle) => ({ ...obstacle })),
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
        obstacles: interpolateEntities(olderState.obstacles, newerState.obstacles, alpha, ['x', 'y'], ['angle']),
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
        obstacles: extrapolateEntities(previousState.obstacles, latestState.obstacles, alpha, ['x', 'y'], ['angle']),
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

function getCollidableObstacles(obstacles = [], playerId = null) {
    return obstacles.filter((obstacle) => {
        if (!obstacle) return false;
        if (obstacle.kind === 'autoTurret' && obstacle.ownerId === playerId) {
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
        authoritativePlayer.id
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
    if (delta.removedGrenades) {
        for (const grenadeId of delta.removedGrenades) {
            const removedGrenade = clientGameStateCache.grenades.get(grenadeId);
            if (removedGrenade?.kind === 'demoExplosive' || removedGrenade?.kind === 'grenade') {
                spawnExplosiveEffect(removedGrenade.x, removedGrenade.y);
                soundManager.play('explosion', 0.3);
            }
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
    if (!thisPlayer) {
        soundManager.stop('laser');
        return; // don't render if player not found
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // update health bar
    const healthRatio = thisPlayer.maxHP > 0 ? (thisPlayer.HP / thisPlayer.maxHP) : 0;
    const overhealed = thisPlayer.HP > thisPlayer.maxHP;
    const clampedPercent = Math.max(0, Math.min(100, healthRatio * 100));
    healthFill.style.width = `${clampedPercent}%`;
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

    updateLaserLoopAudio(thisPlayer);

    if (gameMode === '1v1') {
        killProgressContainer.style.display = 'block';
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

    if (player.auraSlowed) {
        ctx.globalAlpha = 0.24;
        ctx.fillStyle = '#ffd84a';
        ctx.beginPath();
        ctx.arc(0, 0, player.radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.globalAlpha = 1.0;
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

function updateLaserLoopAudio(thisPlayer) {
    const usingLaser = thisPlayer.primaryWeapon?.name === 'Laser Gun';
    const beamActive = !!thisPlayer.laserBeam;

    if (usingLaser && beamActive && gameActive) {
        soundManager.playLoop('laser', 0.2);
    } else {
        soundManager.stop('laser');
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
    const GRENADE_SIZE = grenade.kind === 'demoExplosive' ? 19 : 48;

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
    ctx.rotate(grenade.spin || 0);

    const sprite = grenade.kind === 'demoExplosive' ? playerImages.Explosive : playerImages.Grenade;
    if (sprite.complete) {
        ctx.drawImage(sprite, -GRENADE_SIZE / 2, -GRENADE_SIZE / 2, GRENADE_SIZE, GRENADE_SIZE);
    } else {
        ctx.beginPath();
        ctx.arc(0, 0, grenade.radius || 20, 0, 2 * Math.PI);
        ctx.fillStyle = grenade.kind === 'demoExplosive' ? '#ff7f5f' : '#75ff8f';
        ctx.fill();
        ctx.strokeStyle = grenade.kind === 'demoExplosive' ? '#8f3d2c' : '#2c8f44';
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

function handleKeyDown(event) {
    const key = typeof event.key === 'string' ? event.key.toLowerCase() : '';
    if (key === NET_DEBUG_TOGGLE_KEY || event.code === 'KeyL') {
        event.preventDefault();
        netDebugOverlayEnabled = !netDebugOverlayEnabled;
        return;
    }
    updateLocalInputState(event.keyCode, true);
    socket.emit('keydown', event.keyCode);
}

function handleKeyUp(event) {
    updateLocalInputState(event.keyCode, false);
    socket.emit('keyup', event.keyCode);
}

function handleMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    const angle = Math.atan2(mouseY - centerY, mouseX - centerX);
    localAimAngle = angle;
    socket.emit('changeAngle', angle);
}

function handleMouseDown(event) {
    socket.emit('mouseDown', event.button);
}

function handleMouseUp(event) {
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
    const thisPlayer = gameState.players.find((player) => player.id === socket.id);
    if (thisPlayer?.primaryWeapon?.name === 'Laser Gun') {
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

function handleKingAuraPulse() {
    soundManager.play('bell', 0.28);
}

function handleReaverZap() {
    soundManager.play('zap', 0.3);
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

    gameActive = false;
    soundManager.stop('laser');
    matchEndTitle.textContent = data.youWon ? 'Victory' : 'Defeat';
    matchEndScore.textContent = `${data.yourKills || 0} - ${data.opponentKills || 0}`;
    matchEndCard.classList.remove('victory', 'defeat');
    matchEndCard.classList.add(data.youWon ? 'victory' : 'defeat');
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
    soundManager.stop('laser');
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
