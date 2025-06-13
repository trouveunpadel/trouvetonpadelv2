/**
 * Serveur API pour TrouveTonPadel
 * Permet de rechercher des créneaux disponibles dans les clubs de padel
 */

const express = require('express');
const cors = require('cors');
// Charger les variables d'environnement avant d'importer les modules
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
// Importer le module de créneaux
const crenauxRoutes = require('./crenaux/server');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware avec configuration CORS détaillée
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
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

// Utiliser le module de créneaux pour toutes les routes /api
app.use('/api', crenauxRoutes);

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Serveur TrouveTonPadel démarré sur le port ${PORT}`);
  console.log(`API disponible sur http://localhost:${PORT}/api/status`);
});
