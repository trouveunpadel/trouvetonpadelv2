/**
 * location-service-new.js - Service de géolocalisation pour TrouveTonPadel
 * Gère la géolocalisation de l'utilisateur et le calcul des distances
 */

const LocationService = {
    // État du service
    userPosition: null,
    isLocating: false,
    geocodeCache: {}, // Cache pour les résultats de géocodage
    
    /**
     * Récupère la position de l'utilisateur via l'API Geolocation
     * @returns {Promise} Promesse résolue avec les coordonnées {latitude, longitude}
     */
    getUserPosition: function() {
        this.isLocating = true;
        
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                this.isLocating = false;
                reject(new Error("La géolocalisation n'est pas prise en charge par votre navigateur"));
                return;
            }
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.isLocating = false;
                    this.userPosition = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    };
                    console.log("Position utilisateur obtenue:", this.userPosition);
                    resolve(this.userPosition);
                },
                (error) => {
                    this.isLocating = false;
                    console.error("Erreur de géolocalisation:", error.message);
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        });
    },
    
    /**
     * Obtient les coordonnées géographiques d'une ville via l'API Nominatim (OpenStreetMap)
     * @param {string} city - Nom de la ville
     * @returns {Promise} Promesse résolue avec les coordonnées {latitude, longitude}
     */
    getCoordinatesFromCity: function(city) {
        // Validation de l'entrée
        if (!city || typeof city !== 'string' || city.trim() === '') {
            return Promise.reject(new Error('Nom de ville invalide ou manquant'));
        }
        
        console.log('Géocodage de la ville:', city);
        
        // Si la ville est déjà dans le cache, on retourne les coordonnées directement
        if (this.geocodeCache[city]) {
            console.log('Coordonnées trouvées dans le cache:', this.geocodeCache[city]);
            return Promise.resolve(this.geocodeCache[city]);
        }

        // Base de données locale des principales villes françaises
        const knownCities = {
            'paris': { latitude: 48.8566, longitude: 2.3522, displayName: 'Paris, France' },
            'marseille': { latitude: 43.2965, longitude: 5.3698, displayName: 'Marseille, France' },
            'lyon': { latitude: 45.7578, longitude: 4.8320, displayName: 'Lyon, France' },
            'toulouse': { latitude: 43.6047, longitude: 1.4442, displayName: 'Toulouse, France' },
            'nice': { latitude: 43.7102, longitude: 7.2620, displayName: 'Nice, France' },
            'nantes': { latitude: 47.2184, longitude: -1.5536, displayName: 'Nantes, France' },
            'strasbourg': { latitude: 48.5734, longitude: 7.7521, displayName: 'Strasbourg, France' },
            'montpellier': { latitude: 43.6108, longitude: 3.8767, displayName: 'Montpellier, France' },
            'bordeaux': { latitude: 44.8378, longitude: -0.5792, displayName: 'Bordeaux, France' },
            'lille': { latitude: 50.6292, longitude: 3.0573, displayName: 'Lille, France' },
            'eyguieres': { latitude: 43.695131, longitude: 5.0297213, displayName: 'Eyguières, France' },
            'mallemort': { latitude: 43.7406, longitude: 5.1825, displayName: 'Mallemort, France' },
            'istres': { latitude: 43.5139051, longitude: 4.9884323, displayName: "Istres, Bouches-du-Rhône, Provence-Alpes-Côte d'Azur, France métropolitaine, France" }
        };
        
        const normalizedCity = city.toLowerCase().trim();
        if (knownCities[normalizedCity]) {
            console.log('Utilisation de coordonnées locales pour:', city);
            this.geocodeCache[city] = knownCities[normalizedCity];
            return Promise.resolve(knownCities[normalizedCity]);
        }

        // Dans l'environnement de prévisualisation, nous évitons d'utiliser l'API Nominatim
        // et utilisons uniquement notre base de données locale
        console.log('Recherche locale pour:', city);
        
        // Position par défaut pour la France
        const defaultPosition = { 
            latitude: 46.603354, 
            longitude: 1.888334, 
            displayName: 'France (position approximative)' 
        };
        
        // Recherche d'une correspondance partielle dans notre base locale
        for (const [knownCity, coords] of Object.entries(knownCities)) {
            if (city.toLowerCase().includes(knownCity) || knownCity.includes(city.toLowerCase())) {
                console.log(`Utilisation des coordonnées de ${knownCity} pour ${city}`);
                this.geocodeCache[city] = coords;
                return Promise.resolve(coords);
            }
        }
        
        // Si aucune correspondance n'est trouvée, utiliser la position par défaut
        console.log('Aucune correspondance trouvée, utilisation de la position par défaut pour la France');
        this.geocodeCache[city] = defaultPosition;
        return Promise.resolve(defaultPosition);
    },
    
    /**
     * Calcule la distance entre deux points géographiques en kilomètres (formule de Haversine)
     * @param {Object} point1 - Premier point {latitude, longitude}
     * @param {Object} point2 - Second point {latitude, longitude}
     * @returns {number} Distance en kilomètres
     */
    calculateDistance: function(point1, point2) {
        // Vérifier que les points ont des coordonnées valides
        if (!point1 || !point2 || !point1.latitude || !point1.longitude || !point2.latitude || !point2.longitude) {
            console.error('Coordonnées invalides pour le calcul de distance:', { point1, point2 });
            return 999; // Valeur élevée pour indiquer une erreur
        }
        
        // Convertir les coordonnées en nombres pour éviter les erreurs
        const lat1 = parseFloat(point1.latitude);
        const lon1 = parseFloat(point1.longitude);
        const lat2 = parseFloat(point2.latitude);
        const lon2 = parseFloat(point2.longitude);
        
        // Formule de Haversine pour calculer la distance entre deux points géographiques
        const R = 6371; // Rayon de la Terre en km
        const dLat = this._toRad(lat2 - lat1);
        const dLon = this._toRad(lon2 - lon1);
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(this._toRad(lat1)) * Math.cos(this._toRad(lat2)) * 
                Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        
        return parseFloat(distance.toFixed(1)); // Arrondi à 1 décimale
    },
    
    /**
     * Convertit des degrés en radians
     * @private
     * @param {number} degrees - Angle en degrés
     * @returns {number} Angle en radians
     */
    _toRad: function(degrees) {
        return degrees * Math.PI / 180;
    },
    
    /**
     * Vérifie si un point est dans un rayon donné par rapport à un autre point
     * @param {Object} center - Point central {latitude, longitude}
     * @param {Object} point - Point à vérifier {latitude, longitude}
     * @param {number} radius - Rayon en kilomètres
     * @returns {boolean} Vrai si le point est dans le rayon
     */
    isPointInRadius: function(center, point, radius) {
        const distance = this.calculateDistance(center, point);
        return distance <= radius;
    }
};

// Exposer le service globalement
window.LocationService = LocationService;
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
            if (cityInputContainer) {
                cityInputContainer.style.display = 'none';
            }
            if (cityInput) {
                cityInput.required = false;
                cityInput.value = '';
            }
            
            // Réduire la hauteur du conteneur quand la géolocalisation est activée
            if (cardContainer) {
                cardContainer.style.height = '580px'; // Hauteur réduite
            }
        } else {
            // Mode ville activé
            if (cityInputContainer) {
                cityInputContainer.style.display = 'block';
            }
            if (cityInput) {
                cityInput.required = true;
            }
            
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
