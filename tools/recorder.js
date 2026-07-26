// Audio Recorder Tool Component
window.RecorderTool = {
    app: null,
    mediaRecorder: null,
    audioChunks: [],
    recordingStream: null,
    sourceNode: null,
    isRecording: false,
    startTime: 0,
    timerInterval: null,

    init(appInstance) {
        this.app = appInstance;
        this.setupEventListeners();
    },

    setupEventListeners() {
        const toggleBtn = document.getElementById('recorder-toggle');
        toggleBtn.addEventListener('click', () => this.toggle());
    },

    toggle() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            this.startRecording();
        }
    },

    async startRecording() {
        const source = document.getElementById('recorder-source').value;
        const toggleBtn = document.getElementById('recorder-toggle');
        const badge = document.getElementById('recorder-badge');
        const previewCard = document.getElementById('recorder-preview-card');

        // Hide previous recordings during new sessions
        previewCard.style.display = 'none';

        try {
            if (source === 'mic') {
                // Request standard mic stream
                this.recordingStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: false
                    },
                    video: false
                });
            } else {
                // Request display stream for system audio capture
                // Note: User MUST check "Share audio" or "System audio" in the popup menu.
                const displayStream = await navigator.mediaDevices.getDisplayMedia({
                    video: {
                        width: 1,
                        height: 1
                    },
                    audio: true
                });

                // Extract only audio tracks and discard the video portion
                const audioTracks = displayStream.getAudioTracks();
                if (audioTracks.length === 0) {
                    // Close video track immediately if no audio was shared
                    displayStream.getTracks().forEach(track => track.stop());
                    throw new Error("No system audio shared in capture menu.");
                }

                // Stop video tracks immediately since we only want system audio loopback
                displayStream.getVideoTracks().forEach(track => track.stop());
                
                this.recordingStream = new MediaStream(audioTracks);
            }

            // Route recording input stream into our visualizer AnalyserNode
            const ctx = this.app.getAudioContext();
            this.sourceNode = ctx.createMediaStreamSource(this.recordingStream);
            this.sourceNode.connect(this.app.analyserNode);

            // Initialize MediaRecorder
            this.audioChunks = [];
            this.mediaRecorder = new MediaRecorder(this.recordingStream);

            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    this.audioChunks.push(e.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                this.saveRecording();
            };

            // Start recording chunks
            this.mediaRecorder.start(10);
            this.isRecording = true;
            this.startTime = Date.now();

            // Toggle Button Styles
            toggleBtn.textContent = 'Stop Recording';
            toggleBtn.classList.remove('btn-primary');
            toggleBtn.classList.add('btn-danger');
            
            // Badge Styles
            badge.textContent = 'Recording';
            badge.style.background = 'rgba(239, 68, 68, 0.2)';
            badge.style.color = 'var(--danger)';

            // Timer update
            this.timerInterval = setInterval(() => {
                const elapsedMs = Date.now() - this.startTime;
                const totalSeconds = Math.floor(elapsedMs / 1000);
                const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
                const seconds = String(totalSeconds % 60).padStart(2, '0');
                document.getElementById('recorder-timer').textContent = `${minutes}:${seconds}`;
            }, 500);

        } catch (err) {
            console.error("Recording acquisition failed: ", err);
            alert("Could not access audio stream. Make sure to grant permission, and if recording computer audio, check the 'Share audio' option inside browser display popup.");
            this.resetUI();
        }
    },

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
        }
        this.cleanupStream();
        this.isRecording = false;
        this.resetUI();
    },

    stop() {
        // Safe check called by App when shifting tabs
        this.stopRecording();
    },

    cleanupStream() {
        clearInterval(this.timerInterval);
        if (this.recordingStream) {
            this.recordingStream.getTracks().forEach(track => track.stop());
            this.recordingStream = null;
        }
        if (this.sourceNode) {
            this.sourceNode.disconnect();
            this.sourceNode = null;
        }
    },

    resetUI() {
        const toggleBtn = document.getElementById('recorder-toggle');
        const badge = document.getElementById('recorder-badge');
        
        if (toggleBtn) {
            toggleBtn.textContent = 'Start Recording';
            toggleBtn.classList.remove('btn-danger');
            toggleBtn.classList.add('btn-primary');
        }
        if (badge) {
            badge.textContent = 'Idle';
            badge.style.background = 'rgba(255,255,255,0.05)';
            badge.style.color = 'var(--text-primary)';
        }
        document.getElementById('recorder-timer').textContent = '00:00';
    },

    saveRecording() {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);

        // Update preview player
        const previewPlayer = document.getElementById('recorder-audio-preview');
        const downloadBtn = document.getElementById('recorder-download-btn');
        const previewCard = document.getElementById('recorder-preview-card');

        previewPlayer.src = audioUrl;
        
        // Setup download button attributes
        downloadBtn.href = audioUrl;
        
        // Generate automatic timestamp filename
        const dateStr = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
        downloadBtn.download = `soniclab-record-${dateStr}.webm`;

        // Render preview pane
        previewCard.style.display = 'block';
    }
};
