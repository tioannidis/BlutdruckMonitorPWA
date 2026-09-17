const { storageManager, STORAGE_KEYS, DEFAULT_SETTINGS } = require('../js/StorageManager.js');

describe('StorageManager', () => {
    test('loads empty entries when nothing stored', () => {
        expect(storageManager.loadEntries()).toEqual([]);
    });

    test('saves and loads entries', () => {
        const entries = [
            { id: '1', date: '2026-09-17', systolic: 137, diastolic: 88, pulse: 72 }
        ];
        storageManager.saveEntries(entries);
        expect(storageManager.loadEntries()).toEqual(entries);
    });

    test('returns default settings when nothing stored', () => {
        const settings = storageManager.loadSettings();
        expect(settings.sysHigh).toBe(DEFAULT_SETTINGS.sysHigh);
        expect(settings.model).toBe(DEFAULT_SETTINGS.model);
    });

    test('merges stored settings with defaults', () => {
        storageManager.saveSettings({ sysHigh: 130 });
        const settings = storageManager.loadSettings();
        expect(settings.sysHigh).toBe(130);
        expect(settings.diaHigh).toBe(DEFAULT_SETTINGS.diaHigh);
    });

    test('saves and loads api key', () => {
        storageManager.saveApiKey('test-key-123');
        expect(storageManager.loadApiKey()).toBe('test-key-123');
    });

    test('handles corrupted JSON gracefully', () => {
        localStorage.setItem(STORAGE_KEYS.ENTRIES, '{{{invalid json');
        expect(storageManager.loadEntries()).toEqual([]);
    });

    test('clearAll removes everything', () => {
        storageManager.saveEntries([{ id: '1' }]);
        storageManager.saveApiKey('key');
        storageManager.clearAll();
        expect(storageManager.loadEntries()).toEqual([]);
        expect(storageManager.loadApiKey()).toBe('');
    });
});