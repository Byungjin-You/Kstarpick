import mysql from 'mysql2/promise';

// 마이원픽 MySQL 연결 설정 (읽기 전용)
const dbConfig = {
  host: process.env.MY1PICK_DB_HOST || 'my1pick-real-cluster.cluster-ro-cgywvthjgb20.ap-northeast-2.rds.amazonaws.com',
  port: parseInt(process.env.MY1PICK_DB_PORT || '3306'),
  user: process.env.MY1PICK_DB_USER || 'my1pick_tf',
  password: process.env.MY1PICK_DB_PASSWORD || 'asas1212!!',
  database: process.env.MY1PICK_DB_NAME || 'my1pick_renewal',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0
};

// 연결 풀 생성
let pool = null;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}

// 단일 쿼리 실행
export async function query(sql, params = []) {
  const pool = getPool();
  const [rows] = await pool.execute(sql, params);
  return rows;
}

// 연결 종료
export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
