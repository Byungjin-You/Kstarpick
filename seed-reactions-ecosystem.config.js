module.exports = {
  apps: [{
    name: 'seed-reactions',
    script: './seed-reactions-runner.js',
    cwd: '/Users/byungjinyou/Desktop/kstarpick-server-backup',
    cron_restart: '0 1,4,7,10,13,16,19,22 * * *',  // 3시간 간격 (01,04,07,10,13,16,19,22시) — 다른 배치와 1시간 오프셋
    autorestart: false,             // 실행 후 자동 재시작 안 함
    watch: false,
    max_memory_restart: '200M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: './logs/seed-reactions-error.log',
    out_file: './logs/seed-reactions-out.log',
    merge_logs: true
  }]
};
