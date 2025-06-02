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
