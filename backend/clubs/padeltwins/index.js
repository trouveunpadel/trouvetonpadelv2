/**
 * Padel Twins - Module principal
 * Implémente la requête pour obtenir les créneaux disponibles
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { URLSearchParams } = require('url');
const ReservationLinkGenerator = require('./reservationLinkGenerator');

// URL et configuration
const BASE_URL = "https://padeltwins.mymobileapp.fr";
const API_ENDPOINT = "/loadcalendrier_capsule.asp";

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
        
        console.log(`[CACHE PadelTwins] Vérification pour ${key}:`);
        console.log(`- Timestamp: ${new Date(timestamp).toLocaleString()}`);
        console.log(`- Maintenant: ${new Date(now).toLocaleString()}`);
        console.log(`- Âge: ${((now - timestamp) / 1000).toFixed(1)} secondes`);
        console.log(`- Validité: ${isValid ? 'VALIDE' : 'EXPIRÉ'} (max ${this.CACHE_DURATION / 1000} secondes)`);
        
        return isValid;
    },
    
    /**
     * Récupère les données en cache pour une clé donnée
     * @param {string} key - Clé de cache
     * @returns {Array|null} Données en cache ou null si invalides/inexistantes
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
        console.log(`[CACHE PadelTwins] Mise en cache pour ${key}: ${data.length} créneaux`);
    }
};

/**
 * Convertit une date du format YYYY-MM-DD au format DD/MM/YYYY
 * @param {string} dateStr - Date au format YYYY-MM-DD
 * @returns {string} - Date au format DD/MM/YYYY
 */
function formatDateForApi(dateStr) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}

/**
 * Vérifie si une heure est supérieure ou égale à une autre
 * @param {string} time1 - Heure au format HH:MM ou HHhMM
 * @param {string} time2 - Heure au format HH:MM ou HHhMM
 * @returns {boolean} - True si time1 >= time2
 */
function isTimeGreaterOrEqual(time1, time2) {
    // Si l'une des heures est null, considérer que la condition est vraie
    if (!time1 || !time2) return true;
    
    // Normaliser les formats d'heure (HH:MM et HHhMM)
    const normalizedTime1 = time1.replace('h', ':');
    const normalizedTime2 = time2.replace('h', ':');
    
    // Extraire les heures et minutes
    const [hours1, minutes1] = normalizedTime1.split(':').map(Number);
    const [hours2, minutes2] = normalizedTime2.split(':').map(Number);
    
    // Comparer
    if (hours1 > hours2) return true;
    if (hours1 === hours2 && minutes1 >= minutes2) return true;
    return false;
}

/**
 * Parse une heure au format HH:MM ou HHhMM
 * @param {string} timeStr - Heure au format HH:MM ou HHhMM
 * @returns {Object} - Objet avec les propriétés hours et minutes
 */
function parseTime(timeStr) {
    // Normaliser le format (HH:MM et HHhMM)
    const normalizedTime = timeStr.replace('h', ':');
    
    // Extraire les heures et minutes
    const [hours, minutes] = normalizedTime.split(':').map(Number);
    
    return { hours, minutes };
}

/**
 * Récupère les créneaux disponibles pour une date donnée
 * @param {string} date - Date au format YYYY-MM-DD
 * @param {string} time - Heure minimale de recherche (optionnelle)
 * @returns {Promise<Array>} - Liste des créneaux disponibles
 */
async function getAvailableSlots(date, time = null) {
    try {
        console.log(`[PADEL TWINS] Recherche de créneaux pour ${date} à partir de ${time || 'toute heure'}`);
        
        // Générer la clé de cache
        const cacheKey = cache.generateKey(date, time);
        
        // Vérifier si les données sont en cache
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
            console.log(`[PADEL TWINS] Utilisation du cache pour ${cacheKey}: ${cachedData.length} créneaux`);
            return cachedData;
        }
        
        // Formater la date pour l'API
        const formattedDate = formatDateForApi(date);
        
        // Préparer les données de la requête
        const data = new URLSearchParams();
        data.append('myDate', formattedDate);
        data.append('duree', '90');
        data.append('id_sport', '2');
        
        // Configurer les headers
        const headers = {
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'accept': 'text/html, */*; q=0.01',
            'sec-fetch-site': 'cross-site',
            'accept-language': 'fr-FR,fr;q=0.9',
            'sec-fetch-mode': 'cors',
            'origin': 'null',
            'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
            'sec-fetch-dest': 'empty'
        };
        
        // Faire la requête
        console.log(`[PADEL TWINS] Envoi de la requête à ${BASE_URL}${API_ENDPOINT}`);
        console.log(`[PADEL TWINS] Données: ${data.toString()}`);
        
        const response = await axios.post(`${BASE_URL}${API_ENDPOINT}`, data, { headers });
        
        // Vérifier la réponse
        if (!response.data) {
            console.log(`[PADEL TWINS] Réponse vide`);
            return [];
        }
        
        console.log(`[PADEL TWINS] Réponse reçue (${response.data.length} caractères)`);
        
        // Analyser la réponse HTML avec Cheerio
        const $ = cheerio.load(response.data);
        
        // Extraire les créneaux disponibles
        const slots = [];
        
        // Ensemble pour suivre les créneaux déjà ajoutés (pour éviter les doublons)
        const addedSlots = new Set();
        
        // Afficher un extrait du HTML pour déboguer
        console.log(`[PADEL TWINS] Extrait du HTML:`);
        console.log(response.data.substring(0, 500) + '...');
        
        // Rechercher les créneaux disponibles dans le HTML
        // Cibler les boutons verts (btn-success) qui contiennent les créneaux disponibles
        $('.btn-success.btn-horaires').each((i, el) => {
            // Extraire les informations du créneau
            const timeText = $(el).find('h1').first().text().trim();
            // Extraire les informations sur les terrains
            const terrainInfo = $(el).find('small small').text().trim();
            
            // Standardiser l'heure (format HH:MM)
            const timeMatch = timeText.match(/(\d{1,2})h(\d{2})/);
            if (!timeMatch) {
                console.log(`[PADEL TWINS] Format d'heure non reconnu: ${timeText}`);
                return; // Passer au suivant
            }
            
            const hours = parseInt(timeMatch[1], 10);
            const minutes = parseInt(timeMatch[2], 10);
            const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            
            // Extraire le nombre de terrains et le prix
            const terrainMatch = terrainInfo.match(/(\d+)\s*Terrains\s*\|\s*Dès\s*(\d+)/);
            const nbTerrains = terrainMatch ? parseInt(terrainMatch[1], 10) : 1;
            const price = terrainMatch ? parseInt(terrainMatch[2], 10) : 0;
            
            console.log(`[PADEL TWINS] Créneau trouvé: ${formattedTime}, ${nbTerrains} terrains, prix: ${price}€`);
            
            // Vérifier si l'heure est supérieure à l'heure minimale
            if (isTimeGreaterOrEqual(formattedTime, time)) {
                // Pour chaque terrain disponible, créer un créneau
                for (let i = 1; i <= nbTerrains; i++) {
                    // Créer une clé unique pour ce créneau (heure + terrain)
                    const slotKey = `${formattedTime}_Terrain_${i}`;
                    
                    // Vérifier si ce créneau n'a pas déjà été ajouté
                    if (!addedSlots.has(slotKey)) {
                        // Ajouter le créneau à la liste
                        slots.push({
                            date: date, // Format YYYY-MM-DD
                            time: formattedTime,
                            startTime: formattedTime, // Pour compatibilité avec le générateur de liens
                            court: `Terrain ${i}`,
                            clubId: 'padeltwins',
                            clubName: 'Padel Twins',
                            address: '1050 Rte de Velaux, 13111 Coudoux',
                            latitude: 43.54955982167091,
                            longitude: 5.2563952803531055,
                            type: 'extérieur',
                            price: `${price}€`
                        });
                        
                        // Marquer ce créneau comme ajouté
                        addedSlots.add(slotKey);
                    }
                }
            }
        });
        
        console.log(`[PADEL TWINS] ${slots.length} créneaux trouvés pour ${date}`);
        
        // Ajouter les liens de réservation
        const slotsWithLinks = ReservationLinkGenerator.addReservationLinks(slots);
        console.log(`[PADEL TWINS] Liens de réservation ajoutés aux ${slotsWithLinks.length} créneaux`);
        
        // Afficher un exemple de lien de réservation
        if (slotsWithLinks.length > 0) {
            console.log(`[PADEL TWINS] Exemple de lien de réservation: ${slotsWithLinks[0].reservationLink}`);
        }
        
        // Mettre en cache les résultats
        cache.set(cacheKey, slotsWithLinks);
        
        return slotsWithLinks;
    } catch (error) {
        console.error(`[PADEL TWINS] Erreur lors de la récupération des créneaux: ${error.message}`);
        return [];
    }
}

module.exports = {
    getAvailableSlots
};
