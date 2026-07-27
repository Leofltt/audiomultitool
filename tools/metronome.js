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
        this.bpm = Math.max(10, Math.min(newBpm, 300));
        
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
        this.notesQueue = [];
        this.lastScheduledBeatUnix = 0;

        // Start scheduling interval
        this.schedulerIntervalId = setInterval(() => this.scheduler(), this.lookahead);

        // Start UI synchronization loop
        this.visualSyncLoop();

        const toggleBtn = document.getElementById('metronome-toggle-btn');
        if (toggleBtn) {
            toggleBtn.textContent = 'Stop Metronome';
            toggleBtn.classList.remove('btn-primary');
            toggleBtn.classList.add('btn-danger');
            toggleBtn.style.boxShadow = '';
            toggleBtn.style.animation = '';
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
            const params = new URLSearchParams(window.location.search);
            if (params.get('sync') === '1') {
                toggleBtn.textContent = '🔊 Join Synced Session';
                toggleBtn.classList.remove('btn-danger');
                toggleBtn.classList.add('btn-primary');
                toggleBtn.style.boxShadow = '0 0 15px var(--accent)';
            } else {
                toggleBtn.textContent = 'Start Metronome';
                toggleBtn.classList.remove('btn-danger');
                toggleBtn.classList.add('btn-primary');
            }
        }
    },

    stop() {
        this.stopMetronome();
    },

    scheduler() {
        const ctx = this.app.getAudioContext();
        const nowUnix = Date.now();
        const audioCtxTimeAtNow = ctx.currentTime;

        const beatDurationMs = 60000 / (this.bpm * this.subdivision);
        const barDurationMs = beatDurationMs * this.signature * this.subdivision;

        // Scheduler window limit (100ms lookahead)
        const lookAheadLimitUnix = nowUnix + (this.scheduleAheadTime * 1000);

        // Find the start of the current bar relative to Unix time epoch
        const currentBarStartUnix = nowUnix - (nowUnix % barDurationMs);
        
        let testBeatIndex = Math.floor((nowUnix - currentBarStartUnix) / beatDurationMs);
        let testBeatUnix = currentBarStartUnix + (testBeatIndex * beatDurationMs);

        while (testBeatUnix < lookAheadLimitUnix) {
            // Schedule if it falls in the target window and hasn't been scheduled yet
            if (testBeatUnix > nowUnix - 10 && (!this.lastScheduledBeatUnix || testBeatUnix > this.lastScheduledBeatUnix)) {
                const beatInBar = Math.floor((testBeatUnix - currentBarStartUnix) / beatDurationMs) % (this.signature * this.subdivision);
                const targetAudioTime = audioCtxTimeAtNow + (testBeatUnix - nowUnix) / 1000;
                
                this.scheduleNote(beatInBar, targetAudioTime, testBeatUnix);
                this.lastScheduledBeatUnix = testBeatUnix;
            }
            testBeatIndex++;
            testBeatUnix = currentBarStartUnix + (testBeatIndex * beatDurationMs);
        }
    },

    scheduleNote(beatIndex, time, beatUnix) {
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

        // Clean up old notes from the queue (older than 1 second)
        while (this.notesQueue.length > 0 && this.notesQueue[0].time < currentTime - 1.0) {
            this.notesQueue.shift();
        }

        // Find the active note (the most recent note that has played)
        let activeNote = null;
        for (let i = this.notesQueue.length - 1; i >= 0; i--) {
            if (this.notesQueue[i].time <= currentTime) {
                activeNote = this.notesQueue[i];
                break;
            }
        }

        const dots = document.querySelectorAll('#metronome-indicators .beat-dot');
        
        if (activeNote) {
            const beatIndex = activeNote.beat;
            const mainBeat = Math.floor(beatIndex / this.subdivision);
            const isFirstSubdivision = (beatIndex % this.subdivision === 0);

            const beatDuration = 60 / this.bpm;
            // Dynamic flash duration matching the active tempo speed
            const flashDuration = Math.min(0.15, beatDuration * 0.4);

            dots.forEach((dot, idx) => {
                if (idx === mainBeat && isFirstSubdivision && (currentTime < activeNote.time + flashDuration)) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });
        } else {
            dots.forEach(dot => dot.classList.remove('active'));
        }

        requestAnimationFrame(() => this.visualSyncLoop());
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
        
        const boundedBpm = Math.max(10, Math.min(bpm, 300));

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
            sound: this.soundProfile,
            sync: '1' // Sync flag
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
        const sync = params.get('sync');

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

        if (sync === '1') {
            const toggleBtn = document.getElementById('metronome-toggle-btn');
            if (toggleBtn) {
                toggleBtn.textContent = '🔊 Join Synced Session';
                toggleBtn.style.boxShadow = '0 0 15px var(--accent)';
            }
        }
    }
};
