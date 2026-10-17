/* agenda/Mobile_Panoramica.js - Panoramica Fluida (Punto 5 - Original Pro) */

window.isPanoramica = false;
window.panoramicaCols = 5; 
var initialPinchDistance = null;
var initialCols = 5;

// Calcola dinamicamente le cabine realmente attive in questo resort
function getActiveCabinsCount() {
    var count = 2; // Valore di sicurezza
    if (window.db && window.db.settings && window.db.settings.cabine_config) {
        var config = window.db.settings.cabine_config;
        var arr = Array.isArray(config) ? config : Object.values(config);
        count = arr.filter(c => c.attiva !== false && c.attiva !== "false").length;
    } else if (window.db && window.db.settings && window.db.settings.cabine) {
        count = parseInt(window.db.settings.cabine) || 5;
    }
    return count > 0 ? count : 1;
}

document.addEventListener('touchstart', function(e) {
    if (window.isPanoramica && e.touches.length === 2) {
        initialPinchDistance = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        initialCols = window.panoramicaCols;
    }
}, {passive: false});

document.addEventListener('touchmove', function(e) {
    if (window.isPanoramica && e.touches.length === 2) {
        if (initialPinchDistance) {
            var currentDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            
            var scale = initialPinchDistance / currentDistance; 
            var newCols = initialCols * scale;
            
            // Limite superiore blindato al numero reale di cabine (max 5)
            var maxCols = Math.min(getActiveCabinsCount(), 5);
            
            if (newCols < 1) newCols = 1;
            if (newCols > maxCols) newCols = maxCols;
            
            window.panoramicaCols = newCols;
            document.documentElement.style.setProperty('--pan-cols', newCols);
        }
    }
}, {passive: true});

document.addEventListener('touchend', function(e) {
    if (e.touches.length < 2) {
        initialPinchDistance = null;
    }
});

window.m_togglePanoramica = function() {
    var grid = document.getElementById("agendaGrid");
    if(!grid) return;
    
    window.isPanoramica = !window.isPanoramica;
    
    if(window.isPanoramica) {
        grid.classList.add("panoramica-attiva");
        
        // Calcolo della larghezza iniziale perfetta
        var activeCount = getActiveCabinsCount();
        var limitCols = Math.min(activeCount, 5);
        
        window.panoramicaCols = limitCols; 
        document.documentElement.style.setProperty('--pan-cols', limitCols);
    } else {
        grid.classList.remove("panoramica-attiva");
    }
};

window.m_zoomToCabinaAndOra = function(cabNum, ora) {
    if(!window.isPanoramica) return;
    
    window.m_togglePanoramica(); 
    
    setTimeout(function() {
        var col = document.querySelector('.colonna[data-cab-id="' + cabNum + '"]');
        if(col) {
            col.scrollIntoView({ behavior: "instant", inline: "start", block: "start" });
            
            setTimeout(function() {
                var slot = col.querySelector('.slot[data-ora="' + ora + '"]');
                if(slot) {
                    slot.scrollIntoView({ behavior: "smooth", block: "center" });
                }
            }, 150);
        }
    }, 150);
};