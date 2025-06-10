/**
 * Script de vérification quotidienne des cookies pour MonkeyPadel
 * Vérifie si les cookies vont expirer dans moins de 3 jours et les rafraîchit si nécessaire
 * À exécuter tous les jours à 8h du matin via PM2
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const fs = require('fs');
const path = require('path');

// Chemin vers le fichier de cookies
const cookiePath = path.join(__dirname, 'cookies.json');

// Référence à la fonction de rafraîchissement des cookies
const refreshFunction = () => require('./index.js').refreshCookies();

// Nombre de jours avant expiration pour déclencher un rafraîchissement
const DAYS_THRESHOLD = 3;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Vérifie si les cookies vont expirer bientôt
 * @returns {Promise<void>}
 */
async function checkAndRefreshCookies() {
  console.log(`Vérification des cookies pour MonkeyPadel...`);
  
  try {
    // Vérifier si le fichier de cookies existe
    if (!fs.existsSync(cookiePath)) {
      console.log(`Aucun fichier de cookies trouvé pour MonkeyPadel, rafraîchissement forcé...`);
      await refreshFunction();
      return;
    }
    
    // Lire le fichier de cookies
    const cookieData = JSON.parse(fs.readFileSync(cookiePath, 'utf8'));
    
    // Vérifier la date d'expiration
    if (!cookieData.expiresAt) {
      console.log(`Date d'expiration non trouvée pour MonkeyPadel, rafraîchissement forcé...`);
      await refreshFunction();
      return;
    }
    
    const now = Date.now();
    const expiryDate = new Date(cookieData.expiresAt);
    const daysUntilExpiry = (cookieData.expiresAt - now) / MS_PER_DAY;
    
    console.log(`Cookies de MonkeyPadel expirent le ${expiryDate.toLocaleString()} (dans ${daysUntilExpiry.toFixed(1)} jours)`);
    
    // Si les cookies expirent dans moins de DAYS_THRESHOLD jours, les rafraîchir
    if (daysUntilExpiry < DAYS_THRESHOLD) {
      console.log(`Les cookies de MonkeyPadel expirent dans moins de ${DAYS_THRESHOLD} jours, rafraîchissement...`);
      await refreshFunction();
      console.log(`Cookies de MonkeyPadel rafraîchis avec succès !`);
    } else {
      console.log(`Les cookies de MonkeyPadel sont encore valides pour ${daysUntilExpiry.toFixed(1)} jours, aucune action nécessaire.`);
    }
  } catch (error) {
    console.error(`Erreur lors de la vérification des cookies pour MonkeyPadel:`, error);
    
    // En cas d'erreur, tenter de rafraîchir les cookies
    try {
      console.log(`Tentative de rafraîchissement des cookies pour MonkeyPadel après erreur...`);
      await refreshFunction();
      console.log(`Cookies de MonkeyPadel rafraîchis avec succès après erreur !`);
    } catch (refreshError) {
      console.error(`Échec du rafraîchissement des cookies pour MonkeyPadel après erreur:`, refreshError);
    }
  }
}

/**
 * Fonction principale
 */
async function main() {
  console.log(`=== Vérification quotidienne des cookies MonkeyPadel (${new Date().toLocaleString()}) ===`);
  
  await checkAndRefreshCookies();
  
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
