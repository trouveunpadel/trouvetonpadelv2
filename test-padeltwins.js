/**
 * Script de test pour le module Padel Twins
 * Ce script permet de tester le module indépendamment du reste de l'application
 */

const padelTwins = require('./backend/clubs/padeltwins');

// Date de test (demain)
const today = new Date();
today.setDate(today.getDate() + 1); // Ajouter un jour pour tester demain
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, '0');
const day = String(today.getDate()).padStart(2, '0');
const dateStr = `${year}-${month}-${day}`;

// Fonction de test
async function testPadelTwins() {
  console.log('=== TEST MODULE PADEL TWINS ===');
  console.log(`Date de test: ${dateStr}`);
  
  try {
    console.log('Récupération des créneaux...');
    const slots = await padelTwins.getAvailableSlots(dateStr);
    
    console.log(`\n=== RÉSULTATS ===`);
    console.log(`Nombre de créneaux trouvés: ${slots.length}`);
    
    if (slots.length > 0) {
      console.log('\nExemples de créneaux:');
      // Afficher les 5 premiers créneaux (ou moins s'il y en a moins)
      const samplesToShow = Math.min(5, slots.length);
      for (let i = 0; i < samplesToShow; i++) {
        const slot = slots[i];
        console.log(`\nCréneau #${i+1}:`);
        console.log(`- Date: ${slot.date}`);
        console.log(`- Heure: ${slot.time}`);
        console.log(`- Court: ${slot.court}`);
        console.log(`- Club: ${slot.clubName}`);
        console.log(`- Lien de réservation: ${slot.reservationLink || 'Non disponible'}`);
      }
    } else {
      console.log('\nAucun créneau disponible pour cette date.');
    }
  } catch (error) {
    console.error(`\nERREUR lors du test: ${error.message}`);
    console.error(error.stack);
  }
}

// Exécuter le test
testPadelTwins()
  .then(() => console.log('\nTest terminé.'))
  .catch(err => console.error(`Erreur non gérée: ${err.message}`));
