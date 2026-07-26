// Noise Generator & Decibel Meter Tool Component
window.NoiseTool = {
    app: null,
    
    // Decibel Meter state
    dbStream: null,
    dbSource: null,
    dbProcessor: null,
    isListening: false,
    minDb: Infinity,
    maxDb: -Infinity,

    // Noise Generator state
    noiseNode: null,
    gainNode: null,
    isPlaying: false,

    init(appInstance) {
        this.app = appInstance;
        this.setupEventListeners();
    },

    setupEventListeners() {
        // dB toggle button
        const dbToggleBtn = document.getElementById('db-toggle');
        if (dbToggleBtn) {
            dbToggleBtn.addEventListener('click', () => this.toggleDb());
        }

        // Noise toggle button
        const noiseToggleBtn = document.getElementById('noise-toggle');
        if (noiseToggleBtn) {
            noiseToggleBtn.addEventListener('click', () => this.toggleNoise());
        }

        // Noise volume control
        const volumeSlider = document.getElementById('noise-vol');
        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                const vol = parseFloat(e.target.value);
                if (this.gainNode) {
                    this.gainNode.gain.setTargetAtTime(vol, this.app.audioCtx.currentTime, 0.02);
                }
            });
        }

        // Change noise type while playing
        const noiseSelector = document.getElementById('noise-type');
        if (noiseSelector) {
            noiseSelector.addEventListener('change', () => {
                if (this.isPlaying) {
                    // Stop current, recreate node with new type, and restart
                    this.stopNoise();
                    this.startNoise();
                }
            });
        }
    },

    // Decibel Meter Logic
    toggleDb() {
        const toggleBtn = document.getElementById('db-toggle');
        if (this.isListening) {
            this.stopDb();
            toggleBtn.textContent = 'Start Listening';
            toggleBtn.classList.remove('btn-danger');
            toggleBtn.classList.add('btn-primary');
        } else {
            this.startDb()
                .then(() => {
                    toggleBtn.textContent = 'Stop Listening';
                    toggleBtn.classList.remove('btn-primary');
                    toggleBtn.classList.add('btn-danger');
                })
                .catch((err) => {
                    console.error("Microphone access failed for dB meter:", err);
                    alert("Could not access microphone for sound level analysis. Please grant microphone permissions.");
                });
        }
    },

    async startDb() {
        this.dbStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        const ctx = this.app.getAudioContext();

        this.dbSource = ctx.createMediaStreamSource(this.dbStream);
        
        // We route the mic to the visualizer so the visualizer animates
        this.dbSource.connect(this.app.analyserNode);

        // Standard script processor to calculate volume RMS
        this.dbProcessor = ctx.createScriptProcessor(2048, 1, 1);
        
        this.minDb = Infinity;
        this.maxDb = -Infinity;

        this.dbProcessor.onaudioprocess = (e) => {
            if (!this.isListening) return;
            const inputData = e.inputBuffer.getChannelData(0);
            
            // Calculate RMS (Root Mean Square) volume level
            let sum = 0;
            for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i];
            }
            const rms = Math.sqrt(sum / inputData.length);

            // Convert to decibels (approximated threshold calibration offset)
            let db = 20 * Math.log10(rms || 0.00001) + 90;
            db = Math.max(30, Math.min(db, 120)); // Limit range to safe 30-120dB SPL approximation

            if (rms > 0.0001) {
                if (db < this.minDb) this.minDb = db;
                if (db > this.maxDb) this.maxDb = db;
            }

            // Update UI elements
            document.getElementById('db-level-val').innerHTML = `${db.toFixed(1)} <span style="font-size: 16px;">dB</span>`;
            document.getElementById('db-level-min').textContent = isFinite(this.minDb) ? this.minDb.toFixed(1) : '--';
            document.getElementById('db-level-max').textContent = isFinite(this.maxDb) ? this.maxDb.toFixed(1) : '--';
        };

        this.dbSource.connect(this.dbProcessor);
        this.dbProcessor.connect(ctx.destination); // Required for processing script node in some browsers

        this.isListening = true;
    },

    stopDb() {
        this.isListening = false;

        if (this.dbStream) {
            this.dbStream.getTracks().forEach(track => track.stop());
            this.dbStream = null;
        }

        if (this.dbSource) {
            this.dbSource.disconnect();
            this.dbSource = null;
        }

        if (this.dbProcessor) {
            this.dbProcessor.disconnect();
            this.dbProcessor = null;
        }

        document.getElementById('db-level-val').innerHTML = `0.0 <span style="font-size: 16px;">dB</span>`;
    },

    // Noise Generator Logic
    toggleNoise() {
        const toggleBtn = document.getElementById('noise-toggle');
        if (this.isPlaying) {
            this.stopNoise();
            toggleBtn.textContent = 'Start Playback';
            toggleBtn.classList.remove('btn-danger');
            toggleBtn.classList.add('btn-primary');
        } else {
            this.startNoise();
            toggleBtn.textContent = 'Stop Playback';
            toggleBtn.classList.remove('btn-primary');
            toggleBtn.classList.add('btn-danger');
        }
    },

    startNoise() {
        const ctx = this.app.getAudioContext();
        const type = document.getElementById('noise-type').value;
        const volume = parseFloat(document.getElementById('noise-vol').value);

        // 1. Create a custom buffer based on the selected noise color
        const bufferSize = 2 * ctx.sampleRate; // 2 seconds of audio buffer
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        if (type === 'white') {
            // White Noise: Random values between -1 and 1
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }
        } else if (type === 'pink') {
            // Pink Noise: -3dB/octave spectral roll-off
            let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                b0 = 0.99886 * b0 + white * 0.0555179;
                b1 = 0.99332 * b1 + white * 0.0750759;
                b2 = 0.96900 * b2 + white * 0.1538520;
                b3 = 0.86650 * b3 + white * 0.3104856;
                b4 = 0.55000 * b4 + white * 0.5329522;
                b5 = -0.7616 * b5 - white * 0.0168980;
                output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
                output[i] *= 0.11; // Rescale volume output peak limits
                b6 = white * 0.115926;
            }
        } else if (type === 'brown') {
            // Brownian Noise: Accumulate random steps (integration) with decay
            let lastOut = 0.0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                output[i] = (lastOut + (0.02 * white)) / 1.02;
                lastOut = output[i];
                output[i] *= 3.5; // Compensate for volume loss in integration
            }
        }

        // 2. Setup audio buffer node sources
        this.noiseNode = ctx.createBufferSource();
        this.noiseNode.buffer = noiseBuffer;
        this.noiseNode.loop = true;

        this.gainNode = ctx.createGain();
        this.gainNode.gain.setValueAtTime(volume, ctx.currentTime);

        // 3. Connect: Noise -> Gain -> Analyser & Speaker Destination
        this.noiseNode.connect(this.gainNode);
        this.gainNode.connect(this.app.analyserNode);
        this.gainNode.connect(ctx.destination);

        this.noiseNode.start(0);
        this.isPlaying = true;
    },

    stopNoise() {
        if (this.noiseNode) {
            try {
                this.noiseNode.stop();
                this.noiseNode.disconnect();
            } catch(e) {}
            this.noiseNode = null;
        }

        if (this.gainNode) {
            this.gainNode.disconnect();
            this.gainNode = null;
        }

        this.isPlaying = false;

        const toggleBtn = document.getElementById('noise-toggle');
        if (toggleBtn) {
            toggleBtn.textContent = 'Start Playback';
            toggleBtn.classList.remove('btn-danger');
            toggleBtn.classList.add('btn-primary');
        }
    },

    stop() {
        this.stopDb();
        this.stopNoise();
    }
};
