import { MongoClient } from 'mongodb';

// MongoDB 연결 설정
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://kstarpick:zpdltmxkvlr0%212@kstarpick-mongodb-production.cluster-cjquemysifmm.ap-northeast-2.docdb.amazonaws.com:27017/kstarpick?retryWrites=false&authSource=admin&authMechanism=SCRAM-SHA-1';
const MONGODB_DB = process.env.MONGODB_DB || 'kstarpick';

/**
 * @swagger
 * /api/news/drama:
 *   get:
 *     description: 드라마와 관련된 뉴스 글들을 가져옵니다
 *     parameters:
 *       - name: page
 *         in: query
 *         description: 페이지 번호 (1부터 시작)
 *         required: false
 *         type: integer
 *       - name: limit
 *         in: query
 *         description: 페이지당 뉴스 개수
 *         required: false
 *         type: integer
 *     responses:
 *       200:
 *         description: 드라마 뉴스 목록과 페이지네이션 정보
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  let client;

  try {
    console.log('[Drama API] === 네이티브 MongoDB 연결 시작 ===');
    
    // MongoDB 클라이언트 연결
    client = new MongoClient(MONGODB_URI, {
      retryWrites: false,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 30000,
      authSource: 'admin',
      authMechanism: 'SCRAM-SHA-1',
      // SSL 비활성화 (DocumentDB 호환성)
      // tls: true,
      // tlsAllowInvalidCertificates: true,
      // tlsAllowInvalidHostnames: true,
    });
    
    await client.connect();
    console.log('[Drama API] MongoDB 연결 성공');
    
    const db = client.db(MONGODB_DB);
    
    const { page = 1, limit = 12, sort = 'createdAt', order = 'desc' } = req.query;
    
    // 페이지와 제한 개수를 숫자로 변환
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // 드라마 카테고리 뉴스만 조회 (대소문자 무관) + 오류 뉴스 필터링
    const query = {
      $and: [
        { category: { $regex: '^drama$', $options: 'i' } },
        {
          $or: [
            { title: { $exists: true, $ne: '', $ne: null } },
            { title: { $exists: false } }
          ]
        },
        {
          $or: [
            { content: { $exists: false } },
            { content: { $ne: '<p>상세 기사를 가져오는 중 오류가 발생했습니다. 원본 페이지를 방문해 주세요.</p>' } },
            { content: { $not: { $regex: '^<p>상세 기사를 가져오는 중 오류가 발생했습니다' } } }
          ]
        }
      ]
    };

    // 정렬 필드와 방향 처리
    const sortDirection = order === 'asc' ? 1 : -1;
    const sortOptions = { [sort]: sortDirection };

    // 총 뉴스 수 카운트
    const total = await db.collection('news').countDocuments(query);

    // 뉴스 조회 (페이지네이션 적용)
    const news = await db
      .collection('news')
      .find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .toArray();

    // 디버깅 로그 추가
    console.log(`[API] 드라마 뉴스 요청: 페이지 ${pageNum}, 개수 ${limitNum}, 건수 ${news.length}, 총 ${total}건`);

    // 페이지네이션 정보 계산
    const totalPages = Math.ceil(total / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;
    
    // 결과 반환
    return res.status(200).json({
      success: true,
      data: news,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    });
  } catch (error) {
    console.error('[Drama API] 드라마 뉴스 조회 오류:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  } finally {
    if (client) {
      await client.close();
      console.log('[Drama API] MongoDB 연결 종료');
    }
  }
} 