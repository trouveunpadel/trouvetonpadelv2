/**
 * ui.js - Gestion des éléments d'interface utilisateur
 * Partie du projet TrouveTonPadel
 */

document.addEventListener('DOMContentLoaded', function() {
    // Gestion de l'effet de retournement de carte
    const card = document.querySelector('.card');
    const flipToBackBtn = document.getElementById('flip-to-back');
    const flipToFrontBtn = document.getElementById('flip-to-front');
    
    if (flipToBackBtn) {
        flipToBackBtn.addEventListener('click', function() {
            card.classList.add('flipped');
        });
    }
    
    if (flipToFrontBtn) {
        flipToFrontBtn.addEventListener('click', function() {
            card.classList.remove('flipped');
        });
    }
    
    // Mise à jour de l'affichage du rayon pour la recherche de créneaux
    const radiusSlider = document.getElementById('radius');
    const radiusValue = document.getElementById('radius-value');
    
    if (radiusSlider && radiusValue) {
        radiusSlider.addEventListener('input', function() {
            radiusValue.textContent = this.value;
        });
    }
    
    // Mise à jour de l'affichage du rayon pour la recherche de tournois
    const tournamentRadiusSlider = document.getElementById('tournament-radius');
    const tournamentRadiusValue = document.getElementById('tournament-radius-value');
    
    if (tournamentRadiusSlider && tournamentRadiusValue) {
        tournamentRadiusSlider.addEventListener('input', function() {
            tournamentRadiusValue.textContent = this.value;
        });
    }
    
    // Initialisation des dates par défaut
    initDefaultDates();
});

/**
 * Initialise les dates par défaut dans les champs de formulaire
 */
function initDefaultDates() {
    // Date du jour formatée YYYY-MM-DD
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    
    // Date pour la recherche de créneaux
    const dateInput = document.getElementById('date');
    if (dateInput) {
        dateInput.value = formattedDate;
    }
    
    // Dates pour la recherche de tournois
    const startDateInput = document.getElementById('start-date');
    if (startDateInput) {
        startDateInput.value = formattedDate;
    }
    
    // Date de fin par défaut (aujourd'hui + 30 jours)
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    const formattedEndDate = endDate.toISOString().split('T')[0];
    
    const endDateInput = document.getElementById('end-date');
    if (endDateInput) {
        endDateInput.value = formattedEndDate;
    }
    
    // Définir une heure par défaut (7:00 pour voir les créneaux tôt le matin)
    const timeInput = document.getElementById('time');
    if (timeInput) {
        timeInput.value = '07:00';
    }
}
