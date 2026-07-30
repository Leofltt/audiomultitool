const fs = require('fs');
const path = require('path');

const mainHtmlPath = path.join(__dirname, 'index.html');
const mainHtml = fs.readFileSync(mainHtmlPath, 'utf8');

const tools = [
    {
        name: 'generator',
        title: 'Online Tone Generator & Oscillator',
        desc: 'Generate pure audio frequencies (sine, square, sawtooth, triangle waves) in your browser.'
    },
    {
        name: 'sweep',
        title: 'Speaker Frequency Sweep & Subwoofer Test',
        desc: 'Test your subwoofers and speaker frequency limits with clean logarithmic tone sweeps.'
    },
    {
        name: 'metronome',
        title: 'Online Metronome - BPM Tap Tempo & Rhythm Calculator',
        desc: 'A precision online metronome with custom subdivisions, bpm tap tempo calculator, and epoch-synced network audio sharing. 100% free and client-side.'
    },
    {
        name: 'tuner',
        title: 'Online Chromatic Instrument Tuner',
        desc: 'Free chromatic tuner using your microphone to tune guitars, violins, ukuleles, and more.'
    },
    {
        name: 'noise',
        title: 'Online Decibel Meter & Noise Generator',
        desc: 'Measure sound volume pressure levels with a dB meter and generate focus white, pink, or brownian noise.'
    },
    {
        name: 'converter',
        title: 'Online Audio Converter (MP3, WAV & More)',
        desc: 'Convert audio files to MP3 or WAV formats 100% client-side. No limits, no uploads, absolute privacy.'
    },
    {
        name: 'recorder',
        title: 'Easy Voice Recorder - Free Online Audio Recorder',
        desc: 'Use our easy voice recorder to capture microphone or system audio 100% client-side. Free online recorder with no file size limits and absolute privacy.'
    }
];

tools.forEach(tool => {
    let html = mainHtml;

    // 1. Create target directory
    const dir = path.join(__dirname, tool.name);
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }

    // 2. Adjust asset paths to point to parent folder
    html = html.replace('href="styles.css?v=1.1"', 'href="../styles.css?v=1.1"');
    html = html.replace('href="privacy.html"', 'href="../privacy.html"');
    html = html.replace('href="terms.html"', 'href="../terms.html"');
    html = html.replace('href="/"', 'href="../"');
    html = html.replace('src="app.js?v=1.1"', 'src="../app.js?v=1.1"');
    
    // Replace script tool sources
    html = html.replace(/src="tools\//g, 'src="../tools/');

    // 3. Set custom title and description
    html = html.replace(/<title>.*?<\/title>/, `<title>${tool.title} - Audiomultitool</title>`);
    html = html.replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${tool.desc}">`);
    html = html.replace(/<h2 id="active-tool-title">.*?<\/h2>/, `<h2 id="active-tool-title">${tool.title}</h2>`);
    html = html.replace(/<p id="active-tool-desc">.*?<\/p>/, `<p id="active-tool-desc">${tool.desc}</p>`);

    // 4. Update JSON-LD structured data title
    html = html.replace('"name": "Audiomultitool Web Audio Suite"', `"name": "${tool.title}"`);

    // 5. Update active nav button classes
    // Desktop: Remove active from generator, add active to target
    html = html.replace('class="nav-item active" data-tool="generator"', 'class="nav-item" data-tool="generator"');
    if (tool.name !== 'generator') {
        html = html.replace(`class="nav-item" data-tool="${tool.name}"`, `class="nav-item active" data-tool="${tool.name}"`);
    }
    
    // Mobile: Remove active from generator, add active to target
    html = html.replace('class="mobile-nav-item active" data-tool="generator"', 'class="mobile-nav-item" data-tool="generator"');
    if (tool.name !== 'generator') {
        html = html.replace(`class="mobile-nav-item" data-tool="${tool.name}"`, `class="mobile-nav-item active" data-tool="${tool.name}"`);
    }

    // 6. Update active tool-pane class
    // First, remove active from the default tone generator pane
    html = html.replace('id="pane-generator" class="tool-pane active"', 'id="pane-generator" class="tool-pane"');
    html = html.replace('class="tool-pane active" id="pane-generator"', 'class="tool-pane" id="pane-generator"');
    // Add active class to the current tool's pane
    html = html.replace(`id="pane-${tool.name}" class="tool-pane"`, `id="pane-${tool.name}" class="tool-pane active"`);
    html = html.replace(`class="tool-pane" id="pane-${tool.name}"`, `class="tool-pane active" id="pane-${tool.name}"`);

    // 7. Write index.html in the subdirectory
    const outputPath = path.join(dir, 'index.html');
    fs.writeFileSync(outputPath, html, 'utf8');
    console.log(`Generated: ${tool.name}/index.html`);
});

console.log('Static routing sub-pages built successfully.');
