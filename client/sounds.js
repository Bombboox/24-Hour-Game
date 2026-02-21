// Sound management using SoundJS
class SoundManager {
    constructor() {
        this.sounds = {};
        this.initialized = false;
        this.loopInstances = new Map();
    }

    init() {
        if (this.initialized) return;
        
        createjs.Sound.registerSound("sounds/ding.mp3", "ding");
        createjs.Sound.registerSound("sounds/reload.wav", "reload");
        createjs.Sound.registerSound("sounds/shoot.mp3", "shoot");
        createjs.Sound.registerSound("sounds/hit.mp3", "hit");
        createjs.Sound.registerSound("sounds/gotHit.mp3", "gotHit");
        createjs.Sound.registerSound("sounds/laser.mp3", "laser");
        
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

    playLoop(soundId, volume = 1) {
        if (!this.initialized) this.init();

        const existing = this.loopInstances.get(soundId);
        if (existing && existing.playState !== createjs.Sound.PLAY_FINISHED) {
            existing.volume = volume;
            return existing;
        }

        try {
            const instance = createjs.Sound.play(soundId, { loop: -1 });
            if (instance) {
                instance.volume = volume;
                this.loopInstances.set(soundId, instance);
            }
            return instance;
        } catch (error) {
            console.warn(`Failed to play looped sound: ${soundId}`, error);
        }
    }

    stop(soundId) {
        const instance = this.loopInstances.get(soundId);
        if (instance) {
            instance.stop();
            this.loopInstances.delete(soundId);
        }
    }

    stopAllLoops() {
        for (const [soundId, instance] of this.loopInstances.entries()) {
            if (instance) {
                instance.stop();
            }
            this.loopInstances.delete(soundId);
        }
    }
}

const soundManager = new SoundManager();

document.addEventListener('DOMContentLoaded', () => {
    soundManager.init();
});
