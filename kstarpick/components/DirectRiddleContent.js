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
    
    // html/head/body 태그 제거
    cleanedContent = cleanedContent.replace(/<\/?(?:html|head|body)[^>]*>/gi, '');

    // WordPress embed figure 래퍼 제거 (blockquote만 남기기)
    cleanedContent = cleanedContent.replace(
      /<figure[^>]*wp-block-embed[^>]*>[\s\S]*?(<blockquote[\s\S]*?<\/blockquote>)[\s\S]*?<\/figure>/gi,
      '$1'
    );

    // 빈 figure 태그 제거
    cleanedContent = cleanedContent.replace(/<figure[^>]*>\s*<\/figure>/gi, '');

    // Twitter blockquote에서 data-width 제거 (위젯 폭 제한 방지)
    cleanedContent = cleanedContent.replace(
      /(<blockquote[^>]*class="twitter-tweet"[^>]*)\s+data-width="[^"]*"/gi,
      '$1'
    );

    // DOM에 정리된 HTML 삽입
    contentRef.current.innerHTML = cleanedContent;

    // Instagram 임베드 처리
    if (cleanedContent.includes('instagram-media')) {
      let instagramRetryCount = 0;
      const maxInstagramRetries = 30;

      const processInstagram = () => {
        if (window.instgrm && window.instgrm.Embeds) {
          const blockquotes = contentRef.current?.querySelectorAll('blockquote.instagram-media');

          if (blockquotes && blockquotes.length > 0) {
            try {
              window.instgrm.Embeds.process();
              return true;
            } catch (error) {
              console.error('[DirectRiddleContent] Instagram 처리 오류:', error);
            }
          }
        } else {
          if (window.loadInstagramScript) {
            window.loadInstagramScript();
          }
        }

        if (instagramRetryCount < maxInstagramRetries) {
          instagramRetryCount++;
          const delay = instagramRetryCount <= 10 ? 100 : 500;
          setTimeout(processInstagram, delay);
        } else {
          console.warn('[DirectRiddleContent] Instagram 최대 재시도 도달');
        }

        return false;
      };

      // 즉시 시작
      setTimeout(processInstagram, 0);
    }

    // Twitter 임베드 처리
    if (cleanedContent.includes('twitter-tweet')) {
      let twitterRetryCount = 0;
      const maxTwitterRetries = 30;

      const processTwitter = () => {
        if (window.twttr && window.twttr.widgets) {
          const blockquotes = contentRef.current?.querySelectorAll('blockquote.twitter-tweet');

          if (blockquotes && blockquotes.length > 0) {
            try {
              window.twttr.widgets.load(contentRef.current);
              return true;
            } catch (error) {
              console.error('[DirectRiddleContent] Twitter 처리 오류:', error);
            }
          }
        } else {
          if (window.loadTwitterScript) {
            window.loadTwitterScript();
          }
        }

        if (twitterRetryCount < maxTwitterRetries) {
          twitterRetryCount++;
          const delay = twitterRetryCount <= 10 ? 100 : 500;
          setTimeout(processTwitter, delay);
        } else {
          console.warn('[DirectRiddleContent] Twitter 최대 재시도 도달');
        }

        return false;
      };

      // 즉시 시작
      setTimeout(processTwitter, 0);
    }

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
    <>
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
      <style jsx>{`
        /* Twitter 위젯 렌더링 후 생성되는 모든 컨테이너 여백 제거 */
        :global(.article-content .twitter-tweet-rendered),
        :global(.prose .twitter-tweet-rendered) {
          margin: 0 0 1rem 0 !important;
        }

        :global(.article-content iframe[id^="twitter-widget-"]),
        :global(.prose iframe[id^="twitter-widget-"]) {
          display: block !important;
          margin: 0 auto 1rem auto !important;
        }

        :global(.article-content blockquote.twitter-tweet),
        :global(.prose blockquote.twitter-tweet) {
          margin: 0 0 1rem 0 !important;
          padding: 0 !important;
          border: none !important;
          quotes: none !important;
        }

        /* prose가 blockquote에 추가하는 스타일 오버라이드 */
        :global(.prose blockquote.twitter-tweet::before),
        :global(.prose blockquote.twitter-tweet::after),
        :global(.prose blockquote.instagram-media::before),
        :global(.prose blockquote.instagram-media::after) {
          content: none !important;
        }

        /* WordPress embed figure 래퍼 여백 제거 */
        :global(.article-content figure),
        :global(.prose figure) {
          margin: 0 !important;
          padding: 0 !important;
        }

        :global(.article-content .wp-block-embed__wrapper),
        :global(.prose .wp-block-embed__wrapper) {
          margin: 0 !important;
          padding: 0 !important;
        }

        /* 빈 figure 태그 숨기기 */
        :global(.article-content figure:empty) {
          display: none !important;
        }

        /* 임베드 후 생성되는 빈 p 태그 제거 */
        :global(.article-content p:empty) {
          display: none !important;
        }

        /* 연속된 br 태그 제한 */
        :global(.article-content br + br + br) {
          display: none !important;
        }
      `}</style>
    </>
  );
};

export default DirectRiddleContent;