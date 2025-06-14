/**
 * location-service-new.js - Service de géolocalisation pour TrouveTonPadel
 * Gère la géolocalisation de l'utilisateur et le calcul des distances
 */

const LocationService = {
    // État du service
    userPosition: null,
    isLocating: false,
    geocodeCache: {}, // Cache pour les résultats de géocodage de la session
    knownCities: {}, // Cache des villes locales chargées depuis le JSON
    _knownCitiesPromise: null, // Promesse pour le chargement du fichier

    /**
     * Charge les villes connues depuis un fichier JSON.
     * Ne s'exécute qu'une seule fois.
     * @returns {Promise} Promesse résolue avec l'objet des villes connues.
     */
    _loadKnownCities: function() {
        if (!this._knownCitiesPromise) {
            this._knownCitiesPromise = fetch('data/cities.json')
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Erreur réseau: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    this.knownCities = data;
                    console.log("Cache de villes locales chargé avec succès.");
                    return this.knownCities;
                })
                .catch(error => {
                    console.error("Impossible de charger le fichier de villes locales (cities.json). Le service fonctionnera sans ce cache.", error);
                    this.knownCities = {}; // Assurer un objet vide en cas d'échec
                    return this.knownCities;
                });
        }
        return this._knownCitiesPromise;
    },
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
    getCoordinatesFromCity: async function(city) {
        // Validation de l'entrée
        if (!city || typeof city !== 'string' || city.trim() === '') {
                        throw new Error('Nom de ville invalide ou manquant');
        }

                const normalizedCity = city.toLowerCase().trim();
        console.log('Géocodage de la ville:', city);

        // 1. Vérifier le cache de session
        if (this.geocodeCache[normalizedCity]) {
            console.log('Coordonnées trouvées dans le cache de session:', this.geocodeCache[normalizedCity]);
            return this.geocodeCache[normalizedCity];
        }

        // 2. Attendre que le fichier des villes locales soit chargé et vérifier dedans
        const knownCities = await this._loadKnownCities();
        if (knownCities[normalizedCity]) {
            console.log('Utilisation de coordonnées du cache local (fichier) pour:', city);
            this.geocodeCache[normalizedCity] = knownCities[normalizedCity];
            return knownCities[normalizedCity];
        }

        // 3. Si pas dans les caches, appel à l'API Nominatim via le proxy
            const endpoint = `geocode?city=${encodeURIComponent(city)}`;
    console.log('Appel API Nominatim via proxy:', endpoint);

    // Vérifier que window.apiProxy est disponible
    if (!window.apiProxy) {
        throw new Error('Le service de proxy API n\'est pas encore initialisé. Veuillez réessayer dans quelques secondes.');
    }

    const response = await window.apiProxy.get(endpoint);
    if (!response.ok) {
        // apiProxy rejette déjà en cas d'erreur réseau majeure, ici on gère les erreurs HTTP (4xx, 5xx)
        throw new Error(`Erreur de l'API de géocodage: ${response.status} - ${response.data.message || response.statusText}`);
    }

    const dataFromApi = response.data;
    if (dataFromApi && dataFromApi.length > 0) {
            const result = dataFromApi[0];
            const coordinates = {
                latitude: parseFloat(result.lat),
                longitude: parseFloat(result.lon),
                displayName: result.display_name
            };
            console.log('Coordonnées obtenues via API:', coordinates);
            this.geocodeCache[normalizedCity] = coordinates; // Mise en cache de session
            return coordinates;
        } else {
            throw new Error(`La ville "${city}" n'a pas pu être trouvée.`);
        }
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

// Initialiser le chargement du cache de villes dès que le script est lu.
LocationService._loadKnownCities();

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

    // ========================================
    // GESTION DE LA LOCALISATION POUR LES TOURNOIS
    // ========================================
    
    // Éléments pour les tournois
    const tournamentLocationToggle = document.getElementById('tournament-use-location-toggle');
    const tournamentCityInput = document.getElementById('tournament-city');
    const tournamentCityContainer = document.getElementById('tournament-city-input-container');
    const tournamentForm = document.getElementById('tournament-form');
    
    // État initial pour les tournois
    let useTournamentGeolocation = false;
    
    // Fonction pour mettre à jour l'interface des tournois
    function updateTournamentInterface() {
        if (tournamentCityContainer) {
            if (useTournamentGeolocation) {
                // Masquer le champ ville
                tournamentCityContainer.style.display = 'none';
                // Retirer l'attribut required
                if (tournamentCityInput) {
                    tournamentCityInput.removeAttribute('required');
                }
            } else {
                // Afficher le champ ville
                tournamentCityContainer.style.display = 'block';
                // Ajouter l'attribut required
                if (tournamentCityInput) {
                    tournamentCityInput.setAttribute('required', '');
                }
            }
        }
    }
    
    // Écouteur d'événement pour le toggle des tournois
    if (tournamentLocationToggle) {
        tournamentLocationToggle.addEventListener('change', function() {
            useTournamentGeolocation = this.checked;
            updateTournamentInterface();
            
            if (useTournamentGeolocation) {
                // Demander la permission de géolocalisation dès que l'utilisateur active le toggle
                LocationService.getUserPosition()
                    .then(position => {
                        console.log('Géolocalisation tournois activée, position obtenue:', position);
                    })
                    .catch(error => {
                        console.error('Erreur lors de la géolocalisation tournois:', error);
                        // En cas d'erreur, revenir au mode ville
                        useTournamentGeolocation = false;
                        tournamentLocationToggle.checked = false;
                        updateTournamentInterface();
                        
                        // Afficher notre popup personnalisée
                        customModal.show('Géolocalisation impossible', 'Impossible d\'obtenir votre position. Veuillez autoriser la géolocalisation ou saisir une ville.');
                    });
            }
        });
    }
    
    // Écouteur d'événement pour le formulaire de tournois
    if (tournamentForm) {
        tournamentForm.addEventListener('submit', function(event) {
            event.preventDefault();

            if (useTournamentGeolocation && !LocationService.userPosition) {
                customModal.show('Géolocalisation requise', 'Veuillez autoriser la géolocalisation ou saisir une ville.');
                return false;
            }

            if (!useTournamentGeolocation && !tournamentCityInput.value.trim()) {
                customModal.show('Ville manquante', 'Veuillez saisir une ville.', () => tournamentCityInput.focus());
                return false;
            }

            const startDate = document.getElementById('start-date').value;
            const endDate = document.getElementById('end-date').value;
            const radius = document.getElementById('tournament-radius').value;

            if (!startDate || !endDate) {
                customModal.show('Dates manquantes', 'Veuillez sélectionner les dates de début et de fin.');
                return false;
            }
            if (new Date(startDate) > new Date(endDate)) {
                customModal.show('Dates invalides', 'La date de début doit être antérieure à la date de fin.');
                return false;
            }

            const redirectToResults = (coords, city) => {
                let redirectUrl = `tournaments.html?city=${encodeURIComponent(city)}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&radius=${encodeURIComponent(radius)}&lat=${coords.lat}&lng=${coords.lng}`;
                window.location.href = redirectUrl;
            };

            if (useTournamentGeolocation && LocationService.userPosition) {
                const coords = { lat: LocationService.userPosition.latitude, lng: LocationService.userPosition.longitude };
                redirectToResults(coords, 'Position actuelle');
            } else if (!useTournamentGeolocation && tournamentCityInput.value.trim()) {
                const city = tournamentCityInput.value.trim();
                LocationService.getCoordinatesFromCity(city)
                    .then(coords => {
                        redirectToResults({ lat: coords.latitude, lng: coords.longitude }, city);
                    })
                    .catch(error => {
                        console.error('Erreur de géocodage tournois:', error);
                        customModal.show('Ville introuvable', 'Impossible de localiser cette ville. Veuillez vérifier l\'orthographe ou essayer une autre ville.');
                    });
            }
            return false;
        });
    }
    
    // Initialisation de l'interface des tournois
    updateTournamentInterface();
});
