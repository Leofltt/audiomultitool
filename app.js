// Global Application State Controller
const App = {
    audioCtx: null,
    analyserNode: null,
    visualizerType: 'oscilloscope', // 'oscilloscope' or 'frequency'
    activeTool: 'generator',
    isSoundActive: false,
    canvas: null,
    canvasCtx: null,
    animationId: null,

    init() {
        this.canvas = document.getElementById('visualizer-canvas');
        this.canvasCtx = this.canvas.getContext('2d');
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        this.setupNavigation();
        this.setupVisualizerOptions();
        this.setupTheme();

        // Register Service Worker for PWA Offline support
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').catch(err => {
                    console.warn('ServiceWorker registration failed: ', err);
                });
            });
        }

        // Dynamically detect active tool from starting HTML state
        let activeNav = document.querySelector('.nav-item.active') || document.querySelector('.mobile-nav-item.active');
        if (activeNav) {
            this.activeTool = activeNav.dataset.tool;
            const titleEl = document.getElementById('active-tool-title');
            const descEl = document.getElementById('active-tool-desc');
            const descriptions = {
                generator: 'Generate pure audio frequencies with custom wave types.',
                sweep: 'Test speaker boundaries and room acoustics with frequency sweeps.',
                metronome: 'A precision metronome and manual tap tempo calculator.',
                tuner: 'Tune your guitar, violin, or other instruments via microphone pitch analysis.',
                noise: 'Calibrate monitors with a dB sound level meter and generate white, pink, or brownian noise.',
                converter: 'Convert audio files to MP3 or WAV format 100% client-side.',
                recorder: 'Online voice & system audio recorder.'
            };
            if (titleEl && descEl) {
                titleEl.textContent = activeNav.textContent.trim().replace(/^[^\s]+\s+/, '');
                descEl.textContent = descriptions[this.activeTool] || '';
            }
        }

        this.startVisualizer();

        // Initialize sub-tools
        if (window.GeneratorTool) window.GeneratorTool.init(this);
        if (window.SweepTool) window.SweepTool.init(this);
        if (window.MetronomeTool) window.MetronomeTool.init(this);
        if (window.TunerTool) window.TunerTool.init(this);
        if (window.NoiseTool) window.NoiseTool.init(this);
        if (window.ConverterTool) window.ConverterTool.init(this);
        if (window.RecorderTool) window.RecorderTool.init(this);

        // Initialize WebMCP tools
        this.initWebMcp();
    },

    initWebMcp() {
        if (typeof navigator !== 'undefined' && navigator.modelContext) {
            const controller = new AbortController();
            const signal = controller.signal;

            const tools = [
                {
                    name: "switch_tool",
                    description: "Navigate to one of the audio tools on the site: generator, sweep, metronome, tuner, noise, converter, recorder.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            toolName: {
                                type: "string",
                                enum: ["generator", "sweep", "metronome", "tuner", "noise", "converter", "recorder"]
                            }
                        },
                        required: ["toolName"]
                    },
                    execute: async (args) => {
                        if (typeof this.selectTool === 'function') {
                            this.selectTool(args.toolName);
                            return { success: true, message: `Switched to tool: ${args.toolName}` };
                        }
                        return { success: false, message: "App navigation not available" };
                    }
                },
                {
                    name: "get_active_tool",
                    description: "Retrieve the name of the currently active tool on the page.",
                    inputSchema: {
                        type: "object",
                        properties: {}
                    },
                    execute: async () => {
                        return { activeTool: this.activeTool };
                    }
                }
            ];

            // Attempt navigator.modelContext.registerTool
            if (typeof navigator.modelContext.registerTool === 'function') {
                for (const tool of tools) {
                    try {
                        navigator.modelContext.registerTool(tool.name, tool.description, tool.inputSchema, tool.execute, { signal });
                    } catch (e) {
                        console.warn("Failed to register tool:", tool.name, e);
                    }
                }
            }

            // Attempt navigator.modelContext.provideContext
            if (typeof navigator.modelContext.provideContext === 'function') {
                try {
                    navigator.modelContext.provideContext({
                        tools: tools
                    });
                } catch (e) {
                    console.warn("Failed to provideContext:", e);
                }
            }
        }
    },

    setupTheme() {
        const themeToggleBtn = document.getElementById('theme-toggle');
        if (!themeToggleBtn) return;
        
        const savedTheme = localStorage.getItem('theme');
        
        const setTheme = (isLight) => {
            if (isLight) {
                document.body.classList.add('light-theme');
                themeToggleBtn.querySelector('.theme-icon').textContent = '🌙';
                localStorage.setItem('theme', 'light');
            } else {
                document.body.classList.remove('light-theme');
                themeToggleBtn.querySelector('.theme-icon').textContent = '☀️';
                localStorage.setItem('theme', 'dark');
            }
        };

        // Initialize based on saved preference or system default
        const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
        setTheme(savedTheme === 'light' || (!savedTheme && prefersLight));

        themeToggleBtn.addEventListener('click', () => {
            const isCurrentlyLight = document.body.classList.contains('light-theme');
            setTheme(!isCurrentlyLight);
        });
    },

    // Safely retrieve or create global AudioContext on gesture
    getAudioContext() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            this.analyserNode = this.audioCtx.createAnalyser();
            this.analyserNode.fftSize = 2048;
            
            const statusEl = document.getElementById('audio-status');
            statusEl.innerHTML = '<span class="status-dot"></span> Engine Active';
            statusEl.style.background = 'rgba(16, 185, 129, 0.15)';
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
        return this.audioCtx;
    },

    resizeCanvas() {
        this.canvas.width = this.canvas.parentElement.clientWidth;
        this.canvas.height = this.canvas.parentElement.clientHeight;
    },

    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        const mobileNavItems = document.querySelectorAll('.mobile-nav-item');
        const panes = document.querySelectorAll('.tool-pane');
        const titleEl = document.getElementById('active-tool-title');
        const descEl = document.getElementById('active-tool-desc');
        const mobileMenu = document.getElementById('mobile-menu');
        const menuToggle = document.getElementById('menu-toggle');

        const descriptions = {
            generator: 'Generate pure audio frequencies with custom wave types.',
            sweep: 'Test speaker boundaries and room acoustics with frequency sweeps.',
            metronome: 'A precision metronome and manual tap tempo calculator.',
            tuner: 'Tune your guitar, violin, or other instruments via microphone pitch analysis.',
            noise: 'Calibrate monitors with a dB sound level meter.',
            converter: 'Convert audio files to MP3 or WAV format 100% client-side.',
            recorder: 'Online voice & system audio recorder.'
        };

        const selectTool = (targetTool, displayName) => {
            this.stopAllTools();

            // Clear active on all nav types
            navItems.forEach(nav => nav.classList.remove('active'));
            mobileNavItems.forEach(nav => nav.classList.remove('active'));
            panes.forEach(pane => pane.classList.remove('active'));

            // Set active on matching buttons and pane
            const desktopBtn = document.querySelector(`.nav-item[data-tool="${targetTool}"]`);
            const mobileBtn = document.querySelector(`.mobile-nav-item[data-tool="${targetTool}"]`);
            
            if (desktopBtn) desktopBtn.classList.add('active');
            if (mobileBtn) mobileBtn.classList.add('active');
            
            const targetPane = document.getElementById(`pane-${targetTool}`);
            if (targetPane) targetPane.classList.add('active');

            if (titleEl) titleEl.textContent = displayName;
            if (descEl) descEl.textContent = descriptions[targetTool] || '';
            this.activeTool = targetTool;

            // Close mobile menu drawer if open
            if (mobileMenu) mobileMenu.classList.remove('open');
        };

        // Desktop links
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const targetTool = item.dataset.tool;
                selectTool(targetTool, item.textContent.trim().replace(/^[^\s]+\s+/, ''));
            });
        });

        // Mobile links
        mobileNavItems.forEach(item => {
            item.addEventListener('click', () => {
                const targetTool = item.dataset.tool;
                selectTool(targetTool, item.textContent.trim().replace(/^[^\s]+\s+/, ''));
            });
        });

        // Menu Toggle Drawer
        if (menuToggle && mobileMenu) {
            menuToggle.addEventListener('click', () => {
                mobileMenu.classList.toggle('open');
            });
        }

        // Expose selectTool on App instance
        this.selectTool = (targetTool) => {
            const btn = document.querySelector(`.nav-item[data-tool="${targetTool}"]`) || 
                        document.querySelector(`.mobile-nav-item[data-tool="${targetTool}"]`);
            const name = btn ? btn.textContent.trim().replace(/^[^\s]+\s+/, '') : targetTool;
            selectTool(targetTool, name);
        };
    },

    setupVisualizerOptions() {
        const optButtons = document.querySelectorAll('.vis-opt-btn');
        optButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                optButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.visualizerType = btn.dataset.type;
            });
        });
    },

    stopAllTools() {
        if (window.GeneratorTool && typeof window.GeneratorTool.stop === 'function') {
            window.GeneratorTool.stop();
        }
        if (window.MetronomeTool && typeof window.MetronomeTool.stop === 'function') {
            window.MetronomeTool.stop();
        }
        if (window.SweepTool && typeof window.SweepTool.stop === 'function') {
            window.SweepTool.stop();
        }
        if (window.TunerTool && typeof window.TunerTool.stop === 'function') {
            window.TunerTool.stop();
        }
        if (window.NoiseTool && typeof window.NoiseTool.stop === 'function') {
            window.NoiseTool.stop();
        }
        if (window.ConverterTool && typeof window.ConverterTool.stop === 'function') {
            window.ConverterTool.stop();
        }
        if (window.RecorderTool && typeof window.RecorderTool.stop === 'function') {
            window.RecorderTool.stop();
        }
    },

    startVisualizer() {
        const bufferLength = 1024;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            this.animationId = requestAnimationFrame(draw);

            const width = this.canvas.width;
            const height = this.canvas.height;

            // Clear visualizer background with slight opacity for motion trails
            this.canvasCtx.fillStyle = 'rgba(11, 15, 25, 0.25)';
            this.canvasCtx.fillRect(0, 0, width, height);

            if (!this.analyserNode || !this.isSoundActive) {
                // Draw idling sine wave placeholder when no sound is active
                this.canvasCtx.lineWidth = 2;
                this.canvasCtx.strokeStyle = 'rgba(79, 70, 229, 0.15)';
                this.canvasCtx.beginPath();
                
                const sliceWidth = width / bufferLength;
                let x = 0;

                for (let i = 0; i < bufferLength; i++) {
                    const v = 0.5 + Math.sin(i * 0.03 + Date.now() * 0.005) * 0.1;
                    const y = v * height;

                    if (i === 0) {
                        this.canvasCtx.moveTo(x, y);
                    } else {
                        this.canvasCtx.lineTo(x, y);
                    }

                    x += sliceWidth;
                }
                this.canvasCtx.stroke();
                return;
            }

            if (this.visualizerType === 'oscilloscope') {
                this.analyserNode.getByteTimeDomainData(dataArray);

                this.canvasCtx.lineWidth = 2;
                
                // Create glowing gradient line
                const gradient = this.canvasCtx.createLinearGradient(0, 0, width, 0);
                gradient.addColorStop(0, '#4F46E5');
                gradient.addColorStop(0.5, '#10B981');
                gradient.addColorStop(1, '#6366F1');
                
                this.canvasCtx.strokeStyle = gradient;
                this.canvasCtx.beginPath();

                const sliceWidth = width * 1.0 / bufferLength;
                let x = 0;

                for (let i = 0; i < bufferLength; i++) {
                    const v = dataArray[i] / 128.0;
                    const y = v * height / 2;

                    if (i === 0) {
                        this.canvasCtx.moveTo(x, y);
                    } else {
                        this.canvasCtx.lineTo(x, y);
                    }

                    x += sliceWidth;
                }

                this.canvasCtx.lineTo(width, height / 2);
                this.canvasCtx.stroke();
            } else {
                this.analyserNode.getByteFrequencyData(dataArray);

                const barWidth = (width / bufferLength) * 2.5;
                let barHeight;
                let x = 0;

                for (let i = 0; i < bufferLength; i++) {
                    barHeight = dataArray[i] / 2;

                    // Neon bar color gradient
                    this.canvasCtx.fillStyle = `rgb(${barHeight + 100}, 70, 229)`;
                    this.canvasCtx.fillRect(x, height - barHeight, barWidth - 1, barHeight);

                    x += barWidth;
                }
            }
        };

        draw();
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
} else {
    App.init();
}
window.AudioApp = App; // Expose globally
