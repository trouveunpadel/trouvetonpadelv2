#!/usr/bin/env node
/**
 * Script pour vérifier l'état des cookies P4 Padel Indoor
 */

const { checkAndRefreshAllCookies } = require('./multi-account-cookie-manager');

// Nombre de jours avant expiration pour rafraîchir les cookies
const DAYS_BEFORE_EXPIRY = 3;

/**
 * Fonction principale
 */
async function main() {
  console.log('=== VÉRIFICATION DES COOKIES P4 PADEL INDOOR ===');
  console.log(`Date: ${new Date().toISOString()}`);
  console.log(`Seuil de rafraîchissement: ${DAYS_BEFORE_EXPIRY} jours avant expiration`);
  
  try {
    const results = await checkAndRefreshAllCookies(DAYS_BEFORE_EXPIRY);
    
    console.log('\nRÉSUMÉ:');
    console.log(`- Comptes vérifiés: ${results.checked}`);
    console.log(`- Cookies rafraîchis: ${results.refreshed}`);
    console.log(`- Échecs de rafraîchissement: ${results.failed}`);
    
    // Afficher les détails pour chaque compte
    console.log('\nDÉTAILS PAR COMPTE:');
    Object.entries(results.accounts).forEach(([accountId, data]) => {
      console.log(`\n${accountId} (${data.email}):`);
      console.log(`- Statut: ${data.checkResult.reason}`);
      
      if (data.checkResult.expiryDate) {
        console.log(`- Date d'expiration: ${data.checkResult.expiryDate}`);
      }
      
      if (data.checkResult.daysRemaining !== undefined) {
        console.log(`- Jours restants: ${data.checkResult.daysRemaining}`);
      }
      
      if (data.checkResult.needsRefresh) {
        console.log(`- Rafraîchissement: ${data.refreshed ? 'Réussi' : 'Échoué'}`);
      }
    });
    
    console.log('\n=== VÉRIFICATION TERMINÉE ===');
  } catch (error) {
    console.error('Erreur lors de la vérification des cookies:', error);
    process.exit(1);
  }
}

// Exécuter la fonction principale
main();
