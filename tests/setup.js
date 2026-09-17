/**
 * Jest Setup für Blutdruck Monitor Tests
 */

// Mock für console um Spam in Tests zu reduzieren
global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};

// Globale Utilities aus utils.js - damit BloodPressureTracker.js sie in Node finden kann
const utils = require('../js/utils.js');
global.PERIODS = utils.PERIODS;
global.PERIOD_ORDER = utils.PERIOD_ORDER;
global.periodInfo = utils.periodInfo;
global.formatDateKey = utils.formatDateKey;
global.todayKey = utils.todayKey;
global.uuid = utils.uuid;
global.isPlausible = utils.isPlausible;
global.isValidReading = utils.isValidReading;
global.classifyReading = utils.classifyReading;
global.saveToFile = utils.saveToFile;
global.escapeHtml = utils.escapeHtml;

// Globale Singletons
global.storageManager = require('../js/StorageManager.js').storageManager;
global.mistralClient = require('../js/MistralClient.js').mistralClient;

// Mock Elemente für DOM-Tests
global.__mockElements = new Map();

global.createMockElement = (id) => {
    const el = {
        id,
        innerHTML: '',
        textContent: '',
        className: '',
        value: '',
        checked: false,
        disabled: false,
        type: 'text',
        style: {},
        dataset: {},
        classList: {
            add: jest.fn(),
            remove: jest.fn(),
            toggle: jest.fn(),
            contains: jest.fn(() => false)
        },
        onclick: null,
        onchange: null,
        appendChild: jest.fn((child) => child),
        removeChild: jest.fn(),
        setAttribute: jest.fn(),
        getAttribute: jest.fn(() => null),
        addEventListener: jest.fn(),
        querySelector: jest.fn(() => null),
        querySelectorAll: jest.fn(() => []),
        click: jest.fn()
    };
    return el;
};

global.setupMockDocument = () => {
    global.__mockElements.clear();

    if (typeof document !== 'undefined') {
        document.getElementById = jest.fn((id) => {
            if (!global.__mockElements.has(id)) {
                global.__mockElements.set(id, createMockElement(id));
            }
            return global.__mockElements.get(id);
        });
        document.createElement = jest.fn(() => createMockElement());
        document.addEventListener = jest.fn();
        try {
            Object.defineProperty(document, 'body', {
                configurable: true,
                value: {
                    appendChild: jest.fn(),
                    removeChild: jest.fn(),
                    classList: createMockElement().classList
                }
            });
        } catch (e) {
            // jsdom accessor nicht überschreibbar - ignoriere
        }
    }
};

global.resetLocalStorage = () => {
    if (typeof localStorage !== 'undefined') {
        localStorage.clear();
    }
};

// Setup vor jedem Test
beforeEach(() => {
    jest.clearAllMocks();
    setupMockDocument();
    resetLocalStorage();
});