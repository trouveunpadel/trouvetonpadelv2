const express = require('express');
const cors = require('cors');
const tournoisSearch = require('./search');
const SearchCache = require('./search-cache');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialiser le cache de recherche
const searchCache = new SearchCache();

// Logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Routes API

// Status de l'API
app.get('/api/status', (req, res) => {
    const cacheStats = searchCache.getStats();
    
    res.json({
        status: 'active',
        service: 'TrouveTonPadel - API Tournois FFT',
        version: '2.0.0',
        cache: {
            type: 'search-cache',
            timeoutMinutes: cacheStats.cacheTimeoutMinutes,
            entries: cacheStats.validEntries,
            expired: cacheStats.expiredEntries
        },
        timestamp: new Date().toISOString()
    });
});

// Rechercher des tournois
app.post('/api/search', async (req, res) => {
    try {
        const { city, dateDebut, dateFin, radius = 30, level = 'all', coordinates } = req.body;
        
        // Validation des paramètres obligatoires
        if (!city || !dateDebut || !dateFin) {
            return res.status(400).json({
                success: false,
                error: 'Les paramètres city, dateDebut et dateFin sont obligatoires'
            });
        }

        // Validation des coordonnées obligatoires
        if (!coordinates || !coordinates.lat || !coordinates.lng) {
            return res.status(400).json({
                success: false,
                error: 'Les coordonnées (lat, lng) sont obligatoires'
            });
        }

        console.log(` Recherche tournois: ${city}, du ${dateDebut} au ${dateFin}, rayon: ${radius}km, niveau: ${level}`);
        console.log(` Coordonnées fournies: ${coordinates.lat}, ${coordinates.lng}`);
        
        // Générer la clé de cache
        const cacheKey = searchCache.generateCacheKey({ city, dateDebut, dateFin, radius, level, coordinates });
        
        // Vérifier le cache
        const cachedResult = searchCache.get(cacheKey);
        if (cachedResult) {
            console.log(' Résultat trouvé en cache');
            return res.json({
                success: true,
                data: cachedResult.data,
                count: cachedResult.count,
                coordinates: cachedResult.coordinates,
                fromCache: true,
                timestamp: new Date().toISOString()
            });
        }

        // Recherche via l'API FFT
        const tournaments = await tournoisSearch.searchTournaments({
            city,
            dateDebut,
            dateFin,
            radius,
            level,
            coordinates
        });

        // Mettre en cache le résultat
        const result = {
            data: tournaments,
            count: tournaments.length,
            coordinates
        };
        
        searchCache.set(cacheKey, result);
        console.log(` Mise en cache - Key: ${cacheKey}, ${city} (${tournaments.length} résultats)`);

        res.json({
            success: true,
            data: tournaments,
            count: tournaments.length,
            coordinates,
            fromCache: false,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error(' Erreur recherche:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la recherche des tournois'
        });
    }
});

// Obtenir le détail d'un tournoi
app.get('/api/tournament/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log(` Récupération détail tournoi: ${id}`);
        
        // Utiliser l'API de détail FFT
        const axios = require('axios');
        
        const headers = {
            'Content-Type': 'application/json',
            'X-APPLICATION-ID': 'tenup-app',
            'x-api-key': 'T4c59ZJboMxW65FIt4W9MhXN4dIKtraD',
            'Accept': 'application/vnd.fft+json;',
            'Accept-Language': 'fr-FR,fr;q=0.9',
            'User-Agent': 'MAT/6263 CFNetwork/3826.500.131 Darwin/24.5.0',
            'Connection': 'keep-alive'
        };
        
        const cookies = 'AWSALB=ZHtwQTUCJgTC3P02Jq4BikHLZQAbrHGjRY70yTfdtc7WAYExZLSh4W/fIE+u7bcEiNFUMpVNzeNUEkeWqNIpNh9+gS+6f1VBVwaxYcOMqiFcGIb8/Drgp20WTV46; AWSALBCORS=ZHtwQTUCJgTC3P02Jq4BikHLZQAbrHGjRY70yTfdtc7WAYExZLSh4W/fIE+u7bcEiNFUMpVNzeNUEkeWqNIpNh9+gS+6f1VBVwaxYcOMqiFcGIb8/Drgp20WTV46; datadome=6tCqhxlhUKo55T7RcjuLjGjflRp_Fg_4Z_IRISFjwOVanCXMR7CJBZOqvPQmfjnzrv~3MLWO5Bi3Cyic2ANK1duzMSooD7JSfiKMFWcnd0ec5TY__RI4Y5G2TEr2Vo20; pa_vid=%22EDD42727-B0EF-49F4-9534-F90B3993AAC1%22';
        
        const response = await axios.get(`https://api.fft.fr/fft/v1/competition/tournoi?id=${id}`, {
            headers: {
                ...headers,
                'Cookie': cookies
            }
        });
        
        if (!response.data) {
            return res.status(404).json({
                error: 'Tournoi non trouvé',
                message: `Aucun tournoi trouvé avec l'ID: ${id}`
            });
        }
        
        res.json({
            success: true,
            data: response.data,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error(' Erreur détail tournoi:', error.message);
        
        if (error.response?.status === 404) {
            return res.status(404).json({
                error: 'Tournoi non trouvé',
                message: `Aucun tournoi trouvé avec l'ID: ${req.params.id}`
            });
        }
        
        res.status(500).json({
            error: 'Erreur serveur',
            message: `Erreur lors de la récupération du détail: ${error.message}`
        });
    }
});

// Statistiques du cache
app.get('/api/cache/stats', (req, res) => {
    try {
        const stats = searchCache.getStats();
        
        res.json({
            success: true,
            stats,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error(' Erreur stats cache:', error.message);
        res.status(500).json({
            error: 'Erreur serveur',
            message: `Erreur lors de la récupération des stats: ${error.message}`
        });
    }
});

// Vider le cache
app.delete('/api/cache', (req, res) => {
    try {
        searchCache.clear();
        
        res.json({
            success: true,
            message: 'Cache vidé avec succès',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error(' Erreur vidage cache:', error.message);
        res.status(500).json({
            error: 'Erreur serveur',
            message: `Erreur lors du vidage du cache: ${error.message}`
        });
    }
});

// Démarrage du serveur
app.listen(port, () => {
    console.log(` Serveur Tournois FFT démarré sur le port ${port}`);
    console.log(` API Status: http://localhost:${port}/api/status`);
    console.log(` API Search: POST http://localhost:${port}/api/search`);
    console.log(` API Detail: GET http://localhost:${port}/api/tournament/:id`);
    console.log(` API Cache Stats: http://localhost:${port}/api/cache/stats`);
});

module.exports = app;
