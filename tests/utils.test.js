const utils = require('../js/utils.js');

describe('formatDateKey', () => {
    test('formats date as YYYY-MM-DD', () => {
        expect(utils.formatDateKey(new Date(2026, 8, 17))).toBe('2026-09-17');
    });

    test('pads single digit month and day', () => {
        expect(utils.formatDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    });
});

describe('periodInfo', () => {
    test('returns correct metadata for morning', () => {
        const info = utils.periodInfo('morning');
        expect(info.label).toBe('Morgens');
        expect(info.order).toBe(1);
    });

    test('falls back to other for unknown period', () => {
        const info = utils.periodInfo('unknown');
        expect(info.label).toBe('Individuell');
    });
});

describe('isValidReading', () => {
    test('accepts plausible values', () => {
        expect(utils.isValidReading(137, 88, 72)).toBe(true);
    });

    test('rejects out-of-range systolic', () => {
        expect(utils.isValidReading(300, 88, 72)).toBe(false);
    });

    test('rejects negative pulse', () => {
        expect(utils.isValidReading(137, 88, -5)).toBe(false);
    });

    test('accepts empty fields', () => {
        expect(utils.isValidReading(null, '', undefined)).toBe(true);
    });
});

describe('classifyReading', () => {
    const limits = { sysHigh: 140, diaHigh: 90, sysLow: 90, diaLow: 60 };

    test('classifies high reading', () => {
        const result = utils.classifyReading(150, 95, limits);
        expect(result.level).toBe('high');
    });

    test('classifies normal reading', () => {
        const result = utils.classifyReading(120, 80, limits);
        expect(result.level).toBe('normal');
    });

    test('classifies low reading', () => {
        const result = utils.classifyReading(85, 55, limits);
        expect(result.level).toBe('low');
    });
});

describe('uuid', () => {
    test('generates unique ids', () => {
        const ids = new Set([utils.uuid(), utils.uuid(), utils.uuid()]);
        expect(ids.size).toBe(3);
    });
});