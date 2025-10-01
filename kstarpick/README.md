# K-Pop News Portal

다국어 지원을 제공하는 K-Pop 뉴스 포털 서비스입니다. 관리자 페이지를 통해 콘텐츠를 등록하고 글로벌 사용자들에게 서비스할 수 있습니다.

## 주요 기능

- **다국어 지원**: 영어, 한국어, 일본어, 중국어, 스페인어로 콘텐츠 제공
- **어드민 페이지**: 뉴스 등록, 수정, 삭제 및 사용자 관리 기능
- **반응형 디자인**: 모바일, 태블릿, 데스크톱에 최적화된 UI
- **콘텐츠 카테고리**: 아이돌, 그룹, 음악, 이벤트 등 다양한 카테고리 지원
- **사용자 인증**: 관리자 및 일반 사용자 계정 관리

## 기술 스택

- **프론트엔드**: Next.js, React, Tailwind CSS
- **백엔드**: Next.js API Routes
- **데이터베이스**: MongoDB
- **인증**: NextAuth.js
- **다국어 처리**: Next.js i18n
- **스타일링**: Tailwind CSS, Shadcn UI

## 설치 및 실행

### 사전 요구사항

- Node.js (v14 이상)
- MongoDB (로컬 또는 MongoDB Atlas)

### 설치

```bash
# 저장소 클론
git clone https://github.com/yourusername/kpop-news-portal.git
cd kpop-news-portal

# 종속성 설치
npm install
```

### 환경 변수 설정

`.env.local` 파일을 프로젝트 루트에 생성하고 다음 내용을 추가하세요:

```
MONGODB_URI=mongodb://localhost:27017/kpop-news
# 또는 MongoDB Atlas URI
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/kpop-news?retryWrites=true&w=majority

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_secret_key
```

### 개발 서버 실행

```bash
npm run dev
```

이제 브라우저에서 `http://localhost:3000`으로 접속하면 애플리케이션을 확인할 수 있습니다.

### 관리자 계정 생성

초기 관리자 계정을 생성하려면 다음 스크립트를 실행하세요:

```bash
npm run create-admin
```

또는 데이터베이스에 직접 사용자 레코드를 삽입할 수 있습니다. 비밀번호는 bcrypt로 해시된 상태여야 합니다.

## 배포

Vercel을 사용한 배포를 권장합니다:

```bash
npm run build
npm run start
```

### Vercel을 통한 외부 접속 URL 설정

이 프로젝트는 Vercel을 통해 쉽게 배포하여 외부에서 접근 가능한 URL을 얻을 수 있습니다:

1. [Vercel](https://vercel.com)에 가입하고 GitHub/GitLab/Bitbucket 계정을 연결합니다.
2. 프로젝트를 해당 Git 저장소에 푸시합니다.
3. Vercel 대시보드에서 "New Project"를 클릭합니다.
4. 저장소를 선택하고 환경 변수를 설정합니다:
   - `MONGODB_URI`: MongoDB Atlas 연결 문자열
   - `NEXTAUTH_SECRET`: 인증 비밀키
   - `JWT_SECRET`: JWT 비밀키
   - `ADMIN_KEY`: 관리자 등록 키
5. "Deploy" 버튼을 클릭합니다.

배포가 완료되면 `https://your-project-name.vercel.app`과 같은 URL이 생성됩니다.

자세한 배포 가이드는 `DEPLOYMENT.md` 파일을 참조하세요.

## 프로젝트 구조

```
kpop-news-portal/
├── components/        # 재사용 가능한 UI 컴포넌트
├── lib/               # 유틸리티 함수 및 설정
├── models/            # 데이터베이스 모델
├── pages/             # 라우팅 및 API 엔드포인트
│   ├── admin/         # 관리자 페이지
│   ├── api/           # API 엔드포인트
│   └── news/          # 뉴스 관련 페이지
├── public/            # 정적 파일
└── styles/            # 글로벌 스타일
```

## 라이센스

MIT 라이센스에 따라 배포됩니다. 자세한 내용은 LICENSE 파일을 참조하세요.

## Manual Drama Data Collection Guide

MyDramalist 웹사이트는 Cloudflare 보호 기능으로 인해 자동 크롤링이 어려울 수 있습니다. 아래 방법을 사용하여 수동으로 데이터를 수집할 수 있습니다.

### 드라마 목록 수집 방법

1. MyDramalist 검색 결과 페이지(예: [한국 드라마 최신순](https://mydramalist.com/search?adv=titles&ty=68,83&co=3&so=newest))로 이동합니다.
2. 브라우저 개발자 도구(F12)를 열고 검사 모드로 드라마 목록 영역을 찾습니다.
3. 드라마 목록 컨테이너를 찾아(일반적으로 `<div id=\"mdl-...\"` 요소들) 우클릭하고 "Copy" > "Copy outerHTML"을 선택합니다.
4. 복사한 HTML을 `html-sample.html` 파일에 붙여넣습니다.
5. `node manual-crawler.js` 명령어를 실행하여 데이터를 추출합니다.
6. 추출된 데이터는 `extracted-dramas.json` 파일에 저장됩니다.

### 드라마 상세 정보 수집 방법

1. 드라마 상세 페이지(예: https://mydramalist.com/779546-spring-of-the-four-seasons)로 이동합니다.
2. 브라우저 개발자 도구(F12)를 열고 검사 모드로 상세 정보 영역을 찾습니다.
3. 상세 정보 컨테이너를 찾아 우클릭하고 "Copy" > "Copy outerHTML"을 선택합니다.
4. `drama-details` 폴더 내에 `{드라마ID}-detail.html` 형식으로 파일을 만들고 복사한 HTML을 붙여넣습니다.
5. `node manual-crawler.js` 명령어를 실행하여 데이터를 추출합니다.
6. 추출된 상세 정보는 `drama-details.json` 파일에 저장됩니다.

### Where to Watch 정보 수집 방법

1. 드라마 상세 페이지에서 "Where to Watch" 섹션을 찾습니다.
2. 해당 섹션을 포함한 페이지의 HTML을 복사하여 `drama-details` 폴더의 HTML 파일에 저장합니다.
3. `node manual-crawler.js` 명령어를 실행하면 자동으로 시청 가능한 스트리밍 서비스 정보가 추출됩니다.
4. 추출된 정보에는 다음 내용이 포함됩니다:
   - 스트리밍 서비스 이름 (Netflix, Disney+ 등)
   - 서비스 링크 URL
   - 서비스 로고 이미지 URL
   - 시청 유형 (구독, 대여, 무료 등)

이 방식은 Cloudflare 보호를 우회하면서 관리자가 필요한 데이터를 수동으로 업데이트할 수 있게 해줍니다. 