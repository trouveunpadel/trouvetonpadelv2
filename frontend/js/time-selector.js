/**
 * time-selector.js - Gestion du sélecteur d'heure
 * Partie du projet TrouveTonPadel
 */

// Heure par défaut pour les dates futures (17h00)
const DEFAULT_HOUR = "17:00";

/**
 * Met à jour les options du sélecteur d'heure en fonction de la date sélectionnée
 * Si la date est aujourd'hui, seules les heures futures sont disponibles
 * Pour les dates futures, l'heure par défaut est 17h00
 */
function updateTimeSelector() {
    const dateInput = document.getElementById('date');
    const timeInput = document.getElementById('time');
    
    if (!dateInput || !timeInput) return;
    
    // Récupérer la date sélectionnée
    const selectedDate = dateInput.value;
    
    // Récupérer la date d'aujourd'hui au format YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];
    
    // Si la date sélectionnée est aujourd'hui, limiter les heures disponibles
    if (selectedDate === today) {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        
        // Définir l'heure minimum à l'heure actuelle arrondie à l'heure supérieure
        let minHour = currentHour;
        if (currentMinute > 0) {
            minHour += 1; // Arrondir à l'heure supérieure
        }
        
        // Formater l'heure minimum (HH:00)
        const minTime = `${minHour.toString().padStart(2, '0')}:00`;
        
        // Définir l'heure minimum pour le sélecteur
        timeInput.min = minTime;
        
        // Si l'heure actuellement sélectionnée est inférieure à l'heure minimum, la mettre à jour
        if (!timeInput.value || timeInput.value < minTime) {
            timeInput.value = minTime;
        }
        
        console.log(`Date aujourd'hui: limitation des heures à partir de ${minTime}`);
    } else {
        // Pour les dates futures, aucune restriction mais définir l'heure par défaut à 17h00
        timeInput.min = "";
        timeInput.value = DEFAULT_HOUR;
        console.log('Date future: heure définie à 17h00');
    }
}

// Initialiser le sélecteur d'heure au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    const dateInput = document.getElementById('date');
    const timeInput = document.getElementById('time');
    
    if (dateInput) {
        // Définir la date par défaut à aujourd'hui
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
        dateInput.min = today; // Empêcher la sélection de dates passées
        
        // Définir l'heure par défaut à 17h00 pour l'initialisation
        if (timeInput && !timeInput.value) {
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            
            // Si l'heure actuelle est avant 17h, on met 17h par défaut
            if (currentHour < 17) {
                timeInput.value = DEFAULT_HOUR;
            } else {
                // Sinon, on arrondit à l'heure supérieure
                let minHour = currentHour;
                if (currentMinute > 0) {
                    minHour += 1;
                }
                timeInput.value = `${minHour.toString().padStart(2, '0')}:00`;
            }
        }
        
        // Mettre à jour le sélecteur d'heure initialement
        updateTimeSelector();
        
        // Ajouter un écouteur d'événement pour mettre à jour le sélecteur d'heure lorsque la date change
        dateInput.addEventListener('change', updateTimeSelector);
    }
});
