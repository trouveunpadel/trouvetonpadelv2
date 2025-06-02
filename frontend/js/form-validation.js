/**
 * form-validation.js - Validation du formulaire de recherche
 * Partie du projet TrouveTonPadel
 */

/**
 * Valide le formulaire et redirige vers la page de résultats si tout est correct
 * @param {Event} event - L'événement de soumission du formulaire
 * @returns {boolean} - false pour empêcher la soumission normale du formulaire
 */
function validateAndSubmitForm(event) {
    // Empêcher la soumission normale du formulaire
    event.preventDefault();
    
    // Récupérer les éléments du formulaire
    const dateInput = document.getElementById('date');
    const timeInput = document.getElementById('time');
    const radiusInput = document.getElementById('radius');
    const cityInput = document.getElementById('city');
    const locationToggle = document.getElementById('use-location-toggle');
    
    // Vérifier que les champs obligatoires sont remplis
    if (!dateInput.value) {
        customModal.show('Date manquante', 'Veuillez sélectionner une date.', function() {
            dateInput.focus();
        });
        return false;
    }
    
    if (!timeInput.value) {
        customModal.show('Heure manquante', 'Veuillez sélectionner une heure.', function() {
            timeInput.focus();
        });
        return false;
    }
    
    // Vérifier la localisation
    const useGeolocation = locationToggle && locationToggle.checked;
    
    // Vérifier d'abord si la ville est renseignée, même si la géolocalisation est activée
    if (!useGeolocation && (!cityInput.value || !cityInput.value.trim())) {
        customModal.show('Ville manquante', 'Veuillez saisir une ville ou activer la géolocalisation.', function() {
            cityInput.focus();
        });
        return false;
    }
    
    // Préparer les paramètres pour la redirection
    const date = dateInput.value;
    const time = timeInput.value;
    const radius = radiusInput.value;
    
    // Construire l'URL de base
    let redirectUrl = `results.html?date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}&radius=${encodeURIComponent(radius)}`;
    
    // Traiter selon le mode de localisation
    if (!useGeolocation) {
        // Mode ville (on a déjà vérifié que la ville est renseignée)
        // Géocoder la ville
        LocationService.getCoordinatesFromCity(cityInput.value.trim())
            .then(coords => {
                redirectUrl += `&latitude=${coords.latitude}&longitude=${coords.longitude}`;
                window.location.href = redirectUrl;
            })
            .catch(error => {
                console.error('Erreur de géocodage:', error);
                customModal.show('Ville introuvable', 'Impossible de localiser cette ville. Veuillez vérifier l\'orthographe ou essayer une autre ville.');
            });
        return false;
    } else {
        // Mode géolocalisation
        if (LocationService.userPosition) {
            // Position déjà disponible, on peut rediriger directement
            redirectUrl += `&latitude=${LocationService.userPosition.latitude}&longitude=${LocationService.userPosition.longitude}`;
            window.location.href = redirectUrl;
            return false;
        } else {
            // On doit d'abord demander la position
            // Afficher notre popup personnalisée avant de demander la géolocalisation
            customModal.show('Géolocalisation', 'Nous allons vous demander d\'autoriser l\'accès à votre position pour effectuer la recherche.', function() {
                // Après fermeture de notre popup, demander la position
                LocationService.getUserPosition()
                    .then(position => {
                        // Rediriger avec les coordonnées obtenues
                        redirectUrl += `&latitude=${position.latitude}&longitude=${position.longitude}`;
                        window.location.href = redirectUrl;
                    })
                    .catch(error => {
                        console.error('Erreur de géolocalisation:', error);
                        customModal.show('Géolocalisation impossible', 'Impossible d\'obtenir votre position. Veuillez saisir une ville.');
                    });
            });
            return false;
        }
    }
    
    // Ne jamais soumettre le formulaire normalement
    return false;
}
