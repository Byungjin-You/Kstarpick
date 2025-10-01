// PM2 로컬 개발 환경 설정
module.exports = {
  apps: [
    {
      name: 'kstarpick-local',
      script: 'npm',
      args: 'run start:local',
      cwd: process.cwd(),
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/local-error.log',
      out_file: './logs/local-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'kstarpick-local-dev',
      script: 'npm',
      args: 'run dev:local',
      cwd: process.cwd(),
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: [
        'pages',
        'components',
        'lib',
        'utils',
        'models',
        'styles'
      ],
      ignore_watch: [
        'node_modules',
        '.next',
        '.git',
        'logs',
        '*.log'
      ],
      max_memory_restart: '1G',
      error_file: './logs/local-dev-error.log',
      out_file: './logs/local-dev-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};