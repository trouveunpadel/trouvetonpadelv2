/**
 * Détecteur de périphérique simple
 */
window.DeviceDetector = {
    isMobile: function() {
        return window.innerWidth <= 768;
    },
    
    isTablet: function() {
        return window.innerWidth > 768 && window.innerWidth <= 1024;
    },
    
    isDesktop: function() {
        return window.innerWidth > 1024;
    },
    
    getTouchCapability: function() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }
};

console.log('Device Detector chargé');
