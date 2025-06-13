/**
 * results-display.js - Affichage des résultats de recherche
 * Partie du projet TrouveTonPadel
 */

// Utiliser le service de localisation et le service météo déjà définis globalement
// @ts-ignore

/**
 * Retourne le nom du fichier image pour un club donné
 * @param {string} clubName - Nom du club
 * @returns {string} - Nom du fichier image
 */
function getClubImage(clubName) {
    switch(clubName) {
        case 'Le Complexe Padel':
            return 'lecomplexe.jpg';
        case 'P4 Padel Indoor':
            return 'p4-padel.jpg'; // Assurez-vous que cette image existe dans le dossier images/clubs/
        case 'Enjoy Padel':
            return 'enjoy-padel.jpg'; // Assurez-vous que cette image existe dans le dossier images/clubs/
        case 'Padel Gentle':
            return 'padel-gentle.jpg'; // Assurez-vous que cette image existe dans le dossier images/clubs/
        case 'Padel Twins':
            return 'padel-twins.jpg'; // Image du club Padel Twins
        case 'Country Club Padel':
            return 'country-club-padel.jpg'; // Image par défaut pour Country Club Padel
        case 'The Monkey Padel':
        default:
            return 'monkey-padel.jpg';
    }
}

/**
 * Affiche les résultats de la recherche avec un design inspiré des sites de réservation médicale
 * @param {Array} slots - Liste des créneaux disponibles
 * @param {HTMLElement} container - Conteneur pour afficher les résultats
 */
window.displayResults = function(slots, container) {
    if (!slots || slots.length === 0) {
        // Récupérer les paramètres depuis l'URL
        const urlParams = new URLSearchParams(window.location.search);
        const radius = urlParams.get('radius') || '20';
        const date = urlParams.get('date') || 'non spécifiée';
        const time = urlParams.get('time') || 'non spécifiée';
        
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: #767676;">
                <h3 style="margin-bottom: 15px; color: #555;">Aucun créneau disponible</h3>
                <p style="font-size: 14px; margin-bottom: 10px;">Aucun créneau de padel n'a été trouvé pour les critères suivants :</p>
                <ul style="list-style: none; padding: 0; margin-bottom: 20px; font-size: 14px;">
                    <li><strong>Date :</strong> ${date}</li>
                    <li><strong>Heure minimum :</strong> ${time}</li>
                    <li><strong>Rayon de recherche :</strong> ${radius} km</li>
                </ul>
                <p style="font-size: 14px;">Essayez de modifier vos critères de recherche ou d'augmenter le rayon.</p>
            </div>`;
        return;
    }
    
    // Récupérer les coordonnées de recherche (soit de la géolocalisation, soit de la ville)
    const searchCoordinates = slots.length > 0 && slots[0].searchCoordinates ? slots[0].searchCoordinates : null;
    
    // Traiter et afficher les résultats directement
    processAndDisplayResults(slots, container, searchCoordinates);
};

/**
 * Traite et affiche les résultats avec ou sans la position de l'utilisateur
 * @param {Array} slots - Liste des créneaux disponibles
 * @param {HTMLElement} container - Conteneur pour afficher les résultats
 * @param {Object|null} searchCoordinates - Coordonnées de recherche (latitude, longitude) ou null
 */
window.processAndDisplayResults = function(slots, container, searchCoordinates) {
    // Récupérer le rayon de recherche depuis les paramètres d'URL ou utiliser une valeur par défaut
    let radius = 20; // Valeur par défaut
    
    // Essayer de récupérer le rayon et la date depuis les paramètres d'URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('radius')) {
        radius = parseInt(urlParams.get('radius'), 10);
    }
    
    // Récupérer la date de recherche (nécessaire pour la météo)
    let defaultDate;
    if (!urlParams.get('date')) {
        // Si pas de date spécifiée dans l'URL, appliquer la logique de date par défaut
        const now = new Date();
        const currentHour = now.getHours();

        // Si l'heure actuelle est après 22h, utiliser la date de demain par défaut
        if (currentHour >= 22) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            defaultDate = tomorrow.toISOString().split('T')[0];
        } else {
            defaultDate = now.toISOString().split('T')[0];
        }
    } else {
        defaultDate = urlParams.get('date');
    }
    const searchDate = defaultDate;
    
    // Regrouper les créneaux par club
    const groupedByClub = {};
    
    slots.forEach(slot => {
        if (!groupedByClub[slot.clubName]) {
            // Utiliser la configuration centralisée des clubs
            const knownClubCoordinates = {
                "The Monkey Padel": window.clubsConfig.monkeypadel,
                "Le Complexe Padel": window.clubsConfig.complexepadel,
                "P4 Padel Indoor": window.clubsConfig.p4padelindoor,
                "Enjoy Padel": window.clubsConfig.enjoypadel,
                "Padel Gentle": window.clubsConfig.padelgentle,
                "Country Club Padel": window.clubsConfig.countryclubpadel
            };
            
            // Utiliser les coordonnées connues si disponibles, sinon utiliser celles fournies
            const clubCoordinates = knownClubCoordinates[slot.clubName] || slot.coordinates || null;
            
            // Créer l'objet club avec les données de base
            groupedByClub[slot.clubName] = {
                name: slot.clubName,
                distance: slot.distance || "--", // Valeur par défaut si pas de distance
                address: slot.address || "Adresse du club", // À remplacer par l'adresse réelle si disponible
                type: "Club de padel",
                coordinates: clubCoordinates, // Coordonnées du club (connues ou fournies)
                slots: [],
                outOfRange: false // Par défaut, le club est dans le rayon
            };
            
            // Si on a les coordonnées de recherche et les coordonnées du club, calculer la distance
            if (searchCoordinates && clubCoordinates) {
                try {
                    // Vérifier que les coordonnées sont dans le bon format
                    const formattedCoordinates = {
                        latitude: parseFloat(clubCoordinates.latitude) || 0,
                        longitude: parseFloat(clubCoordinates.longitude) || 0
                    };
                    
                    // Ne calculer la distance que si les coordonnées sont valides
                    if (formattedCoordinates.latitude && formattedCoordinates.longitude) {
                        const calculatedDistance = LocationService.calculateDistance(searchCoordinates, formattedCoordinates);
                        // Stocker la distance numérique pour le filtrage
                        groupedByClub[slot.clubName].distanceValue = calculatedDistance;
                        // Arrondir à une décimale et ajouter l'unité pour l'affichage
                        groupedByClub[slot.clubName].distance = calculatedDistance.toFixed(1) + ' km';
                        
                        // Marquer le club comme dans le rayon ou hors rayon
                        // On considère qu'un club est dans le rayon si sa distance est inférieure ou égale au rayon spécifié
                        groupedByClub[slot.clubName].outOfRange = (calculatedDistance > radius);
                    } else {
                        console.warn(`Coordonnées invalides pour le club ${slot.clubName}:`, clubCoordinates);
                        groupedByClub[slot.clubName].distance = 'N/A';
                    }
                } catch (e) {
                    console.error('Erreur lors du calcul de la distance pour ' + slot.clubName + ':', e);
                    groupedByClub[slot.clubName].distance = 'N/A';
                }
            } else if (!slot.coordinates) {
                console.warn(`Coordonnées manquantes pour le club ${slot.clubName}`);
            }
        }
        groupedByClub[slot.clubName].slots.push(slot);
    });
    
    // Ajouter des logs pour le débogage
    console.log('Rayon de recherche sélectionné:', radius, 'km');
    console.log('Coordonnées de recherche:', searchCoordinates);
    console.log('Tous les clubs avec leurs distances:', Object.values(groupedByClub).map(club => ({
        nom: club.name,
        distance: club.distanceValue || 'N/A',
        coordonnées: club.coordinates,
        horsRayon: club.outOfRange
    })));
    
    // Filtrer les clubs qui sont hors du rayon spécifié
    // Si searchCoordinates est null, on affiche tous les clubs
    const filteredClubs = searchCoordinates 
        ? Object.values(groupedByClub).filter(club => !club.outOfRange) 
        : Object.values(groupedByClub);
    
    // Si aucun club dans le rayon, afficher un message
    if (filteredClubs.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: #767676; font-size: 14px;">
                Aucun club de padel disponible dans un rayon de ${radius} km.
            </div>`;  
        return;
    }
    
    // Calculer le nombre total de créneaux dans les clubs filtrés
    let totalSlots = 0;
    filteredClubs.forEach(club => {
        totalSlots += club.slots.length;
    });
    
    // Générer le HTML avec un design inspiré des sites de réservation médicale
    let html = `
        <div class="results-container">
            <div class="results-header">
                <div class="results-count">${totalSlots} créneaux disponibles dans ${filteredClubs.length} club${filteredClubs.length > 1 ? 's' : ''}</div>
            </div>
    `;
    
    // Pour chaque club dans le rayon spécifié
    filteredClubs.forEach(club => {
        // Trier les créneaux par heure
        const sortedSlots = [...club.slots].sort((a, b) => {
            return a.time.localeCompare(b.time);
        });
        
        html += `
            <div class="club-card">
                <!-- Colonne de gauche avec les infos du club -->
                <div class="club-left-column">
                    <!-- Distance en haut à droite -->
                    <div class="club-distance">
                        <svg class="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 21C16 17 20 13.4183 20 10C20 6.13401 16.4183 3 12 3C7.58172 3 4 6.13401 4 10C4 13.4183 8 17 12 21Z" stroke="currentColor" stroke-width="1.5"/>
                            <circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="1.5"/>
                        </svg>
                        ${club.distance}
                    </div>
                    
                    <!-- En-tête avec logo et nom du club -->
                    <div class="club-header">
                        <div class="club-avatar">
                            <img src="images/clubs/${getClubImage(club.name)}" alt="${club.name}" style="width: 100%; height: 100%; border-radius: 50%;" />
                        </div>
                        
                        <div class="club-info">
                            <div class="club-name">${club.name}</div>
                        </div>
                    </div>
                    
                    <!-- Adresse du club -->
                    <div class="club-address">
                        ${club.address ? club.address.replace(/,/g, '<br>') : (club.coordinates && club.coordinates.address ? club.coordinates.address.replace(/,/g, '<br>') : 'Adresse non disponible')}
                    </div>
                    
                    <!-- Informations météo -->
                    <div class="weather-info" id="weather-${club.name.replace(/\s+/g, '-').toLowerCase()}">
                        <div class="weather-loading">
                            <div class="spinner"></div>
                            <span>Chargement météo...</span>
                        </div>
                    </div>
                    
                    <!-- Bouton de réservation -->
                    <button class="reserve-btn">RÉSERVER TON CRÉNEAU</button>
                </div>
                
                <!-- Colonne de droite avec les créneaux -->
                <div class="slots-right-column">
                    <table class="slots-table">
                        <thead class="slots-table-header">
                            <tr>
        `;
        
        // Organiser les créneaux par terrain
        const slotsByCourt = {};
        
        // Regrouper les créneaux par terrain
        sortedSlots.forEach(slot => {
            if (!slotsByCourt[slot.court]) {
                slotsByCourt[slot.court] = [];
            }
            slotsByCourt[slot.court].push(slot);
        });
        
        // Trier les terrains
        const courts = Object.keys(slotsByCourt).sort((a, b) => parseInt(a) - parseInt(b));
        
        // Ajouter les en-têtes des terrains
        courts.forEach(court => {
            html += `<th class="slots-table-header-cell">
                <div class="court-name">${court}</div>
            </th>`;
        });
        
        html += `
                            </tr>
                        </thead>
                        <tbody>
                            <tr class="court-type-row">
        `;
        
        // Ajouter les types de terrains dans la première ligne du tableau
        courts.forEach(court => {
            // Utiliser le type de terrain fourni par le backend
            let courtType = 'Non spécifié';
            
            // Vérifier si le slot a un type défini
            if (slotsByCourt[court] && slotsByCourt[court].length > 0) {
                
                try {
                    // Utiliser le type du premier créneau pour ce terrain (vérifier courtType d'abord, puis type)
                    courtType = slotsByCourt[court][0].courtType || slotsByCourt[court][0].type || 'Non spécifié';
                    
                    // Mettre la première lettre en majuscule
                    courtType = courtType.charAt(0).toUpperCase() + courtType.slice(1);
                } catch (error) {
                    console.error('Erreur lors de la récupération du type de terrain:', error);
                    courtType = 'Non spécifié';
                }
            }
            
            html += `<td class="slots-table-cell"><div class="court-type">${courtType}</div></td>`;
        });
        
        html += `</tr>
        `;
        
        // Déterminer le nombre maximum de créneaux pour un terrain
        let maxSlots = 0;
        courts.forEach(court => {
            const numSlots = slotsByCourt[court].length;
            if (numSlots > maxSlots) {
                maxSlots = numSlots;
            }
        });
        
        // Créer des lignes pour chaque créneau disponible
        for (let i = 0; i < maxSlots; i++) {
            html += `<tr class="slots-table-row">`;
            
            // Pour chaque terrain, afficher le créneau s'il existe
            courts.forEach(court => {
                const courtSlots = slotsByCourt[court].sort((a, b) => a.time.localeCompare(b.time));
                
                if (i < courtSlots.length) {
                    const slot = courtSlots[i];
                    // Ajouter un attribut data avec les informations du créneau pour la réservation
                    html += `
                        <td class="slots-table-cell">
                            <div class="slot-available" 
                                 data-club="${club.name}" 
                                 data-court="${slot.court}" 
                                 data-date="${slot.date}" 
                                 data-time="${slot.time}"
                                 data-has-reservation-info="${slot.reservationLink ? 'true' : 'false'}"
                                 ${slot.reservationLink ? `data-redirect-url="${slot.reservationLink}"` : ''}
                                 style="cursor: pointer;">
                                ${slot.time}
                            </div>
                        </td>
                    `;
                } else {
                    html += `<td class="slots-table-cell"></td>`;
                }
            });
            
            html += `</tr>`;
        }
        
        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    });
    
    html += `</div>`;
    
    container.innerHTML = html;
    
    // Ajouter la classe mobile au container
    container.classList.add('mobile-results-container');
    
    // Ajouter des événements de clic sur les boutons de réservation et les créneaux
    setTimeout(() => {
        // Gérer les clics sur les boutons de réservation
        const reserveButtons = container.querySelectorAll('.reserve-btn');
        reserveButtons.forEach(button => {
            button.addEventListener('click', function() {
                // Trouver le premier créneau disponible dans ce club
                const clubCard = this.closest('.club-card');
                const firstSlot = clubCard.querySelector('.slot-available');
                if (firstSlot) {
                    // Simuler un clic sur le premier créneau disponible
                    firstSlot.click();
                } else {
                    alert('Aucun créneau disponible dans ce club');
                }
            });
        });
        
        // Gérer les clics sur les créneaux
        const slotElements = container.querySelectorAll('.slot-available');
        slotElements.forEach(slotElement => {
            slotElement.addEventListener('click', function() {
                // Récupérer les informations du créneau depuis les attributs data
                const hasReservationInfo = this.getAttribute('data-has-reservation-info') === 'true';
                
                if (hasReservationInfo) {
                    // Récupérer les informations de réservation
                    const redirectUrl = this.getAttribute('data-redirect-url');
                    
                    // Ouvrir directement l'URL dans un nouvel onglet
                    window.open(redirectUrl, '_blank');
                    
                    // Afficher un message de confirmation
                    console.log('Redirection vers la page de réservation:', redirectUrl);
                } else {
                    // Si pas d'informations de réservation, afficher un message
                    alert('Informations de réservation non disponibles pour ce créneau.');
                }
            });
        });
        
        // Charger les données météo pour chaque club
        filteredClubs.forEach(async club => {
            if (club.coordinates && window.WeatherService) {
                try {
                    // Récupérer l'élément météo pour ce club
                    const weatherElement = document.getElementById(`weather-${club.name.replace(/\s+/g, '-').toLowerCase()}`);
                    if (!weatherElement) return;
                    
                    // Récupérer les données météo pour la date de recherche et les coordonnées du club
                    const weatherData = await window.WeatherService.getWeatherForecast(
                        searchDate,
                        club.coordinates.latitude,
                        club.coordinates.longitude
                    );
                    
                    // Afficher les données météo
                    weatherElement.innerHTML = `
                        <div class="weather-header">Météo du ${new Date(searchDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</div>
                        <div class="weather-content">
                            <div class="weather-icon">
                                <img src="${window.WeatherService.getWeatherIconUrl(weatherData.weatherIcon)}" alt="${weatherData.weatherDescription}" />
                            </div>
                            <div class="weather-details">
                                <div class="weather-temp">${weatherData.temperature}°C</div>
                                <div class="weather-wind">
                                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
                                        <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2.5 2.5 0 1 1 19.5 12H2" />
                                    </svg>
                                    ${weatherData.windSpeed} km/h
                                </div>
                            </div>
                        </div>
                    `;
                } catch (error) {
                    console.error('Erreur lors du chargement des données météo:', error);
                    const weatherElement = document.getElementById(`weather-${club.name.replace(/\s+/g, '-').toLowerCase()}`);
                    if (weatherElement) {
                        weatherElement.innerHTML = `
                            <div class="weather-error">
                                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                Données météo non disponibles
                            </div>
                        `;
                    }
                }
            }
        });
        
        // Ajouter les flèches de navigation pour le défilement horizontal
        const scrollContainers = document.querySelectorAll('.slots-right-column');
        scrollContainers.forEach(scrollContainer => {
            // Vérifier si le défilement est nécessaire
            if (scrollContainer.scrollWidth > scrollContainer.clientWidth) {
                // Créer les flèches directement dans le conteneur de défilement
                // Créer la flèche gauche
                const prevArrow = document.createElement('div');
                prevArrow.className = 'nav-arrow prev';
                prevArrow.innerHTML = '&larr;';
                prevArrow.style.display = 'none'; // Cachée au début
                
                // Créer la flèche droite
                const nextArrow = document.createElement('div');
                nextArrow.className = 'nav-arrow next';
                nextArrow.innerHTML = '&rarr;';
                
                // Trouver la carte du club parente
                const clubCard = scrollContainer.closest('.club-card');
                if (!clubCard) return;
                
                // Ajouter les flèches à la carte du club
                clubCard.style.position = 'relative';
                clubCard.appendChild(prevArrow);
                clubCard.appendChild(nextArrow);
                
                // Positionner les flèches par rapport au conteneur de défilement
                prevArrow.style.left = '310px'; // Juste après la colonne de gauche
                nextArrow.style.right = '10px'; // 10px du bord droit
                
                // Gérer le clic sur la flèche gauche
                prevArrow.addEventListener('click', function() {
                    scrollContainer.scrollBy({ left: -200, behavior: 'smooth' });
                });
                
                // Gérer le clic sur la flèche droite
                nextArrow.addEventListener('click', function() {
                    scrollContainer.scrollBy({ left: 200, behavior: 'smooth' });
                });
                
                // Gérer l'affichage des flèches en fonction de la position de défilement
                scrollContainer.addEventListener('scroll', function() {
                    // Afficher/masquer la flèche gauche
                    prevArrow.style.display = this.scrollLeft > 20 ? 'flex' : 'none';
                    
                    // Afficher/masquer la flèche droite
                    nextArrow.style.display = 
                        this.scrollLeft < (this.scrollWidth - this.clientWidth - 20) ? 'flex' : 'none';
                });
            }
        });
    }, 100);
}

/**
 * AFFICHAGE MOBILE - Ajout de la logique mobile sans modification du desktop
 */

/**
 * Détecte si l'utilisateur est sur mobile
 * @returns {boolean} - true si mobile, false sinon
 */
function isMobileDevice() {
    return window.innerWidth <= 768;
}

/**
 * Affiche les résultats en mode mobile (liste verticale)
 * @param {Array} filteredClubs - Liste des clubs filtrés
 * @param {HTMLElement} container - Conteneur pour afficher les résultats
 * @param {string} searchDate - Date de recherche
 */
function displayMobileResults(filteredClubs, container, searchDate) {
    // Trier tous les créneaux par heure
    const allSlots = [];
    filteredClubs.forEach(club => {
        club.slots.forEach(slot => {
            allSlots.push({
                ...slot,
                distance: club.distance,
                clubName: slot.clubName || club.name,
                clubAddress: club.address,
                coordinates: club.coordinates
            });
        });
    });
    
    // Trier par heure
    allSlots.sort((a, b) => {
        const timeA = a.time.split(':').map(Number);
        const timeB = b.time.split(':').map(Number);
        return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
    });

    // Générer le HTML avec filtres
    let html = `
        <div class="mobile-results-header">
            <!-- Filtres mobiles tout en haut -->
            <div class="mobile-filters">
                <button class="mobile-filter-btn active" data-filter="all">Tous</button>
                <button class="mobile-filter-btn" data-filter="interieur">Intérieur</button>
                <button class="mobile-filter-btn" data-filter="exterieur">Extérieur</button>
            </div>
            
            <!-- Filtres par club -->
            <div class="mobile-filters" id="club-filters">`;
    
    // Ajouter les filtres par club (sans bouton "Tous")
    const uniqueClubs = [...new Set(allSlots.map(slot => slot.clubName))];
    uniqueClubs.forEach(clubName => {
        html += `<button class="mobile-filter-btn" data-club-filter="${clubName}">${clubName}</button>`;
    });
    
    html += `
            </div>
            
            <div class="mobile-slots-list">`;
    
    // Générer les cartes de créneaux
    allSlots.forEach(slot => {
        const courtType = slot.courtType || slot.type || 'Non spécifié';
        // Détection améliorée pour les courts extérieurs (avec et sans accent)
        const courtTypeLower = courtType.toLowerCase();
        const isExterior = courtTypeLower.includes('extérieur') || 
                          courtTypeLower.includes('exterieur') || 
                          courtTypeLower.includes('exterior') || 
                          courtTypeLower.includes('outdoor');
        const typeDisplay = isExterior ? 'Extérieur' : 'Intérieur';
        
        // Extraire la ville de l'adresse (après le code postal)
        let city = '';
        if (slot.clubAddress) {
            // Chercher le pattern "code postal + ville" dans l'adresse
            const match = slot.clubAddress.match(/\d{5}\s+([^,]+)/);
            if (match) {
                city = match[1].trim();
            } else {
                // Si pas de code postal trouvé, prendre la dernière partie après la dernière virgule
                const parts = slot.clubAddress.split(',');
                city = parts[parts.length - 1].trim();
                // Supprimer le code postal s'il est au début
                city = city.replace(/^\d{5}\s*/, '').trim();
            }
        }
        
        html += `
            <div class="mobile-slot-card" 
                 data-club="${slot.clubName}"
                 data-type="${isExterior ? 'exterieur' : 'interieur'}"
                 data-has-reservation-info="${slot.hasReservationInfo || false}"
                 data-redirect-url="${slot.reservationLink || ''}">
                
                <div class="mobile-slot-left">
                    <div class="mobile-slot-club">${slot.clubName}</div>
                    <div class="mobile-slot-court">${slot.court}</div>
                    <div class="mobile-slot-location">
                        ${slot.distance ? `<span class="mobile-distance"><svg class="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 21C16 17 20 13.4183 20 10C20 6.13401 16.4183 3 12 3C7.58172 3 4 6.13401 4 10C4 13.4183 8 17 12 21Z" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="1.5"/></svg> ${slot.distance}</span>` : ''}
                        ${city || ''}
                    </div>
                    <button class="mobile-reserve-btn">Réserver</button>
                </div>
                
                <div class="mobile-slot-right">
                    <div class="mobile-slot-time">${slot.time}</div>
                    <div class="mobile-slot-type">${typeDisplay}</div>
                </div>
            </div>`;
    });
    
    html += `
        </div>
    `;
    
    container.innerHTML = html;
    
    // Ajouter les événements pour les filtres et les créneaux
    setTimeout(() => {
        // Gestion des filtres par type
        const typeFilters = container.querySelectorAll('[data-filter]');
        typeFilters.forEach(btn => {
            btn.addEventListener('click', function() {
                // Retirer la classe active des autres boutons du même groupe
                this.parentElement.querySelectorAll('.mobile-filter-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                const filterType = this.getAttribute('data-filter');
                const cards = container.querySelectorAll('.mobile-slot-card');
                
                // Mettre à jour les attributs data-type pour s'assurer qu'ils sont corrects
                cards.forEach(card => {
                    // Récupérer le type de court affiché dans la carte
                    const courtTypeElement = card.querySelector('.mobile-slot-type');
                    if (courtTypeElement) {
                        const courtTypeText = courtTypeElement.textContent.toLowerCase();
                        // Détecter si c'est extérieur ou intérieur
                        if (courtTypeText.includes('extérieur')) {
                            card.setAttribute('data-type', 'exterieur');
                        } else {
                            card.setAttribute('data-type', 'interieur');
                        }
                    }
                    
                    // Appliquer le filtre
                    if (filterType === 'all' || filterType === 'interieur' || card.getAttribute('data-type') === filterType) {
                        card.style.display = 'flex';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        });
        
        // Gestion des filtres par club
        const clubFilters = container.querySelectorAll('[data-club-filter]');
        clubFilters.forEach(btn => {
            btn.addEventListener('click', function() {
                // Ajouter ou retirer la classe active
                this.classList.toggle('active');
                
                // Récupérer tous les clubs sélectionnés
                const selectedClubs = Array.from(container.querySelectorAll('[data-club-filter].active'))
                    .map(btn => btn.getAttribute('data-club-filter'));
                
                const cards = container.querySelectorAll('.mobile-slot-card');
                
                // Si aucun club sélectionné, afficher tous les créneaux
                // Sinon, afficher seulement les créneaux des clubs sélectionnés
                cards.forEach(card => {
                    const cardClub = card.getAttribute('data-club');
                    if (selectedClubs.length === 0 || selectedClubs.includes(cardClub)) {
                        card.style.display = 'flex';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        });
        
        // Gestion des clics sur les boutons Réserver
        const mobileReserveButtons = container.querySelectorAll('.mobile-reserve-btn');
        
        mobileReserveButtons.forEach((button, index) => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const slotCard = this.closest('.mobile-slot-card');
                
                const hasReservationInfo = slotCard.getAttribute('data-has-reservation-info') === 'true';
                const redirectUrl = slotCard.getAttribute('data-redirect-url');
                
                // Ouvrir le lien s'il existe, peu importe hasReservationInfo
                if (redirectUrl && redirectUrl.trim() !== '') {
                    window.open(redirectUrl, '_blank');
                } else {
                    alert('Lien de réservation non disponible pour ce créneau.');
                }
            });
        });
        
        // Charger les données météo pour chaque club (version mobile simplifiée)
        const processedClubs = new Set();
        filteredClubs.forEach(async club => {
            if (processedClubs.has(club.name)) return;
            processedClubs.add(club.name);
            
            if (club.coordinates && window.WeatherService) {
                try {
                    const weatherData = await window.WeatherService.getWeatherForecast(
                        searchDate,
                        club.coordinates.latitude,
                        club.coordinates.longitude
                    );
                    
                    // Ajouter l'info météo aux cartes de ce club
                    const clubCards = container.querySelectorAll(`[data-club="${club.name}"]`);
                    clubCards.forEach(card => {
                        // Supprimer l'information sur le vent de la partie location
                        const locationDiv = card.querySelector('.mobile-slot-location');
                        const existingWindInfo = locationDiv && locationDiv.querySelector('.mobile-wind-info');
                        if (existingWindInfo) {
                            existingWindInfo.remove();
                        }
                        
                        // Ajouter les icônes météo dans la partie droite
                        const rightDiv = card.querySelector('.mobile-slot-right');
                        if (rightDiv && !rightDiv.querySelector('.mobile-weather-info')) {
                            // Ajouter l'information sur le vent en premier
                            rightDiv.innerHTML += `
                                <div class="mobile-weather-info mobile-wind-info">
                                    <span>🌬️ ${weatherData.windSpeed} km/h</span>
                                </div>
                            `;
                            
                            // Ajouter l'icône météo
                            rightDiv.innerHTML += `
                                <div class="mobile-weather-info">
                                    <img src="${window.WeatherService.getWeatherIconUrl(weatherData.weatherIcon)}" alt="météo" class="mobile-weather-icon" />
                                </div>
                            `;
                            
                            // Ajouter la température
                            rightDiv.innerHTML += `
                                <div class="mobile-weather-info">
                                    <span class="mobile-weather-temp">${weatherData.temperature}°C</span>
                                </div>
                            `;
                        }
                    });
                } catch (error) {
                    console.error('Erreur météo mobile pour', club.name, ':', error);
                }
            }
        });
        
        // Ajouter des logs de débogage
        console.log('Affichage mobile - Nombre de créneaux:', allSlots.length);
        console.log('Affichage mobile - Premiers créneaux:', allSlots.slice(0, 3));
        console.log('Affichage mobile - HTML généré, longueur:', html.length);
    }, 100);
}

// Modifier la fonction processAndDisplayResults pour détecter le mobile
const originalProcessAndDisplayResults = window.processAndDisplayResults;
window.processAndDisplayResults = function(slots, container, searchCoordinates) {
    console.log('processAndDisplayResults appelé avec', slots.length, 'créneaux, mobile:', isMobileDevice());
    
    // Si on est sur mobile, utiliser l'affichage mobile
    if (isMobileDevice()) {
        console.log('Affichage mobile détecté - début du traitement');
        
        // Récupérer les paramètres nécessaires (copié du code desktop)
        let radius = 20;
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('radius')) {
            radius = parseInt(urlParams.get('radius'), 10);
        }
        
        let defaultDate;
        if (!urlParams.get('date')) {
            const now = new Date();
            const currentHour = now.getHours();
            if (currentHour >= 22) {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                defaultDate = tomorrow.toISOString().split('T')[0];
            } else {
                defaultDate = now.toISOString().split('T')[0];
            }
        } else {
            defaultDate = urlParams.get('date');
        }
        const searchDate = defaultDate;
        
        // Regrouper les créneaux par club (même logique que desktop)
        const groupedByClub = {};
        
        slots.forEach(slot => {
            if (!groupedByClub[slot.clubName]) {
                const knownClubCoordinates = {
                    "The Monkey Padel": window.clubsConfig.monkeypadel,
                    "Le Complexe Padel": window.clubsConfig.complexepadel,
                    "P4 Padel Indoor": window.clubsConfig.p4padelindoor,
                    "Enjoy Padel": window.clubsConfig.enjoypadel,
                    "Padel Gentle": window.clubsConfig.padelgentle,
                    "Country Club Padel": window.clubsConfig.countryclubpadel
                };
                
                const clubCoordinates = knownClubCoordinates[slot.clubName] || slot.coordinates || null;
                
                groupedByClub[slot.clubName] = {
                    name: slot.clubName,
                    distance: slot.distance || "--",
                    address: slot.address || "Adresse du club",
                    type: "Club de padel",
                    coordinates: clubCoordinates,
                    slots: [],
                    outOfRange: false
                };
                
                // Calculer la distance si possible
                if (searchCoordinates && clubCoordinates) {
                    try {
                        // Vérifier que les coordonnées sont dans le bon format
                        const formattedCoordinates = {
                            latitude: parseFloat(clubCoordinates.latitude) || 0,
                            longitude: parseFloat(clubCoordinates.longitude) || 0
                        };
                        
                        // Ne calculer la distance que si les coordonnées sont valides et LocationService est disponible
                        if (formattedCoordinates.latitude && formattedCoordinates.longitude && typeof LocationService !== 'undefined') {
                            const calculatedDistance = LocationService.calculateDistance(searchCoordinates, formattedCoordinates);
                            groupedByClub[slot.clubName].distanceValue = calculatedDistance;
                            groupedByClub[slot.clubName].distance = calculatedDistance.toFixed(1) + ' km';
                            groupedByClub[slot.clubName].outOfRange = (calculatedDistance > radius);
                        } else {
                            console.warn(`Coordonnées invalides ou LocationService non disponible pour le club ${slot.clubName}:`, clubCoordinates);
                            groupedByClub[slot.clubName].distance = 'N/A';
                        }
                    } catch (e) {
                        console.error('Erreur calcul distance mobile:', e);
                        groupedByClub[slot.clubName].distance = 'N/A';
                    }
                }
            }
            groupedByClub[slot.clubName].slots.push(slot);
        });
        
        // Filtrer les clubs dans le rayon
        const filteredClubs = searchCoordinates 
            ? Object.values(groupedByClub).filter(club => !club.outOfRange) 
            : Object.values(groupedByClub);
        
        if (filteredClubs.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: #767676; font-size: 14px;">
                    Aucun club de padel disponible dans un rayon de ${radius} km.
                </div>`;  
            return;
        }
        
        // Utiliser l'affichage mobile
        displayMobileResults(filteredClubs, container, searchDate);
    } else {
        console.log('Affichage desktop détecté');
        // Utiliser l'affichage desktop original
        originalProcessAndDisplayResults(slots, container, searchCoordinates);
    }
};
