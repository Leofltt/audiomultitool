// Metronome & BPM Tapper Tool Component
window.MetronomeTool = {
    app: null,
    tapTimes: [],
    maxTaps: 12,

    // Metronome States
    isPlaying: false,
    bpm: 120,
    signature: 4,      // Beats per measure
    subdivision: 1,    // 1=quarter, 2=eighth, 3=triplets, 4=sixteenths
    soundProfile: 'woodblock',

    // Precision Web Audio Scheduler Variables
    schedulerIntervalId: null,
    nextNoteTime: 0.0,       // When next note is due (seconds)
    currentBeatInBar: 0,     // Subdivision beat counter
    lookahead: 25.0,         // Interval time in ms
    scheduleAheadTime: 0.1,  // Scheduler lookahead window in seconds
    notesQueue: [],          // Queue of notes scheduled for visual sync

    init(appInstance) {
        this.app = appInstance;
        this.setupEventListeners();
        this.rebuildIndicators();
        this.loadQueryParams();
    },

    setupEventListeners() {
        // Metronome Elements
        const toggleBtn = document.getElementById('metronome-toggle-btn');
        const bpmSlider = document.getElementById('metronome-bpm-slider');
        const minusBtn = document.getElementById('metronome-minus-btn');
        const plusBtn = document.getElementById('metronome-plus-btn');
        const signatureSelect = document.getElementById('metronome-signature');
        const subdivisionSelect = document.getElementById('metronome-subdivision');
        const soundSelect = document.getElementById('metronome-sound');

        // BPM Tapper Elements
        const tapCard = document.getElementById('tap-trigger-btn');
        const resetBtn = document.getElementById('tapper-reset');

        const shareBtn = document.getElementById('metronome-share-btn');

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggle());
        }

        if (shareBtn) {
            shareBtn.addEventListener('click', () => this.shareConfig());
        }

        if (bpmSlider) {
            bpmSlider.addEventListener('input', (e) => {
                this.setBpm(parseInt(e.target.value));
            });
        }

        if (minusBtn) {
            minusBtn.addEventListener('click', () => {
                this.setBpm(this.bpm - 1);
            });
        }

        if (plusBtn) {
            plusBtn.addEventListener('click', () => {
                this.setBpm(this.bpm + 1);
            });
        }

        if (signatureSelect) {
            signatureSelect.addEventListener('change', (e) => {
                this.signature = parseInt(e.target.value);
                this.rebuildIndicators();
            });
        }

        if (subdivisionSelect) {
            subdivisionSelect.addEventListener('change', (e) => {
                this.subdivision = parseInt(e.target.value);
            });
        }

        if (soundSelect) {
            soundSelect.addEventListener('change', (e) => {
                this.soundProfile = e.target.value;
            });
        }

        if (tapCard) {
            tapCard.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.tap();
            });

            tapCard.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.tap();
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetTapper());
        }

        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && this.app.activeTool === 'metronome') {
                e.preventDefault();
                this.tap();
                if (tapCard) {
                    tapCard.style.borderColor = 'var(--accent)';
                    tapCard.style.transform = 'scale(0.98)';
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'Space' && this.app.activeTool === 'metronome') {
                if (tapCard) {
                    tapCard.style.borderColor = 'rgba(79, 70, 229, 0.3)';
                    tapCard.style.transform = 'scale(1)';
                }
            }
        });
    },

    setBpm(newBpm) {
        this.bpm = Math.max(30, Math.min(newBpm, 280));
        
        const slider = document.getElementById('metronome-bpm-slider');
        const display = document.getElementById('metronome-bpm-val');
        
        if (slider) slider.value = this.bpm;
        if (display) display.textContent = this.bpm;
    },

    rebuildIndicators() {
        const container = document.getElementById('metronome-indicators');
        if (!container) return;

        container.innerHTML = '';
        for (let i = 0; i < this.signature; i++) {
            const dot = document.createElement('div');
            dot.className = i === 0 ? 'beat-dot downbeat' : 'beat-dot';
            container.appendChild(dot);
        }
    },

    toggle() {
        if (this.isPlaying) {
            this.stopMetronome();
        } else {
            this.startMetronome();
        }
    },

    startMetronome() {
        const ctx = this.app.getAudioContext();
        
        this.isPlaying = true;
        this.app.isSoundActive = true;
        this.currentBeatInBar = 0;
        this.nextNoteTime = ctx.currentTime + 0.05;
        this.notesQueue = [];

        // Start scheduling interval
        this.schedulerIntervalId = setInterval(() => this.scheduler(), this.lookahead);

        // Start UI synchronization loop
        this.visualSyncLoop();

        const toggleBtn = document.getElementById('metronome-toggle-btn');
        if (toggleBtn) {
            toggleBtn.textContent = 'Stop Metronome';
            toggleBtn.classList.remove('btn-primary');
            toggleBtn.classList.add('btn-danger');
        }
    },

    stopMetronome() {
        this.isPlaying = false;
        this.app.isSoundActive = false;

        if (this.schedulerIntervalId) {
            clearInterval(this.schedulerIntervalId);
            this.schedulerIntervalId = null;
        }

        const dots = document.querySelectorAll('#metronome-indicators .beat-dot');
        dots.forEach(dot => dot.classList.remove('active'));

        const toggleBtn = document.getElementById('metronome-toggle-btn');
        if (toggleBtn) {
            toggleBtn.textContent = 'Start Metronome';
            toggleBtn.classList.remove('btn-danger');
            toggleBtn.classList.add('btn-primary');
        }
    },

    stop() {
        this.stopMetronome();
    },

    scheduler() {
        const ctx = this.app.getAudioContext();
        while (this.nextNoteTime < ctx.currentTime + this.scheduleAheadTime) {
            this.scheduleNote(this.currentBeatInBar, this.nextNoteTime);
            this.advanceNote();
        }
    },

    advanceNote() {
        const secondsPerBeat = 60.0 / this.bpm;
        const subdivisionDuration = secondsPerBeat / this.subdivision;

        this.nextNoteTime += subdivisionDuration;
        this.currentBeatInBar = (this.currentBeatInBar + 1) % (this.signature * this.subdivision);
    },

    scheduleNote(beatIndex, time) {
        const isMainBeat = (beatIndex % this.subdivision === 0);
        const isDownbeat = (beatIndex === 0);

        this.notesQueue.push({ beat: beatIndex, time: time });

        // Play dynamic synthesized click
        this.playClick(time, isDownbeat, !isMainBeat);
    },

    playClick(time, isDownbeat, isSubdivisionNote) {
        const ctx = this.app.getAudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);
        
        // Connect to visualizer analyser so metronome clicks bounce the oscilloscope
        gain.connect(this.app.analyserNode);

        let frequency = 800;
        let duration = 0.04;

        if (this.soundProfile === 'woodblock') {
            osc.type = 'triangle';
            frequency = isDownbeat ? 1200 : (isSubdivisionNote ? 600 : 800);
            duration = 0.03;

            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.35, time + 0.002);
            gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        } else if (this.soundProfile === 'beep') {
            osc.type = 'sine';
            frequency = isDownbeat ? 1000 : (isSubdivisionNote ? 500 : 750);
            duration = 0.05;

            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.25, time + 0.003);
            gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        } else if (this.soundProfile === 'rimshot') {
            osc.type = 'sine';
            frequency = isDownbeat ? 400 : 300;
            duration = 0.05;

            osc.frequency.setValueAtTime(frequency * 2, time);
            osc.frequency.exponentialRampToValueAtTime(frequency, time + 0.015);

            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.3, time + 0.002);
            gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        }

        osc.frequency.setValueAtTime(frequency, time);
        osc.start(time);
        osc.stop(time + duration);
    },

    visualSyncLoop() {
        if (!this.isPlaying) return;

        const ctx = this.app.getAudioContext();
        const currentTime = ctx.currentTime;

        while (this.notesQueue.length > 0 && this.notesQueue[0].time < currentTime) {
            const currentBeat = this.notesQueue[0].beat;
            this.notesQueue.shift();
            this.triggerBeatVisual(currentBeat);
        }

        requestAnimationFrame(() => this.visualSyncLoop());
    },

    triggerBeatVisual(beatIndex) {
        const mainBeat = Math.floor(beatIndex / this.subdivision);
        const isFirstSubdivision = (beatIndex % this.subdivision === 0);

        const dots = document.querySelectorAll('#metronome-indicators .beat-dot');
        dots.forEach((dot, idx) => {
            if (idx === mainBeat && isFirstSubdivision) {
                dot.classList.add('active');
            } else if (isFirstSubdivision) {
                dot.classList.remove('active');
            }
        });

        // Flash duration decay
        if (isFirstSubdivision) {
            setTimeout(() => {
                const activeDot = dots[mainBeat];
                if (activeDot) activeDot.classList.remove('active');
            }, 80);
        }
    },

    // Tap Tempo implementation
    tap() {
        const now = Date.now();
        if (this.tapTimes.length > 0 && (now - this.tapTimes[this.tapTimes.length - 1]) > 2500) {
            this.tapTimes = [];
        }

        this.tapTimes.push(now);

        if (this.tapTimes.length > this.maxTaps) {
            this.tapTimes.shift();
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
        
        const boundedBpm = Math.max(30, Math.min(bpm, 280));

        // Update Tapper UI
        document.getElementById('tapper-bpm-val').textContent = boundedBpm;
        document.getElementById('tapper-avg').textContent = `${boundedBpm} BPM`;
        document.getElementById('tapper-genre').textContent = this.getEstimatedGenre(boundedBpm);

        this.addToHistory(boundedBpm);

        // Update Metronome state
        this.setBpm(boundedBpm);
    },

    getEstimatedGenre(bpm) {
        if (bpm < 70) return 'Ambient / Doom';
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
        
        historyList.insertBefore(li, historyList.firstChild);

        if (historyList.children.length > 10) {
            historyList.removeChild(historyList.lastChild);
        }
    },

    resetTapper() {
        this.tapTimes = [];
        document.getElementById('tapper-bpm-val').textContent = '--';
        document.getElementById('tapper-avg').textContent = '--';
        document.getElementById('tapper-genre').textContent = 'Tap to start';
        
        const historyList = document.getElementById('tapper-history');
        historyList.innerHTML = '<li class="empty-state">No taps recorded yet</li>';
    },

    shareConfig() {
        const shareBtn = document.getElementById('metronome-share-btn');
        if (!shareBtn) return;

        const baseUrl = window.location.origin + '/metronome/';
        const queryParams = new URLSearchParams({
            bpm: this.bpm,
            sig: this.signature,
            sub: this.subdivision,
            sound: this.soundProfile
        });

        const shareUrl = `${baseUrl}?${queryParams.toString()}`;

        navigator.clipboard.writeText(shareUrl)
            .then(() => {
                const originalText = shareBtn.innerHTML;
                shareBtn.innerHTML = '<span>✅</span> Copied!';
                shareBtn.style.borderColor = 'var(--accent)';
                setTimeout(() => {
                    shareBtn.innerHTML = originalText;
                    shareBtn.style.borderColor = '';
                }, 1800);
            })
            .catch(err => {
                console.error("Clipboard copy failed: ", err);
                alert("Here is your shareable link:\n" + shareUrl);
            });
    },

    loadQueryParams() {
        const params = new URLSearchParams(window.location.search);
        const urlBpm = params.get('bpm');
        const urlSig = params.get('sig');
        const urlSub = params.get('sub');
        const urlSound = params.get('sound');

        if (urlBpm) {
            this.setBpm(parseInt(urlBpm));
        }
        if (urlSig) {
            this.signature = parseInt(urlSig);
            const signatureSelect = document.getElementById('metronome-signature');
            if (signatureSelect) signatureSelect.value = urlSig;
            this.rebuildIndicators();
        }
        if (urlSub) {
            this.subdivision = parseInt(urlSub);
            const subdivisionSelect = document.getElementById('metronome-subdivision');
            if (subdivisionSelect) subdivisionSelect.value = urlSub;
        }
        if (urlSound) {
            this.soundProfile = urlSound;
            const soundSelect = document.getElementById('metronome-sound');
            if (soundSelect) soundSelect.value = urlSound;
        }
    }
};
