/**
 * Module de traitement des créneaux pour ComplexePadel
 * Ce module transforme les données brutes de l'API en un format standardisé
 */

/**
 * Transforme les créneaux bruts de l'API en format standardisé
 * @param {Object} rawData - Données brutes de l'API
 * @param {Object} service - Informations sur le service
 * @returns {Array<Object>} - Créneaux au format standardisé
 */
function processRawSlots(rawData, service) {
  try {
    // Extraire les créneaux disponibles
    const availableSlots = extractAvailableSlots(rawData);
    
    if (!availableSlots || availableSlots.length === 0) {
      return [];
    }
    
    // Transformer les créneaux en format standardisé
    const processedSlots = availableSlots.map(slot => {
      return {
        date: slot.date,
        time: slot.time,
        startTime: slot.startTime,
        endTime: slot.endTime,
        court: service.name,
        serviceId: service.id,
        providerId: slot.providerId || service.providerId,
        courtType: service.type, // Utiliser directement le type configuré dans api.js
        type: service.type, // Garder type pour compatibilité
        duration: service.duration / 60, // Convertir en minutes
        available: true,
        price: service.type === 'intérieur' ? 14 : 12, // Prix par joueur selon le type
        reservationLink: `https://www.lecomplexe-salon.com/padel/?service=${service.id}&date=${slot.date}&time=${slot.time}`
      };
    });
    
    return processedSlots;
  } catch (error) {
    console.error('Erreur lors du traitement des créneaux:', error);
    return [];
  }
}

/**
 * Extrait les créneaux disponibles à partir des données brutes de l'API
 * @param {Object} rawData - Données brutes de l'API
 * @returns {Array<Object>} - Créneaux disponibles
 */
function extractAvailableSlots(rawData) {
  try {
    // Vérifier si les données sont valides
    if (!rawData || typeof rawData !== 'object') {
      return [];
    }
    
    const slots = [];
    
    // Vérifier si les données sont dans le format attendu (avec data.slots)
    if (rawData.data && rawData.data.slots && typeof rawData.data.slots === 'object') {
      // Parcourir les dates dans l'objet slots
      Object.keys(rawData.data.slots).forEach(date => {
        const dateSlots = rawData.data.slots[date];
        
        if (dateSlots && typeof dateSlots === 'object') {
          // Parcourir les heures pour cette date
          Object.keys(dateSlots).forEach(time => {
            // Si le créneau contient un tableau non vide, il est disponible
            if (Array.isArray(dateSlots[time]) && dateSlots[time].length > 0) {
              // Calculer l'heure de fin (ajouter 1h30 soit 5400 secondes)
              const startTime = new Date(`${date}T${time}:00`);
              const endTime = new Date(startTime.getTime() + 5400000); // +1h30
              
              slots.push({
                date,
                time,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                available: true,
                providerId: dateSlots[time][0][0] // Premier élément du tableau
              });
            }
          });
        }
      });
    } 
    // Format alternatif (directement avec rawData.slots)
    else if (rawData.slots && typeof rawData.slots === 'object') {
      // Parcourir les dates dans l'objet slots
      Object.keys(rawData.slots).forEach(date => {
        const dateSlots = rawData.slots[date];
        
        if (dateSlots && typeof dateSlots === 'object') {
          // Parcourir les heures pour cette date
          Object.keys(dateSlots).forEach(time => {
            // Si le créneau contient un tableau non vide, il est disponible
            if (Array.isArray(dateSlots[time]) && dateSlots[time].length > 0) {
              // Calculer l'heure de fin (ajouter 1h30 soit 5400 secondes)
              const startTime = new Date(`${date}T${time}:00`);
              const endTime = new Date(startTime.getTime() + 5400000); // +1h30
              
              slots.push({
                date,
                time,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                available: true,
                providerId: dateSlots[time][0][0] // Premier élément du tableau
              });
            }
          });
        }
      });
    }
    
    return slots;
  } catch (error) {
    console.error('Erreur lors de l\'extraction des créneaux:', error);
    return [];
  }
}

/**
 * Filtre les créneaux par date
 * @param {Array<Object>} slots - Créneaux à filtrer
 * @param {Date} startDate - Date de début
 * @param {Date} endDate - Date de fin
 * @returns {Array<Object>} - Créneaux filtrés
 */
function filterSlotsByDate(slots, startDate, endDate) {
  if (!Array.isArray(slots) || slots.length === 0) {
    return [];
  }
  
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];
  
  return slots.filter(slot => {
    if (!slot.date) return false;
    
    return slot.date >= startStr && slot.date <= endStr;
  });
}

/**
 * Trie les créneaux par date et heure
 * @param {Array<Object>} slots - Créneaux à trier
 * @returns {Array<Object>} - Créneaux triés
 */
function sortSlots(slots) {
  if (!Array.isArray(slots) || slots.length === 0) {
    return [];
  }
  
  return slots.sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return a.time.localeCompare(b.time);
  });
}

module.exports = {
  processRawSlots,
  extractAvailableSlots,
  filterSlotsByDate,
  sortSlots
};
