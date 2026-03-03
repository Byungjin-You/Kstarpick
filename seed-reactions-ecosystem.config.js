module.exports = {
  apps: [{
    name: 'seed-reactions',
    script: './seed-reactions-runner.js',
    cwd: '/doohub/service/kstarpick',
    cron_restart: '0 */6 * * *',  // 매 6시간마다 (0시, 6시, 12시, 18시)
    autorestart: false,             // 실행 후 자동 재시작 안 함
    watch: false,
    max_memory_restart: '200M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: '/doohub/service/kstarpick/logs/seed-reactions-error.log',
    out_file: '/doohub/service/kstarpick/logs/seed-reactions-out.log',
    merge_logs: true
  }]
};
