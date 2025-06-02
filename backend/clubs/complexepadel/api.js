/**
 * Module d'accès à l'API wpamelia pour ComplexePadel
 * Ce module gère les appels directs à l'API du site
 */

const axios = require('axios');

// Configuration
const CONFIG = {
  BASE_URL: 'https://www.lecomplexe-salon.com',
  API_ENDPOINT: '/wp-admin/admin-ajax.php?action=wpamelia_api&call=',
  // IDs des terrains de padel avec leurs noms et types corrects
  PADEL_SERVICES: [
    {
      id: 8,
      providerId: 6,
      name: 'Terrain vert',
      duration: 5400, // 1h30 en secondes
      type: 'extérieur'
    },
    {
      id: 7,
      providerId: 5,
      name: 'Terrain bleu',
      duration: 5400,
      type: 'extérieur'
    },
    {
      id: 9,
      providerId: 2306,
      name: 'Chiquita',
      duration: 5400,
      type: 'intérieur'
    },
    {
      id: 10,
      providerId: 2307,
      name: 'Viboja',
      duration: 5400,
      type: 'intérieur'
    },
    {
      id: 11,
      providerId: 2308,
      name: 'Central',
      duration: 5400,
      type: 'intérieur'
    }
  ]
};

/**
 * Récupère les informations sur les entités (emplacements, employés, etc.)
 * @returns {Promise<Object>} - Les informations sur les entités
 */
async function getEntities() {
  try {
    // Utiliser l'URL exacte fournie
    const url = `${CONFIG.BASE_URL}/wp-admin/admin-ajax.php?action=wpamelia_api&call=/entities&lite=true&types=locations,employees,categories,custom_fields,packages,taxes&page=booking`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération des entités:', error);
    // En cas d'erreur, retourner un objet vide au lieu de lancer une exception
    return {};
  }
}

/**
 * Récupère les créneaux disponibles pour un service donné
 * @param {Object} service - Le service pour lequel récupérer les créneaux
 * @param {Date} date - La date pour laquelle récupérer les créneaux
 * @returns {Promise<Array>} - Les créneaux disponibles
 */
async function getServiceSlots(service, date) {
  try {
    const formattedDate = date.toISOString().split('T')[0];
    
    // Utiliser directement l'URL qui fonctionne
    const url = `${CONFIG.BASE_URL}/wp-admin/admin-ajax.php?action=wpamelia_api&call=/slots&serviceId=${service.id}&serviceDuration=${service.duration}&providerIds=${service.providerId}&group=1&page=booking&persons=1&date=${formattedDate}`;
    
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(`Erreur lors de la récupération des créneaux pour le service ${service.id}:`, error);
    // En cas d'erreur, retourner un objet vide au lieu de lancer une exception
    return {};
  }
}

/**
 * Récupère les créneaux disponibles pour tous les services ou un type spécifique
 * @param {Array<string>} types - Types de padel à rechercher ('intérieur', 'extérieur', 'all')
 * @param {Date} startDate - Date de début
 * @param {Date} endDate - Date de fin
 * @param {boolean} fastMode - Si true, utilise des requêtes parallèles pour accélérer
 * @returns {Promise<Object>} - Les créneaux disponibles par service
 */
async function getAllSlots(types = ['all'], startDate = new Date(), endDate = null, fastMode = true) {
  // Si endDate n'est pas spécifiée, utiliser startDate + 2 jours
  if (!endDate) {
    endDate = new Date(startDate.getTime() + 2 * 24 * 60 * 60 * 1000);
  }
  
  // Filtrer les services selon le type demandé
  let servicesToSearch = CONFIG.PADEL_SERVICES;
  if (!types.includes('all')) {
    servicesToSearch = CONFIG.PADEL_SERVICES.filter(service => 
      types.includes(service.type)
    );
  }
  
  // Récupérer les créneaux pour chaque service
  const results = {};
  
  if (fastMode) {
    // Mode rapide: requêtes parallèles
    console.log(`Recherche parallèle des créneaux pour ${servicesToSearch.length} terrains...`);
    
    const promises = servicesToSearch.map(async (service) => {
      try {
        const slots = await getServiceSlots(service, startDate);
        return {
          serviceId: service.id,
          result: {
            service,
            slots
          }
        };
      } catch (error) {
        console.error(`Erreur lors de la récupération des créneaux pour ${service.name}:`, error);
        return {
          serviceId: service.id,
          result: {
            service,
            slots: [],
            error: error.message
          }
        };
      }
    });
    
    const promiseResults = await Promise.all(promises);
    
    // Assembler les résultats
    promiseResults.forEach(item => {
      results[item.serviceId] = item.result;
    });
  } else {
    // Mode séquentiel: une requête après l'autre
    for (const service of servicesToSearch) {
      console.log(`Recherche des créneaux pour ${service.name}...`);
      
      try {
        const slots = await getServiceSlots(service, startDate);
        results[service.id] = {
          service,
          slots
        };
      } catch (error) {
        console.error(`Erreur lors de la récupération des créneaux pour ${service.name}:`, error);
        results[service.id] = {
          service,
          slots: [],
          error: error.message
        };
      }
    }
  }
  
  return results;
}

/**
 * Récupère les informations sur l'utilisateur courant
 * @returns {Promise<Object>} - Les informations sur l'utilisateur
 */
async function getCurrentUser() {
  try {
    const url = `${CONFIG.BASE_URL}${CONFIG.API_ENDPOINT}/users/current`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur courant:', error);
    return null;
  }
}

module.exports = {
  CONFIG,
  getEntities,
  getServiceSlots,
  getAllSlots,
  getCurrentUser
};
