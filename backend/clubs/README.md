# Dossier des clubs de padel

Ce dossier contiendra les scripts de scraping pour chaque club de padel.

## Structure

Chaque club aura son propre dossier avec les fichiers suivants :
- `index.js` : Point d'entrée pour le scraping du club
- `config.js` : Configuration spécifique au club (URL, sélecteurs, etc.)
- `utils.js` : Fonctions utilitaires spécifiques au club

## Clubs à implémenter

Pour ajouter un nouveau club, créez un dossier avec le nom du club et implémentez les fichiers nécessaires.

## Exemple d'utilisation

```javascript
const clubScraper = require('./clubs/nom-du-club');

// Rechercher des créneaux disponibles
const slots = await clubScraper.findAvailableSlots({
  date: '2025-05-27',
  time: '14:00',
  duration: 90 // minutes
});
```
