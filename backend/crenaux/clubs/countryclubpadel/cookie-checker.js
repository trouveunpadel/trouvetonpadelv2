/**
 * Script de vérification quotidienne des cookies pour Country Club Padel
 * Vérifie si les cookies vont expirer dans les 3 prochains jours et les rafraîchit si nécessaire
 */

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const CookieManager = require('./cookieManager');

// Charger les variables d'environnement
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

/**
 * Vérifie si les cookies vont expirer dans les 3 prochains jours
 * @returns {boolean} - true si les cookies doivent être rafraîchis
 */
function shouldRefreshCookies() {
  const cookieCacheFile = path.join(__dirname, 'cookies-cache.json');
  
  try {
    // Vérifier si le fichier de cache existe
    if (!fs.existsSync(cookieCacheFile)) {
      console.log('Aucun fichier de cache de cookies trouvé pour Country Club Padel');
      return true;
    }
    
    // Lire le fichier de cache
    const cacheData = JSON.parse(fs.readFileSync(cookieCacheFile, 'utf8'));
    
    // Vérifier si les données de cache sont valides
    if (!cacheData || !cacheData.expiresAt) {
      console.log('Données de cache de cookies invalides pour Country Club Padel');
      return true;
    }
    
    // Calculer la date d'expiration dans 3 jours
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    
    // Vérifier si les cookies expirent dans les 3 prochains jours
    if (cacheData.expiresAt < threeDaysFromNow.getTime()) {
      console.log('Les cookies Country Club Padel vont expirer dans moins de 3 jours');
      return true;
    }
    
    console.log('Les cookies Country Club Padel sont valides pour plus de 3 jours');
    return false;
  } catch (error) {
    console.error('Erreur lors de la vérification des cookies Country Club Padel:', error.message);
    return true;
  }
}

/**
 * Fonction principale
 */
async function main() {
  console.log('=== Vérification quotidienne des cookies Country Club Padel ===');
  console.log(`Date d'exécution: ${new Date().toLocaleString()}`);
  
  try {
    // Vérifier si les cookies doivent être rafraîchis
    if (shouldRefreshCookies()) {
      console.log('Rafraîchissement des cookies Country Club Padel...');
      
      // Récupérer les identifiants depuis les variables d'environnement
      let username = process.env.COUNTRYCLUBPADEL_USERNAME;
      let password = process.env.COUNTRYCLUBPADEL_PASSWORD;
      
      // Nettoyer les identifiants (enlever les guillemets si présents)
      if (username) username = username.replace(/^["'](.*)["']$/, '$1');
      if (password) password = password.replace(/^["'](.*)["']$/, '$1');
      
      if (!username || !password) {
        throw new Error('Variables d\'environnement COUNTRYCLUBPADEL_USERNAME ou COUNTRYCLUBPADEL_PASSWORD manquantes');
      }
      
      // Initialiser le gestionnaire de cookies
      const cookieManager = new CookieManager(username, password);
      
      // Rafraîchir les cookies
      await cookieManager.refreshCookies();
      console.log('Cookies Country Club Padel rafraîchis avec succès');
    } else {
      console.log('Pas besoin de rafraîchir les cookies Country Club Padel');
    }
  } catch (error) {
    console.error('Erreur lors du rafraîchissement des cookies Country Club Padel:', error.message);
    process.exit(1);
  }
}

// Exécuter la fonction principale
main().catch(error => {
  console.error('Erreur non gérée:', error);
  process.exit(1);
});
