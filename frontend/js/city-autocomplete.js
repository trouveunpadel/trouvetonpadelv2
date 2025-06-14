document.addEventListener('DOMContentLoaded', () => {

    const setupCityAutocomplete = (inputId, containerId) => {
        const cityInput = document.getElementById(inputId);
        const cityInputContainer = document.getElementById(containerId);

        if (!cityInput || !cityInputContainer) {
            console.warn(`Autocomplete setup skipped: elements not found for ${inputId}`);
            return;
        }

        // Créer le conteneur pour les suggestions
        const suggestionsContainer = document.createElement('div');
        suggestionsContainer.id = `${inputId}-suggestions`;
        suggestionsContainer.classList.add('list-group', 'position-absolute', 'w-100');
        suggestionsContainer.style.zIndex = '1000';
        // Insérer le conteneur après l'input pour un meilleur positionnement
        cityInput.parentNode.insertBefore(suggestionsContainer, cityInput.nextSibling);

        cityInput.addEventListener('input', async () => {
            const query = cityInput.value;

            if (query.length < 2) {
                suggestionsContainer.innerHTML = '';
                return;
            }

            try {
                // Utilisation de l'API officielle du gouvernement français pour les données géographiques
                const response = await fetch(`https://geo.api.gouv.fr/communes?nom=${query}&fields=nom,centre,codesPostaux&boost=population&limit=5`);
                if (!response.ok) {
                    throw new Error(`API error: ${response.status}`);
                }
                const cities = await response.json();

                suggestionsContainer.innerHTML = '';
                cities.forEach(city => {
                    const suggestionItem = document.createElement('a');
                    suggestionItem.href = '#';
                    suggestionItem.classList.add('list-group-item', 'list-group-item-action', 'p-2');
                    suggestionItem.textContent = `${city.nom} (${city.codesPostaux[0]})`;
                    
                    suggestionItem.addEventListener('click', (e) => {
                        e.preventDefault();
                        cityInput.value = city.nom;
                        suggestionsContainer.innerHTML = '';
                        // La logique de soumission dans location-services.js se chargera de géocoder ce nom de ville.
                    });
                    suggestionsContainer.appendChild(suggestionItem);
                });
            } catch (error) {
                console.error('Erreur lors de la récupération des suggestions de villes:', error);
            }
        });

        // Cacher les suggestions si on clique en dehors
        document.addEventListener('click', (e) => {
            if (e.target.id !== inputId && !suggestionsContainer.contains(e.target)) {
                suggestionsContainer.innerHTML = '';
            }
        });
    };

    // --- Initialisation pour les deux formulaires ---
    
    // Pour la recherche de créneaux
    setupCityAutocomplete('city', 'city-input-container');

    // Pour la recherche de tournois
    setupCityAutocomplete('tournament-city', 'tournament-city-input-container');
});
