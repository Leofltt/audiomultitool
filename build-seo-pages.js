const fs = require('fs');
const path = require('path');

function getTodayDate() {
    const today = new Date();
    const yyyy = today.getFullYear();
    let mm = today.getMonth() + 1;
    let dd = today.getDate();
    if (mm < 10) mm = '0' + mm;
    if (dd < 10) dd = '0' + dd;
    return `${yyyy}-${mm}-${dd}`;
}

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

const mainHtmlPath = path.join(__dirname, 'index.html');
if (!fs.existsSync(mainHtmlPath)) {
    console.error('Error: index.html not found in root.');
    process.exit(1);
}
const mainHtml = fs.readFileSync(mainHtmlPath, 'utf8');

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
} else {
    console.error('Error: src/data/seo directory not found.');
    process.exit(1);
}

console.log(`Loaded ${presets.length} programmatic SEO presets.`);

function generateDynamicCalculations(preset) {
    if (preset.tool === 'metronome') {
        const bpm = parseInt(preset.initialConfig.bpm || preset.slug.match(/\d+/)?.[0] || '120');
        const clicksPerSec = (bpm / 60).toFixed(2);
        const intervalMs = (60000 / bpm).toFixed(2);
        
        let genreContext = '';
        if (bpm >= 120 && bpm <= 130) {
            genreContext = ' This tempo range is the global standard for <strong>House, Techno, and Dance Music</strong>, providing a driving dancefloor groove.';
        } else if (bpm >= 60 && bpm <= 80) {
            genreContext = ' This slower pace is perfect for practice sessions, ballads, slow rock, and developing deep rhythmic control.';
        } else if (bpm >= 80 && bpm <= 100) {
            genreContext = ' This mid-tempo range represents the classic rhythm pocket for <strong>Hip-Hop, Rap, and Funk</strong>.';
        } else if (bpm > 130 && bpm <= 150) {
            genreContext = ' This energetic tempo is widely used in Trance, Dubstep, and modern Pop build-ups.';
        } else if (bpm > 150) {
            genreContext = ' This high-speed tempo matches the frantic pace of <strong>Drum and Bass (DnB), Jungle, and Punk/Metal</strong>.';
        }

        return `
        <h4 style="font-size: 13px; color: var(--text-primary); margin-top: 20px; margin-bottom: 8px;">Rhythmic Mathematics for ${bpm} BPM</h4>
        <p style="margin-bottom: 12px;">Practicing at <strong>${bpm} BPM</strong> (Beats Per Minute) means the metronome engine schedules a sound trigger exactly every <strong>${intervalMs} milliseconds</strong>, translating to exactly <strong>${clicksPerSec} clicks per second</strong>.${genreContext}</p>
        `;
    }

    if (preset.tool === 'tuner') {
        let stringData = '';
        if (preset.slug.includes('guitar-tuner') || preset.slug.includes('drop-d')) {
            const isDropD = preset.slug.includes('drop-d');
            stringData = `
            <ul style="margin-left: 18px; margin-bottom: 16px; list-style-type: disc;">
                <li><strong>String 6 (Low ${isDropD ? 'D' : 'E'}):</strong> ${isDropD ? 'D2 (73.42 Hz)' : 'E2 (82.41 Hz)'}</li>
                <li><strong>String 5 (A):</strong> A2 (110.00 Hz)</li>
                <li><strong>String 4 (D):</strong> D3 (146.83 Hz)</li>
                <li><strong>String 3 (G):</strong> G3 (196.00 Hz)</li>
                <li><strong>String 2 (B):</strong> B3 (246.94 Hz)</li>
                <li><strong>String 1 (High E):</strong> E4 (329.63 Hz)</li>
            </ul>`;
        } else if (preset.slug.includes('7-string')) {
            const isDropA = preset.slug.includes('drop-a');
            stringData = `
            <ul style="margin-left: 18px; margin-bottom: 16px; list-style-type: disc;">
                <li><strong>String 7 (Low ${isDropA ? 'A' : 'B'}):</strong> ${isDropA ? 'A1 (55.00 Hz)' : 'B1 (61.74 Hz)'}</li>
                <li><strong>String 6 (Low E):</strong> E2 (82.41 Hz)</li>
                <li><strong>String 5 (A):</strong> A2 (110.00 Hz)</li>
                <li><strong>String 4 (D):</strong> D3 (146.83 Hz)</li>
                <li><strong>String 3 (G):</strong> G3 (196.00 Hz)</li>
                <li><strong>String 2 (B):</strong> B3 (246.94 Hz)</li>
                <li><strong>String 1 (High E):</strong> E4 (329.63 Hz)</li>
            </ul>`;
        } else if (preset.slug.includes('8-string')) {
            const isDropE = preset.slug.includes('drop-e');
            stringData = `
            <ul style="margin-left: 18px; margin-bottom: 16px; list-style-type: disc;">
                <li><strong>String 8 (Low ${isDropE ? 'E' : 'F#'}):</strong> ${isDropE ? 'E1 (41.20 Hz)' : 'F#1 (46.25 Hz)'}</li>
                <li><strong>String 7 (Low B):</strong> B1 (61.74 Hz)</li>
                <li><strong>String 6 (Low E):</strong> E2 (82.41 Hz)</li>
                <li><strong>String 5 (A):</strong> A2 (110.00 Hz)</li>
                <li><strong>String 4 (D):</strong> D3 (146.83 Hz)</li>
                <li><strong>String 3 (G):</strong> G3 (196.00 Hz)</li>
                <li><strong>String 2 (B):</strong> B3 (246.94 Hz)</li>
                <li><strong>String 1 (High E):</strong> E4 (329.63 Hz)</li>
            </ul>`;
        } else if (preset.slug.includes('ukulele')) {
            stringData = `
            <ul style="margin-left: 18px; margin-bottom: 16px; list-style-type: disc;">
                <li><strong>String 4 (G):</strong> G4 (392.00 Hz)</li>
                <li><strong>String 3 (C):</strong> C4 (261.63 Hz)</li>
                <li><strong>String 2 (E):</strong> E4 (329.63 Hz)</li>
                <li><strong>String 1 (A):</strong> A4 (440.00 Hz)</li>
            </ul>`;
        } else if (preset.slug.includes('violin')) {
            stringData = `
            <ul style="margin-left: 18px; margin-bottom: 16px; list-style-type: disc;">
                <li><strong>String 4 (G):</strong> G3 (196.00 Hz)</li>
                <li><strong>String 3 (D):</strong> D4 (293.66 Hz)</li>
                <li><strong>String 2 (A):</strong> A4 (440.00 Hz)</li>
                <li><strong>String 1 (E):</strong> E5 (659.25 Hz)</li>
            </ul>`;
        }

        if (stringData) {
            return `
            <h4 style="font-size: 13px; color: var(--text-primary); margin-top: 20px; margin-bottom: 8px;">Target Frequencies for ${preset.title.split('–')[0].trim()}</h4>
            <p style="margin-bottom: 12px;">Tune your strings to the following exact frequencies:</p>
            ${stringData}
            `;
        }
    }

    if (preset.tool === 'generator') {
        if (preset.initialConfig.mode === 'tone') {
            const freq = parseFloat(preset.initialConfig.freq || '440');
            const period = (1000 / freq).toFixed(2);
            const wavelengthCm = (34300 / freq).toFixed(2);
            return `
            <h4 style="font-size: 13px; color: var(--text-primary); margin-top: 20px; margin-bottom: 8px;">Physical Properties of the ${freq} Hz Tone</h4>
            <p style="margin-bottom: 12px;">At a frequency of <strong>${freq} Hz</strong>, the synthesized sound wave completes one full compression-rarefaction cycle every <strong>${period} milliseconds</strong>. Travelling through standard room-temperature air (343 m/s), the physical size of this sound wave measures approximately <strong>${wavelengthCm} centimeters</strong> from peak to peak.</p>
            `;
        } else if (preset.initialConfig.mode === 'sweep') {
            const start = preset.initialConfig.start;
            const end = preset.initialConfig.end;
            const dur = preset.initialConfig.duration;
            return `
            <h4 style="font-size: 13px; color: var(--text-primary); margin-top: 20px; margin-bottom: 8px;">Sweep Parameter Breakdown</h4>
            <p style="margin-bottom: 12px;">This audio sweep performs an acoustic frequency modulation starting at <strong>${start} Hz</strong> and scaling exponentially up to <strong>${end} Hz</strong> over a span of <strong>${dur} seconds</strong>. The exponential progression maps logically to human musical octave perception.</p>
            `;
        }
    }

    if (preset.tool === 'converter') {
        const parts = preset.slug.split('-to-');
        if (parts.length === 2) {
            const fromFmt = parts[0].toUpperCase();
            const toFmt = parts[1].toUpperCase();
            return `
            <h4 style="font-size: 13px; color: var(--text-primary); margin-top: 20px; margin-bottom: 8px;">Conversion Dynamics: ${fromFmt} to ${toFmt}</h4>
            <p style="margin-bottom: 12px;">Transcoding from <strong>${fromFmt}</strong> to <strong>${toFmt}</strong> processes your local audio container stream. Depending on whether you choose high-definition bitrates or space-saving profiles, files can be compressed significantly while preserving high acoustic detail.</p>
            `;
        }
    }

    return '';
}

presets.forEach(preset => {
    let html = mainHtml;

    // 1. Create target directories
    const toolDir = path.join(__dirname, preset.tool);
    const slugDir = path.join(toolDir, preset.slug);
    if (!fs.existsSync(toolDir)) {
        fs.mkdirSync(toolDir);
    }
    if (!fs.existsSync(slugDir)) {
        fs.mkdirSync(slugDir);
    }

    // 2. Adjust asset paths to point to parent folder (2 levels deep)
    html = html.replace('href="styles.css?v=1.1"', 'href="../../styles.css?v=1.1"');
    html = html.replace('src="app.js?v=1.1"', 'src="../../app.js?v=1.1"');
    html = html.replace('href="favicon.png"', 'href="../../favicon.png"');
    html = html.replace('href="manifest.json"', 'href="../../manifest.json"');
    html = html.replace(/src="tools\//g, 'src="../../tools/');

    // 3. Set custom title, description, canonical link, and OpenGraph tags
    const canonicalUrl = `https://audiomultitool.com/${preset.tool}/${preset.slug}/`;
    
    // Replace title
    html = html.replace(/<title>.*?<\/title>/, `<title>${preset.title} - Audiomultitool</title>`);
    
    // Replace meta description
    html = html.replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${preset.description}">`);
    
    // Inject canonical and OpenGraph tags before </head>
    const headExtra = `    <link rel="canonical" href="${canonicalUrl}">
    <meta property="og:title" content="${preset.title}">
    <meta property="og:description" content="${preset.description}">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:type" content="website">`;
    html = html.replace('</head>', `${headExtra}\n</head>`);

    // 4. Set custom headings inside the page
    html = html.replace(/<h2 id="active-tool-title">.*?<\/h2>/, `<h2 id="active-tool-title">${preset.content.heading}</h2>`);
    html = html.replace(/<p id="active-tool-desc">.*?<\/p>/, `<p id="active-tool-desc">${preset.description}</p>`);

    // 5. Update JSON-LD structured data title
    html = html.replace('"name": "Audiomultitool Web Audio Suite"', `"name": "${preset.title}"`);

    // 6. Update active nav button classes (desktop & mobile)
    html = html.replace('class="nav-item active" data-tool="generator"', 'class="nav-item" data-tool="generator"');
    html = html.replace(`class="nav-item" data-tool="${preset.tool}"`, `class="nav-item active" data-tool="${preset.tool}"`);
    html = html.replace('class="mobile-nav-item active" data-tool="generator"', 'class="mobile-nav-item" data-tool="generator"');
    html = html.replace(`class="mobile-nav-item" data-tool="${preset.tool}"`, `class="mobile-nav-item active" data-tool="${preset.tool}"`);

    // 7. Update active tool-pane class (pane for converter or other tools)
    html = html.replace('id="pane-generator" class="tool-pane active"', 'id="pane-generator" class="tool-pane"');
    html = html.replace('class="tool-pane active" id="pane-generator"', 'class="tool-pane" id="pane-generator"');
    
    // Add dataset initial configs to target pane and make it active
    let initialConfigDataAttrs = '';
    for (const [key, val] of Object.entries(preset.initialConfig)) {
        initialConfigDataAttrs += ` data-${key}="${val}"`;
    }
    
    html = html.replace(`id="pane-${preset.tool}" class="tool-pane"`, `id="pane-${preset.tool}" class="tool-pane active"${initialConfigDataAttrs}`);
    html = html.replace(`class="tool-pane" id="pane-${preset.tool}"`, `class="tool-pane active" id="pane-${preset.tool}"${initialConfigDataAttrs}`);

    // 8. Inject dataset attribute to body to signal to client script to NOT overwrite text
    html = html.replace('<body', '<body data-seo-page="true"');

    // 9. Generate linking grid for internal presets
    const siblingPresets = presets.filter(p => p.tool === preset.tool && p.slug !== preset.slug);
    const linksHtml = siblingPresets.map(p => {
        const linkLabel = p.title.split('–')[0].trim().replace('Online', '').trim();
        return `<a href="../${p.slug}/" style="color: var(--primary); text-decoration: none; font-weight: 500; transition: opacity 0.15s;" onmouseover="this.style.opacity=0.8" onmouseout="this.style.opacity=1">${linkLabel}</a>`;
    }).join(' <span style="color: var(--border-color);">|</span> ');

    const headingsMap = {
        generator: 'Generate other signals:',
        sweep: 'Other sweep tests:',
        metronome: 'Popular metronome speeds:',
        tuner: 'Other tuning options:',
        'db-meter': 'Other DB weighting options:',
        converter: 'Convert to other formats:',
        recorder: 'Other recording options:'
    };
    const linkingHeading = headingsMap[preset.tool] || 'Related tools:';    const toolPaneMarker = `id="pane-${preset.tool}"`;
    const toolPaneIndex = html.indexOf(toolPaneMarker);
    if (toolPaneIndex !== -1) {
        const startMarker = '<!-- Valuable Content SEO Section -->';
        const startIndex = html.indexOf(startMarker, toolPaneIndex);
        if (startIndex !== -1) {
            const endIndex = findClosingDivIndex(html, startIndex + startMarker.length);
            if (endIndex !== -1) {
                const totalLength = (endIndex + 6) - startIndex;
                const defaultSeoSection = html.substr(startIndex, totalLength);

                // Extract educational guides and FAQs from the default template section
                const guideIndex = defaultSeoSection.indexOf('<h4');
                let guideHtml = '';
                if (guideIndex !== -1) {
                    guideHtml = defaultSeoSection.substring(guideIndex);
                } else {
                    // Fallback to closing tag if no guide sections exist
                    guideHtml = '</div>';
                }

                const dynamicCalcHtml = generateDynamicCalculations(preset);

                const customContentHtml = `<!-- Valuable Content SEO Section -->
                    <div class="tool-info-section" style="border-top: 1px solid var(--border-color); padding-top: 24px; font-size: 13px; line-height: 1.6; color: var(--text-secondary); margin-top: 40px;">
                        <h2 style="font-size: 18px; color: var(--text-primary); margin-bottom: 12px; text-transform: none; letter-spacing: 0;">${preset.content.heading}</h2>
                        ${preset.content.bodyParagraphs.map(p => `<p style="margin-bottom: 12px;">${p}</p>`).join('\n')}
                        ${dynamicCalcHtml}
                        ${guideHtml}

                    <!-- Internal Linking Grid -->
                    <div class="linking-grid-section" style="border-top: 1px solid var(--border-color); padding-top: 20px; margin-top: 20px; font-size: 13px; color: var(--text-secondary);">
                        <h4 style="font-size: 13px; color: var(--text-primary); margin-bottom: 8px;">${linkingHeading}</h4>
                        <div style="display: flex; flex-wrap: wrap; gap: 8px 16px;">
                            ${linksHtml}
                        </div>
                    </div>`;

                html = html.replace(defaultSeoSection, customContentHtml);
            }
        }
    }

    // 11. Write generated HTML file
    const outputPath = path.join(slugDir, 'index.html');
    fs.writeFileSync(outputPath, html, 'utf8');
    console.log(`Generated SEO Page: ${preset.tool}/${preset.slug}/index.html`);
});

// Generate redirect pages for old /sweep/ and /noise/ paths
const redirects = [
    { oldPath: 'sweep', newPath: 'generator' },
    { oldPath: 'sweep/speaker-test-sweep', newPath: 'generator/speaker-test-sweep' },
    { oldPath: 'sweep/subwoofer-test-sweep', newPath: 'generator/subwoofer-test-sweep' },
    { oldPath: 'sweep/shepards-tone-rising', newPath: 'generator/shepards-tone-rising' },
    { oldPath: 'noise', newPath: 'db-meter' },
    { oldPath: 'noise/db-meter-a-weighted', newPath: 'db-meter/db-meter-a-weighted' },
    { oldPath: 'noise/db-meter-c-weighted', newPath: 'db-meter/db-meter-c-weighted' }
];

redirects.forEach(redir => {
    const oldDir = path.join(__dirname, redir.oldPath);
    if (!fs.existsSync(oldDir)) {
        fs.mkdirSync(oldDir, { recursive: true });
    }
    const targetUrl = `https://audiomultitool.com/${redir.newPath}/`;
    const redirectHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redirecting...</title>
  <link rel="canonical" href="${targetUrl}">
  <meta http-equiv="refresh" content="0; url=/${redir.newPath}/">
  <script>
    window.location.replace("/${redir.newPath}/");
  </script>
</head>
<body>
  <p>Redirecting to <a href="/${redir.newPath}/">/${redir.newPath}/</a>...</p>
</body>
</html>`;
    fs.writeFileSync(path.join(oldDir, 'index.html'), redirectHtml, 'utf8');
    console.log(`Generated Redirect: /${redir.oldPath}/index.html -> /${redir.newPath}/`);
});

// Update sitemap.xml
const sitemapPath = path.join(__dirname, 'sitemap.xml');
const todayStr = getTodayDate();
let sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://audiomultitool.com/</loc>
    <lastmod>${todayStr}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://audiomultitool.com/generator/</loc>
    <lastmod>${todayStr}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://audiomultitool.com/metronome/</loc>
    <lastmod>${todayStr}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://audiomultitool.com/tuner/</loc>
    <lastmod>${todayStr}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://audiomultitool.com/recorder/</loc>
    <lastmod>${todayStr}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://audiomultitool.com/db-meter/</loc>
    <lastmod>${todayStr}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://audiomultitool.com/converter/</loc>
    <lastmod>${todayStr}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://audiomultitool.com/about.html</loc>
    <lastmod>${todayStr}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://audiomultitool.com/contact.html</loc>
    <lastmod>${todayStr}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
`;

presets.forEach(preset => {
    sitemapContent += `  <url>
    <loc>https://audiomultitool.com/${preset.tool}/${preset.slug}/</loc>
    <lastmod>${todayStr}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>\n`;
});

sitemapContent += `</urlset>\n`;

fs.writeFileSync(sitemapPath, sitemapContent, 'utf8');
console.log('Successfully regenerated sitemap.xml with dynamic routes.');

console.log('pSEO static building completed.');
