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
    async searchTournaments({ city, dateDebut, dateFin, radius = 30, level = 'all', coordinates }) {
        console.log(`🔍 Recherche FFT: ${city}, ${dateDebut} -> ${dateFin}, rayon: ${radius}km, niveau: ${level}`);
        
        // Les coordonnées doivent être fournies
        if (!coordinates || !coordinates.lat || !coordinates.lng) {
            throw new Error('Coordonnées manquantes - lat et lng sont obligatoires');
        }
        
        console.log(`📍 Coordonnées: ${coordinates.lat}, ${coordinates.lng}`);

        let allTournaments = [];
        let from = 0;
        const size = 20; // Utiliser la même taille que dans le cURL
        let hasMore = true;
        let pageCount = 0;
        const maxPages = 50; // Augmenter pour récupérer tous les résultats

        while (hasMore && pageCount < maxPages) {
            console.log(`📄 Récupération page ${pageCount + 1} (from: ${from}, size: ${size})`);

            // Utiliser exactement la même structure que le cURL
            const requestBody = {
                "dateDebut": `${dateDebut}T00:00:00.000`,
                "from": from,
                "dateFin": `${dateFin}T00:00:00.000`,
                "typePratique": ["PADEL"],
                "size": size,
                "traditionnel": {
                    "tournoiInterne": false
                },
                "lat": coordinates.lat,
                "lng": coordinates.lng,
                "sort": ["dateDebut asc"],
                "distance": radius,
                "type": ["P", "S", "L"],
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
                ]
            };

            const response = await axios.post('https://api.fft.fr/fft/v3/competition/tournois', requestBody, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.fft+json;',
                    'Accept-Language': 'fr-FR,fr;q=0.9',
                    'User-Agent': 'MAT/6263 CFNetwork/3826.500.131 Darwin/24.5.0',
                    'X-APPLICATION-ID': 'tenup-app',
                    'x-api-key': 'T4c59ZJboMxW65FIt4W9MhXN4dIKtraD',
                    'Connection': 'keep-alive',
                    'Cookie': 'AWSALB=979qclAkUGWaubmK3guMHF+c/2QDb2by/N5FPIJc9dWZidojxIxKUBysTXREM+BIxokNDtFK+qBaC0U4QSg3Ih7gU6TjSdcAZVig+ch3gNTC5BZjqaUtmx9bja/c; AWSALBCORS=979qclAkUGWaubmK3guMHF+c/2QDb2by/N5FPIJc9dWZidojxIxKUBysTXREM+BIxokNDtFK+qBaC0U4QSg3Ih7gU6TjSdcAZVig+ch3gNTC5BZjqaUtmx9bja/c; datadome=6tCqhxlhUKo55T7RcjuLjGjflRp_Fg_4Z_IRISFjwOVanCXMR7CJBZOqvPQmfjnzrv~3MLWO5Bi3Cyic2ANK1duzMSooD7JSfiKMFWcnd0ec5TY__RI4Y5G2TEr2Vo20; pa_vid=%22EDD42727-B0EF-49F4-9534-F90B3993AAC1%22'
                }
            });

            if (!response.data || !response.data.hits) {
                console.log('❌ Pas de données dans la réponse');
                break;
            }

            const pageResults = response.data.hits;
            console.log(`📊 Page ${pageCount + 1}: ${pageResults.length} tournois récupérés`);

            if (pageResults.length === 0) {
                hasMore = false;
            } else {
                allTournaments = allTournaments.concat(pageResults);
                from += size;
                pageCount++;
                
                // Si on a récupéré moins que la taille de page, c'est la dernière page
                if (pageResults.length < size) {
                    hasMore = false;
                }
            }
        }

        console.log(`📊 Total récupéré: ${allTournaments.length} tournois sur ${pageCount} pages`);

        // Transformer les données FFT
        const tournaments = this.transformFFTData(allTournaments, level);
        console.log(`📊 ${tournaments.length} tournois après filtrage par niveau`);

        return tournaments;
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
        // Plus de coordonnées hardcodées - les coordonnées doivent être fournies en paramètre
        // ou récupérées via une API de géocodage côté frontend
        return null;
    }
}

module.exports = new TournoisSearch();
