#!/bin/bash

export PATH="$HOME/.bun/bin:$PATH"

echo "🚀 Figma MCP 서버 설정 및 실행"
echo "================================="

echo "1. WebSocket 서버 백그라운드 실행..."
# WebSocket 서버를 위한 간단한 구현
cat > websocket-server.js << 'WSEOF'
const { WebSocketServer } = require('ws');

const wss = new WebSocketServer({ port: 3055 });

console.log('🔌 WebSocket 서버가 포트 3055에서 실행 중...');

wss.on('connection', function connection(ws) {
  console.log('✅ 새로운 연결이 설정되었습니다');
  
  ws.on('error', console.error);
  
  ws.on('message', function message(data) {
    console.log('📨 메시지 수신:', data.toString());
    // 모든 클라이언트에게 메시지 브로드캐스트
    wss.clients.forEach(function each(client) {
      if (client !== ws && client.readyState === 1) {
        client.send(data);
      }
    });
  });
  
  ws.send(JSON.stringify({
    type: 'connection',
    message: 'WebSocket 서버에 연결되었습니다'
  }));
});

wss.on('error', function(error) {
  console.error('❌ WebSocket 서버 에러:', error);
});
WSEOF

# WebSocket 서버 실행
node websocket-server.js &
WS_PID=$!

echo "2. 2초 대기 중..."
sleep 2

echo "3. MCP 서버 실행..."
bunx cursor-talk-to-figma-mcp &
MCP_PID=$!

echo "🎉 설정 완료!"
echo "WebSocket 서버 PID: $WS_PID"
echo "MCP 서버 PID: $MCP_PID"
echo ""
echo "📋 다음 단계:"
echo "1. Figma를 열고 플러그인을 설치하세요"
echo "2. Cursor를 재시작하세요"
echo "3. Cursor에서 '@TalkToFigma' 명령을 사용하세요"
echo ""
echo "서버를 중지하려면: kill $WS_PID $MCP_PID"

# 서버 상태 모니터링
sleep 5
echo "🔍 서버 상태 확인 중..."
ps -p $WS_PID $MCP_PID || echo "일부 서버가 종료되었을 수 있습니다."

