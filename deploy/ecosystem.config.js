module.exports = {
  apps: [
    {
      name: 'nefol-backend',
      script: './backend/dist/index.js',
      cwd: '/var/www/nefol',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 2000,
        HOST: '0.0.0.0',
        DATABASE_URL: 'postgresql://nofol_users:Anoopnefoldb@localhost:5432/nefol'
      },
      error_file: '/var/log/pm2/nefol-backend-error.log',
      out_file: '/var/log/pm2/nefol-backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    }
  ]
}

