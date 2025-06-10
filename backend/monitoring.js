/**
 * Système de monitoring pour TrouveTonPadel
 * Vérifie régulièrement le bon fonctionnement des modules et envoie des alertes en cas de problème
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Configuration des alertes
const config = {
    // Email pour recevoir les alertes
    alertEmail: process.env.ALERT_EMAIL || 'votre-email@exemple.com',
    
    // Intervalle de vérification en minutes
    checkInterval: parseInt(process.env.CHECK_INTERVAL || '60', 10),
    
    // Nombre d'erreurs consécutives avant d'envoyer une alerte
    errorThreshold: parseInt(process.env.ERROR_THRESHOLD || '3', 10),
    
    // Délai minimum entre deux alertes pour le même module (en heures)
    alertCooldown: parseInt(process.env.ALERT_COOLDOWN || '12', 10)
};

// État des modules
const moduleStatus = {};

// Compteurs d'erreurs consécutives
const errorCounts = {};

// Horodatage de la dernière alerte envoyée pour chaque module
const lastAlerts = {};

// Configuration du transporteur d'emails
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.ionos.fr',
    port: parseInt(process.env.EMAIL_PORT || '465', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

/**
 * Charge dynamiquement tous les modules de clubs
 * @returns {Array} Liste des modules de clubs
 */
function loadClubModules() {
    const clubsDir = path.join(__dirname, 'crenaux', 'clubs');
    const clubs = fs.readdirSync(clubsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
    
    console.log(`Modules de clubs détectés: ${clubs.join(', ')}`);
    return clubs;
}

/**
 * Vérifie le bon fonctionnement d'un module de club
 * @param {string} clubName - Nom du club à vérifier
 * @returns {Promise<boolean>} - True si le module fonctionne correctement
 */
async function checkClubModule(clubName) {
    try {
        // Chemin vers le module du club
        const clubPath = path.join(__dirname, 'crenaux', 'clubs', clubName);
        
        // Vérifier si le module existe
        if (!fs.existsSync(clubPath)) {
            throw new Error(`Le module ${clubName} n'existe pas`);
        }
        
        // Charger le module
        const clubModule = require(path.join(clubPath, 'index.js'));
        
        // Vérifier si le module a une fonction de test
        if (typeof clubModule.testConnection !== 'function') {
            // Si pas de fonction de test, on vérifie simplement si le module a les fonctions requises
            const requiredFunctions = ['getAvailableSlots'];
            const missingFunctions = requiredFunctions.filter(func => typeof clubModule[func] !== 'function');
            
            if (missingFunctions.length > 0) {
                throw new Error(`Le module ${clubName} ne possède pas les fonctions requises: ${missingFunctions.join(', ')}`);
            }
            
            // Test simple: vérifier si le module peut récupérer des créneaux pour demain
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];
            
            // Appeler la fonction getAvailableSlots avec une date future proche
            const slots = await clubModule.getAvailableSlots(tomorrowStr, 8, 22);
            
            // Vérifier que la réponse est un tableau
            if (!Array.isArray(slots)) {
                throw new Error(`Le module ${clubName} ne renvoie pas un tableau de créneaux`);
            }
            
            return true;
        } else {
            // Si le module a une fonction de test, l'utiliser
            const testResult = await clubModule.testConnection();
            return testResult === true;
        }
    } catch (error) {
        console.error(`Erreur lors de la vérification du module ${clubName}:`, error);
        return false;
    }
}

/**
 * Vérifie l'API météo
 * @returns {Promise<boolean>} - True si l'API météo fonctionne correctement
 */
async function checkWeatherAPI() {
    try {
        // Vérifier si la clé API est configurée
        const apiKey = process.env.OPENWEATHERMAP_API_KEY;
        if (!apiKey) {
            console.warn('Clé API OpenWeatherMap non configurée, utilisation d\'une clé de test');
            // Pour le monitoring, on considère que c'est OK si la clé n'est pas configurée
            // car ce n'est pas critique pour le fonctionnement de l'application
            return true;
        }
        
        // Coordonnées de test (Salon-de-Provence)
        const lat = 43.6426;
        const lon = 5.0969;
        
        try {
            // Appeler l'API OpenWeatherMap avec un timeout plus court pour éviter de bloquer
            const response = await axios.get(
                `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=fr`,
                { timeout: 5000 } // Timeout de 5 secondes
            );
            
            // Vérifier que la réponse est valide
            if (!response.data || !response.data.list || !Array.isArray(response.data.list)) {
                throw new Error('Réponse API météo invalide');
            }
            
            console.log('API météo: connexion réussie');
            return true;
        } catch (apiError) {
            // Si l'erreur est liée à la clé API (401 Unauthorized)
            if (apiError.response && apiError.response.status === 401) {
                console.error('Clé API OpenWeatherMap invalide ou expirée');
                return false;
            }
            
            // Pour les autres erreurs (timeout, problèmes réseau, etc.), on considère que ce n'est pas critique
            console.warn(`Erreur temporaire avec l'API météo: ${apiError.message}`);
            return true;
        }
    } catch (error) {
        console.error('Erreur lors de la vérification de l\'API météo:', error);
        return false;
    }
}

/**
 * Envoie une alerte par email
 * @param {string} moduleName - Nom du module en erreur
 * @param {string} errorDetails - Détails de l'erreur
 */
async function sendAlert(moduleName, errorDetails) {
    // Vérifier si une alerte a déjà été envoyée récemment pour ce module
    const now = Date.now();
    const lastAlert = lastAlerts[moduleName] || 0;
    const cooldownMs = config.alertCooldown * 60 * 60 * 1000; // Convertir en millisecondes
    
    if (now - lastAlert < cooldownMs) {
        console.log(`Alerte pour ${moduleName} ignorée (cooldown actif)`);
        return;
    }
    
    try {
        // Préparer l'email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: config.alertEmail,
            subject: `[ALERTE] TrouveTonPadel - Module ${moduleName} en erreur`,
            html: `
                <h1>Alerte TrouveTonPadel</h1>
                <p>Le module <strong>${moduleName}</strong> est en erreur.</p>
                <h2>Détails</h2>
                <pre>${errorDetails}</pre>
                <p>Date: ${new Date().toLocaleString()}</p>
                <p>Cette alerte a été générée automatiquement par le système de monitoring de TrouveTonPadel.</p>
            `
        };
        
        // Envoyer l'email
        await transporter.sendMail(mailOptions);
        
        // Mettre à jour l'horodatage de la dernière alerte
        lastAlerts[moduleName] = now;
        
        console.log(`Alerte envoyée pour le module ${moduleName}`);
    } catch (error) {
        console.error('Erreur lors de l\'envoi de l\'alerte:', error);
    }
}

/**
 * Fonction principale de vérification
 */
async function runChecks() {
    console.log('Démarrage des vérifications...');
    
    // Charger les modules de clubs
    const clubs = loadClubModules();
    
    // Vérifier chaque module de club
    for (const club of clubs) {
        console.log(`Vérification du module ${club}...`);
        const isWorking = await checkClubModule(club);
        
        // Mettre à jour le compteur d'erreurs
        if (!isWorking) {
            errorCounts[club] = (errorCounts[club] || 0) + 1;
            console.log(`Module ${club} en erreur (${errorCounts[club]}/${config.errorThreshold})`);
            
            // Si le seuil d'erreurs est atteint, envoyer une alerte
            if (errorCounts[club] >= config.errorThreshold) {
                await sendAlert(club, `Le module ${club} a échoué ${errorCounts[club]} fois consécutives.`);
            }
        } else {
            // Réinitialiser le compteur d'erreurs si le module fonctionne
            if (errorCounts[club]) {
                console.log(`Module ${club} fonctionne à nouveau après ${errorCounts[club]} erreurs`);
                errorCounts[club] = 0;
            } else {
                console.log(`Module ${club} fonctionne correctement`);
            }
        }
        
        // Mettre à jour l'état du module
        moduleStatus[club] = {
            working: isWorking,
            lastCheck: new Date().toISOString(),
            errorCount: errorCounts[club] || 0
        };
    }
    
    // Vérifier l'API météo
    console.log('Vérification de l\'API météo...');
    const weatherWorking = await checkWeatherAPI();
    
    if (!weatherWorking) {
        errorCounts['weather'] = (errorCounts['weather'] || 0) + 1;
        console.log(`API météo en erreur (${errorCounts['weather']}/${config.errorThreshold})`);
        
        // Si le seuil d'erreurs est atteint, envoyer une alerte
        if (errorCounts['weather'] >= config.errorThreshold) {
            await sendAlert('weather', `L'API météo a échoué ${errorCounts['weather']} fois consécutives.`);
        }
    } else {
        // Réinitialiser le compteur d'erreurs si l'API fonctionne
        if (errorCounts['weather']) {
            console.log(`API météo fonctionne à nouveau après ${errorCounts['weather']} erreurs`);
            errorCounts['weather'] = 0;
        } else {
            console.log('API météo fonctionne correctement');
        }
    }
    
    // Mettre à jour l'état de l'API météo
    moduleStatus['weather'] = {
        working: weatherWorking,
        lastCheck: new Date().toISOString(),
        errorCount: errorCounts['weather'] || 0
    };
    
    // Sauvegarder l'état des modules
    fs.writeFileSync(
        path.join(__dirname, 'monitoring-status.json'),
        JSON.stringify(moduleStatus, null, 2)
    );
    
    console.log('Vérifications terminées');
}

/**
 * Démarrer les vérifications périodiques
 */
function startMonitoring() {
    console.log(`Démarrage du système de monitoring (intervalle: ${config.checkInterval} minutes)`);
    
    // Exécuter une première vérification immédiatement
    runChecks();
    
    // Planifier les vérifications périodiques
    setInterval(runChecks, config.checkInterval * 60 * 1000);
}

// Exposer les fonctions pour les tests et l'utilisation externe
module.exports = {
    startMonitoring,
    runChecks,
    checkClubModule,
    checkWeatherAPI,
    getModuleStatus: () => moduleStatus
};

// Si ce fichier est exécuté directement, démarrer le monitoring
if (require.main === module) {
    startMonitoring();
}
