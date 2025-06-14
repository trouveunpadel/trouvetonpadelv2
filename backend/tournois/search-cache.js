const crypto = require('crypto');

class SearchCache {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 20 * 60 * 1000; // 20 minutes en millisecondes
        
        // Nettoyer le cache toutes les 30 minutes
        setInterval(() => {
            this.cleanExpiredEntries();
        }, 30 * 60 * 1000);
    }

    // Générer une clé de cache basée sur les paramètres de recherche
    generateCacheKey(searchParams) {
        const { city, dateDebut, dateFin, radius, level, coordinates } = searchParams;
        const keyData = {
            city: city?.toLowerCase(),
            dateDebut,
            dateFin,
            radius,
            level,
            // Ignorer les coordonnées si elles ne sont pas fournies initialement
            // car elles seront récupérées automatiquement
            hasCoordinates: !!coordinates
        };
        
        const keyString = JSON.stringify(keyData);
        return crypto.createHash('md5').update(keyString).digest('hex');
    }

    // Vérifier si une entrée de cache est encore valide
    isValid(entry) {
        return Date.now() - entry.timestamp < this.cacheTimeout;
    }

    // Récupérer depuis le cache
    get(searchParams) {
        const key = this.generateCacheKey(searchParams);
        const entry = this.cache.get(key);
        
        console.log(`🔍 Cache lookup - Key: ${key}, Entry exists: ${!!entry}`);
        
        if (entry && this.isValid(entry)) {
            console.log(`💾 Cache HIT pour la recherche: ${searchParams.city} (${entry.results.length} résultats)`);
            return {
                results: entry.results,
                fromCache: true,
                cachedAt: entry.timestamp
            };
        }
        
        if (entry && !this.isValid(entry)) {
            console.log(`⏰ Cache EXPIRED pour la recherche: ${searchParams.city}`);
        }
        
        console.log(`🔍 Cache MISS pour la recherche: ${searchParams.city}`);
        return null;
    }

    // Stocker dans le cache
    set(searchParams, results) {
        const key = this.generateCacheKey(searchParams);
        const entry = {
            results,
            timestamp: Date.now(),
            searchParams: { ...searchParams }
        };
        
        this.cache.set(key, entry);
        console.log(`💾 Mise en cache - Key: ${key}, ${searchParams.city} (${results.length} résultats)`);
    }

    // Nettoyer les entrées expirées
    cleanExpiredEntries() {
        let cleanedCount = 0;
        for (const [key, entry] of this.cache.entries()) {
            if (!this.isValid(entry)) {
                this.cache.delete(key);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            console.log(`🧹 Nettoyage cache: ${cleanedCount} entrées expirées supprimées`);
        }
    }

    // Obtenir les statistiques du cache
    getStats() {
        const now = Date.now();
        let validEntries = 0;
        let expiredEntries = 0;
        
        for (const entry of this.cache.values()) {
            if (this.isValid(entry)) {
                validEntries++;
            } else {
                expiredEntries++;
            }
        }
        
        return {
            totalEntries: this.cache.size,
            validEntries,
            expiredEntries,
            cacheTimeoutMinutes: this.cacheTimeout / (60 * 1000)
        };
    }

    // Vider le cache
    clear() {
        const size = this.cache.size;
        this.cache.clear();
        console.log(`🗑️ Cache vidé: ${size} entrées supprimées`);
    }
}

module.exports = SearchCache;
