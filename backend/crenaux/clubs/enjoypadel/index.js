/**
 * Enjoy Padel - Module principal
 * Implémente la requête POST pour obtenir les créneaux disponibles
 * Basé sur la logique du script Python capture.py
 */

const axios = require('axios');
const cheerio = require('cheerio');

// URL et configuration
const BASE_URL = 'https://enjoypadel.mymobileapp.fr/loadcalendrier_capsule.asp';

// Mapping des terrains (équivalent à terrain_names dans le script Python)
const TERRAIN_NAMES = {
    '1075': 'Court 1',
    '1076': 'Court 2',
    '1077': 'Court 3',
    '1078': 'Court 4'
};

// Système de cache (similaire aux autres modules)
const cache = {
    slots: new Map(),
    timestamps: new Map(),
    CACHE_DURATION: 5 * 60 * 1000, // 5 minutes en millisecondes
    
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
        
        console.log(`[CACHE] Vérification pour ${key}:`);
        console.log(`- Timestamp: ${new Date(timestamp).toLocaleString()}`);
        console.log(`- Maintenant: ${new Date(now).toLocaleString()}`);
        console.log(`- Âge: ${((now - timestamp) / 1000).toFixed(1)} secondes`);
        console.log(`- Validité: ${isValid ? 'VALIDE' : 'EXPIRÉ'} (max ${this.CACHE_DURATION / 1000} secondes)`);
        
        return isValid;
    },
    
    /**
     * Récupère les données en cache pour une clé donnée
     * @param {string} key - Clé de cache
     * @returns {Array|null} Données en cache ou null si invalides
     */
    get(key) {
        if (!this.isValid(key)) return null;
        return this.slots.get(key);
    },
    
    /**
     * Stocke des données en cache pour une clé donnée
     * @param {string} key - Clé de cache
     * @param {Array} data - Données à stocker
     */
    set(key, data) {
        this.slots.set(key, data);
        this.timestamps.set(key, Date.now());
        console.log(`[CACHE] Mise en cache pour ${key}: ${data.length} créneaux`);
    }
};

/**
 * Convertit une date du format YYYY-MM-DD au format DD/MM/YYYY
 * @param {string} dateStr - Date au format YYYY-MM-DD
 * @returns {string} Date au format DD/MM/YYYY
 */
function formatDateForApi(dateStr) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}

/**
 * Convertit une heure du format HH:MM au format Date
 * @param {string} timeStr - Heure au format HH:MM
 * @param {string} dateStr - Date au format DD/MM/YYYY
 * @returns {Date} Objet Date
 */
function parseTime(timeStr, dateStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const [day, month, year] = dateStr.split('/').map(Number);
    const date = new Date(year, month - 1, day, hours, minutes);
    return date;
}

/**
 * Récupère les créneaux disponibles pour une date donnée
 * @param {Object} options - Options de recherche
 * @param {string} options.date - Date au format YYYY-MM-DD
 * @param {string} options.time - Heure minimale au format HH:MM
 * @returns {Promise<Array>} Liste des créneaux disponibles
 */
async function findAvailableSlots(options) {
    const { date, time = '00:00' } = options;
    
    // Générer la clé de cache
    const cacheKey = cache.generateKey(date, time);
    
    // Vérifier si les données sont en cache
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
        console.log(`[ENJOY PADEL] Utilisation du cache pour ${date} à partir de ${time}`);
        return cachedData;
    }
    
    console.log(`[ENJOY PADEL] Recherche de créneaux pour ${date} à partir de ${time}`);
    
    // Convertir la date au format attendu par l'API
    const formattedDate = formatDateForApi(date);
    
    // Créer l'heure minimale sous forme d'objet Date pour la comparaison
    const minHour = parseTime(time, formattedDate);
    
    try {
        // Préparer les en-têtes et les données pour la requête
        const headers = {
            'Accept': 'text/html, */*; q=0.01',
            'Accept-Language': 'fr-FR,fr;q=0.9',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Origin': 'null',
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
            'Connection': 'keep-alive',
            'Sec-Fetch-Site': 'cross-site',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Des': 'empty'
        };
        
        const data = {
            'myDate': formattedDate,
            'duree': '90',
            'id_sport': '2'
        };
        
        // Envoyer la requête POST
        const response = await axios.post(BASE_URL, new URLSearchParams(data), { headers });
        
        // Vérifier si la réponse est valide
        if (response.status !== 200) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        // Analyser la réponse HTML avec Cheerio (équivalent à BeautifulSoup)
        const $ = cheerio.load(response.data);
        
        // Extraire les créneaux disponibles
        const slots = [];
        
        $('button.btn-horaires').each((index, element) => {
            const onclick = $(element).attr('onclick') || '';
            
            // Vérifier si c'est un bouton de créneau valide
            if (!onclick.startsWith('choosePop(')) {
                return;
            }
            
            try {
                // Extraire les paramètres de l'attribut onclick
                const onclickContent = onclick.replace('choosePop(', '').replace(');', '');
                const params = onclickContent.split(',');
                
                // Extraire la date/heure
                const rawDatetime = params[0].trim().replace(/'/g, '');
                
                // Extraire les IDs des terrains
                const courtIdsStr = params[1].trim().replace(/'/g, '');
                const courtIds = courtIdsStr.split(';').slice(1); // Ignorer le premier "999"
                
                // Convertir la date/heure en objet Date
                const [datePart, timePart] = rawDatetime.split(' ');
                const hourStr = timePart.substring(0, 5); // Format HH:MM
                
                // Vérifier si l'heure est supérieure à l'heure minimale
                const slotDate = parseTime(hourStr, datePart);
                
                if (slotDate < minHour) {
                    return;
                }
                
                // Créer un créneau pour chaque terrain
                for (const courtId of courtIds) {
                    slots.push({
                        date: date, // Format YYYY-MM-DD
                        time: hourStr,
                        court: TERRAIN_NAMES[courtId] || `Terrain ${courtId}`,
                        type: 'extérieur',
                        courtType: 'extérieur',
                        available: true,
                        price: 0, // Prix non disponible
                        reservationLink: 'https://linktr.ee/enjoypadel',
                        latitude: 43.581330,
                        longitude: 5.210543,
                        address: 'Chemin de la Bosque, 13840 Rognes'
                    });
                }
            } catch (error) {
                console.error(`[ENJOY PADEL] Erreur lors de l'analyse d'un créneau:`, error);
            }
        });
        
        console.log(`[ENJOY PADEL] ${slots.length} créneaux trouvés pour ${date}`);
        
        // Mettre en cache les résultats
        cache.set(cacheKey, slots);
        
        return slots;
    } catch (error) {
        console.error(`[ENJOY PADEL] Erreur lors de la recherche de créneaux:`, error);
        return [];
    }
}

/**
 * Fonction compatible avec l'interface attendue par le système de monitoring
 * @param {string} date - Date au format YYYY-MM-DD
 * @param {number} startHour - Heure de début (0-23)
 * @param {number} endHour - Heure de fin (0-23)
 * @returns {Promise<Array>} Liste des créneaux disponibles
 */
async function getAvailableSlots(date, startHour = 8, endHour = 22) {
    try {
        console.log(`[Enjoy Padel] Recherche de créneaux pour ${date} entre ${startHour}h et ${endHour}h`);
        
        // Convertir startHour en format HH:MM
        const startTime = `${String(startHour).padStart(2, '0')}:00`;
        
        // Appeler la fonction findAvailableSlots avec les options appropriées
        const slots = await findAvailableSlots({
            date,
            time: startTime
        });
        
        // Filtrer les créneaux par plage horaire
        return slots.filter(slot => {
            const hour = parseInt(slot.time.split(':')[0]);
            return hour >= startHour && hour <= endHour;
        });
    } catch (error) {
        console.error(`[Enjoy Padel] Erreur lors de la recherche:`, error);
        return [];
    }
}

/**
 * Fonction de test pour le système de monitoring
 * @returns {Promise<boolean>} true si la connexion est réussie
 */
async function testConnection() {
    try {
        // Tester la connexion en faisant une requête simple pour demain
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        
        // Faire une requête avec une plage horaire limitée pour éviter de surcharger
        const slots = await getAvailableSlots(tomorrowStr, 14, 15); // Juste 1h de plage
        
        // Si on arrive ici, c'est que la connexion fonctionne
        console.log(`[Enjoy Padel] Test de connexion réussi (${slots.length} créneaux trouvés)`);
        return true;
    } catch (error) {
        console.error(`[Enjoy Padel] Test de connexion échoué:`, error);
        return false;
    }
}

module.exports = {
    findAvailableSlots,
    getAvailableSlots,
    testConnection
};
