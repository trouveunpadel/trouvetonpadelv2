/**
 * Script de vérification quotidienne des cookies
 * Vérifie si les cookies vont expirer dans moins de 3 jours et les rafraîchit si nécessaire
 * À exécuter tous les jours à 8h du matin via cron
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Liste des modules à vérifier
const modules = [
  {
    name: 'MonkeyPadel',
    cookiePath: path.join(__dirname, 'clubs', 'monkeypadel', 'cookies.json'),
    refreshFunction: () => require('./clubs/monkeypadel/index.js').refreshCookies()
  }
  // Ajouter d'autres modules ici si nécessaire
];

// Nombre de jours avant expiration pour déclencher un rafraîchissement
const DAYS_THRESHOLD = 3;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Vérifie si les cookies d'un module vont expirer bientôt
 * @param {Object} module - Module à vérifier
 * @returns {Promise<void>}
 */
async function checkAndRefreshCookies(module) {
  console.log(`Vérification des cookies pour ${module.name}...`);
  
  try {
    // Vérifier si le fichier de cookies existe
    if (!fs.existsSync(module.cookiePath)) {
      console.log(`Aucun fichier de cookies trouvé pour ${module.name}, rafraîchissement forcé...`);
      await module.refreshFunction();
      return;
    }
    
    // Lire le fichier de cookies
    const cookieData = JSON.parse(fs.readFileSync(module.cookiePath, 'utf8'));
    
    // Vérifier la date d'expiration
    if (!cookieData.expiresAt) {
      console.log(`Date d'expiration non trouvée pour ${module.name}, rafraîchissement forcé...`);
      await module.refreshFunction();
      return;
    }
    
    const now = Date.now();
    const expiryDate = new Date(cookieData.expiresAt);
    const daysUntilExpiry = (cookieData.expiresAt - now) / MS_PER_DAY;
    
    console.log(`Cookies de ${module.name} expirent le ${expiryDate.toLocaleString()} (dans ${daysUntilExpiry.toFixed(1)} jours)`);
    
    // Si les cookies expirent dans moins de DAYS_THRESHOLD jours, les rafraîchir
    if (daysUntilExpiry < DAYS_THRESHOLD) {
      console.log(`Les cookies de ${module.name} expirent dans moins de ${DAYS_THRESHOLD} jours, rafraîchissement...`);
      await module.refreshFunction();
      console.log(`Cookies de ${module.name} rafraîchis avec succès !`);
    } else {
      console.log(`Les cookies de ${module.name} sont encore valides pour ${daysUntilExpiry.toFixed(1)} jours, aucune action nécessaire.`);
    }
  } catch (error) {
    console.error(`Erreur lors de la vérification des cookies pour ${module.name}:`, error);
    
    // En cas d'erreur, tenter de rafraîchir les cookies
    try {
      console.log(`Tentative de rafraîchissement des cookies pour ${module.name} après erreur...`);
      await module.refreshFunction();
      console.log(`Cookies de ${module.name} rafraîchis avec succès après erreur !`);
    } catch (refreshError) {
      console.error(`Échec du rafraîchissement des cookies pour ${module.name} après erreur:`, refreshError);
    }
  }
}

/**
 * Fonction principale
 */
async function main() {
  console.log(`=== Vérification quotidienne des cookies (${new Date().toLocaleString()}) ===`);
  
  // Vérifier chaque module séquentiellement
  for (const module of modules) {
    await checkAndRefreshCookies(module);
  }
  
  console.log('Vérification terminée !');
}

// Exécuter la fonction principale
main()
  .then(() => {
    console.log('Script terminé avec succès.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erreur lors de l\'exécution du script:', error);
    process.exit(1);
  });
