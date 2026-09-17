class ThemeManager {
    constructor(storage) {
        this.storage = storage || (typeof storageManager !== 'undefined' ? storageManager : null);
        this.initialized = false;
    }

    init() {
        if (typeof document === 'undefined') return;
        const saved = this.storage ? this.storage.loadTheme() : 'light';
        this.apply(saved);
        const toggle = document.getElementById('themeToggle');
        if (toggle) {
            toggle.classList.toggle('active', saved === 'dark');
            toggle.onclick = () => this.toggle();
        }
        this.initialized = true;
    }

    apply(theme) {
        if (typeof document === 'undefined') return;
        document.body.classList.toggle('dark-mode', theme === 'dark');
        const toggle = document.getElementById('themeToggle');
        if (toggle) {
            toggle.classList.toggle('active', theme === 'dark');
        }
    }

    toggle() {
        const current = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        this.apply(next);
        if (this.storage) {
            this.storage.saveTheme(next);
        }
        return next;
    }

    getCurrent() {
        if (typeof document !== 'undefined' && document.body.classList.contains('dark-mode')) {
            return 'dark';
        }
        return 'light';
    }
}

const themeManager = new ThemeManager();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
}