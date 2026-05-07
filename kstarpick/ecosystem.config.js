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
      exp_backoff_restart_delay: 1000,
      max_restarts: 10,
      min_uptime: 10000,
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
      max_memory_restart: '500M',
      kill_timeout: 10000,
      error_file: '/doohub/service/kstarpick/logs/news-crawler-error.log',
      out_file: '/doohub/service/kstarpick/logs/news-crawler-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'schedule-crawler',
      script: './scripts/schedule-crawler.js',
      cwd: '/doohub/service/kstarpick',
      env: {
        NODE_ENV: 'production',
        API_BASE: 'http://localhost:13001'
      },
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      kill_timeout: 10000,
      error_file: '/doohub/service/kstarpick/logs/schedule-crawler-error.log',
      out_file: '/doohub/service/kstarpick/logs/schedule-crawler-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'celeb-updater',
      script: './scripts/celeb-updater.js',
      cwd: '/doohub/service/kstarpick',
      env: {
        NODE_ENV: 'production',
        API_BASE: 'http://localhost:13001'
      },
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      error_file: '/doohub/service/kstarpick/logs/celeb-updater-error.log',
      out_file: '/doohub/service/kstarpick/logs/celeb-updater-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'music-chart',
      script: './scripts/music-chart-updater.js',
      cwd: '/doohub/service/kstarpick',
      env: {
        NODE_ENV: 'production'
      },
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      error_file: '/doohub/service/kstarpick/logs/music-chart-error.log',
      out_file: '/doohub/service/kstarpick/logs/music-chart-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'drama-crawler',
      script: './scripts/drama-crawler.js',
      node_args: '--expose-gc',
      cwd: '/doohub/service/kstarpick',
      env: {
        NODE_ENV: 'production'
      },
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      kill_timeout: 10000,
      error_file: '/doohub/service/kstarpick/logs/drama-crawler-error.log',
      out_file: '/doohub/service/kstarpick/logs/drama-crawler-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'self-heal',
      script: './scripts/self-heal.sh',
      interpreter: 'bash',
      cwd: '/doohub/service/kstarpick',
      autorestart: false,
      cron_restart: '*/5 * * * *',
      watch: false,
      out_file: '/doohub/service/kstarpick/logs/self-heal-out.log',
      error_file: '/doohub/service/kstarpick/logs/self-heal-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'youtube-news-crawler',
      script: './scripts/youtube-news-crawler.js',
      cwd: '/doohub/service/kstarpick',
      env: {
        NODE_ENV: 'production'
      },
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      error_file: '/doohub/service/kstarpick/logs/youtube-news-error.log',
      out_file: '/doohub/service/kstarpick/logs/youtube-news-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
