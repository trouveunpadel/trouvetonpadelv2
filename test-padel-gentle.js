/**
 * Script de test pour le module Padel Gentle
 * Permet de vérifier si le module fonctionne correctement
 */

const padelGentle = require('./backend/clubs/padelgentle');

// Date de test (aujourd'hui)
const today = new Date();
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, '0');
const day = String(today.getDate()).padStart(2, '0');
const dateStr = `${year}-${month}-${day}`;

console.log(`Test du module Padel Gentle pour la date ${dateStr}`);

// Tester la fonction findAvailableSlots
async function testPadelGentle() {
  try {
    console.log('Recherche de créneaux disponibles...');
    
    const slots = await padelGentle.findAvailableSlots({
      date: dateStr,
      time: '10:00'
    });
    
    console.log(`Nombre de créneaux trouvés: ${slots.length}`);
    
    if (slots.length > 0) {
      console.log('Exemples de créneaux:');
      slots.slice(0, 3).forEach((slot, index) => {
        console.log(`Créneau ${index + 1}:`);
        console.log(`- Date: ${slot.date}`);
        console.log(`- Heure: ${slot.time}`);
        console.log(`- Terrain: ${slot.court}`);
        console.log(`- Type: ${slot.type}`);
        console.log('---');
      });
    } else {
      console.log('Aucun créneau trouvé.');
    }
  } catch (error) {
    console.error('Erreur lors du test:', error);
  }
}

// Exécuter le test
testPadelGentle();
