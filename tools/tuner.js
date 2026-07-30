// Premium Instrument Tuner Tool Component (Microphone Pitch Tracking, Custom Tunings, & Reference Pitch Pipe)
window.TunerTool = {
    app: null,
    audioStream: null,
    sourceNode: null,
    analyser: null,
    isPlaying: false,
    pitchInterval: null,
    
    // Pitch pipe synthesiser nodes
    refOscillator: null,
    refGain: null,
    isRefPlaying: false,
    activeRefString: null,

    // Calibration settings
    a4Frequency: 440,

    noteStrings: ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"],

    instruments: {
        chromatic: {
            name: "Chromatic (Freeform)",
            tunings: {
                standard: { name: "Freeform Note Tracking", notes: [] }
            }
        },
        guitar: {
            name: "Guitar (6-String)",
            tunings: {
                standard: { name: "Standard (E A D G B E)", notes: ["E2", "A2", "D3", "G3", "B3", "E4"] },
                dropd: { name: "Drop D (D A D G B E)", notes: ["D2", "A2", "D3", "G3", "B3", "E4"] },
                dadgad: { name: "DADGAD (D A D G A D)", notes: ["D2", "A2", "D3", "G3", "A3", "D4"] },
                halfstep: { name: "Half-Step Down (Eb Ab Db Gb Bb Eb)", notes: ["D#2", "G#2", "C#3", "F#3", "A#3", "D#4"] },
                custom: { name: "Custom Tuning...", notes: ["E2", "A2", "D3", "G3", "B3", "E4"] }
            }
        },
        guitar7: {
            name: "Guitar (7-String)",
            tunings: {
                standard: { name: "Standard (B E A D G B E)", notes: ["B1", "E2", "A2", "D3", "G3", "B3", "E4"] },
                dropa: { name: "Drop A (A E A D G B E)", notes: ["A1", "E2", "A2", "D3", "G3", "B3", "E4"] },
                custom: { name: "Custom Tuning...", notes: ["B1", "E2", "A2", "D3", "G3", "B3", "E4"] }
            }
        },
        guitar8: {
            name: "Guitar (8-String)",
            tunings: {
                standard: { name: "Standard (F# B E A D G B E)", notes: ["F#1", "B1", "E2", "A2", "D3", "G3", "B3", "E4"] },
                drope: { name: "Drop E (E B E A D G B E)", notes: ["E1", "B1", "E2", "A2", "D3", "G3", "B3", "E4"] },
                custom: { name: "Custom Tuning...", notes: ["F#1", "B1", "E2", "A2", "D3", "G3", "B3", "E4"] }
            }
        },
        bass: {
            name: "Bass Guitar",
            tunings: {
                standard: { name: "Standard (E A D G)", notes: ["E1", "A1", "D2", "G2"] },
                five: { name: "5-String (B E A D G)", notes: ["B0", "E1", "A1", "D2", "G2"] },
                custom: { name: "Custom Tuning...", notes: ["E1", "A1", "D2", "G2"] }
            }
        },
        ukulele: {
            name: "Ukulele",
            tunings: {
                standard: { name: "Standard C (G C E A)", notes: ["G4", "C4", "E4", "A4"] },
                custom: { name: "Custom Tuning...", notes: ["G4", "C4", "E4", "A4"] }
            }
        },
        violin: {
            name: "Violin / Mandolin",
            tunings: {
                standard: { name: "Standard (G D A E)", notes: ["G3", "D4", "A4", "E5"] },
                custom: { name: "Custom Tuning...", notes: ["G3", "D4", "A4", "E5"] }
            }
        },
        viola: {
            name: "Viola / Cello",
            tunings: {
                standard: { name: "Cello/Viola Standard (C G D A)", notes: ["C3", "G3", "D4", "A4"] },
                custom: { name: "Custom Tuning...", notes: ["C3", "G3", "D4", "A4"] }
            }
        },
        banjo: {
            name: "Banjo",
            tunings: {
                standard: { name: "Open G (G D G B D)", notes: ["G4", "D3", "G3", "B3", "D4"] },
                custom: { name: "Custom Tuning...", notes: ["G4", "D3", "G3", "B3", "D4"] }
            }
        }
    },

    init(appInstance) {
        this.app = appInstance;
        this.setupEventListeners();
        this.populateTunings();
        this.updateTunerStringsCard();
        this.applyInitialConfig();
    },

    applyInitialConfig() {
        const pane = document.getElementById('pane-tuner');
        if (!pane) return;

        const initialInstrument = pane.dataset.instrument;
        const initialTuning = pane.dataset.tuning;
        const initialCalibration = pane.dataset.calibration;

        if (initialInstrument) {
            const instrumentSelect = document.getElementById('tuner-instrument-select');
            if (instrumentSelect) {
                instrumentSelect.value = initialInstrument;
                // Update tuning options based on instrument
                this.populateTunings();
            }
        }
        if (initialTuning) {
            const tuningSelect = document.getElementById('tuner-tuning-select');
            if (tuningSelect) {
                tuningSelect.value = initialTuning;
            }
        }
        if (initialCalibration) {
            this.a4Frequency = parseInt(initialCalibration);
            const calibrationInput = document.getElementById('tuner-calibration');
            const calibrationVal = document.getElementById('tuner-cal-val');
            if (calibrationInput) calibrationInput.value = initialCalibration;
            if (calibrationVal) calibrationVal.textContent = initialCalibration;
        }
        this.updateTunerStringsCard();
    },

    setupEventListeners() {
        const toggleBtn = document.getElementById('tuner-toggle');
        const instrumentSelect = document.getElementById('tuner-instrument-select');
        const tuningSelect = document.getElementById('tuner-tuning-select');
        const calibrationSlider = document.getElementById('tuner-calibration');

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggle());
        }

        if (instrumentSelect) {
            instrumentSelect.addEventListener('change', () => {
                this.populateTunings();
                this.updateTunerStringsCard();
            });
        }

        if (tuningSelect) {
            tuningSelect.addEventListener('change', () => {
                this.updateTunerStringsCard();
            });
        }

        if (calibrationSlider) {
            calibrationSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                this.a4Frequency = val;
                document.getElementById('tuner-calibration-val').textContent = `${val}Hz`;
            });
        }

        const addStringBtn = document.getElementById('tuner-add-string-btn');
        const removeStringBtn = document.getElementById('tuner-remove-string-btn');

        if (addStringBtn) {
            addStringBtn.addEventListener('click', () => this.addCustomString());
        }

        if (removeStringBtn) {
            removeStringBtn.addEventListener('click', () => this.removeCustomString());
        }
    },

    addCustomString() {
        const instrument = document.getElementById('tuner-instrument-select').value;
        const notes = this.instruments[instrument].tunings.custom.notes;
        if (notes.length < 12) { // cap at 12 strings maximum for layout safety
            const newNote = notes.length > 0 ? notes[notes.length - 1] : "C4";
            notes.push(newNote);
            this.updateTunerStringsCard();
        }
    },

    removeCustomString() {
        const instrument = document.getElementById('tuner-instrument-select').value;
        const notes = this.instruments[instrument].tunings.custom.notes;
        if (notes.length > 1) {
            notes.pop();
            this.updateTunerStringsCard();
        }
    },

    populateTunings() {
        const instrument = document.getElementById('tuner-instrument-select').value;
        const tuningGroup = document.getElementById('tuner-tuning-group');
        const tuningSelect = document.getElementById('tuner-tuning-select');
        
        if (!tuningSelect || !tuningGroup) return;

        tuningSelect.innerHTML = '';
        const configs = this.instruments[instrument];

        if (instrument === 'chromatic') {
            tuningGroup.style.display = 'none';
        } else {
            tuningGroup.style.display = 'block';
            for (const key in configs.tunings) {
                const opt = document.createElement('option');
                opt.value = key;
                opt.textContent = configs.tunings[key].name;
                tuningSelect.appendChild(opt);
            }
        }
    },

    updateTunerStringsCard() {
        const card = document.getElementById('tuner-strings-card');
        const container = document.getElementById('tuner-strings-container');
        const instrument = document.getElementById('tuner-instrument-select').value;
        const tuningSelect = document.getElementById('tuner-tuning-select');
        const tuningKey = tuningSelect ? tuningSelect.value : 'standard';
        const customEditor = document.getElementById('tuner-custom-editor');

        if (!card || !container) return;

        this.stopReferenceTone();

        if (instrument === 'chromatic') {
            card.style.display = 'none';
            if (customEditor) customEditor.style.display = 'none';
            container.innerHTML = '';
            return;
        }

        card.style.display = 'block';
        container.innerHTML = '';

        // Toggle custom editor view visibility
        if (tuningKey === 'custom') {
            if (customEditor) customEditor.style.display = 'block';
            this.buildCustomTuningEditor();
        } else {
            if (customEditor) customEditor.style.display = 'none';
        }

        const notes = this.instruments[instrument].tunings[tuningKey].notes;

        notes.forEach((note) => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-secondary';
            btn.style.padding = '8px 16px';
            btn.style.fontFamily = 'var(--font-mono)';
            btn.style.fontWeight = '600';
            btn.textContent = note;
            btn.addEventListener('click', () => this.toggleReferenceString(btn, note));
            container.appendChild(btn);
        });
    },

    buildCustomTuningEditor() {
        const inputsContainer = document.getElementById('tuner-custom-strings-inputs');
        const instrument = document.getElementById('tuner-instrument-select').value;
        
        if (!inputsContainer) return;
        inputsContainer.innerHTML = '';

        // Retrieve baseline tuning list (defaults to standard tuning setup of selected template)
        const currentCustomNotes = this.instruments[instrument].tunings.custom.notes;

        // Generate options range from C0 to B7 chromatic notes
        const allNotes = [];
        const baseNotes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        for (let octave = 0; octave <= 7; octave++) {
            baseNotes.forEach(note => {
                allNotes.push(`${note}${octave}`);
            });
        }

        currentCustomNotes.forEach((currentNote, index) => {
            const select = document.createElement('select');
            select.style.background = 'rgba(0, 0, 0, 0.05)';
            select.style.border = '1px solid var(--border-color)';
            select.style.borderRadius = '4px';
            select.style.color = 'var(--text-primary)';
            select.style.fontSize = '12px';
            select.style.padding = '6px';
            select.style.outline = 'none';
            select.style.cursor = 'pointer';

            allNotes.forEach(note => {
                const opt = document.createElement('option');
                opt.value = note;
                opt.textContent = note;
                if (note === currentNote) opt.selected = true;
                select.appendChild(opt);
            });

            select.addEventListener('change', () => {
                // Update target notes array
                this.instruments[instrument].tunings.custom.notes[index] = select.value;
                this.updateTunerStringsCard();
            });

            inputsContainer.appendChild(select);
        });
    },

    toggleReferenceString(btn, noteName) {
        if (this.isRefPlaying && this.activeRefString === noteName) {
            this.stopReferenceTone();
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-secondary');
        } else {
            const buttons = document.querySelectorAll('#tuner-strings-container button');
            buttons.forEach(b => {
                b.classList.remove('btn-primary');
                b.classList.add('btn-secondary');
            });

            const freq = this.frequencyFromNoteName(noteName);
            this.playReferenceTone(freq);
            this.activeRefString = noteName;
            
            btn.classList.remove('btn-secondary');
            btn.classList.add('btn-primary');
        }
    },

    playReferenceTone(frequency) {
        this.stopReferenceTone();
        const ctx = this.app.getAudioContext();
        
        this.refOscillator = ctx.createOscillator();
        this.refGain = ctx.createGain();

        this.refOscillator.type = 'sine';
        this.refOscillator.frequency.value = frequency;
        
        this.refGain.gain.setValueAtTime(0, ctx.currentTime);
        this.refGain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.05);

        this.refOscillator.connect(this.refGain);
        this.refGain.connect(ctx.destination);

        this.refOscillator.start();
        this.isRefPlaying = true;
        this.app.isSoundActive = true;
    },

    stopReferenceTone() {
        if (this.refOscillator) {
            try {
                this.refOscillator.stop();
                this.refOscillator.disconnect();
            } catch(e) {}
            this.refOscillator = null;
        }
        if (this.refGain) {
            this.refGain.disconnect();
            this.refGain = null;
        }
        this.isRefPlaying = false;
        this.activeRefString = null;
        if (!this.isPlaying) {
            this.app.isSoundActive = false;
        }

        const buttons = document.querySelectorAll('#tuner-strings-container button');
        buttons.forEach(b => {
            b.classList.remove('btn-primary');
            b.classList.add('btn-secondary');
        });
    },

    toggle() {
        const toggleBtn = document.getElementById('tuner-toggle');
        const statusLabel = document.getElementById('tuner-status');

        if (this.isPlaying) {
            this.stop();
            if (toggleBtn) {
                toggleBtn.textContent = 'Enable Tuner';
                toggleBtn.classList.remove('btn-danger');
                toggleBtn.classList.add('btn-primary');
            }
            if (statusLabel) statusLabel.textContent = 'Requires permission to listen to instrument pitches.';
        } else {
            this.start()
                .then(() => {
                    if (toggleBtn) {
                        toggleBtn.textContent = 'Disable Tuner';
                        toggleBtn.classList.remove('btn-primary');
                        toggleBtn.classList.add('btn-danger');
                    }
                    if (statusLabel) {
                        const sourceSelect = document.getElementById('tuner-source');
                        const source = sourceSelect ? sourceSelect.value : 'mic';
                        statusLabel.textContent = source === 'system' ? 'Listening to System Audio... Play audio on your computer.' : 'Listening... Play a note near your microphone.';
                    }
                })
                .catch((err) => {
                    console.error("Audio access error for tuner:", err);
                    if (statusLabel) statusLabel.textContent = 'Access Denied or No Audio Shared. Please try again.';
                });
        }
    },

    async start() {
        const sourceSelect = document.getElementById('tuner-source');
        const source = sourceSelect ? sourceSelect.value : 'mic';

        if (sourceSelect) {
            sourceSelect.disabled = true;
        }

        if (source === 'mic') {
            this.audioStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                },
                video: false
            });
        } else {
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    width: 1,
                    height: 1
                },
                audio: true
            });

            const audioTracks = displayStream.getAudioTracks();
            if (audioTracks.length === 0) {
                displayStream.getTracks().forEach(track => track.stop());
                throw new Error("No system audio shared in capture menu.");
            }

            displayStream.getVideoTracks().forEach(track => track.stop());
            this.audioStream = new MediaStream(audioTracks);
        }

        const ctx = this.app.getAudioContext();

        this.sourceNode = ctx.createMediaStreamSource(this.audioStream);
        this.sourceNode.connect(this.app.analyserNode);

        this.analyser = ctx.createAnalyser();
        this.analyser.fftSize = 2048;
        this.sourceNode.connect(this.analyser);

        this.isPlaying = true;
        this.app.isSoundActive = true;
        this.stopReferenceTone();

        const bufferLength = this.analyser.fftSize;
        const buffer = new Float32Array(bufferLength);

        this.pitchInterval = setInterval(() => {
            if (!this.isPlaying) return;

            this.analyser.getFloatTimeDomainData(buffer);
            const freq = this.autoCorrelate(buffer, ctx.sampleRate);

            const noteEl = document.getElementById('tuner-note');
            const centsEl = document.getElementById('tuner-cents');
            const directionEl = document.getElementById('tuner-direction');
            const needle = document.getElementById('tuner-needle');

            if (freq !== -1) {
                const instrument = document.getElementById('tuner-instrument-select').value;
                const tuningSelect = document.getElementById('tuner-tuning-select');
                const tuningKey = tuningSelect ? tuningSelect.value : 'standard';
                
                let targetNoteName = "";
                let targetFreq = 0;
                let cents = 0;

                if (instrument === 'chromatic') {
                    const noteNum = this.noteFromFrequency(freq);
                    targetNoteName = this.noteStrings[noteNum % 12];
                    targetFreq = this.frequencyFromNoteNumber(noteNum);
                    cents = this.getCents(freq, targetFreq);
                } else {
                    const notes = this.instruments[instrument].tunings[tuningKey].notes;
                    let closestDiff = Infinity;
                    
                    notes.forEach((noteName) => {
                        const noteFreq = this.frequencyFromNoteName(noteName);
                        const diff = Math.abs(freq - noteFreq);
                        if (diff < closestDiff) {
                            closestDiff = diff;
                            targetNoteName = noteName;
                            targetFreq = noteFreq;
                        }
                    });
                    
                    cents = this.getCents(freq, targetFreq);
                }

                if (noteEl) noteEl.textContent = targetNoteName;
                if (centsEl) centsEl.textContent = `${freq.toFixed(1)} Hz / Target: ${targetFreq.toFixed(1)} Hz`;

                if (needle) {
                    const rotateDegree = Math.max(Math.min(cents, 50), -50) * 0.9;
                    needle.style.transform = `translateX(-50%) rotate(${rotateDegree}deg)`;
                    
                    if (Math.abs(cents) <= 2) {
                        needle.style.background = 'var(--accent)';
                    } else {
                        needle.style.background = '#f87171';
                    }
                }

                if (directionEl) {
                    if (Math.abs(cents) <= 2) {
                        directionEl.textContent = "IN TUNE! 🎉";
                        directionEl.style.color = "var(--accent)";
                    } else if (cents > 2) {
                        directionEl.textContent = "TUNE DOWN ⬇️";
                        directionEl.style.color = "#f87171";
                    } else {
                        directionEl.textContent = "TUNE UP ⬆️";
                        directionEl.style.color = "#fbbf24";
                    }
                }

                if (instrument !== 'chromatic') {
                    const buttons = document.querySelectorAll('#tuner-strings-container button');
                    buttons.forEach(btn => {
                        if (btn.textContent === targetNoteName) {
                            btn.style.border = '2px solid var(--accent)';
                            btn.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.2)';
                        } else {
                            btn.style.border = '1px solid var(--border-color)';
                            btn.style.boxShadow = 'none';
                        }
                    });
                }

            } else {
                if (directionEl) {
                    directionEl.textContent = "Play a note...";
                    directionEl.style.color = "var(--text-secondary)";
                }
            }
        }, 80);
    },

    stop() {
        this.isPlaying = false;
        this.app.isSoundActive = false;
        clearInterval(this.pitchInterval);
        this.stopReferenceTone();

        const sourceSelect = document.getElementById('tuner-source');
        if (sourceSelect) {
            sourceSelect.disabled = false;
        }

        if (this.audioStream) {
            this.audioStream.getTracks().forEach(track => track.stop());
            this.audioStream = null;
        }

        if (this.sourceNode) {
            this.sourceNode.disconnect();
            this.sourceNode = null;
        }

        if (this.analyser) {
            this.analyser.disconnect();
            this.analyser = null;
        }

        const noteEl = document.getElementById('tuner-note');
        const centsEl = document.getElementById('tuner-cents');
        const directionEl = document.getElementById('tuner-direction');
        const needle = document.getElementById('tuner-needle');

        if (noteEl) noteEl.textContent = '--';
        if (centsEl) centsEl.textContent = '0.0 Hz';
        if (directionEl) directionEl.textContent = 'Microphone Off';
        if (needle) {
            needle.style.transform = 'translateX(-50%) rotate(0deg)';
            needle.style.background = 'var(--accent)';
        }

        const buttons = document.querySelectorAll('#tuner-strings-container button');
        buttons.forEach(btn => {
            btn.style.border = '1px solid var(--border-color)';
            btn.style.boxShadow = 'none';
        });
    },

    autoCorrelate(buffer, sampleRate) {
        let rms = 0;
        for (let i = 0; i < buffer.length; i++) {
            rms += buffer[i] * buffer[i];
        }
        rms = Math.sqrt(rms / buffer.length);
        if (rms < 0.008) return -1;

        let r1 = 0, r2 = buffer.length - 1;
        const threshold = 0.2;
        for (let i = 0; i < buffer.length / 2; i++) {
            if (Math.abs(buffer[i]) < threshold) { r1 = i; break; }
        }
        for (let i = buffer.length / 2; i < buffer.length; i++) {
            if (Math.abs(buffer[i]) < threshold) { r2 = i; break; }
        }

        const activeBuffer = buffer.slice(r1, r2);
        const correlations = new Float32Array(activeBuffer.length);

        for (let i = 0; i < activeBuffer.length; i++) {
            for (let j = 0; j < activeBuffer.length - i; j++) {
                correlations[i] += activeBuffer[j] * activeBuffer[j + i];
            }
        }

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

        if (T0 > 0 && T0 < activeBuffer.length - 1) {
            const x1 = correlations[T0 - 1];
            const x2 = correlations[T0];
            const x3 = correlations[T0 + 1];
            const a = (x1 + x3 - 2 * x2) / 2;
            const b = (x3 - x1) / 2;
            if (a) T0 = T0 - b / (2 * a);
        }

        return sampleRate / T0;
    },

    noteFromFrequency(frequency) {
        const noteNum = 12 * (Math.log(frequency / this.a4Frequency) / Math.log(2));
        return Math.round(noteNum) + 69;
    },

    frequencyFromNoteNumber(note) {
        return this.a4Frequency * Math.pow(2, (note - 69) / 12);
    },

    frequencyFromNoteName(noteName) {
        const match = noteName.match(/^([A-G]#?)(-?\d+)$/);
        if (!match) return 440;
        
        const note = match[1];
        const octave = parseInt(match[2]);
        const noteIndex = this.noteStrings.indexOf(note);
        
        const midiNum = noteIndex + (octave + 1) * 12;
        return this.frequencyFromNoteNumber(midiNum);
    },

    getCents(frequency, noteFrequency) {
        return 1200 * Math.log(frequency / noteFrequency) / Math.log(2);
    }
};
