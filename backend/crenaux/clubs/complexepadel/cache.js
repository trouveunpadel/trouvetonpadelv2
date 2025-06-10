/**
 * Module de gestion du cache pour ComplexePadel
 * Ce module gère la mise en cache des résultats des requêtes API
 * Version améliorée avec cache en mémoire
 */

// Système de cache en mémoire
const memoryCache = {
  slots: new Map(), // Map pour stocker les créneaux
  timestamps: new Map(), // Map pour stocker les timestamps
  
  // Durée de validité du cache en millisecondes
  getCacheDuration() {
    const now = new Date();
    const hour = now.getHours();
    
    // Heures creuses (23h-7h) - cache plus long
    if (hour >= 23 || hour < 7) {
      return 5 * 60 * 1000; // 5 minutes (comme P4 et MonkeyPadel)
    }
    
    // Heures de pointe (7h-23h) - cache plus court
    return 2 * 60 * 1000; // 2 minutes
  }
};

/**
 * Initialise le système de cache
 * @returns {Promise<boolean>} - true si l'initialisation est réussie
 */
async function initialize() {
  try {
    console.log('[CACHE ComplexePadel] 🔍 Initialisation du cache en mémoire');
    // Rien à faire pour le cache en mémoire, mais on garde la fonction pour compatibilité
    return true;
  } catch (error) {
    console.error('[CACHE ComplexePadel] ❌ Erreur lors de l\'initialisation du cache:', error);
    return false;
  }
}

/**
 * Vérifie si des résultats sont disponibles en cache
 * @param {Object} options - Options de recherche
 * @returns {Promise<Array<Object>|null>} - Résultats en cache ou null
 */
async function checkCache(options) {
  try {
    // Nettoyer le cache avant de vérifier
    cleanupCache();
    
    const cacheKey = generateCacheKey(options);
    
    // Vérifier si la clé existe dans le cache
    if (!memoryCache.timestamps.has(cacheKey)) {
      console.log(`[CACHE ComplexePadel] 🔍 Clé ${cacheKey} non trouvée dans le cache`);
      return null;
    }
    
    const timestamp = memoryCache.timestamps.get(cacheKey);
    const now = Date.now();
    const age = now - timestamp;
    const cacheDuration = memoryCache.getCacheDuration();
    
    // Vérifier si le cache est encore valide
    if (age > cacheDuration) {
      console.log(`[CACHE ComplexePadel] ⏰ Cache expiré pour ${cacheKey} (${(age / 1000).toFixed(1)}s > ${(cacheDuration / 1000).toFixed(1)}s)`);
      return null; // Cache expiré
    }
    
    console.log(`[CACHE ComplexePadel] ✅ Utilisation du cache pour ${cacheKey} (${(age / 1000).toFixed(1)}s)`);
    return memoryCache.slots.get(cacheKey);
  } catch (error) {
    console.error('[CACHE ComplexePadel] ❌ Erreur lors de la vérification du cache:', error);
    return null;
  }
}

/**
 * Met en cache les résultats d'une recherche
 * @param {Object} options - Options de recherche
 * @param {Array<Object>} results - Résultats à mettre en cache
 * @returns {Promise<void>}
 */
async function cacheResults(options, results) {
  try {
    const cacheKey = generateCacheKey(options);
    
    // Stocker les résultats dans le cache en mémoire
    memoryCache.slots.set(cacheKey, results);
    memoryCache.timestamps.set(cacheKey, Date.now());
    
    console.log(`[CACHE ComplexePadel] 📝 Mise en cache de ${results.length} créneaux pour ${cacheKey}`);
  } catch (error) {
    console.error('[CACHE ComplexePadel] ❌ Erreur lors de la mise en cache des résultats:', error);
  }
}

/**
 * Génère une clé de cache unique pour les options de recherche
 * @param {Object} options - Options de recherche
 * @returns {string} - Clé de cache
 */
function generateCacheKey(options) {
  const { startDate, endDate, types, maxResults, fastMode } = options;
  
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate ? endDate.toISOString().split('T')[0] : '';
  const typesStr = Array.isArray(types) ? types.sort().join('-') : 'all';
  
  // Inclure plus de paramètres dans la clé pour une meilleure précision
  return `slots_${startStr}_${endStr}_${typesStr}_${maxResults}_${fastMode}`.replace(/[^a-z0-9_-]/gi, '_');
}

/**
 * Nettoie les entrées de cache expirées
 * @returns {Promise<number>} - Nombre d'entrées supprimées
 */
async function cleanupCache() {
  try {
    const now = Date.now();
    let deletedCount = 0;
    
    // Parcourir toutes les entrées du cache
    for (const [key, timestamp] of memoryCache.timestamps.entries()) {
      const age = now - timestamp;
      const cacheDuration = memoryCache.getCacheDuration();
      
      // Supprimer les entrées expirées
      if (age > cacheDuration) {
        memoryCache.slots.delete(key);
        memoryCache.timestamps.delete(key);
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      console.log(`[CACHE ComplexePadel] 🧹 Nettoyage: ${deletedCount} entrées expirées supprimées`);
    }
    
    return deletedCount;
  } catch (error) {
    console.error('[CACHE ComplexePadel] ❌ Erreur lors du nettoyage du cache:', error);
    return 0;
  }
}

module.exports = {
  initialize,
  checkCache,
  cacheResults,
  generateCacheKey,
  cleanupCache,
  // Exporter les fonctions de cache pour les tests et le débogage
  getCacheDuration: memoryCache.getCacheDuration,
  getStats: () => ({
    size: memoryCache.slots.size,
    keys: [...memoryCache.slots.keys()]
  })
};
