document.addEventListener('DOMContentLoaded', () => {
    const resultsContainer = document.getElementById('tournament-results-container');
    const loadingIndicator = document.getElementById('loading-indicator');
    const noResultsMessage = document.getElementById('no-results');
    const errorDisplay = document.getElementById('error-display');
    const resultsCountSpan = document.getElementById('results-count');
    const searchSummary = document.getElementById('search-summary');

    const params = new URLSearchParams(window.location.search);
    const searchData = {
        city: params.get('city'),
        dateDebut: params.get('startDate'),
        dateFin: params.get('endDate'),
        radius: parseInt(params.get('radius')),
        coordinates: {
            lat: parseFloat(params.get('lat')),
            lng: parseFloat(params.get('lng'))
        }
    };

    if (!searchData.dateDebut || !searchData.dateFin || !searchData.coordinates.lat) {
        loadingIndicator.style.display = 'none';
        errorDisplay.querySelector('p').textContent = "Les paramètres de recherche sont manquants ou invalides.";
        errorDisplay.style.display = 'block';
        return;
    }

    searchSummary.textContent = `Recherche pour \"${searchData.city}\" dans un rayon de ${searchData.radius} km, du ${searchData.dateDebut} au ${searchData.dateFin}.`;
    loadingIndicator.style.display = 'block';

            window.apiProxy.post('tournois/search', searchData)
    .then(result => {
        if (!result.ok) {
            throw new Error(`Erreur HTTP: ${result.status}`);
        }
        
        const backendResult = result.data;

        loadingIndicator.style.display = 'none';
        if (backendResult.success && backendResult.data.length > 0) {
            resultsCountSpan.textContent = backendResult.data.length;
            displayTournaments(backendResult.data);
        } else {
            resultsCountSpan.textContent = 0;
            noResultsMessage.style.display = 'block';
        }
    })
    .catch(error => {
        console.error('Erreur lors de la récupération des tournois:', error);
        loadingIndicator.style.display = 'none';
        errorDisplay.style.display = 'block';
    });

    function displayTournaments(tournaments) {
        resultsContainer.innerHTML = '';
        tournaments.forEach(tournament => {
            const card = document.createElement('div');
            card.className = 'col-lg-4 col-md-6';
            
            const categoryMatch = tournament.name.match(/P[1-9][0-9]*/g);
            const category = categoryMatch ? categoryMatch[0] : 'N/A';
            let categoryBadgeClass = 'bg-secondary';
            if (category.includes('1000') || category.includes('2000')) {
                categoryBadgeClass = 'bg-danger';
            } else if (category.includes('500')) {
                categoryBadgeClass = 'bg-warning text-dark';
            } else if (category.includes('250') || category.includes('100')) {
                categoryBadgeClass = 'bg-success';
            } else if (category.includes('25')) {
                categoryBadgeClass = 'bg-info text-dark';
            }

            card.innerHTML = `
                <div class="card h-100 tournament-card shadow-sm border-light">
                    <div class="card-body d-flex flex-column">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="card-title mb-0 me-2">${tournament.name}</h5>
                            <span class="badge ${categoryBadgeClass}">${category}</span>
                        </div>
                        <p class="card-subtitle mb-2 text-muted"><i class="bi bi-geo-alt-fill me-2"></i>${tournament.clubName}</p>
                        <p class="card-text small">
                            ${tournament.installation.nom || ''}<br>
                            ${tournament.installation.adresse1 || ''}, ${tournament.installation.codePostal || ''} ${tournament.installation.ville || ''}
                        </p>
                        <div class="mt-auto pt-3">
                            <div class="d-flex justify-content-between align-items-center text-primary small fw-bold">
                                <span><i class="bi bi-calendar-event me-2"></i>${new Date(tournament.dateDebut).toLocaleDateString('fr-FR')}</span>
                                <span><i class="bi bi-flag-fill me-2"></i>${new Date(tournament.dateFin).toLocaleDateString('fr-FR')}</span>
                            </div>
                            <a href="https://tenup.fft.fr/tournoi/${tournament.id.split('_')[2]}/details" target="_blank" class="btn btn-outline-primary w-100 mt-3">Voir sur Ten'Up</a>
                        </div>
                    </div>
                </div>
            `;
            resultsContainer.appendChild(card);
        });
    }
});
