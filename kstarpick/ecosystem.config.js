module.exports = {
  apps: [
    {
      name: 'kstarpick',
      script: 'npm',
      args: 'start',
      cwd: '/doohub/service/kstarpick',
      env: {
        NODE_ENV: 'production',
        PORT: 13001
      },
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/doohub/service/kstarpick/logs/kstarpick-error.log',
      out_file: '/doohub/service/kstarpick/logs/kstarpick-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'news-crawler',
      script: './scripts/auto-crawler.js',
      cwd: '/doohub/service/kstarpick',
      env: {
        NODE_ENV: 'production'
      },
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      error_file: '/doohub/service/kstarpick/logs/news-crawler-error.log',
      out_file: '/doohub/service/kstarpick/logs/news-crawler-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
