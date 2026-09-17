const PERIODS = {
    morning: { key: 'morning', label: 'Morgens', emoji: '🌅', order: 1 },
    midday: { key: 'midday', label: 'Mittags', emoji: '☀️', order: 2 },
    evening: { key: 'evening', label: 'Abends', emoji: '🌙', order: 3 },
    other: { key: 'other', label: 'Individuell', emoji: '🕐', order: 4 }
};

const PERIOD_ORDER = ['morning', 'midday', 'evening', 'other'];

function periodInfo(period) {
    return PERIODS[period] || PERIODS.other;
}

function formatDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function todayKey() {
    return formatDateKey(new Date());
}

function uuid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function isPlausible(value) {
    const n = Number(value);
    return Number.isInteger(n) && n > 0;
}

function isValidReading(systolic, diastolic, pulse) {
    if (systolic !== null && systolic !== '' && systolic !== undefined) {
        const s = Number(systolic);
        if (!Number.isInteger(s) || s < 60 || s > 260) return false;
    }
    if (diastolic !== null && diastolic !== '' && diastolic !== undefined) {
        const d = Number(diastolic);
        if (!Number.isInteger(d) || d < 30 || d > 160) return false;
    }
    if (pulse !== null && pulse !== '' && pulse !== undefined) {
        const p = Number(pulse);
        if (!Number.isInteger(p) || p < 20 || p > 250) return false;
    }
    return true;
}

function classifyReading(systolic, diastolic, limits) {
    limits = limits || {};
    const sysHigh = Number(limits.sysHigh) || 140;
    const sysLow = Number(limits.sysLow) || 90;
    const diaHigh = Number(limits.diaHigh) || 90;
    const diaLow = Number(limits.diaLow) || 60;

    if (systolic >= sysHigh || diastolic >= diaHigh) {
        return { level: 'high', label: 'Erhöht', color: '#dc3545' };
    }
    if (systolic <= sysLow || diastolic <= diaLow) {
        return { level: 'low', label: 'Niedrig', color: '#fd7e14' };
    }
    return { level: 'normal', label: 'Normal', color: '#198754' };
}

function saveToFile(data, filename, mimeType) {
    const blob = new Blob([data], { type: mimeType || 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PERIODS,
        PERIOD_ORDER,
        periodInfo,
        formatDateKey,
        todayKey,
        uuid,
        isPlausible,
        isValidReading,
        classifyReading,
        saveToFile,
        escapeHtml
    };
}