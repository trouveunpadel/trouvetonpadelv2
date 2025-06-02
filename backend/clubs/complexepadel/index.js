/**
 * ComplexePadel - Module principal
 * Point d'entrée pour récupérer les créneaux disponibles pour le club ComplexePadel
 * en utilisant directement l'API wpamelia, ce qui est beaucoup plus rapide qu'un scraping.
 */

const { performance } = require('perf_hooks');
const api = require('./api');
const cache = require('./cache');
const slotProcessor = require('./slotProcessor');

// État global pour les métriques
let sessionMetrics = {
  requestCount: 0,
  cacheHits: 0,
  errors: 0,
  avgResponseTime: 0,
  totalResponseTime: 0
};

/**
 * Initialise le module
 * @returns {Promise<boolean>} - true si l'initialisation est réussie
 */
async function initialize() {
  try {
    console.log('Initialisation du module ComplexePadel...');
    
    // Initialiser le cache
    await cache.initialize();
    
    console.log('Module ComplexePadel initialisé avec succès');
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'initialisation du module ComplexePadel:', error);
    return false;
  }
}

/**
 * Récupère les créneaux disponibles pour une période donnée
 * @param {Object} options - Options de recherche
 * @param {Date} options.startDate - Date de début (par défaut: aujourd'hui)
 * @param {Date} options.endDate - Date de fin (par défaut: dans 7 jours)
 * @param {Array<string>} options.types - Types de padel ('indoor', 'outdoor', 'all')
 * @param {boolean} options.forceRefresh - Force le rafraîchissement du cache
 * @returns {Promise<Array<Object>>} - Liste des créneaux disponibles
 */
async function getAvailableSlots(options = {}) {
  const startTime = performance.now();
  sessionMetrics.requestCount++;
  
  try {
    // Paramètres par défaut
    const defaultOptions = {
      startDate: new Date(),
      endDate: null, // Sera calculé pour être le même jour que startDate
      types: ['all'],
      forceRefresh: false,
      maxResults: 30, // Limite le nombre de résultats
      fastMode: true, // Mode rapide pour réduire le temps de réponse
      singleDay: true // Récupérer uniquement les créneaux du jour demandé
    };
    
    const searchOptions = { ...defaultOptions, ...options };
    
    // Si singleDay est activé, calculer endDate pour qu'il soit le même jour que startDate
    if (searchOptions.singleDay) {
      const startDate = new Date(searchOptions.startDate);
      const endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999); // Fin de la journée
      searchOptions.endDate = endDate;
      
      console.log(`Récupération des créneaux uniquement pour le ${startDate.toLocaleDateString('fr-FR')}`);
    } else if (!searchOptions.endDate) {
      // Si endDate n'est pas spécifiée et singleDay est désactivé, utiliser startDate + 1 jour
      searchOptions.endDate = new Date(searchOptions.startDate.getTime() + 24 * 60 * 60 * 1000);
    }
    
    // Vérifier le cache si forceRefresh n'est pas activé
    if (!searchOptions.forceRefresh) {
      const cachedResults = await cache.checkCache(searchOptions);
      if (cachedResults) {
        sessionMetrics.cacheHits++;
        updateMetrics(startTime);
        return cachedResults;
      }
    }
    
    // Récupérer les créneaux depuis l'API en mode rapide
    const rawResults = await api.getAllSlots(
      searchOptions.types,
      searchOptions.startDate,
      searchOptions.endDate,
      searchOptions.fastMode
    );
    
    // Traiter les résultats
    let allSlots = [];
    
    // Parcourir les résultats par service
    Object.values(rawResults).forEach(serviceResult => {
      const { service, slots } = serviceResult;
      
      // Traiter directement les créneaux avec les données brutes
      const processedSlots = slotProcessor.processRawSlots(slots, service);
      
      // Filtrer par date
      const filteredSlots = slotProcessor.filterSlotsByDate(
        processedSlots,
        searchOptions.startDate,
        searchOptions.endDate
      );
      
      allSlots = [...allSlots, ...filteredSlots];
    });
    
    // Trier les créneaux
    allSlots = slotProcessor.sortSlots(allSlots);
    
    // Limiter le nombre de résultats si nécessaire
    if (searchOptions.maxResults && allSlots.length > searchOptions.maxResults) {
      allSlots = allSlots.slice(0, searchOptions.maxResults);
    }
    
    // Mettre en cache les résultats
    await cache.cacheResults(searchOptions, allSlots);
    
    // Mettre à jour les métriques
    updateMetrics(startTime);
    
    return allSlots;
  } catch (error) {
    sessionMetrics.errors++;
    console.error('Erreur lors de la récupération des créneaux:', error);
    throw error;
  }
}

/**
 * Met à jour les métriques de performance
 * @param {number} startTime - Temps de début de la requête
 */
function updateMetrics(startTime) {
  const responseTime = performance.now() - startTime;
  sessionMetrics.totalResponseTime += responseTime;
  sessionMetrics.avgResponseTime = sessionMetrics.totalResponseTime / sessionMetrics.requestCount;
}

/**
 * Obtient les métriques actuelles de la session
 * @returns {Object} - Métriques de session
 */
function getMetrics() {
  return {
    ...sessionMetrics,
    cacheHitRate: sessionMetrics.requestCount > 0 
      ? (sessionMetrics.cacheHits / sessionMetrics.requestCount) * 100 
      : 0,
    errorRate: sessionMetrics.requestCount > 0 
      ? (sessionMetrics.errors / sessionMetrics.requestCount) * 100 
      : 0
  };
}

// Exporter les fonctions publiques
module.exports = {
  initialize,
  getAvailableSlots,
  getEntities: api.getEntities,
  getCurrentUser: api.getCurrentUser,
  cleanupCache: cache.cleanupCache,
  getMetrics
};