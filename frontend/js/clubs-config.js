/**
 * Configuration centralisée des clubs de padel pour le frontend
 * Ce fichier contient toutes les informations sur les clubs (coordonnées, adresses, etc.)
 * pour éviter la duplication et faciliter la maintenance
 */

window.clubsConfig = {
  monkeypadel: {
    id: 'monkeypadel',
    name: 'The Monkey Padel',
    latitude: 43.64400783959672,
    longitude: 5.16392416988841,
    address: '2331 Vieux Chemin de Lambesc, 13330 Pélissanne',
    type: 'extérieur',
    courtType: 'extérieur'
  },
  complexepadel: {
    id: 'complexepadel',
    name: 'Le Complexe Padel',
    latitude: 43.631129679327294,
    longitude: 5.0960733026979375,
    address: 'Rue de l\'Estamaire, 13300 Salon-de-Provence',
    type: 'extérieur',
    courtType: 'extérieur'
  },
  p4padelindoor: {
    id: 'p4padelindoor',
    name: 'P4 Padel Indoor',
    latitude: 43.58658595382674,
    longitude: 5.109316223860527,
    address: 'ZI les sardenas, 133 Allée de la carreto LOT A, 13680 Lançon-Provence',
    type: 'intérieur',
    courtType: 'intérieur'
  },
  enjoypadel: {
    id: 'enjoypadel',
    name: 'Enjoy Padel',
    latitude: 43.58126783814288,
    longitude: 5.210543385227449,
    address: '200 Rue des Oliviers, 13680 Lançon-Provence',
    type: 'extérieur',
    courtType: 'extérieur'
  },
  padelgentle: {
    id: 'padelgentle',
    name: 'Padel Gentle',
    latitude: 43.60554137339589,
    longitude: 5.098498485228493,
    address: 'Quartier de la Garenne, RN 113, 13300 Salon-de-Provence, France',
    type: 'extérieur',
    courtType: 'extérieur'
  },
  padeltwins: {
    id: 'padeltwins',
    name: 'Padel Twins',
    latitude: 43.5494899118331,
    longitude: 5.256438212213361,
    address: '1050 Rte de Velaux, 13111 Coudoux',
    type: 'extérieur',
    courtType: 'extérieur'
  },
  countryclubpadel: {
    id: 'countryclubpadel',
    name: 'Country Club Padel',
    latitude: 43.56893113616569,
    longitude: 5.416718454543322,
    address: '1195 Chem. des Cruyes, 13090 Aix-en-Provence',
    type: 'mixte',
    courtType: 'mixte'
  }
  // Ajouter d'autres clubs ici
};
