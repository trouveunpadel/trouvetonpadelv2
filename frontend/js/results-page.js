/**
 * results-page.js - Gestion de la page de résultats
 * Partie du projet TrouveTonPadel
 */

document.addEventListener('DOMContentLoaded', function() {
    // Récupérer les paramètres de l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const date = urlParams.get('date');
    const time = urlParams.get('time');
    const radius = urlParams.get('radius');
    const latitude = urlParams.get('latitude');
    const longitude = urlParams.get('longitude');
    
    // Vérifier que les paramètres nécessaires sont présents
    if (!date || !time || !radius) {
        document.getElementById('results-container').innerHTML = `
            <div class="error-container p-4 text-center">
                <h3 class="text-danger mb-3">Paramètres de recherche incomplets</h3>
                <p class="mb-4">Certaines informations nécessaires à la recherche sont manquantes.</p>
                <a href="index.html" class="btn btn-primary">Retour à la recherche</a>
            </div>
        `;
        return;
    }
    
    // Vérifier spécifiquement les paramètres de localisation
    if (!latitude || !longitude) {
        document.getElementById('results-container').innerHTML = `
            <div class="error-container p-4 text-center">
                <h3 class="text-danger mb-3">Localisation manquante</h3>
                <p class="mb-4">Veuillez activer la géolocalisation ou saisir une ville valide pour effectuer votre recherche.</p>
                <a href="index.html" class="btn btn-primary">Retour à la recherche</a>
            </div>
        `;
        return;
    }
    
    // Afficher un message de chargement
    document.getElementById('results-container').innerHTML = `
        <div class="d-flex justify-content-center align-items-center py-5">
            <div class="spinner-border text-primary me-3" role="status">
                <span class="visually-hidden">Chargement...</span>
            </div>
            <span>Recherche des créneaux disponibles...</span>
        </div>
    `;
    
    // Préparer les données de la requête
    const requestData = {
        date: date,
        startHour: parseInt(time.split(':')[0], 10),
        endHour: 23,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radius: parseInt(radius, 10)
    };
    
    // Effectuer la requête API
    fetchResults(requestData);
});

/**
 * Récupère les résultats de l'API
 * @param {Object} requestData - Données de la requête
 */
async function fetchResults(requestData) {
    try {
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
                response = await fetch('http://localhost:3000/api/search', {
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
            
            // URL complète de l'API backend
            const apiUrl = 'http://localhost:3000/api/search';
            
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
        
        // Vérifier si les données contiennent des créneaux
        if (data && data.slots) {
            // Ajouter les coordonnées de recherche à chaque créneau pour le calcul des distances
            const searchCoordinates = {
                latitude: requestData.latitude,
                longitude: requestData.longitude
            };
            
            if (data.slots.length > 0) {
                data.slots.forEach(slot => {
                    slot.searchCoordinates = searchCoordinates;
                    // Ajouter les coordonnées pour The Monkey Padel si elles sont manquantes
                    if (!slot.coordinates && slot.clubName === "The Monkey Padel") {
                        slot.coordinates = { latitude: 43.64458478670538, longitude: 5.163387292364317 };
                    }
                });
            }
            
            // Afficher les résultats
            const resultsContainer = document.getElementById('results-container');
            
            // Vérifier si la fonction est disponible globalement ou dans window
            if (typeof window.displayResults === 'function') {
                window.displayResults(data.slots, resultsContainer);
                
                // L'élément result-count a été supprimé, pas besoin de le mettre à jour
            } else {
                console.error('La fonction displayResults n\'est pas disponible');
                resultsContainer.innerHTML = '<div class="error">Erreur lors de l\'affichage des résultats.</div>';
            }
        } else {
            throw new Error('Format de données invalide');
        }
    } catch (error) {
        console.error('Erreur lors de la recherche:', error);
        
        // Afficher un message d'erreur
        document.getElementById('results-container').innerHTML = `
            <div class="error-container">
                <h3>Erreur lors de la recherche</h3>
                <p>${error.message || 'Une erreur est survenue lors de la recherche de créneaux.'}</p>
                <a href="index.html" class="btn btn-primary mt-3">Réessayer</a>
            </div>
        `;
    }
}
