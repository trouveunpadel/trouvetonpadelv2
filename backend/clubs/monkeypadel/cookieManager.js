const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

/**
 * Gestionnaire de cookies pour OpenResa
 */
class CookieManager {
  constructor(config) {
    this.config = config;
    // Ajouter le chemin du fichier de cache à la configuration
    this.config.cookieCachePath = path.join(__dirname, 'cookies.json');
    this.refreshTimeoutId = null;
  }

  /**
   * Vérifie si les cookies en cache sont valides
   * @returns {Object|null} - Cookies valides ou null si invalides/inexistants
   */
  getValidCachedCookies() {
    try {
      // Vérifier si le fichier de cache existe
      if (!fs.existsSync(this.config.cookieCachePath)) {
        console.log('Aucun fichier de cache de cookies trouvé');
        return null;
      }
      
      // Lire le fichier de cache
      const cookieCache = JSON.parse(fs.readFileSync(this.config.cookieCachePath, 'utf8'));
      
      // Vérifier si les cookies sont encore valides
      const now = Date.now();
      
      // Vérifier que la date d'expiration est valide (postérieure à maintenant et pas trop ancienne)
      if (!cookieCache.expiresAt || cookieCache.expiresAt <= now || cookieCache.expiresAt < (now - 365 * 24 * 60 * 60 * 1000)) {
        console.log('Les cookies en cache pour MonkeyPadel ont expiré ou ont une date d\'expiration invalide');
        return null;
      }
      
      console.log(`Utilisation des cookies en cache pour MonkeyPadel (expire le ${new Date(cookieCache.expiresAt).toLocaleString()})`);
      
      // Formater les cookies pour les utiliser avec axios
      const cookieString = cookieCache.cookies
        .map(cookie => `${cookie.name}=${cookie.value}`)
        .join('; ');
      
      return cookieString;
    } catch (error) {
      console.error('Erreur lors de la lecture des cookies en cache:', error);
      return null;
    }
  }

  /**
   * Sauvegarde les cookies dans le cache
   * @param {Array} cookies - Cookies à sauvegarder (format Puppeteer)
   */
  saveCookiesToCache(cookies) {
    try {
      // Trouver la date d'expiration la plus proche parmi tous les cookies
      let earliestExpiry = null;
      let defaultExpiry = Date.now() + (30 * 24 * 60 * 60 * 1000); // Par défaut 30 jours
      
      for (const cookie of cookies) {
        if (cookie.expires) {
          const expiryTimestamp = cookie.expires * 1000; // Convertir en millisecondes
          if (expiryTimestamp > Date.now()) { // Vérifier que la date est future
            if (earliestExpiry === null || expiryTimestamp < earliestExpiry) {
              earliestExpiry = expiryTimestamp;
            }
          }
        }
      }
      
      // Si aucune date d'expiration valide n'est trouvée, utiliser la durée par défaut
      const expiryTimestamp = earliestExpiry !== null ? earliestExpiry : defaultExpiry;
      
      const cookieCache = {
        cookies,
        expiresAt: expiryTimestamp,
        createdAt: Date.now()
      };
      
      // Sauvegarder dans un fichier JSON
      fs.writeFileSync(this.config.cookieCachePath, JSON.stringify(cookieCache, null, 2));
      
      console.log(`Cookies sauvegardés dans le cache pour MonkeyPadel (expire le ${new Date(expiryTimestamp).toLocaleString()})`);
      
      // Vérifier si les cookies expirent bientôt, mais ne pas lancer de rafraîchissement automatique
      // pour éviter les boucles infinies
      const now = Date.now();
      const refreshThreshold = 2 * 24 * 60 * 60 * 1000; // 2 jours en millisecondes
      
      if (expiryTimestamp - now < refreshThreshold) {
        console.log('Les cookies expirent bientôt, mais le rafraîchissement automatique est désactivé pour éviter les boucles infinies.');
        // Ne pas appeler this.refreshCookies() ici pour éviter les boucles infinies
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des cookies dans le cache:', error);
    }
  }

  /**
   * Planifie le rafraîchissement des cookies avant leur expiration
   * @param {boolean} immediate - Si true, rafraîchit immédiatement
   */
  scheduleRefresh(immediate = false) {
    try {
      // Annuler tout rafraîchissement déjà planifié
      if (this.refreshTimeoutId) {
        clearTimeout(this.refreshTimeoutId);
        this.refreshTimeoutId = null;
      }
      
      if (immediate) {
        console.log('Rafraîchissement immédiat des cookies...');
        this.refreshCookies();
        return;
      }
      
      // Lire le fichier de cache
      if (!fs.existsSync(this.cookieCachePath)) {
        return;
      }
      
      const cookieCache = JSON.parse(fs.readFileSync(this.cookieCachePath, 'utf8'));
      
      // Calculer le temps avant expiration (en millisecondes)
      const timeUntilExpiry = cookieCache.expiresAt - Date.now();
      
      // Planifier le rafraîchissement 2 jours avant l'expiration
      const refreshTime = Math.max(timeUntilExpiry - 2 * 24 * 60 * 60 * 1000, 0);
      
      if (refreshTime === 0) {
        console.log('Les cookies expirent bientôt, rafraîchissement immédiat...');
        this.refreshCookies();
        return;
      }
      
      console.log(`Rafraîchissement des cookies planifié dans ${Math.floor(refreshTime / 1000 / 60 / 60)} heures`);
      
      this.refreshTimeoutId = setTimeout(() => {
        this.refreshCookies();
      }, refreshTime);
    } catch (error) {
      console.error('Erreur lors de la planification du rafraîchissement des cookies:', error);
    }
  }

  /**
   * Rafraîchit les cookies en se connectant à nouveau
   */
  async refreshCookies() {
    console.log('Rafraîchissement des cookies pour MonkeyPadel...');
    try {
      await this.login(true);
    } catch (error) {
      console.error('Erreur lors du rafraîchissement des cookies:', error);
      // Réessayer dans 30 minutes en cas d'échec
      this.refreshTimeoutId = setTimeout(() => {
        this.refreshCookies();
      }, 30 * 60 * 1000);
    }
  }

  /**
   * Se connecte à OpenResa et récupère les cookies de session
   * @param {boolean} forceRefresh - Forcer le rafraîchissement des cookies même s'ils sont valides
   * @returns {Promise<string>} - Cookies de session formatés pour les requêtes HTTP
   */
  async login(forceRefresh = false) {
    // Vérifier si des cookies valides sont en cache
    if (!forceRefresh) {
      const cachedCookies = this.getValidCachedCookies();
      if (cachedCookies) {
        return cachedCookies;
      }
    }
    
    console.log('Connexion à OpenResa pour MonkeyPadel...');
    
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      
      // Configurer les en-têtes pour ressembler à un navigateur normal
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:138.0) Gecko/20100101 Firefox/138.0');
      
      // Activer la journalisation de la console
      page.on('console', msg => console.log('Console du navigateur:', msg.text()));
      
      // Accéder directement à la page du club
      console.log('Accès à la page du club:', this.config.clubUrl);
      await page.goto(this.config.clubUrl, { waitUntil: 'networkidle2' });
      
      // Débogage désactivé en production
      
      // D'après le code source, nous pouvons directement remplir le formulaire de connexion
      console.log('Recherche du formulaire de connexion...');
      
      // Attendre que le formulaire de connexion soit chargé
      // Les sélecteurs exacts d'après le code source
      const usernameSelector = '#form-username';
      const passwordSelector = '#form-password';
      
      // Attendre que les champs soient disponibles
      try {
        await page.waitForSelector(usernameSelector, { timeout: 10000 });
        await page.waitForSelector(passwordSelector, { timeout: 10000 });
        console.log('Formulaire de connexion trouvé');
      } catch (error) {
        console.error('Impossible de trouver le formulaire de connexion:', error);
        throw new Error('Impossible de trouver le formulaire de connexion');
      }
      
      // Remplir le formulaire de connexion
      console.log('Remplissage du formulaire de connexion...');
      await page.type(usernameSelector, this.config.credentials.username);
      await page.type(passwordSelector, this.config.credentials.password);
      
      // Débogage désactivé en production
      
      // Cocher la case "Rester connecté(e)" si elle n'est pas déjà cochée
      const rememberCheckboxSelector = '#ch-remember';
      const isChecked = await page.evaluate((selector) => {
        const checkbox = document.querySelector(selector);
        return checkbox ? checkbox.checked : false;
      }, rememberCheckboxSelector);
      
      if (!isChecked) {
        await page.click(rememberCheckboxSelector);
      }
      
      // Soumettre le formulaire en cliquant sur le bouton de connexion
      console.log('Soumission du formulaire...');
      const loginButtonSelector = 'button[type="submit"]';
      
      try {
        await page.waitForSelector(loginButtonSelector, { timeout: 5000 });
        
        // Cliquer sur le bouton de connexion et attendre la navigation
        await Promise.all([
          page.click(loginButtonSelector),
          page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 })
        ]);
        
        console.log('Formulaire soumis avec succès');
      } catch (error) {
        console.error('Erreur lors de la soumission du formulaire:', error);
        
        // Essayer de soumettre le formulaire en appuyant sur Entrée
        console.log('Tentative de soumission du formulaire en appuyant sur Entrée...');
        await page.keyboard.press('Enter');
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch((err) => {
          console.log('Pas de navigation après avoir appuyé sur Entrée:', err);
        });
      }
      
      
      // Vérifier si la connexion a réussi
      console.log('Vérification de la connexion...');
      const isLoggedIn = await page.evaluate(() => {
        // Vérifier si nous sommes redirigés vers la page d'accueil ou si un élément spécifique est présent
        // Si la classe .form-alerts contient des erreurs, la connexion a échoué
        const errorElement = document.querySelector('.form-alerts .alert-error');
        return !errorElement;
      });
      
      if (!isLoggedIn) {
        throw new Error('Échec de la connexion à OpenResa');
      }
      
      console.log('Connexion réussie, récupération des cookies...');
      
      // Récupérer les cookies
      const cookies = await page.cookies();
      
      // Afficher les cookies pour débogage
      console.log('Cookies récupérés:', cookies.length, 'cookies');
      cookies.forEach(cookie => {
        console.log('Cookie:', cookie.name, 'Expire:', cookie.expires ? new Date(cookie.expires * 1000).toLocaleString() : 'Session');
      });
      
      await browser.close();
      
      // Sauvegarder les cookies dans le cache
      this.saveCookiesToCache(cookies);
      
      // Formater les cookies pour les utiliser avec axios
      const cookieString = cookies
        .map(cookie => `${cookie.name}=${cookie.value}`)
        .join('; ');
      
      return cookieString;
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      await browser.close();
      throw error;
    }
  }
}

module.exports = CookieManager;
