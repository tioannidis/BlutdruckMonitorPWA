class BloodPressureTracker {
    constructor(skipInit = false) {
        this.currentDate = new Date();
        this.entries = [];
        this.settings = null;
        this.selectedDate = null;
        this.selectedDateKey = null;
        this.editingId = null;
        this.isEditMode = false;
        this.initialized = false;
        this.dayCells = null;
        this.aiResult = null;

        if (!skipInit) {
            this.init();
        }
    }

    async init() {
        if (typeof document === 'undefined') return;

        try {
            this.settings = await this.loadSettings();
            this.entries = this.loadEntries();

            this.renderCalendar();
            this.updateStats();
            this.bindEvents();
            this.bindPhotoEvents();

            this.initialized = true;

            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('sw.js');
            }

            if (typeof window !== 'undefined' &&
                new URLSearchParams(window.location.search).get('today') === 'true') {
                const today = new Date();
                this.openDayModal(today);
            }
        } catch (e) {
            this.initialized = false;
        }
    }

    loadEntries() {
        if (typeof storageManager !== 'undefined') {
            return storageManager.loadEntries();
        }
        return [];
    }

    async loadSettings() {
        if (typeof storageManager !== 'undefined') {
            return storageManager.loadSettings();
        }
        return {};
    }

    saveEntries() {
        if (typeof storageManager !== 'undefined') {
            storageManager.saveEntries(this.entries);
        }
        if (typeof document !== 'undefined') {
            this.updateStats();
            this.renderCalendar();
        }
    }

    bindEvents() {
        document.getElementById('prevMonth').onclick = () => this.prevMonth();
        document.getElementById('nextMonth').onclick = () => this.nextMonth();
        document.getElementById('monthYear').onclick = () => this.goToToday();
        document.getElementById('addEntryBtn').onclick = () => {
            this.openDayModal(new Date());
        };
        document.getElementById('exportData').onclick = () => this.exportAllData();
        document.getElementById('statistics').onclick = () => this.openStatsPage();
        document.getElementById('settings').onclick = () => this.openSettingsPage();

        document.getElementById('cancelBtn').onclick = () => this.closeModal();
        document.getElementById('addBtn').onclick = () => this.saveEntryFromForm();
        document.getElementById('saveBtn').onclick = () => this.saveEntryFromForm();

        document.getElementById('dayModal').onclick = (e) => {
            if (e.target.id === 'dayModal') this.closeModal();
        };

        const avgToggle = document.getElementById('avgToggle');
        if (avgToggle) {
            avgToggle.onchange = (e) => {
                document.getElementById('avgFields').style.display = e.target.checked ? 'block' : 'none';
            };
        }

        const nowTimeBtn = document.getElementById('nowTimeBtn');
        if (nowTimeBtn) {
            nowTimeBtn.onclick = () => this.setNowTime('entryTime');
        }

        const entryPeriod = document.getElementById('entryPeriod');
        if (entryPeriod) {
            entryPeriod.onchange = () => this.adjustTimeForPeriod();
        }
    }

    bindPhotoEvents() {
        const photoBtn = document.getElementById('photoBtn');
        const photoInput = document.getElementById('photoInput');
        const aiCancelBtn = document.getElementById('aiCancelBtn');
        const aiConfirmBtn = document.getElementById('aiConfirmBtn');

        if (photoBtn && photoInput) {
            photoBtn.onclick = () => photoInput.click();
            photoInput.onchange = (e) => {
                const file = e.target.files && e.target.files[0];
                if (file) this.handlePhotoFile(file);
                photoInput.value = '';
            };
        }
        if (aiCancelBtn) {
            aiCancelBtn.onclick = () => this.hideAiConfirm();
        }
        if (aiConfirmBtn) {
            aiConfirmBtn.onclick = () => this.saveAiResult();
        }
    }

    setNowTime(inputId) {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const input = document.getElementById(inputId);
        if (input) input.value = hh + ':' + mm;
    }

    adjustTimeForPeriod() {
        const period = document.getElementById('entryPeriod').value;
        const input = document.getElementById('entryTime');
        if (!input || !input.value) return;
        const hh = parseInt(input.value.split(':')[0], 10);
        if (period === 'morning' && hh >= 12) input.value = '07:00';
        else if (period === 'midday' && (hh < 10 || hh > 15)) input.value = '12:00';
        else if (period === 'evening' && hh < 16) input.value = '19:00';
    }

    prevMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.renderCalendar();
        this.updateStats();
    }

    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.renderCalendar();
        this.updateStats();
    }

    goToToday() {
        this.currentDate = new Date();
        this.renderCalendar();
        this.updateStats();
    }

    entriesForDate(dateKey) {
        return this.entries
            .filter((e) => e.date === dateKey)
            .sort((a, b) => {
                const orderDiff = (periodInfo(a.period).order) - (periodInfo(b.period).order);
                if (orderDiff !== 0) return orderDiff;
                return String(a.time || '').localeCompare(String(b.time || ''));
            });
    }

    entriesForPeriod(dateKey, period) {
        return this.entriesForDate(dateKey).filter((e) => e.period === period);
    }

    getDateKey(year, month, day) {
        const y = year;
        const m = String(month + 1).padStart(2, '0');
        const d = String(day).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    renderCalendar() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        document.getElementById('monthYear').textContent =
            this.currentDate.toLocaleDateString('de-DE', {
                month: 'long',
                year: 'numeric'
            });

        if (!this.dayCells) {
            const calendar = document.getElementById('calendar');
            this.dayCells = [];
            for (let i = 0; i < 42; i++) {
                const cell = document.createElement('div');
                calendar.appendChild(cell);
                this.dayCells.push(cell);
            }
        }

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const firstDayWeek = (firstDay.getDay() + 6) % 7;
        const daysInMonth = lastDay.getDate();

        const days = [];
        const prevMonthIndex = month === 0 ? 11 : month - 1;
        const prevYear = month === 0 ? year - 1 : year;
        const prevMonth = new Date(prevYear, prevMonthIndex + 1, 0);
        for (let i = firstDayWeek - 1; i >= 0; i--) {
            days.push({ day: prevMonth.getDate() - i, month: prevMonthIndex, year: prevYear, isOtherMonth: true });
        }
        for (let day = 1; day <= daysInMonth; day++) {
            days.push({ day, month, year, isOtherMonth: false });
        }
        const nextMonth = month === 11 ? 0 : month + 1;
        const nextYear = month === 11 ? year + 1 : year;
        const remaining = 42 - days.length;
        for (let day = 1; day <= remaining; day++) {
            days.push({ day, month: nextMonth, year: nextYear, isOtherMonth: true });
        }

        const today = new Date();
        for (let i = 0; i < 42; i++) {
            this.updateDayElement(this.dayCells[i], days[i], today);
        }
    }

    updateDayElement(cell, dayInfo, today) {
        const { day, month, year, isOtherMonth } = dayInfo;
        const dateKey = this.getDateKey(year, month, day);
        const dayEntries = this.entriesForDate(dateKey);

        cell.className = 'day';
        cell.classList.toggle('other-month', isOtherMonth);

        const todaySame = new Date();
        if (todaySame.getFullYear() === year &&
            todaySame.getMonth() === month &&
            todaySame.getDate() === day) {
            cell.classList.add('today');
        }

        cell.innerHTML = '';
        cell.dataset.dateKey = dateKey;

        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = day;
        cell.appendChild(dayNumber);

        if (dayEntries.length > 0) {
            const dots = document.createElement('div');
            dots.className = 'day-dots';
            PERIOD_ORDER.forEach((period) => {
                const periodEntries = dayEntries.filter((e) => e.period === period);
                if (periodEntries.length === 0) return;
                const avg = this.averageOf(periodEntries);
                const classification = classifyReading(avg.sys, avg.dia, this.settings);
                const dot = document.createElement('span');
                dot.className = 'period-dot period-' + period;
                dot.title = periodInfo(period).label + ': ' + avg.sys + '/' + avg.dia +
                    ' (' + classification.label + ')';
                dots.appendChild(dot);
            });
            cell.appendChild(dots);
        }

        cell.onclick = () => this.openDayModal(new Date(year, month, day));
    }

    averageOf(entries) {
        const withSys = entries.filter((e) => e.systolic);
        const withDia = entries.filter((e) => e.diastolic);
        const withPulse = entries.filter((e) => e.pulse);
        const avg = (list, key) => {
            if (list.length === 0) return null;
            const sum = list.reduce((acc, e) => acc + Number(e[key]), 0);
            return Math.round(sum / list.length);
        };
        return {
            sys: avg(withSys, 'systolic'),
            dia: avg(withDia, 'diastolic'),
            pulse: avg(withPulse, 'pulse')
        };
    }

    openDayModal(date) {
        const key = formatDateKey(date);
        this.selectedDate = date;
        this.selectedDateKey = key;
        this.editingId = null;
        this.isEditMode = false;
        this.aiResult = null;

        document.getElementById('modalTitle').textContent =
            'Messungen · ' + date.toLocaleDateString('de-DE', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });

        this.renderExistingEntries();
        this.resetForm();
        this.hideAiConfirm();
        this.showSection('manualForm');

        document.getElementById('dayModal').style.display = 'flex';
    }

    resetForm() {
        document.getElementById('entryPeriod').value = this.defaultPeriodForNow();
        document.getElementById('entryTime').value = this.nowTime();
        document.getElementById('entrySystolic').value = '';
        document.getElementById('entryDiastolic').value = '';
        document.getElementById('entryPulse').value = '';
        document.getElementById('entryNotes').value = '';
        document.getElementById('avgToggle').checked = false;
        document.getElementById('avgFields').style.display = 'none';
        document.getElementById('entrySys2').value = '';
        document.getElementById('entryDia2').value = '';
        document.getElementById('entryPulse2').value = '';

        const photoStatus = document.getElementById('photoStatus');
        if (photoStatus) {
            photoStatus.style.display = 'none';
            photoStatus.textContent = '';
        }

        document.getElementById('addBtn').style.display = '';
        document.getElementById('saveBtn').style.display = 'none';
        this.syncActionButtons();
    }

    nowTime() {
        const now = new Date();
        return String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    }

    defaultPeriodForNow() {
        const h = new Date().getHours();
        if (h < 10) return 'morning';
        if (h < 15) return 'midday';
        return 'evening';
    }

    closeModal() {
        document.getElementById('dayModal').style.display = 'none';
        this.selectedDate = null;
        this.selectedDateKey = null;
        this.editingId = null;
    }

    showSection(id) {
        ['manualForm', 'aiConfirmSection'].forEach((sectionId) => {
            const el = document.getElementById(sectionId);
            if (el) el.style.display = (sectionId === id) ? 'block' : 'none';
        });
        this.syncActionButtons();
    }

    syncActionButtons() {
        const aiConfirmBtn = document.getElementById('aiConfirmBtn');
        const aiCancelBtn = document.getElementById('aiCancelBtn');
        const addBtn = document.getElementById('addBtn');
        const saveBtn = document.getElementById('saveBtn');
        if (!aiConfirmBtn || !aiCancelBtn || !addBtn || !saveBtn) return;

        const confirmVisible = document.getElementById('aiConfirmSection').style.display !== 'none';
        aiConfirmBtn.style.display = confirmVisible ? '' : 'none';
        aiCancelBtn.style.display = confirmVisible ? '' : 'none';
        addBtn.style.display = (confirmVisible || this.isEditMode) ? 'none' : '';
        saveBtn.style.display = (confirmVisible || !this.isEditMode) ? 'none' : '';
    }

    renderExistingEntries() {
        const container = document.getElementById('existingEntries');
        const entries = this.entriesForDate(this.selectedDateKey);

        if (entries.length === 0) {
            container.innerHTML = '<div class="empty-state">Keine Messungen an diesem Tag.</div>';
            return;
        }

        container.innerHTML = entries.map((entry, index) => {
            const info = periodInfo(entry.period);
            const values = [];
            if (entry.systolic) values.push('SYS ' + entry.systolic);
            if (entry.diastolic) values.push('DIA ' + entry.diastolic);
            if (entry.pulse) values.push('Puls ' + entry.pulse);

            let detail = values.join(' · ');
            if (entry.time) detail += ' · ' + entry.time;
            if (entry.notes) detail += ' · ' + escapeHtml(entry.notes);
            const sourceBadge = entry.source === 'ai'
                ? ' <span class="source-badge" title="Per Fotoanalyse erfasst">🤖</span>'
                : '';
            const classification = classifyReading(entry.systolic, entry.diastolic, this.settings);

            return `
                <div class="existing-entry ${classification.level}">
                    <span class="period-dot-mini period-${entry.period}"></span>
                    <div class="entry-type">${info.emoji} ${info.label}${sourceBadge}</div>
                    <div class="entry-details">${detail}</div>
                    <div class="entry-badge ${classification.level}">${classification.label}</div>
                    <div class="entry-actions">
                        <button class="entry-action-btn" onclick="bloodPressureTracker.editSpecificEntry(${index})" title="Bearbeiten">✏️</button>
                        <button class="entry-action-btn" onclick="bloodPressureTracker.deleteSpecificEntry(${index})" title="Löschen">🗑️</button>
                    </div>
                </div>`;
        }).join('');
    }

    editSpecificEntry(index) {
        const entries = this.entriesForDate(this.selectedDateKey);
        const entry = entries[index];
        if (!entry) return;

        this.editingId = entry.id;
        this.isEditMode = true;
        this.aiResult = null;

        document.getElementById('modalTitle').textContent =
            'Messung bearbeiten · ' + new Date(this.selectedDateKey + 'T00:00:00')
                .toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });

        document.getElementById('entryPeriod').value = entry.period || 'other';
        document.getElementById('entryTime').value = entry.time || this.nowTime();
        document.getElementById('entrySystolic').value = entry.systolic || '';
        document.getElementById('entryDiastolic').value = entry.diastolic || '';
        document.getElementById('entryPulse').value = entry.pulse || '';
        document.getElementById('entryNotes').value = entry.notes || '';

        document.getElementById('addBtn').style.display = 'none';
        document.getElementById('saveBtn').style.display = '';
        this.hideAiConfirm();
        this.showSection('manualForm');

        document.getElementById('dayModal').style.display = 'flex';
    }

    deleteSpecificEntry(index) {
        const entries = this.entriesForDate(this.selectedDateKey);
        const entry = entries[index];
        if (!entry) return;
        if (!confirm('Messung wirklich löschen?')) return;

        this.entries = this.entries.filter((e) => e.id !== entry.id);
        this.saveEntries();
        this.renderExistingEntries();
        this.renderCalendar();
        this.updateStats();
    }

    collectFormData() {
        const systolic = this.parseIntOrNull('entrySystolic');
        const diastolic = this.parseIntOrNull('entryDiastolic');
        const pulse = this.parseIntOrNull('entryPulse');
        const useAvg = document.getElementById('avgToggle').checked;

        let sys = systolic;
        let dia = diastolic;
        let pul = pulse;

        if (useAvg) {
            const sys2 = this.parseIntOrNull('entrySys2');
            const dia2 = this.parseIntOrNull('entryDia2');
            const pulse2 = this.parseIntOrNull('entryPulse2');
            sys = this.roundAvg(sys, sys2);
            dia = this.roundAvg(dia, dia2);
            pul = this.roundAvg(pul, pulse2);
        }

        return {
            date: this.selectedDateKey,
            period: document.getElementById('entryPeriod').value,
            time: document.getElementById('entryTime').value || this.nowTime(),
            systolic: sys,
            diastolic: dia,
            pulse: pul,
            notes: document.getElementById('entryNotes').value.trim()
        };
    }

    roundAvg(a, b) {
        if (a !== null && b !== null) return Math.round((a + b) / 2);
        if (a !== null) return a;
        return b;
    }

    parseIntOrNull(id) {
        const el = document.getElementById(id);
        if (!el) return null;
        const val = el.value.trim();
        if (val === '') return null;
        const n = Number(val);
        return Number.isInteger(n) ? n : null;
    }

    validateFormData(data) {
        if (data.systolic === null && data.diastolic === null && data.pulse === null) {
            return 'Bitte mindestens einen Wert angeben (SYS, DIA oder Puls).';
        }
        if (!isValidReading(data.systolic, data.diastolic, data.pulse)) {
            return 'Ein Wert liegt außerhalb des plausiblen Bereichs. Bitte prüfen.';
        }
        return null;
    }

    saveEntryFromForm() {
        const data = this.collectFormData();
        const error = this.validateFormData(data);
        if (error) {
            alert(error);
            return;
        }

        if (this.isEditMode && this.editingId) {
            const existing = this.entries.find((e) => e.id === this.editingId);
            const updated = Object.assign({}, existing, data, { updatedAt: new Date().toISOString() });
            this.entries = this.entries.map((e) => e.id === this.editingId ? updated : e);
        } else {
            const entry = Object.assign({
                id: uuid(),
                source: 'manual',
                imageAnalyzed: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }, data);
            this.entries.push(entry);
        }

        this.saveEntries();
        this.closeModal();
    }

    handlePhotoFile(file) {
        if (typeof mistralClient === 'undefined') {
            this.showPhotoStatus('MistralClient nicht geladen.', true);
            return;
        }

        if (!mistralClient.hasApiKey()) {
            this.showPhotoStatus('Bitte zuerst den Mistral API-Key in den Einstellungen hinterlegen.', true);
            return;
        }

        this.showPhotoStatus('🔍 Foto wird analysiert…', false);
        this.setPhotoBusy(true);

        mistralClient.analyzeImage(file)
            .then((result) => {
                this.setPhotoBusy(false);
                this.aiResult = result;
                if (result.systolic === null && result.diastolic === null && result.pulse === null) {
                    this.showPhotoStatus('Keine Werte erkannt. Bitte ein klareres Foto versuchen oder manuell eintragen.', true);
                    return;
                }
                this.showAiConfirm(result);
            })
            .catch((err) => {
                this.setPhotoBusy(false);
                this.showPhotoStatus(err.message || 'Analyse fehlgeschlagen.', true);
            });
    }

    setPhotoBusy(busy) {
        const btn = document.getElementById('photoBtn');
        const addBtn = document.getElementById('addBtn');
        const saveBtn = document.getElementById('saveBtn');
        if (btn) btn.disabled = busy;
        if (addBtn) addBtn.disabled = busy;
        if (saveBtn) saveBtn.disabled = busy;
    }

    showPhotoStatus(message, isError) {
        const el = document.getElementById('photoStatus');
        if (!el) return;
        el.textContent = message;
        el.style.display = 'block';
        el.className = isError ? 'photo-status error' : 'photo-status';
    }

    showAiConfirm(result) {
        document.getElementById('aiSys').value = result.systolic !== null ? result.systolic : '';
        document.getElementById('aiDia').value = result.diastolic !== null ? result.diastolic : '';
        document.getElementById('aiPulse').value = result.pulse !== null ? result.pulse : '';
        const confidence = Math.round((result.confidence || 0) * 100);
        document.getElementById('aiConfidence').textContent =
            'Erkannte Werte (Sicherheit: ' + confidence + '%) – bitte prüfen und bestätigen:';
        this.showSection('aiConfirmSection');
    }

    hideAiConfirm() {
        const el = document.getElementById('aiConfirmSection');
        if (el) el.style.display = 'none';
    }

    saveAiResult() {
        if (!this.aiResult) return;

        const systolic = this.parseIntOrNull('aiSys');
        const diastolic = this.parseIntOrNull('aiDia');
        const pulse = this.parseIntOrNull('aiPulse');

        const data = {
            date: this.selectedDateKey,
            period: document.getElementById('aiPeriod').value,
            time: document.getElementById('aiTime').value || this.nowTime(),
            systolic,
            diastolic,
            pulse,
            notes: document.getElementById('aiNotes').value.trim()
        };

        const error = this.validateFormData(data);
        if (error) {
            alert(error);
            return;
        }

        const entry = Object.assign({
            id: uuid(),
            source: 'ai',
            imageAnalyzed: true,
            aiConfidence: this.aiResult.confidence || 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }, data);

        this.entries.push(entry);
        this.saveEntries();
        this.closeModal();
    }

    updateStats() {
        if (typeof document === 'undefined') return;
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const monthEntries = this.entries.filter((e) => {
            const parts = (e.date || '').split('-');
            return parts.length === 3 && Number(parts[0]) === year && Number(parts[1]) === month + 1;
        });
        const dayKeys = new Set(monthEntries.map((e) => e.date));
        const withSys = monthEntries.filter((e) => e.systolic);
        const avgSys = withSys.length
            ? Math.round(withSys.reduce((a, e) => a + Number(e.systolic), 0) / withSys.length)
            : 0;

        document.getElementById('monthReadingsCount').textContent = monthEntries.length;
        document.getElementById('monthDaysCount').textContent = dayKeys.size;
        document.getElementById('monthAvgSys').textContent = avgSys;
    }

    exportAllData() {
        const payload = {
            app: 'Blutdruck Monitor',
            version: typeof window !== 'undefined' ? window.APP_VERSION : '1.0.0',
            exportedAt: new Date().toISOString(),
            settings: this.settings,
            entries: this.entries
        };
        saveToFile(
            JSON.stringify(payload, null, 2),
            'blutdruck-backup-' + todayKey() + '.json',
            'application/json'
        );
        if (typeof storageManager !== 'undefined') {
            storageManager.setLastBackup(new Date().toISOString());
        }
    }

    exportCsv() {
        const header = 'Datum;Zeitpunkt;Uhrzeit;SYS;DIA;Puls;Quelle;Notizen';
        const rows = this.entries
            .slice()
            .sort((a, b) => String(a.date).localeCompare(String(b.date)))
            .map((e) => {
                return [
                    e.date,
                    periodInfo(e.period).label,
                    e.time || '',
                    e.systolic !== null ? e.systolic : '',
                    e.diastolic !== null ? e.diastolic : '',
                    e.pulse !== null ? e.pulse : '',
                    e.source === 'ai' ? 'Foto' : 'Manuell',
                    (e.notes || '').replace(/;/g, ',')
                ].join(';');
            });
        saveToFile([header].concat(rows).join('\n'), 'blutdruck-export.csv', 'text/csv;charset=utf-8');
    }

    openStatsPage() {
        window.location.href = 'stats.html';
    }

    openSettingsPage() {
        window.location.href = 'settings.html';
    }
}

const bloodPressureTracker = new BloodPressureTracker();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = BloodPressureTracker;
}