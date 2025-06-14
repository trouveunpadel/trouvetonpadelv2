class TournoisSearch {
    constructor() {
        this.apiUrl = 'https://api.fft.fr/fft/v3/competition/tournois';
        // Cookies nécessaires pour l'authentification
        const cookies = 'AWSALB=ZHtwQTUCJgTC3P02Jq4BikHLZQAbrHGjRY70yTfdtc7WAYExZLSh4W/fIE+u7bcEiNFUMpVNzeNUEkeWqNIpNh9+gS+6f1VBVwaxYcOMqiFcGIb8/Drgp20WTV46; AWSALBCORS=ZHtwQTUCJgTC3P02Jq4BikHLZQAbrHGjRY70yTfdtc7WAYExZLSh4W/fIE+u7bcEiNFUMpVNzeNUEkeWqNIpNh9+gS+6f1VBVwaxYcOMqiFcGIb8/Drgp20WTV46; datadome=6tCqhxlhUKo55T7RcjuLjGjflRp_Fg_4Z_IRISFjwOVanCXMR7CJBZOqvPQmfjnzrv~3MLWO5Bi3Cyic2ANK1duzMSooD7JSfiKMFWcnd0ec5TY__RI4Y5G2TEr2Vo20; pa_vid=%22EDD42727-B0EF-49F4-9534-F90B3993AAC1%22';
        
        this.headers = {
            'Content-Type': 'application/json',
            'X-APPLICATION-ID': 'tenup-app',
            'x-api-key': 'T4c59ZJboMxW65FIt4W9MhXN4dIKtraD',
            'Accept': 'application/vnd.fft+json;',
            'Accept-Language': 'fr-FR,fr;q=0.9',
            'User-Agent': 'MAT/6263 CFNetwork/3826.500.131 Darwin/24.5.0',
            'Connection': 'keep-alive',
            'Cookie': cookies
        };
    }

    // Recherche principale de tournois via l'API FFT
    async searchTournaments({ city, dateDebut, dateFin, radius = 30, level = 'all', coordinates }) {
        const axios = require('axios');
        console.log(`🔍 Recherche FFT: ${city}, ${dateDebut} -> ${dateFin}, rayon: ${radius}km, niveau: ${level}`);
        
        if (!coordinates || !coordinates.lat || !coordinates.lng) {
            throw new Error('Coordonnées manquantes - lat et lng sont obligatoires');
        }
        
        console.log(`📍 Coordonnées: ${coordinates.lat}, ${coordinates.lng}`);

        let allTournaments = [];
        let from = 0;
        const size = 20;
        let hasMore = true;
        let pageCount = 0;
        const maxPages = 50;

        while (hasMore && pageCount < maxPages) {
            console.log(`📄 Récupération page ${pageCount + 1} (from: ${from}, size: ${size})`);

            const requestBody = {
                "dateDebut": `${dateDebut}T00:00:00.000`,
                "from": from,
                "dateFin": `${dateFin}T00:00:00.000`,
                "typePratique": ["PADEL"],
                "size": size,
                "traditionnel": { "tournoiInterne": false },
                "lat": coordinates.lat,
                "lng": coordinates.lng,
                "sort": ["dateDebut asc"],
                "distance": radius,
                "type": [
                    "P",
                    "S",
                    "L"
                ],
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
            
            try {
                console.log('--- FFT API Request Body ---');
                console.log(JSON.stringify(requestBody, null, 2));
                console.log('--------------------------');

                const response = await axios.post(this.apiUrl, requestBody, { headers: this.headers });

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
                    
                    if (pageResults.length < size) {
                        hasMore = false;
                    }
                }
            } catch (error) {
                console.error('❌ Erreur lors de l\'appel à l\'API FFT:', error.response ? error.response.data : error.message);
                break; 
            }
        }

        console.log(`📊 Total récupéré: ${allTournaments.length} tournois sur ${pageCount} pages`);
        const tournaments = this.transformFFTData(allTournaments, level);
        console.log(`📊 ${tournaments.length} tournois après filtrage par niveau`);
        return tournaments;
    }

    transformFFTData(hits, levelFilter) {
        const tournaments = [];
        console.log(`🔍 Transformation de ${hits.length} résultats FFT`);
        
        hits.forEach((hit, hitIndex) => {
            const source = hit;
            
            if (hitIndex === 0) {
                console.log('📊 Structure du premier résultat FFT:', JSON.stringify(source, null, 2));
            }
            
            if (!source) {
                console.log(`⚠️ Source manquante pour hit ${hitIndex}`);
                return;
            }
            
            if (!source.type || source.type !== 'P') {
                console.log(`⚠️ Pas un tournoi de padel: type=${source.type} pour ${source.libelle || 'tournoi inconnu'}`);
                return;
            }

            // console.log(`✅ Tournoi padel trouvé: ${source.libelle}`);

            if (source.epreuves && Array.isArray(source.epreuves)) {
                source.epreuves.forEach((epreuve, index) => {
                    if (levelFilter !== 'all' && !this.matchesLevel(epreuve, levelFilter)) {
                        return;
                    }

                    const tournament = {
                        id: `fft_${source.id}_${epreuve.id || index}`,
                        source: 'FFT',
                        name: epreuve.libelle || source.libelle,
                        description: source.communication || `Tournoi ${epreuve.libelle}`,
                        dateDebut: source.dateDebut,
                        dateFin: source.dateFin,
                        dateClotureInscription: epreuve.dateClotureInscription,
                        clubName: source.nomClub,
                        installation: source.installation,
                        address: this.formatAddress(source),
                        city: source.installation?.ville || source.ville,
                        codePostal: source.installation?.codePostal || source.codePostal,
                        coordinates: {
                            lat: source.installation?.lat,
                            lng: source.installation?.lng
                        },
                        epreuve: {
                            id: epreuve.id,
                            libelle: epreuve.libelle,
                            categorieAge: epreuve.categorieAge,
                            natureEpreuve: epreuve.natureEpreuve
                        },
                        level: this.estimateLevel(epreuve),
                        levelDisplay: this.getLevelDisplay(this.estimateLevel(epreuve)),
                        inscriptionEnLigne: epreuve.inscriptionEnLigne || source.inscriptionEnLigne,
                        inscriptionEnCours: epreuve.inscriptionEnLigneEnCours,
                        paiementEnLigne: source.paiementEnLigne,
                        paiementObligatoire: source.paiementEnLigneObligatoire,
                        prixLot: source.prixLot,
                        prixEspece: source.prixEspece,
                        terrains: {
                            natures: source.naturesTerrains,
                            exterieur: source.nombreDeCourtExterieur,
                            interieur: source.nombreDeCourtInterieur
                        },
                        contact: {
                            nom: source.nomEngagement,
                            prenom: source.prenomEngagement,
                            email: source.courrielEngagement,
                            telPortable: source.telPortableEngagement,
                            telBureau: source.telBureauEngagement,
                            telDomicile: source.telDomicileEngagement
                        },
                        ligue: source.nomLigue,
                        jugeArbitre: source.jugeArbitre,
                        modeleBalle: source.modeleDeBalle,
                        tournoiInterne: source.tournoiInterne,
                        type: source.type,
                        status: this.getStatus(epreuve, source),
                        distance: source.distanceEnMetres ? Math.round(source.distanceEnMetres) : null
                    };
                    tournaments.push(tournament);
                });
            }
        });

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

    estimateLevel(epreuve) {
        const libelle = (epreuve.libelle || '').toLowerCase();
        const nature = (epreuve.natureEpreuve?.libelle || epreuve.natureEpreuve || '').toLowerCase();
        const age = (epreuve.categorieAge?.libelle || epreuve.categorieAge || '').toLowerCase();
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
        return 'intermediaire';
    }

    matchesLevel(epreuve, targetLevel) {
        const estimatedLevel = this.estimateLevel(epreuve);
        return estimatedLevel === targetLevel;
    }

    formatAddress(source) {
        const parts = [];
        if (source.installation) {
            if (source.installation.nom) parts.push(source.installation.nom);
            if (source.installation.adresse1) parts.push(source.installation.adresse1);
            if (source.installation.adresse2) parts.push(source.installation.adresse2);
            if (source.installation.codePostal) parts.push(source.installation.codePostal);
            if (source.installation.ville) parts.push(source.installation.ville);
        } else {
            if (source.adresse1Engagement) parts.push(source.adresse1Engagement);
            if (source.adresse2Engagement) parts.push(source.adresse2Engagement);
            if (source.codePostalEngagement) parts.push(source.codePostalEngagement);
            if (source.villeEngagement) parts.push(source.villeEngagement);
        }
        return parts.join(', ');
    }

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

    getLevelDisplay(level) {
        const levels = {
            'debutant': 'Débutant',
            'intermediaire': 'Intermédiaire', 
            'avance': 'Avancé',
            'expert': 'Expert'
        };
        return levels[level] || 'Tous niveaux';
    }

    async getCoordinates(city) {
        return null;
    }
}

module.exports = TournoisSearch;
