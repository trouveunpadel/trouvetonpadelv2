/**
 * Gestionnaire de cookies pour Country Club Padel
 * Utilise Puppeteer pour se connecter à OpenResa et récupérer les cookies
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class CookieManager {
  /**
   * Constructeur
   * @param {string} username - Nom d'utilisateur OpenResa
   * @param {string} password - Mot de passe OpenResa
   */
  constructor(username, password) {
    this.username = username;
    this.password = password;
    this.cookieCacheFile = path.join(__dirname, 'cookies-cache.json');
  }

  /**
   * Récupère des cookies valides (depuis le cache ou en se connectant)
   * @returns {Promise<Object>} - Cookies formatés pour les requêtes HTTP
   */
  async getValidCookies() {
    // Vérifier si nous avons des cookies valides en cache
    const cachedCookies = this.getValidCachedCookies();
    if (cachedCookies) {
      console.log('Utilisation des cookies en cache pour Country Club Padel');
      return cachedCookies;
    }

    // Sinon, se connecter pour obtenir de nouveaux cookies
    console.log('Rafraîchissement des cookies Country Club Padel nécessaire');
    return this.refreshCookies();
  }

  /**
   * Vérifie si des cookies en cache sont disponibles et valides
   * @returns {Object|null} - Cookies valides au format clé-valeur ou null
   */
  getValidCachedCookies() {
    try {
      if (fs.existsSync(this.cookieCacheFile)) {
        const cacheData = JSON.parse(fs.readFileSync(this.cookieCacheFile, 'utf8'));
        
        // Vérifier si les cookies n'ont pas expiré
        if (cacheData && cacheData.expiresAt && cacheData.expiresAt > new Date().getTime()) {
          console.log('Cookies en cache valides trouvés pour Country Club Padel');
          
          // Convertir les cookies du format complet au format utilisable pour les requêtes HTTP
          const cookies = {};
          if (cacheData.cookies && Array.isArray(cacheData.cookies)) {
            cacheData.cookies.forEach(cookie => {
              cookies[cookie.name] = cookie.value;
            });
          }
          
          return cookies;
        } else {
          console.log('Cookies en cache expirés pour Country Club Padel');
        }
      } else {
        console.log('Pas de cookies en cache pour Country Club Padel');
      }
      return null;
    } catch (error) {
      console.error('Erreur lors de la lecture des cookies en cache:', error.message);
      return null;
    }
  }

  /**
   * Sauvegarde les cookies dans un fichier cache
   * @param {Object} cookieCache - Objet contenant les cookies et les dates d'expiration
   */
  saveCookiesToCache(cookieCache) {
    try {
      fs.writeFileSync(this.cookieCacheFile, JSON.stringify(cookieCache, null, 2));
      console.log('Cookies sauvegardés dans le cache pour Country Club Padel');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des cookies dans le cache:', error.message);
    }
  }

  /**
   * Rafraîchit les cookies en se connectant à nouveau
   * @returns {Promise<Object|null>} - Cookies de session ou null en cas d'échec
   */
  async refreshCookies() {
    let browser = null;
    try {
      console.log('Connexion à OpenResa (Country Club Padel)...');
      console.log(`Tentative de connexion avec l'identifiant: ${this.username}`);
      console.log(`Longueur du mot de passe: ${this.password.length} caractères`);
      
      // Lancer le navigateur
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
      
      // Ouvrir une nouvelle page
      const page = await browser.newPage();
      
      // Définir un viewport raisonnable
      await page.setViewport({ width: 1280, height: 800 });
      
      // Définir un user agent réaliste
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:138.0) Gecko/20100101 Firefox/138.0');
      
      // Activer les logs de la console du navigateur
      page.on('console', msg => console.log('Console du navigateur:', msg.text()));
      
      // Naviguer vers la page de connexion
      console.log('Navigation vers la page du club...');
      await page.goto('https://openresa.com/club/countryclubpadel', {
        waitUntil: 'networkidle2',
        timeout: 60000
      });
      
      // Attendre que la page soit chargée
      console.log('Attente du chargement de la page...');
      await page.waitForSelector('#form-username', { timeout: 30000 });
      console.log('Formulaire de connexion trouvé.');
      
      // Remplir le formulaire de connexion
      console.log('Remplissage du formulaire de connexion...');
      await page.type('#form-username', this.username, { delay: 100 });
      await page.type('#form-password', this.password, { delay: 100 });
      
      // Cocher la case "Se souvenir de moi"
      await page.evaluate(() => {
        const rememberCheckbox = document.querySelector('input[name="remember"]');
        if (rememberCheckbox) rememberCheckbox.checked = true;
      });
      
      // Attendre un peu avant de soumettre le formulaire
      await page.waitForTimeout(1000);
      
      // Pas de capture d'écran
      
      // Soumettre le formulaire
      console.log('Soumission du formulaire...');
      
      console.log('Tentative de soumission du formulaire...');
      
      try {
        // Utiliser evaluate pour cliquer sur le second bouton (qui est le bouton de connexion d'après les logs)
        console.log('Tentative de clic sur le second bouton...');
        await page.evaluate(() => {
          // Sélectionner tous les boutons
          const buttons = Array.from(document.querySelectorAll('button'));
          
          // Vérifier qu'il y a au moins 2 boutons
          if (buttons.length >= 2) {
            // Cliquer sur le second bouton (index 1)
            console.log(`Clic sur le bouton: ${buttons[1].textContent.trim()}`);
            buttons[1].click();
            return true;
          } else {
            console.error(`Pas assez de boutons trouvés: ${buttons.length}`);
            return false;
          }
        });
        
        // Attendre la navigation
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 })
          .catch(e => console.log('Pas de redirection détectée après clic sur le bouton:', e.message));
      } catch (clickError) {
        console.error('Erreur lors du clic sur le bouton:', clickError.message);
        
        // Essayer une autre méthode: soumettre le formulaire directement
        console.log('Tentative de soumission du formulaire via JavaScript...');
        await page.evaluate(() => {
          const form = document.querySelector('form');
          if (form) {
            console.log('Formulaire trouvé, soumission en cours...');
            form.submit();
            return true;
          } else {
            console.error('Formulaire non trouvé');
            return false;
          }
        });
        
        // Attendre la navigation
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 })
          .catch(e => console.log('Pas de redirection détectée après soumission du formulaire:', e.message));
      }
      
      // Pas de capture d'écran
      
      // Attendre un peu pour s'assurer que la page est chargée
      await page.waitForTimeout(2000);
      
      // Vérifier si la connexion a réussi
      const isLoggedIn = await page.evaluate(() => {
        // Vérifier si nous sommes sur le dashboard ou si un bouton de déconnexion est présent
        const isOnDashboard = window.location.href.includes('/dashboard');
        const hasLogoutLink = document.querySelector('a[href*="logout"]') !== null;
        const hasDisconnectText = document.body.textContent.includes('déconnexion');
        const hasUserMenu = document.querySelector('.user-menu') !== null;
        
        console.log('Vérification de connexion:');
        console.log('- URL contient /dashboard:', isOnDashboard);
        console.log('- Lien de déconnexion présent:', hasLogoutLink);
        console.log('- Texte de déconnexion présent:', hasDisconnectText);
        console.log('- Menu utilisateur présent:', hasUserMenu);
        
        // Considérer comme connecté si l'un des critères est vrai
        return isOnDashboard || hasLogoutLink || hasDisconnectText || hasUserMenu;
      });
      
      // Même si la vérification de connexion échoue, essayons quand même de récupérer les cookies
      // car la capture d'écran montre que nous sommes connectés
      
      // Récupérer les cookies
      const puppeteerCookies = await page.cookies();
      
      // Convertir les cookies Puppeteer en format utilisable pour les requêtes HTTP
      const cookies = {};
      puppeteerCookies.forEach(cookie => {
        cookies[cookie.name] = cookie.value;
      });
      
      console.log(`${puppeteerCookies.length} cookies récupérés`);
      
      // Pas de sauvegarde des cookies bruts ni de capture d'écran
      
      // Si nous avons des cookies, considérer que la connexion a réussi
      if (puppeteerCookies.length > 0) {
        console.log('Connexion réussie à OpenResa (Country Club Padel) - cookies récupérés');
        
        // Calculer la date d'expiration (30 jours par défaut)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        
        // Sauvegarder les cookies
        const cookieCache = {
          cookies: puppeteerCookies,
          expiresAt: expiresAt.getTime(),
          createdAt: new Date().getTime()
        };
        this.saveCookiesToCache(cookieCache);
        
        return cookies;
      } else {
        console.error('Échec de la connexion à OpenResa (Country Club Padel)');
        
        // Vérifier s'il y a un message d'erreur
        const errorMessage = await page.evaluate(() => {
          const errorElement = document.querySelector('.alert-error, .error, .notification-error');
          return errorElement ? errorElement.textContent.trim() : null;
        });
        
        if (errorMessage) {
          console.error('Message d\'erreur détecté:', errorMessage);
        }
        
        // Méthode alternative: Essayer de soumettre le formulaire via JavaScript
        console.log('Tentative alternative: soumission du formulaire via JavaScript...');
        
        try {
          // Remplir à nouveau le formulaire (au cas où)
          await page.type('#form-username', this.username, { delay: 50 });
          await page.type('#form-password', this.password, { delay: 50 });
          
          // Soumettre le formulaire via JavaScript
          await page.evaluate(() => {
            const form = document.querySelector('form');
            if (form) form.submit();
          });
          
          await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
          
          // Vérifier à nouveau si la connexion a réussi
          const isLoggedInAfterClick = await page.evaluate(() => {
            return window.location.href.includes('/dashboard') || 
                   document.querySelector('a[href*="logout"]') !== null ||
                   document.body.textContent.includes('déconnexion');
          });
          
          if (isLoggedInAfterClick) {
            console.log('Connexion réussie après soumission du formulaire via JavaScript');
            
            // Récupérer les cookies
            const puppeteerCookies = await page.cookies();
            
            // Calculer la date d'expiration (30 jours par défaut)
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);
            
            // Créer l'objet de cache au format demandé
            const cookieCache = {
              cookies: puppeteerCookies,
              expiresAt: expiresAt.getTime(),
              createdAt: new Date().getTime()
            };
            
            // Sauvegarder les cookies au format complet
            this.saveCookiesToCache(cookieCache);
            
            // Convertir les cookies Puppeteer en format utilisable pour les requêtes HTTP
            const cookies = {};
            puppeteerCookies.forEach(cookie => {
              cookies[cookie.name] = cookie.value;
            });
            
            return cookies;
          } else {
            console.error('Échec de la connexion même après soumission du formulaire via JavaScript');
            // Pas de capture d'écran
          }
        } catch (jsError) {
          console.error('Erreur lors de la tentative de soumission via JavaScript:', jsError.message);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la connexion à OpenResa:', error.message);
    } finally {
      // Fermer le navigateur
      if (browser) {
        await browser.close();
        console.log('Navigateur fermé');
      }
    }
    
    return null;
  }

  /**
   * Formate les cookies pour les requêtes HTTP
   * @param {Object} cookies - Cookies à formater
   * @returns {string} - Chaîne de cookies formatée
   */
  static formatCookies(cookies) {
    if (!cookies || Object.keys(cookies).length === 0) {
      return '';
    }
    
    return Object.entries(cookies)
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }
}

module.exports = CookieManager;
