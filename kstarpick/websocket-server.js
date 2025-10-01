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
