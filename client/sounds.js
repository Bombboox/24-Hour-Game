// Sound management using SoundJS
class SoundManager {
    constructor() {
        this.sounds = {};
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        
        createjs.Sound.registerSound("sounds/ding.mp3", "ding");
        createjs.Sound.registerSound("sounds/reload.wav", "reload");
        createjs.Sound.registerSound("sounds/shoot.mp3", "shoot");
        createjs.Sound.registerSound("sounds/hit.mp3", "hit");
        createjs.Sound.registerSound("sounds/gotHit.mp3", "gotHit");
        
        this.initialized = true;
    }

    play(soundId, volume = 1) {
        if (!this.initialized) this.init();
        
        try {
            const instance = createjs.Sound.play(soundId);
            if (instance) {
                instance.volume = volume;
            }
            return instance;
        } catch (error) {
            console.warn(`Failed to play sound: ${soundId}`, error);
        }
    }
}

const soundManager = new SoundManager();

document.addEventListener('DOMContentLoaded', () => {
    soundManager.init();
});
