# API Tournois FFT - Documentation

## Vue d'ensemble

L'API Tournois FFT permet de rechercher des tournois de padel via l'API officielle de la Fédération Française de Tennis, avec un système de cache intelligent de 20 minutes.

## Endpoints

### 🔍 Recherche de tournois

**POST** `/api/search`

Recherche des tournois de padel selon des critères géographiques et temporels.

#### Paramètres de la requête

```json
{
  "city": "Paris",           // ✅ OBLIGATOIRE - Ville de recherche
  "dateDebut": "2025-02-01", // ✅ OBLIGATOIRE - Date de début (YYYY-MM-DD)
  "dateFin": "2025-02-28",   // ✅ OBLIGATOIRE - Date de fin (YYYY-MM-DD)
  "radius": 50,              // ⚪ OPTIONNEL - Rayon en km (défaut: 30)
  "level": "intermediaire",  // ⚪ OPTIONNEL - Niveau (défaut: "all")
  "coordinates": {           // ⚪ OPTIONNEL - Coordonnées (auto-détectées)
    "lat": 48.8566,
    "lng": 2.3522
  }
}
```

#### Niveaux disponibles
- `"all"` - Tous les niveaux (défaut)
- `"debutant"` - Débutant (P25)
- `"intermediaire"` - Intermédiaire (P100, P250)
- `"avance"` - Avancé (P500, P1000, P2000)

#### Réponse

```json
{
  "success": true,
  "data": [
    {
      "id": "fft_FED_82479953_0",
      "source": "FFT",
      "name": "P100 Tournoi Example",
      "description": "Tournoi P100 Tournoi Example",
      "dateDebut": "2025-02-15",
      "dateFin": "2025-02-15",
      "clubName": "CLUB EXAMPLE",
      "installation": {
        "nom": "Installation Example",
        "adresse1": "123 Rue Example",
        "codePostal": "75001",
        "ville": "PARIS",
        "lat": 48.8566,
        "lng": 2.3522
      },
      "level": "intermediaire",
      "levelDisplay": "Intermédiaire",
      "distance": 1234
    }
  ],
  "count": 186,
  "coordinates": {
    "lat": 48.8566,
    "lng": 2.3522
  },
  "fromCache": false,
  "timestamp": "2025-06-14T05:07:17.601Z"
}
```

### 📄 Détail d'un tournoi

**GET** `/api/tournament/:id`

Récupère les informations détaillées d'un tournoi spécifique.

#### Paramètres
- `id` - ID du tournoi (sans le préfixe "fft_FED_")

#### Réponse

```json
{
  "success": true,
  "data": {
    "id": 82479953,
    "nom": "P100 Tournoi Example",
    "communication": "<p>Instructions d'inscription...</p>",
    "installation": {
      "nom": "Installation Example",
      "adresse1": "123 Rue Example",
      "telephone": "0123456789"
    },
    "epreuves": [
      {
        "tarifAdulte": 25,
        "tarifJeune": 15
      }
    ]
  }
}
```

### 📊 Status du service

**GET** `/api/status`

Retourne le statut du service et les statistiques du cache.

#### Réponse

```json
{
  "status": "active",
  "service": "TrouveTonPadel - API Tournois FFT",
  "version": "2.0.0",
  "cache": {
    "type": "search-cache",
    "timeoutMinutes": 20,
    "entries": 2,
    "expired": 0
  },
  "timestamp": "2025-06-14T05:00:28.194Z"
}
```

### 📈 Statistiques du cache

**GET** `/api/cache/stats`

Retourne les statistiques détaillées du cache.

#### Réponse

```json
{
  "success": true,
  "stats": {
    "totalEntries": 2,
    "validEntries": 2,
    "expiredEntries": 0,
    "cacheTimeoutMinutes": 20
  }
}
```

### 🗑️ Vider le cache

**DELETE** `/api/cache`

Vide manuellement le cache de recherche.

#### Réponse

```json
{
  "success": true,
  "message": "Cache vidé avec succès"
}
```

## Système de cache

- **Durée** : 20 minutes
- **Clé de cache** : Basée sur `city`, `dateDebut`, `dateFin`, `radius`, `level`
- **Avantages** : Réponses instantanées pour les recherches identiques
- **Nettoyage** : Automatique des entrées expirées

## Exemples d'utilisation

### Recherche basique

```bash
curl -X POST http://localhost:3001/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "city": "Paris",
    "dateDebut": "2025-02-01",
    "dateFin": "2025-02-28",
    "radius": 50
  }'
```

### Recherche avec niveau spécifique

```bash
curl -X POST http://localhost:3001/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "city": "Lyon",
    "dateDebut": "2025-03-01",
    "dateFin": "2025-03-31",
    "radius": 30,
    "level": "intermediaire"
  }'
```

### Récupération des détails

```bash
curl http://localhost:3001/api/tournament/82479953
```

## Codes d'erreur

- **400** - Paramètres manquants ou invalides
- **404** - Tournoi non trouvé
- **500** - Erreur serveur interne

## Performance

- **Recherche initiale** : ~2-5 secondes (selon l'API FFT)
- **Recherche en cache** : ~3-10ms
- **Pagination automatique** : Récupère TOUS les tournois disponibles
- **Limite de sécurité** : 1000 tournois maximum par recherche
