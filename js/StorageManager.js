const STORAGE_KEYS = {
    ENTRIES: 'bloodPressureEntries',
    SETTINGS: 'bloodPressureSettings',
    API_KEY: 'bloodPressureMistralApiKey',
    THEME: 'bloodPressureTheme',
    LAST_BACKUP: 'bloodPressureLastBackup'
};

const DEFAULT_SETTINGS = {
    sysHigh: 140,
    diaHigh: 90,
    sysLow: 90,
    diaLow: 60,
    model: 'pixtral-12b-2409'
};

class StorageManager {
    constructor() {
        this.entriesKey = STORAGE_KEYS.ENTRIES;
        this.settingsKey = STORAGE_KEYS.SETTINGS;
    }

    getStorage() {
        if (typeof localStorage === 'undefined') {
            return {
                getItem: () => null,
                setItem: () => {},
                removeItem: () => {},
                clear: () => {}
            };
        }
        return localStorage;
    }

    loadEntries() {
        const storage = this.getStorage();
        const raw = storage.getItem(this.entriesKey);
        if (!raw) return [];
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }

    saveEntries(entries) {
        const storage = this.getStorage();
        storage.setItem(this.entriesKey, JSON.stringify(entries));
    }

    loadSettings() {
        const storage = this.getStorage();
        const raw = storage.getItem(this.settingsKey);
        const defaults = Object.assign({}, DEFAULT_SETTINGS);
        if (!raw) return defaults;
        try {
            return Object.assign(defaults, JSON.parse(raw));
        } catch (e) {
            return defaults;
        }
    }

    saveSettings(settings) {
        const storage = this.getStorage();
        storage.setItem(this.settingsKey, JSON.stringify(settings));
    }

    loadApiKey() {
        const storage = this.getStorage();
        return storage.getItem(STORAGE_KEYS.API_KEY) || '';
    }

    saveApiKey(key) {
        const storage = this.getStorage();
        storage.setItem(STORAGE_KEYS.API_KEY, key || '');
    }

    loadTheme() {
        const storage = this.getStorage();
        return storage.getItem(STORAGE_KEYS.THEME) || 'light';
    }

    saveTheme(theme) {
        const storage = this.getStorage();
        storage.setItem(STORAGE_KEYS.THEME, theme);
    }

    setLastBackup(timestamp) {
        const storage = this.getStorage();
        storage.setItem(STORAGE_KEYS.LAST_BACKUP, timestamp || new Date().toISOString());
    }

    getLastBackup() {
        const storage = this.getStorage();
        return storage.getItem(STORAGE_KEYS.LAST_BACKUP) || null;
    }

    clearAll() {
        const storage = this.getStorage();
        Object.keys(STORAGE_KEYS).forEach((key) => {
            storage.removeItem(STORAGE_KEYS[key]);
        });
    }
}

const storageManager = new StorageManager();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        STORAGE_KEYS,
        DEFAULT_SETTINGS,
        StorageManager,
        storageManager
    };
}