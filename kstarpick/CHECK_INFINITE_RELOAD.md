# 무한 새로고침 체크리스트

## 즉시 확인해주세요:

### 1. 브라우저 콘솔 열기
- **Chrome/Edge**: F12 또는 Cmd+Option+I
- **Console 탭** 선택
- http://localhost:3000 접속
- **빨간색 에러 메시지**를 복사해주세요

### 2. 무한 새로고침 패턴 확인
다음 중 어떤 패턴인가요?

#### A. 즉시 새로고침 (1초 이내)
- 페이지가 로드되자마자 바로 새로고침
- 화면이 깜빡거림

#### B. 느린 새로고침 (2-3초 후)
- 페이지가 잠깐 보이다가 새로고침
- 일부 콘텐츠가 로드됨

#### C. 랜덤 새로고침
- 가끔씩만 발생
- 특정 조건에서만 발생

### 3. 발생 조건
어떤 경우에 발생하나요?

- [ ] 최초 진입 시에만
- [ ] 새로고침 후에도
- [ ] 로그인 전/후
- [ ] 특정 브라우저에서만

## 임시 해결 테스트

### 테스트 1: 시크릿 모드
```
Chrome 시크릿 창 (Cmd+Shift+N)에서 테스트
→ 문제 발생 여부: [ ]
```

### 테스트 2: 다른 브라우저
```
Safari/Firefox에서 테스트
→ 문제 발생 여부: [ ]
```

### 테스트 3: 로컬 스토리지 삭제
```
개발자 도구 > Application > Storage > Clear site data
→ 문제 발생 여부: [ ]
```

## 일반적인 원인

### 1. SessionStorage 무한 루프
```javascript
// 문제될 수 있는 패턴
sessionStorage.setItem('key', 'value')
// ... 어떤 조건에서 window.location.reload()
```

### 2. Router 이벤트 무한 루프
```javascript
// router.push()가 계속 호출
useEffect(() => {
  router.push('/') // 의존성 배열 누락
})
```

### 3. 인증 리다이렉트 무한 루프
```javascript
// NextAuth 세션 체크가 계속 실패
if (!session) {
  router.push('/login')
  router.push('/') // 다시 리다이렉트
}
```

## 긴급 수정

무한 새로고침을 일단 멈추려면:

```bash
# 서버 중지
Ctrl+C (터미널에서)

# .next 폴더 삭제
rm -rf .next

# 다시 시작
npm run dev
```

브라우저에서:
```
1. 개발자 도구 열기
2. Application > Storage > Clear site data
3. 페이지 새로고침
```
