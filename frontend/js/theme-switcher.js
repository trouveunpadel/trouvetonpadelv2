/**
 * theme-switcher.js - Gestion du sélecteur de thème
 * Partie du projet TrouveTonPadel
 */

document.addEventListener('DOMContentLoaded', function() {
    // Récupérer les éléments du DOM
    const themeSwitcher = document.getElementById('theme-switcher');
    const htmlElement = document.documentElement;
    
    // Vérifier si un thème est déjà enregistré dans le localStorage
    const savedTheme = localStorage.getItem('theme');
    
    // Appliquer le thème sauvegardé ou utiliser le thème par défaut (dark)
    if (savedTheme) {
        applyTheme(savedTheme);
        themeSwitcher.checked = savedTheme === 'light';
    } else {
        applyTheme('dark');
        themeSwitcher.checked = false;
    }
    
    // Ajouter un écouteur d'événement pour le changement de thème
    themeSwitcher.addEventListener('change', function() {
        const newTheme = this.checked ? 'light' : 'dark';
        applyTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    });
    
    // Fonction pour appliquer le thème
    function applyTheme(theme) {
        htmlElement.setAttribute('data-bs-theme', theme);
    }
});
