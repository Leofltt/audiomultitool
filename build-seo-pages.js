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
    html = html.replace('href="privacy.html"', 'href="../../privacy.html"');
    html = html.replace('href="terms.html"', 'href="../../terms.html"');
    html = html.replace('href="/"', 'href="../../"');
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
    const linkingHeading = headingsMap[preset.tool] || 'Related tools:';

    // 10. Replace main tool description block with semantic custom heading + paragraphs & linking grid
    const customContentHtml = `<!-- Valuable Content SEO Section -->
                    <article class="tool-info-section" style="border-top: 1px solid var(--border-color); padding-top: 24px; font-size: 13px; line-height: 1.6; color: var(--text-secondary); margin-top: 40px;">
                        <h2 style="font-size: 18px; color: var(--text-primary); margin-bottom: 12px; text-transform: none; letter-spacing: 0;">${preset.content.heading}</h2>
                        ${preset.content.bodyParagraphs.map(p => `<p style="margin-bottom: 12px;">${p}</p>`).join('\n')}
                    </article>

                    <!-- Internal Linking Grid -->
                    <div class="linking-grid-section" style="border-top: 1px solid var(--border-color); padding-top: 20px; margin-top: 20px; font-size: 13px; color: var(--text-secondary);">
                        <h4 style="font-size: 13px; color: var(--text-primary); margin-bottom: 8px;">${linkingHeading}</h4>
                        <div style="display: flex; flex-wrap: wrap; gap: 8px 16px;">
                            ${linksHtml}
                        </div>
                    </div>`;

    const toolPaneMarker = `id="pane-${preset.tool}"`;
    const toolPaneIndex = html.indexOf(toolPaneMarker);
    if (toolPaneIndex !== -1) {
        const startMarker = '<!-- Valuable Content SEO Section -->';
        const startIndex = html.indexOf(startMarker, toolPaneIndex);
        if (startIndex !== -1) {
            const endTag = '</div>';
            const endIndex = html.indexOf(endTag, startIndex + startMarker.length);
            if (endIndex !== -1) {
                const totalLength = (endIndex + endTag.length) - startIndex;
                const defaultSeoSection = html.substr(startIndex, totalLength);
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
