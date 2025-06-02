/**
 * Module pour générer les liens de réservation pour Padel Twins
 */

/**
 * Formate une date au format DD/MM/YYYY attendu par l'API
 * @param {string} dateStr - Date au format YYYY-MM-DD
 * @returns {string} - Date formatée
 */
function formatDate(dateStr) {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Génère l'URL de réservation pour Padel Twins
 * @returns {string} - URL de réservation
 */
function generateDirectUrl() {
  // Redirection directe vers la page de réservation
  return 'https://padeltwins.mymobileapp.fr/';
}

/**
 * Ajoute les liens de réservation aux créneaux
 * @param {Array} slots - Liste des créneaux
 * @returns {Array} - Liste des créneaux avec liens de réservation
 */
function addReservationLinks(slots) {
  return slots.map(slot => {
    return {
      ...slot,
      reservationLink: generateDirectUrl()
    };
  });
}

module.exports = {
  addReservationLinks,
  generateDirectUrl,
  formatDate
};
