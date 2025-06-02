/**
 * P4 Padel Indoor - Module de recherche de créneaux
 * Implémente la requête POST directe pour obtenir les créneaux disponibles
 * Version optimisée avec les en-têtes exacts et l'affichage de la réponse brute
 */

const axios = require('axios');
const qs = require('qs');
const { getNextAccount } = require('./cookie-manager');

// URL de base et endpoints
const BASE_URL = 'https://p4-padel-indoor.gestion-sports.com';
const RESERVATION_ENDPOINT = '/membre/reservation.html';
const SPORT_ID = '1057'; // ID du sport Padel

// Système de cache
const cache = {
  slots: new Map(), // Map pour stocker les créneaux par date
  timestamps: new Map(), // Map pour stocker les timestamps des dernières requêtes par date
  CACHE_DURATION: 5 * 60 * 1000 // 5 minutes en millisecondes
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

/**
 * Vérifie si les données en cache sont valides pour une date donnée
 * @param {string} date - Date au format YYYY-MM-DD
 * @returns {boolean} True si le cache est valide, false sinon
 */
function isCacheValid(date) {
  if (!cache.timestamps.has(date)) return false;
  
  const timestamp = cache.timestamps.get(date);
  const now = Date.now();
  
  return (now - timestamp) < cache.CACHE_DURATION;
}

/**
 * Envoie une requête POST pour récupérer les créneaux disponibles
 * @param {string} date - Date au format YYYY-MM-DD
 * @param {string} hour - Heure au format HH:MM (optionnel)
 * @returns {Promise<Object>} Réponse de l'API
 */
async function sendPostRequest(date, hour = null) {
  // Récupérer un compte disponible avec ses cookies
  const account = getNextAccount();
  
  if (!account) {
    throw new Error('Aucun compte avec cookies valides disponible');
  }
  
  console.log(`Utilisation du compte ${account.id} (${account.email})`);
  
  // Convertir la date au format attendu par l'API (JJ/MM/AAAA)
  const formattedDate = formatDateForApi(date);
  
  // Préparer les en-têtes avec les cookies
  const headers = createHeaders(account);
  
  // Préparer les données de la requête
  const data = qs.stringify({
    ajax: hour ? 'loadCourtDispo' : 'loadHeure',
    date: formattedDate,
    idSport: SPORT_ID,
    ...(hour && { hour })
  });
  
  try {
    // Effectuer la requête POST
    const response = await axios.post(`${BASE_URL}${RESERVATION_ENDPOINT}`, data, { headers });
    return response;
  } catch (error) {
    // Si erreur 403 ou 401, le compte est peut-être banni ou les cookies expirés
    if (error.response && (error.response.status === 403 || error.response.status === 401)) {
      console.warn(`Le compte ${account.id} semble avoir des problèmes d'authentification. Essayez de rafraîchir les cookies.`);
    }
    throw error;
  }
}

/**
 * Récupère les heures disponibles pour une date donnée
 * @param {string} date - Date au format YYYY-MM-DD
 * @returns {Promise<Array<string>>} Liste des heures disponibles
 */
async function getAvailableHours(date) {
  console.log(`Récupération des heures disponibles pour le ${date}...`);
  
  // Vérifier si les données sont en cache
  const cacheKey = `hours_${date}`;
  if (cache.timestamps.has(cacheKey) && (Date.now() - cache.timestamps.get(cacheKey)) < cache.CACHE_DURATION) {
    console.log('Utilisation du cache pour les heures disponibles');
    return cache.slots.get(cacheKey) || [];
  }
  
  try {
    const response = await sendPostRequest(date);
    const hours = extractHoursFromResponse(response.data);
    
    // Mettre en cache les résultats
    cache.slots.set(cacheKey, hours);
    cache.timestamps.set(cacheKey, Date.now());
    
    console.log(`${hours.length} heures disponibles trouvées`);
    return hours;
  } catch (error) {
    console.error(`Erreur lors de la récupération des heures: ${error.message}`);
    throw error;
  }
}

/**
 * Extrait les heures disponibles de la réponse de l'API
 * @param {Array} data - Réponse de l'API (tableau de courts)
 * @returns {Array<string>} Liste des heures disponibles
 */
function extractHoursFromResponse(data) {
  const availableHours = new Set(); // Utiliser un Set pour éviter les doublons
  
  try {
    // Vérifier que la réponse est un tableau
    if (!Array.isArray(data)) {
      console.log('La réponse n\'est pas un tableau');
      return [];
    }
    
    // Parcourir tous les courts
    data.forEach(court => {
      // Vérifier si le court a des heures disponibles
      if (court.heuresDispo && Array.isArray(court.heuresDispo)) {
        // Pour chaque heure disponible, l'ajouter au Set
        court.heuresDispo.forEach(hourData => {
          if (hourData.hourStart) {
            availableHours.add(hourData.hourStart);
          }
        });
      }
    });
  } catch (error) {
    console.error(`Erreur lors de l'extraction des heures: ${error.message}`);
  }
  
  // Convertir le Set en tableau et trier les heures
  return Array.from(availableHours).sort();
}

/**
 * Récupère les courts disponibles pour une date et une heure données
 * @param {string} date - Date au format YYYY-MM-DD
 * @param {string} hour - Heure au format HH:MM
 * @returns {Promise<Array>} Liste des courts disponibles
 */
async function getAvailableCourts(date, hour) {
  console.log(`Récupération des courts disponibles pour le ${date} à ${hour}...`);
  
  // Créer une clé unique pour le cache (date + heure)
  const cacheKey = `courts_${date}_${hour}`;
  
  // Vérifier si les données sont en cache
  if (cache.timestamps.has(cacheKey) && (Date.now() - cache.timestamps.get(cacheKey)) < cache.CACHE_DURATION) {
    console.log('Utilisation du cache pour les courts disponibles');
    return cache.slots.get(cacheKey) || [];
  }
  
  try {
    // Envoyer la requête POST pour récupérer les courts disponibles
    const response = await sendPostRequest(date, hour);
    
    // Traiter la réponse
    if (Array.isArray(response.data)) {
      // La réponse est un tableau de courts avec leurs heures disponibles
      const availableCourts = extractCourtsFromResponse(response.data, date, hour);
      
      // Mettre en cache les résultats
      cache.slots.set(cacheKey, availableCourts);
      cache.timestamps.set(cacheKey, Date.now());
      
      console.log(`${availableCourts.length} courts disponibles trouvés`);
      return availableCourts;
    }
    
    console.log('Aucun court disponible trouvé ou format de réponse non reconnu');
    return [];
  } catch (error) {
    console.error(`Erreur lors de la récupération des courts: ${error.message}`);
    throw error;
  }
}

/**
 * Extrait les courts disponibles de la réponse de l'API
 * @param {Array} data - Tableau de courts avec leurs heures disponibles
 * @param {string} date - Date au format YYYY-MM-DD
 * @param {string} hour - Heure au format HH:MM
 * @returns {Array} Liste des courts disponibles
 */
function extractCourtsFromResponse(data, date, hour) {
  const availableCourts = [];
  
  try {
    // Vérifier que la réponse est un tableau
    if (!Array.isArray(data)) {
      console.log('La réponse n\'est pas un tableau');
      return [];
    }
    
    // Parcourir tous les courts
    data.forEach(court => {
      // Vérifier si le court a des heures disponibles
      if (court.heuresDispo && Array.isArray(court.heuresDispo)) {
        // Chercher l'heure spécifique demandée
        const matchingHour = court.heuresDispo.find(h => h.hourStart === hour);
        
        if (matchingHour) {
          // Calculer l'heure de fin (par défaut +1h30)
          const endTime = calculateEndTime(hour);
          
          // Ajouter le court disponible à la liste
          availableCourts.push({
            date,
            startTime: hour,
            endTime,
            court: court.name || `Court ${court.id}`,
            courtId: court.id,
            price: matchingHour.price || 0,
            bookingUrl: `${BASE_URL}/membre/reservation.html?court=${court.id}&date=${formatDateForApi(date)}&time=${hour}`
          });
        }
      }
    });
  } catch (error) {
    console.error(`Erreur lors de l'extraction des courts: ${error.message}`);
  }
  
  return availableCourts;
}

/**
 * Calcule l'heure de fin à partir de l'heure de début (durée standard de 1h30)
 * @param {string} startTime - Heure de début au format HH:MM
 * @returns {string} Heure de fin au format HH:MM
 */
function calculateEndTime(startTime) {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  let endHour = startHour;
  let endMinute = startMinute + 90; // Durée standard de 1h30
  
  if (endMinute >= 60) {
    endHour += Math.floor(endMinute / 60);
    endMinute = endMinute % 60;
  }
  
  return `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
}

/**
 * Récupère tous les créneaux disponibles pour une date donnée
 * en faisant une seule requête directe pour récupérer tous les courts et leurs heures disponibles
 * @param {string} date - Date au format YYYY-MM-DD
 * @returns {Promise<Array>} Liste des créneaux disponibles
 */
async function findAvailableSlots(date) {
  console.log(`Recherche des créneaux disponibles pour le ${date}...`);
  
  // Vérifier si les données sont en cache
  if (isCacheValid(date)) {
    console.log('Utilisation du cache pour les créneaux disponibles');
    return cache.slots.get(date);
  }
  
  try {
    // Envoyer la requête POST pour récupérer les données
    const response = await sendPostRequest(date);
    
    // Vérifier que la réponse est un tableau
    if (!Array.isArray(response.data)) {
      console.log('La réponse n\'est pas un tableau');
      return [];
    }
    
    // Extraire tous les créneaux disponibles
    const allSlots = [];
    
    // Parcourir tous les courts
    response.data.forEach(court => {
      // Vérifier si le court a des heures disponibles
      if (court.heuresDispo && Array.isArray(court.heuresDispo)) {
        // Pour chaque heure disponible, créer un créneau
        court.heuresDispo.forEach(hourData => {
          const hour = hourData.hourStart;
          if (!hour) return;
          
          // Calculer l'heure de fin
          const endTime = calculateEndTime(hour);
          
          // Ajouter le créneau à la liste
          allSlots.push({
            date,
            startTime: hour,
            endTime,
            court: court.name || `Court ${court.id}`,
            courtId: court.id,
            price: hourData.price || 0,
            bookingUrl: `${BASE_URL}/membre/reservation.html?court=${court.id}&date=${formatDateForApi(date)}&time=${hour}`
          });
        });
      }
    });
    
    // Mettre en cache les résultats
    cache.slots.set(date, allSlots);
    cache.timestamps.set(date, Date.now());
    
    console.log(`Total: ${allSlots.length} créneaux disponibles trouvés`);
    return allSlots;
  } catch (error) {
    console.error(`Erreur lors de la recherche des créneaux: ${error.message}`);
    throw error;
  }
}

/**
 * Recherche les créneaux disponibles pour les N prochains jours
 * @param {number} days - Nombre de jours à vérifier
 * @returns {Promise<Array>} Liste des créneaux disponibles
 */
async function findSlotsForNextDays(days = 7) {
  console.log(`Recherche des créneaux disponibles pour les ${days} prochains jours...`);
  
  const allSlots = [];
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
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
      const slotsForDay = await findAvailableSlots(formattedDate);
      allSlots.push(...slotsForDay);
    } catch (error) {
      console.error(`Erreur lors de la recherche des créneaux pour le ${formattedDate}: ${error.message}`);
      // Continuer avec le jour suivant même en cas d'erreur
    }
  }
  
  console.log(`Total: ${allSlots.length} créneaux disponibles pour les ${days} prochains jours`);
  return allSlots;
}

/**
 * Vide le cache des créneaux
 */
function clearCache() {
  cache.slots.clear();
  cache.timestamps.clear();
  console.log('Cache vidé');
}

// Exporter les fonctions
module.exports = {
  findAvailableSlots,
  findSlotsForNextDays,
  clearCache,
  getAvailableHours,
  getAvailableCourts
};
