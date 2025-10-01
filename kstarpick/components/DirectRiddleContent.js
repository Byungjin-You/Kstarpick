import { useEffect, useRef } from 'react';

const DirectRiddleContent = ({ content }) => {
  const contentRef = useRef(null);

  useEffect(() => {
    if (!content || !contentRef.current) {
      return;
    }

    // HTML 엔티티 디코딩 (편집기에서 입력된 경우)
    const decodeHtmlEntities = (str) => {
      // 먼저 textarea를 이용한 기본 디코딩
      const textarea = document.createElement('textarea');
      textarea.innerHTML = str;
      let decoded = textarea.value;
      
      // 추가적인 HTML 엔티티 디코딩
      decoded = decoded
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&'); // 이것은 마지막에 해야 함
      
      return decoded;
    };

    const decodedContent = decodeHtmlEntities(content);

    // Riddle HTML 정리 - 올바른 공식 방식으로 수정
    let cleanedContent = decodedContent;
    
    // riddle2-wrapper를 올바른 공식 형태로 정리
    cleanedContent = cleanedContent.replace(
      /<div[^>]*class="riddle2-wrapper"[^>]*data-rid-id="([^"]+)"[^>]*>[\s\S]*?<\/div>/g,
      (match, riddleId) => {
        // 원본 공식 Riddle 방식 - 단순하고 깔끔하게
        return `<div class="riddle2-wrapper" data-rid-id="${riddleId}" data-auto-scroll="true" data-is-fixed-height-enabled="false" data-bg="#fff" data-fg="#00205b" style="margin:0 auto; max-width:100%; width:100%;">
<script src="https://www.riddle.com/embed/build-embedjs/embedV2.js"></script>
</div>`;
      }
    );
    
    // DOM에 정리된 HTML 삽입
    contentRef.current.innerHTML = cleanedContent;
    
    // 단순한 Riddle 스크립트 로드만
    const loadRiddleScript = () => {
      const existingScript = document.querySelector('script[src*="riddle.com/embed"]');
      
      if (!existingScript) {
        const script = document.createElement('script');
        script.src = 'https://www.riddle.com/embed/build-embedjs/embedV2.js';
        script.async = true;
        script.onload = () => {
          if (window.Riddle && typeof window.Riddle.init === 'function') {
            try {
              window.Riddle.init();
            } catch (e) {
              console.error('Riddle.init() 실패:', e);
            }
          }
        };
        document.head.appendChild(script);
      } else {
        if (window.Riddle && typeof window.Riddle.init === 'function') {
          try {
            window.Riddle.init();
          } catch (e) {
            console.error('기존 스크립트 init 실패:', e);
          }
        }
      }
    };
    
    // Riddle이 포함되어 있다면 단순하게 스크립트만 로드
    if (decodedContent.includes('riddle2-wrapper') || decodedContent.toLowerCase().includes('riddle')) {
      // DOM 삽입 후 스크립트 로드
      setTimeout(loadRiddleScript, 100);
    }
  }, [content]);

  if (!content) {
    return <div>콘텐츠를 로드할 수 없습니다.</div>;
  }

  return (
    <div
      ref={contentRef}
      className="article-content"
      style={{
        fontSize: '16px',
        lineHeight: '1.6',
        color: '#333',
        minHeight: 'auto',
        height: 'auto',
        overflow: 'visible'
      }}
    />
  );
};

export default DirectRiddleContent;