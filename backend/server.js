/**
 * Serveur API pour TrouveTonPadel
 * Permet de rechercher des créneaux disponibles dans les clubs de padel
 */

const express = require('express');
const cors = require('cors');
// Charger les variables d'environnement avant d'importer les modules
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
// Importer les modules de routes
const crenauxRoutes = require('./crenaux/server');
const tournoisRoutes = require('./tournois/server'); // Importer le routeur des tournois

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware avec configuration CORS détaillée
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Accepter toutes les origines localhost et 127.0.0.1 sur n'importe quel port
  if (origin && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Gestion spécifique des requêtes OPTIONS (préflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Middleware pour parser le JSON
app.use(express.json());

// Middleware pour déboguer les requêtes
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Servir les fichiers statiques du frontend
const path = require('path');
app.use(express.static(path.join(__dirname, '../frontend')));

// Route par défaut pour servir index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Route pour tester si le serveur est en ligne
app.get('/api/status', (req, res) => {
  res.json({ status: 'online', version: '1.0.0' });
});

// Route de proxy pour le géocodage afin d'éviter les problèmes de CORS
app.get('/api/geocode', async (req, res) => {
    const city = req.query.city;
    if (!city) {
        return res.status(400).json({ error: 'Le paramètre city est manquant.' });
    }

    try {
        // Dynamically import axios
        const axios = (await import('axios')).default;
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}, France&limit=1`;
        
        console.log(`[Geocode Proxy] Appel de l'API Nominatim pour: ${city}`);
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'TrouveTonPadel/1.0 (https://github.com/votre-repo)' // L'API Nominatim requiert un User-Agent
            }
        });

        res.json(response.data);

    } catch (error) {
        console.error("[Geocode Proxy] Erreur lors de l'appel à l'API Nominatim:", error.message);
        res.status(500).json({ error: 'Erreur lors de la communication avec le service de géocodage.' });
    }
});

// Utiliser les routeurs pour les chemins d'API spécifiques
app.use('/api/creneaux', crenauxRoutes);
app.use('/api/tournois', tournoisRoutes);


// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Serveur TrouveTonPadel démarré sur le port ${PORT}`);
  console.log(`API disponible sur http://localhost:${PORT}/api/status`);
});
