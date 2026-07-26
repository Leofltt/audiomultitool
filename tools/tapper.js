// BPM Tapper Tool Component
window.TapperTool = {
    app: null,
    tapTimes: [],
    maxTaps: 12,

    init(appInstance) {
        this.app = appInstance;
        this.setupEventListeners();
    },

    setupEventListeners() {
        const tapCard = document.getElementById('tap-trigger-btn');
        const resetBtn = document.getElementById('tapper-reset');

        tapCard.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.tap();
        });

        tapCard.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.tap();
        });

        // Trigger on spacebar click
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && this.app.activeTool === 'tapper') {
                e.preventDefault();
                this.tap();
                // Add active state styling
                tapCard.style.borderColor = 'var(--accent)';
                tapCard.style.transform = 'scale(0.98)';
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'Space' && this.app.activeTool === 'tapper') {
                tapCard.style.borderColor = 'rgba(79, 70, 229, 0.3)';
                tapCard.style.transform = 'scale(1)';
            }
        });

        resetBtn.addEventListener('click', () => this.reset());
    },

    tap() {
        const now = Date.now();

        // If last tap was more than 2.5 seconds ago, reset array (assumed new session)
        if (this.tapTimes.length > 0 && (now - this.tapTimes[this.tapTimes.length - 1]) > 2500) {
            this.tapTimes = [];
        }

        this.tapTimes.push(now);

        if (this.tapTimes.length > this.maxTaps) {
            this.tapTimes.shift(); // Keep moving buffer size
        }

        this.calculateBPM();
    },

    calculateBPM() {
        if (this.tapTimes.length < 2) {
            document.getElementById('tapper-bpm-val').textContent = '--';
            document.getElementById('tapper-avg').textContent = '--';
            return;
        }

        let totalIntervals = 0;
        for (let i = 1; i < this.tapTimes.length; i++) {
            totalIntervals += (this.tapTimes[i] - this.tapTimes[i - 1]);
        }

        const avgInterval = totalIntervals / (this.tapTimes.length - 1);
        const bpm = Math.round(60000 / avgInterval);

        // Update UI
        document.getElementById('tapper-bpm-val').textContent = bpm;
        document.getElementById('tapper-avg').textContent = `${bpm} BPM`;
        
        // Estimate music genre based on BPM range
        document.getElementById('tapper-genre').textContent = this.getEstimatedGenre(bpm);

        this.addToHistory(bpm);
    },

    getEstimatedGenre(bpm) {
        if (bpm < 70) return 'Ambient / Doom Metal';
        if (bpm >= 70 && bpm < 90) return 'Hip Hop / Boom Bap';
        if (bpm >= 90 && bpm < 110) return 'Trip Hop / Synthwave';
        if (bpm >= 110 && bpm < 125) return 'House / Disco';
        if (bpm >= 125 && bpm < 140) return 'Techno / Trance';
        if (bpm >= 140 && bpm < 165) return 'Dubstep / Trap';
        if (bpm >= 165 && bpm < 185) return 'Drum & Bass';
        return 'Speedcore / Hardcore';
    },

    addToHistory(bpm) {
        const historyList = document.getElementById('tapper-history');
        const emptyState = historyList.querySelector('.empty-state');
        if (emptyState) {
            emptyState.remove();
        }

        const li = document.createElement('li');
        li.textContent = `${bpm} BPM`;
        
        // Insert at the top of the history list
        historyList.insertBefore(li, historyList.firstChild);

        // Keep maximum 15 history items on screen
        if (historyList.children.length > 15) {
            historyList.removeChild(historyList.lastChild);
        }
    },

    reset() {
        this.tapTimes = [];
        document.getElementById('tapper-bpm-val').textContent = '--';
        document.getElementById('tapper-avg').textContent = '--';
        document.getElementById('tapper-genre').textContent = 'Tap to calculate';
        
        const historyList = document.getElementById('tapper-history');
        historyList.innerHTML = '<li class="empty-state">No taps recorded yet</li>';
    }
};
