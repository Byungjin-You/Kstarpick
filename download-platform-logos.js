const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, 'kstarpick/public/images/platforms');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

function download(url, filename) {
  return new Promise((resolve, reject) => {
    const dest = path.join(outputDir, filename);
    const file = fs.createWriteStream(dest);
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 15000
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        return download(res.headers.location, filename).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(filename); });
    });
    req.on('error', (e) => { file.close(); try { fs.unlinkSync(dest); } catch(_){} reject(e); });
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

// Simple Icons CDN - transparent SVG icons with brand colors
const platforms = [
  // Simple Icons (transparent bg, colored icon)
  { name: 'Netflix',       url: 'https://cdn.simpleicons.org/netflix/E50914',     file: 'netflix.svg' },
  { name: 'Disney+',       url: 'https://cdn.simpleicons.org/disneyplus/113CCF',  file: 'disneyplus.svg' },
  { name: 'Apple TV+',     url: 'https://cdn.simpleicons.org/appletv/000000',     file: 'appletv.svg' },
  { name: 'Prime Video',   url: 'https://cdn.simpleicons.org/primevideo/00A8E1',  file: 'primevideo.svg' },
  { name: 'Hulu',          url: 'https://cdn.simpleicons.org/hulu/1CE783',        file: 'hulu.svg' },
  { name: 'Viki',          url: 'https://cdn.simpleicons.org/viki/1D9C2B',        file: 'viki.svg' },
  { name: 'YouTube',       url: 'https://cdn.simpleicons.org/youtube/FF0000',     file: 'youtube.svg' },
  // Korean platforms (from Wikimedia)
  { name: 'Tving',         url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/TVING_logo.svg/512px-TVING_logo.svg.png', file: 'tving.png' },
  { name: 'Wavve',         url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Wavve_logo.svg/512px-Wavve_logo.svg.png', file: 'wavve.png' },
  { name: 'Watcha',        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Watcha_logo.png/512px-Watcha_logo.png',  file: 'watcha.png' },
  { name: 'Coupang Play',  url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Coupang_Play_logo.svg/512px-Coupang_Play_logo.svg.png', file: 'coupangplay.png' },
];

async function main() {
  console.log(`저장 경로: ${outputDir}\n`);
  for (const p of platforms) {
    try {
      await download(p.url, p.file);
      console.log(`✓ ${p.name} → ${p.file}`);
    } catch (e) {
      console.log(`✗ ${p.name}: ${e.message}`);
    }
  }
  console.log('\n완료!');
}
main();
