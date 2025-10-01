import dbConnect from '../../../lib/dbConnect';
import Celebrity from '../../../models/Celebrity';
import { unstable_getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(req, res) {
  const { method } = req;
  
  // DB 연결
  await dbConnect();
  
  // POST 요청만 처리
  if (method !== 'POST') {
    return res.status(405).json({ success: false, error: '허용되지 않는 메소드입니다.' });
  }
  
  try {
    // 인증 및 권한 확인 - 서버 사이드에서 세션 가져오기
    const session = await unstable_getServerSession(req, res, authOptions);
    
    // 테스트를 위해 인증 임시 비활성화
    /*
    if (!session) {
      return res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
    }
    
    if (session.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: '관리자 권한이 필요합니다.' });
    }
    */
    
    // 요청 본문에서 K-POP 레이더 데이터 가져오기
    const { artists } = req.body;
    
    if (!artists || !Array.isArray(artists) || artists.length === 0) {
      return res.status(400).json({ success: false, error: '유효한 아티스트 데이터가 없습니다.' });
    }
    
    // 디버깅: 요청에서 받은 데이터 확인
    console.log('import.js - 요청 받은 아티스트 수:', artists.length);
    if (artists.length > 0) {
      console.log('import.js - 첫 번째 아티스트 샘플:', JSON.stringify({
        name: artists[0].name,
        engName: artists[0].engName,
        socialMediaStats: artists[0].socialMediaStats || {},
        todayStats: artists[0].todayStats || {},
        musicVideos: artists[0].musicVideos || []
      }, null, 2));
    }
    
    const results = {
      imported: 0,
      updated: 0,
      failed: 0,
      details: []
    };
    
    // 각 아티스트를 DB에 추가 또는 업데이트
    for (const artist of artists) {
      try {
        // 이름과 한글 이름 확인
        if (!artist.name && !artist.engName) {
          results.failed++;
          results.details.push({
            name: 'Unknown',
            status: 'failed',
            error: '아티스트 이름이 없습니다.'
          });
          continue;
        }
        
        // 소셜 미디어 데이터 생성
        const socialMedia = {};
        
        // 소셜 미디어 링크 유효성 확인 및 추가
        if (artist.socialMedia) {
          console.log(`import.js - ${artist.name}의 원본 소셜 미디어 링크:`, JSON.stringify(artist.socialMedia, null, 2));
          
          // 각 소셜 미디어 플랫폼 링크 확인 및 유효한 경우에만 추가
          if (artist.socialMedia.instagram && artist.socialMedia.instagram.includes('instagram.com')) {
            socialMedia.instagram = artist.socialMedia.instagram;
          }
          
          if (artist.socialMedia.twitter && artist.socialMedia.twitter.includes('twitter.com')) {
            socialMedia.twitter = artist.socialMedia.twitter;
          }
          
          if (artist.socialMedia.youtube && artist.socialMedia.youtube.includes('youtube.com')) {
            socialMedia.youtube = artist.socialMedia.youtube;
          }
          
          if (artist.socialMedia.spotify && artist.socialMedia.spotify.includes('spotify.com')) {
            socialMedia.spotify = artist.socialMedia.spotify;
          }
          
          if (artist.socialMedia.tiktok && artist.socialMedia.tiktok.includes('tiktok.com')) {
            socialMedia.tiktok = artist.socialMedia.tiktok;
          }
          
          if (artist.socialMedia.fancafe && artist.socialMedia.fancafe.includes('cafe.daum.net')) {
            socialMedia.fancafe = artist.socialMedia.fancafe;
          }
        }
        
        // 소셜 미디어 팔로워 데이터 처리
        const socialMediaFollowers = {};
        
        if (artist.socialMediaStats || artist.todayStats) {
          const stats = artist.socialMediaStats || artist.todayStats || {};
          console.log(`import.js - ${artist.name}의 소셜 미디어 팔로워 통계:`, JSON.stringify(stats, null, 2));
          
          // 각 플랫폼별 팔로워 수치 변환 (문자열 -> 숫자)
          const platforms = ['instagram', 'twitter', 'youtube', 'spotify', 'tiktok', 'fancafe'];
          
          platforms.forEach(platform => {
            let followers = stats[platform] || '0';
            
            // 문자열에서 팔로워 수 추출 (예: '1.5M' -> 1500000)
            if (typeof followers === 'string') {
              followers = followers.trim().replace(/,/g, '');
              
              if (followers.includes('M')) {
                followers = parseFloat(followers.replace('M', '')) * 1000000;
              } else if (followers.includes('K')) {
                followers = parseFloat(followers.replace('K', '')) * 1000;
              } else {
                followers = parseInt(followers) || 0;
              }
            }
            
            socialMediaFollowers[platform] = followers;
          });
        }
        
        // 뮤직비디오 정보 처리
        let musicVideos = [];
        if (artist.musicVideos && Array.isArray(artist.musicVideos)) {
          console.log(`import.js - ${artist.name}의 뮤직비디오 정보가 들어왔습니다. 갯수: ${artist.musicVideos.length}`);
          console.log(`import.js - ${artist.name}의 뮤직비디오 정보:`, JSON.stringify(artist.musicVideos, null, 2));
          
          // 필요한 정보만 추출하여 저장
          musicVideos = artist.musicVideos
            .filter(video => video && video.youtubeUrl && video.youtubeUrl.includes('youtube.com'))
            .map(video => {
              // 아티스트 데이터가 있는지 확인
              const artists = Array.isArray(video.artists) ? video.artists : [];
              
              return {
                title: video.title || '',
                youtubeUrl: video.youtubeUrl || '',
                views: video.viewCount || video.views || 0,
                dailyViews: video.dailyViews || 0,
                publishedAt: video.publishedAt ? new Date(video.publishedAt) : null,
                likes: video.likeCount || video.likes || 0,
                thumbnails: {
                  default: { url: video.thumbnail || (video.thumbnails?.default?.url || '') },
                  medium: { url: video.thumbnail || (video.thumbnails?.medium?.url || '') },
                  high: { url: video.thumbnail || (video.thumbnails?.high?.url || '') }
                },
                artists: artists
              };
            });
          
          console.log(`import.js - ${artist.name}의 필터링 후 뮤직비디오 갯수: ${musicVideos.length}`);
          console.log(`import.js - ${artist.name}의 필터링 후 뮤직비디오 정보:`, JSON.stringify(musicVideos.slice(0, 2), null, 2));
        } else {
          console.log(`import.js - ${artist.name}의 뮤직비디오 정보가 없거나 배열이 아닙니다.`);
        }
        
        // 아티스트 데이터 생성
        const artistData = {
          name: artist.engName || artist.name,
          koreanName: artist.name || '',
          profileImage: artist.image || artist.thumbnail || '',
          category: artist.groupType === 'solo' ? 'solo' : 'idol',
          role: artist.groupType === 'solo' ? 'Singer' : 'Group',
          agency: artist.agency || '',
          debutDate: artist.debutDate ? new Date(artist.debutDate) : null,
          followers: parseInt(String(artist.followers).replace(/[^0-9]/g, '')) || 0,
          socialMedia: socialMedia,
          socialMediaFollowers: socialMediaFollowers,
          musicVideos: musicVideos,
          isFeatured: true,
          isActive: true,
          updatedAt: new Date()
        };
        
        // 저장 전 최종 데이터 확인 로그
        console.log(`import.js - ${artist.name} 저장 전 최종 데이터:`, JSON.stringify({
          name: artistData.name,
          koreanName: artistData.koreanName,
          musicVideosCount: musicVideos.length,
          musicVideos: musicVideos
        }, null, 2));
        
        // DB에서 기존 아티스트 검색 (이름으로 검색)
        const existingCelebrity = await Celebrity.findOne({
          $or: [
            { name: { $regex: new RegExp(artist.engName || artist.name, 'i') } },
            { koreanName: { $regex: new RegExp(artist.name || '', 'i') } }
          ]
        });
        
        if (existingCelebrity) {
          // 기존 셀럽 업데이트
          console.log(`import.js - 기존 셀럽 업데이트 전 socialMediaFollowers 확인:`, JSON.stringify(socialMediaFollowers, null, 2));
          
          const updated = await Celebrity.findByIdAndUpdate(
            existingCelebrity._id,
            {
              $set: {
                ...artistData,
                updatedAt: new Date()
              }
            },
            { new: true }
          );
          
          console.log(`import.js - 셀럽 업데이트 후 DB에 저장된 socialMediaFollowers:`, JSON.stringify(updated.socialMediaFollowers, null, 2));
          
          results.updated++;
          results.details.push({
            name: artist.name,
            engName: artist.engName,
            status: 'updated',
            id: updated._id
          });
        } else {
          // 새 셀럽 생성
          console.log(`import.js - 새 셀럽 생성 전 socialMediaFollowers 확인:`, JSON.stringify(socialMediaFollowers, null, 2));
          
          const newCeleb = await Celebrity.create(artistData);
          
          console.log(`import.js - 새 셀럽 생성 후 DB에 저장된 socialMediaFollowers:`, JSON.stringify(newCeleb.socialMediaFollowers, null, 2));
          
          results.imported++;
          results.details.push({
            name: artist.name,
            engName: artist.engName,
            status: 'imported',
            id: newCeleb._id
          });
        }
      } catch (error) {
        console.error(`아티스트 ${artist.name} 저장 중 오류:`, error);
        results.failed++;
        results.details.push({
          name: artist.name,
          engName: artist.engName,
          status: 'failed',
          error: error.message
        });
      }
    }
    
    // 결과 반환
    return res.status(200).json({ 
      success: true, 
      data: results
    });
    
  } catch (error) {
    console.error('데이터 가져오기 중 오류 발생:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
} 