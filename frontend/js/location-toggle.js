/**
 * location-toggle.js - Gestion du toggle de géolocalisation
 * Partie du projet TrouveTonPadel
 */

document.addEventListener('DOMContentLoaded', function() {
    // Éléments du DOM
    const locationToggle = document.getElementById('use-location-toggle');
    const cityInputContainer = document.getElementById('city-input-container');
    const cityInput = document.getElementById('city');
    const searchForm = document.getElementById('search-form');
    
    // État initial
    let useGeolocation = false;
    
    // Référence au conteneur de la carte
    const cardContainer = document.querySelector('.card-container');
    
    // Fonction pour mettre à jour l'interface en fonction de l'état du toggle
    function updateInterface() {
        if (useGeolocation) {
            // Mode géolocalisation activé
            cityInputContainer.style.display = 'none';
            cityInput.required = false;
            cityInput.value = '';
            
            // Réduire la hauteur du conteneur quand la géolocalisation est activée
            if (cardContainer) {
                cardContainer.style.height = '580px'; // Hauteur réduite
            }
        } else {
            // Mode ville activé
            cityInputContainer.style.display = 'block';
            cityInput.required = true;
            
            // Rétablir la hauteur normale du conteneur
            if (cardContainer) {
                cardContainer.style.height = '670px'; // Hauteur normale
            }
        }
    }
    
    // Écouteur d'événement pour le toggle
    if (locationToggle) {
        locationToggle.addEventListener('change', function() {
            useGeolocation = this.checked;
            updateInterface();
            
            if (useGeolocation) {
                // Demander la permission de géolocalisation dès que l'utilisateur active le toggle
                LocationService.getUserPosition()
                    .then(position => {
                        console.log('Géolocalisation activée, position obtenue:', position);
                    })
                    .catch(error => {
                        console.error('Erreur lors de la géolocalisation:', error);
                        // En cas d'erreur, revenir au mode ville
                        useGeolocation = false;
                        locationToggle.checked = false;
                        updateInterface();
                        
                        // Afficher notre popup personnalisée
                        customModal.show('Géolocalisation impossible', 'Impossible d\'obtenir votre position. Veuillez autoriser la géolocalisation ou saisir une ville.');
                    });
            }
        });
    }
    
    // Écouteur d'événement pour le formulaire de recherche
    if (searchForm) {
        searchForm.addEventListener('submit', function(event) {
            // Empêcher la soumission par défaut pour valider d'abord
            event.preventDefault();
            
            // Si la géolocalisation est activée mais qu'on n'a pas de position
            if (useGeolocation && !LocationService.userPosition) {
                customModal.show('Géolocalisation requise', 'Veuillez autoriser la géolocalisation ou saisir une ville.');
                return false;
            }
            
            // Si la géolocalisation n'est pas activée et que le champ ville est vide
            if (!useGeolocation && !cityInput.value.trim()) {
                customModal.show('Ville manquante', 'Veuillez saisir une ville.', function() {
                    cityInput.focus();
                });
                return false;
            }
            
            // Préparer les paramètres pour la redirection
            const date = document.getElementById('date').value;
            const time = document.getElementById('time').value;
            const radius = document.getElementById('radius').value;
            
            // Construire l'URL de redirection avec les paramètres nécessaires
            let redirectUrl = `results.html?date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}&radius=${encodeURIComponent(radius)}`;
            
            // Ajouter les coordonnées selon le mode choisi
            if (useGeolocation && LocationService.userPosition) {
                // Mode géolocalisation
                redirectUrl += `&latitude=${LocationService.userPosition.latitude}&longitude=${LocationService.userPosition.longitude}`;
                window.location.href = redirectUrl;
            } else if (!useGeolocation && cityInput.value.trim()) {
                // Mode ville - géocoder la ville d'abord
                LocationService.getCoordinatesFromCity(cityInput.value.trim())
                    .then(coords => {
                        redirectUrl += `&latitude=${coords.latitude}&longitude=${coords.longitude}`;
                        window.location.href = redirectUrl;
                    })
                    .catch(error => {
                        console.error('Erreur de géocodage:', error);
                        customModal.show('Ville introuvable', 'Impossible de localiser cette ville. Veuillez vérifier l\'orthographe ou essayer une autre ville.');
                    });
            }
            
            return false; // Empêcher la soumission normale du formulaire
        });
    }
    
    // Initialisation de l'interface
    updateInterface();
});
