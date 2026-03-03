module.exports = {
  apps: [{
    name: 'seed-comments',
    script: './seed-comments-runner.js',
    cwd: '/doohub/service/kstarpick',
    cron_restart: '30 */6 * * *',  // 매 6시간 30분 (0:30, 6:30, 12:30, 18:30) - 리액션 시드와 30분 오프셋
    autorestart: false,
    watch: false,
    max_memory_restart: '300M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: '/doohub/service/kstarpick/logs/seed-comments-error.log',
    out_file: '/doohub/service/kstarpick/logs/seed-comments-out.log',
    merge_logs: true
  }]
};
