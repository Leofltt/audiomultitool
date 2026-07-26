// Chromatic Tuner Tool Component (Microphone Auto-Correlation Pitch Detector)
window.TunerTool = {
    app: null,
    audioStream: null,
    sourceNode: null,
    isPlaying: false,
    pitchInterval: null,
    
    // Note list matching MIDI notes
    noteStrings: ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"],

    init(appInstance) {
        this.app = appInstance;
        this.setupEventListeners();
    },

    setupEventListeners() {
        const toggleBtn = document.getElementById('tuner-toggle');
        toggleBtn.addEventListener('click', () => this.toggle());
    },

    toggle() {
        const toggleBtn = document.getElementById('tuner-toggle');
        const statusLabel = document.getElementById('tuner-status');

        if (this.isPlaying) {
            this.stop();
            toggleBtn.textContent = 'Enable Microphone';
            toggleBtn.classList.remove('btn-danger');
            toggleBtn.classList.add('btn-primary');
            statusLabel.textContent = 'Requires mic permission to listen to audio pitch.';
        } else {
            this.start()
                .then(() => {
                    toggleBtn.textContent = 'Disable Microphone';
                    toggleBtn.classList.remove('btn-primary');
                    toggleBtn.classList.add('btn-danger');
                    statusLabel.textContent = 'Listening... Play a note on your instrument.';
                })
                .catch((err) => {
                    console.error("Microphone access error: ", err);
                    statusLabel.textContent = 'Access Denied. Please enable microphone permissions in your browser.';
                });
        }
    },

    async start() {
        // Request microphone access
        this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        const ctx = this.app.getAudioContext();
        
        // Routing microphone output into our analyzer context
        this.sourceNode = ctx.createMediaStreamSource(this.audioStream);
        this.sourceNode.connect(this.app.analyserNode);

        this.isPlaying = true;

        const bufferLength = 2048;
        const buffer = new Float32Array(bufferLength);

        this.pitchInterval = setInterval(() => {
            if (!this.isPlaying) return;
            
            // Get frequency time-domain details to determine pitch
            this.app.analyserNode.getFloatTimeDomainData(buffer);
            const freq = this.autoCorrelate(buffer, ctx.sampleRate);

            if (freq !== -1) {
                const noteNum = this.noteFromFrequency(freq);
                const noteName = this.noteStrings[noteNum % 12];
                const cents = this.getCents(freq, this.frequencyFromNoteNumber(noteNum));

                // Update needle UI
                const needle = document.getElementById('tuner-needle');
                // Limit cents offset rotation to +/- 45 degrees
                const rotateDegree = Math.max(Math.min(cents, 50), -50) * 0.9;
                needle.style.transform = `translateX(-50%) rotate(${rotateDegree}deg)`;

                // Highlight needle green if pitch is perfectly in tune (+/- 3 cents)
                if (Math.abs(cents) <= 3) {
                    needle.style.background = 'var(--accent)';
                    needle.style.boxShadow = '0 0 10px var(--accent-glow)';
                } else {
                    needle.style.background = 'var(--primary-hover)';
                    needle.style.boxShadow = '0 0 8px var(--primary-glow)';
                }

                // Update text displays
                document.getElementById('tuner-note').textContent = noteName;
                document.getElementById('tuner-cents').textContent = `${freq.toFixed(1)} Hz (${cents > 0 ? '+' : ''}${Math.round(cents)} cents)`;
            }
        }, 100);
    },

    stop() {
        this.isPlaying = false;
        clearInterval(this.pitchInterval);

        if (this.audioStream) {
            this.audioStream.getTracks().forEach(track => track.stop());
            this.audioStream = null;
        }

        if (this.sourceNode) {
            this.sourceNode.disconnect();
            this.sourceNode = null;
        }

        // Reset UI displays
        document.getElementById('tuner-note').textContent = '--';
        document.getElementById('tuner-cents').textContent = '0.0 Hz';
        document.getElementById('tuner-needle').style.transform = 'translateX(-50%) rotate(0deg)';
        document.getElementById('tuner-needle').style.background = 'var(--primary-hover)';
    },

    // Auto-correlation algorithm to track fundamental pitch
    autoCorrelate(buffer, sampleRate) {
        // Find volume threshold (prevent analyzing silence/background static)
        let rms = 0;
        for (let i = 0; i < buffer.length; i++) {
            rms += buffer[i] * buffer[i];
        }
        rms = Math.sqrt(rms / buffer.length);
        if (rms < 0.01) return -1; // Volume too low

        // Find range values for audio waves
        let r1 = 0, r2 = buffer.length - 1;
        const thres = 0.2;
        for (let i = 0; i < buffer.length / 2; i++) {
            if (Math.abs(buffer[i]) < thres) { r1 = i; break; }
        }
        for (let i = buffer.length / 2; i < buffer.length; i++) {
            if (Math.abs(buffer[i]) < thres) { r2 = i; break; }
        }

        const activeBuffer = buffer.slice(r1, r2);
        const correlations = new Float32Array(activeBuffer.length);

        for (let i = 0; i < activeBuffer.length; i++) {
            for (let j = 0; j < activeBuffer.length - i; j++) {
                correlations[i] += activeBuffer[j] * activeBuffer[j + i];
            }
        }

        // Find first peak of correlation
        let d = 0;
        while (correlations[d] > correlations[d + 1]) d++;
        
        let maxval = -1;
        let maxpos = -1;
        
        for (let i = d; i < activeBuffer.length; i++) {
            if (correlations[i] > maxval) {
                maxval = correlations[i];
                maxpos = i;
            }
        }

        let T0 = maxpos;

        // Perform parabolic interpolation for precision adjustment
        const x1 = correlations[T0 - 1];
        const x2 = correlations[T0];
        const x3 = correlations[T0 + 1];
        const a = (x1 + x3 - 2 * x2) / 2;
        const b = (x3 - x1) / 2;
        
        if (a) T0 = T0 - b / (2 * a);

        return sampleRate / T0;
    },

    noteFromFrequency(frequency) {
        const noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
        return Math.round(noteNum) + 69;
    },

    frequencyFromNoteNumber(note) {
        return 440 * Math.pow(2, (note - 69) / 12);
    },

    getCents(frequency, noteFrequency) {
        return 1200 * Math.log(frequency / noteFrequency) / Math.log(2);
    }
};
