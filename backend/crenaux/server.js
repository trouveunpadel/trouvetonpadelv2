/**
 * Serveur API pour les créneaux de TrouveTonPadel
 * Permet de rechercher des créneaux disponibles dans les clubs de padel
 */

const express = require('express');
const router = express.Router();
const search = require('./search');
const p4PadelIndoor = require('./clubs/p4');
const clubsConfig = require('./clubs-config');

// Route pour obtenir la liste des clubs
router.get('/clubs', (req, res) => {
  // Renvoyer la liste des clubs sans les modules
  const clubsList = search.clubs.map(club => ({
    id: club.id,
    name: club.name,
    latitude: club.latitude,
    longitude: club.longitude,
    address: club.address
  }));
  
  res.json(clubsList);
});

// Route pour rechercher des créneaux disponibles
router.post('/search', async (req, res) => {
  try {
    const { date, startHour, endHour, latitude, longitude, radius } = req.body;
    
    // Validation des paramètres
    if (!date || startHour === undefined || endHour === undefined || 
        !latitude || !longitude || !radius) {
      return res.status(400).json({ 
        error: 'Paramètres manquants',
        requiredParams: {
          date: 'YYYY-MM-DD',
          startHour: '0-23',
          endHour: '0-23',
          latitude: 'number',
          longitude: 'number',
          radius: 'number (km)'
        }
      });
    }
    
    // Validation du format de la date (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({ 
        error: 'Format de date invalide',
        format: 'YYYY-MM-DD'
      });
    }
    
    // Validation des heures
    if (startHour < 0 || startHour > 23 || endHour < 0 || endHour > 23 || startHour > endHour) {
      return res.status(400).json({ 
        error: 'Heures invalides',
        valid: '0 <= startHour <= endHour <= 23'
      });
    }
    
    // Recherche des créneaux
    console.log(`Recherche de créneaux pour le ${date} entre ${startHour}h et ${endHour}h`);
    console.log(`Position: ${latitude}, ${longitude}, Rayon: ${radius} km`);
    
    const slots = await search.searchAvailableSlots(
      date,
      parseInt(startHour),
      parseInt(endHour),
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(radius)
    );
    
    res.json({
      date,
      startHour,
      endHour,
      latitude,
      longitude,
      radius,
      count: slots.length,
      slots
    });
    
  } catch (error) {
    console.error('Erreur lors de la recherche:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la recherche',
      message: error.message
    });
  }
});

// Route spécifique pour P4 Padel Indoor
router.post('/p4/slots', async (req, res) => {
  try {
    console.log('=== ROUTE P4 SLOTS APPELÉE ===');
    console.log('Body reçu:', req.body);
    
    const { date, hour } = req.body;
    
    // Validation des paramètres
    if (!date) {
      console.log('Erreur: Date manquante');
      return res.status(400).json({ 
        error: 'Date manquante',
        format: 'YYYY-MM-DD'
      });
    }
    
    // Validation du format de la date (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      console.log('Erreur: Format de date invalide:', date);
      return res.status(400).json({ 
        error: 'Format de date invalide',
        format: 'YYYY-MM-DD'
      });
    }
    
    console.log(`Recherche de créneaux P4 pour le ${date}${hour ? ` autour de ${hour}h` : ''}`);
    console.log('Type de hour:', typeof hour);
    
    // Utiliser la fonction getAllSlotsForDate du module P4
    console.log('Appel de getAllSlotsForDate avec:', { date, hour: hour || null, range: hour ? 3 : null });
    const slots = await p4PadelIndoor.getAllSlotsForDate(date, hour || null, hour ? 3 : null);
    
    console.log(`Nombre de créneaux trouvés: ${slots.length}`);
    if (slots.length > 0) {
      console.log('Premier créneau:', JSON.stringify(slots[0]));
    }
    
    // Adapter le format des créneaux pour le frontend en utilisant la configuration centralisée
    const p4Config = clubsConfig.p4padelindoor;
    const formattedSlots = slots.map(slot => ({
      id: `p4_${date}_${slot.court}_${slot.startTime.replace(':', '')}`,
      clubName: p4Config.name,
      clubId: p4Config.id,
      date,
      time: slot.startTime,
      endTime: slot.endTime,
      court: slot.court,
      price: slot.price || 0,
      type: p4Config.type,
      courtType: p4Config.courtType,
      available: true,
      address: p4Config.address,
      coordinates: {
        latitude: p4Config.latitude,
        longitude: p4Config.longitude
      }
    }));
    
    console.log(`Nombre de créneaux formatés: ${formattedSlots.length}`);
    
    res.json({
      date,
      count: formattedSlots.length,
      slots: formattedSlots
    });
    
  } catch (error) {
    console.error('Erreur lors de la recherche P4:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la recherche',
      message: error.message
    });
  }
});

module.exports = router;
