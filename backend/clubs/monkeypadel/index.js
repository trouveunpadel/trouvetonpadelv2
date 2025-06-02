const puppeteer = require('puppeteer');
const CookieManager = require('./cookieManager');
const SlotExtractor = require('./slotExtractorFinal');
const ReservationLinkGenerator = require('./reservationLinkGenerator');
const fs = require('fs');
const path = require('path');

/**
 * Configuration pour MonkeyPadel
 */
const config = {
  baseUrl: 'https://openresa.com',
  clubUrl: 'https://openresa.com/club/themonkeypadel',
  loginUrl: 'https://openresa.com/login',
  reservationUrl: 'https://openresa.com/reservation/',
  credentials: {
    // Ces informations devront être stockées de manière sécurisée (variables d'environnement)
    username: process.env.MONKEYPADEL_USERNAME,
    password: process.env.MONKEYPADEL_PASSWORD
  }
};

// Initialiser le gestionnaire de cookies
const cookieManager = new CookieManager(config);

// Système de cache amélioré en mémoire
const cache = {
  slots: new Map(), // Map pour stocker les créneaux par date
  timestamps: new Map(), // Map pour stocker les timestamps des dernières requêtes
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes en millisecondes (réduit de 30 à 5 minutes pour plus de fraîcheur)
  
  /**
   * Génère une clé de cache unique basée sur les paramètres de recherche
   * @param {string} date - Date au format YYYY-MM-DD
   * @param {string} time - Heure minimale de recherche (optionnelle)
   * @returns {string} Clé de cache unique
   */
  generateKey(date, time = null) {
    return time ? `${date}_${time}` : date;
  },
  
  /**
   * Vérifie si les données en cache sont valides pour une clé donnée
   * @param {string} key - Clé de cache
   * @returns {boolean} True si le cache est valide, false sinon
   */
  isValid(key) {
    if (!this.timestamps.has(key)) return false;
    
    const timestamp = this.timestamps.get(key);
    const now = Date.now();
    const isValid = (now - timestamp) < this.CACHE_DURATION;
    
    console.log(`[CACHE MonkeyPadel] Vérification pour ${key}:`);
    console.log(`- Timestamp: ${new Date(timestamp).toLocaleString()}`);
    console.log(`- Maintenant: ${new Date(now).toLocaleString()}`);
    console.log(`- Âge: ${((now - timestamp) / 1000).toFixed(1)} secondes`);
    console.log(`- Validité: ${isValid ? 'VALIDE' : 'EXPIRÉ'} (max ${this.CACHE_DURATION / 1000} secondes)`);
    
    return isValid;
  },
  
  /**
   * Récupère les données en cache si elles sont valides
   * @param {string} key - Clé de cache
   * @returns {Array|null} Données en cache ou null si invalides/inexistantes
   */
  get(key) {
    if (!this.isValid(key)) return null;
    console.log(`[CACHE MonkeyPadel] ✅ Utilisation des données en cache pour ${key}`);
    return this.slots.get(key);
  },
  
  /**
   * Stocke des données dans le cache
   * @param {string} key - Clé de cache
   * @param {Array} data - Données à stocker
   */
  set(key, data) {
    this.slots.set(key, data);
    this.timestamps.set(key, Date.now());
    console.log(`[CACHE MonkeyPadel] 📝 Mise en cache de ${data.length} créneaux pour ${key}`);
  },
  
  /**
   * Nettoie les entrées expirées du cache
   */
  cleanup() {
    const now = Date.now();
    let expiredCount = 0;
    
    // Parcourir toutes les entrées du cache
    for (const [key, timestamp] of this.timestamps.entries()) {
      if (now - timestamp > this.CACHE_DURATION) {
        this.slots.delete(key);
        this.timestamps.delete(key);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      console.log(`[CACHE MonkeyPadel] 🧹 Nettoyage: ${expiredCount} entrées expirées supprimées`);
    }
    
    console.log(`[CACHE MonkeyPadel] 📊 État actuel: ${this.slots.size} entrées en cache`);
  }
};

/**
 * Formate une date au format DD/MM/YYYY attendu par OpenResa
 * @param {Date} date - Date à formater
 * @returns {string} - Date formatée
 */
const formatDate = (date) => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Note: Les fonctions getValidCache et saveToCache ont été remplacées par les méthodes du système de cache en mémoire

/**
 * Récupère les créneaux disponibles pour une date donnée (version optimisée)
 * @param {string} dateStr - Date au format YYYY-MM-DD
 * @param {string} cookies - Cookies de session
 * @returns {Promise<Array>} - Liste des créneaux disponibles
 */
async function getAvailableSlots(dateStr, cookies) {
  // Générer la clé de cache
  const cacheKey = cache.generateKey(dateStr);
  
  // Nettoyer les entrées expirées du cache
  cache.cleanup();
  
  // Vérifier si les données sont en cache et valides
  const cachedSlots = cache.get(cacheKey);
  if (cachedSlots) {
    return cachedSlots;
  }
  
  // Convertir la date au format attendu par OpenResa (DD/MM/YYYY)
  const date = new Date(dateStr);
  const formattedDate = formatDate(date);
  
  console.log(`Récupération des créneaux pour ${formattedDate} (version optimisée)`);
  
  // Lancer le navigateur avec des options optimisées pour la performance
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-setuid-sandbox',
      '--no-sandbox',
      '--no-zygote',
      '--single-process',
      '--disable-extensions',
      '--disable-component-extensions-with-background-pages',
      '--disable-default-apps',
      '--mute-audio',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-breakpad',
      '--disable-component-update',
      '--disable-domain-reliability',
      '--disable-features=AudioServiceOutOfProcess,IsolateOrigins,site-per-process',
      '--disable-hang-monitor',
      '--disable-ipc-flooding-protection',
      '--disable-notifications',
      '--disable-offer-store-unmasked-wallet-cards',
      '--disable-popup-blocking',
      '--disable-print-preview',
      '--disable-prompt-on-repost',
      '--disable-renderer-backgrounding',
      '--disable-speech-api',
      '--disable-sync',
      '--hide-scrollbars',
      '--ignore-gpu-blacklist',
      '--metrics-recording-only',
      '--no-default-browser-check',
      '--no-first-run',
      '--no-pings',
      '--password-store=basic',
      '--use-mock-keychain',
      '--disable-web-security',
      '--disable-site-isolation-trials'
    ]
  });
  
  try {
    // Créer une nouvelle page
    const page = await browser.newPage();
    
    // Optimiser les performances
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      if (resourceType === 'image' || resourceType === 'font' || resourceType === 'media') {
        request.abort();
      } else {
        request.continue();
      }
    });
    
    // Définir un viewport raisonnable
    await page.setViewport({ width: 1280, height: 800 });
    
    // Définir les cookies de session
    try {
      // Lire les cookies cachés directement depuis le fichier
      const cookieCachePath = path.join(__dirname, 'cookies.json');
      if (fs.existsSync(cookieCachePath)) {
        const cookieCache = JSON.parse(fs.readFileSync(cookieCachePath, 'utf8'));
        if (cookieCache.cookies && Array.isArray(cookieCache.cookies)) {
          console.log(`Utilisation directe de ${cookieCache.cookies.length} cookies du cache`);
          await page.setCookie(...cookieCache.cookies);
        } else {
          throw new Error('Format de cache de cookies invalide');
        }
      } else {
        throw new Error('Fichier de cache de cookies introuvable');
      }
    } catch (cookieError) {
      console.error('Erreur lors de la définition des cookies:', cookieError);
      // Fallback: essayer de naviguer sans cookies
      console.log('Tentative de navigation sans cookies...');
    }
    
    // Construire l'URL de réservation avec la date formatée et aller directement à cette URL
    const reservationUrl = `${config.baseUrl}/reservation/#action=0&date=${formattedDate}&group=0&page=0`;
    console.log(`Accès direct à l'URL de réservation: ${reservationUrl}`);
    
    // Accéder directement à la page de réservation avec la date spécifiée
    await page.goto(reservationUrl, { 
      waitUntil: 'networkidle2', // Utiliser 'networkidle2' pour s'assurer que le JavaScript est exécuté
      timeout: 15000 // Réduire le timeout
    });
    
    // Attendre que le conteneur de réservation soit chargé
    await page.waitForSelector('#reservation-container', { timeout: 10000 }).catch(() => {
      console.log('Conteneur de réservation non trouvé, mais on continue...');
    });
    
    // Attendre un peu plus pour s'assurer que les créneaux sont chargés
    await page.waitForSelector('.slot-free-full', { timeout: 10000 });
    console.log('Créneaux chargés');
    
    // Attendre que le JavaScript termine de s'exécuter
    await page.waitForFunction(() => {
      return document.querySelectorAll('.slot-free-full, .slot-free').length > 0;
    }, { timeout: 3000 }).catch(() => {
      console.log('Attente du chargement des créneaux terminée, mais on continue...');
    });
    
    console.log('Créneaux chargés');
    
    // Réduire le temps d'attente pour accélérer le processus
    await page.waitForTimeout(200);
    
    // Utiliser le module d'extraction des créneaux
    const slots = await SlotExtractor.extractSlots(page);
    
    // Fermer le navigateur
    await browser.close();
    
    // Aucun filtrage ni déduplication - garder tous les créneaux slot-free-full
    console.log(`${slots.length} créneaux slot-free-full trouvés`);
    
    // Sauvegarder les créneaux dans le cache avec la méthode dédiée
    cache.set(cache.generateKey(dateStr), slots);
    
    return slots;
  } catch (error) {
    console.error('Erreur lors de la récupération des créneaux:', error);
    await browser.close();
    throw error;
  }
}

/**
 * Recherche les créneaux disponibles pour MonkeyPadel
 * @param {Object} params - Paramètres de recherche
 * @param {string} params.date - Date au format YYYY-MM-DD
 * @param {string} params.time - Heure minimum (HH:MM)
 * @returns {Promise<Array>} - Liste des créneaux disponibles avec liens de réservation
 */
async function findAvailableSlots(params) {
  try {
    // Générer la clé de cache avec date et heure
    const cacheKey = cache.generateKey(params.date, params.time);
    
    // Nettoyer les entrées expirées du cache
    cache.cleanup();
    
    // Vérifier si les résultats filtrés sont en cache
    const cachedResults = cache.get(cacheKey);
    if (cachedResults) {
      return cachedResults;
    }
    
    // Se connecter et récupérer les cookies (utilise le cache si disponible)
    const cookies = await cookieManager.login();
    
    // Récupérer les créneaux disponibles
    const slots = await getAvailableSlots(params.date, cookies);
    
    // Ajouter le nom du club à chaque créneau pour le générateur de liens
    const slotsWithClub = slots.map(slot => ({
      ...slot,
      club: 'MonkeyPadel',
      date: params.date // S'assurer que la date est incluse
    }));
    
    // Ajouter les liens de réservation à chaque créneau
    const slotsWithLinks = ReservationLinkGenerator.addReservationLinks(slotsWithClub);
    
    // Filtrer les créneaux par heure minimum si spécifiée
    let results = slotsWithLinks;
    if (params.time) {
      const [hours, minutes] = params.time.split(':').map(Number);
      const minTime = hours * 60 + minutes; // Convertir en minutes
      
      results = slotsWithLinks.filter(slot => {
        const [slotHours, slotMinutes] = slot.time.split(':').map(Number);
        const slotTime = slotHours * 60 + slotMinutes;
        return slotTime >= minTime;
      });
      
      // Mettre en cache les résultats filtrés
      cache.set(cacheKey, results);
    }
    
    return results;
  } catch (error) {
    console.error('Erreur lors de la recherche de créneaux pour MonkeyPadel:', error);
    return [];
  }
}

/**
 * Teste la connexion au site de MonkeyPadel
 * Cette fonction est utilisée par le système de monitoring pour vérifier si le module fonctionne correctement
 * @returns {Promise<boolean>} - True si la connexion est réussie
 */
async function testConnection() {
  try {
    // Tester la connexion en essayant de récupérer les cookies
    const cookies = await cookieManager.login();
    
    // Si on a des cookies, la connexion est réussie
    return cookies && cookies.length > 0;
  } catch (error) {
    console.error('Erreur lors du test de connexion à MonkeyPadel:', error);
    return false;
  }
}

module.exports = {
  findAvailableSlots,
  refreshCookies: () => cookieManager.refreshCookies(), // Exposer une méthode pour forcer le rafraîchissement des cookies
  testConnection
};
