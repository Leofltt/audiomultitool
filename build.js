const fs = require('fs');
const path = require('path');

const mainHtmlPath = path.join(__dirname, 'index.html');
const mainHtml = fs.readFileSync(mainHtmlPath, 'utf8');

const tools = [
    {
        name: 'generator',
        title: 'Online Tone Generator & Frequency Oscillator',
        desc: 'Generate pure audio frequencies (sine, square, sawtooth, triangle waves) in your browser.'
    },
    {
        name: 'sweep',
        title: 'Speaker Frequency Sweep Tester & Subwoofer Test',
        desc: 'Test your subwoofers and speaker frequency limits with clean logarithmic tone sweeps.'
    },
    {
        name: 'tapper',
        title: 'BPM Tapper & Tap Tempo Beats Calculator',
        desc: 'Tap along to any music or beat to calculate its tempo in Beats Per Minute (BPM).'
    },
    {
        name: 'tuner',
        title: 'Online Chromatic Instrument Tuner (Mic Input)',
        desc: 'Free chromatic tuner using your microphone to tune guitars, violins, ukuleles, and more.'
    },
    {
        name: 'recorder',
        title: 'Online Voice Recorder & System Sound Loopback Capture',
        desc: 'Record audio directly from your microphone or capture computer system audio fully client-side.'
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
    html = html.replace('href="styles.css"', 'href="../styles.css"');
    html = html.replace('href="privacy.html"', 'href="../privacy.html"');
    html = html.replace('href="terms.html"', 'href="../terms.html"');
    html = html.replace('href="/"', 'href="../"');
    html = html.replace('src="app.js"', 'src="../app.js"');
    
    // Replace script tool sources
    html = html.replace(/src="tools\//g, 'src="../tools/');

    // 3. Set custom title and description
    html = html.replace(/<title>.*?<\/title>/, `<title>${tool.title} - AudioMultiTool</title>`);
    html = html.replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${tool.desc}">`);

    // 4. Update JSON-LD structured data title
    html = html.replace('"name": "AudioMultiTool Web Audio Suite"', `"name": "${tool.title}"`);

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
