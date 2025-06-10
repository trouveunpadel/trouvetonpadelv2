/**
 * Configuration centralisée des clubs de padel
 * Ce fichier contient toutes les informations sur les clubs (coordonnées, adresses, etc.)
 * pour éviter la duplication et faciliter la maintenance
 */

const clubsConfig = {
  monkeypadel: {
    id: 'monkeypadel',
    name: 'The Monkey Padel',
    latitude: 43.64458478670538,
    longitude: 5.163387292364317,
    address: 'Route de Salon, 13116 Vernègues',
    type: 'extérieur',
    courtType: 'extérieur'
  },
  complexepadel: {
    id: 'complexepadel',
    name: 'Le Complexe Padel',
    latitude: 43.63111698073711,
    longitude: 5.096043339977537,
    address: 'Rue de l\'Estamaire, 13300 Salon-de-Provence',
    type: 'extérieur',
    courtType: 'extérieur'
  },
  p4padelindoor: {
    id: 'p4padelindoor',
    name: 'P4 Padel Indoor',
    latitude: 43.5865781080817,
    longitude: 5.109412766870975,
    address: 'ZI les sardenas, 133 Allée de la carreto LOT A, 13680 Lançon-Provence',
    type: 'intérieur',
    courtType: 'intérieur'
  },
  enjoypadel: {
    id: 'enjoypadel',
    name: 'Enjoy Padel',
    latitude: 43.581236750376625,
    longitude: 5.210554114062894,
    address: '200 Rue des Oliviers, 13680 Lançon-Provence',
    type: 'extérieur',
    courtType: 'extérieur'
  },
  padelgentle: {
    id: 'padelgentle',
    name: 'Padel Gentle',
    latitude: 43.60544814765865,
    longitude: 5.098444841051269,
    address: 'Quartier de la Garenne, RN 113, 13300 Salon-de-Provence, France',
    type: 'extérieur',
    courtType: 'extérieur'
  },
  padeltwins: {
    id: 'padeltwins',
    name: 'Padel Twins',
    latitude: 43.54955982167091,
    longitude: 5.2563952803531055,
    address: '1050 Rte de Velaux, 13111 Coudoux',
    type: 'extérieur',
    courtType: 'extérieur'
  },
  countryclubpadel: {
    id: 'countryclubpadel',
    name: 'Country Club Padel',
    latitude: 43.56886117433774,
    longitude: 5.416675539201542,
    address: '1195 Chem. des Cruyes, 13090 Aix-en-Provence',
    type: 'mixte',
    courtType: 'mixte'
  }
  // Ajouter d'autres clubs ici
};

module.exports = clubsConfig;
