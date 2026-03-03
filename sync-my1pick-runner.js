/**
 * My1Pick 원픽차트 데이터 동기화 스크립트
 *
 * - 로컬에서 실행 (My1Pick MySQL → KstarPick MongoDB)
 * - My1Pick MySQL에서 1PICK CHART 캠페인 + 투표 현황 조회
 * - KstarPick MongoDB의 my1pick_charts 컬렉션에 저장
 * - 프로덕션 어드민에서 MongoDB 데이터 읽어서 표시
 *
 * 사용법: node sync-my1pick-runner.js
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// mysql2는 로컬 전용이므로 동적 require
let mysql;
try {
  mysql = require('mysql2/promise');
} catch (e) {
  console.error('mysql2 not installed. Run: npm install mysql2');
  process.exit(1);
}

// Load env - kstarpick 하위 디렉토리에서 .env.local 찾기
const scriptDir = path.dirname(__filename);
const envPath = fs.existsSync(path.resolve(scriptDir, '.env.local'))
  ? path.resolve(scriptDir, '.env.local')
  : path.resolve(scriptDir, 'kstarpick', '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) process.env[match[1].trim()] = match[2].trim();
  }
}

// ─── My1Pick MySQL 설정 ───
const MY1PICK_DB_CONFIG = {
  host: 'my1pick-real-cluster.cluster-ro-cgywvthjgb20.ap-northeast-2.rds.amazonaws.com',
  port: 3306,
  user: 'my1pick_tf',
  password: 'asas1212!!',
  database: 'my1pick_renewal',
  connectTimeout: 15000
};

// ─── MongoDB 연결 ───
async function connectToMongoDB() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || 'kstarpick';
  const client = new MongoClient(uri);
  await client.connect();
  return { db: client.db(dbName), client };
}

// ─── 캠페인 타이틀에서 차트 타입과 시즌 추출 ───
function parseTitle(title) {
  // "26.1 1PICK CHART - KPOP(Solo)" → { season: "26.1", chartType: "KPOP(Solo)" }
  // "4th SEASON CHART KPOP(Group)" → { season: "4th SEASON", chartType: "KPOP(Group)" }

  const chartTypes = [
    'KPOP(Solo)', 'KPOP(Group)', 'TROT', 'CELEB', 'GLOBAL',
    'TREND(Male)', 'TREND(Female)'
  ];

  let chartType = 'UNKNOWN';
  for (const ct of chartTypes) {
    if (title.includes(ct)) {
      chartType = ct;
      break;
    }
  }

  // 시즌 추출: "26.1", "25.12", "4th SEASON" 등
  let season = '';
  const monthMatch = title.match(/^(\d+\.\d+)/);
  if (monthMatch) {
    season = monthMatch[1];
  } else {
    const seasonMatch = title.match(/^(\d+\w+ SEASON)/i);
    if (seasonMatch) {
      season = seasonMatch[1];
    }
  }

  return { season, chartType };
}

// ─── 차트 타입 정렬 순서 ───
const CHART_TYPE_ORDER = {
  'KPOP(Solo)': 1,
  'KPOP(Group)': 2,
  'TROT': 3,
  'CELEB': 4,
  'GLOBAL': 5,
  'TREND(Male)': 6,
  'TREND(Female)': 7,
  'UNKNOWN': 99
};

// ─── 메인 동기화 ───
(async () => {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  console.log(`\n[${timestamp}] My1Pick sync started`);

  let mysqlConn, mongoClient;

  try {
    // 1) MySQL 연결
    console.log('Connecting to My1Pick MySQL...');
    mysqlConn = await mysql.createConnection(MY1PICK_DB_CONFIG);
    console.log('MySQL connected');

    // 2) MongoDB 연결
    console.log('Connecting to KstarPick MongoDB...');
    const mongo = await connectToMongoDB();
    mongoClient = mongo.client;
    const db = mongo.db;
    console.log('MongoDB connected');

    // 3) 1PICK CHART 캠페인 목록 조회
    const [campaigns] = await mysqlConn.execute(`
      SELECT idx, title, states, start_at, end_at, created_at
      FROM vote_campaign
      WHERE campaign_sub_type_idx = 21
      ORDER BY idx DESC
    `);
    console.log(`Found ${campaigns.length} 1PICK CHART campaigns`);

    // 4) 시즌별로 그룹핑
    const seasonMap = new Map();
    for (const c of campaigns) {
      const { season, chartType } = parseTitle(c.title);
      const key = season || `unknown-${c.idx}`;
      if (!seasonMap.has(key)) {
        seasonMap.set(key, {
          season: key,
          startAt: c.start_at,
          endAt: c.end_at,
          charts: []
        });
      }
      seasonMap.get(key).charts.push({
        campaignIdx: c.idx,
        chartType,
        title: c.title,
        states: c.states
      });
    }

    console.log(`${seasonMap.size} seasons found`);

    // 5) 각 캠페인의 투표 현황 조회 + MongoDB 저장
    let totalSynced = 0;
    const collection = db.collection('my1pick_charts');

    // 인덱스 생성
    await collection.createIndex({ campaignIdx: 1 }, { unique: true });
    await collection.createIndex({ season: 1, chartType: 1 });

    for (const c of campaigns) {
      const { season, chartType } = parseTitle(c.title);

      // 투표 현황 조회 (상위 50명)
      // report_vote_detail_daily의 vote_count가 실제 투표수 (vote_status.use_qty는 골드하트 수)
      // k_music_stars 테이블에서 이름 조회 (star 테이블은 시즌차트용으로 이름이 다름)
      const [votes] = await mysqlConn.execute(`
        SELECT r.star_idx,
               kms.name AS kms_name, kms.name2 AS kms_name2, kms.group_name AS kms_group,
               s.star_name, s.star_name2,
               SUM(r.vote_count) AS vote_count
        FROM report_vote_detail_daily r
        LEFT JOIN k_music_stars kms ON r.star_idx = kms.idx
        LEFT JOIN star s ON r.star_idx = s.idx
        WHERE r.vote_campaign_idx = ?
        GROUP BY r.star_idx, kms.name, kms.name2, kms.group_name, s.star_name, s.star_name2
        ORDER BY vote_count DESC
        LIMIT 50
      `, [c.idx]);

      const totalVotes = votes.reduce((sum, v) => sum + Number(v.vote_count), 0);

      const rankings = votes.map((v, i) => ({
        rank: i + 1,
        starIdx: v.star_idx,
        starName: v.kms_name || v.star_name || '',
        starNameEn: v.kms_name2 || v.star_name2 || '',
        groupName: v.kms_group || '',
        displayName: v.kms_name || v.star_name || v.kms_name2 || v.star_name2 || `Star #${v.star_idx}`,
        useQty: Number(v.vote_count),
        votePercent: totalVotes > 0 ? Math.round((Number(v.vote_count) / totalVotes) * 10000) / 100 : 0
      }));

      // MongoDB upsert
      await collection.updateOne(
        { campaignIdx: c.idx },
        {
          $set: {
            campaignIdx: c.idx,
            title: c.title,
            season,
            chartType,
            chartTypeOrder: CHART_TYPE_ORDER[chartType] || 99,
            states: new Date() > new Date(c.end_at) ? 'N' : c.states,
            startAt: new Date(c.start_at),
            endAt: new Date(c.end_at),
            rankings,
            totalVotes,
            candidateCount: rankings.length,
            syncedAt: new Date()
          }
        },
        { upsert: true }
      );

      totalSynced++;
      if (totalSynced % 20 === 0) {
        console.log(`  Synced ${totalSynced}/${campaigns.length} campaigns...`);
      }
    }

    console.log(`\nSync complete: ${totalSynced} campaigns synced to MongoDB`);

    // 6) 동기화 요약
    const stats = await collection.aggregate([
      { $group: { _id: '$season', count: { $sum: 1 }, totalVotes: { $sum: '$totalVotes' } } },
      { $sort: { _id: -1 } },
      { $limit: 5 }
    ]).toArray();

    console.log('\nRecent seasons:');
    for (const s of stats) {
      console.log(`  ${s._id}: ${s.count} charts, ${s.totalVotes.toLocaleString()} total votes`);
    }

  } catch (error) {
    console.error('Sync error:', error.message);
    process.exit(1);
  } finally {
    if (mysqlConn) await mysqlConn.end();
    if (mongoClient) await mongoClient.close();
    console.log('\nConnections closed');
  }
})();
