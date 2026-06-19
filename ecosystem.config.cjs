module.exports = {
  apps: [
    {
      name: 'attendance',
      script: 'npx',
      args: 'tsx src/server/index.ts',
      cwd: '/var/www/attendance',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
        API_KEY: process.env.API_KEY || '',
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
    },
  ],
};
