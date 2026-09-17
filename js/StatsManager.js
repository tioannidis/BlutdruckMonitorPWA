class StatsManager {
    constructor(entries, settings) {
        this.entries = entries || [];
        this.settings = settings || {};
    }

    setEntries(entries) {
        this.entries = entries || [];
    }

    entriesInRange(days) {
        const now = new Date();
        const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        const cutoffKey = formatDateKey(cutoff);
        return this.entries.filter((e) => String(e.date) >= cutoffKey && String(e.date) <= todayKey());
    }

    averageFor(entries, key) {
        const list = entries.filter((e) => e[key] !== null && e[key] !== undefined && e[key] !== '');
        if (list.length === 0) return 0;
        const sum = list.reduce((acc, e) => acc + Number(e[key]), 0);
        return Math.round(sum / list.length);
    }

    summarize(rangeDays) {
        const inRange = this.entriesInRange(rangeDays);
        const dayKeys = new Set(inRange.map((e) => e.date));
        const withSys = inRange.filter((e) => e.systolic);
        const withDia = inRange.filter((e) => e.diastolic);
        const withPulse = inRange.filter((e) => e.pulse);

        return {
            rangeDays,
            readings: inRange.length,
            days: dayKeys.size,
            avgSys: withSys.length ? this.averageFor(inRange, 'systolic') : 0,
            avgDia: withDia.length ? this.averageFor(inRange, 'diastolic') : 0,
            avgPulse: withPulse.length ? this.averageFor(inRange, 'pulse') : 0,
            highCount: inRange.filter((e) => {
                const c = classifyReading(e.systolic, e.diastolic, this.settings);
                return c.level === 'high';
            }).length
        };
    }

    dailySeries(rangeDays) {
        const inRange = this.entriesInRange(rangeDays);
        const byDay = {};
        inRange.forEach((e) => {
            if (!byDay[e.date]) byDay[e.date] = [];
            byDay[e.date].push(e);
        });
        return Object.keys(byDay).sort().map((date) => {
            const dayEntries = byDay[date];
            return {
                date,
                sys: this.averageFor(dayEntries, 'systolic'),
                dia: this.averageFor(dayEntries, 'diastolic'),
                pulse: this.averageFor(dayEntries, 'pulse'),
                count: dayEntries.length
            };
        });
    }

    missingPeriodStats(rangeDays) {
        const inRange = this.entriesInRange(rangeDays);
        const counts = { morning: 0, midday: 0, evening: 0 };
        inRange.forEach((e) => {
            if (counts[e.period] !== undefined) counts[e.period]++;
        });
        return counts;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = StatsManager;
}