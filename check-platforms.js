const http = require('http');

function fetchPage(page) {
  return new Promise((resolve, reject) => {
    const req = http.get('http://43.202.38.79:13001/api/dramas?limit=100&page=' + page, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function main() {
  const platforms = new Set();
  let page = 1;
  let total = 0;
  while (true) {
    const res = await fetchPage(page);
    const dramas = res.data || [];
    if (dramas.length === 0) break;
    total += dramas.length;
    dramas.forEach(d => {
      if (d.whereToWatch && Array.isArray(d.whereToWatch)) {
        d.whereToWatch.forEach(p => { if (p.name) platforms.add(p.name); });
      }
    });
    const totalPages = res.pagination && res.pagination.totalPages ? res.pagination.totalPages : 1;
    console.log(`페이지 ${page}/${totalPages} 완료 (${dramas.length}개)`);
    if (page >= totalPages) break;
    page++;
  }
  console.log('\n총 드라마:', total);
  console.log('플랫폼 목록:');
  [...platforms].sort().forEach(p => console.log(' -', p));
}
main().catch(console.error);
