const fs = require('fs');
const path = require('path');

function findClosingDivIndex(html, startIndex) {
    const divStart = html.indexOf('<div', startIndex);
    if (divStart === -1) return -1;
    
    let depth = 1;
    let pos = divStart + 4;
    
    while (depth > 0 && pos < html.length) {
        const nextOpen = html.indexOf('<div', pos);
        const nextClose = html.indexOf('</div>', pos);
        
        if (nextClose === -1) {
            return -1; // malformed HTML
        }
        
        if (nextOpen !== -1 && nextOpen < nextClose) {
            depth++;
            pos = nextOpen + 4;
        } else {
            depth--;
            pos = nextClose + 6;
            if (depth === 0) {
                return nextClose;
            }
        }
    }
    return -1;
}

// Load all presets from src/data/seo/
const seoDataDir = path.join(__dirname, 'src', 'data', 'seo');
let presets = [];
if (fs.existsSync(seoDataDir)) {
    const files = fs.readdirSync(seoDataDir);
    files.forEach(file => {
        if (file.endsWith('.json')) {
            const filePath = path.join(seoDataDir, file);
            const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            if (Array.isArray(content)) {
                presets = presets.concat(content);
            }
        }
    });
}

const mainHtmlPath = path.join(__dirname, 'index.html');
const mainHtml = fs.readFileSync(mainHtmlPath, 'utf8');

const tools = [
    {
        name: 'generator',
        title: 'Online Signal & Sweep Generator',
        desc: 'Generate pure audio tones, run speaker frequency sweeps, or play Shepard\'s tones and focus noise colors.'
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
        name: 'db-meter',
        title: 'Online Decibel & Sound Level Meter',
        desc: 'Measure ambient sound volume pressure levels with a real-time dBA and dBC weighted decibel meter.'
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
    html = html.replace('src="app.js?v=1.1"', 'src="../app.js?v=1.1"');
    html = html.replace('href="favicon.png"', 'href="../favicon.png"');
    html = html.replace('href="manifest.json"', 'href="../manifest.json"');
    
    // Replace script tool sources
    html = html.replace(/src="tools\//g, 'src="../tools/');

    // 3. Set custom title and description
    html = html.replace(/<title>.*?<\/title>/, `<title>${tool.title} - Audiomultitool</title>`);
    html = html.replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${tool.desc}">`);
    
    // Set canonical link
    const canonicalUrl = `https://audiomultitool.com/${tool.name}/`;
    const headExtra = `    <link rel="canonical" href="${canonicalUrl}">`;
    html = html.replace('</head>', `${headExtra}\n</head>`);

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

    // Generate linking grid for internal presets
    const toolPaneMarker = `id="pane-${tool.name}"`;
    const toolPaneIndex = html.indexOf(toolPaneMarker);
    if (toolPaneIndex !== -1) {
        const startMarker = '<!-- Valuable Content SEO Section -->';
        const startIndex = html.indexOf(startMarker, toolPaneIndex);
        if (startIndex !== -1) {
            const endIndex = findClosingDivIndex(html, startIndex + startMarker.length);
            if (endIndex !== -1) {
                const totalLength = (endIndex + 6) - startIndex;
                const defaultSeoSection = html.substr(startIndex, totalLength);

                const toolPresets = presets.filter(p => p.tool === tool.name);
                if (toolPresets.length > 0) {
                    const linksHtml = toolPresets.map(p => {
                        const linkLabel = p.title.split('–')[0].trim().replace('Online', '').trim();
                        return `<a href="${p.slug}/" style="color: var(--primary); text-decoration: none; font-weight: 500; transition: opacity 0.15s;" onmouseover="this.style.opacity=0.8" onmouseout="this.style.opacity=1">${linkLabel}</a>`;
                    }).join(' <span style="color: var(--border-color);">|</span> ');

                    const headingsMap = {
                        generator: 'Popular signals & sweeps:',
                        metronome: 'Popular tempos & practice presets:',
                        tuner: 'Instrument tuning configurations:',
                        'db-meter': 'Sound level meter settings:',
                        converter: 'Audio conversion formats:',
                        recorder: 'Recording presets:'
                    };
                    const linkingHeading = headingsMap[tool.name] || 'Presets:';

                    const linkingGridHtml = `
                    <!-- Internal Linking Grid -->
                    <div class="linking-grid-section" style="border-top: 1px solid var(--border-color); padding-top: 20px; margin-top: 20px; font-size: 13px; color: var(--text-secondary);">
                        <h4 style="font-size: 13px; color: var(--text-primary); margin-bottom: 8px;">${linkingHeading}</h4>
                        <div style="display: flex; flex-wrap: wrap; gap: 8px 16px;">
                            ${linksHtml}
                        </div>
                    </div>`;

                    // Insert right before the closing </div> of defaultSeoSection
                    const updatedSeoSection = defaultSeoSection.slice(0, defaultSeoSection.length - 6) + linkingGridHtml + '\n                    </div>';
                    html = html.replace(defaultSeoSection, updatedSeoSection);
                }
            }
        }
    }

    // 7. Inject dataset attribute to body to signal to client script to NOT overwrite text
    html = html.replace('<body', '<body data-seo-page="true"');

    // 8. Write index.html in the subdirectory
    const outputPath = path.join(dir, 'index.html');
    fs.writeFileSync(outputPath, html, 'utf8');
    console.log(`Generated: ${tool.name}/index.html`);
});

console.log('Static routing sub-pages built successfully.');

// Run programmatic SEO pages build script
require('./build-seo-pages.js');
