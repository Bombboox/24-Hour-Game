function saveCharacterSettings(characterType, weaponType, secondaryWeaponType) {
    const settings = {
        characterType: characterType,
        weaponType: weaponType,
        secondaryWeaponType: secondaryWeaponType
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
        weaponType: 'm4',
        secondaryWeaponType: 'pistol'
    };
}

function clearCharacterSettings() {
    localStorage.removeItem('playerSettings');
}
