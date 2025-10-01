// 임시 하드코딩 테스트 - getServerSideProps 부분만 수정
export async function getServerSideProps(context) {
  console.log('🚀 getServerSideProps 시작 - 하드코딩 테스트');
  try {
    // 하드코딩된 테스트 데이터
    const testNewsData = [
      {
        _id: 'test1',
        title: 'Test News 1 - 하드코딩 테스트',
        category: 'kpop',
        timeText: 'Recently',
        summary: 'This is a test news article',
        coverImage: '/api/proxy/hash-image?hash=test1',
        createdAt: new Date().toISOString(),
        featured: true,
        viewCount: 1
      },
      {
        _id: 'test2', 
        title: 'Test News 2 - 하드코딩 테스트',
        category: 'drama',
        timeText: 'Recently',
        summary: 'This is another test news article',
        coverImage: '/api/proxy/hash-image?hash=test2',
        createdAt: new Date().toISOString(),
        featured: false,
        viewCount: 2
      }
    ];
    
    console.log('📰 하드코딩 테스트 데이터:', testNewsData.length, '개');
    
    return {
      props: {
        newsArticles: testNewsData,
        featuredArticles: testNewsData.filter(item => item.featured),
        watchNews: [],
        topSongs: [],
        popularNews: {
          drama: testNewsData,
          movie: [],
          music: [],
          celeb: []
        },
        rankingNews: testNewsData,
        moreNews: testNewsData
      }
    };

  } catch (error) {
    console.error('🚨 하드코딩 테스트 오류:', error);
    return {
      props: {
        newsArticles: [],
        featuredArticles: [],
        watchNews: [],
        topSongs: [],
        popularNews: { drama: [], movie: [], music: [], celeb: [] },
        rankingNews: [],
        moreNews: []
      }
    };
  }
}
