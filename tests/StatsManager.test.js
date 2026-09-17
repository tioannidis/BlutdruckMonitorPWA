const StatsManager = require('../js/StatsManager.js');

const entry = (date, sys, dia, pulse, period) => ({
    id: date + period,
    date,
    period,
    systolic: sys,
    diastolic: dia,
    pulse,
    source: 'manual'
});

describe('StatsManager', () => {
    const today = new Date();
    const todayKeyStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const daysAgo = (n) => {
        const d = new Date(today.getTime() - n * 24 * 60 * 60 * 1000);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const settings = { sysHigh: 140, diaHigh: 90, sysLow: 90, diaLow: 60 };

    test('summarize computes averages over range', () => {
        const stats = new StatsManager([
            entry(daysAgo(1), 140, 90, 70, 'morning'),
            entry(daysAgo(1), 130, 86, 74, 'evening'),
            entry(daysAgo(5), 120, 80, 60, 'morning')
        ], settings);

        const summary = stats.summarize(7);
        expect(summary.readings).toBe(3);
        expect(summary.days).toBe(2);
        expect(summary.avgSys).toBe(130);
        expect(summary.avgDia).toBe(85);
        expect(summary.highCount).toBe(1);
    });

    test('summarize excludes entries outside range', () => {
        const stats = new StatsManager([
            entry(daysAgo(1), 140, 90, 70, 'morning'),
            entry(daysAgo(30), 200, 120, 90, 'morning')
        ], settings);

        const summary = stats.summarize(7);
        expect(summary.readings).toBe(1);
        expect(summary.avgSys).toBe(140);
    });

    test('dailySeries groups by day and averages', () => {
        const stats = new StatsManager([
            entry(daysAgo(1), 140, 90, 70, 'morning'),
            entry(daysAgo(1), 120, 80, 60, 'evening'),
            entry(daysAgo(2), 130, 85, 65, 'morning')
        ], settings);

        const series = stats.dailySeries(7);
        expect(series.length).toBe(2);
        const day1 = series.find((d) => d.date === daysAgo(1));
        expect(day1.sys).toBe(130);
        expect(day1.dia).toBe(85);
        expect(day1.count).toBe(2);
    });

    test('missingPeriodStats counts readings per period', () => {
        const stats = new StatsManager([
            entry(daysAgo(1), 140, 90, 70, 'morning'),
            entry(daysAgo(1), 140, 90, 70, 'morning'),
            entry(daysAgo(1), 140, 90, 70, 'evening')
        ], settings);

        const missing = stats.missingPeriodStats(7);
        expect(missing.morning).toBe(2);
        expect(missing.midday).toBe(0);
        expect(missing.evening).toBe(1);
    });

    test('averageFor ignores null values', () => {
        const stats = new StatsManager([
            { ...entry(daysAgo(1), null, 90, 70, 'morning'), systolic: null },
            entry(daysAgo(1), 130, 86, 74, 'evening')
        ], settings);
        const series = stats.dailySeries(7);
        expect(series[0].sys).toBe(130);
    });
});