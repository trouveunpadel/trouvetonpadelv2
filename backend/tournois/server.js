const express = require('express');
const router = express.Router();
const TournoisSearch = require('./search');


// Route de test GET pour vérifier que le routeur est bien monté
router.get('/test', (req, res) => {
    res.status(200).json({ success: true, message: 'Le routeur des tournois fonctionne !' });
});

// Route POST pour la recherche de tournois (version propre)
router.post('/search', async (req, res) => {
    try {
        const { city, dateDebut, dateFin, radius = 30, level = 'all', coordinates } = req.body;

        if (!city || !dateDebut || !dateFin || !coordinates || !coordinates.lat || !coordinates.lng) {
            return res.status(400).json({ success: false, error: 'Paramètres manquants ou invalides.' });
        }

        // On garde les logs pour le débogage
        console.log('[Tournois Search] Requête reçue pour:', city);
        console.log('[Tournois Search] Body complet reçu:', JSON.stringify(req.body, null, 2));
        const searchParams = { city, dateDebut, dateFin, radius, level, coordinates };
        console.log('[Tournois Search] Paramètres passés à la recherche:', JSON.stringify(searchParams, null, 2));

        // Appel direct à la recherche sans cache
        const tournoisSearch = new TournoisSearch();
        const tournaments = await tournoisSearch.searchTournaments(searchParams);
        const result = { success: true, data: tournaments, count: tournaments.length, coordinates, timestamp: new Date().toISOString() };
        
        console.log(`Recherche effectuée pour ${city} - ${tournaments.length} résultats trouvés`);

        res.json(result);

    } catch (error) {
        console.error('Erreur recherche tournois:', error);
        res.status(500).json({ success: false, error: 'Erreur lors de la recherche des tournois.' });
    }
});

module.exports = router;
