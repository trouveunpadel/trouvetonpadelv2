/**
 * Module pour générer les liens de réservation pour MonkeyPadel
 */

/**
 * Formate une date au format DD/MM/YYYY attendu par OpenResa
 * @param {string} dateStr - Date au format YYYY-MM-DD
 * @returns {string} - Date formatée
 */
function formatDate(dateStr) {
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Convertit l'heure au format minutes depuis minuit
 * @param {string} timeStr - Heure au format HH:MM
 * @returns {number} - Minutes depuis minuit
 */
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Obtient l'ID du terrain en fonction de son nom
 * @param {string} courtName - Nom du terrain
 * @returns {string} - ID du terrain
 */
function getScheduleId(courtName) {
  const courtMapping = {
    'Piste extérieure 01': '57729',
    'Piste extérieure 02': '57730',
    'Piste extérieure 03': '57731',
    'Piste extérieure 04': '57736',
    'Piste indoor 01': '72534',
    'Piste indoor 02': '72535',
    'Piste indoor 03': '72536',
    'Piste indoor 04': '72537'
  };

  const id = courtMapping[courtName.trim()];
  if (!id) {
    throw new Error(`Terrain inconnu: ${courtName}`);
  }
  return id;
}

/**
 * Génère l'URL de redirection finale
 * @param {string} dateStr - Date au format YYYY-MM-DD
 * @returns {string} - URL de redirection
 */
function generateRedirectUrl(dateStr) {
  const formattedDate = formatDate(dateStr);
  return `https://openresa.com/reservation/#action=1&date=${formattedDate}&group=-1&page=0&panel=0`;
}

/**
 * Génère les informations de réservation pour un créneau
 * @param {Object} slot - Informations sur le créneau
 * @returns {Object} - Informations de réservation
 */
function generateReservationInfo(slot) {
  try {
    const scheduleId = getScheduleId(slot.court);
    const timestart = timeToMinutes(slot.time);
    
    // Vérifier si la date est au format français (DD/MM/YYYY) ou au format ISO (YYYY-MM-DD)
    let formattedDate;
    if (slot.date.includes('-')) {
      // La date est déjà au format YYYY-MM-DD, convertir au format DD/MM/YYYY
      const [year, month, day] = slot.date.split('-');
      formattedDate = `${day}/${month}/${year}`;
    } else if (slot.date.includes('/')) {
      // La date est déjà au format DD/MM/YYYY, la garder telle quelle
      formattedDate = slot.date;
    } else {
      throw new Error(`Format de date non reconnu: ${slot.date}`);
    }
    
    // Construire l'URL finale directement
    // Format correct pour la réservation directe
    const directUrl = `https://openresa.com/reservation/#action=0&date=${formattedDate}&group=0&page=0`;
    
    // Convertir la date au format Date pour calculer la différence
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Convertir la date du créneau en objet Date
    let slotDate;
    if (slot.date.includes('-')) {
      // Format YYYY-MM-DD
      slotDate = new Date(slot.date);
    } else if (slot.date.includes('/')) {
      // Format DD/MM/YYYY
      const [day, month, year] = slot.date.split('/');
      slotDate = new Date(`${year}-${month}-${day}`);
    }
    slotDate.setHours(0, 0, 0, 0);
    
    // Calculer la différence en jours
    const diffTime = slotDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Utiliser la différence en jours pour le paramètre date
    const date = diffDays.toString();
    const duration = slot.durationMinutes ? slot.durationMinutes.toString() : "90";
    
    // Données pour la requête POST
    const requestData = `date=${date}&schedule=${scheduleId}&timestart=${timestart}&duration=${duration}`;
    
    return {
      directUrl,
      redirectUrl: directUrl, // Pour compatibilité
      requestUrl: 'https://openresa.com/reservation/switch',
      requestData,
      scheduleId,
      timestart,
      duration
    };
  } catch (error) {
    console.error('Erreur lors de la génération des informations de réservation:', error);
    return null;
  }
}

/**
 * Ajoute les liens de réservation aux créneaux
 * @param {Array} slots - Liste des créneaux
 * @returns {Array} - Liste des créneaux avec liens de réservation
 */
function addReservationLinks(slots) {
  return slots.map(slot => {
    try {
      const reservationInfo = generateReservationInfo(slot);
      if (reservationInfo) {
        return {
          ...slot,
          reservationInfo,
          // Ajouter la propriété reservationLink pour compatibilité avec le frontend
          reservationLink: reservationInfo.directUrl
        };
      }
      return slot;
    } catch (error) {
      console.error(`Erreur lors de l'ajout du lien de réservation pour le créneau ${slot.time} sur ${slot.court}:`, error);
      return slot;
    }
  });
}

module.exports = {
  addReservationLinks,
  generateReservationInfo
};
