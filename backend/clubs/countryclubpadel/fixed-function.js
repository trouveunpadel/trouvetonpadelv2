/**
 * Extrait les créneaux disponibles d'une réponse HTML
 * @param {Object} $ - Instance Cheerio chargée avec le HTML
 * @param {Date} date - Date de recherche
 * @returns {Array} - Liste des créneaux disponibles
 */
function extractSlotsFromHtml($, date) {
  let availableSlots = [];
  
  try {
    // Vérifier si nous sommes sur la page de réservation
    if ($('.reservation-container-wrapper').length === 0) {
      console.log('Page de réservation non trouvée, vérifiez les cookies');
      return [];
    }
    
    // Créer un mapping des noms de terrains basé sur les en-têtes
    const courtMapping = {};
    $('.schedule-container').each((index, container) => {
      const $container = $(container);
      const scheduleId = $container.find('table.schedule-table-slots a.slot').first().attr('data-schedule');
      if (scheduleId) {
        const courtName = $container.find('.media-body.full-show.text-ellipsis').first().text().trim();
        if (courtName) {
          courtMapping[scheduleId] = courtName.replace(/\s+/g, ' ');
          console.log(`Mapping de terrain créé: schedule ${scheduleId} => "${courtName}"`);
        }
      }
    });
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // getMonth() est 0-indexé
    const day = String(date.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    
    // Forcer l'utilisation de la date fournie pour tous les créneaux
    console.log(`Utilisation forcée de la date ${formattedDate} pour tous les créneaux`);
    
    // Rechercher tous les créneaux disponibles
    // Utiliser le sélecteur spécifique pour les créneaux réellement disponibles
    const $slots = $('.slot.slot-free');
    console.log(`Sélecteur ".slot.slot-free" a trouvé ${$slots.length} créneaux`);
    
    // Sauvegarder un exemple de créneau et la page complète pour analyse
    if (process.env.NODE_ENV !== 'production' && $slots.length > 0) {
      const slotExample = $($slots[0]).prop('outerHTML');
      fs.writeFileSync(path.join(__dirname, 'slot-example.html'), slotExample);
      console.log('Exemple de créneau sauvegardé dans slot-example.html');
      
      // Sauvegarder également la page HTML complète pour analyse
      fs.writeFileSync(path.join(__dirname, 'last-response.html'), $.html());
      console.log('Page HTML complète sauvegardée dans last-response.html');
    }
    
    // Parcourir tous les créneaux disponibles
    $slots.each((index, element) => {
      const $slot = $(element);
      const slotHtml = $slot.html();
      
      // Extraire les informations du créneau
      let time = '';
      let court = '';
      let price = '';
      let slotId = '';
      
      // Essayer différentes méthodes pour extraire l'heure
      time = $slot.attr('data-time') || 
             $slot.find('.time').text().trim() || 
             $slot.find('.slot-time').text().trim();
      
      // Si l'heure n'est pas trouvée, essayer de l'extraire du texte du créneau
      if (!time) {
        const timeMatch = slotHtml.match(/\d{1,2}[h:]\d{0,2}/) || 
                         $slot.text().match(/\d{1,2}[h:]\d{0,2}/);
        if (timeMatch) {
          time = timeMatch[0];
        }
      }
      
      // Extraire l'ID du créneau
      slotId = $slot.attr('data-slot-id') || 
               $slot.attr('data-id') || 
               $slot.attr('id') || 
               $slot.attr('href')?.match(/slot=([^&]+)/)?.[1] || '';
      
      // Extraire le schedule ID qui nous permettra d'identifier le terrain
      const scheduleId = $slot.attr('data-schedule');
      
      // Utiliser le mapping pour obtenir le nom officiel du terrain
      if (scheduleId && courtMapping[scheduleId]) {
        court = courtMapping[scheduleId];
        console.log(`Utilisation du nom officiel du terrain: ${court} pour schedule ${scheduleId}`);
      } else {
        // Fallbacks pour le nom du terrain si le mapping ne fonctionne pas
        court = $slot.closest('.court-column').find('.court-name').text().trim() ||
                $slot.closest('[data-court]').attr('data-court') ||
                $slot.attr('data-court') ||
                $slot.closest('.court').find('.court-name').text().trim() ||
                `Terrain non identifié ${index + 1}`;
      }
      
      // Extraire le prix
      price = $slot.find('.price').text().trim() || 
              $slot.attr('data-price') || 
              '';
      
      // Formater la date du créneau
      const slotDate = formattedDate;
      
      // Si on a au moins une heure et un terrain, ajouter le créneau à la liste
      if (time) {
        const slotInfo = {
          club: 'Country Club Padel',
          date: slotDate,
          time: time || 'Heure non spécifiée',
          court: court || 'Terrain non spécifié',
          price: price,
          duration: '1h30',
          url: slotId ? `https://openresa.com/reservation/book?slot=${slotId}` : 'URL non disponible'
        };
        
        availableSlots.push(slotInfo);
      }
    });
    
    // Si aucun créneau n'a été trouvé avec les sélecteurs spécifiques,
    // essayer une approche plus générale
    if (availableSlots.length === 0) {
      console.log('Tentative d\'extraction avec une approche plus générale');
      
      // Rechercher tous les éléments qui pourraient être des créneaux
      $('a[href*="reservation/book"], a[href*="slot"]').each((index, element) => {
        const $link = $(element);
        const href = $link.attr('href');
        
        // Extraire l'ID du créneau de l'URL
        const slotId = href.match(/slot=([^&]+)/)?.[1] || '';
        
        // Extraire les informations du créneau
        let time = $link.find('.time').text().trim() || 
                  $link.text().match(/\d{1,2}[h:]\d{0,2}/)?.[0] || 
                  'Heure non spécifiée';
        
        let court = $link.closest('.court-column').find('.court-name').text().trim() ||
                   $link.closest('[data-court]').attr('data-court') ||
                   $link.attr('data-court') ||
                   `Terrain non identifié ${index + 1}`;
        
        // Formater la date du créneau
        const slotDate = formattedDate;
        
        // Créer l'objet créneau
        const slotInfo = {
          club: 'Country Club Padel',
          date: slotDate,
          time: time,
          court: court,
          price: '',
          duration: '1h30',
          url: `https://openresa.com/reservation/book?slot=${slotId}`
        };
        
        availableSlots.push(slotInfo);
      });
    }
    
    // Éliminer les doublons en utilisant une clé composée de l'heure et du terrain
    const uniqueSlots = [];
    const seenKeys = new Set();
    
    for (const slot of availableSlots) {
      const key = `${slot.time}-${slot.court}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueSlots.push(slot);
      }
    }
    
    availableSlots = uniqueSlots;
  } catch (error) {
    console.error('Erreur lors de l\'extraction des créneaux HTML:', error.message);
  }
  
  return availableSlots;
}
