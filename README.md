# AudioMultiTool 

A high-performance, 100% client-side suite of web audio utilities. Built using the native Web Audio API and modern browser standards. 

👉 **Live Site:** [audiomultitool.com](https://audiomultitool.com)

---

## Features

### 🎯 Chromatic Instrument Tuner
*   **Low-latency Pitch Tracking:** Uses a time-domain auto-correlation algorithm to isolate and calculate fundamental frequencies from microphone input.
*   **Custom Tuning Configurations:** Add or remove strings (supporting setups up to 12 strings), customize target Hz frequencies, and build presets for custom drop or open tunings.
*   **Instrument Presets:** Instant configuration templates for Guitar (6-string), Bass, Ukulele, and Violin.

### ⏱️ Synced Precision Metronome
*   **Sample-Accurate Audio Scheduling:** Built using a low-latency Web Audio API lookahead scheduler (buffering audio nodes 100ms in advance) to prevent browser thread lag.
*   **Tempo Sync Sharing:** Includes a serverless synchronization engine that aligns initial click events with the absolute Unix Epoch timeline. Two users opening the same shared link will click in perfect unison over the network without requiring WebSockets or signaling servers.
*   **Customization:** Supports subdivisions (1x, 2x, 3x, 4x), multiple time signatures, acoustic rimshot/digital beep/woodblock sounds, and downbeat accents. Includes a built-in tap tempo calculator.

### 🔊 Signal & Noise Generator
*   **Frequencies:** Generate pure frequencies from 20 Hz to 20 kHz.
*   **Exponential Control:** Slide controls scale logarithmically/exponentially to allow precise micro-frequency tuning at lower registers.
*   **Waveforms:** Sine, Square, Sawtooth, and Triangle shapes.
*   **Noise Calibration:** Generate White, Pink, and Brownian noise profiles for speaker testing and sound calibration.

### 📈 Speaker Frequency Sweep
*   Test acoustic room boundaries and speaker crossover ranges with custom start/end sweep frequencies and linear or logarithmic sweep curves.

### 🔄 Audio Converter & Recorder
*   **Audio Converter:** Convert audio files between formats client-side.
*   **Audio Recorder:** Clean voice and system audio recorder outputting standard WAV/MP3 files locally.

---

## Technical Stack

*   **HTML5 & CSS3:** Responsive layouts, sleek custom dark/light styling, and CSS transitions.
*   **Compositor-Bound Animations:** Beat indicators run on CSS keyframe animations triggered by Web Audio clock comparisons to ensure smooth, frame-drop-immune visual flashing.
*   **Vanilla JS (No frameworks):** Direct DOM manipulation and native Web Audio API (`AudioContext`, `OscillatorNode`, `GainNode`, `AnalyserNode`).
*   **Build Compiler:** A simple node compilation script (`build.js`) generates SEO-optimized, static nested routing directories (`/tuner/`, `/metronome/`, etc.) from the root template for fast static hosting.

---

## Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/audiomultitool.git
   cd audiomultitool
   ```

2. **Serve locally:**
   Since the app runs entirely client-side, you can host the files using any static HTTP server. For example, using Python or Node:
   ```bash
   # Python 3
   python3 -m http.server 8000
   
   # Node (http-server)
   npx http-server -p 8000
   ```
   Open `http://localhost:8000` in your browser.

3. **Build subdirectories (Routing):**
   If you modify the core template in `index.html`, run the build compiler to regenerate the route index files:
   ```bash
   node build.js
   ```

---

## License

This project is open-source and licensed under the [MIT License](LICENSE).
