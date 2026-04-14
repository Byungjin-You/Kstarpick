module.exports = {
  apps: [{
    name: 'seed-comments',
    script: './seed-comments-runner.js',
    cwd: '/Users/byungjinyou/Desktop/kstarpick-server-backup',
    cron_restart: '30 2,5,8,11,14,17,20,23 * * *',  // 3시간 간격 (02:30,05:30,...) — 리액션과 1.5시간 오프셋
    autorestart: false,
    watch: false,
    max_memory_restart: '300M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: './logs/seed-comments-error.log',
    out_file: './logs/seed-comments-out.log',
    merge_logs: true
  }]
};
