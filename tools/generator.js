// Generator Tool Component
window.GeneratorTool = {
    app: null,
    oscillator: null,
    gainNode: null,
    isPlaying: false,

    init(appInstance) {
        this.app = appInstance;
        this.setupEventListeners();
    },

    setupEventListeners() {
        const toggleBtn = document.getElementById('generator-toggle');
        const freqSlider = document.getElementById('generator-freq-slider');
        const freqVal = document.getElementById('generator-freq-val');
        const waveBtns = document.querySelectorAll('.wave-btn');
        const volSlider = document.getElementById('generator-vol');
        const presetBtns = document.querySelectorAll('.preset-btn');

        toggleBtn.addEventListener('click', () => this.toggle());

        // Sync slider with display frequency
        freqSlider.addEventListener('input', (e) => {
            const freq = e.target.value;
            freqVal.textContent = freq;
            if (this.oscillator && this.isPlaying) {
                // Smooth transition of pitch frequency to avoid click/pop sounds
                this.oscillator.frequency.setTargetAtTime(freq, this.app.audioCtx.currentTime, 0.05);
            }
        });

        // Waveform selections
        waveBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                waveBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (this.oscillator && this.isPlaying) {
                    this.oscillator.type = btn.dataset.wave;
                }
            });
        });

        // Volume control
        volSlider.addEventListener('input', (e) => {
            const vol = e.target.value;
            if (this.gainNode && this.isPlaying) {
                this.gainNode.gain.setTargetAtTime(vol, this.app.audioCtx.currentTime, 0.02);
            }
        });

        // Preset helpers
        presetBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const freq = btn.dataset.freq;
                freqSlider.value = freq;
                freqVal.textContent = freq;
                if (this.oscillator && this.isPlaying) {
                    this.oscillator.frequency.setTargetAtTime(freq, this.app.audioCtx.currentTime, 0.05);
                }
            });
        });
    },

    toggle() {
        const toggleBtn = document.getElementById('generator-toggle');

        if (this.isPlaying) {
            this.stop();
            toggleBtn.textContent = 'Start Oscillator';
            toggleBtn.classList.remove('btn-danger');
            toggleBtn.classList.add('btn-primary');
        } else {
            this.start();
            toggleBtn.textContent = 'Stop Oscillator';
            toggleBtn.classList.remove('btn-primary');
            toggleBtn.classList.add('btn-danger');
        }
    },

    start() {
        const ctx = this.app.getAudioContext();
        
        this.oscillator = ctx.createOscillator();
        this.gainNode = ctx.createGain();

        // Configure frequency
        const freq = document.getElementById('generator-freq-slider').value;
        this.oscillator.frequency.setValueAtTime(freq, ctx.currentTime);

        // Configure waveform
        const activeWaveBtn = document.querySelector('.wave-btn.active');
        this.oscillator.type = activeWaveBtn ? activeWaveBtn.dataset.wave : 'sine';

        // Configure Volume
        const vol = document.getElementById('generator-vol').value;
        this.gainNode.gain.setValueAtTime(vol, ctx.currentTime);

        // Routing: Oscillator -> Gain -> Global Analyser
        this.oscillator.connect(this.gainNode);
        this.gainNode.connect(this.app.analyserNode);

        this.oscillator.start();
        this.isPlaying = true;
    },

    stop() {
        if (this.oscillator) {
            try {
                this.oscillator.stop();
                this.oscillator.disconnect();
            } catch(e) {}
            this.oscillator = null;
        }
        if (this.gainNode) {
            this.gainNode.disconnect();
            this.gainNode = null;
        }
        this.isPlaying = false;
        
        // Restore button state if needed
        const toggleBtn = document.getElementById('generator-toggle');
        if (toggleBtn) {
            toggleBtn.textContent = 'Start Oscillator';
            toggleBtn.classList.remove('btn-danger');
            toggleBtn.classList.add('btn-primary');
        }
    }
};
