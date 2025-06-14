document.addEventListener('DOMContentLoaded', () => { // Changed back to non-async as apiProxy handles async
    const resultsContainer = document.getElementById('tournament-results-container');
    const loadingIndicator = document.getElementById('loading-indicator');
    const noResultsDisplay = document.getElementById('no-results');
    const errorDisplay = document.getElementById('error-display');
    const resultsCountSpan = document.getElementById('results-count');

    let allFetchedTournaments = [];
    const genreFilterRadios = document.querySelectorAll('input[name="genreFilter"]');
    const categoryFilterRadios = document.querySelectorAll('input[name="categoryFilter"]');

    function toProperCase(str) {
        if (!str) return '';
        return str.toLowerCase().replace(/(^|\s|-)\S/g, char => char.toUpperCase());
    }

    function extractHighestTournamentCategory(tournamentName) {
        if (!tournamentName) return 'N/A';
        let highestCategory = 'N/A';
        const allCategoryMatches = tournamentName.match(/P(?:2000|1500|1000|500|250|100|50|25)(?: Open| Dames| Messieurs| Mixte)?/g);

        if (allCategoryMatches && allCategoryMatches.length > 0) {
            const numericValues = allCategoryMatches.map(matchStr => {
                const cleanedMatch = matchStr.replace(/ (Open|Dames|Messieurs|Mixte)$/, '').trim();
                return parseInt(cleanedMatch.substring(1));
            });
            
            let maxPValue = -1;
            for (const val of numericValues) {
                if (!isNaN(val) && val > maxPValue) {
                    maxPValue = val;
                }
            }

            if (maxPValue !== -1) {
                highestCategory = `P${maxPValue}`;
            }
        }
        return highestCategory;
    }

    function displayTournaments(tournamentsToDisplay) {
        resultsContainer.innerHTML = ''; 
    
        tournamentsToDisplay.forEach(tournament => {
            const colDiv = document.createElement('div');
            colDiv.className = 'col-12 col-md-6 col-lg-4 mb-4';
    
            const nameComponent = tournament.name;
            const clubNameFormatted = toProperCase(tournament.clubName || 'Club non spécifié');
            const cityNameFormatted = toProperCase(tournament.installation.ville || 'Ville non disponible');
    
            let categoryBootstrapClasses = 'badge';
            let categorySpecificStyle = '';
            const category = extractHighestTournamentCategory(tournament.name);
    
            if (category === 'P25') {
                categorySpecificStyle = 'background-color: #C6FF00; color: #000000;';
            } else if (category === 'P50') {
                categorySpecificStyle = 'background-color: #FFB74D; color: #000000;';
            } else if (category === 'P100') {
                categorySpecificStyle = 'background-color: #FFC107; color: #000000;'; 
            } else if (category === 'P250') {
                categorySpecificStyle = 'background-color: #4DB6AC; color: #000000;';
            } else if (category === 'P500') {
                categorySpecificStyle = 'background-color: #F06292; color: #000000;';
            } else if (category === 'P1000') {
                categorySpecificStyle = 'background-color: #BA68C8; color: #000000;';
            } else if (category === 'P1500') {
                categorySpecificStyle = 'background-color: #9E9E9E; color: #FFFFFF;';
            } else if (category === 'P2000') {
                categorySpecificStyle = 'background-color: #673AB7; color: #FFFFFF;'; 
            } else {
                categoryBootstrapClasses += ' bg-secondary'; 
            }
            const categoryBadge = category !== 'N/A' ? `<span class="${categoryBootstrapClasses} tournament-category-badge" style="${categorySpecificStyle}">${category}</span>` : '<span class="badge tournament-category-badge bg-secondary">N/A</span>';
    
            let genderText = '';
            if (tournament.epreuve && tournament.epreuve.natureEpreuve && tournament.epreuve.natureEpreuve.libelle) {
                const libelleLower = tournament.epreuve.natureEpreuve.libelle.toLowerCase();
                if (libelleLower.includes('double messieurs')) genderText = 'Hommes';
                else if (libelleLower.includes('double dames')) genderText = 'Femmes';
                else if (libelleLower.includes('double mixte')) genderText = 'Mixte';
            }
            if (!genderText && tournament.name) { 
                const nameLower = tournament.name.toLowerCase();
                if (nameLower.includes('dames') || nameLower.includes('féminin')) genderText = 'Femmes';
                else if (nameLower.includes('messieurs') || nameLower.includes('masculin')) genderText = 'Hommes';
                else if (nameLower.includes('mixte')) genderText = 'Mixte';
            }
    
            let distanceDisplayHtml = '';
            if (typeof tournament.distance === 'number') {
                const distanceInKm = tournament.distance / 1000;
                distanceDisplayHtml = `
                    <span class="tournament-distance" style="color: #C6FF00;">
                        <i class="bi bi-geo-alt-fill"></i> ${distanceInKm.toFixed(1)} km
                    </span>`;
            }
    
            const cardHTML = `
                <div class="card tournament-card bg-dark text-white h-100">
                    <div class="card-body d-flex flex-column">
                        <div class="tournament-content">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <h5 class="card-title tournament-title mb-0">${nameComponent}</h5>
                                ${categoryBadge}
                            </div>
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <p class="mb-0 tournament-club">${clubNameFormatted}</p>
                                ${genderText ? `<span class="tournament-gender">${genderText}</span>` : ''}
                            </div>
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <p class="mb-0 text-muted tournament-city">${cityNameFormatted}</p>
                                ${distanceDisplayHtml}
                            </div>
                        </div>
                        <hr class="my-2">
                        <div class="tournament-footer mt-auto d-flex justify-content-between align-items-center">
                            <a href="tournament-details.html?id=${tournament.id}&source=${tournament.source}" class="btn btn-sm btn-custom-lime">Plus d'infos</a>
                            <span class="tournament-date-badge text-custom-lime">${new Date(tournament.dateDebut).toLocaleDateString('fr-FR')}</span>
                        </div>
                    </div>
                </div>
            `;
            colDiv.innerHTML = cardHTML;
            resultsContainer.appendChild(colDiv);
        });
    }

    function applyFiltersAndDisplay() {
        const selectedGenres = Array.from(document.querySelectorAll('input[name="genreFilter"]:checked')).map(input => input.value);
        const selectedCategories = Array.from(document.querySelectorAll('input[name="categoryFilter"]:checked')).map(input => input.value);
        
        let filteredTournaments = [...allFetchedTournaments];
        
        // Si des genres sont sélectionnés, filtrer par ces genres
        if (selectedGenres.length > 0) {
            filteredTournaments = filteredTournaments.filter(tournament => {
                let genre = 'N/A';
                if (tournament.epreuve && tournament.epreuve.natureEpreuve && tournament.epreuve.natureEpreuve.libelle) {
                    const libelleLower = tournament.epreuve.natureEpreuve.libelle.toLowerCase();
                    if (libelleLower.includes('double messieurs')) genre = 'Hommes';
                    else if (libelleLower.includes('double dames')) genre = 'Femmes';
                    else if (libelleLower.includes('double mixte')) genre = 'Mixte';
                }
                if (genre === 'N/A' && tournament.name) { 
                    const nameLower = tournament.name.toLowerCase();
                    if (nameLower.includes('dames') || nameLower.includes('féminin')) genre = 'Femmes';
                    else if (nameLower.includes('messieurs') || nameLower.includes('masculin')) genre = 'Hommes';
                    else if (nameLower.includes('mixte')) genre = 'Mixte';
                }
                return selectedGenres.includes(genre);
            });
        }

        if (selectedCategories.length > 0) {
            filteredTournaments = filteredTournaments.filter(tournament => {
                const tournamentCategory = extractHighestTournamentCategory(tournament.name);
                return selectedCategories.includes(tournamentCategory);
            });
        }
        
        displayTournaments(filteredTournaments);
        resultsCountSpan.textContent = filteredTournaments.length;

        if (filteredTournaments.length === 0 && allFetchedTournaments.length > 0) {
            noResultsDisplay.innerHTML = '<p class="text-center text-white">Aucun tournoi ne correspond à vos critères de filtre.</p>';
            noResultsDisplay.style.display = 'block';
        } else if (filteredTournaments.length > 0) {
            noResultsDisplay.style.display = 'none';
        } else if (allFetchedTournaments.length === 0 && filteredTournaments.length === 0) {
            // This case is handled by the initial fetch logic
        }
    }

    const params = new URLSearchParams(window.location.search);
    const cityForDisplay = params.get('city') || 'Position actuelle'; // Pour l'affichage utilisateur
    const radiusForDisplay = params.get('radius');
    const dateDebutParam = params.get('dateDebut') || params.get('startDate'); // Accepter startDate/endDate aussi
    const dateFinParam = params.get('dateFin') || params.get('endDate');
    const latParam = params.get('latitude') || params.get('lat'); 
    const lonParam = params.get('longitude') || params.get('lng'); 
    const cityParam = params.get('city');

    let validSearch = true;
    let errorMessage = '';
    const apiPayload = {}; // Initialiser apiPayload ici

    // Validation des coordonnées (obligatoires)
    if (latParam && lonParam) {
        const lat = parseFloat(latParam);
        const lon = parseFloat(lonParam);
        if (!isNaN(lat) && !isNaN(lon)) {
            apiPayload.coordinates = { lat: lat, lng: lon };
        } else {
            validSearch = false;
            errorMessage = 'Les coordonnées GPS (latitude, longitude) fournies ne sont pas valides.';
        }
    } else {
        validSearch = false;
        errorMessage = 'Coordonnées GPS (latitude et longitude) sont obligatoires pour la recherche.';
    }

    // Valider la ville
    if (!cityParam || cityParam.trim() === "" || cityParam.toLowerCase() === "n/a") {
        validSearch = false;
        errorMessage = errorMessage || 'La ville est un paramètre obligatoire pour la recherche.'; // Conserver le premier message d'erreur
    } else {
        apiPayload.city = cityParam;
    }

    // Mise à jour du résumé de la recherche text
    // Utiliser cityForDisplay qui prend en compte 'Position actuelle' si cityParam est vide pour l'affichage.
    let summaryText = `Recherche pour : ${cityForDisplay} dans un rayon de ${radiusForDisplay || 'N/A'} km`;
    // La partie date du résumé sera ajoutée après la validation des dates

    // Validation des dates (obligatoires pour l'API)
    const startDateParam = dateDebutParam;
    const endDateParam = dateFinParam;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!startDateParam || !endDateParam || !dateRegex.test(startDateParam) || !dateRegex.test(endDateParam)) {
        validSearch = false;
        errorMessage = errorMessage || 'Les dates de début et de fin sont obligatoires et doivent être au format YYYY-MM-DD.'; // Conserver le premier message d'erreur s'il existe
    } else {
        apiPayload.dateDebut = startDateParam;
        apiPayload.dateFin = endDateParam;
    }
    // Dates fournies (ou N/A) - Nous ne les affichons plus dans un résumé
    // mais nous les gardons pour référence
    summaryText += `, du ${startDateParam || 'N/A'} au ${endDateParam || 'N/A'}.`;

    // Le rayon est optionnel pour l'API, mais on l'ajoute s'il est présent
    if (validSearch && radiusForDisplay) {
        apiPayload.radius = radiusForDisplay;
    }

    if (!validSearch) {
        errorDisplay.textContent = errorMessage;
        errorDisplay.style.display = 'block';
        loadingIndicator.style.display = 'none';
        resultsContainer.innerHTML = '';
        allFetchedTournaments = [];
        resultsCountSpan.textContent = 0;
        // Pas besoin d'appeler applyFiltersAndDisplay ici si la recherche initiale est invalide, car il n'y a rien à filtrer.
        // S'assurer que noResultsDisplay est géré si nécessaire, ou que errorDisplay suffit.
        noResultsDisplay.innerHTML = `<p class="text-center text-white">${errorMessage}</p>`;
        noResultsDisplay.style.display = 'block';
        return; // Arrêter l'exécution si la recherche n'est pas valide
    }

    // Si la recherche est valide, préparer l'affichage pour le chargement
    noResultsDisplay.style.display = 'none';
    errorDisplay.style.display = 'none';
    resultsContainer.innerHTML = ''; 
    loadingIndicator.style.display = 'block';

    window.apiProxy.post('tournois/search', apiPayload)
        .then(result => {
            if (!result || !result.ok) {
                const statusText = result ? result.statusText : 'Réponse invalide du serveur';
                const status = result ? result.status : 'N/A';
                throw new Error(`Erreur HTTP: ${status} - ${statusText}`);
            }
            return result.data;
        })
        .then(backendResult => {
            loadingIndicator.style.display = 'none';
            if (backendResult && backendResult.success && backendResult.data && backendResult.data.length > 0) {
                allFetchedTournaments = backendResult.data;
                applyFiltersAndDisplay(); 
            } else {
                resultsCountSpan.textContent = 0;
                const message = backendResult && backendResult.message ? backendResult.message : 'Aucun tournoi trouvé pour ces critères de recherche.';
                noResultsDisplay.innerHTML = `<p class="text-center text-white">${message}</p>`;
                noResultsDisplay.style.display = 'block';
                resultsContainer.innerHTML = '';
                allFetchedTournaments = [];
                applyFiltersAndDisplay();
            }
        })
        .catch(error => {
            console.error('Erreur détaillée lors de la récupération des tournois:', error);
            loadingIndicator.style.display = 'none';
            errorDisplay.textContent = `Erreur lors de la récupération des tournois. ${error.message ? error.message : 'Veuillez réessayer.'}`;
            errorDisplay.style.display = 'block';
            resultsContainer.innerHTML = '';
            allFetchedTournaments = [];
            applyFiltersAndDisplay();
        });

    genreFilterRadios.forEach(radio => radio.addEventListener('change', applyFiltersAndDisplay));
    categoryFilterRadios.forEach(radio => radio.addEventListener('change', applyFiltersAndDisplay));

});
