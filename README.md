# TrouveTonPadel

Application web permettant de trouver des créneaux disponibles dans les clubs de padel de la région.

## Structure du projet

- **frontend** : Interface utilisateur en HTML/CSS/JavaScript
- **backend** : API Node.js avec Express pour gérer les données et les modules de récupération de créneaux
- **backend/clubs** : Modules spécifiques à chaque club de padel

## Fonctionnalités

- Recherche instantanée des créneaux disponibles
- Filtres précis (date, heure, localisation, rayon)
- Interface responsive (mobile-first)
- Modules de récupération des créneaux pour chaque club
- Gestion des liens de réservation spécifiques à chaque club
- Système de cache pour optimiser les performances

## Installation

### Prérequis

- Node.js (v16+)
- npm ou yarn

### Installation

```bash
# Cloner le dépôt
git clone https://github.com/VOTRE_USERNAME/trouvetonpadel.git
cd trouvetonpadel

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp backend/.env.example backend/.env
# Éditer le fichier .env avec vos identifiants

# Démarrer l'application
npm start
```

## Développement

### Clubs supportés

- The Monkey Padel
- Le Complexe Padel
- P4 Padel Indoor
- Enjoy Padel
- Padel Gentle
- Padel Twins

### Déploiement

Pour déployer l'application sur un serveur de production :

```bash
# Sur le serveur
git clone https://github.com/trouveunpadel/trouvetonpadelv2.git
cd trouvetonpadelv2
npm install --production

# Configurer les variables d'environnement
cp backend/.env.example backend/.env
# Éditer le fichier .env avec vos identifiants

# Démarrer avec PM2 pour la production
npm install -g pm2
pm2 start backend/server.js --name trouvetonpadel
pm2 save
pm2 startup
```

Le site sera accessible sur le port 3000 par défaut.

### GitHub

Le code source est hébergé sur GitHub à l'adresse suivante :
https://github.com/trouveunpadel/trouvetonpadelv2

Pour pousser des modifications vers GitHub depuis votre machine locale :

```bash
# Configuration initiale (une seule fois)
git config --global user.name "Votre Nom"
git config --global user.email "votre.email@exemple.com"

# Cloner le dépôt
git clone https://github.com/trouveunpadel/trouvetonpadelv2.git
cd trouvetonpadelv2

# Faire des modifications...

# Ajouter et commiter les modifications
git add .
git commit -m "Description des modifications"

# Pousser vers GitHub
git push origin main
```
