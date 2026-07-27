// Signal Generator Tool Component (Oscillators & Noise Colors)
window.GeneratorTool = {
    app: null,
    oscillator: null,
    noiseNode: null,
    gainNode: null,
    isPlaying: false,
    currentType: 'sine', // default to sine tone

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

        if (!toggleBtn) return;

        toggleBtn.addEventListener('click', () => this.toggle());

        // Sync slider with display frequency
        freqSlider.addEventListener('input', (e) => {
            const freq = e.target.value;
            freqVal.textContent = freq;
            if (this.oscillator && this.isPlaying) {
                this.oscillator.frequency.setTargetAtTime(freq, this.app.audioCtx.currentTime, 0.05);
            }
        });

        // Signal type selections (Tones & Noise Colors)
        waveBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                waveBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const prevType = this.currentType;
                this.currentType = btn.dataset.type;
                
                const isNoise = ['white', 'pink', 'brown'].includes(this.currentType);
                const freqCard = document.getElementById('generator-freq-card');
                
                // Toggle frequency card interaction visually
                if (freqCard) {
                    if (isNoise) {
                        freqCard.style.opacity = '0.4';
                        freqCard.style.pointerEvents = 'none';
                    } else {
                        freqCard.style.opacity = '1';
                        freqCard.style.pointerEvents = 'auto';
                    }
                }

                // If currently playing, we must hot-swap the audio source node
                if (this.isPlaying) {
                    const wasNoise = ['white', 'pink', 'brown'].includes(prevType);
                    const nowNoise = isNoise;
                    
                    if (wasNoise !== nowNoise) {
                        // Source type changed (Oscillator <-> Noise Buffer). Must rebuild chain.
                        this.stopSource();
                        this.startSource();
                    } else if (nowNoise) {
                        // Just changed noise color, rebuild noise node buffer
                        this.stopSource();
                        this.startSource();
                    } else {
                        // Standard oscillator wave type change
                        if (this.oscillator) {
                            this.oscillator.type = this.currentType;
                        }
                    }
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
        if (!toggleBtn) return;

        if (this.isPlaying) {
            this.stop();
            toggleBtn.textContent = 'Start Generator';
            toggleBtn.classList.remove('btn-danger');
            toggleBtn.classList.add('btn-primary');
        } else {
            this.start();
            toggleBtn.textContent = 'Stop Generator';
            toggleBtn.classList.remove('btn-primary');
            toggleBtn.classList.add('btn-danger');
        }
    },

    start() {
        const ctx = this.app.getAudioContext();
        this.gainNode = ctx.createGain();

        // Configure Volume
        const vol = document.getElementById('generator-vol').value;
        this.gainNode.gain.setValueAtTime(vol, ctx.currentTime);

        // Route Gain to visualizer & speakers
        this.gainNode.connect(this.app.analyserNode);
        this.gainNode.connect(ctx.destination);

        this.startSource();
        this.isPlaying = true;
        this.app.isSoundActive = true;
    },

    startSource() {
        const ctx = this.app.getAudioContext();
        const isNoise = ['white', 'pink', 'brown'].includes(this.currentType);

        if (isNoise) {
            this.noiseNode = ctx.createBufferSource();
            this.noiseNode.buffer = this.generateNoiseBuffer(this.currentType);
            this.noiseNode.loop = true;
            this.noiseNode.connect(this.gainNode);
            this.noiseNode.start(0);
        } else {
            this.oscillator = ctx.createOscillator();
            this.oscillator.type = this.currentType;
            
            const freq = document.getElementById('generator-freq-slider').value;
            this.oscillator.frequency.setValueAtTime(freq, ctx.currentTime);
            
            this.oscillator.connect(this.gainNode);
            this.oscillator.start();
        }
    },

    stopSource() {
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
    },

    stop() {
        this.stopSource();
        if (this.gainNode) {
            this.gainNode.disconnect();
            this.gainNode = null;
        }
        this.isPlaying = false;
        this.app.isSoundActive = false;

        const toggleBtn = document.getElementById('generator-toggle');
        if (toggleBtn) {
            toggleBtn.textContent = 'Start Generator';
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
    }
};
