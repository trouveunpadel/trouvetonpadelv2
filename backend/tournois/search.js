const axios = require('axios');

class TournoisSearch {
    constructor() {
        this.apiUrl = 'https://api.fft.fr/fft/v3/competition/tournois';
        this.headers = {
            'Content-Type': 'application/json',
            'X-APPLICATION-ID': 'tenup-app',
            'x-api-key': 'T4c59ZJboMxW65FIt4W9MhXN4dIKtraD',
            'Accept': 'application/vnd.fft+json;',
            'Accept-Language': 'fr-FR,fr;q=0.9',
            'User-Agent': 'MAT/6263 CFNetwork/3826.500.131 Darwin/24.5.0',
            'Connection': 'keep-alive'
        };
        
        // Cookies nécessaires pour l'authentification
        this.cookies = 'AWSALB=ZHtwQTUCJgTC3P02Jq4BikHLZQAbrHGjRY70yTfdtc7WAYExZLSh4W/fIE+u7bcEiNFUMpVNzeNUEkeWqNIpNh9+gS+6f1VBVwaxYcOMqiFcGIb8/Drgp20WTV46; AWSALBCORS=ZHtwQTUCJgTC3P02Jq4BikHLZQAbrHGjRY70yTfdtc7WAYExZLSh4W/fIE+u7bcEiNFUMpVNzeNUEkeWqNIpNh9+gS+6f1VBVwaxYcOMqiFcGIb8/Drgp20WTV46; datadome=6tCqhxlhUKo55T7RcjuLjGjflRp_Fg_4Z_IRISFjwOVanCXMR7CJBZOqvPQmfjnzrv~3MLWO5Bi3Cyic2ANK1duzMSooD7JSfiKMFWcnd0ec5TY__RI4Y5G2TEr2Vo20; pa_vid=%22EDD42727-B0EF-49F4-9534-F90B3993AAC1%22';
    }

    // Recherche principale de tournois via l'API FFT
    async searchTournaments({ city, date, radius = 30, level = 'all', coordinates }) {
        try {
            console.log(`🔍 Recherche FFT tournois padel pour ${city} le ${date} (rayon: ${radius}km)`);
            
            // Obtenir les coordonnées si pas fournies
            let coords = coordinates;
            if (!coords) {
                coords = await this.getCoordinates(city);
            }
            
            const { lat, lng } = coords;
            
            const startDate = new Date(date);
            const endDate = new Date(date);
            endDate.setDate(endDate.getDate() + 30); // Recherche sur 30 jours
            
            // Récupérer tous les tournois avec pagination
            let allTournaments = [];
            let from = 0;
            const pageSize = 100; // Augmenter la taille de page
            let hasMore = true;
            
            while (hasMore) {
                const requestBody = {
                    "from": from,
                    "dateFin": endDate.toISOString(),
                    "distance": radius,
                    "size": pageSize,
                    "typePratique": ["PADEL"],
                    "include": [
                        "code", "id", "epreuves.categorieAge", "libelle", "dateDebut", "dateFin",
                        "installation", "inscriptionEnLigne", "prixLot", "paiementEnLigne",
                        "paiementEnLigneObligatoire", "nomClub", "epreuves.dateClotureInscription",
                        "epreuves.inscriptionEnLigne", "epreuves.inscriptionEnLigneEnCours",
                        "epreuves.libelle", "epreuves.id", "epreuves.natureEpreuve", "nomLigue",
                        "jugeArbitre", "courrielEngagement", "nomEngagement", "naturesTerrains",
                        "adresse1Engagement", "adresse2Engagement", "codePostalEngagement",
                        "villeEngagement", "prenomEngagement", "telPortableEngagement",
                        "telBureauEngagement", "telDomicileEngagement", "type", "tournoiInterne",
                        "nombreDeCourtExterieur", "nombreDeCourtInterieur", "communication",
                        "modeleDeBalle", "prixEspece"
                    ],
                    "dateDebut": startDate.toISOString(),
                    "lat": lat,
                    "traditionnel": {
                        "tournoiInterne": false
                    },
                    "lng": lng,
                    "sort": ["_DIST_"],
                    "type": []
                };

                const response = await axios.post(this.apiUrl, requestBody, {
                    headers: {
                        ...this.headers,
                        'Cookie': this.cookies
                    }
                });

                const hits = response.data?.hits || [];
                console.log(`✅ API FFT page ${Math.floor(from/pageSize) + 1}: ${hits.length} tournois trouvés`);
                
                if (hits.length === 0) {
                    hasMore = false;
                } else {
                    allTournaments = allTournaments.concat(hits);
                    from += pageSize;
                    
                    // Sécurité : limiter à 10 pages max (1000 tournois)
                    if (from >= 1000) {
                        console.log('⚠️ Limite de 1000 tournois atteinte');
                        hasMore = false;
                    }
                    
                    // Si on a moins de résultats que demandé, c'est la dernière page
                    if (hits.length < pageSize) {
                        hasMore = false;
                    }
                }
            }

            console.log(`📊 Total FFT: ${allTournaments.length} tournois trouvés sur toutes les pages`);
            
            if (allTournaments.length === 0) {
                return [];
            }

            // Debug: vérifier la structure des données reçues
            if (allTournaments.length > 0) {
                console.log('🔍 Premier hit:', Object.keys(allTournaments[0]));
                console.log('🔍 Structure complète du premier hit:', JSON.stringify(allTournaments[0], null, 2));
            }

            // Transformer les données FFT en format standardisé
            const tournaments = this.transformFFTData(allTournaments, level);
            
            console.log(`📊 ${tournaments.length} tournois après filtrage par niveau`);
            return tournaments;
        } catch (error) {
            console.error('❌ Erreur API FFT:', error.message);
            if (error.response) {
                console.error('Status:', error.response.status);
                console.error('Data:', error.response.data);
            }
            throw new Error(`Erreur lors de la recherche FFT: ${error.message}`);
        }
    }

    // Transformer les données FFT en format standardisé
    transformFFTData(hits, levelFilter) {
        const tournaments = [];

        console.log(`🔍 Transformation de ${hits.length} résultats FFT`);
        
        hits.forEach((hit, hitIndex) => {
            // La structure a changé : les données sont directement dans hit, pas dans hit._source
            const source = hit;
            
            // Debug: afficher la structure du premier résultat
            if (hitIndex === 0) {
                console.log('📊 Structure du premier résultat FFT:', JSON.stringify(source, null, 2));
            }
            
            // Vérifications de sécurité
            if (!source) {
                console.log(`⚠️ Source manquante pour hit ${hitIndex}`);
                return;
            }
            
            // Vérifier que c'est bien un tournoi de padel (type "P")
            if (!source.type || source.type !== 'P') {
                console.log(`⚠️ Pas un tournoi de padel: type=${source.type} pour ${source.libelle || 'tournoi inconnu'}`);
                return;
            }

            console.log(`✅ Tournoi padel trouvé: ${source.libelle}`);

            // Traiter chaque épreuve du tournoi
            if (source.epreuves && Array.isArray(source.epreuves)) {
                source.epreuves.forEach((epreuve, index) => {
                    // Filtrer par niveau si spécifié
                    if (levelFilter !== 'all' && !this.matchesLevel(epreuve, levelFilter)) {
                        return;
                    }

                    const tournament = {
                        id: `fft_${source.id}_${epreuve.id || index}`,
                        source: 'FFT',
                        
                        // Informations générales
                        name: epreuve.libelle || source.libelle,
                        description: source.communication || `Tournoi ${epreuve.libelle}`,
                        
                        // Dates
                        dateDebut: source.dateDebut,
                        dateFin: source.dateFin,
                        dateClotureInscription: epreuve.dateClotureInscription,
                        
                        // Lieu
                        clubName: source.nomClub,
                        installation: source.installation,
                        address: this.formatAddress(source),
                        city: source.installation?.ville || source.ville,
                        codePostal: source.installation?.codePostal || source.codePostal,
                        coordinates: {
                            lat: source.installation?.lat,
                            lng: source.installation?.lng
                        },
                        
                        // Épreuve
                        epreuve: {
                            id: epreuve.id,
                            libelle: epreuve.libelle,
                            categorieAge: epreuve.categorieAge,
                            natureEpreuve: epreuve.natureEpreuve
                        },
                        
                        // Niveau estimé
                        level: this.estimateLevel(epreuve),
                        levelDisplay: this.getLevelDisplay(this.estimateLevel(epreuve)),
                        
                        // Inscription
                        inscriptionEnLigne: epreuve.inscriptionEnLigne || source.inscriptionEnLigne,
                        inscriptionEnCours: epreuve.inscriptionEnLigneEnCours,
                        paiementEnLigne: source.paiementEnLigne,
                        paiementObligatoire: source.paiementEnLigneObligatoire,
                        
                        // Prix et récompenses
                        prixLot: source.prixLot,
                        prixEspece: source.prixEspece,
                        
                        // Terrains
                        terrains: {
                            natures: source.naturesTerrains,
                            exterieur: source.nombreDeCourtExterieur,
                            interieur: source.nombreDeCourtInterieur
                        },
                        
                        // Contact
                        contact: {
                            nom: source.nomEngagement,
                            prenom: source.prenomEngagement,
                            email: source.courrielEngagement,
                            telPortable: source.telPortableEngagement,
                            telBureau: source.telBureauEngagement,
                            telDomicile: source.telDomicileEngagement
                        },
                        
                        // Métadonnées
                        ligue: source.nomLigue,
                        jugeArbitre: source.jugeArbitre,
                        modeleBalle: source.modeleDeBalle,
                        tournoiInterne: source.tournoiInterne,
                        type: source.type,
                        
                        // Status
                        status: this.getStatus(epreuve, source),
                        
                        // Distance (fournie par l'API FFT)
                        distance: source.distanceEnMetres ? Math.round(source.distanceEnMetres) : null
                    };

                    tournaments.push(tournament);
                });
            }
        });

        // Trier par date puis par distance
        tournaments.sort((a, b) => {
            const dateCompare = new Date(a.dateDebut) - new Date(b.dateDebut);
            if (dateCompare !== 0) return dateCompare;
            
            if (a.distance && b.distance) {
                return a.distance - b.distance;
            }
            return 0;
        });

        return tournaments;
    }

    // Estimer le niveau d'une épreuve
    estimateLevel(epreuve) {
        const libelle = (epreuve.libelle || '').toLowerCase();
        const nature = (epreuve.natureEpreuve?.libelle || epreuve.natureEpreuve || '').toLowerCase();
        const age = (epreuve.categorieAge?.libelle || epreuve.categorieAge || '').toLowerCase();
        
        // Logique d'estimation basée sur les mots-clés
        if (libelle.includes('débutant') || libelle.includes('initiation') || libelle.includes('découverte')) {
            return 'debutant';
        }
        
        if (libelle.includes('expert') || libelle.includes('élite') || libelle.includes('compétition') || 
            nature.includes('championnat')) {
            return 'expert';
        }
        
        if (libelle.includes('avancé') || libelle.includes('confirmé') || nature.includes('régional')) {
            return 'avance';
        }
        
        // Par défaut, intermédiaire
        return 'intermediaire';
    }

    // Vérifier si une épreuve correspond au niveau demandé
    matchesLevel(epreuve, targetLevel) {
        const estimatedLevel = this.estimateLevel(epreuve);
        return estimatedLevel === targetLevel;
    }

    // Formater l'adresse
    formatAddress(source) {
        const parts = [];
        
        // Nouvelle structure : utiliser installation si disponible
        if (source.installation) {
            if (source.installation.nom) parts.push(source.installation.nom);
            if (source.installation.adresse1) parts.push(source.installation.adresse1);
            if (source.installation.adresse2) parts.push(source.installation.adresse2);
            if (source.installation.codePostal) parts.push(source.installation.codePostal);
            if (source.installation.ville) parts.push(source.installation.ville);
        } else {
            // Fallback vers l'ancienne structure
            if (source.adresse1Engagement) parts.push(source.adresse1Engagement);
            if (source.adresse2Engagement) parts.push(source.adresse2Engagement);
            if (source.codePostalEngagement) parts.push(source.codePostalEngagement);
            if (source.villeEngagement) parts.push(source.villeEngagement);
        }
        
        return parts.join(', ');
    }

    // Déterminer le statut d'un tournoi
    getStatus(epreuve, source) {
        const now = new Date();
        const dateClotureInscription = epreuve.dateClotureInscription ? new Date(epreuve.dateClotureInscription) : null;
        const dateDebut = new Date(source.dateDebut);
        
        if (dateDebut < now) {
            return 'termine';
        }
        
        if (dateClotureInscription && dateClotureInscription < now) {
            return 'inscriptions_fermees';
        }
        
        if (epreuve.inscriptionEnLigneEnCours) {
            return 'inscriptions_ouvertes';
        }
        
        return 'a_venir';
    }

    // Obtenir l'affichage du niveau
    getLevelDisplay(level) {
        const levels = {
            'debutant': 'Débutant',
            'intermediaire': 'Intermédiaire', 
            'avance': 'Avancé',
            'expert': 'Expert'
        };
        return levels[level] || 'Tous niveaux';
    }

    // Obtenir les coordonnées d'une ville (à implémenter avec une API de géocodage)
    async getCoordinates(city) {
        // Pour le moment, retourner des coordonnées par défaut (Paris)
        // À remplacer par une vraie API de géocodage
        const defaultCoordinates = {
            'paris': { lat: 48.8566, lng: 2.3522 },
            'lyon': { lat: 45.7640, lng: 4.8357 },
            'marseille': { lat: 43.2965, lng: 5.3698 },
            'toulouse': { lat: 43.6047, lng: 1.4442 },
            'nice': { lat: 43.7102, lng: 7.2620 }
        };
        
        return defaultCoordinates[city.toLowerCase()] || defaultCoordinates['paris'];
    }
}

module.exports = new TournoisSearch();
