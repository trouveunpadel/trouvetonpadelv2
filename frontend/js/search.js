/**
 * search.js - Gestion des recherches de créneaux et tournois
 * Partie du projet TrouveTonPadel
 */

document.addEventListener('DOMContentLoaded', function() {
    // Gestion du bouton de retour à la recherche
    const backToSearchButton = document.getElementById('back-to-search');
    if (backToSearchButton) {
        backToSearchButton.addEventListener('click', function() {
            // Masquer la section des résultats
            document.getElementById('results-section').style.display = 'none';
            
            // Afficher à nouveau la section des fonctionnalités
            document.querySelector('.features').style.display = 'block';
            
            // Faire défiler jusqu'au formulaire de recherche
            document.querySelector('.hero').scrollIntoView({ behavior: 'smooth' });
        });
    }
    
    // Gestion du formulaire de recherche de créneaux
    const searchForm = document.getElementById('search-form');
    
    if (searchForm) {
        searchForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Récupération des valeurs du formulaire
            const date = document.getElementById('date').value;
            const time = document.getElementById('time').value;
            const radius = document.getElementById('radius').value;
            const useGeolocation = document.getElementById('use-location-toggle').checked;
            
            // Affichage des valeurs dans la console pour le débogage
            console.log('Recherche de créneaux avec les paramètres suivants:');
            console.log('Date:', date);
            console.log('Heure minimum:', time);
            console.log('Rayon:', radius, 'km');
            console.log('Utilisation de la géolocalisation:', useGeolocation);
            
            // Récupérer la ville si la géolocalisation n'est pas utilisée
            const city = !useGeolocation ? document.getElementById('city').value : '';
            
            // Utiliser la section dédiée aux résultats
            const resultsSection = document.getElementById('results-section');
            const resultsContainer = document.getElementById('results-container');
            
            // Afficher la section des résultats
            resultsSection.style.display = 'block';
            
            // Faire défiler jusqu'à la section des résultats
            resultsSection.scrollIntoView({ behavior: 'smooth' });
            
            // Masquer les autres sections pour se concentrer sur les résultats
            document.querySelector('.features').style.display = 'none';
            
            // Afficher un message de chargement
            resultsContainer.innerHTML = '<div class="loading">Recherche de créneaux en cours...</div>';
            
            try {
                // Convertir la date au format YYYY-MM-DD si nécessaire
                const formattedDate = date;
                
                // Convertir l'heure en heure de début et de fin
                const [hours] = time.split(':').map(Number);
                const startHour = hours;
                const endHour = 23; // Jusqu'à la fin de la journée
                
                // Obtenir les coordonnées géographiques (soit par géolocalisation, soit par ville)
                let coordinates;
                
                if (useGeolocation) {
                    // Utiliser la position de l'utilisateur
                    try {
                        coordinates = await LocationService.getUserPosition();
                        console.log('Coordonnées de géolocalisation obtenues:', coordinates);
                        
                        if (!coordinates) {
                            throw new Error('Impossible d\'obtenir votre position');
                        }
                    } catch (geoError) {
                        console.error('Erreur lors de la géolocalisation:', geoError);
                        throw new Error(`Erreur de géolocalisation: ${geoError.message || 'Détails non disponibles'}`);
                    }
                } else {
                    // Vérifier que la ville est bien renseignée
                    if (!city || city.trim() === '') {
                        // Masquer la section des résultats
                        resultsSection.style.display = 'none';
                        // Afficher à nouveau la section des fonctionnalités
                        document.querySelector('.features').style.display = 'block';
                        
                        // Afficher notre popup personnalisée sans scroll
                        customModal.show(
                            'Localisation manquante', 
                            'Veuillez saisir une ville ou activer la géolocalisation pour effectuer votre recherche.'
                        );
                        
                        return; // Arrêter l'exécution de la fonction
                    }
                    
                    // Utiliser la ville saisie
                    console.log('Tentative de géocodage pour la ville:', city);
                    try {
                        coordinates = await LocationService.getCoordinatesFromCity(city);
                        console.log('Coordonnées de la ville obtenues:', coordinates);
                        
                        if (!coordinates) {
                            throw new Error('Impossible de trouver les coordonnées pour cette ville');
                        }
                    } catch (geoError) {
                        console.error('Erreur lors du géocodage:', geoError);
                        
                        // Masquer la section des résultats
                        resultsSection.style.display = 'none';
                        // Afficher à nouveau la section des fonctionnalités
                        document.querySelector('.features').style.display = 'block';
                        
                        // Afficher notre popup personnalisée sans scroll
                        customModal.show(
                            'Ville introuvable', 
                            `Impossible de localiser "${city}". Veuillez vérifier l'orthographe ou essayer une autre ville.`
                        );
                        
                        return; // Arrêter l'exécution de la fonction
                    }
                }
                
                console.log('Préparation de la recherche de créneaux...');
                
                // Maintenant que nous avons les coordonnées, rediriger vers la page de résultats
                // Préparer les paramètres de l'URL
                const params = new URLSearchParams();
                params.append('date', formattedDate);
                params.append('time', time);
                params.append('radius', radius);
                params.append('latitude', coordinates.latitude);
                params.append('longitude', coordinates.longitude);
                
                // Rediriger vers la page de résultats avec les paramètres
                window.location.href = `results.html?${params.toString()}`;
                return; // Arrêter l'exécution du code ici puisqu'on redirige
                
                // Préparer les données de la requête
                const requestData = {
                    date: formattedDate,
                    startHour: startHour,
                    endHour: endHour,
                    latitude: coordinates.latitude,
                    longitude: coordinates.longitude,
                    radius: parseInt(radius, 10)
                };
                
                console.log('Données de la requête:', requestData);
                
                // Effectuer la requête API
                let response;
                
                // Vérifier si le client proxy est disponible
                if (typeof ProxyClient !== 'undefined') {
                    console.log('Utilisation du client proxy pour la requête API');
                    
                    try {
                        const apiResult = await ProxyClient.post('/api/search', requestData);
                        
                        // Convertir la réponse du proxy en objet Response standard
                        response = {
                            ok: apiResult.ok,
                            status: apiResult.status || 200,
                            statusText: '',
                            json() {
                                return Promise.resolve(apiResult.data);
                            }
                        };
                    } catch (error) {
                        console.error('Erreur lors de l\'appel via le proxy:', error);
                        
                        // Essayer la méthode directe en cas d'échec du proxy
                        console.log('Tentative avec fetch direct après échec du proxy');
                        response = await fetch('/api/search', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Cache-Control': 'no-cache',
                                'Pragma': 'no-cache'
                            },
                            body: JSON.stringify(requestData),
                            cache: 'no-store'
                        });
                    }
                } else {
                    console.log('Client proxy non disponible, utilisation de fetch directement');
                    
                    // URL relative de l'API
                    const apiUrl = '/api/search';
                    
                    // Effectuer la requête avec fetch
                    response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Cache-Control': 'no-cache',
                            'Pragma': 'no-cache'
                        },
                        body: JSON.stringify(requestData),
                        cache: 'no-store'
                    });
                }
                
                console.log('Statut de la réponse:', response.status);
                
                // Vérifier si la réponse est OK (status 200-299)
                if (!response.ok) {
                    // Essayer de récupérer les détails de l'erreur si possible
                    let errorMessage = `Erreur ${response.status}: ${response.statusText}`;
                    
                    try {
                        const errorData = await response.json();
                        if (errorData && errorData.message) {
                            errorMessage = errorData.message;
                        }
                    } catch (e) {
                        // Ignorer les erreurs lors de la lecture de la réponse d'erreur
                    }
                    
                    throw new Error(errorMessage);
                }
                
                // Récupérer les données JSON
                const data = await response.json();
                console.log('Données reçues:', data);
                
                // Vérifier spécifiquement si Enjoy Padel est présent dans les données
                if (data && data.slots) {
                    const enjoyPadelSlots = data.slots.filter(slot => slot.clubName === 'Enjoy Padel');
                    console.log('Créneaux Enjoy Padel trouvés:', enjoyPadelSlots.length);
                    console.log('Clubs présents dans les résultats:', [...new Set(data.slots.map(slot => slot.clubName))]);
                }
                
                // Vérifier si les données contiennent des créneaux
                if (data && data.slots) {
                    
                    // Ajouter les coordonnées de recherche à chaque créneau pour le calcul des distances
                    if (data.slots.length > 0) {
                        data.slots.forEach(slot => {
                            slot.searchCoordinates = coordinates;
                            // Ajouter les coordonnées pour The Monkey Padel si elles sont manquantes
                            if (!slot.coordinates && slot.clubName === "The Monkey Padel") {
                                slot.coordinates = { latitude: 43.64458478670538, longitude: 5.163387292364317 };
                            }
                        });
                    }
                    
                    // Afficher les résultats
                    // Vérifier si la fonction est disponible globalement ou dans window
                    if (typeof window.displayResults === 'function') {
                        window.displayResults(data.slots, resultsContainer);
                        
                        // Mettre à jour le compteur de résultats
                        const resultCount = document.getElementById('result-count');
                        resultCount.textContent = `${data.slots.length} créneaux disponibles dans ${new Set(data.slots.map(slot => slot.clubName)).size} club(s)`;
                    } else if (typeof displayResults === 'function') {
                        displayResults(data.slots, resultsContainer);
                    } else {
                        console.error('La fonction displayResults n\'est pas définie');
                        resultsContainer.innerHTML = `
                            <div style="text-align: center; padding: 40px 20px; color: #dc3545;">
                                <p><strong>Erreur lors de l'affichage des résultats</strong></p>
                                <p style="font-size: 14px; color: #6c757d;">Fonction d'affichage non disponible</p>
                            </div>
                        `;
                    }
                } else {
                    throw new Error('Format de réponse invalide: pas de créneaux trouvés');
                }
                
            } catch (error) {
                // Créer un objet d'erreur plus détaillé pour le débogage
                const errorDetails = {
                    message: error.message || 'Erreur inconnue',
                    stack: error.stack,
                    name: error.name,
                    toString: error.toString()
                };
                
                console.error('Erreur détaillée:', errorDetails);
                console.log('Type d\'erreur:', typeof error, Object.prototype.toString.call(error));
                
                // Afficher un message d'erreur plus convivial avec des détails pour le débogage
                resultsContainer.innerHTML = `
                    <div style="text-align: center; padding: 40px 20px; color: #dc3545;">
                        <p><strong>Erreur lors de la recherche de créneaux</strong></p>
                        <p style="font-size: 14px; color: #6c757d;">${errorDetails.message}</p>
                        <p style="font-size: 12px; color: #999; margin-top: 10px;">Type: ${errorDetails.name || 'Non spécifié'}</p>
                    </div>
                `;
            }
        });
    }
    
    // Gestion du formulaire de recherche de tournois
    const tournamentForm = document.getElementById('tournament-form');
    
    if (tournamentForm) {
        tournamentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Récupération des valeurs du formulaire
            const startDate = document.getElementById('start-date').value;
            const endDate = document.getElementById('end-date').value;
            const city = document.getElementById('tournament-city').value;
            const radius = document.getElementById('tournament-radius').value;
            
            // Affichage des valeurs dans la console pour le débogage
            console.log('Recherche de tournois avec les paramètres suivants:');
            console.log('Date de début:', startDate);
            console.log('Date de fin:', endDate);
            console.log('Ville:', city);
            console.log('Rayon:', radius, 'km');
            
            // Fonctionnalité à implémenter
            alert('La recherche de tournois sera disponible prochainement !');
        });
    }
});
