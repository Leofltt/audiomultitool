// Client-Side Audio Converter Tool Component
window.ConverterTool = {
    app: null,
    selectedFiles: [],
    isConverting: false,
    lameLoaded: false,

    init(appInstance) {
        this.app = appInstance;
        this.setupEventListeners();
    },

    setupEventListeners() {
        const dropzone = document.getElementById('converter-dropzone');
        const fileInput = document.getElementById('converter-file-input');
        const folderInput = document.getElementById('converter-folder-input');
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
                this.handleFilesSelected(Array.from(e.dataTransfer.files));
            }
        });

        dropzone.addEventListener('click', (e) => {
            if (e.target !== fileInput && e.target !== folderInput && !e.target.classList.contains('btn')) {
                fileInput.click();
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFilesSelected(Array.from(e.target.files));
            }
        });

        if (folderInput) {
            folderInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleFilesSelected(Array.from(e.target.files));
                }
            });
        }

        // Trigger conversion
        startBtn.addEventListener('click', () => this.startConversion());

        // Toggle Settings dropdown visibility based on format
        if (formatSelect) {
            formatSelect.addEventListener('change', (e) => {
                const format = e.target.value;
                const bitrateGroup = document.getElementById('converter-bitrate-group');
                const bitdepthGroup = document.getElementById('converter-bitdepth-group');
                
                if (format === 'wav') {
                    if (bitrateGroup) bitrateGroup.style.display = 'none';
                    if (bitdepthGroup) bitdepthGroup.style.display = 'block';
                } else {
                    if (bitrateGroup) bitrateGroup.style.display = 'block';
                    if (bitdepthGroup) bitdepthGroup.style.display = 'none';
                }
            });
        }
    },

    handleFilesSelected(files) {
        // Filter out non-audio files
        const audioFiles = files.filter(file => {
            const ext = file.name.split('.').pop().toLowerCase();
            return file.type.startsWith('audio/') || 
                   ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'webm', 'aac', 'aiff', 'aif'].includes(ext);
        });

        if (audioFiles.length === 0) {
            alert('Please select valid audio files.');
            return;
        }

        this.selectedFiles = audioFiles.map(file => ({
            file: file,
            status: 'pending',
            progress: 0,
            downloadUrl: '',
            blob: null
        }));

        // Update UI
        const countEl = document.getElementById('converter-files-count');
        if (countEl) countEl.textContent = this.selectedFiles.length;
        
        this.renderFileList();
        document.getElementById('converter-options-card').style.display = 'block';
        
        // Hide global download button since we have per-file downloads
        const downloadBtn = document.getElementById('converter-download-btn');
        if (downloadBtn) {
            downloadBtn.style.display = 'none';
            if (downloadBtn.href) {
                URL.revokeObjectURL(downloadBtn.href);
                downloadBtn.href = '';
            }
        }
    },

    renderFileList() {
        const fileListContainer = document.getElementById('converter-file-list');
        if (!fileListContainer) return;

        fileListContainer.innerHTML = '';
        this.selectedFiles.forEach((fileObj, index) => {
            const fileRow = document.createElement('div');
            fileRow.id = `file-row-${index}`;
            fileRow.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 10px; background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 6px;';

            fileRow.innerHTML = `
                <div style="flex: 1; min-width: 0; margin-right: 16px;">
                    <div style="font-weight: 500; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-primary);">${fileObj.file.name}</div>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">
                        <span id="file-size-${index}">${this.formatBytes(fileObj.file.size)}</span> • 
                        <span id="file-status-text-${index}" style="font-family: var(--font-mono); color: var(--text-secondary);">Pending</span>
                    </div>
                    <div id="file-progress-container-${index}" style="display: none; width: 100%; height: 4px; background: rgba(255,255,255,0.05); border-radius: 2px; overflow: hidden; margin-top: 6px;">
                        <div id="file-progress-bar-${index}" style="width: 0%; height: 100%; background: var(--primary); transition: width 0.15s;"></div>
                    </div>
                </div>
                <div id="file-action-${index}" style="display: flex; align-items: center; gap: 8px;"></div>
            `;
            fileListContainer.appendChild(fileRow);
        });
    },

    updateFileRowUI(index, statusText, progressPercent, downloadUrl = '', format = '') {
        const statusTextEl = document.getElementById(`file-status-text-${index}`);
        const progressContainer = document.getElementById(`file-progress-container-${index}`);
        const progressBar = document.getElementById(`file-progress-bar-${index}`);
        const actionEl = document.getElementById(`file-action-${index}`);

        if (statusTextEl) {
            statusTextEl.textContent = statusText;
            if (statusText.toLowerCase().includes('error')) {
                statusTextEl.style.color = 'var(--danger)';
            } else if (statusText.toLowerCase().includes('done') || statusText.toLowerCase().includes('success')) {
                statusTextEl.style.color = 'var(--accent)';
            } else {
                statusTextEl.style.color = 'var(--primary)';
            }
        }

        if (progressContainer && progressBar) {
            if (progressPercent > 0 && progressPercent < 100) {
                progressContainer.style.display = 'block';
                progressBar.style.width = `${progressPercent}%`;
            } else {
                progressContainer.style.display = 'none';
            }
        }

        if (actionEl) {
            if (downloadUrl) {
                actionEl.innerHTML = `
                    <a href="${downloadUrl}" download="${this.selectedFiles[index].file.name.substring(0, this.selectedFiles[index].file.name.lastIndexOf('.'))}.${format}" class="btn btn-secondary" style="font-size: 11px; padding: 4px 8px; line-height: 1.2; text-decoration: none; display: inline-block;">Download</a>
                `;
            } else if (progressPercent > 0 && progressPercent < 100) {
                actionEl.innerHTML = `<span style="font-size: 12px; font-family: var(--font-mono); color: var(--text-secondary);">${progressPercent}%</span>`;
            } else if (statusText === 'Reading...' || statusText === 'Decoding...' || statusText === 'Resampling...') {
                actionEl.innerHTML = `<span style="font-size: 12px; font-family: var(--font-mono); color: var(--text-secondary);">...</span>`;
            } else {
                actionEl.innerHTML = '';
            }
        }
    },

    async startConversion() {
        if (this.isConverting || !this.selectedFiles || this.selectedFiles.length === 0) return;

        const startBtn = document.getElementById('converter-start-btn');
        const folderBtn = document.getElementById('converter-folder-btn');
        const statusContainer = document.getElementById('converter-status-container');
        const progressBar = document.getElementById('converter-progress-bar');
        const statusLabel = document.getElementById('converter-status-label');
        
        const targetFormat = document.getElementById('converter-format-select').value;
        const bitrate = parseInt(document.getElementById('converter-bitrate-select').value);
        const bitDepth = parseInt(document.getElementById('converter-bitdepth-select').value);
        const sampleRateSelect = document.getElementById('converter-samplerate-select').value;
        const channelsSelect = document.getElementById('converter-channels-select').value;

        this.isConverting = true;
        startBtn.disabled = true;
        if (folderBtn) folderBtn.disabled = true;
        statusContainer.style.display = 'flex';
        progressBar.style.width = '0%';
        statusLabel.textContent = 'Initializing...';

        try {
            if (targetFormat === 'mp3' && !this.lameLoaded) {
                statusLabel.textContent = 'Loading MP3 Encoder Library...';
                await this.loadLamejs();
            }

            const total = this.selectedFiles.length;
            for (let i = 0; i < total; i++) {
                const fileObj = this.selectedFiles[i];
                if (fileObj.status === 'done' || fileObj.status === 'error') continue;

                statusLabel.textContent = `Converting ${i + 1} of ${total}`;
                progressBar.style.width = `${Math.round((i / total) * 100)}%`;

                fileObj.status = 'processing';
                this.updateFileRowUI(i, 'Reading...', 5);

                try {
                    // Read file
                    const arrayBuffer = await this.readFileAsArrayBuffer(fileObj.file);

                    // Decode file
                    this.updateFileRowUI(i, 'Decoding...', 20);
                    const ctx = this.app.getAudioContext();
                    const sourceBuffer = await ctx.decodeAudioData(arrayBuffer);

                    // Resample file
                    this.updateFileRowUI(i, 'Resampling...', 40);
                    let targetSampleRate = sourceBuffer.sampleRate;
                    if (sampleRateSelect !== 'source') {
                        targetSampleRate = parseInt(sampleRateSelect);
                    }

                    let targetChannels = sourceBuffer.numberOfChannels;
                    if (channelsSelect === 'stereo') {
                        targetChannels = 2;
                    } else if (channelsSelect === 'mono') {
                        targetChannels = 1;
                    }

                    // Perform offline context rendering
                    const offlineCtx = new OfflineAudioContext(targetChannels, sourceBuffer.duration * targetSampleRate, targetSampleRate);
                    const bufferSource = offlineCtx.createBufferSource();
                    bufferSource.buffer = sourceBuffer;
                    bufferSource.connect(offlineCtx.destination);
                    bufferSource.start(0);

                    const decodedBuffer = await offlineCtx.startRendering();

                    // Encode file
                    this.updateFileRowUI(i, 'Transcoding...', 60);
                    let outputBlob;

                    if (targetFormat === 'wav') {
                        outputBlob = this.encodeWav(decodedBuffer, bitDepth);
                    } else if (targetFormat === 'mp3') {
                        outputBlob = await this.encodeMp3(decodedBuffer, bitrate, (percent) => {
                            const prog = 60 + Math.round(percent * 0.38); // 60% to 98%
                            this.updateFileRowUI(i, `Encoding: ${percent}%`, prog);
                        });
                    } else if (targetFormat === 'ogg' || targetFormat === 'webm') {
                        outputBlob = await this.encodeViaMediaRecorder(decodedBuffer, targetFormat, bitrate, (percent) => {
                            const prog = 60 + Math.round(percent * 0.38);
                            this.updateFileRowUI(i, `Rendering: ${percent}%`, prog);
                        });
                    }

                    fileObj.status = 'done';
                    fileObj.blob = outputBlob;

                    const outputUrl = URL.createObjectURL(outputBlob);
                    fileObj.downloadUrl = outputUrl;

                    this.updateFileRowUI(i, 'Done!', 100, outputUrl, targetFormat);

                    // Trigger automatic browser download
                    const inputBaseName = fileObj.file.name.substring(0, fileObj.file.name.lastIndexOf('.'));
                    const a = document.createElement('a');
                    a.href = outputUrl;
                    a.download = `${inputBaseName}.${targetFormat}`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);

                } catch (err) {
                    console.error(`Error converting ${fileObj.file.name}:`, err);
                    fileObj.status = 'error';
                    this.updateFileRowUI(i, 'Error!', 0);
                }

                // Explicitly clear references to help garbage collection release uncompressed PCM buffers
                this.selectedFiles[i].decodedBuffer = null;
            }

            progressBar.style.width = '100%';
            statusLabel.textContent = 'Batch conversion completed!';

        } catch (err) {
            console.error('Batch conversion error:', err);
            statusLabel.textContent = 'Error!';
            alert('An error occurred during transcoding batch.');
        } finally {
            this.isConverting = false;
            startBtn.disabled = false;
            if (folderBtn) folderBtn.disabled = false;
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

    // Flexible WAV encoder supporting 8-bit, 16-bit, 24-bit, and 32-bit Float PCM formats
    encodeWav(audioBuffer, bitDepth) {
        const numOfChan = audioBuffer.numberOfChannels;
        const sampleRate = audioBuffer.sampleRate;
        const bytesPerSample = bitDepth / 8;
        
        let result;
        if (numOfChan === 2) {
            result = this.interleave(audioBuffer.getChannelData(0), audioBuffer.getChannelData(1));
        } else {
            result = audioBuffer.getChannelData(0);
        }
        
        const buffer = new ArrayBuffer(44 + result.length * bytesPerSample);
        const view = new DataView(buffer);
        
        // 1. RIFF Identifier
        this.writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + result.length * bytesPerSample, true);
        this.writeString(view, 8, 'WAVE');
        
        // 2. Format Chunk
        this.writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        
        // Sample format code (3 for Float, 1 for Integer PCM)
        const sampleFormat = bitDepth === 32 ? 3 : 1;
        view.setUint16(20, sampleFormat, true);
        view.setUint16(22, numOfChan, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numOfChan * bytesPerSample, true);
        view.setUint16(32, numOfChan * bytesPerSample, true);
        view.setUint16(34, bitDepth, true);
        
        // 3. Data Chunk
        this.writeString(view, 36, 'data');
        view.setUint32(40, result.length * bytesPerSample, true);
        
        // 4. Write audio data matching bit depths
        this.writePCMData(view, 44, result, bitDepth);
        
        return new Blob([view], { type: 'audio/wav' });
    },

    writePCMData(view, offset, input, bitDepth) {
        if (bitDepth === 8) {
            // 8-bit unsigned PCM
            for (let i = 0; i < input.length; i++, offset++) {
                const s = Math.max(-1, Math.min(1, input[i]));
                const unsignedVal = Math.round((s + 1) * 127.5);
                view.setUint8(offset, unsignedVal);
            }
        } else if (bitDepth === 16) {
            // 16-bit signed PCM
            for (let i = 0; i < input.length; i++, offset += 2) {
                const s = Math.max(-1, Math.min(1, input[i]));
                view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            }
        } else if (bitDepth === 24) {
            // 24-bit signed PCM
            for (let i = 0; i < input.length; i++, offset += 3) {
                const s = Math.max(-1, Math.min(1, input[i]));
                const pcmVal = Math.max(-8388608, Math.min(8388607, Math.round(s * 8388607)));
                view.setUint8(offset, pcmVal & 0xFF);
                view.setUint8(offset + 1, (pcmVal >> 8) & 0xFF);
                view.setUint8(offset + 2, (pcmVal >> 16) & 0xFF);
            }
        } else if (bitDepth === 32) {
            // 32-bit Float PCM
            for (let i = 0; i < input.length; i++, offset += 4) {
                view.setFloat32(offset, input[i], true);
            }
        }
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
            
            const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, bitrate);
            const mp3Data = [];
            const sampleBlockSize = 576;
            
            const left = audioBuffer.getChannelData(0);
            const right = channels > 1 ? audioBuffer.getChannelData(1) : null;
            
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
                    const mp3buf = mp3encoder.flush();
                    if (mp3buf.length > 0) {
                        mp3Data.push(mp3buf);
                    }
                    const blob = new Blob(mp3Data, { type: 'audio/mp3' });
                    resolve(blob);
                    return;
                }

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
                const percent = Math.round((index / totalSamples) * 100);
                progressCallback(percent);

                setTimeout(encodeChunk, 0);
            };

            encodeChunk();
        });
    },

    // High-speed real-time bounce recording for Ogg / WebM formats using browser MediaRecorder
    encodeViaMediaRecorder(audioBuffer, format, bitrate, progressCallback) {
        return new Promise((resolve, reject) => {
            const ctx = this.app.getAudioContext();
            
            // Setup source playback node
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;

            // Route to standard stream destination
            const dest = ctx.createMediaStreamDestination();
            source.connect(dest);

            const mimeType = format === 'ogg' ? 'audio/ogg' : 'audio/webm';
            
            let options = { audioBitsPerSecond: bitrate * 1000 };
            if (MediaRecorder.isTypeSupported(mimeType)) {
                options.mimeType = mimeType;
            } else if (format === 'ogg' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                // Fallback to WebM/Opus if Ogg is not natively supported
                options.mimeType = 'audio/webm;codecs=opus';
            }

            const mediaRecorder = new MediaRecorder(dest.stream, options);
            const chunks = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunks.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: mimeType });
                resolve(blob);
            };

            // Calculate progress updates based on playback intervals
            const duration = audioBuffer.duration;
            const startTime = Date.now();
            
            const timer = setInterval(() => {
                const elapsed = (Date.now() - startTime) / 1000;
                const percent = Math.round(Math.min((elapsed / duration) * 100, 99));
                progressCallback(percent);
                
                if (elapsed >= duration) {
                    clearInterval(timer);
                }
            }, 100);

            source.onended = () => {
                mediaRecorder.stop();
                clearInterval(timer);
            };

            mediaRecorder.start();
            source.start(0);
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
        // No active running state to clear
    }
};
