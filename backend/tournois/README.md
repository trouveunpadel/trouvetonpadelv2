# Module Tournois - TrouveTonPadel

Service dédié à la recherche et gestion des tournois de padel.

## 🚀 Démarrage rapide

```bash
# Installation des dépendances
npm install

# Démarrage du serveur
npm start

# Développement avec auto-reload
npm run dev
```

Le serveur démarre par défaut sur le port **3001**.

## 📡 API Endpoints

### Status du service
```
GET /api/status
```
Retourne le statut du service tournois.

### Recherche de tournois
```
POST /api/search
Content-Type: application/json

{
  "city": "Paris",
  "date": "2025-06-15",
  "radius": 30,
  "level": "intermediaire"
}
```

**Paramètres :**
- `city` (obligatoire) : Ville de recherche
- `date` (obligatoire) : Date au format YYYY-MM-DD
- `radius` (optionnel) : Rayon de recherche en km (défaut: 30)
- `level` (optionnel) : Niveau de jeu (défaut: "all")

**Niveaux disponibles :**
- `all` : Tous niveaux
- `debutant` : Débutant
- `intermediaire` : Intermédiaire
- `avance` : Avancé
- `expert` : Expert

### Niveaux disponibles
```
GET /api/levels
```
Retourne la liste des niveaux de jeu disponibles.

### Clubs organisateurs
```
GET /api/clubs
```
Retourne la liste des clubs organisateurs de tournois.

## 🏆 Structure des données de tournoi

```json
{
  "id": "club_timestamp_index",
  "clubId": "monkeypadel",
  "clubName": "Monkey Padel",
  "clubCity": "Paris",
  "clubCoordinates": { "lat": 48.8566, "lng": 2.3522 },
  "name": "Tournoi Open Mixte",
  "date": "2025-06-15",
  "time": "14:00",
  "duration": "3h",
  "level": "intermediaire",
  "levelDisplay": "Intermédiaire",
  "format": "Américain",
  "maxPlayers": 16,
  "currentPlayers": 8,
  "availableSpots": 8,
  "price": 25,
  "currency": "EUR",
  "prizes": ["Trophée", "Balles"],
  "status": "open",
  "registrationUrl": "https://club.com/register/123",
  "description": "Description du tournoi",
  "rules": ["Règle 1", "Règle 2"]
}
```

## 🏗️ Architecture

```
tournois/
├── server.js           # Serveur Express principal
├── search.js           # Logique de recherche de tournois
├── clubs-config.js     # Configuration des clubs
├── package.json        # Dépendances Node.js
└── README.md          # Documentation
```

## 🔧 Configuration

### Variables d'environnement
- `TOURNOIS_PORT` : Port du serveur (défaut: 3001)

### Clubs supportés
- **Padel 4 All** : Club parisien avec tournois réguliers
- **Monkey Padel** : Spécialisé dans les tournois mixtes
- **Country Club Padel** : Tournois haut de gamme

## 🚀 Fonctionnalités

### ✅ Implémenté
- [x] Serveur Express dédié
- [x] API de recherche de tournois
- [x] Configuration des clubs
- [x] Génération de données de test
- [x] Filtrage par niveau et date
- [x] Gestion des erreurs

### 🔄 En cours de développement
- [ ] Scraping réel des sites de clubs
- [ ] Intégration géolocalisation
- [ ] Cache des résultats
- [ ] Notifications de nouveaux tournois

### 📋 À venir
- [ ] Système d'inscription
- [ ] Historique des tournois
- [ ] Statistiques des joueurs
- [ ] API de paiement

## 🧪 Tests

```bash
# Test du status
curl http://localhost:3001/api/status

# Test de recherche
curl -X POST http://localhost:3001/api/search \
  -H "Content-Type: application/json" \
  -d '{"city":"Paris","date":"2025-06-15","level":"intermediaire"}'

# Test des niveaux
curl http://localhost:3001/api/levels

# Test des clubs
curl http://localhost:3001/api/clubs
```

## 🔗 Intégration

Ce service est conçu pour s'intégrer avec :
- **Frontend TrouveTonPadel** : Interface utilisateur
- **Service principal** : Coordination des recherches
- **Base de données** : Stockage des résultats (à venir)

## 📝 Logs

Le service génère des logs détaillés pour :
- Requêtes API reçues
- Recherches effectuées
- Erreurs rencontrées
- Performance des clubs

## 🤝 Contribution

Pour ajouter un nouveau club :
1. Modifier `clubs-config.js`
2. Implémenter la logique de scraping dans `search.js`
3. Tester avec l'API de recherche

## 📞 Support

Pour toute question sur le module tournois :
- Vérifier les logs du serveur
- Tester les endpoints avec curl
- Consulter la configuration des clubs
