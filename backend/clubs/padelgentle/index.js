/**
 * Padel Gentle - Module principal
 * Implémente la requête pour obtenir les créneaux disponibles
 * Basé sur la logique du script Python capture.py
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { URLSearchParams } = require('url');
const ReservationLinkGenerator = require('./reservationLinkGenerator');

// URL et configuration
const BASE_URL = "https://openresa.com/plannings-integrated";
const WIDGET_ID = "1448";
const API_KEY = "4537b1a27b78108e8932cf5163272e78423233210c740abf61c8604b278a9823d28945e1bb4c024e";

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
        
        console.log(`[CACHE PadelGentle] Vérification pour ${key}:`);
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
        console.log(`[CACHE PadelGentle] ✅ Utilisation des données en cache pour ${key}`);
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
        console.log(`[CACHE PadelGentle] 📝 Mise en cache de ${data.length} créneaux pour ${key}`);
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
            console.log(`[CACHE PadelGentle] 🧹 Nettoyage: ${expiredCount} entrées expirées supprimées`);
        }
        
        console.log(`[CACHE PadelGentle] 📊 État actuel: ${this.slots.size} entrées en cache`);
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
 * Parse une heure au format HH:MM ou HHh ou HHhMM
 * @param {string} timeStr - Heure à parser
 * @returns {Object} Objet avec heures et minutes
 */
function parseTime(timeStr) {
    let hours = 0;
    let minutes = 0;
    
    // Vérifier que timeStr est une chaîne valide
    if (!timeStr || typeof timeStr !== 'string') {
        console.log(`[PADEL GENTLE] ATTENTION: Format d'heure invalide: ${timeStr}`);
        return { hours, minutes };
    }
    
    // Format HH:MM
    if (timeStr.includes(':')) {
        [hours, minutes] = timeStr.split(':').map(Number);
    } 
    // Format HHh ou HHhMM
    else if (timeStr.includes('h')) {
        const parts = timeStr.split('h');
        hours = parseInt(parts[0], 10);
        minutes = parts[1] ? parseInt(parts[1], 10) : 0;
    }
    
    return { hours, minutes };
}

/**
 * Compare deux heures pour déterminer si la première est supérieure ou égale à la seconde
 * @param {string} time1 - Première heure
 * @param {string} time2 - Deuxième heure
 * @returns {boolean} True si time1 >= time2
 */
function isTimeGreaterOrEqual(time1, time2) {
    const t1 = parseTime(time1);
    const t2 = parseTime(time2);
    
    if (t1.hours > t2.hours) return true;
    if (t1.hours === t2.hours && t1.minutes >= t2.minutes) return true;
    return false;
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
    
    // Nettoyer les entrées expirées du cache
    cache.cleanup();
    
    // Vérifier si les données sont en cache
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
        console.log(`[PADEL GENTLE] Utilisation du cache pour ${date} à partir de ${time}`);
        return cachedData;
    }
    
    console.log(`[PADEL GENTLE] Recherche de créneaux pour ${date} à partir de ${time}`);
    
    // Convertir la date au format DD/MM/YYYY pour l'API
    const formattedDate = formatDateForApi(date);
    
    try {
        // Préparer les en-têtes pour la requête
        const headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:138.0) Gecko/20100101 Firefox/138.0",
            "Accept": "*/*",
            "Accept-Language": "fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3",
            "Referer": "https://openresa.com/plannings-integrated",
            "X-Requested-With": "XMLHttpRequest",
        };
        
        // Construire l'URL avec les paramètres
        const url = `${BASE_URL}?widget=1&id=${WIDGET_ID}&key=${API_KEY}&date=${encodeURIComponent(formattedDate)}`;
        
        // Envoyer la requête GET
        const response = await axios.get(url, { headers });
        
        // Vérifier si la réponse est valide
        if (response.status !== 200) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        // Analyser la réponse HTML avec Cheerio
        const $ = cheerio.load(response.data);
        
        // Extraire les créneaux disponibles
        const slots = [];
        
        // Ensemble pour suivre les créneaux déjà ajoutés (pour éviter les doublons)
        const addedSlots = new Set();
        
        // Vérifier si la réponse contient un message d'erreur
        const errorMessage = $('.text.text-error').text().trim();
        if (errorMessage) {
            console.log(`[PADEL GENTLE] Message d'erreur du site: ${errorMessage}`);
            return slots; // Retourner un tableau vide si erreur
        }
        
        // Afficher un extrait du HTML pour déboguer
        console.log(`[PADEL GENTLE] Extrait du HTML:`);
        console.log(response.data.substring(0, 500) + '...');
        
        // Vérifier la présence des éléments clés
        console.log(`[PADEL GENTLE] Contient 'schedule-container': ${response.data.includes('schedule-container')}`);
        console.log(`[PADEL GENTLE] Contient 'slot-free': ${response.data.includes('slot-free')}`);
        console.log(`[PADEL GENTLE] Contient 'schedule-slot': ${response.data.includes('schedule-slot')}`);
        console.log(`[PADEL GENTLE] Contient 'slot-busy': ${response.data.includes('slot-busy')}`);
        console.log(`[PADEL GENTLE] Contient 'slot-disabled': ${response.data.includes('slot-disabled')}`);
        
        
        // Créer une grille horaire par défaut pour l'extraction des heures
        const timeLabels = [];
        
        // Rechercher les heures dans la légende du planning
        $('.schedule-legend-hour').each((i, el) => {
            const hourText = $(el).text().trim();
            timeLabels.push(hourText);
        });
        
        // Si nous n'avons pas trouvé d'heures dans la légende, essayer de les trouver ailleurs
        if (timeLabels.length === 0) {
            // Chercher dans les classes CSS qui pourraient contenir des informations d'heure
            $('.schedule-column').each((i, column) => {
                const columnClass = $(column).attr('class') || '';
                const hourMatch = columnClass.match(/hour-([0-9]+)/);
                if (hourMatch && hourMatch[1]) {
                    timeLabels.push(`${hourMatch[1]}h00`);
                }
            });
        }
        
        // Si nous n'avons toujours pas d'heures, créer une grille horaire par défaut
        if (timeLabels.length === 0) {
            // Heures exactes observées sur le site Padel Gentle
            timeLabels.push('09h45');
            timeLabels.push('10h45');
            timeLabels.push('12h15');
            timeLabels.push('14h15');
            timeLabels.push('15h45');
            timeLabels.push('17h15');
            timeLabels.push('18h45');
        }
        
        // Compter les éléments trouvés
        const scheduleContainers = $('div.schedule-container');
        console.log(`[PADEL GENTLE] Nombre de conteneurs de planning trouvés: ${scheduleContainers.length}`);
        
        // Pour chaque conteneur de planning
        scheduleContainers.each((i, container) => {
            // Récupérer le nom du terrain
            const courtNameTag = $(container).find('.schedule-header-name .media-body');
            let courtName = courtNameTag.length ? courtNameTag.text().trim() : "Inconnu";
            
            // Corriger le nom du terrain s'il est répété (ex: COURT N°1COURT N°1)
            if (courtName.includes('COURT N°') && courtName.length > 10) {
                courtName = courtName.substring(0, courtName.indexOf('COURT N°') + 9);
            }
            
            // Récupérer les créneaux libres pour ce terrain
            // D'après la capture d'écran, les créneaux libres sont les cases vides (non occupées)
            // Essayons plusieurs sélecteurs pour trouver les créneaux
            let freeSlots = $(container).find('a.slot-free');
            console.log(`[PADEL GENTLE] Terrain ${courtName}: ${freeSlots.length} créneaux avec 'a.slot-free'`);
            
            // Analyser la structure des colonnes
            const columns = $(container).find('.schedule-column');
            console.log(`[PADEL GENTLE] Terrain ${courtName}: ${columns.length} colonnes trouvées`);
            
            // Analyser les attributs des créneaux pour le premier créneau
            if (freeSlots.length > 0) {
                const firstSlot = freeSlots.first();
                console.log(`[PADEL GENTLE] Premier créneau - Attributs:`);
                console.log(`[PADEL GENTLE] - data-time: ${$(firstSlot).attr('data-time')}`);
                console.log(`[PADEL GENTLE] - data-date: ${$(firstSlot).attr('data-date')}`);
                console.log(`[PADEL GENTLE] - data-court: ${$(firstSlot).attr('data-court')}`);
                console.log(`[PADEL GENTLE] - data-column: ${$(firstSlot).attr('data-column')}`);
                console.log(`[PADEL GENTLE] - class: ${$(firstSlot).attr('class')}`);
                console.log(`[PADEL GENTLE] - HTML: ${$(firstSlot).prop('outerHTML').substring(0, 200)}...`);
            }
            
            // Si aucun créneau trouvé, essayer d'autres sélecteurs
            if (freeSlots.length === 0) {
                freeSlots = $(container).find('.schedule-slot:not(.slot-busy):not(.slot-disabled)');
                console.log(`[PADEL GENTLE] Terrain ${courtName}: ${freeSlots.length} créneaux avec '.schedule-slot:not(.slot-busy):not(.slot-disabled)'`);
            }
            
            if (freeSlots.length === 0) {
                freeSlots = $(container).find('.schedule-slot');
                console.log(`[PADEL GENTLE] Terrain ${courtName}: ${freeSlots.length} créneaux avec '.schedule-slot'`);
            }
            
            // Pour chaque créneau libre
            freeSlots.each((j, slot) => {
                // Récupérer l'heure du créneau en fonction de sa position dans la grille
                const slotElement = $(slot);
                
                // Extraire l'heure de début à partir de l'attribut data-timestart
                let slotTime = '09h45'; // Valeur par défaut
                
                // Récupérer l'attribut data-timestart qui contient les minutes depuis minuit
                const timeStartAttr = $(slot).attr('data-timestart');
                if (timeStartAttr) {
                    const timeStartMinutes = parseInt(timeStartAttr, 10);
                    if (!isNaN(timeStartMinutes)) {
                        // Convertir les minutes en heures et minutes
                        const hours = Math.floor(timeStartMinutes / 60);
                        const minutes = timeStartMinutes % 60;
                        
                        // Formater l'heure au format HHhMM
                        slotTime = `${hours}h${minutes.toString().padStart(2, '0')}`;
                        
                        // Si l'heure est 9h15, ajouter 30 minutes pour obtenir 9h45
                        // car les créneaux commencent à 9h45 d'après la capture d'écran
                        if (hours === 9 && minutes === 15) {
                            slotTime = '09h45';
                        }
                    }
                }
                
                // Vérifier si l'heure est supérieure à l'heure minimale
                console.log(`[PADEL GENTLE] Créneau trouvé: ${slotTime} pour ${courtName}`);
                const isGreaterOrEqual = isTimeGreaterOrEqual(slotTime, time);
                console.log(`[PADEL GENTLE] ${slotTime} >= ${time} ? ${isGreaterOrEqual ? 'OUI' : 'NON'}`);
                
                // Vérifier si l'heure est supérieure à l'heure minimale
                if (isGreaterOrEqual) {
                    // Standardiser le format de l'heure (HH:MM)
                    const { hours, minutes } = parseTime(slotTime);
                    const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                    
                    // Créer une clé unique pour ce créneau (heure + terrain)
                    const slotKey = `${formattedTime}_${courtName}`;
                    
                    // Vérifier si ce créneau n'a pas déjà été ajouté
                    if (!addedSlots.has(slotKey)) {
                        // Extraire l'URL de réservation si disponible
                        let reservationLink = $(slot).attr('href') || '';
                        if (reservationLink && !reservationLink.startsWith('http')) {
                            reservationLink = `https://openresa.com${reservationLink}`;
                        }
                        
                        // Ajouter le créneau à la liste
                        slots.push({
                            date: date, // Format YYYY-MM-DD
                            time: formattedTime,
                            court: courtName,
                            type: 'extérieur', // Par défaut pour Padel Gentle
                            courtType: 'extérieur',
                            available: true,
                            price: 0, // Prix non disponible
                            reservationLink: reservationLink,
                            clubName: 'Padel Gentle',
                            clubId: 'padelgentle',
                            address: 'Quartier de la Garenne, RN 113, 13300 Salon-de-Provence, France',
                            coordinates: {
                                latitude: 43.60544814765865,
                                longitude: 5.098444841051269
                            }
                        });
                        
                        // Marquer ce créneau comme ajouté
                        addedSlots.add(slotKey);
                    }
                }
            });
        });
        
        console.log(`[PADEL GENTLE] ${slots.length} créneaux trouvés pour ${date}`);
        
        // Ajouter les liens de réservation
        const slotsWithLinks = ReservationLinkGenerator.addReservationLinks(slots);
        console.log(`[PADEL GENTLE] Liens de réservation ajoutés aux ${slotsWithLinks.length} créneaux`);
        
        // Afficher un exemple de lien de réservation
        if (slotsWithLinks.length > 0) {
            console.log(`[PADEL GENTLE] Exemple de lien de réservation: ${slotsWithLinks[0].reservationLink}`);
        }
        
        // Mettre en cache les résultats
        cache.set(cacheKey, slotsWithLinks);
        
        return slotsWithLinks;
    } catch (error) {
        console.error(`[PADEL GENTLE] Erreur lors de la recherche de créneaux:`, error);
        return [];
    }
}

/**
 * Teste la connexion au site de Padel Gentle
 * @returns {Promise<boolean>} - True si la connexion est réussie
 */
async function testConnection() {
    try {
        // Tester la connexion en essayant d'accéder à la page principale
        const response = await axios.get(`${BASE_URL}?widget=1&id=${WIDGET_ID}&key=${API_KEY}`);
        return response.status === 200;
    } catch (error) {
        console.error('Erreur lors du test de connexion à Padel Gentle:', error);
        return false;
    }
}

module.exports = {
    findAvailableSlots,
    testConnection
};
