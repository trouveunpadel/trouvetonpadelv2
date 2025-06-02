/**
 * Module d'extraction optimisé des créneaux pour MonkeyPadel
 * Version finale qui capture tous les créneaux, y compris ceux de 7h30
 * Inclut les informations sur les types de terrains (intérieur/extérieur)
 */

/**
 * Extrait les créneaux disponibles à partir d'une page Puppeteer
 * @param {Page} page - Instance de page Puppeteer
 * @returns {Promise<Array>} - Liste des créneaux disponibles
 */
async function extractSlots(page) {
  // Faire défiler horizontalement pour s'assurer que tous les terrains sont visibles
  await page.evaluate(() => {
    // Fonction pour faire défiler horizontalement
    const scrollRight = () => {
      const container = document.querySelector('#main-swipe-container');
      if (container) {
        container.scrollLeft = container.scrollWidth;
      }
    };
    
    // Exécuter le défilement
    scrollRight();
  });
  
  // Attendre un moment pour que le défilement se termine
  await page.waitForTimeout(500);
  
  // Extraire les créneaux avec une approche différente
  return await page.evaluate(() => {
    // Configuration des types de terrains
    const courtTypes = {
      'Piste extérieure 01': 'Extérieur',
      'Piste extérieure 02': 'Extérieur',
      'Piste extérieure 03': 'Extérieur',
      'Piste extérieure 04': 'Extérieur',
      'Piste indoor 01': 'Intérieur',
      'Piste indoor 02': 'Intérieur',
      'Piste indoor 03': 'Intérieur',
      'Piste indoor 04': 'Intérieur'
    };
    // Fonction pour extraire les créneaux d'un terrain spécifique
    function extractSlotsFromCourt(courtContainer) {
      const courtSlots = [];
      
      // Extraire le nom du terrain
      const courtNameElement = courtContainer.querySelector('.schedule-header-name .media-body');
      const courtName = courtNameElement ? courtNameElement.textContent.trim() : "Terrain inconnu";
      
      // Trouver tous les créneaux dans ce terrain (inclure à la fois slot-free-full et slot-free)
      // Utiliser une sélection plus large pour capturer tous les créneaux
      const allSlots = courtContainer.querySelectorAll('a.slot');
      
      // Débogage: afficher tous les créneaux trouvés
      console.log(`${courtName}: ${allSlots.length} créneaux trouvés au total`);
      console.log(`${courtName}: ${courtContainer.querySelectorAll('a.slot-free, a.slot-free-full').length} créneaux libres`);
      
      // Débogage: vérifier s'il y a des créneaux de 7h30
      const slots730 = Array.from(allSlots).filter(s => {
        const timeStart = s.getAttribute('data-timestart');
        return timeStart && parseInt(timeStart) === 450; // 450 minutes = 7h30
      });
      console.log(`${courtName}: ${slots730.length} créneaux de 7h30`);
      
      // Débogage: vérifier les classes des créneaux de 7h30
      slots730.forEach((slot, i) => {
        console.log(`${courtName} - Créneau 7h30 #${i}: classes=${slot.className}, isFree=${slot.classList.contains('slot-free') || slot.classList.contains('slot-free-full')}`);
      });
      
      // Parcourir tous les créneaux
      allSlots.forEach(slot => {
        try {
          // Vérifier si c'est un créneau libre
          const isFree = slot.classList.contains('slot-free') || slot.classList.contains('slot-free-full');
          if (!isFree) return;
          
          // Extraire l'heure de début
          const timeStartAttr = slot.getAttribute('data-timestart');
          if (!timeStartAttr) return;
          
          const timeStart = parseInt(timeStartAttr);
          const startHour = Math.floor(timeStart / 60);
          const startMinute = timeStart % 60;
          
          // Extraire la durée
          const durationAttr = slot.getAttribute('data-duration');
          const durationMinutes = durationAttr ? parseInt(durationAttr) : 90; // Durée par défaut
          
          // Calculer l'heure de fin
          const startTimeMinutes = startHour * 60 + startMinute;
          const endTimeMinutes = startTimeMinutes + durationMinutes;
          const endHour = Math.floor(endTimeMinutes / 60);
          const endMinute = endTimeMinutes % 60;
          
          // Formater les heures
          const formattedStartTime = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
          const formattedEndTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
          
          // Déterminer le type de terrain (intérieur/extérieur)
          const courtType = courtTypes[courtName] || 'Non spécifié';
          
          // Ajouter le créneau extrait avec le type de terrain
          courtSlots.push({
            time: formattedStartTime,
            endTime: formattedEndTime,
            court: courtName,
            courtType: courtType,  // Ajout du type de terrain
            duration: `${Math.floor(durationMinutes / 60)}h${durationMinutes % 60 ? (durationMinutes % 60) + 'min' : ''}`,
            durationMinutes,
            club: 'MonkeyPadel',
            date: document.querySelector('.planning-date')?.textContent.trim() || new Date().toLocaleDateString('fr-FR')
          });
        } catch (error) {
          console.error(`Erreur lors de l'extraction d'un créneau pour ${courtName}:`, error.toString());
        }
      });
      
      return courtSlots;
    }
    
    // Trouver tous les conteneurs de terrains
    const courtContainers = document.querySelectorAll('.schedule-container');
    console.log(`${courtContainers.length} conteneurs de terrains trouvés`);
    
    // Compter le nombre total de créneaux disponibles
    const totalFreeSlots = document.querySelectorAll('.slot-free-full, .slot-free').length;
    console.log(`${totalFreeSlots} créneaux libres trouvés au total`);
    
    // Extraire les créneaux de chaque terrain
    let allSlots = [];
    courtContainers.forEach((container, index) => {
      const courtSlots = extractSlotsFromCourt(container);
      console.log(`Terrain #${index}: ${courtSlots.length} créneaux extraits`);
      allSlots = allSlots.concat(courtSlots);
    });
    
    console.log(`${allSlots.length} créneaux extraits au total`);
    return allSlots;
  });
}

module.exports = {
  extractSlots
};
