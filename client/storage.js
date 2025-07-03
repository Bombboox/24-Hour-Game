function saveCharacterSettings(characterType, weaponType) {
    const settings = {
        characterType: characterType,
        weaponType: weaponType
    };
    
    localStorage.setItem('playerSettings', JSON.stringify(settings));
}

function loadCharacterSettings() {
    const savedSettings = localStorage.getItem('playerSettings');
    
    if (savedSettings) {
        try {
            return JSON.parse(savedSettings);
        } catch (error) {
            console.error('Error parsing saved settings:', error);
            return getDefaultSettings();
        }
    }
    
    return getDefaultSettings();
}

function getDefaultSettings() {
    return {
        characterType: 'berserker',
        weaponType: 'm4'
    };
}

function clearCharacterSettings() {
    localStorage.removeItem('playerSettings');
}
