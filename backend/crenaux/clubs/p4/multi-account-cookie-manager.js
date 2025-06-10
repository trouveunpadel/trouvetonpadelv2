/**
 * Gestionnaire de cookies multi-comptes pour P4 Padel Indoor
 * Permet de gérer les cookies de plusieurs comptes et de les rafraîchir automatiquement
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { setTimeout } = require('timers/promises');

// Charger les variables d'environnement
const dotenvPath = path.join(__dirname, '../../.env');
require('dotenv').config({ path: dotenvPath });

// Constantes
const BASE_URL = 'https://p4-padel-indoor.gestion-sports.com';
const COOKIES_DIR = path.join(__dirname, 'cookies');

// Vérifier si les variables d'environnement sont chargées
console.log('Variables d\'environnement P4:');
console.log(`P4_EMAIL_1: ${process.env.P4_EMAIL_1 ? 'OK' : 'NON DÉFINI'}`);
console.log(`P4_EMAIL_2: ${process.env.P4_EMAIL_2 ? 'OK' : 'NON DÉFINI'}`);
console.log(`P4_EMAIL_3: ${process.env.P4_EMAIL_3 ? 'OK' : 'NON DÉFINI'}`);

const ACCOUNTS = [
  {
    id: 'account1',
    email: process.env.P4_EMAIL_1 || 'trouveunpadel@gmx.fr',
    password: process.env.P4_PASSWORD_1 || 'KYt770rBNbTv8mp',
    cookieFile: path.join(COOKIES_DIR, 'account1-cookies.json')
  },
  {
    id: 'account2',
    email: process.env.P4_EMAIL_2 || 'trouvetonpadel2@example.com',
    password: process.env.P4_PASSWORD_2 || 'MotDePasse123',
    cookieFile: path.join(COOKIES_DIR, 'account2-cookies.json')
  },
  {
    id: 'account3',
    email: process.env.P4_EMAIL_3 || 'trouvetonpadel3@example.com',
    password: process.env.P4_PASSWORD_3 || 'MotDePasse456',
    cookieFile: path.join(COOKIES_DIR, 'account3-cookies.json')
  }
];

// Créer le répertoire des cookies s'il n'existe pas
if (!fs.existsSync(COOKIES_DIR)) {
  fs.mkdirSync(COOKIES_DIR, { recursive: true });
}

/**
 * Vérifie si les identifiants sont configurés pour un compte
 * @param {Object} account - Compte à vérifier
 * @returns {boolean} True si les identifiants sont configurés
 */
function hasCredentials(account) {
  return account.email && account.password;
}

/**
 * Récupère les cookies pour un compte
 * @param {Object} account - Compte pour lequel récupérer les cookies
 * @returns {Promise<boolean>} True si la récupération a réussi
 */
async function getCookiesForAccount(account) {
  console.log(`Récupération des cookies pour ${account.id} (${account.email})...`);
  
  if (!hasCredentials(account)) {
    console.error(`❌ Identifiants manquants pour ${account.id}`);
    return false;
  }
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Activer les logs de console
    page.on('console', msg => console.log(`PAGE LOG (${account.id}):`, msg.text()));
    
    // Navigation vers la page de connexion
    console.log(`Navigation vers la page de connexion pour ${account.id}...`);
    await page.goto(`${BASE_URL}/connexion.php`, { waitUntil: 'networkidle2' });
    
    // Attendre un délai aléatoire
    await setTimeout(Math.floor(Math.random() * 2000) + 1000);
    
    // Processus de connexion en deux étapes
    console.log(`Connexion pour ${account.id}...`);
    
    // Étape 1: Saisir l'email et cliquer sur le bouton "Connexion / Inscription"
    await page.waitForSelector('input[name="email"][type="text"]');
    
    // Simuler une saisie humaine
    const emailInput = await page.$('input[name="email"][type="text"]');
    await emailInput.click();
    
    // Effacer le champ
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    
    // Saisir l'email caractère par caractère
    for (const char of account.email) {
      await page.keyboard.type(char);
      await setTimeout(Math.floor(Math.random() * 100) + 50);
    }
    
    // Attendre un délai aléatoire
    await setTimeout(Math.floor(Math.random() * 1000) + 500);
    
    // Cliquer sur le bouton "Connexion / Inscription"
    const loginButtons = await page.$$('button');
    let connectionButton = null;
    
    for (const button of loginButtons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text.includes('Connexion / Inscription')) {
        connectionButton = button;
        break;
      }
    }
    
    if (!connectionButton) {
      console.log(`❌ Bouton "Connexion / Inscription" non trouvé pour ${account.id}`);
      return false;
    }
    
    await connectionButton.click();
    
    // Attendre que le champ de mot de passe apparaisse
    await page.waitForSelector('input[name="pass"][type="password"]', { timeout: 10000 });
    
    // Attendre un délai aléatoire
    await setTimeout(Math.floor(Math.random() * 1000) + 500);
    
    // Étape 2: Saisir le mot de passe et cliquer sur "Se connecter"
    const passwordInput = await page.$('input[name="pass"][type="password"]');
    await passwordInput.click();
    
    // Saisir le mot de passe caractère par caractère
    for (const char of account.password) {
      await page.keyboard.type(char);
      await setTimeout(Math.floor(Math.random() * 100) + 50);
    }
    
    // Attendre un délai aléatoire
    await setTimeout(Math.floor(Math.random() * 1000) + 500);
    
    // Cliquer sur le bouton "Se connecter"
    const submitButtons = await page.$$('button[type="submit"]');
    let loginButton = null;
    
    for (const button of submitButtons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text.includes('Se connecter')) {
        loginButton = button;
        break;
      }
    }
    
    if (!loginButton) {
      console.log(`❌ Bouton "Se connecter" non trouvé pour ${account.id}`);
      return false;
    }
    
    await loginButton.click();
    
    // Attendre la navigation après connexion
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    
    // Vérifier si la connexion a réussi
    const isLoggedIn = await page.evaluate(() => {
      return !document.body.textContent.includes('Connexion') && 
             !document.body.textContent.includes('Inscription');
    });
    
    if (!isLoggedIn) {
      console.log(`❌ Échec de la connexion pour ${account.id}`);
      return false;
    }
    
    // Récupérer les cookies
    console.log(`Récupération des cookies pour ${account.id}...`);
    const cookies = await page.cookies();
    console.log(`${cookies.length} cookies récupérés pour ${account.id}`);
    
    // Calculer la date d'expiration (30 jours par défaut)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    
    // Trouver la date d'expiration la plus proche parmi tous les cookies importants
    // Nous nous concentrons principalement sur le cookie COOK_USER qui est le plus important
    let realExpiryDate = new Date();
    realExpiryDate.setFullYear(realExpiryDate.getFullYear() + 10); // Date très éloignée
    
    // Chercher d'abord le cookie COOK_USER qui est le plus important
    const cookUserCookie = cookies.find(cookie => cookie.name === 'COOK_USER');
    
    if (cookUserCookie && cookUserCookie.expires) {
      realExpiryDate = new Date(cookUserCookie.expires * 1000);
      console.log(`Cookie COOK_USER trouvé, expire le: ${realExpiryDate.toISOString()} (${new Date(cookUserCookie.expires * 1000).toLocaleString()})`); 
    } else {
      // Si pas de COOK_USER, on prend la date d'expiration la plus proche
      for (const cookie of cookies) {
        if (cookie.expires) {
          const cookieExpiry = new Date(cookie.expires * 1000);
          if (cookieExpiry < realExpiryDate) {
            realExpiryDate = cookieExpiry;
          }
        }
      }
    }
    
    // Sauvegarder les cookies
    const cookieData = {
      cookies,
      expiryDate: realExpiryDate.toISOString()
    };
    
    fs.writeFileSync(account.cookieFile, JSON.stringify(cookieData, null, 2));
    console.log(`✅ Cookies sauvegardés pour ${account.id} (expire le ${realExpiryDate.toISOString()})`);
    
    return true;
  } catch (error) {
    console.error(`❌ Erreur lors de la récupération des cookies pour ${account.id}:`, error.message);
    return false;
  } finally {
    await browser.close();
  }
}

/**
 * Récupère les cookies pour tous les comptes configurés
 * @returns {Promise<Object>} Résultats de la récupération des cookies
 */
async function getAllCookies() {
  console.log('Récupération des cookies pour tous les comptes...');
  
  const results = {
    success: 0,
    failed: 0,
    accounts: {}
  };
  
  // Récupérer les cookies pour chaque compte
  for (const account of ACCOUNTS) {
    if (hasCredentials(account)) {
      const success = await getCookiesForAccount(account);
      
      results.accounts[account.id] = {
        email: account.email,
        success
      };
      
      if (success) {
        results.success++;
      } else {
        results.failed++;
      }
      
      // Attendre entre chaque compte pour éviter la détection
      if (ACCOUNTS.indexOf(account) < ACCOUNTS.length - 1) {
        const delay = Math.floor(Math.random() * 5000) + 5000;
        console.log(`Attente de ${delay}ms avant le prochain compte...`);
        await setTimeout(delay);
      }
    } else {
      console.log(`⚠️ Compte ${account.id} ignoré (identifiants manquants)`);
    }
  }
  
  console.log(`Récupération terminée: ${results.success} réussis, ${results.failed} échoués`);
  return results;
}

/**
 * Vérifie si les cookies d'un compte doivent être rafraîchis
 * @param {Object} account - Compte à vérifier
 * @param {number} daysBeforeExpiry - Nombre de jours avant expiration pour rafraîchir
 * @returns {Object} Résultat de la vérification
 */
function checkCookieExpiration(account, daysBeforeExpiry = 3) {
  console.log(`Vérification de l'expiration des cookies pour ${account.id}...`);
  
  try {
    if (!fs.existsSync(account.cookieFile)) {
      console.log(`${account.id}: Fichier de cookies inexistant`);
      return {
        needsRefresh: true,
        reason: 'Fichier de cookies inexistant'
      };
    }
    
    const cookieData = JSON.parse(fs.readFileSync(account.cookieFile, 'utf8'));
    
    if (!cookieData || !cookieData.expiryDate) {
      console.log(`${account.id}: Données de cookies invalides`);
      return {
        needsRefresh: true,
        reason: 'Données de cookies invalides'
      };
    }
    
    const expiryDate = new Date(cookieData.expiryDate);
    const now = new Date();
    const refreshThreshold = new Date();
    refreshThreshold.setDate(refreshThreshold.getDate() + daysBeforeExpiry);
    
    console.log(`${account.id}: Date d'expiration: ${expiryDate.toISOString()} (${expiryDate.toLocaleString()})`);
    console.log(`${account.id}: Date actuelle: ${now.toISOString()} (${now.toLocaleString()})`);
    console.log(`${account.id}: Seuil de rafraîchissement: ${refreshThreshold.toISOString()} (${refreshThreshold.toLocaleString()})`);
    
    // Vérifier si les cookies sont expirés
    if (expiryDate <= now) {
      console.log(`${account.id}: Cookies expirés`);
      return {
        needsRefresh: true,
        reason: 'Cookies expirés',
        expiryDate: expiryDate.toISOString()
      };
    }
    
    // Vérifier si les cookies expirent bientôt
    if (expiryDate <= refreshThreshold) {
      const daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
      console.log(`${account.id}: Cookies expirent dans ${daysRemaining} jours`);
      return {
        needsRefresh: true,
        reason: `Cookies expirent dans moins de ${daysBeforeExpiry} jours`,
        expiryDate: expiryDate.toISOString(),
        daysRemaining: daysRemaining
      };
    }
    
    // Les cookies sont valides et n'expirent pas bientôt
    const daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
    console.log(`${account.id}: Cookies valides, expirent dans ${daysRemaining} jours`);
    return {
      needsRefresh: false,
      reason: 'Cookies valides',
      expiryDate: expiryDate.toISOString(),
      daysRemaining: daysRemaining
    };
  } catch (error) {
    console.error(`Erreur lors de la vérification des cookies pour ${account.id}:`, error.message);
    return {
      needsRefresh: true,
      reason: `Erreur: ${error.message}`
    };
  }
}

/**
 * Vérifie et rafraîchit les cookies pour tous les comptes si nécessaire
 * @param {number} daysBeforeExpiry - Nombre de jours avant expiration pour rafraîchir
 * @returns {Promise<Object>} Résultats de la vérification et du rafraîchissement
 */
async function checkAndRefreshAllCookies(daysBeforeExpiry = 3) {
  console.log(`Vérification et rafraîchissement des cookies (seuil: ${daysBeforeExpiry} jours)...`);
  
  const results = {
    checked: 0,
    refreshed: 0,
    failed: 0,
    accounts: {}
  };
  
  for (const account of ACCOUNTS) {
    if (hasCredentials(account)) {
      results.checked++;
      
      const checkResult = checkCookieExpiration(account, daysBeforeExpiry);
      console.log(`${account.id}: ${checkResult.reason}`);
      
      results.accounts[account.id] = {
        email: account.email,
        checkResult
      };
      
      if (checkResult.needsRefresh) {
        console.log(`Rafraîchissement des cookies pour ${account.id}...`);
        const refreshSuccess = await getCookiesForAccount(account);
        
        results.accounts[account.id].refreshed = refreshSuccess;
        
        if (refreshSuccess) {
          results.refreshed++;
        } else {
          results.failed++;
        }
        
        // Attendre entre chaque rafraîchissement pour éviter la détection
        if (ACCOUNTS.indexOf(account) < ACCOUNTS.length - 1) {
          const delay = Math.floor(Math.random() * 5000) + 5000;
          console.log(`Attente de ${delay}ms avant le prochain compte...`);
          await setTimeout(delay);
        }
      }
    } else {
      console.log(`⚠️ Compte ${account.id} ignoré (identifiants manquants)`);
    }
  }
  
  console.log(`Vérification terminée: ${results.checked} vérifiés, ${results.refreshed} rafraîchis, ${results.failed} échoués`);
  return results;
}

/**
 * Obtient les cookies pour un compte spécifique
 * @param {string} accountId - ID du compte (account1, account2, account3)
 * @returns {Object|null} Données des cookies ou null si non disponibles
 */
function getCookies(accountId = 'account1') {
  const account = ACCOUNTS.find(a => a.id === accountId);
  
  if (!account) {
    console.error(`Compte ${accountId} non trouvé`);
    return null;
  }
  
  try {
    if (!fs.existsSync(account.cookieFile)) {
      console.error(`Fichier de cookies inexistant pour ${accountId}`);
      return null;
    }
    
    const cookieData = JSON.parse(fs.readFileSync(account.cookieFile, 'utf8'));
    return cookieData;
  } catch (error) {
    console.error(`Erreur lors de la lecture des cookies pour ${accountId}:`, error.message);
    return null;
  }
}

/**
 * Obtient l'en-tête Cookie pour un compte spécifique
 * @param {string} accountId - ID du compte (account1, account2, account3)
 * @returns {string|null} En-tête Cookie ou null si non disponible
 */
function getCookieHeader(accountId = 'account1') {
  const cookieData = getCookies(accountId);
  
  if (!cookieData || !cookieData.cookies || !Array.isArray(cookieData.cookies)) {
    return null;
  }
  
  return cookieData.cookies
    .map(cookie => `${cookie.name}=${cookie.value}`)
    .join('; ');
}

// Variable pour suivre le dernier compte utilisé
let lastAccountIndex = -1;

/**
 * Obtient le prochain compte disponible (non expiré) en rotation
 * @returns {Object|null} Compte disponible ou null si aucun
 */
function getNextAvailableAccount() {
  // Filtrer les comptes disponibles (avec credentials et cookies valides)
  const availableAccounts = [];
  
  for (const account of ACCOUNTS) {
    if (hasCredentials(account)) {
      const checkResult = checkCookieExpiration(account);
      
      if (!checkResult.needsRefresh) {
        availableAccounts.push({
          id: account.id,
          email: account.email,
          cookieHeader: getCookieHeader(account.id),
          expiryDate: checkResult.expiryDate,
          daysRemaining: checkResult.daysRemaining
        });
      }
    }
  }
  
  // Si aucun compte disponible
  if (availableAccounts.length === 0) {
    console.warn('[ALERTE] Aucun compte avec des cookies valides n\'est disponible. Essayez de rafraîchir les cookies.');
    return null;
  }
  
  // Sélectionner le prochain compte en rotation
  lastAccountIndex = (lastAccountIndex + 1) % availableAccounts.length;
  const selectedAccount = availableAccounts[lastAccountIndex];
  
  console.log(`[DEBUG] Utilisation du compte ${selectedAccount.id} (${lastAccountIndex + 1}/${availableAccounts.length})`);
  return selectedAccount;
}

// Exporter les fonctions
module.exports = {
  getAllCookies,
  checkAndRefreshAllCookies,
  getCookies,
  getCookieHeader,
  getNextAvailableAccount,
  ACCOUNTS
};

// Si le script est exécuté directement
if (require.main === module) {
  getAllCookies();
}
