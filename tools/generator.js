// Signal & Sweep Generator Tool Component
window.GeneratorTool = {
    app: null,
    oscillator: null,
    noiseNode: null,
    gainNode: null,
    oscillators: [],
    gainNodes: [],
    isPlaying: false,
    currentMode: 'tone', // 'tone', 'sweep', 'noise', 'special'
    currentType: 'sine', // active tone/noise type
    sweepInterval: null,
    startTime: 0,
    duration: 0,

    init(appInstance) {
        this.app = appInstance;
        this.setupEventListeners();
        this.applyInitialConfig();
    },

    applyInitialConfig() {
        const pane = document.getElementById('pane-generator');
        if (!pane) return;

        // General dynamic landing page config reader
        const initialMode = pane.dataset.mode || 'tone';
        this.switchMode(initialMode);

        const initialFreq = pane.dataset.freq;
        const initialType = pane.dataset.type;
        const initialStart = pane.dataset.start;
        const initialEnd = pane.dataset.end;
        const initialDuration = pane.dataset.duration;
        const initialSweepType = pane.dataset.sweeptype;
        const initialSpecialType = pane.dataset.specialtype;

        if (initialFreq) {
            const freqSlider = document.getElementById('generator-freq-slider');
            const freqVal = document.getElementById('generator-freq-val');
            const freq = parseFloat(initialFreq);
            if (freqSlider) freqSlider.value = this.freqToSlider(freq);
            if (freqVal) freqVal.textContent = freq;
        }

        if (initialType) {
            this.currentType = initialType;
            const btn = document.querySelector(`.wave-btn[data-type="${initialType}"]`);
            if (btn) {
                // Deactivate others
                const parent = btn.parentElement;
                if (parent) {
                    parent.querySelectorAll('.wave-btn').forEach(b => b.classList.remove('active'));
                }
                btn.classList.add('active');
            }
        }

        if (initialStart) {
            const startInput = document.getElementById('sweep-start');
            if (startInput) startInput.value = initialStart;
        }
        if (initialEnd) {
            const endInput = document.getElementById('sweep-end');
            if (endInput) endInput.value = initialEnd;
        }
        if (initialDuration) {
            const durationSlider = document.getElementById('sweep-duration');
            const durationVal = document.getElementById('sweep-time-val');
            if (durationSlider) durationSlider.value = initialDuration;
            if (durationVal) durationVal.textContent = `${initialDuration}s`;
        }
        if (initialSweepType) {
            const sweepTypeSelect = document.getElementById('sweep-type');
            if (sweepTypeSelect) sweepTypeSelect.value = initialSweepType;
        }
        if (initialSpecialType) {
            const specialSelect = document.getElementById('generator-special-type');
            if (specialSelect) specialSelect.value = initialSpecialType;
        }
    },

    setupEventListeners() {
        const toggleBtn = document.getElementById('generator-toggle');
        const freqSlider = document.getElementById('generator-freq-slider');
        const freqVal = document.getElementById('generator-freq-val');
        const waveBtns = document.querySelectorAll('.wave-btn');
        const volSlider = document.getElementById('generator-vol');
        const presetBtns = document.querySelectorAll('.preset-btn');
        const modeBtns = document.querySelectorAll('.generator-mode-btn');
        const sweepDurationSlider = document.getElementById('sweep-duration');
        const sweepDurationVal = document.getElementById('sweep-time-val');

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggle());
        }

        // Mode selections
        modeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetMode = btn.dataset.mode;
                this.switchMode(targetMode);
            });
        });

        // Sync main frequency slider
        if (freqSlider && freqVal) {
            freqSlider.addEventListener('input', (e) => {
                const freq = this.sliderToFreq(e.target.value);
                freqVal.textContent = freq;
                if (this.oscillator && this.isPlaying && this.currentMode === 'tone') {
                    this.oscillator.frequency.setTargetAtTime(freq, this.app.audioCtx.currentTime, 0.05);
                }
            });
        }

        // Duration slider for sweeps
        if (sweepDurationSlider && sweepDurationVal) {
            sweepDurationSlider.addEventListener('input', (e) => {
                sweepDurationVal.textContent = `${e.target.value}s`;
            });
        }

        // Waveform selections (Tones & Noise Colors)
        waveBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const parent = btn.parentElement;
                if (parent) {
                    parent.querySelectorAll('.wave-btn').forEach(b => b.classList.remove('active'));
                }
                btn.classList.add('active');
                
                const prevType = this.currentType;
                this.currentType = btn.dataset.type;
                
                if (this.isPlaying) {
                    // Hot-swap nodes if source type changes while running
                    const wasNoise = ['white', 'pink', 'brown'].includes(prevType);
                    const nowNoise = ['white', 'pink', 'brown'].includes(this.currentType);
                    
                    if (wasNoise !== nowNoise || nowNoise) {
                        this.stopSource();
                        this.startSource();
                    } else if (this.oscillator) {
                        this.oscillator.type = this.currentType;
                    }
                }
            });
        });

        // Volume control
        if (volSlider) {
            volSlider.addEventListener('input', (e) => {
                const vol = e.target.value;
                if (this.gainNode && this.isPlaying) {
                    this.gainNode.gain.setTargetAtTime(vol, this.app.audioCtx.currentTime, 0.02);
                }
            });
        }

        // Preset buttons
        presetBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const freq = parseFloat(btn.dataset.freq);
                if (freqSlider) freqSlider.value = this.freqToSlider(freq);
                if (freqVal) freqVal.textContent = freq;
                if (this.oscillator && this.isPlaying && this.currentMode === 'tone') {
                    this.oscillator.frequency.setTargetAtTime(freq, this.app.audioCtx.currentTime, 0.05);
                }
            });
        });
    },

    switchMode(mode) {
        if (this.isPlaying) {
            this.stop();
        }

        this.currentMode = mode;

        // Update mode button styles
        const modeBtns = document.querySelectorAll('.generator-mode-btn');
        modeBtns.forEach(btn => {
            if (btn.dataset.mode === mode) {
                btn.classList.remove('btn-secondary');
                btn.classList.add('btn-primary', 'active');
            } else {
                btn.classList.remove('btn-primary', 'active');
                btn.classList.add('btn-secondary');
            }
        });

        // Toggle visibility of setting cards
        const freqCard = document.getElementById('generator-freq-card');
        const sweepCard = document.getElementById('generator-sweep-card');
        const wavesGroup = document.getElementById('generator-waves-group');
        const noiseGroup = document.getElementById('generator-noise-group');
        const specialGroup = document.getElementById('generator-special-group');
        const sweepProgressContainer = document.getElementById('generator-sweep-progress-container');
        const toggleBtn = document.getElementById('generator-toggle');

        if (freqCard) freqCard.style.display = (mode === 'tone' || mode === 'special') ? 'block' : 'none';
        if (sweepCard) sweepCard.style.display = (mode === 'sweep') ? 'block' : 'none';
        if (wavesGroup) wavesGroup.style.display = (mode === 'tone') ? 'block' : 'none';
        if (noiseGroup) noiseGroup.style.display = (mode === 'noise') ? 'block' : 'none';
        if (specialGroup) specialGroup.style.display = (mode === 'special') ? 'block' : 'none';
        if (sweepProgressContainer) sweepProgressContainer.style.display = (mode === 'sweep') ? 'block' : 'none';

        if (toggleBtn) {
            toggleBtn.textContent = (mode === 'sweep') ? 'Begin Sweep' : 'Start Generator';
            toggleBtn.classList.remove('btn-danger');
            toggleBtn.classList.add('btn-primary');
        }

        // Set default type if switching modes
        if (mode === 'tone') {
            this.currentType = 'sine';
            const activeWave = document.querySelector('#generator-waves-group .wave-btn.active');
            if (activeWave) this.currentType = activeWave.dataset.type;
        } else if (mode === 'noise') {
            this.currentType = 'white';
            const activeNoise = document.querySelector('#generator-noise-group .wave-btn.active');
            if (activeNoise) this.currentType = activeNoise.dataset.type;
        }
    },

    toggle() {
        const toggleBtn = document.getElementById('generator-toggle');
        if (!toggleBtn) return;

        if (this.isPlaying) {
            this.stop();
            toggleBtn.textContent = (this.currentMode === 'sweep') ? 'Begin Sweep' : 'Start Generator';
            toggleBtn.classList.remove('btn-danger');
            toggleBtn.classList.add('btn-primary');
        } else {
            this.start();
            toggleBtn.textContent = (this.currentMode === 'sweep') ? 'Cancel Sweep' : 'Stop Generator';
            toggleBtn.classList.remove('btn-primary');
            toggleBtn.classList.add('btn-danger');
        }
    },

    start() {
        const ctx = this.app.getAudioContext();
        this.gainNode = ctx.createGain();

        // Configure volume
        const vol = parseFloat(document.getElementById('generator-vol').value) || 0.25;
        this.gainNode.gain.setValueAtTime(vol, ctx.currentTime);

        // Routing
        this.gainNode.connect(this.app.analyserNode);
        this.gainNode.connect(ctx.destination);

        this.isPlaying = true;
        this.app.isSoundActive = true;
        this.startTime = Date.now();

        this.startSource();
    },

    startSource() {
        const ctx = this.app.getAudioContext();

        if (this.currentMode === 'tone') {
            this.oscillator = ctx.createOscillator();
            this.oscillator.type = this.currentType;
            
            const sliderVal = document.getElementById('generator-freq-slider').value;
            const freq = this.sliderToFreq(sliderVal);
            this.oscillator.frequency.setValueAtTime(freq, ctx.currentTime);
            
            this.oscillator.connect(this.gainNode);
            this.oscillator.start();

        } else if (this.currentMode === 'noise') {
            this.noiseNode = ctx.createBufferSource();
            this.noiseNode.buffer = this.generateNoiseBuffer(this.currentType);
            this.noiseNode.loop = true;
            this.noiseNode.connect(this.gainNode);
            this.noiseNode.start(0);

        } else if (this.currentMode === 'sweep') {
            const startFreq = parseFloat(document.getElementById('sweep-start').value) || 20;
            const endFreq = parseFloat(document.getElementById('sweep-end').value) || 20000;
            this.duration = parseFloat(document.getElementById('sweep-duration').value) || 10;
            const sweepType = document.getElementById('sweep-type').value || 'exponential';

            const progressBar = document.getElementById('sweep-progress');
            const freqDisplay = document.getElementById('sweep-current-freq');
            if (progressBar) progressBar.style.width = '0%';

            this.oscillator = ctx.createOscillator();
            this.oscillator.type = 'sine';
            this.oscillator.connect(this.gainNode);

            if (sweepType === 'exponential') {
                this.oscillator.frequency.setValueAtTime(startFreq, ctx.currentTime);
                this.oscillator.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + this.duration);
            } else {
                this.oscillator.frequency.setValueAtTime(startFreq, ctx.currentTime);
                this.oscillator.frequency.linearRampToValueAtTime(endFreq, ctx.currentTime + this.duration);
            }

            this.oscillator.start();

            this.sweepInterval = setInterval(() => {
                const elapsed = (Date.now() - this.startTime) / 1000;
                const progressPercent = Math.min((elapsed / this.duration) * 100, 100);
                if (progressBar) progressBar.style.width = `${progressPercent}%`;

                let currentFreq = startFreq;
                if (sweepType === 'exponential') {
                    const logStart = Math.log(startFreq);
                    const logEnd = Math.log(endFreq);
                    const currentLogFreq = logStart + (elapsed / this.duration) * (logEnd - logStart);
                    currentFreq = Math.round(Math.exp(currentLogFreq));
                } else {
                    currentFreq = Math.round(startFreq + (elapsed / this.duration) * (endFreq - startFreq));
                }

                if (freqDisplay) freqDisplay.textContent = `${currentFreq} Hz`;

                if (progressPercent >= 100 || elapsed >= this.duration) {
                    if (freqDisplay) freqDisplay.textContent = `Completed: ${endFreq} Hz`;
                    this.toggle();
                }
            }, 30);

        } else if (this.currentMode === 'special') {
            const specialType = document.getElementById('generator-special-type').value || 'shepard';
            const sliderVal = document.getElementById('generator-freq-slider').value;
            const baseFreq = this.sliderToFreq(sliderVal);
            const freqDisplay = document.getElementById('generator-freq-val');

            if (specialType === 'shepard' || specialType === 'shepard-desc') {
                const numVoices = 6;
                this.oscillators = [];
                this.gainNodes = [];

                for (let i = 0; i < numVoices; i++) {
                    const osc = ctx.createOscillator();
                    const gn = ctx.createGain();
                    
                    osc.type = 'sine';
                    osc.connect(gn);
                    gn.connect(this.gainNode);
                    
                    gn.gain.setValueAtTime(0, ctx.currentTime);
                    osc.start();

                    this.oscillators.push(osc);
                    this.gainNodes.push(gn);
                }

                const period = 8; // 8 seconds per octave loop

                this.sweepInterval = setInterval(() => {
                    const elapsed = (Date.now() - this.startTime) / 1000;
                    
                    // Allow dynamic frequency slider adjustments on the fly
                    const currentSlider = document.getElementById('generator-freq-slider').value;
                    const dynamicBase = this.sliderToFreq(currentSlider);
                    if (freqDisplay) freqDisplay.textContent = dynamicBase;

                    let p = (elapsed % period) / period;
                    if (specialType === 'shepard-desc') {
                        p = 1 - p;
                    }

                    for (let i = 0; i < numVoices; i++) {
                        let x = i + p;
                        while (x < 0) x += numVoices;
                        while (x >= numVoices) x -= numVoices;

                        const f = dynamicBase * Math.pow(2, x);
                        const g = 0.5 * (0.5 - 0.5 * Math.cos((2 * Math.PI * x) / numVoices));

                        if (this.oscillators[i] && this.gainNodes[i]) {
                            this.oscillators[i].frequency.setValueAtTime(f, ctx.currentTime);
                            this.gainNodes[i].gain.setValueAtTime(g * 0.15, ctx.currentTime);
                        }
                    }
                }, 30);

            } else if (specialType === 'siren') {
                // Siren mode modulated dynamically around base frequency
                this.oscillator = ctx.createOscillator();
                this.oscillator.type = 'sine';
                this.oscillator.connect(this.gainNode);
                this.oscillator.start();

                this.sweepInterval = setInterval(() => {
                    const elapsed = (Date.now() - this.startTime) / 1000;
                    
                    // Allow dynamic frequency slider adjustments on the fly
                    const currentSlider = document.getElementById('generator-freq-slider').value;
                    const dynamicBase = this.sliderToFreq(currentSlider);
                    
                    const cycle = Math.sin(2 * Math.PI * elapsed * 2); // 2Hz cycle
                    const currentFreq = Math.round(dynamicBase + (dynamicBase * 0.4 * cycle)); // warble by 40%
                    
                    if (freqDisplay) freqDisplay.textContent = currentFreq;
                    if (this.oscillator) {
                        this.oscillator.frequency.setValueAtTime(currentFreq, ctx.currentTime);
                    }
                }, 30);
            }
        }
    },

    stopSource() {
        clearInterval(this.sweepInterval);
        this.sweepInterval = null;

        if (this.oscillator) {
            try {
                this.oscillator.stop();
                this.oscillator.disconnect();
            } catch (e) {}
            this.oscillator = null;
        }
        if (this.noiseNode) {
            try {
                this.noiseNode.stop();
                this.noiseNode.disconnect();
            } catch (e) {}
            this.noiseNode = null;
        }

        // Clean up multi-voice Shepard's tone components
        if (this.oscillators && this.oscillators.length > 0) {
            this.oscillators.forEach(osc => {
                try {
                    osc.stop();
                    osc.disconnect();
                } catch(e) {}
            });
            this.oscillators = [];
        }
        if (this.gainNodes && this.gainNodes.length > 0) {
            this.gainNodes.forEach(gn => {
                try {
                    gn.disconnect();
                } catch(e) {}
            });
            this.gainNodes = [];
        }

        const progressBar = document.getElementById('sweep-progress');
        const freqDisplay = document.getElementById('sweep-current-freq');
        if (progressBar) progressBar.style.width = '0%';
        if (freqDisplay) freqDisplay.textContent = 'Ready to Sweep';
    },

    stop() {
        this.stopSource();
        if (this.gainNode) {
            try {
                this.gainNode.disconnect();
            } catch (e) {}
            this.gainNode = null;
        }
        this.isPlaying = false;
        this.app.isSoundActive = false;

        const toggleBtn = document.getElementById('generator-toggle');
        if (toggleBtn) {
            toggleBtn.textContent = (this.currentMode === 'sweep') ? 'Begin Sweep' : 'Start Generator';
            toggleBtn.classList.remove('btn-danger');
            toggleBtn.classList.add('btn-primary');
        }
    },

    generateNoiseBuffer(type) {
        const ctx = this.app.getAudioContext();
        const bufferSize = 2 * ctx.sampleRate;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        if (type === 'white') {
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }
        } else if (type === 'pink') {
            let b0, b1, b2, b3, b4, b5, b6;
            b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                b0 = 0.99886 * b0 + white * 0.0555179;
                b1 = 0.99332 * b1 + white * 0.0750759;
                b2 = 0.96900 * b2 + white * 0.1538520;
                b3 = 0.86650 * b3 + white * 0.3104856;
                b4 = 0.55000 * b4 + white * 0.5329522;
                b5 = -0.7616 * b5 - white * 0.0168980;
                output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
                output[i] *= 0.11; // rough compensation
                b6 = white * 0.115926;
            }
        } else if (type === 'brown') {
            let lastOut = 0.0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                output[i] = (lastOut + (0.02 * white)) / 1.02;
                lastOut = output[i];
                output[i] *= 3.5; // rough compensation
            }
        }

        return noiseBuffer;
    },

    sliderToFreq(val) {
        const minF = 20;
        const maxF = 20000;
        const p = val / 1000;
        return Math.round(minF * Math.pow(maxF / minF, p));
    },

    freqToSlider(freq) {
        const minF = 20;
        const maxF = 20000;
        const p = Math.log(freq / minF) / Math.log(maxF / minF);
        return Math.round(p * 1000);
    }
};
