import { connectToDatabase } from '../../../utils/mongodb';

/**
 * 크롤링한 드라마 정보를 MongoDB에 저장하는 API
 */
export default async function handler(req, res) {
  // POST 요청만 허용
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: '허용되지 않는 메소드입니다.' });
  }

  try {
    // 토큰 검사 제거됨 - 크롤링 작업에서는 인증 없이 진행
    console.log('[드라마 저장] 크롤링 모드 - 토큰 검사 생략');

    const { data } = req.body;
    
    // 데이터 유효성 검사
    if (!data || !data.title) {
      return res.status(400).json({ 
        success: false, 
        message: '유효한 드라마 데이터가 필요합니다.' 
      });
    }

    // 데이터베이스 연결
    const { db } = await connectToDatabase();
    
    // 데이터 가공 및 준비 - 필드 매핑 추가
    const dramaData = {
      ...data,
      updatedAt: new Date(),
    };

    // 필드 이름 매핑 (크롤러 필드명 -> UI 필드명)
    // synopsis -> summary
    if (dramaData.synopsis && !dramaData.summary) {
      dramaData.summary = dramaData.synopsis;
    }

    // posterImage -> coverImage
    if (dramaData.posterImage && !dramaData.coverImage) {
      dramaData.coverImage = dramaData.posterImage;
    }

    // nativeTitle -> originalTitle
    if (dramaData.nativeTitle && !dramaData.originalTitle) {
      dramaData.originalTitle = dramaData.nativeTitle;
    }

    // airsInfo -> releaseDate
    if (dramaData.airsInfo && !dramaData.releaseDate) {
      dramaData.releaseDate = dramaData.airsInfo;
    }

    // contentRating -> ageRating
    if (dramaData.contentRating && !dramaData.ageRating) {
      dramaData.ageRating = dramaData.contentRating;
    }

    // backgroundImage -> bannerImage
    if (dramaData.backgroundImage && !dramaData.bannerImage) {
      dramaData.bannerImage = dramaData.backgroundImage;
    }

    // whereToWatch/streamingServices -> watchProviders
    if (!dramaData.watchProviders) {
      if (dramaData.whereToWatch && dramaData.whereToWatch.length > 0) {
        dramaData.watchProviders = dramaData.whereToWatch;
      } else if (dramaData.streamingServices && dramaData.streamingServices.length > 0) {
        // streamingServices를 watchProviders 형식으로 변환
        dramaData.watchProviders = dramaData.streamingServices.map(service => ({
          name: service.name,
          link: service.url,
          imageUrl: service.logo,
          type: service.type
        }));
      }
    }

    // status 필드 생성 (airsInfo 기반)
    if (!dramaData.status && dramaData.airsInfo) {
      const airsInfo = dramaData.airsInfo.toLowerCase();
      const currentDate = new Date();

      if (airsInfo.includes('upcoming') || (dramaData.startDate && new Date(dramaData.startDate) > currentDate)) {
        dramaData.status = 'Upcoming';
      } else if (airsInfo.includes('airing') || airsInfo.includes('ongoing') ||
                 (dramaData.startDate && new Date(dramaData.startDate) <= currentDate &&
                  (!dramaData.endDate || new Date(dramaData.endDate) >= currentDate))) {
        dramaData.status = 'Airing';
      } else if (dramaData.endDate && new Date(dramaData.endDate) < currentDate) {
        dramaData.status = 'Completed';
      } else {
        dramaData.status = 'Completed'; // 기본값
      }

      console.log(`[드라마 저장] 상태 자동 설정: ${dramaData.status} (airsInfo: ${dramaData.airsInfo})`);
    }

    // 드라마 검색 조건 구성 (고유 식별자 우선순위: mdlUrl > slug > title)
    // slug를 생성하기 전에 먼저 기존 드라마를 검색
    let query = {};

    if (dramaData.mdlUrl) {
      // mdlUrl이 있으면 URL로 검색 (가장 신뢰할 수 있는 고유 식별자)
      query.mdlUrl = dramaData.mdlUrl;
    } else if (dramaData.slug && dramaData.slug !== 'mydramalist.com') {
      // slug가 있고 유효한 값이면 slug로 검색
      query.slug = dramaData.slug;
    } else if (dramaData.title) {
      // 마지막 수단으로 제목으로 검색
      query.title = dramaData.title;
    }
    
    console.log('[드라마 저장] 검색 조건:', query);
    
    // 기존 드라마 검색
    const existingDrama = await db.collection('dramas').findOne(query);
    
    let result;
    
    if (existingDrama) {
      console.log(`[드라마 저장] 기존 드라마 발견: ${existingDrama.title} (ID: ${existingDrama._id})`);
      
      // 기존 드라마 데이터와 새 데이터 병합 (기존 데이터 우선 보존)
      const mergedData = {
        ...dramaData,
        _id: existingDrama._id,  // _id는 보존
        createdAt: existingDrama.createdAt || new Date(),  // 생성일 보존
        updatedAt: new Date(),  // 업데이트 일자만 갱신
      };
      
      // 기존 데이터 필드 보존 (new data에 없는 필드는 유지)
      for (const key in existingDrama) {
        if (!(key in dramaData) && key !== '_id') {
          mergedData[key] = existingDrama[key];
        }
      }
      
      // 업데이트
      result = await db.collection('dramas').updateOne(
        { _id: existingDrama._id },
        { $set: mergedData }
      );
      
      return res.status(200).json({ 
        success: true, 
        message: '드라마 정보가 업데이트되었습니다.',
        data: {
          acknowledged: result.acknowledged,
          modifiedCount: result.modifiedCount,
          matchedCount: result.matchedCount,
          isUpdate: true
        }
      });
    } else {
      console.log(`[드라마 저장] 새 드라마 등록: ${dramaData.title}`);

      // slug가 없으면 생성 (새 드라마일 때만)
      if (!dramaData.slug) {
        const baseSlug = dramaData.title
          .toLowerCase()
          .replace(/[^a-z0-9ㄱ-ㅎㅏ-ㅣ가-힣]+/g, '-')
          .replace(/^-|-$/g, '');
        const timestamp = Date.now().toString().slice(-6);
        dramaData.slug = `${baseSlug}-${timestamp}`;
        console.log(`[드라마 저장] 생성된 slug: ${dramaData.slug}`);
      }

      // 새 드라마 생성
      dramaData.createdAt = new Date();
      result = await db.collection('dramas').insertOne(dramaData);
      
      return res.status(201).json({ 
        success: true, 
        message: '새 드라마가 등록되었습니다.',
        data: {
          acknowledged: result.acknowledged,
          insertedId: result.insertedId,
          isNew: true
        }
      });
    }
  } catch (error) {
    console.error('드라마 저장 중 오류 발생:', error);
    return res.status(500).json({ 
      success: false, 
      message: '드라마 저장 중 오류가 발생했습니다.',
      error: error.message
    });
  }
} 