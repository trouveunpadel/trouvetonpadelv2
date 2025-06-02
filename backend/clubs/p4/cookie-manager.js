/**
 * Gestionnaire de cookies pour P4 Padel Indoor
 * Module simplifié pour utiliser les cookies dans les autres scripts
 */

const { getCookieHeader, getNextAvailableAccount } = require('./multi-account-cookie-manager');

/**
 * Obtient l'en-tête Cookie pour un compte spécifique
 * @param {string} accountId - ID du compte (account1, account2, account3)
 * @returns {string|null} En-tête Cookie ou null si non disponible
 */
function getCookies(accountId = 'account1') {
  return getCookieHeader(accountId);
}

/**
 * Obtient le prochain compte disponible avec ses cookies
 * Utile pour faire de la rotation entre les comptes
 * @returns {Object|null} Informations sur le compte disponible ou null si aucun
 */
function getNextAccount() {
  return getNextAvailableAccount();
}

module.exports = {
  getCookies,
  getNextAccount
};
