#!/usr/bin/env node
/**
 * Script pour récupérer les cookies des comptes P4 Padel Indoor
 */

const { getAllCookies } = require('./multi-account-cookie-manager');

/**
 * Fonction principale
 */
async function main() {
  console.log('=== RÉCUPÉRATION DES COOKIES P4 PADEL INDOOR ===');
  console.log(`Date: ${new Date().toISOString()}`);
  
  try {
    const results = await getAllCookies();
    
    console.log('\nRÉSUMÉ:');
    console.log(`- Récupérations réussies: ${results.success}`);
    console.log(`- Récupérations échouées: ${results.failed}`);
    
    // Afficher les détails pour chaque compte
    console.log('\nDÉTAILS PAR COMPTE:');
    Object.entries(results.accounts).forEach(([accountId, data]) => {
      console.log(`\n${accountId} (${data.email}):`);
      console.log(`- Statut: ${data.success ? 'Réussi' : 'Échoué'}`);
    });
    
    console.log('\n=== RÉCUPÉRATION TERMINÉE ===');
  } catch (error) {
    console.error('Erreur lors de la récupération des cookies:', error);
    process.exit(1);
  }
}

// Exécuter la fonction principale
main();
