/**
 * weather-service.js - Service de météo pour TrouveTonPadel
 * Utilise l'API OpenWeatherMap pour récupérer les prévisions météo
 */

// Service de météo
const WeatherService = {
    // Clé API OpenWeatherMap fournie par l'utilisateur
    apiKey: '81ceffbb4899344ca61915bf5f180347',
    
    /**
     * Vérifie si une date est dans les 5 prochains jours (période pour laquelle les prévisions météo sont disponibles)
     * @param {string} dateStr - Date au format YYYY-MM-DD
     * @returns {boolean} - True si la date est dans les 5 prochains jours, sinon False
     */
    isDateWithinForecastRange(dateStr) {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Début de la journée
        
        const targetDate = new Date(dateStr);
        targetDate.setHours(0, 0, 0, 0); // Début de la journée
        
        // Calculer la différence en jours
        const diffTime = targetDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Les prévisions sont disponibles pour aujourd'hui + 4 jours (5 jours au total)
        return diffDays >= 0 && diffDays <= 4;
    },
    
    /**
     * Récupère les prévisions météo pour une date et des coordonnées données
     * @param {string} date - Date au format YYYY-MM-DD
     * @param {number} latitude - Latitude
     * @param {number} longitude - Longitude
     * @returns {Promise<Object>} - Promesse résolue avec les données météo
     */
    async getWeatherForecast(date, latitude, longitude) {
        try {
            // Vérifier si nous avons déjà les données en cache
            const cacheKey = `weather_${date}_${latitude}_${longitude}`;
            const cachedData = localStorage.getItem(cacheKey);
            
            if (cachedData) {
                return JSON.parse(cachedData);
            }
            
            // Convertir la date en timestamp Unix (début de journée)
            const targetDate = new Date(date);
            const timestamp = Math.floor(targetDate.getTime() / 1000);
            
            // Appeler l'API OpenWeatherMap pour les prévisions à 5 jours
            const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${this.apiKey}&units=metric&lang=fr`);
            
            if (!response.ok) {
                throw new Error(`Erreur API météo: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Convertir la date de recherche en objet Date
            const searchDateObj = new Date(date);
            
            // Trouver les prévisions pour la date demandée
            const forecasts = data.list.filter(item => {
                const forecastDate = new Date(item.dt * 1000);
                return forecastDate.getDate() === searchDateObj.getDate() && 
                       forecastDate.getMonth() === searchDateObj.getMonth() && 
                       forecastDate.getFullYear() === searchDateObj.getFullYear();
            });
            
            // Si aucune prévision n'est trouvée pour cette date, retourner des données par défaut
            if (forecasts.length === 0) {
                console.log(`Aucune prévision trouvée pour la date: ${date}`);
                return {
                    temperature: '--',
                    windSpeed: '--',
                    weatherIcon: 'question',
                    weatherDescription: 'Données non disponibles'
                };
            }
            
            console.log(`Prévisions trouvées pour ${date}:`, forecasts);
            
            // Prendre la prévision du milieu de journée (ou la première disponible)
            const middayForecast = forecasts.find(item => {
                const forecastHour = new Date(item.dt * 1000).getHours();
                return forecastHour >= 12 && forecastHour <= 14;
            }) || forecasts[0];
            
            // Extraire les informations nécessaires
            const weatherData = {
                temperature: Math.round(middayForecast.main.temp),
                windSpeed: Math.round(middayForecast.wind.speed * 3.6), // Convertir m/s en km/h
                weatherIcon: middayForecast.weather[0].icon,
                weatherDescription: middayForecast.weather[0].description
            };
            
            console.log(`Données météo pour ${date}:`, weatherData);
            
            // Mettre en cache les données (valides pour 3 heures)
            localStorage.setItem(cacheKey, JSON.stringify(weatherData));
            localStorage.setItem(`${cacheKey}_expiry`, Date.now() + 3 * 60 * 60 * 1000);
            
            return weatherData;
        } catch (error) {
            console.error('Erreur lors de la récupération des données météo:', error);
            
            // Retourner des données par défaut en cas d'erreur
            return {
                temperature: '--',
                windSpeed: '--',
                weatherIcon: 'question',
                weatherDescription: 'Données non disponibles'
            };
        }
    },
    
    /**
     * Récupère l'URL de l'icône météo
     * @param {string} iconCode - Code de l'icône météo
     * @returns {string} - URL de l'icône
     */
    getWeatherIconUrl(iconCode) {
        if (iconCode === 'question') {
            return 'images/weather/unknown.svg';
        }
        return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    }
};

// Exporter le service
window.WeatherService = WeatherService;
