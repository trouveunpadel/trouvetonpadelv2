/**
 * Module de recherche de créneaux pour TrouveTonPadel
 * Permet de rechercher des créneaux disponibles dans tous les clubs
 * en fonction de la date, l'heure, la localisation et le périmètre
 */

const fs = require('fs');
const path = require('path');

// Importer les modules de chaque club
const monkeyPadel = require('./clubs/monkeypadel');
const complexePadel = require('./clubs/complexepadel');
const p4PadelIndoor = require('./clubs/p4');
const enjoyPadel = require('./clubs/enjoypadel');
const padelGentle = require('./clubs/padelgentle');
const padelTwins = require('./clubs/padeltwins');
// Ajouter d'autres clubs ici au fur et à mesure

/**
 * Calcule la distance entre deux points géographiques (en km)
 * Utilise la formule de Haversine
 * @param {number} lat1 - Latitude du point 1
 * @param {number} lon1 - Longitude du point 1
 * @param {number} lat2 - Latitude du point 2
 * @param {number} lon2 - Longitude du point 2
 * @returns {number} - Distance en kilomètres
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance en km
  return distance;
}

/**
 * Importer la configuration centralisée des clubs
 */
const clubsConfig = require('./clubs-config');

/**
 * Liste des clubs avec leurs modules de scraping
 */
const clubs = [
  {
    ...clubsConfig.monkeypadel,
    module: monkeyPadel
  },
  {
    ...clubsConfig.complexepadel,
    module: complexePadel
  },
  {
    ...clubsConfig.p4padelindoor,
    module: p4PadelIndoor
  },
  {
    ...clubsConfig.enjoypadel,
    module: enjoyPadel
  },
  {
    ...clubsConfig.padelgentle,
    module: padelGentle
  },
  {
    ...clubsConfig.padeltwins,
    module: padelTwins
  }
  // Ajouter d'autres clubs ici
];

/**
 * Recherche des créneaux disponibles dans les clubs situés dans un périmètre donné
 * @param {string} dateStr - Date au format YYYY-MM-DD
 * @param {number} startHour - Heure de début (0-23)
 * @param {number} endHour - Heure de fin (0-23)
 * @param {number} latitude - Latitude du point central
 * @param {number} longitude - Longitude du point central
 * @param {number} radius - Rayon de recherche en km
 * @returns {Promise<Array>} - Liste des créneaux disponibles
 */
async function searchAvailableSlots(dateStr, startHour, endHour, latitude, longitude, radius) {
  console.log(`Recherche de créneaux pour le ${dateStr} entre ${startHour}h et ${endHour}h`);
  console.log(`Position: ${latitude}, ${longitude}, Rayon: ${radius} km`);
  
  // Convertir la date au format attendu par chaque club
  // Pour MonkeyPadel, le format est DD/MM/YYYY
  const [year, month, day] = dateStr.split('-');
  const monkeyPadelDateStr = `${day}/${month}/${year}`;
  
  // Filtrer les clubs dans le périmètre
  const clubsInRange = clubs.filter(club => {
    const distance = calculateDistance(latitude, longitude, club.latitude, club.longitude);
    return distance <= radius;
  });
  
  console.log(`${clubsInRange.length} clubs trouvés dans un rayon de ${radius} km`);
  
  // Récupérer les créneaux pour chaque club dans le périmètre en parallèle
  console.log(`Lancement des recherches en parallèle pour ${clubsInRange.length} clubs...`);
  
  // Créer un tableau de promesses pour chaque club
  const clubPromises = clubsInRange.map(async (club) => {
    try {
      console.log(`Recherche de créneaux pour ${club.name}...`);
      
      let slots = [];
      
      // Appeler la fonction appropriée selon le club
      if (club.id === 'monkeypadel') {
        slots = await club.module.findAvailableSlots({
          date: dateStr,  // Format YYYY-MM-DD
          time: `${startHour}:00`  // Heure minimum
        });
      } else if (club.id === 'complexepadel') {
        try {
          // Initialiser le module ComplexePadel si nécessaire
          await club.module.initialize();
          
          // Convertir la date au format Date
          const searchDate = new Date(`${dateStr}T${startHour.toString().padStart(2, '0')}:00:00`);
          
          console.log(`Recherche de créneaux pour ComplexePadel à la date ${searchDate.toLocaleDateString('fr-FR')}...`);
          
          // Récupérer les créneaux disponibles
          slots = await club.module.getAvailableSlots({
            startDate: searchDate,
            forceRefresh: true, // Forcer le rafraîchissement pour éviter les problèmes de cache
            fastMode: true, // Garder fastMode à true pour le module ComplexePadel
            singleDay: true
          });
          
          console.log(`ComplexePadel: ${slots.length} créneaux trouvés avant filtrage`);
          
          // Filtrer les créneaux par heure si nécessaire
          slots = slots.filter(slot => {
            const slotHour = new Date(slot.startTime).getHours();
            return slotHour >= startHour && slotHour <= endHour;
          });
          
          console.log(`ComplexePadel: ${slots.length} créneaux après filtrage par heure`);
        } catch (complexeError) {
          console.error(`Erreur spécifique lors de la recherche pour ComplexePadel:`, complexeError);
          slots = []; // Assurer que slots est un tableau vide en cas d'erreur
        }
      } else if (club.id === 'p4padelindoor') {
        try {
          // Convertir la date au format YYYY-MM-DD (déjà dans ce format)
          console.log(`Recherche de créneaux pour P4 Padel Indoor à la date ${dateStr}...`);
          
          // Récupérer les créneaux disponibles avec la fonction getAllSlotsForDate
          slots = await club.module.getAllSlotsForDate(dateStr, startHour, Math.ceil((endHour - startHour) / 2));
          
          console.log(`P4 Padel Indoor: ${slots.length} créneaux trouvés`);
          
          // Adapter le format des créneaux P4 au format standard
          slots = slots.map(slot => ({
            date: dateStr,
            time: slot.startTime,
            endTime: slot.endTime,
            court: slot.court,
            price: slot.price || 0,
            type: 'intérieur',
            courtType: 'intérieur',
            available: true
          }));
          
        } catch (p4Error) {
          console.error(`Erreur spécifique lors de la recherche pour P4 Padel Indoor:`, p4Error);
          slots = []; // Assurer que slots est un tableau vide en cas d'erreur
        }
      } else if (club.id === 'enjoypadel') {
        try {
          // Recherche de créneaux pour Enjoy Padel
          console.log(`Recherche de créneaux pour Enjoy Padel à la date ${dateStr}...`);
          
          // Appeler la fonction findAvailableSlots du module Enjoy Padel
          slots = await club.module.findAvailableSlots({
            date: dateStr,
            startHour: `${startHour}:00`,
            endHour: `${endHour}:00`
          });
          
          console.log(`Enjoy Padel: ${slots.length} créneaux trouvés`);
          
        } catch (enjoyError) {
          console.error(`Erreur spécifique lors de la recherche pour Enjoy Padel:`, enjoyError);
          slots = []; // Assurer que slots est un tableau vide en cas d'erreur
        }
      } else if (club.id === 'padelgentle') {
        try {
          // Recherche de créneaux pour Padel Gentle
          console.log(`Recherche de créneaux pour Padel Gentle à la date ${dateStr}...`);
          
          // Appeler la fonction findAvailableSlots du module Padel Gentle
          slots = await club.module.findAvailableSlots({
            date: dateStr,
            time: `${startHour}:00`
          });
          
          console.log(`Padel Gentle: ${slots.length} créneaux trouvés`);
          
        } catch (padelGentleError) {
          console.error(`Erreur spécifique lors de la recherche pour Padel Gentle:`, padelGentleError);
          slots = []; // Assurer que slots est un tableau vide en cas d'erreur
        }
      } else if (club.id === 'padeltwins') {
        try {
          // Recherche de créneaux pour Padel Twins
          console.log(`Recherche de créneaux pour Padel Twins à la date ${dateStr}...`);
          
          // Appeler la fonction getAvailableSlots du module Padel Twins
          slots = await club.module.getAvailableSlots(dateStr, `${startHour}:00`);
          
          console.log(`Padel Twins: ${slots.length} créneaux trouvés`);
          
        } catch (padelTwinsError) {
          console.error(`Erreur spécifique lors de la recherche pour Padel Twins:`, padelTwinsError);
          slots = []; // Assurer que slots est un tableau vide en cas d'erreur
        }
      }
      // Ajouter d'autres clubs ici avec leur format de date spécifique
      
      // Filtrer les créneaux par heure et exclure les créneaux passés pour aujourd'hui
      const filteredSlots = slots.filter(slot => {
        const [hours, minutes] = slot.time.split(':').map(Number);
        
        // Vérifier si la date du créneau est aujourd'hui
        const today = new Date().toISOString().split('T')[0];
        const isToday = slot.date === today || dateStr === today;
        
        // Si c'est aujourd'hui, vérifier que l'heure n'est pas déjà passée
        if (isToday) {
          const now = new Date();
          const currentHour = now.getHours();
          const currentMinute = now.getMinutes();
          
          // Si l'heure est déjà passée, exclure le créneau
          if (hours < currentHour || (hours === currentHour && minutes <= currentMinute)) {
            return false;
          }
        }
        
        // Filtrer par plage horaire demandée
        return hours >= startHour && hours <= endHour;
      });
      
      // Ajouter des informations sur le club
      const slotsWithClubInfo = filteredSlots.map(slot => {
        // S'assurer que les propriétés essentielles sont présentes et correctement formatées
        const enhancedSlot = {
          ...slot,
          clubName: club.name,
          clubId: club.id,
          distance: calculateDistance(latitude, longitude, club.latitude, club.longitude).toFixed(1),
          address: club.address,
          coordinates: {
            latitude: club.latitude,
            longitude: club.longitude
          }
        };
        
        // S'assurer que le type est correctement défini
        if (!enhancedSlot.type || enhancedSlot.type === '') {
          enhancedSlot.type = club.id === 'complexepadel' ? 'intérieur' : 'non spécifié';
        }
        
        // S'assurer que courtType est correctement défini (pour uniformiser entre MonkeyPadel et ComplexePadel)
        if (!enhancedSlot.courtType || enhancedSlot.courtType === '') {
          // Si courtType n'existe pas mais que type existe, utiliser type
          enhancedSlot.courtType = enhancedSlot.type || (club.id === 'complexepadel' ? 'intérieur' : 'non spécifié');
        } else if (enhancedSlot.courtType && !enhancedSlot.type) {
          // Si type n'existe pas mais que courtType existe, utiliser courtType
          enhancedSlot.type = enhancedSlot.courtType;
        }
        
        // S'assurer que le lien de réservation est correctement défini
        if (!enhancedSlot.reservationLink || enhancedSlot.reservationLink === '') {
          if (club.id === 'complexepadel' && enhancedSlot.serviceId && enhancedSlot.date && enhancedSlot.time) {
            enhancedSlot.reservationLink = `https://www.lecomplexe-salon.com/padel/?service=${enhancedSlot.serviceId}&date=${enhancedSlot.date}&time=${enhancedSlot.time}`;
          }
        }
        
        return enhancedSlot;
      });
      
      console.log(`${filteredSlots.length} créneaux trouvés pour ${club.name}`);
      return slotsWithClubInfo;
    } catch (error) {
      console.error(`Erreur lors de la recherche pour ${club.name}:`, error);
      return []; // Retourner un tableau vide en cas d'erreur
    }
  });
  
  // Attendre que toutes les promesses soient résolues
  const results = await Promise.all(clubPromises);
  
  // Fusionner tous les résultats
  const allSlots = results.flat();
  
  // Trier les créneaux par heure
  allSlots.sort((a, b) => {
    // D'abord par heure
    const [aHours, aMinutes] = a.time.split(':').map(Number);
    const [bHours, bMinutes] = b.time.split(':').map(Number);
    
    if (aHours !== bHours) {
      return aHours - bHours;
    }
    
    // Ensuite par minutes
    if (aMinutes !== bMinutes) {
      return aMinutes - bMinutes;
    }
    
    // Enfin par distance
    return parseFloat(a.distance) - parseFloat(b.distance);
  });
  
  console.log(`Total: ${allSlots.length} créneaux disponibles trouvés`);
  
  return allSlots;
}

module.exports = {
  searchAvailableSlots,
  clubs
};
