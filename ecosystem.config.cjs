module.exports = {
  apps: [{
    name: 'llm-calc',
    script: 'node_modules/.bin/next',
    args: 'start -p 8009',
    cwd: __dirname,
    env: {
      NODE_ENV: 'production',
      PORT: '8009',
    },
    instances: 1,
    autorestart: true,
    max_memory_restart: '512M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }],
};
