/**
 * Script de rafraîchissement automatique des cookies
 * À exécuter régulièrement via un cron job (par exemple, tous les jours)
 * 
 * Exemple de crontab:
 * 0 0 * * * node /chemin/vers/refreshCookies.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const fs = require('fs');
const CookieManager = require('./cookieManager');

// Configuration
const config = {
  baseUrl: 'https://openresa.com',
  clubUrl: 'https://openresa.com/club/themonkeypadel',
  loginUrl: 'https://openresa.com/login',
  reservationUrl: 'https://openresa.com/reservation/',
  credentials: {
    username: process.env.MONKEYPADEL_USERNAME,
    password: process.env.MONKEYPADEL_PASSWORD
  },
  cookieValidityDuration: 30 * 24 * 60 * 60 * 1000 // 30 jours par défaut
};

// Vérifier que les variables d'environnement sont définies
if (!config.credentials.username || !config.credentials.password) {
  console.error('Erreur: Les identifiants MONKEYPADEL_USERNAME et MONKEYPADEL_PASSWORD doivent être définis dans le fichier .env');
  process.exit(1);
}

// Initialiser le gestionnaire de cookies
const cookieManager = new CookieManager(config);

/**
 * Vérifie si les cookies doivent être rafraîchis
 * @returns {Promise<void>}
 */
async function checkAndRefreshCookies() {
  try {
    console.log('Vérification des cookies pour MonkeyPadel...');
    
    // Chemin du fichier de cache
    const cookieCachePath = path.join(__dirname, 'cookies.json');
    
    // Vérifier si le fichier de cache existe
    if (!fs.existsSync(cookieCachePath)) {
      console.log('Aucun fichier de cache trouvé. Création de nouveaux cookies...');
      await cookieManager.login(true);
      console.log('Cookies créés avec succès.');
      process.exit(0);
    }
    
    // Lire le fichier de cache
    const cookieCache = JSON.parse(fs.readFileSync(cookieCachePath, 'utf8'));
    
    // Vérifier chaque cookie pour trouver ceux qui expirent bientôt
    const now = Date.now();
    const twoDaysInMs = 2 * 24 * 60 * 60 * 1000; // 2 jours en millisecondes
    let needsRefresh = false;
    let earliestExpiry = null;
    
    // Parcourir tous les cookies pour trouver la date d'expiration la plus proche
    for (const cookie of cookieCache.cookies) {
      if (cookie.expires && cookie.expires !== -1) { // Ignorer les cookies de session (-1)
        const expiryTimestamp = cookie.expires * 1000; // Convertir en millisecondes
        
        // Vérifier si le cookie expire dans moins de 2 jours
        if (expiryTimestamp - now < twoDaysInMs) {
          console.log(`Cookie ${cookie.name} expire bientôt: ${new Date(expiryTimestamp).toLocaleString()}`);
          needsRefresh = true;
        }
        
        // Mettre à jour la date d'expiration la plus proche
        if (earliestExpiry === null || expiryTimestamp < earliestExpiry) {
          earliestExpiry = expiryTimestamp;
        }
      }
    }
    
    // Vérifier également la date d'expiration globale du cache
    if (cookieCache.expiresAt && cookieCache.expiresAt - now < twoDaysInMs) {
      console.log(`Le cache de cookies expire bientôt: ${new Date(cookieCache.expiresAt).toLocaleString()}`);
      needsRefresh = true;
    }
    
    // Rafraîchir les cookies si nécessaire
    if (needsRefresh) {
      console.log('Rafraîchissement des cookies...');
      await cookieManager.login(true);
      console.log('Cookies rafraîchis avec succès.');
    } else {
      console.log('Les cookies sont encore valides.');
      if (earliestExpiry) {
        const daysUntilExpiry = Math.floor((earliestExpiry - now) / (24 * 60 * 60 * 1000));
        console.log(`Le cookie le plus proche expire dans ${daysUntilExpiry} jours (${new Date(earliestExpiry).toLocaleString()}).`);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Erreur lors de la vérification/rafraîchissement des cookies:', error);
    process.exit(1);
  }
}

// Exécuter la vérification
checkAndRefreshCookies();
