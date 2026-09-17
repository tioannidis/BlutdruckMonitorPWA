const BloodPressureTracker = require('../js/BloodPressureTracker.js');

const sampleEntry = (overrides) => Object.assign({
    id: 'e1',
    date: '2026-09-17',
    period: 'morning',
    time: '07:30',
    systolic: 137,
    diastolic: 88,
    pulse: 72,
    notes: '',
    source: 'manual',
    imageAnalyzed: false,
    createdAt: '2026-09-17T07:30:00.000Z',
    updatedAt: '2026-09-17T07:30:00.000Z'
}, overrides);

describe('BloodPressureTracker', () => {
    let tracker;

    beforeEach(() => {
        tracker = new BloodPressureTracker(true);
        tracker.settings = { sysHigh: 140, diaHigh: 90, sysLow: 90, diaLow: 60 };
    });

    test('entriesForDate filters and sorts by period', () => {
        tracker.entries = [
            sampleEntry({ id: '1', date: '2026-09-17', period: 'evening', time: '19:00' }),
            sampleEntry({ id: '2', date: '2026-09-17', period: 'morning', time: '07:00' }),
            sampleEntry({ id: '3', date: '2026-09-16', period: 'morning' })
        ];
        const result = tracker.entriesForDate('2026-09-17');
        expect(result.map((e) => e.period)).toEqual(['morning', 'evening']);
    });

    test('averageOf computes rounded averages', () => {
        tracker.entries = [
            sampleEntry({ systolic: 140, diastolic: 90, pulse: 70 }),
            sampleEntry({ systolic: 130, diastolic: 86, pulse: 74 })
        ];
        const avg = tracker.averageOf(tracker.entriesForDate('2026-09-17'));
        expect(avg.sys).toBe(135);
        expect(avg.dia).toBe(88);
        expect(avg.pulse).toBe(72);
    });

    test('validateFormData accepts valid data', () => {
        const error = tracker.validateFormData({ systolic: 137, diastolic: 88, pulse: 72 });
        expect(error).toBeNull();
    });

    test('validateFormData rejects empty data', () => {
        const error = tracker.validateFormData({ systolic: null, diastolic: null, pulse: null });
        expect(error).toContain('mindestens einen Wert');
    });

    test('validateFormData rejects implausible values', () => {
        const error = tracker.validateFormData({ systolic: 500, diastolic: 88, pulse: 72 });
        expect(error).toContain('plausiblen Bereich');
    });

    test('collectFormData reads form values and averages second measurement', () => {
        document.getElementById('entrySystolic').value = '140';
        document.getElementById('entryDiastolic').value = '90';
        document.getElementById('entryPulse').value = '70';
        document.getElementById('entrySys2').value = '130';
        document.getElementById('entryDia2').value = '86';
        document.getElementById('entryPulse2').value = '74';
        document.getElementById('avgToggle').checked = true;
        document.getElementById('entryPeriod').value = 'morning';
        document.getElementById('entryTime').value = '07:30';
        document.getElementById('entryNotes').value = '  Testnotiz  ';

        tracker.selectedDateKey = '2026-09-17';
        const data = tracker.collectFormData();

        expect(data.systolic).toBe(135);
        expect(data.diastolic).toBe(88);
        expect(data.pulse).toBe(72);
        expect(data.period).toBe('morning');
        expect(data.notes).toBe('Testnotiz');
        expect(data.date).toBe('2026-09-17');
    });

    test('saveEntryFromForm adds a manual entry', () => {
        document.getElementById('entrySystolic').value = '137';
        document.getElementById('entryDiastolic').value = '88';
        document.getElementById('entryPulse').value = '72';
        document.getElementById('entryPeriod').value = 'morning';
        document.getElementById('entryTime').value = '07:30';

        tracker.selectedDateKey = '2026-09-17';
        tracker.saveEntryFromForm();

        expect(tracker.entries.length).toBe(1);
        expect(tracker.entries[0].source).toBe('manual');
        expect(tracker.entries[0].systolic).toBe(137);
        expect(tracker.entries[0].date).toBe('2026-09-17');
    });

    test('saveEntryFromForm updates existing entry in edit mode', () => {
        tracker.entries = [sampleEntry()];
        tracker.editingId = 'e1';
        tracker.isEditMode = true;
        tracker.selectedDateKey = '2026-09-17';

        document.getElementById('entrySystolic').value = '120';
        document.getElementById('entryDiastolic').value = '80';
        document.getElementById('entryPulse').value = '65';
        document.getElementById('entryPeriod').value = 'evening';
        document.getElementById('entryTime').value = '19:00';

        tracker.saveEntryFromForm();

        expect(tracker.entries.length).toBe(1);
        expect(tracker.entries[0].systolic).toBe(120);
        expect(tracker.entries[0].period).toBe('evening');
        expect(tracker.entries[0].id).toBe('e1');
    });

    test('saveAiResult stores entry with ai source and confidence', () => {
        tracker.aiResult = { systolic: 137, diastolic: 88, pulse: 72, confidence: 0.93 };
        tracker.selectedDateKey = '2026-09-17';

        document.getElementById('aiSys').value = '137';
        document.getElementById('aiDia').value = '88';
        document.getElementById('aiPulse').value = '72';
        document.getElementById('aiPeriod').value = 'morning';
        document.getElementById('aiTime').value = '08:00';
        document.getElementById('aiNotes').value = '';

        tracker.saveAiResult();

        expect(tracker.entries.length).toBe(1);
        const entry = tracker.entries[0];
        expect(entry.source).toBe('ai');
        expect(entry.imageAnalyzed).toBe(true);
        expect(entry.aiConfidence).toBeCloseTo(0.93, 2);
        expect(entry.systolic).toBe(137);
    });

    test('deleteSpecificEntry removes the entry', () => {
        tracker.entries = [sampleEntry({ id: 'e1' }), sampleEntry({ id: 'e2' })];
        tracker.selectedDateKey = '2026-09-17';
        global.confirm = jest.fn(() => true);

        tracker.deleteSpecificEntry(0);
        expect(tracker.entries.length).toBe(1);
        expect(tracker.entries[0].id).toBe('e2');
    });

    test('exportAllData exports entries and settings', () => {
        tracker.entries = [sampleEntry()];
        let exported = null;
        global.Blob = jest.fn(function (content) {
            exported = JSON.parse(content[0]);
        });
        global.URL = {
            createObjectURL: jest.fn(() => 'blob:mock'),
            revokeObjectURL: jest.fn()
        };

        tracker.exportAllData();

        expect(exported).toBeDefined();
        expect(exported.app).toBe('Blutdruck Monitor');
        expect(exported.entries.length).toBe(1);
        expect(exported.entries[0].systolic).toBe(137);
    });
});