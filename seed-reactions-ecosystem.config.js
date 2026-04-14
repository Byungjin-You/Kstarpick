module.exports = {
  apps: [{
    name: 'seed-reactions',
    script: './seed-reactions-runner.js',
    cwd: '/Users/byungjinyou/Desktop/kstarpick-server-backup',
    cron_restart: '0 2,10,18 * * *',  // 1일 3회 분산 실행 (02시, 10시, 18시) — 기존 6시간→8시간 간격
    autorestart: false,             // 실행 후 자동 재시작 안 함
    watch: false,
    max_memory_restart: '200M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: './logs/seed-reactions-error.log',
    out_file: './logs/seed-reactions-out.log',
    merge_logs: true
  }]
};
