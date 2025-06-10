/**
 * P4 Padel Indoor - Module principal
 * Implémente la requête POST directe pour obtenir les créneaux disponibles
 * Version optimisée avec les en-têtes exacts comme demandé par l'utilisateur
 * Utilise le système de gestion multi-comptes pour la rotation des cookies
 * Affiche la réponse brute pour analyse
 */

const axios = require('axios');
const { getNextAccount } = require('./cookie-manager');

// URL de base et endpoints
const BASE_URL = 'https://p4-padel-indoor.gestion-sports.com';
const RESERVATION_ENDPOINT = '/membre/reservation.html';
const SPORT_ID = '1057'; // ID du sport Padel

// Système de cache amélioré
const cache = {
  slots: new Map(), // Map pour stocker les créneaux par date et plage horaire
  timestamps: new Map(), // Map pour stocker les timestamps des dernières requêtes
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes en millisecondes
  
  /**
   * Génère une clé de cache unique basée sur les paramètres de recherche
   * @param {string} date - Date au format YYYY-MM-DD
   * @param {number} startHour - Heure de début de la plage
   * @param {number} endHour - Heure de fin de la plage
   * @returns {string} Clé de cache unique
   */
  generateKey(date, startHour, endHour) {
    return `${date}_${startHour}-${endHour}`;
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
   * Récupère les données en cache si elles sont valides
   * @param {string} key - Clé de cache
   * @returns {Array|null} Données en cache ou null si invalides/inexistantes
   */
  get(key) {
    if (!this.isValid(key)) return null;
    console.log(`[CACHE] ✅ Utilisation des données en cache pour ${key}`);
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
    console.log(`[CACHE] 📝 Mise en cache de ${data.length} créneaux pour ${key}`);
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
      console.log(`[CACHE] 🧹 Nettoyage: ${expiredCount} entrées expirées supprimées`);
    }
    
    console.log(`[CACHE] 📊 État actuel: ${this.slots.size} entrées en cache`);
  }
};

// Importer les fonctions auxiliaires de slotFinder
const slotFinder = require('./slotFinder');

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
 * Crée les en-têtes HTTP pour les requêtes
 * @param {Object} account - Compte avec cookies
 * @returns {Object} En-têtes HTTP
 */
function createHeaders(account) {
  return {
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'X-Requested-With': 'XMLHttpRequest',
    'Referer': `${BASE_URL}${RESERVATION_ENDPOINT}`,
    'Cookie': account.cookieHeader,
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:138.0) Gecko/20100101 Firefox/138.0',
  };
}

// Note: La fonction isCacheValid a été remplacée par la méthode cache.isValid()

/**
 * Envoie une requête POST à l'API P4 pour récupérer les créneaux disponibles
 * @param {string} date - Date au format YYYY-MM-DD
 * @param {string} hour - Heure au format HH:MM
 * @returns {Promise<Object>} Réponse de l'API
 */
async function sendPostRequest(date, hour) {
  const formattedDate = formatDateForApi(date);
  
  // Récupérer un compte disponible avec ses cookies
  const account = getNextAccount();
  if (!account) throw new Error('Aucun compte disponible avec des cookies valides');
  
  const data = `ajax=loadCourtDispo&hour=${hour}&date=${formattedDate}&idSport=1057`;
  
  // Construire les en-têtes avec les cookies
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:138.0) Gecko/20100101 Firefox/138.0',
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Accept-Language': 'fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'X-Requested-With': 'XMLHttpRequest',
    'Origin': BASE_URL,
    'Connection': 'keep-alive',
    'Referer': `${BASE_URL}/membre/reservation.html`,
    'Cookie': account.cookieHeader,
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin'
  };
  
  // Afficher les détails de la requête pour le debug
  console.log('[DEBUG] Requête POST:');
  console.log(`URL: ${BASE_URL}/membre/reservation.html`);
  console.log(`Données: ${data}`);
  console.log(`En-têtes: ${JSON.stringify(headers).substring(0, 100)}...`);
  console.log(`Compte utilisé: ${account.id}`);
  
  try {
    // Envoyer la requête POST
    const response = await axios.post(`${BASE_URL}/membre/reservation.html`, data, { headers });
    
    // Vérifier si la réponse est valide
    if (response.status === 200) {
      console.log(`[DEBUG] Réponse reçue (status: ${response.status})`);
      
      // Vérifier si la réponse est une page HTML (problème d'authentification)
      if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>')) {
        console.error(`[DEBUG] Réponse HTML reçue pour ${hour} - Problème d'authentification`);
        console.error(`[DEBUG] Les cookies du compte ${account.id} semblent expirés ou invalides`);
        return { error: 'auth_error', hour };
      }
      
      // Afficher le contenu brut de la réponse pour analyse
      console.log(`[DEBUG] Contenu brut de la réponse pour ${hour}:`);
      console.log(`Type de données: ${typeof response.data}`);
      
      if (typeof response.data === 'string') {
        try {
          // Essayer de parser la réponse pour voir si c'est du JSON valide
          const parsedData = JSON.parse(response.data);
          console.log('[DEBUG] Réponse parsée avec succès:');
          console.log(JSON.stringify(parsedData).substring(0, 300) + '...');
          return { data: parsedData, hour }; // Retourner les données parsées avec l'heure
        } catch (e) {
          // Si ce n'est pas du JSON valide, afficher les premiers caractères
          console.log('[DEBUG] Réponse non-JSON:');
          console.log(response.data.substring(0, 300) + '...');
          return { data: [], hour }; // Retourner un tableau vide avec l'heure
        }
      } else {
        // Si ce n'est pas une chaîne, afficher l'objet directement
        console.log('[DEBUG] Réponse (objet):');
        console.log(JSON.stringify(response.data).substring(0, 300) + '...');
        return { data: response.data, hour };
      }
    } else {
      console.warn(`[DEBUG] Réponse avec code d'erreur: ${response.status}`);
      return { error: `status_${response.status}`, hour };
    }
  } catch (error) {
    console.error(`[DEBUG] Erreur lors de la requête: ${error.message}`);
    
    // Si erreur 403 ou 401, le compte est peut-être banni ou les cookies expirés
    if (error.response && (error.response.status === 403 || error.response.status === 401)) {
      console.warn(`Le compte ${account.id} semble avoir des problèmes d'authentification. Essayez de rafraîchir les cookies.`);
    }
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Données: ${JSON.stringify(error.response.data).substring(0, 200)}`);
    }
    
    return { error: error.message, hour };
  }
}

/**
 * Calcule l'heure de fin à partir de l'heure de début (ajoute 1h30)
 * @param {string} startTime - Heure de début au format HH:MM
 * @returns {string} Heure de fin au format HH:MM
 */
function calculateEndTime(startTime) {
  const [hours, minutes] = startTime.split(':').map(Number);
  
  let endHours = hours;
  let endMinutes = minutes + 90; // Durée standard de 1h30
  
  if (endMinutes >= 60) {
    endHours += Math.floor(endMinutes / 60);
    endMinutes = endMinutes % 60;
  }
  
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
}

/**
 * Extrait les créneaux disponibles d'une réponse de l'API
 * @param {Object|Array|string} response - Réponse de l'API
 * @param {string} date - Date au format YYYY-MM-DD
 * @returns {Array} Liste des créneaux disponibles
 */
function extractSlotsFromResponse(response, date) {
  const allSlots = [];
  
  // Vérifier si la réponse est valide
  if (!response) {
    console.log('[DEBUG] Réponse vide ou invalide');
    return allSlots;
  }
  
  // Afficher le type de réponse pour le debug
  console.log(`[DEBUG] Type de réponse: ${typeof response}`);
  
  // Si la réponse est une chaîne JSON, la parser
  let parsedResponse = response;
  if (typeof response === 'string') {
    try {
      parsedResponse = JSON.parse(response);
      console.log('[DEBUG] Réponse JSON parsée avec succès');
    } catch (error) {
      console.error('[DEBUG] Erreur lors du parsing JSON:', error.message);
      return allSlots;
    }
  }
  
  // Traiter la réponse comme un tableau
  const courts = Array.isArray(parsedResponse) ? parsedResponse : [];
  
  console.log(`[DEBUG] Nombre de courts trouvés: ${courts.length}`);
  
  // Afficher un échantillon de la réponse pour le debug
  if (courts.length > 0) {
    console.log('[DEBUG] Premier court:', JSON.stringify(courts[0]).substring(0, 200) + '...');
  }
  
  // Parcourir tous les courts
  for (let i = 0; i < courts.length; i++) {
    const court = courts[i];
    if (!court) continue;
    
    const courtName = court.name || `Court ${court.idCourt || i+1}`;
    
    // Vérifier si heuresDispo existe et est un tableau
    if (!court.heuresDispo || !Array.isArray(court.heuresDispo)) {
      console.log(`[DEBUG] Court ${courtName} n'a pas de heuresDispo valide`);
      continue;
    }
    
    const heuresDispo = court.heuresDispo;
    console.log(`[DEBUG] Court ${courtName} a ${heuresDispo.length} créneaux disponibles`);
    
    // Afficher un échantillon des heures disponibles pour le debug
    if (heuresDispo.length > 0) {
      console.log('[DEBUG] Premier créneau:', JSON.stringify(heuresDispo[0]).substring(0, 200) + '...');
    }
    
    // Parcourir toutes les heures disponibles pour ce court
    for (const slot of heuresDispo) {
      if (!slot || !slot.hourStart) continue;
      
      // Vérifier si duration est un tableau et contient au moins un élément
      if (!Array.isArray(slot.duration) || slot.duration.length === 0) continue;
      
      const hour = slot.hourStart;
      const duration = slot.duration[0].duration || 90; // Par défaut 90 minutes
      const price = slot.duration[0].price || 0;
      
      // Calculer l'heure de fin
      const [hours, minutes] = hour.split(':').map(Number);
      const endMinutes = (minutes + duration) % 60;
      const endHours = (hours + Math.floor((minutes + duration) / 60)) % 24;
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
      
      // URL unique pour tous les créneaux du P4 Padel Indoor
      const uniqueP4Url = 'https://p4-padel-indoor.gestion-sports.com/membre/';
      
      // Ajouter le créneau à la liste avec l'URL unique
      allSlots.push({
        date,
        startTime: hour,
        endTime,
        court: courtName,
        courtId: court.idCourt,
        price,
        reservationLink: uniqueP4Url
      });
      
      console.log(`[DEBUG] Créneau ajouté: ${courtName} à ${hour}`);
    }
  }
  
  console.log(`[DEBUG] Total de créneaux extraits: ${allSlots.length}`);
  return allSlots;
}

/**
 * Récupère tous les créneaux disponibles pour une date donnée
 * @param {string} date - Date au format YYYY-MM-DD
 * @param {string} [requestedHour=null] - Heure demandée par l'utilisateur (format HH:MM)
 * @param {number} [hourRange=3] - Plage horaire en heures autour de l'heure demandée (optionnel)
 * @returns {Promise<Array>} - Liste des créneaux disponibles
 */
async function getAllSlotsForDate(date, requestedHour = null, hourRange = 3) {
  try {
    console.log(`Récupération des créneaux pour ${date}${requestedHour ? ` autour de ${requestedHour}` : ''}...`);
    const startTime = Date.now();
    
    // Déterminer la plage horaire à vérifier
    let startHour = 8; // Par défaut, commencer à 8h
    let endHour = 22;  // Par défaut, terminer à 22h
    
    // Si une heure spécifique est demandée, ajuster la plage
    let requestedHourValue = null;
    if (requestedHour) {
      // Accepter à la fois un nombre ou une chaîne de caractères (format HH:MM)
      if (typeof requestedHour === 'number') {
        requestedHourValue = requestedHour;
      } else if (typeof requestedHour === 'string' && requestedHour.includes(':')) {
        requestedHourValue = parseInt(requestedHour.split(':')[0], 10);
      } else {
        // Essayer de convertir en nombre
        requestedHourValue = parseInt(requestedHour, 10);
      }
      
      // Vérifier que la conversion a fonctionné
      if (isNaN(requestedHourValue)) {
        console.error(`[ERREUR] Format d'heure invalide: ${requestedHour}`);
        requestedHourValue = 12; // Valeur par défaut en cas d'erreur
      }
      
      startHour = Math.max(8, requestedHourValue - hourRange);
      endHour = Math.min(22, requestedHourValue + hourRange);
    }
    
    console.log(`Plage horaire: ${startHour}h à ${endHour}h`);
    
    // Générer la clé de cache avec la méthode dédiée
    const cacheKey = cache.generateKey(date, startHour, endHour);
    
    // Nettoyage des entrées expirées du cache
    cache.cleanup();
    
    // Vérifier si les données sont en cache et valides
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }
    
    // Générer toutes les heures à vérifier (heures pleines et demi-heures)
    const hoursToCheck = [];
    
    for (let hour = startHour; hour <= endHour; hour++) {
      // Ajouter l'heure pleine
      hoursToCheck.push(`${hour.toString().padStart(2, '0')}:00`);
      
      // Ajouter la demi-heure sauf si c'est la dernière heure
      if (hour < endHour) {
        hoursToCheck.push(`${hour.toString().padStart(2, '0')}:30`);
      }
    }
    
    console.log(`Vérification de ${hoursToCheck.length} créneaux horaires:`);
    console.log(hoursToCheck.join(', '));
    
    // Préparer les requêtes pour toutes les heures
    const requests = hoursToCheck.map(hour => {
      return {
        hour,
        promise: sendPostRequest(date, hour)
          .then(result => {
            console.log(`[DEBUG] Requête pour ${hour} terminée`);
            return { ...result, hour }; // result contient déjà l'heure et les données ou l'erreur
          })
          .catch(error => {
            console.error(`[DEBUG] Erreur pour ${hour}: ${error.message}`);
            return { error: error.message, hour };
          })
      };
    });
    
    // Exécuter toutes les requêtes en parallèle avec un timeout de 3 secondes
    console.log(`[DEBUG] Attente de la fin de ${requests.length} requêtes parallèles...`);
    
    // Créer des promesses avec timeout
    const promisesWithTimeout = requests.map(req => {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout pour ${req.hour}`)), 3000);
      });
      
      return Promise.race([req.promise, timeoutPromise]);
    });
    
    // Attendre que toutes les requêtes soient terminées
    const results = await Promise.all(promisesWithTimeout.map(p => p.catch(e => ({ error: e.message }))));
    
    console.log(`[DEBUG] ${results.length} requêtes parallèles terminées en ${((Date.now() - startTime) / 1000).toFixed(3)}s`);
    
    // Traiter les résultats
    console.log(`[DEBUG] Traitement des réponses...`);
    
    // Compter les erreurs d'authentification
    const authErrors = results.filter(r => r.error === 'auth_error').length;
    if (authErrors > 0) {
      console.error(`[ALERTE] ${authErrors}/${results.length} requêtes ont échoué avec des erreurs d'authentification`);
      console.error(`Les cookies semblent expirés ou invalides. Essayez de les rafraîchir.`);
      
      if (authErrors === results.length) {
        console.error(`Toutes les requêtes ont échoué - Impossible de récupérer les créneaux`);
        return [];
      }
    }
    
    const allSlots = [];
    
    for (const result of results) {
      if (result.error) {
        console.error(`[DEBUG] Erreur pour ${result.hour || 'heure inconnue'}: ${result.error}`);
        continue;
      }
      
      if (!result.data) {
        console.error(`[DEBUG] Pas de données pour ${result.hour || 'heure inconnue'}`);
        continue;
      }
      
      console.log(`[DEBUG] Extraction des créneaux pour ${result.hour || 'heure inconnue'}...`);
      const slotsForHour = extractSlotsFromResponse(result.data, date);
      console.log(`[DEBUG] ${slotsForHour.length} créneaux extraits pour ${result.hour || 'heure inconnue'}`);
      
      allSlots.push(...slotsForHour);
    }
    
    // Filtrer les créneaux pour ne garder que ceux dans la plage demandée
    const filteredSlots = allSlots.filter(slot => {
      const slotHour = parseInt(slot.startTime.split(':')[0], 10);
      return slotHour >= startHour && slotHour <= endHour;
    });
    
    console.log(`Filtrage final: ${filteredSlots.length}/${allSlots.length} créneaux dans la plage de ${startHour}h à ${endHour}h`);
    
    // Éliminer les doublons (même court, même heure)
    const uniqueSlots = [];
    const seenSlots = new Set();
    
    for (const slot of filteredSlots) {
      const key = `${slot.court}_${slot.startTime}`;
      if (!seenSlots.has(key)) {
        seenSlots.add(key);
        uniqueSlots.push(slot);
      }
    }
    
    // Mettre en cache les résultats avec la méthode dédiée
    cache.set(cacheKey, uniqueSlots);
    
    console.log(`Total: ${uniqueSlots.length} créneaux disponibles pour ${date}`);
    console.log(`Temps total: ${((Date.now() - startTime) / 1000).toFixed(3)}s`);
    
    return uniqueSlots;
  } catch (error) {
    console.error(`Erreur lors de la récupération rapide des créneaux: ${error.message}`);
    return [];
  }
}

/**
 * Récupère les créneaux disponibles pour une date donnée
 * @param {string} date - Date au format YYYY-MM-DD
 * @returns {Promise<Array>} Liste des créneaux disponibles
 */
async function getAvailableSlots(date) {
  // Utiliser la nouvelle méthode optimisée
  return getAllSlotsForDate(date);
}

/**
 * Vérifie si le module peut se connecter correctement
 * Cette fonction est utilisée par le système de monitoring
 * @returns {Promise<boolean>} true si la connexion est réussie
 */
async function testConnection() {
  try {
    console.log('Test de connexion P4 Padel Indoor...');
    
    // Récupérer un compte disponible avec ses cookies
    const account = getNextAccount();
    
    if (!account) {
      console.error('Aucun compte avec cookies valides disponible pour P4 Padel Indoor');
      return false;
    }
    
    console.log(`Compte disponible: ${account.id} (${account.email})`);
    console.log(`Date d'expiration des cookies: ${new Date(account.expiryDate).toLocaleString()}`);
    console.log(`Jours restants: ${account.daysRemaining}`);
    
    // Essayer de récupérer les créneaux pour demain (test simple)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    console.log(`Test avec la date de demain: ${tomorrowStr}`);
    
    // Pour le monitoring, on fait une requête très limitée avec une heure spécifique
    // et une plage horaire minimale pour éviter d'être banni
    const testHour = 14; // On teste à 14h
    const slots = await getAllSlotsForDate(tomorrowStr, testHour, 1); // Plage de 1h seulement
    
    // Le test est réussi si on a pu faire la requête sans erreur
    console.log(`Test de connexion P4 Padel Indoor réussi (${slots.length} créneaux trouvés)`);
    return true;
  } catch (error) {
    console.error(`Test de connexion P4 Padel Indoor échoué: ${error.message}`);
    return false;
  }
}

/**
 * Recherche les créneaux disponibles pour les N prochains jours
 * @param {number} daysAhead - Nombre de jours à rechercher
 * @returns {Promise<Object>} Créneaux disponibles par date
 */
async function findSlotsForNextDays(daysAhead = 7) {
  console.log(`Recherche des créneaux disponibles pour les ${daysAhead} prochains jours...`);
  
  const results = {};
  const today = new Date();
  
  for (let i = 0; i < daysAhead; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    
    // Formater la date au format YYYY-MM-DD
    const formattedDate = date.toISOString().split('T')[0];
    
    // Ajouter un délai aléatoire entre les requêtes pour éviter la détection
    if (i > 0) {
      const delay = Math.floor(Math.random() * 5000) + 3000; // Entre 3 et 8 secondes
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    try {
      console.log(`\nJour ${i+1}/${daysAhead}: ${formattedDate}`);
      const slotsForDay = await getAvailableSlots(formattedDate);
      results[formattedDate] = slotsForDay;
      
      console.log(`${formattedDate}: ${slotsForDay.length} créneaux disponibles`);
    } catch (error) {
      console.error(`Erreur pour la date ${formattedDate}: ${error.message}`);
      results[formattedDate] = { error: error.message };
    }
  }
  
  // Compter le nombre total de créneaux
  let totalSlots = 0;
  Object.values(results).forEach(slots => {
    if (Array.isArray(slots)) {
      totalSlots += slots.length;
    }
  });
  
  console.log(`\nTotal: ${totalSlots} créneaux disponibles pour les ${daysAhead} prochains jours`);
  return results;
}

module.exports = {
  getAvailableSlots,
  findSlotsForNextDays,
  testConnection,
  sendPostRequest,
  extractSlotsFromResponse,
  formatDateForApi,
  getAllSlotsForDate
};
