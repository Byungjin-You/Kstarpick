module.exports = {
  apps: [{
    name: 'seed-comments',
    script: './seed-comments-runner.js',
    cwd: '/Users/byungjinyou/Desktop/kstarpick-server-backup',
    cron_restart: '0 5,13,21 * * *',  // 1일 3회 분산 실행 (05시, 13시, 21시) — 리액션과 3시간 오프셋
    autorestart: false,
    watch: false,
    max_memory_restart: '300M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: './logs/seed-comments-error.log',
    out_file: './logs/seed-comments-out.log',
    merge_logs: true
  }]
};
