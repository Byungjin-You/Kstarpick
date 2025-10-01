import { MongoClient } from 'mongodb';

// MongoDB 연결 설정
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'kstarpick';

if (!MONGODB_URI) {
  console.error('[Celeb API] MONGODB_URI environment variable is not defined');
  throw new Error('MONGODB_URI environment variable is not defined');
}

/**
 * @swagger
 * /api/news/celeb:
 *   get:
 *     description: K-POP 셀럽 및 버라이어티 관련 뉴스를 가져옵니다
 *     responses:
 *       200:
 *         description: 셀럽 및 버라이어티 뉴스 목록
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  let client;
  
  try {
    console.log('[Celeb API] === 네이티브 MongoDB 연결 시작 ===');
    
    // MongoDB 클라이언트 연결 - 로컬/프로덕션 환경 구분
    const isLocal = process.env.NODE_ENV === 'development' && MONGODB_URI.includes('localhost');
    const options = isLocal ? {
      // 로컬 MongoDB 옵션
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
    } : {
      // 프로덕션 DocumentDB 옵션
      retryWrites: false,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 30000,
      authSource: 'admin',
      authMechanism: 'SCRAM-SHA-1',
    };

    client = new MongoClient(MONGODB_URI, options);
    
    await client.connect();
    console.log('[Celeb API] MongoDB 연결 성공');
    
    const db = client.db(MONGODB_DB);
    
    const { page = 1, limit = 12 } = req.query;
    
    // 페이지와 리밋을 정수로 변환
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    
    console.log(`[API] 셀럽 뉴스 요청: 페이지=${pageNum}, 제한=${limitNum}, 건너뛰기=${skip}`);

    // 셀럽 또는 버라이어티 카테고리 뉴스 조회 (대소문자 무관) + 오류 뉴스 필터링
    const query = {
      $and: [
        { category: { $regex: '^(celeb|variety)$', $options: 'i' } },
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

    // 전체 문서 수 조회
    const totalCount = await db.collection('news').countDocuments(query);
    
    // 페이징 적용된 데이터 조회
    const news = await db
      .collection('news')
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .toArray();

    // 특정 뉴스 이후 데이터가 존재하는지 확인하는 로깅 추가
    const ohMyGirlNewsIndex = news.findIndex(item => 
      item.title && item.title.includes('OH MY GIRL Members Renew Contracts')
    );
    
    if (ohMyGirlNewsIndex !== -1) {
      console.log(`[API] OH MY GIRL 뉴스가 ${ohMyGirlNewsIndex}번째 위치에 있습니다.`);
      
      // 이 뉴스 이후의 데이터 체크
      const remainingNews = news.slice(ohMyGirlNewsIndex + 1);
      console.log(`[API] OH MY GIRL 뉴스 이후 ${remainingNews.length}개의 뉴스가 있습니다.`);
      
      if (remainingNews.length > 0) {
        console.log(`[API] 다음 뉴스들:`, remainingNews.slice(0, 3).map(n => ({ title: n.title, category: n.category })));
      }
    }

    console.log(`[API] 셀럽 뉴스 조회 완료: ${news.length}개, 전체: ${totalCount}개`);

    return res.status(200).json({
      success: true,
      data: news,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    });
  } catch (error) {
    console.error('[Celeb API] 셀럽 뉴스 조회 오류:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  } finally {
    if (client) {
      await client.close();
      console.log('[Celeb API] MongoDB 연결 종료');
    }
  }
}

// 샘플 뉴스 데이터 생성 함수
function generateSampleNews() {
  const now = new Date();
  return [
    {
      _id: 'sample-celeb-1',
      title: 'BTS Jungkook Breaks Spotify Records with "Seven"',
      summary: 'BTS member Jungkook has broken multiple Spotify records with his solo debut track "Seven" featuring Latto.',
      content: '<p>BTS member Jungkook has achieved remarkable success with his solo debut track "Seven" featuring American rapper Latto. The song has broken multiple records on Spotify, including the fastest song to reach 100 million streams.</p><p>The track, which blends pop and R&B elements, has received praise from critics and fans alike for its catchy hook and impressive vocal performance.</p>',
      category: 'celeb',
      tags: ['BTS', 'Jungkook', 'K-pop', 'Music'],
      thumbnail: '/images/news/bts-jungkook.jpg',
      coverImage: '/images/news/bts-jungkook-cover.jpg',
      slug: 'bts-jungkook-spotify-records',
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      publishedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      viewCount: 12500
    },
    {
      _id: 'sample-celeb-2',
      title: 'BLACKPINK Announces World Tour Extension',
      summary: 'BLACKPINK has announced additional dates for their "Born Pink" world tour, extending into new countries.',
      content: '<p>Global K-pop sensation BLACKPINK has delighted fans by announcing an extension to their highly successful "Born Pink" world tour. The new dates will include performances in additional countries across Europe and South America.</p><p>The tour, which has already broken numerous attendance records, showcases the group\'s latest album along with their classic hits. Tickets for the new dates are expected to sell out within minutes.</p>',
      category: 'celeb',
      tags: ['BLACKPINK', 'K-pop', 'Concert', 'World Tour'],
      thumbnail: '/images/news/blackpink-tour.jpg',
      coverImage: '/images/news/blackpink-tour-cover.jpg',
      slug: 'blackpink-world-tour-extension',
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      publishedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      viewCount: 9800
    },
    {
      _id: 'sample-celeb-3',
      title: 'TWICE Members Renew Contracts with JYP Entertainment',
      summary: 'All nine members of TWICE have renewed their contracts with JYP Entertainment, signaling continued group activities.',
      content: '<p>In a major announcement that has relieved fans worldwide, all nine members of popular girl group TWICE have renewed their contracts with JYP Entertainment. This decision ensures that the group will continue activities together for the foreseeable future.</p><p>The renewal comes after months of speculation about the group\'s future, as their initial seven-year contracts were set to expire. JYP Entertainment has stated that the new contracts reflect the members\' dedication to the group and their fans.</p>',
      category: 'celeb',
      tags: ['TWICE', 'JYP Entertainment', 'K-pop'],
      thumbnail: '/images/news/twice-contract.jpg',
      coverImage: '/images/news/twice-contract-cover.jpg',
      slug: 'twice-contract-renewal',
      createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      publishedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      viewCount: 8700
    },
    {
      _id: 'sample-celeb-4',
      title: 'NewJeans to Collaborate with Nike for Special Collection',
      summary: 'Rising K-pop group NewJeans announces fashion collaboration with Nike for a special merchandise collection.',
      content: '<p>NewJeans, the rapidly rising K-pop girl group, has announced an exciting collaboration with sportswear giant Nike. The partnership will result in a special merchandise collection that blends the group\'s unique aesthetic with Nike\'s iconic designs.</p><p>The collection is expected to feature limited-edition footwear and apparel that reflects the members\' personal styles while incorporating elements from their music videos and concepts.</p>',
      category: 'celeb',
      tags: ['NewJeans', 'Nike', 'Fashion', 'K-pop'],
      thumbnail: '/images/news/newjeans-nike.jpg',
      coverImage: '/images/news/newjeans-nike-cover.jpg',
      slug: 'newjeans-nike-collaboration',
      createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      publishedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      viewCount: 7300
    },
    {
      _id: 'sample-celeb-5',
      title: 'Stray Kids Wins "Performance of the Year" at Korean Music Awards',
      summary: 'Stray Kids has been recognized for their exceptional performances, winning a major award at the Korean Music Awards.',
      content: '<p>JYP Entertainment\'s Stray Kids has received the prestigious "Performance of the Year" award at this year\'s Korean Music Awards. The group was recognized for their electrifying stage presence and innovative choreography throughout their recent promotions.</p><p>The award highlights the group\'s growth since their debut, with judges particularly praising their ability to combine powerful performances with meaningful messages in their music.</p>',
      category: 'celeb',
      tags: ['Stray Kids', 'Awards', 'K-pop', 'Performance'],
      thumbnail: '/images/news/stray-kids-award.jpg',
      coverImage: '/images/news/stray-kids-award-cover.jpg',
      slug: 'stray-kids-performance-award',
      createdAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      publishedAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      viewCount: 6200
    },
    {
      _id: 'sample-celeb-6',
      title: 'IVE to Make U.S. Debut with Performance on "The Tonight Show"',
      summary: 'Girl group IVE prepares for their American television debut with a performance on "The Tonight Show Starring Jimmy Fallon".',
      content: '<p>Rising K-pop sensation IVE is set to make their U.S. television debut with a performance on "The Tonight Show Starring Jimmy Fallon." The appearance marks a significant milestone in the group\'s global expansion strategy.</p><p>The sextet will perform their latest hit single, introducing American audiences to their distinctive sound and choreography. The group\'s agency has expressed excitement about this opportunity to showcase IVE\'s talents to a broader international audience.</p>',
      category: 'celeb',
      tags: ['IVE', 'The Tonight Show', 'Jimmy Fallon', 'K-pop'],
      thumbnail: '/images/news/ive-tonight-show.jpg',
      coverImage: '/images/news/ive-tonight-show-cover.jpg',
      slug: 'ive-us-debut-tonight-show',
      createdAt: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000),
      publishedAt: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000),
      viewCount: 5900
    }
  ];
} 