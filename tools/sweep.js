// Speaker Sweep Tool Component
window.SweepTool = {
    app: null,
    oscillator: null,
    gainNode: null,
    isPlaying: false,
    sweepInterval: null,
    startTime: 0,
    duration: 0,

    init(appInstance) {
        this.app = appInstance;
        this.setupEventListeners();
    },

    setupEventListeners() {
        const toggleBtn = document.getElementById('sweep-toggle');
        const durationSlider = document.getElementById('sweep-duration');
        const durationVal = document.getElementById('sweep-time-val');

        durationSlider.addEventListener('input', (e) => {
            durationVal.textContent = `${e.target.value}s`;
        });

        toggleBtn.addEventListener('click', () => this.toggle());
    },

    toggle() {
        const toggleBtn = document.getElementById('sweep-toggle');

        if (this.isPlaying) {
            this.stop();
            toggleBtn.textContent = 'Begin Sweep';
            toggleBtn.classList.remove('btn-danger');
            toggleBtn.classList.add('btn-primary');
        } else {
            this.start();
            toggleBtn.textContent = 'Cancel Sweep';
            toggleBtn.classList.remove('btn-primary');
            toggleBtn.classList.add('btn-danger');
        }
    },

    start() {
        const ctx = this.app.getAudioContext();
        
        this.oscillator = ctx.createOscillator();
        this.gainNode = ctx.createGain();

        const startFreq = parseFloat(document.getElementById('sweep-start').value) || 20;
        const endFreq = parseFloat(document.getElementById('sweep-end').value) || 20000;
        this.duration = parseFloat(document.getElementById('sweep-duration').value) || 10;

        // Routing: Oscillator -> Gain -> Global Analyser
        this.oscillator.connect(this.gainNode);
        this.gainNode.connect(this.app.analyserNode);

        // Constant full gain of 0.5 (safe volume)
        this.gainNode.gain.setValueAtTime(0.5, ctx.currentTime);

        // Sweeping Pitch Logic via Web Audio exponentialRampToValueAtTime
        this.oscillator.frequency.setValueAtTime(startFreq, ctx.currentTime);
        this.oscillator.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + this.duration);

        this.oscillator.start();
        this.isPlaying = true;
        this.startTime = Date.now();

        // Update progress bar UI on screen
        const progressBar = document.getElementById('sweep-progress');
        const freqDisplay = document.getElementById('sweep-current-freq');

        progressBar.style.width = '0%';
        
        this.sweepInterval = setInterval(() => {
            const elapsed = (Date.now() - this.startTime) / 1000;
            const progressPercent = Math.min((elapsed / this.duration) * 100, 100);
            progressBar.style.width = `${progressPercent}%`;

            // Calculate current frequency on logarithm scale
            const logStart = Math.log(startFreq);
            const logEnd = Math.log(endFreq);
            const currentLogFreq = logStart + (elapsed / this.duration) * (logEnd - logStart);
            const currentFreq = Math.round(Math.exp(currentLogFreq));

            if (progressPercent >= 100 || elapsed >= this.duration) {
                freqDisplay.textContent = `Completed: ${endFreq} Hz`;
                this.toggle(); // Automatic shut off
            } else {
                freqDisplay.textContent = `${currentFreq} Hz`;
            }
        }, 30);
    },

    stop() {
        clearInterval(this.sweepInterval);
        
        const progressBar = document.getElementById('sweep-progress');
        const freqDisplay = document.getElementById('sweep-current-freq');
        
        if (progressBar) progressBar.style.width = '0%';
        if (freqDisplay) freqDisplay.textContent = 'Ready to Sweep';

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

        const toggleBtn = document.getElementById('sweep-toggle');
        if (toggleBtn) {
            toggleBtn.textContent = 'Begin Sweep';
            toggleBtn.classList.remove('btn-danger');
            toggleBtn.classList.add('btn-primary');
        }
    }
};
