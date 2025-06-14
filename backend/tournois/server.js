const express = require('express');
const cors = require('cors');
const path = require('path');
const tournoisSearch = require('./search');

const app = express();
const PORT = process.env.TOURNOIS_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Routes pour les tournois
app.get('/api/status', (req, res) => {
    res.json({
        status: 'OK',
        service: 'TrouveTonPadel - Service Tournois',
        timestamp: new Date().toISOString(),
        port: PORT
    });
});

// Route principale de recherche de tournois
app.post('/api/search', async (req, res) => {
    try {
        const { city, date, radius = 30, level = 'all', coordinates } = req.body;
        
        console.log('Recherche de tournois FFT:', { city, date, radius, level, coordinates });
        
        if (!city || !date) {
            return res.status(400).json({
                error: 'Paramètres manquants',
                message: 'La ville et la date sont obligatoires'
            });
        }

        // Obtenir les coordonnées si pas fournies
        let coords = coordinates;
        if (!coords) {
            coords = await tournoisSearch.getCoordinates(city);
        }

        const results = await tournoisSearch.searchTournaments({
            city,
            date,
            radius,
            level,
            coordinates: coords
        });

        res.json({
            success: true,
            data: results,
            count: results.length,
            coordinates: coords,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Erreur lors de la recherche de tournois:', error);
        res.status(500).json({
            error: 'Erreur serveur',
            message: error.message
        });
    }
});

// Route pour obtenir les niveaux disponibles
app.get('/api/levels', (req, res) => {
    res.json({
        levels: [
            { id: 'all', name: 'Tous niveaux' },
            { id: 'debutant', name: 'Débutant' },
            { id: 'intermediaire', name: 'Intermédiaire' },
            { id: 'avance', name: 'Avancé' },
            { id: 'expert', name: 'Expert' }
        ]
    });
});

// Route pour tester les coordonnées d'une ville
app.get('/api/coordinates/:city', async (req, res) => {
    try {
        const { city } = req.params;
        const coordinates = await tournoisSearch.getCoordinates(city);
        res.json({
            success: true,
            city,
            coordinates
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des coordonnées:', error);
        res.status(500).json({
            error: 'Erreur serveur',
            message: error.message
        });
    }
});

// Gestion des erreurs 404
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route non trouvée',
        message: `La route ${req.originalUrl} n'existe pas`
    });
});

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`🏆 Serveur Tournois TrouveTonPadel démarré sur le port ${PORT}`);
    console.log(`📍 API disponible sur http://localhost:${PORT}/api/status`);
    console.log(`🔍 Recherche disponible sur http://localhost:${PORT}/api/search`);
});

module.exports = app;
