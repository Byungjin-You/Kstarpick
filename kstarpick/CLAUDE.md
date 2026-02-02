# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

K-Pop news portal serving multilingual content (English, Korean, Japanese, Chinese, Spanish) with automated content aggregation, CMS, and user authentication. Built with Next.js 14, MongoDB, and MySQL.

## Development Commands

```bash
# Install dependencies
npm install

# Development server (port 3000)
npm run dev

# Production build
npm run build

# Production server (port 13001)
npm start

# Linting
npm run lint

# Process management (PM2)
pm2 start ecosystem.config.js    # Start all services
pm2 restart kstarpick            # Restart main app
pm2 restart news-crawler         # Restart crawler
pm2 logs                         # View logs
pm2 status                       # Check status

# Manual crawler operations
node scripts/auto-crawler.js     # Run automated news crawler
node scripts/manual-crawler.js   # Manual content extraction
```

## Architecture

### Core Stack
- **Framework**: Next.js 14.0.0 with React 18
- **API**: Next.js API Routes (serverless functions)
- **Primary DB**: MongoDB/AWS DocumentDB (Mongoose ODM)
- **Secondary DB**: MySQL/AWS RDS
- **Auth**: NextAuth.js with JWT tokens
- **Styling**: Tailwind CSS + Shadcn UI components

### Directory Structure
- `pages/` - Next.js routing and API endpoints
  - `api/` - Backend endpoints (auth, news, dramas, music, celeb, crawler, youtube)
  - `admin/` - Admin dashboard pages
- `components/` - 41 reusable UI components
- `models/` - Mongoose schemas (News, Drama, Celebrity, Music, TVFilm, User, Review)
- `lib/` - Core utilities (dbConnect, mongodb, auth, token, youtubeApi)
- `scripts/` - 48 utility scripts for crawling and maintenance
- `public/` - Static assets and uploads

### Key API Patterns

All API routes follow RESTful conventions:
```javascript
// GET /api/news - List with pagination
// POST /api/news - Create (admin only)
// GET /api/news/[id] - Get single item
// PUT /api/news/[id] - Update (admin only)
// DELETE /api/news/[id] - Delete (admin only)
```

Authentication middleware pattern:
```javascript
import { verifyToken } from '@/lib/auth';
const decoded = verifyToken(req);
if (!decoded || decoded.role !== 'admin') {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

Database connection pattern:
```javascript
import dbConnect from '@/lib/dbConnect';
await dbConnect();
```

### Data Models

All models extend Mongoose Schema with multilingual support:
```javascript
{
  title: { en: String, ko: String, ja: String, zh: String, es: String },
  content: { en: String, ko: String, ja: String, zh: String, es: String },
  // ... other fields
}
```

### Automated Content Pipeline

1. **Crawlers** (`scripts/auto-crawler.js`) run via PM2
2. **Puppeteer** with stealth plugin for web scraping
3. **Cheerio** for HTML parsing
4. Content stored in MongoDB with automated translation
5. Image optimization via Next.js Image component

## Production Environment

- **Server**: EC2 at 43.202.38.79:13001
- **Path**: `/doohub/service/kstarpick`
- **Process Manager**: PM2 (see ecosystem.config.js)
- **Logs**: `/doohub/service/kstarpick/logs/`

## ⚠️ 운영서버 배포 시 필수 확인사항

**배포 전 반드시 확인해야 할 사항:**

### 1. 로컬 .env.local 설정 확인
로컬 개발용 설정이 되어 있어야 합니다 (localhost). 운영서버 설정이 아닌지 확인:
```bash
cat kstarpick/.env.local | grep -E "MONGODB_URI|NEXTAUTH_URL"
```

**정상 (로컬 개발용):**
```
MONGODB_URI=mongodb://localhost:27017/kstarpick
NEXTAUTH_URL=http://localhost:3000
```

**주의: 배포 스크립트(deploy-to-production.sh)는 .env.local을 서버에 업로드하지 않습니다.**
서버의 .env.local은 별도로 관리됩니다.

### 2. 배포 명령어
```bash
# 프로젝트 루트에서 실행 (kstarpick-server-backup/)
./deploy-to-production.sh
```

### 3. 배포 후 서버 확인
```bash
ssh -i ~/Desktop/key_kstarpick.pem ec2-user@43.202.38.79
cd /doohub/service/kstarpick
pm2 status
pm2 logs kstarpick --lines 50
```

## Database Connections

Environment variables in `.env.local`:
- `MONGODB_URI` - AWS DocumentDB connection string
- `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE` - RDS credentials
- `NEXTAUTH_SECRET` - Auth secret
- `JWT_SECRET` - JWT signing key
- `YOUTUBE_API_KEY` - YouTube Data API v3

## Common Development Tasks

### Adding New Content Type
1. Create model in `models/`
2. Add API routes in `pages/api/[content-type]/`
3. Create admin pages in `pages/admin/[content-type]/`
4. Add components in `components/[content-type]/`
5. Update crawler if needed in `scripts/`

### Modifying Crawlers
- Main crawler: `scripts/auto-crawler.js`
- Stealth mode: `scripts/stealth-crawler.js`
- Manual extraction: `scripts/manual-crawler.js`
- Test locally before deploying (crawlers use Puppeteer with headless Chrome)

### Database Migrations
Use scripts in `scripts/` directory:
- `fix-*.js` - Database maintenance and fixes
- `update-*.js` - Data updates and migrations
- Always backup before running migration scripts

### Debugging API Endpoints
1. Check logs: `pm2 logs kstarpick`
2. Test locally: `npm run dev` then use browser DevTools
3. MongoDB queries: Use Compass or shell with connection string
4. Check auth tokens in browser cookies/localStorage

## Important Considerations

- **Multilingual Content**: Always handle all 5 languages (en, ko, ja, zh, es) in data operations
- **Image Handling**: Use Next.js Image component with proper domains configured in next.config.js
- **SEO**: Maintain structured data, meta tags, and sitemap generation
- **Performance**: Use SWR for client-side data fetching, implement pagination for lists
- **Security**: Validate all inputs, escape outputs, use parameterized queries
- **Crawler Rate Limiting**: Respect robots.txt, implement delays between requests