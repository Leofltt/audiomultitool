// Global Application State Controller
const App = {
    audioCtx: null,
    analyserNode: null,
    visualizerType: 'oscilloscope', // 'oscilloscope' or 'frequency'
    activeTool: 'generator',
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

        // Dynamically detect active tool from starting HTML state
        const activeNav = document.querySelector('.nav-item.active');
        if (activeNav) {
            this.activeTool = activeNav.dataset.tool;
            const titleEl = document.getElementById('active-tool-title');
            const descEl = document.getElementById('active-tool-desc');
            const descriptions = {
                generator: 'Generate pure audio frequencies with custom wave types.',
                sweep: 'Test speaker boundaries and room acoustics with frequency sweeps.',
                tapper: 'Tap tempo calculator to find the beats per minute of any song.',
                tuner: 'Tune your guitar, violin, or other instruments via microphone pitch analysis.',
                recorder: 'Online voice & system audio recorder.'
            };
            if (titleEl && descEl) {
                titleEl.textContent = activeNav.textContent.trim();
                descEl.textContent = descriptions[this.activeTool] || '';
            }
        }

        this.startVisualizer();

        // Initialize sub-tools
        if (window.GeneratorTool) window.GeneratorTool.init(this);
        if (window.SweepTool) window.SweepTool.init(this);
        if (window.TapperTool) window.TapperTool.init(this);
        if (window.TunerTool) window.TunerTool.init(this);
        if (window.RecorderTool) window.RecorderTool.init(this);
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
            this.analyserNode.connect(this.audioCtx.destination);
            
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
            tapper: 'Tap tempo calculator to find the beats per minute of any song.',
            tuner: 'Tune your guitar, violin, or other instruments via microphone pitch analysis.',
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
        if (window.SweepTool && typeof window.SweepTool.stop === 'function') {
            window.SweepTool.stop();
        }
        if (window.TunerTool && typeof window.TunerTool.stop === 'function') {
            window.TunerTool.stop();
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

            if (!this.analyserNode) {
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
