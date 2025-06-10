/**
 * Module Country Club Padel pour TrouveTonPadel
 * Permet de récupérer les créneaux disponibles sur OpenResa
 */

const axios = require('axios');
const cheerio = require('cheerio');
const CookieManager = require('./cookieManager');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

// Charger les variables d'environnement
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

// Récupérer les identifiants depuis les variables d'environnement
let username = process.env.COUNTRYCLUBPADEL_USERNAME;
let password = process.env.COUNTRYCLUBPADEL_PASSWORD;

// Nettoyer les identifiants (enlever les guillemets si présents)
if (username) username = username.replace(/^["'](.*)["']$/, '$1');
if (password) password = password.replace(/^["'](.*)["']$/, '$1');

// Initialiser le gestionnaire de cookies
const cookieManager = new CookieManager(username, password);

/**
 * Vérifie et rafraîchit les cookies si nécessaire
 * @returns {Promise<Object>} - Cookies valides au format clé-valeur
 */
async function checkAndRefreshCookies() {
  if (!username || !password) {
    throw new Error('Variables d\'environnement COUNTRYCLUBPADEL_USERNAME ou COUNTRYCLUBPADEL_PASSWORD manquantes');
  }
  
  console.log(`Vérification des cookies pour Country Club Padel (${username})`);
  return await cookieManager.getValidCookies();
}

/**
 * Formate une date au format MM/DD/YYYY pour l'URL d'OpenResa
 * @param {Date} date - Date à formater
 * @returns {string} - Date formatée
 */
function formatDateForUrl(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}%2F${day}%2F${year}`;
}

/**
 * Recherche les créneaux disponibles pour une date donnée
 * @param {Date|string} date - Date de recherche (Date ou string au format MM/DD/YYYY)
 * @param {string} startTime - Heure de début (optionnel, format HH:MM)
 * @returns {Promise<Array>} - Liste des créneaux disponibles
 */
async function findAvailableSlots(date, startTime = null) {
  // Convertir la date en objet Date si elle est fournie sous forme de string
  let searchDate;
  if (typeof date === 'string') {
    // Vérifier le format de la date
    if (date.includes('/')) {
      // Format MM/DD/YYYY
      const [month, day, year] = date.split('/');
      searchDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } else if (date.includes('-')) {
      // Format YYYY-MM-DD
      searchDate = new Date(date);
    } else {
      throw new Error('Format de date non reconnu. Utilisez MM/DD/YYYY ou YYYY-MM-DD');
    }
  } else {
    searchDate = date;
  }
  try {
    // S'assurer que nous avons des cookies valides
    const cookies = await checkAndRefreshCookies();
    
    // Formater la date au format MM/DD/YYYY pour l'URL
    const formattedDate = formatDateForUrl(searchDate);
    console.log(`Recherche de créneaux pour Country Club Padel le ${searchDate.toLocaleDateString()}`);
    
    // Timestamp pour le paramètre _
    const timestamp = Date.now();
    
    // URL de recherche des créneaux
    const url = `https://openresa.com/reservation/day?date=${formattedDate}&group=0&_=${timestamp}`;
    
    // Construire le cookie string à partir de l'objet cookies
    const cookieString = Object.entries(cookies).map(([name, value]) => `${name}=${value}`).join('; ');
    
    // En-têtes de la requête
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:138.0) Gecko/20100101 Firefox/138.0',
      'Accept': '*/*',
      'Accept-Language': 'fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'Referer': 'https://openresa.com/reservation/',
      'X-Requested-With': 'XMLHttpRequest',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      'Connection': 'keep-alive',
      'Cookie': cookieString
    };
    
    // Effectuer la requête
    console.log(`Requête HTTP vers ${url}`);
    const response = await axios.get(url, { headers });
    
    // Vérifier si la réponse est au format JSON
    if (response.data && typeof response.data === 'object') {
      console.log('Réponse JSON reçue');
      
      // Sauvegarder la réponse pour analyse (en mode développement)
      if (process.env.NODE_ENV !== 'production') {
        fs.writeFileSync(path.join(__dirname, 'last-response.json'), JSON.stringify(response.data, null, 2));
        console.log('Réponse sauvegardée dans last-response.json');
      }
      
      // Extraire les créneaux disponibles
      const availableSlots = extractSlotsFromJson(response.data, searchDate);
      console.log(`${availableSlots.length} créneaux trouvés pour Country Club Padel le ${searchDate.toLocaleDateString()}`);
      return availableSlots;
    } else {
      // Si la réponse est en HTML, utiliser cheerio pour l'analyser
      console.log('Réponse HTML reçue');
      const $ = cheerio.load(response.data);
      
      // Sauvegarder la réponse pour analyse (en mode développement)
      if (process.env.NODE_ENV !== 'production') {
        fs.writeFileSync(path.join(__dirname, 'last-response.html'), response.data);
        console.log('Réponse sauvegardée dans last-response.html');
      }
      
      // Extraire les créneaux disponibles
      const availableSlots = extractSlotsFromHtml($, searchDate);
      console.log(`${availableSlots.length} créneaux trouvés pour Country Club Padel le ${searchDate.toLocaleDateString()}`);
      return availableSlots;
    }
  } catch (error) {
    console.error(`Erreur lors de la recherche de créneaux pour Country Club Padel: ${error.message}`);
    return [];
  }
}

/**
 * Extrait les créneaux disponibles d'une réponse JSON
 * @param {Object} data - Données JSON de la réponse
 * @param {Date} date - Date de recherche
 * @returns {Array} - Liste des créneaux disponibles
 */
function extractSlotsFromJson(data, date) {
  const availableSlots = [];
  const dateString = date.toISOString().split('T')[0]; // Format YYYY-MM-DD
  
  try {
    // Vérifier si la structure attendue est présente
    if (data.slots && Array.isArray(data.slots)) {
      // Parcourir les créneaux
      data.slots.forEach(slot => {
        if (slot.available && slot.available === true) {
          // Extraire les informations du créneau
          const slotInfo = {
            club: 'Country Club Padel',
            date: dateString,
            time: slot.time || slot.startTime,
            court: slot.court || slot.courtName || 'Non spécifié',
            price: slot.price || 'Non spécifié',
            duration: slot.duration || '1h30',
            url: `https://openresa.com/reservation/book?slot=${slot.id || ''}`
          };
          
          availableSlots.push(slotInfo);
        }
      });
    } else {
      console.log('Structure de données JSON non reconnue');
    }
  } catch (error) {
    console.error('Erreur lors de l\'extraction des créneaux JSON:', error.message);
  }
  
  return availableSlots;
}

/**
 * Extrait les créneaux disponibles d'une réponse HTML
 * @param {Object} $ - Instance Cheerio chargée avec le HTML
 * @param {Date} date - Date de recherche
 * @returns {Array} - Liste des créneaux disponibles
 */
function extractSlotsFromHtml($, date) {
  let availableSlots = [];

  // Helper function to determine the date of a slot
  // Assumes all slots on the page correspond to the 'date' parameter.
  // If slots can span multiple days or the page shows other dates,
  // this function will need to parse the date from the HTML element itself.
  function getSlotDate(_$element) { // _$element is currently unused but kept for future enhancements
    return date;
  }

  
  try {
    // Vérifier si nous sommes sur la page de réservation
    if ($('.reservation-container-wrapper').length === 0) {
      console.log('Page de réservation non trouvée, vérifiez les cookies');
      return [];
    }
    
    // Créer un mapping des noms de terrains basé sur les en-têtes
    const courtMapping = {};
    $('.schedule-container').each((index, container) => {
      const $container = $(container);
      const scheduleId = $container.find('table.schedule-table-slots a.slot').first().attr('data-schedule');
      if (scheduleId) {
        const courtName = $container.find('.media-body.full-show.text-ellipsis').first().text().trim();
        if (courtName) {
          courtMapping[scheduleId] = courtName.replace(/\s+/g, ' ');
          console.log(`Mapping de terrain créé: schedule ${scheduleId} => "${courtName}"`);
        }
      }
    });
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // getMonth() est 0-indexé
    const day = String(date.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    
    // Forcer l'utilisation de la date fournie pour tous les créneaux
    console.log(`Utilisation forcée de la date ${formattedDate} pour tous les créneaux`);
    
    // Rechercher tous les créneaux disponibles
    // Utiliser le sélecteur spécifique pour les créneaux réellement disponibles
    const $slots = $('.slot.slot-free');
    console.log(`Sélecteur ".slot.slot-free" a trouvé ${$slots.length} créneaux`);
    
    // Sauvegarder un exemple de créneau et la page complète pour analyse
    if (process.env.NODE_ENV !== 'production' && $slots.length > 0) {
      const slotExample = $($slots[0]).prop('outerHTML');
      fs.writeFileSync(path.join(__dirname, 'slot-example.html'), slotExample);
      console.log('Exemple de créneau sauvegardé dans slot-example.html');
      
      // Sauvegarder également la page HTML complète pour analyse
      fs.writeFileSync(path.join(__dirname, 'last-response.html'), $.html());
      console.log('Page HTML complète sauvegardée dans last-response.html');
    }
  
  // Parcourir tous les créneaux disponibles
  $slots.each((index, element) => {
    const $slot = $(element);
    const slotHtml = $slot.html();
          
          // Extraire les informations du créneau
          let time = '';
          let court = '';
          let price = '';
          let slotId = '';
          
          // Essayer différentes méthodes pour extraire l'heure
          time = $slot.attr('data-time') || 
                 $slot.find('.time').text().trim() || 
                 $slot.find('.slot-time').text().trim();
          
          // Si l'heure n'est pas trouvée, essayer de l'extraire du texte du créneau
          if (!time) {
            const timeMatch = slotHtml.match(/\d{1,2}[h:]\d{0,2}/) || 
                           $slot.text().match(/\d{1,2}[h:]\d{0,2}/);
            if (timeMatch) {
              time = timeMatch[0];
            }
          }
          
          // Si l'heure n'est pas trouvée, essayer de l'extraire de l'attribut data-timestart
          if (!time && $slot.attr('data-timestart')) {
            const timeStart = parseInt($slot.attr('data-timestart'));
            if (!isNaN(timeStart)) {
              const hours = Math.floor(timeStart / 60);
              const minutes = timeStart % 60;
              time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            }
          }
          
          // Utiliser le mapping des terrains basé sur l'attribut data-schedule
          const scheduleId = $slot.attr('data-schedule');
          if (scheduleId && courtMapping[scheduleId]) {
            court = courtMapping[scheduleId];
            console.log(`Court trouvé via mapping: ${court} (schedule ${scheduleId})`);
          } else {
            // Essayer différentes méthodes pour extraire le court si le mapping ne fonctionne pas
            court = $slot.attr('data-court') || 
                    $slot.find('.court').text().trim() || 
                    $slot.find('.slot-court').text().trim();
          }
          
          // Si le court n'est pas trouvé par les méthodes précédentes, essayer de l'extraire du texte du créneau
          if (!court || court === 'Terrain non spécifié') {
            const slotText = $slot.text().replace(/\s+/g, ' ').trim();
            // Essayer de trouver des motifs courants pour les noms de terrains (ex: P1, Court 2, Terrain Central)
            // Cette regex est un exemple et pourrait nécessiter des ajustements spécifiques au site.
            const courtMatch = slotText.match(/(P\d+|T\d+|Court \d+|Terrain [A-Za-z\s\d]+)/i);
            if (courtMatch && courtMatch[0].length > 1) { // Vérification basique de la validité
              court = courtMatch[0].trim();
              console.log(`Court trouvé par analyse de texte: ${court}`);
            } else {
              court = 'Terrain non spécifié'; // Fallback final
            }
          }

          // Extraire le prix
          price = $slot.find('.price, .slot-price').text().trim();
          if (!price) {
            const priceRegex = /(\d+([,.]\d{2})?)\s*€/; // Ex: "25 €", "25,50 €", "25.50 €"
            const htmlContentForPrice = slotHtml || $slot.text(); // Utiliser slotHtml ou le texte brut
            const priceMatch = htmlContentForPrice.match(priceRegex);
            if (priceMatch) {
              price = priceMatch[1].replace(',', '.') + ' €'; // Normaliser en utilisant '.' et ajouter le symbole €
            } else {
              price = 'Prix non spécifié';
            }
          }

          // Extraire l'ID du créneau (slotId)
          const hrefAttr = $slot.attr('href');
          if (hrefAttr) {
            const slotIdMatch = hrefAttr.match(/slot=(\d+)/);
            if (slotIdMatch) {
              slotId = slotIdMatch[1];
            }
          }
          if (!slotId) { // Fallback sur d'autres attributs potentiels
            slotId = $slot.attr('id') || $slot.attr('data-id') || $slot.attr('data-slotid') || '';
          }

          // Normaliser l'heure au format HH:MM si elle est au format comme "9h" ou "10h30"
          if (time && time.includes('h')) {
            let timeParts = time.split('h');
            let hours = timeParts[0].padStart(2, '0');
            let minutes = (timeParts.length > 1 && timeParts[1] !== '') ? timeParts[1].padStart(2, '0') : '00';
            time = `${hours}:${minutes}`;
          }

          // Ajouter le créneau seulement si une heure ou un terrain (autre que 'Terrain non spécifié') est trouvé
          if (time || (court && court !== 'Terrain non spécifié')) {
            const slotDate = getSlotDate($slot); // Obtenir la date pour ce créneau
            // URL unique pour tous les créneaux du Country Club Padel
            const uniqueCountryClubPadelUrl = 'https://openresa.com/club/countryclubpadel';
            
            const slotInfo = {
              club: 'Country Club Padel',
              date: slotDate,
              time: time || 'Heure non spécifiée',
              court: court || 'Terrain non spécifié',
              price: price, 
              duration: '1h30', 
              reservationLink: uniqueCountryClubPadelUrl
            };
            
            availableSlots.push(slotInfo);
          }
  });
    
    // Si aucun créneau n'a été trouvé avec les sélecteurs spécifiques,
    // essayer une approche plus générale
    if (availableSlots.length === 0) {
      console.log('Tentative d\'extraction avec une approche plus générale');
      
      // Rechercher tous les éléments qui pourraient être des créneaux
      $('a[href*="reservation/book"], a[href*="slot"]').each((index, element) => {
        const $link = $(element);
        const href = $link.attr('href');
        
        // Extraire l'ID du créneau de l'URL
        const slotId = href.match(/slot=([^&]+)/)?.[1] || '';
        
        // Extraire les informations du créneau
        const time = $link.find('.time').text().trim() || $link.text().match(/\d{1,2}[h:]\d{0,2}/)?.[0] || 'Heure non spécifiée';
        
        // Chercher le nom du court en utilisant le mapping des terrains
        let court = '';
        const scheduleId = $link.attr('data-schedule');
        if (scheduleId && courtMapping[scheduleId]) {
          court = courtMapping[scheduleId];
          console.log(`Court trouvé via mapping (approche générale): ${court} (schedule ${scheduleId})`);
        } else {
          // Si le mapping ne fonctionne pas, essayer les méthodes traditionnelles
          const $courtElement = $link.find('.media-body.full-show.text-ellipsis, .media-body.full-show');
          if ($courtElement.length > 0) {
            court = $courtElement.text().trim().replace(/\s+/g, ' ');
          }
          
          // Si aucun élément trouvé directement, essayer de trouver dans le parent du lien
          if (!court || court === '') {
            const $parentElement = $link.closest('.slot, .reservation-slot');
            if ($parentElement.length > 0) {
              const $courtInParent = $parentElement.find('.media-body.full-show.text-ellipsis, .media-body.full-show');
              if ($courtInParent.length > 0) {
                court = $courtInParent.text().trim().replace(/\s+/g, ' ');
              }
            }
          }
        }
        
        // Si le court n'est pas trouvé, essayer les méthodes traditionnelles
        if (!court) {
          court = $link.find('.court').text().trim() || 
                 $link.closest('.court').text().trim() || 
                 'Terrain non spécifié';
        }
        
        // Obtenir la date correcte pour ce créneau
        const slotDate = getSlotDate($link);
        
        // URL unique pour tous les créneaux du Country Club Padel
        const uniqueCountryClubPadelUrl = 'https://openresa.com/club/countryclubpadel';
        
        const slotInfo = {
          club: 'Country Club Padel',
          date: slotDate,
          time: time,
          court: court,
          price: 'Prix non spécifié',
          duration: '1h30',
          reservationLink: uniqueCountryClubPadelUrl
        };
        
        availableSlots.push(slotInfo);
      });
    }
    
    // Éliminer les doublons en utilisant une clé composée de l'heure et du terrain
    const uniqueSlots = [];
    const seenKeys = new Set();
    
    for (const slot of availableSlots) {
      const key = `${slot.time}-${slot.court}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueSlots.push(slot);
      }
    }
    
    availableSlots = uniqueSlots;
  } catch (error) {
    console.error('Erreur lors de l\'extraction des créneaux HTML:', error.message);
  }
  
  return availableSlots;
}

module.exports = {
  checkAndRefreshCookies,
  findAvailableSlots
};
