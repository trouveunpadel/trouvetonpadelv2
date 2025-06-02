/**
 * Client de proxy pour TrouveTonPadel
 * Ce fichier permet d'utiliser facilement le proxy pour les requêtes API
 */

class TrouveTonPadelProxy {
    constructor(options = {}) {
        // Configuration par défaut
        this.config = {
            // URL du backend (utilisée en mode direct)
            backendUrl: 'http://localhost:3000',
            // URL du serveur proxy (utilisée en mode proxy serveur)
            proxyServerUrl: 'http://localhost:8090',
            // Mode de fonctionnement: 'iframe', 'server', 'direct'
            mode: 'direct',
            // Délai d'attente maximum pour les requêtes (en ms)
            timeout: 30000,
            // Fonction de journalisation
            logger: console.log,
            ...options
        };

        // Initialiser le proxy selon le mode choisi
        this.init();
    }

    /**
     * Initialise le proxy selon le mode choisi
     */
    init() {
        this.config.logger(`Initialisation du proxy TrouveTonPadel en mode: ${this.config.mode}`);
        
        if (this.config.mode === 'iframe') {
            // Créer un iframe pour le proxy
            this.createProxyIframe();
            
            // Initialiser le gestionnaire de requêtes
            this.pendingRequests = new Map();
            this.requestId = 1;
            
            // Écouter les messages de l'iframe
            window.addEventListener('message', this.handleIframeMessage.bind(this));
        }
    }

    /**
     * Crée un iframe pour le proxy (mode iframe)
     */
    createProxyIframe() {
        // Vérifier si l'iframe existe déjà
        let iframe = document.getElementById('trouvetonpadel-proxy-iframe');
        
        if (!iframe) {
            // Créer l'iframe
            iframe = document.createElement('iframe');
            iframe.id = 'trouvetonpadel-proxy-iframe';
            iframe.src = '/proxy.html';
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
            
            this.config.logger('Iframe de proxy créé');
        }
        
        this.proxyIframe = iframe;
    }

    /**
     * Gère les messages reçus de l'iframe (mode iframe)
     */
    handleIframeMessage(event) {
        // Vérifier que le message vient de notre iframe
        if (event.source !== this.proxyIframe.contentWindow) {
            return;
        }
        
        const message = event.data;
        
        if (message.type === 'api-response' || message.type === 'api-error') {
            // Récupérer la requête en attente
            const pendingRequest = this.pendingRequests.get(message.requestId);
            
            if (pendingRequest) {
                // Supprimer la requête de la liste des requêtes en attente
                this.pendingRequests.delete(message.requestId);
                
                // Annuler le timeout
                clearTimeout(pendingRequest.timeoutId);
                
                if (message.type === 'api-response') {
                    // Résoudre la promesse avec les données
                    pendingRequest.resolve({
                        ok: message.status >= 200 && message.status < 300,
                        status: message.status,
                        data: message.data
                    });
                } else {
                    // Rejeter la promesse avec l'erreur
                    pendingRequest.reject(new Error(message.error));
                }
            }
        }
    }

    /**
     * Effectue une requête API via le proxy
     * @param {string} endpoint - Endpoint de l'API (sans le préfixe /api)
     * @param {Object} options - Options de la requête
     * @returns {Promise<Object>} - Promesse résolue avec les données de la réponse
     */
    async request(endpoint, options = {}) {
        const {
            method = 'GET',
            body = null,
            headers = {},
            timeout = this.config.timeout
        } = options;
        
        // S'assurer que l'endpoint commence par /
        const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        
        // Construire l'URL complète selon le mode
        let url;
        
        switch (this.config.mode) {
            case 'iframe':
                // En mode iframe, l'URL est celle du backend
                url = `${this.config.backendUrl}/api${normalizedEndpoint}`;
                break;
                
            case 'server':
                // En mode serveur, l'URL est celle du serveur proxy
                url = `${this.config.proxyServerUrl}/api${normalizedEndpoint}`;
                break;
                
            case 'direct':
            default:
                // En mode direct, l'URL est celle du backend
                url = `${this.config.backendUrl}/api${normalizedEndpoint}`;
                break;
        }
        
        // Journaliser la requête
        this.config.logger(`Requête API: ${method} ${url}`);
        
        // En mode iframe, utiliser l'iframe pour la requête
        if (this.config.mode === 'iframe') {
            return this.requestViaIframe(url, method, body, headers, timeout);
        }
        
        // En mode serveur ou direct, utiliser fetch
        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                },
                body: body ? JSON.stringify(body) : undefined,
                cache: 'no-store'
            });
            
            // Vérifier si la réponse est OK
            const data = await response.json();
            
            return {
                ok: response.ok,
                status: response.status,
                data
            };
        } catch (error) {
            this.config.logger(`Erreur lors de la requête API: ${error.message}`);
            throw error;
        }
    }

    /**
     * Effectue une requête API via l'iframe (mode iframe)
     */
    requestViaIframe(url, method, body, headers, timeout) {
        return new Promise((resolve, reject) => {
            // Vérifier que l'iframe est chargé
            if (!this.proxyIframe || !this.proxyIframe.contentWindow) {
                reject(new Error('Iframe de proxy non disponible'));
                return;
            }
            
            // Générer un ID unique pour la requête
            const requestId = this.requestId++;
            
            // Créer un timeout pour la requête
            const timeoutId = setTimeout(() => {
                // Supprimer la requête de la liste des requêtes en attente
                this.pendingRequests.delete(requestId);
                
                // Rejeter la promesse avec une erreur de timeout
                reject(new Error(`Timeout de la requête après ${timeout}ms`));
            }, timeout);
            
            // Ajouter la requête à la liste des requêtes en attente
            this.pendingRequests.set(requestId, {
                resolve,
                reject,
                timeoutId
            });
            
            // Envoyer la requête à l'iframe
            this.proxyIframe.contentWindow.postMessage({
                type: 'api-request',
                requestId,
                url,
                method,
                body,
                headers
            }, '*');
        });
    }

    /**
     * Effectue une requête GET
     * @param {string} endpoint - Endpoint de l'API (sans le préfixe /api)
     * @param {Object} options - Options de la requête
     * @returns {Promise<Object>} - Promesse résolue avec les données de la réponse
     */
    async get(endpoint, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'GET'
        });
    }

    /**
     * Effectue une requête POST
     * @param {string} endpoint - Endpoint de l'API (sans le préfixe /api)
     * @param {Object} body - Corps de la requête
     * @param {Object} options - Options de la requête
     * @returns {Promise<Object>} - Promesse résolue avec les données de la réponse
     */
    async post(endpoint, body, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'POST',
            body
        });
    }

    /**
     * Effectue une requête PUT
     * @param {string} endpoint - Endpoint de l'API (sans le préfixe /api)
     * @param {Object} body - Corps de la requête
     * @param {Object} options - Options de la requête
     * @returns {Promise<Object>} - Promesse résolue avec les données de la réponse
     */
    async put(endpoint, body, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'PUT',
            body
        });
    }

    /**
     * Effectue une requête DELETE
     * @param {string} endpoint - Endpoint de l'API (sans le préfixe /api)
     * @param {Object} options - Options de la requête
     * @returns {Promise<Object>} - Promesse résolue avec les données de la réponse
     */
    async delete(endpoint, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'DELETE'
        });
    }
}

// Exporter la classe
window.TrouveTonPadelProxy = TrouveTonPadelProxy;

// Créer une instance par défaut
window.apiProxy = new TrouveTonPadelProxy();

console.log('Client de proxy TrouveTonPadel chargé');
