// 6-10위 곡을 표시하는 코드 블록을 제거하는 스크립트
const fs = require('fs');
const path = require('path');

// 파일 읽기
const filePath = path.join(process.cwd(), 'pages/index.js');
const content = fs.readFileSync(filePath, 'utf8');

// 라인을 배열로 분할
const lines = content.split('
');

// 6-10위 곡을 표시하는 부분 제거 (1491-1578 라인)
const newLines = [
  ...lines.slice(0, 1490),
  ...lines.slice(1578)
];

// 파일 저장
fs.writeFileSync(filePath, newLines.join('
'), 'utf8');
console.log('성공적으로 6-10위 곡 표시 부분을 제거했습니다.');
