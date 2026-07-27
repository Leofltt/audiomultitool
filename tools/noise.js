// Decibel Sound Level Meter Component
window.NoiseTool = {
    app: null,
    dbStream: null,
    dbSource: null,
    analyser: null,
    isListening: false,
    minDb: Infinity,
    maxDb: -Infinity,
    avgDbSum: 0,
    avgDbCount: 0,
    animationId: null,

    init(appInstance) {
        this.app = appInstance;
        this.setupEventListeners();
    },

    setupEventListeners() {
        const dbToggleBtn = document.getElementById('db-toggle');
        if (dbToggleBtn) {
            dbToggleBtn.addEventListener('click', () => this.toggleDb());
        }

        // Reset counters when weighting selection changes
        const weightingSelect = document.getElementById('db-weighting-select');
        if (weightingSelect) {
            weightingSelect.addEventListener('change', () => {
                this.minDb = Infinity;
                this.maxDb = -Infinity;
                this.avgDbSum = 0;
                this.avgDbCount = 0;
            });
        }
    },

    toggleDb() {
        const toggleBtn = document.getElementById('db-toggle');
        if (!toggleBtn) return;

        if (this.isListening) {
            this.stopDb();
            toggleBtn.textContent = 'Start Measurement';
            toggleBtn.classList.remove('btn-danger');
            toggleBtn.classList.add('btn-primary');
        } else {
            this.startDb()
                .then(() => {
                    toggleBtn.textContent = 'Stop Measurement';
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
        
        // Connect source to global analyser so main visualizer animates
        this.dbSource.connect(this.app.analyserNode);

        // Dedicated analyser node for local dB spectral calculations
        this.analyser = ctx.createAnalyser();
        this.analyser.fftSize = 1024;
        this.dbSource.connect(this.analyser);

        this.minDb = Infinity;
        this.maxDb = -Infinity;
        this.avgDbSum = 0;
        this.avgDbCount = 0;
        this.isListening = true;
        this.app.isSoundActive = true;

        // Run measurement processing loop on animation frames
        const process = () => {
            if (!this.isListening) return;

            const bufferLength = this.analyser.frequencyBinCount;
            const dataArray = new Float32Array(bufferLength);
            this.analyser.getFloatFrequencyData(dataArray);

            const weighting = document.getElementById('db-weighting-select').value;
            const sampleRate = ctx.sampleRate;
            let sumPower = 0;

            for (let i = 0; i < bufferLength; i++) {
                const binDb = dataArray[i];
                if (binDb === -Infinity || isNaN(binDb)) continue;

                let weightedDb = binDb;
                if (weighting === 'A') {
                    const freq = (i * sampleRate) / (bufferLength * 2);
                    weightedDb += this.getAWeightOffset(freq);
                }

                sumPower += Math.pow(10, weightedDb / 10);
            }

            // Reference standard threshold offset: 1 Pascal at 94dB SPL calibration
            let db = 10 * Math.log10(sumPower || 1e-10) + 94;
            db = Math.max(30, Math.min(db, 120)); // Limit to standard 30-120dB SPL range

            // Update stats
            if (db > 30.1) {
                if (db < this.minDb) this.minDb = db;
                if (db > this.maxDb) this.maxDb = db;
                this.avgDbSum += db;
                this.avgDbCount++;
            }

            const averageDb = this.avgDbCount > 0 ? (this.avgDbSum / this.avgDbCount) : 0;

            // Update UI elements
            this.updateMeterUI(db, this.minDb, this.maxDb, averageDb);

            this.animationId = requestAnimationFrame(process);
        };

        process();
    },

    updateMeterUI(db, min, max, avg) {
        const valEl = document.getElementById('db-level-val');
        const minEl = document.getElementById('db-level-min');
        const maxEl = document.getElementById('db-level-max');
        const avgEl = document.getElementById('db-level-avg');
        const gaugeFill = document.getElementById('db-gauge-fill');
        const envLabel = document.getElementById('db-environment-label');

        if (valEl) valEl.innerHTML = `${db.toFixed(1)} <span style="font-size: 18px; font-family: var(--font-sans); font-weight:500; color: var(--text-secondary);">dB</span>`;
        if (minEl) minEl.textContent = isFinite(min) ? min.toFixed(1) : '--';
        if (maxEl) maxEl.textContent = isFinite(max) ? max.toFixed(1) : '--';
        if (avgEl) avgEl.textContent = avg > 0 ? avg.toFixed(1) : '--';

        // Update Gauge bar width
        if (gaugeFill) {
            const pct = Math.max(0, Math.min(100, ((db - 30) / (120 - 30)) * 100));
            gaugeFill.style.width = `${pct}%`;

            // Change color dynamically matching loudness safety thresholds
            if (db < 70) {
                gaugeFill.style.backgroundColor = 'var(--accent)'; // safe green/blue accent
            } else if (db < 85) {
                gaugeFill.style.backgroundColor = '#fbbf24'; // Warning yellow
            } else {
                gaugeFill.style.backgroundColor = '#f87171'; // Danger red
            }
        }

        // Update environment context labels
        if (envLabel) {
            if (db < 40) envLabel.textContent = "Quiet Library / Bedroom";
            else if (db < 55) envLabel.textContent = "Moderate Room Ambiance";
            else if (db < 70) envLabel.textContent = "Normal Conversational Speech";
            else if (db < 85) envLabel.textContent = "Loud Street / Office Noise";
            else if (db < 95) envLabel.textContent = "Heavy Traffic / Lawnmower (Exposure Limit)";
            else envLabel.textContent = "Dangerous Levels (Hearing Risk)";
        }
    },

    // A-Weighting coefficient formula curve calculation
    getAWeightOffset(f) {
        if (f < 20) return -100;
        const f2 = f * f;
        const f4 = f2 * f2;
        const c1 = 12194.217 * 12194.217;
        const c2 = 20.6 * 20.6;
        const c3 = 107.7 * 107.7;
        const c4 = 737.9 * 737.9;
        
        const rA = (c1 * f4) / ((f2 + c2) * Math.sqrt((f2 + c3) * (f2 + c4)) * (f2 + c1));
        return 2.0 + 20 * Math.log10(rA);
    },

    stopDb() {
        this.isListening = false;
        this.app.isSoundActive = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        if (this.dbStream) {
            this.dbStream.getTracks().forEach(track => track.stop());
            this.dbStream = null;
        }

        if (this.dbSource) {
            this.dbSource.disconnect();
            this.dbSource = null;
        }

        if (this.analyser) {
            this.analyser.disconnect();
            this.analyser = null;
        }

        // Reset UI display values
        const valEl = document.getElementById('db-level-val');
        if (valEl) valEl.innerHTML = `0.0 <span style="font-size: 18px; font-family: var(--font-sans); font-weight:500; color: var(--text-secondary);">dB</span>`;
        
        const envLabel = document.getElementById('db-environment-label');
        if (envLabel) envLabel.textContent = "Microphone Off";

        const gaugeFill = document.getElementById('db-gauge-fill');
        if (gaugeFill) gaugeFill.style.width = '0%';
    },

    stop() {
        this.stopDb();
    }
};
