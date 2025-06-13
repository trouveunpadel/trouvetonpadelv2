document.addEventListener('DOMContentLoaded', () => {
    const cityInput = document.getElementById('city');
    const cityInputContainer = document.getElementById('city-input-container');
    let suggestionsContainer = document.getElementById('city-suggestions');

    if (cityInput && cityInputContainer) {
        // Créer le conteneur pour les suggestions s'il n'existe pas
        if (!suggestionsContainer) {
            suggestionsContainer = document.createElement('div');
            suggestionsContainer.id = 'city-suggestions';
            suggestionsContainer.classList.add('list-group', 'position-absolute', 'w-100');
            suggestionsContainer.style.zIndex = '1000';
            cityInputContainer.appendChild(suggestionsContainer);
        }

        // Créer les champs cachés pour la latitude et la longitude
        let latitudeInput = document.getElementById('latitude');
        if (!latitudeInput) {
            latitudeInput = document.createElement('input');
            latitudeInput.type = 'hidden';
            latitudeInput.id = 'latitude';
            latitudeInput.name = 'latitude';
            cityInputContainer.appendChild(latitudeInput);
        }

        let longitudeInput = document.getElementById('longitude');
        if (!longitudeInput) {
            longitudeInput = document.createElement('input');
            longitudeInput.type = 'hidden';
            longitudeInput.id = 'longitude';
            longitudeInput.name = 'longitude';
            cityInputContainer.appendChild(longitudeInput);
        }

        cityInput.addEventListener('input', async () => {
            const query = cityInput.value;

            if (query.length < 2) {
                suggestionsContainer.innerHTML = '';
                return;
            }

            try {
                const response = await fetch(`https://geo.api.gouv.fr/communes?nom=${query}&fields=nom,centre,codesPostaux&boost=population&limit=5`);
                const cities = await response.json();

                suggestionsContainer.innerHTML = '';
                cities.forEach(city => {
                    const suggestionItem = document.createElement('a');
                    suggestionItem.href = '#';
                    suggestionItem.classList.add('list-group-item', 'list-group-item-action');
                    suggestionItem.textContent = `${city.nom} (${city.codesPostaux[0]})`;
                    suggestionItem.addEventListener('click', (e) => {
                        e.preventDefault();
                        cityInput.value = city.nom;
                        latitudeInput.value = city.centre.coordinates[1];
                        longitudeInput.value = city.centre.coordinates[0];
                        suggestionsContainer.innerHTML = '';
                    });
                    suggestionsContainer.appendChild(suggestionItem);
                });
            } catch (error) {
                console.error('Erreur lors de la récupération des villes:', error);
            }
        });

        // Cacher les suggestions si on clique en dehors
        document.addEventListener('click', (e) => {
            if (e.target.id !== 'city') {
                suggestionsContainer.innerHTML = '';
            }
        });
    }
});
