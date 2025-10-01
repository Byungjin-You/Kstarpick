// 브라우저 개발자 도구 콘솔에서 실행할 토큰 디버깅 스크립트

console.log('=== 토큰 상태 확인 ===');

// 1. localStorage에서 토큰 확인
const token = localStorage.getItem('token');
const adminToken = localStorage.getItem('adminToken');

console.log('token:', token ? `${token.substring(0, 20)}...` : 'null');
console.log('adminToken:', adminToken ? `${adminToken.substring(0, 20)}...` : 'null');

// 2. 토큰이 있는지 확인
const availableToken = token || adminToken;
console.log('사용 가능한 토큰:', availableToken ? '있음' : '없음');

if (availableToken) {
    // 3. 토큰 유효성 확인
    console.log('토큰 유효성 확인 중...');
    
    fetch('/api/auth/check-admin', {
        headers: {
            'Authorization': `Bearer ${availableToken}`
        }
    })
    .then(response => response.json())
    .then(data => {
        console.log('토큰 유효성 결과:', data);
        
        if (data.isAdmin) {
            console.log('✅ 관리자 인증 성공');
            
            // 4. 드라마 API 테스트
            console.log('드라마 API 테스트 중...');
            return fetch('/api/dramas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${availableToken}`
                },
                body: JSON.stringify({
                    title: 'TEST_DRAMA_' + Date.now(),
                    category: 'drama',
                    status: 'ongoing'
                })
            });
        } else {
            console.log('❌ 관리자 권한 없음');
        }
    })
    .then(response => {
        if (response) {
            console.log('드라마 API 응답 상태:', response.status);
            return response.json();
        }
    })
    .then(data => {
        if (data) {
            console.log('드라마 API 응답:', data);
            if (data.success) {
                console.log('✅ 드라마 API 테스트 성공');
                // 테스트 드라마 삭제
                fetch(`/api/dramas/${data.data._id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${availableToken}`
                    }
                }).then(() => console.log('테스트 드라마 삭제됨'));
            } else {
                console.log('❌ 드라마 API 테스트 실패:', data.message);
            }
        }
    })
    .catch(error => {
        console.error('❌ 오류:', error);
    });
} else {
    console.log('❌ 토큰이 없습니다. 다시 로그인해주세요.');
}

// 5. 토큰 복사 함수 제공
window.fixToken = function() {
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken) {
        localStorage.setItem('token', adminToken);
        console.log('✅ adminToken을 token에 복사했습니다.');
    } else {
        console.log('❌ adminToken이 없습니다.');
    }
};

console.log('토큰이 없다면 fixToken() 함수를 실행해보세요.');
console.log('=== 디버깅 완료 ==='); 