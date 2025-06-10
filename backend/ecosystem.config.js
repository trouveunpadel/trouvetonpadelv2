module.exports = {
  apps: [
    {
      name: 'trouvetonpadel-backend',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'trouvetonpadel-monitoring',
      script: 'start-monitoring.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'p4-cookie-check',
      script: './clubs/p4/check-cookies-daily.js',
      instances: 1,
      autorestart: false,
      watch: false,
      cron_restart: '0 8 * * *', // Exécuter tous les jours à 8h du matin
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'monkeypadel-cookie-check',
      script: './clubs/monkeypadel/check-cookies-daily.js',
      instances: 1,
      autorestart: false,
      watch: false,
      cron_restart: '0 8 * * *', // Exécuter tous les jours à 8h du matin
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
};
