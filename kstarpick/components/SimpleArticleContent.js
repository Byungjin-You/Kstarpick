import { useEffect, useRef } from 'react';

// 간단한 ArticleContent 컴포넌트
const SimpleArticleContent = ({ content }) => {
  console.log('[SimpleArticleContent] 컴포넌트 렌더링 시작');
  console.log('[SimpleArticleContent] content 길이:', content?.length || 0);
  
  const contentRef = useRef(null);
  
  useEffect(() => {
    if (!content || !contentRef.current) return;
    
    console.log('[SimpleArticleContent] useEffect 시작');
    
    // HTML 엔티티 디코딩
    const decodeHtmlEntities = (str) => {
      const textarea = document.createElement('textarea');
      textarea.innerHTML = str;
      return textarea.value;
    };
    
    const decodedContent = decodeHtmlEntities(content);
    console.log('[SimpleArticleContent] 디코딩 완료');
    console.log('[SimpleArticleContent] Riddle 포함 여부:', decodedContent.includes('riddle2-wrapper'));
    
    // 콘텐츠를 직접 DOM에 삽입
    contentRef.current.innerHTML = decodedContent;
    
    // Riddle이 있으면 스크립트 로드
    if (decodedContent.includes('riddle2-wrapper')) {
      console.log('[SimpleArticleContent] Riddle 발견! 스크립트 로드 시작');
      
      const loadRiddleScript = () => {
        // 기존 스크립트 확인
        const existingScript = document.querySelector('script[src*="riddle.com"]');
        if (existingScript) {
          console.log('[SimpleArticleContent] Riddle 스크립트 이미 존재');
          return;
        }
        
        console.log('[SimpleArticleContent] 새 Riddle 스크립트 생성');
        const script = document.createElement('script');
        script.src = 'https://www.riddle.com/embed/build-embedjs/embedV2.js';
        script.async = true;
        script.onload = () => {
          console.log('[SimpleArticleContent] Riddle 스크립트 로드 완료');
        };
        script.onerror = (error) => {
          console.error('[SimpleArticleContent] Riddle 스크립트 로드 실패:', error);
        };
        document.head.appendChild(script);
      };
      
      // 약간의 지연 후 스크립트 로드
      setTimeout(loadRiddleScript, 500);
    }
  }, [content]);
  
  return (
    <div 
      ref={contentRef}
      className="simple-article-content"
      style={{
        fontSize: '16px',
        lineHeight: '1.6',
        color: '#333',
        wordBreak: 'break-word'
      }}
    />
  );
};

export default SimpleArticleContent;
