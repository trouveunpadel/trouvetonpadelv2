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
/**
 * ui.js - Gestion des éléments d'interface utilisateur
 * Partie du projet TrouveTonPadel
 */

document.addEventListener('DOMContentLoaded', function() {
    // Gestion de l'effet de retournement de carte
    const card = document.querySelector('.card');
    const flipToBackBtn = document.getElementById('flip-to-back');
    const flipToFrontBtn = document.getElementById('flip-to-front');
    
    if (flipToBackBtn) {
        flipToBackBtn.addEventListener('click', function() {
            card.classList.add('flipped');
        });
    }
    
    if (flipToFrontBtn) {
        flipToFrontBtn.addEventListener('click', function() {
            card.classList.remove('flipped');
        });
    }
    
    // Mise à jour de l'affichage du rayon pour la recherche de créneaux
    const radiusSlider = document.getElementById('radius');
    const radiusValue = document.getElementById('radius-value');
    
    if (radiusSlider && radiusValue) {
        radiusSlider.addEventListener('input', function() {
            radiusValue.textContent = this.value;
        });
    }
    
    // Mise à jour de l'affichage du rayon pour la recherche de tournois
    const tournamentRadiusSlider = document.getElementById('tournament-radius');
    const tournamentRadiusValue = document.getElementById('tournament-radius-value');
    
    if (tournamentRadiusSlider && tournamentRadiusValue) {
        tournamentRadiusSlider.addEventListener('input', function() {
            tournamentRadiusValue.textContent = this.value;
        });
    }
    
    // Initialisation des dates par défaut
    initDefaultDates();
});

/**
 * Initialise les dates par défaut dans les champs de formulaire
 */
function initDefaultDates() {
    // Date du jour formatée YYYY-MM-DD
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    
    // Date pour la recherche de créneaux
    const dateInput = document.getElementById('date');
    if (dateInput) {
        dateInput.value = formattedDate;
    }
    
    // Dates pour la recherche de tournois
    const startDateInput = document.getElementById('start-date');
    if (startDateInput) {
        startDateInput.value = formattedDate;
    }
    
    // Date de fin par défaut (aujourd'hui + 30 jours)
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    const formattedEndDate = endDate.toISOString().split('T')[0];
    
    const endDateInput = document.getElementById('end-date');
    if (endDateInput) {
        endDateInput.value = formattedEndDate;
    }
    
    // Définir une heure par défaut (7:00 pour voir les créneaux tôt le matin)
    const timeInput = document.getElementById('time');
    if (timeInput) {
        timeInput.value = '07:00';
    }
}
/**
 * modal.js - Gestion des fenêtres modales personnalisées
 * Partie du projet TrouveTonPadel
 */

class CustomModal {
    constructor() {
        this.modalOverlay = null;
        this.modal = null;
        this.modalTitle = null;
        this.modalBody = null;
        this.modalButton = null;
        this.isInitialized = false;
        this.onClose = null;
    }

    /**
     * Initialise la structure HTML de la modal
     */
    initialize() {
        if (this.isInitialized) return;

        // Créer l'overlay
        this.modalOverlay = document.createElement('div');
        this.modalOverlay.className = 'custom-modal-overlay';
        
        // Créer la modal
        this.modal = document.createElement('div');
        this.modal.className = 'custom-modal';
        
        // Créer l'en-tête
        const modalHeader = document.createElement('div');
        modalHeader.className = 'custom-modal-header';
        
        this.modalTitle = document.createElement('h3');
        this.modalTitle.className = 'custom-modal-title';
        modalHeader.appendChild(this.modalTitle);
        
        // Créer le corps
        const modalBody = document.createElement('div');
        modalBody.className = 'custom-modal-body';
        
        this.modalBody = document.createElement('p');
        modalBody.appendChild(this.modalBody);
        
        // Créer le pied
        const modalFooter = document.createElement('div');
        modalFooter.className = 'custom-modal-footer';
        
        this.modalButton = document.createElement('button');
        this.modalButton.className = 'custom-modal-button';
        this.modalButton.textContent = 'OK';
        this.modalButton.addEventListener('click', () => this.close());
        modalFooter.appendChild(this.modalButton);
        
        // Assembler la modal
        this.modal.appendChild(modalHeader);
        this.modal.appendChild(modalBody);
        this.modal.appendChild(modalFooter);
        
        // Ajouter la modal à l'overlay
        this.modalOverlay.appendChild(this.modal);
        
        // Ajouter l'overlay au document
        document.body.appendChild(this.modalOverlay);
        
        this.isInitialized = true;
    }

    // Position de défilement avant l'ouverture de la modal
    scrollPosition = 0;
    
    /**
     * Affiche la modal avec un titre et un message
     * @param {string} title - Le titre de la modal
     * @param {string} message - Le message à afficher
     * @param {Function} onClose - Fonction à exécuter à la fermeture de la modal
     */
    show(title, message, onClose = null) {
        this.initialize();
        
        // Enregistrer la position de défilement actuelle
        this.scrollPosition = window.scrollY;
        
        // Empêcher le défilement de la page
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.top = `-${this.scrollPosition}px`;
        document.body.style.width = '100%';
        
        this.modalTitle.textContent = title;
        this.modalBody.textContent = message;
        this.onClose = onClose;
        
        // Afficher la modal
        setTimeout(() => {
            this.modalOverlay.classList.add('active');
        }, 10);
    }

    /**
     * Ferme la modal
     */
    close() {
        if (!this.isInitialized) return;
        
        this.modalOverlay.classList.remove('active');
        
        // Restaurer le défilement de la page
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, this.scrollPosition);
        
        // Exécuter la fonction de callback si elle existe
        if (typeof this.onClose === 'function') {
            setTimeout(() => {
                this.onClose();
                this.onClose = null;
            }, 300);
        }
    }
}

// Créer une instance globale
window.customModal = new CustomModal();
