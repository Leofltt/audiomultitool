// Client-Side Audio Converter Tool Component
window.ConverterTool = {
    app: null,
    selectedFile: null,
    isConverting: false,
    lameLoaded: false,

    init(appInstance) {
        this.app = appInstance;
        this.setupEventListeners();
    },

    setupEventListeners() {
        const dropzone = document.getElementById('converter-dropzone');
        const fileInput = document.getElementById('converter-file-input');
        const startBtn = document.getElementById('converter-start-btn');
        const formatSelect = document.getElementById('converter-format-select');

        if (!dropzone || !fileInput || !startBtn) return;

        // Drag and Drop Events
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.style.borderColor = 'var(--primary)';
            dropzone.style.background = 'rgba(59, 130, 246, 0.03)';
        });

        dropzone.addEventListener('dragleave', () => {
            dropzone.style.borderColor = 'var(--border-color)';
            dropzone.style.background = 'transparent';
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.style.borderColor = 'var(--border-color)';
            dropzone.style.background = 'transparent';
            
            if (e.dataTransfer.files.length > 0) {
                this.handleFileSelected(e.dataTransfer.files[0]);
            }
        });

        dropzone.addEventListener('click', (e) => {
            if (e.target !== fileInput && !e.target.classList.contains('btn')) {
                fileInput.click();
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelected(e.target.files[0]);
            }
        });

        // Trigger conversion
        startBtn.addEventListener('click', () => this.startConversion());

        // Toggle bitrate settings visibility based on output format
        if (formatSelect) {
            formatSelect.addEventListener('change', (e) => {
                const bitrateGroup = document.getElementById('converter-bitrate-group');
                if (bitrateGroup) {
                    bitrateGroup.style.display = e.target.value === 'mp3' ? 'block' : 'none';
                }
            });
        }
    },

    handleFileSelected(file) {
        if (!file.type.startsWith('audio/') && !file.name.endsWith('.m4a') && !file.name.endsWith('.ogg')) {
            alert('Please select a valid audio file.');
            return;
        }

        this.selectedFile = file;

        // Update UI
        document.getElementById('converter-file-name').textContent = `${file.name} (${this.formatBytes(file.size)})`;
        document.getElementById('converter-options-card').style.display = 'block';
        
        // Reset download links
        const downloadBtn = document.getElementById('converter-download-btn');
        downloadBtn.style.display = 'none';
        if (downloadBtn.href) {
            URL.revokeObjectURL(downloadBtn.href);
            downloadBtn.href = '';
        }
    },

    async startConversion() {
        if (this.isConverting || !this.selectedFile) return;

        const startBtn = document.getElementById('converter-start-btn');
        const statusContainer = document.getElementById('converter-status-container');
        const progressBar = document.getElementById('converter-progress-bar');
        const statusLabel = document.getElementById('converter-status-label');
        const downloadBtn = document.getElementById('converter-download-btn');
        const targetFormat = document.getElementById('converter-format-select').value;
        const bitrate = parseInt(document.getElementById('converter-bitrate-select').value);

        this.isConverting = true;
        startBtn.disabled = true;
        downloadBtn.style.display = 'none';
        statusContainer.style.display = 'flex';
        progressBar.style.width = '0%';
        statusLabel.textContent = 'Loading File...';

        try {
            // If output format is MP3, make sure Lamejs is loaded first
            if (targetFormat === 'mp3' && !this.lameLoaded) {
                statusLabel.textContent = 'Initializing Encoders...';
                await this.loadLamejs();
            }

            statusLabel.textContent = 'Reading...';
            const arrayBuffer = await this.readFileAsArrayBuffer(this.selectedFile);

            statusLabel.textContent = 'Decoding...';
            // Use browser offline / regular audio context to decode PCM
            const ctx = this.app.getAudioContext();
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

            statusLabel.textContent = 'Transcoding...';
            
            let outputBlob;
            if (targetFormat === 'wav') {
                outputBlob = this.encodeWav(audioBuffer);
            } else {
                outputBlob = await this.encodeMp3(audioBuffer, bitrate, (percent) => {
                    progressBar.style.width = `${percent}%`;
                    statusLabel.textContent = `Encoding: ${percent}%`;
                });
            }

            progressBar.style.width = '100%';
            statusLabel.textContent = 'Done!';

            // Generate Local Download Link
            const outputUrl = URL.createObjectURL(outputBlob);
            const inputBaseName = this.selectedFile.name.substring(0, this.selectedFile.name.lastIndexOf('.'));
            
            downloadBtn.href = outputUrl;
            downloadBtn.download = `${inputBaseName}.${targetFormat}`;
            downloadBtn.style.display = 'inline-block';
            downloadBtn.textContent = `Download converted.${targetFormat.toUpperCase()}`;

        } catch (err) {
            console.error('Conversion error:', err);
            statusLabel.textContent = 'Error!';
            alert('An error occurred during decoding/transcoding. Check if your browser supports this file format.');
        } finally {
            this.isConverting = false;
            startBtn.disabled = false;
        }
    },

    readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsArrayBuffer(file);
        });
    },

    loadLamejs() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/lamejs/1.2.1/lame.min.js';
            script.onload = () => {
                this.lameLoaded = true;
                resolve();
            };
            script.onerror = () => reject(new Error('Failed to load MP3 encoder library from CDN.'));
            document.body.appendChild(script);
        });
    },

    // 100% Client-Side Pure-JS Lossless WAV Encoder
    encodeWav(audioBuffer) {
        const numOfChan = audioBuffer.numberOfChannels;
        const sampleRate = audioBuffer.sampleRate;
        const format = 1; // 1 = raw 16-bit PCM integer
        const bitDepth = 16;
        
        let result;
        if (numOfChan === 2) {
            result = this.interleave(audioBuffer.getChannelData(0), audioBuffer.getChannelData(1));
        } else {
            result = audioBuffer.getChannelData(0);
        }
        
        const buffer = new ArrayBuffer(44 + result.length * 2);
        const view = new DataView(buffer);
        
        /* RIFF identifier */
        this.writeString(view, 0, 'RIFF');
        /* file length */
        view.setUint32(4, 36 + result.length * 2, true);
        /* RIFF type */
        this.writeString(view, 8, 'WAVE');
        /* format chunk identifier */
        this.writeString(view, 12, 'fmt ');
        /* format chunk length */
        view.setUint32(16, 16, true);
        /* sample format (raw PCM) */
        view.setUint16(20, format, true);
        /* channel count */
        view.setUint16(22, numOfChan, true);
        /* sample rate */
        view.setUint32(24, sampleRate, true);
        /* byte rate (sample rate * block align) */
        view.setUint32(28, sampleRate * numOfChan * (bitDepth / 8), true);
        /* block align (channel count * bytes per sample) */
        view.setUint16(32, numOfChan * (bitDepth / 8), true);
        /* bits per sample */
        view.setUint16(34, bitDepth, true);
        /* data chunk identifier */
        this.writeString(view, 36, 'data');
        /* chunk length */
        view.setUint32(40, result.length * 2, true);
        
        // Write PCM samples into dataview bounds
        this.floatTo16BitPCM(view, 44, result);
        
        return new Blob([view], { type: 'audio/wav' });
    },

    interleave(inputL, inputR) {
        const length = inputL.length + inputR.length;
        const result = new Float32Array(length);
        
        let index = 0;
        let inputIndex = 0;
        
        while (index < length) {
            result[index++] = inputL[inputIndex];
            result[index++] = inputR[inputIndex];
            inputIndex++;
        }
        return result;
    },

    floatTo16BitPCM(output, offset, input) {
        for (let i = 0; i < input.length; i++, offset += 2) {
            const s = Math.max(-1, Math.min(1, input[i]));
            output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
    },

    writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    },

    // 100% Client-side MP3 Encoder using lamejs
    encodeMp3(audioBuffer, bitrate, progressCallback) {
        return new Promise((resolve) => {
            const channels = audioBuffer.numberOfChannels;
            const sampleRate = audioBuffer.sampleRate;
            
            // Create MP3 encoder instance
            const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, bitrate);
            const mp3Data = [];
            
            const sampleBlockSize = 576; // LAME standard audio processing block size
            
            // Fetch PCM arrays
            const left = audioBuffer.getChannelData(0);
            const right = channels > 1 ? audioBuffer.getChannelData(1) : null;
            
            // Convert Float32 PCM to Int16 PCM arrays (lamejs expects Int16)
            const leftInt16 = new Int16Array(left.length);
            for (let i = 0; i < left.length; i++) {
                const s = Math.max(-1, Math.min(1, left[i]));
                leftInt16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }
            
            let rightInt16 = null;
            if (right) {
                rightInt16 = new Int16Array(right.length);
                for (let i = 0; i < right.length; i++) {
                    const s = Math.max(-1, Math.min(1, right[i]));
                    rightInt16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }
            }

            let index = 0;
            const totalSamples = leftInt16.length;

            const encodeChunk = () => {
                const remaining = totalSamples - index;
                if (remaining <= 0) {
                    // Flush encoder buffers
                    const mp3buf = mp3encoder.flush();
                    if (mp3buf.length > 0) {
                        mp3Data.push(mp3buf);
                    }
                    
                    const blob = new Blob(mp3Data, { type: 'audio/mp3' });
                    resolve(blob);
                    return;
                }

                // Slice a chunk of samples
                const size = Math.min(remaining, sampleBlockSize);
                const leftChunk = leftInt16.subarray(index, index + size);
                
                let mp3buf;
                if (rightInt16) {
                    const rightChunk = rightInt16.subarray(index, index + size);
                    mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
                } else {
                    mp3buf = mp3encoder.encodeBuffer(leftChunk);
                }

                if (mp3buf.length > 0) {
                    mp3Data.push(mp3buf);
                }

                index += size;
                
                // Fire progress updates
                const percent = Math.round((index / totalSamples) * 100);
                progressCallback(percent);

                // Use setTimeout to yield execution back to browser thread, keeping page responsive
                setTimeout(encodeChunk, 0);
            };

            encodeChunk();
        });
    },

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    stop() {
        // No active running timers or streams to dispose of for converter
    }
};
