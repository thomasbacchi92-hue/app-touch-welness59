/* master core/Desktop_AuthSync.js - Cervello Globale, Filtro Fantasmi e Sync Race Condition (Desktop) */

const fbConfig = {
    apiKey: "AIzaSyCrDuK7SWHdbzrJR-pNpxmRwGnZgV2Dd2Y",
    authDomain: "touch-welness-massage.firebaseapp.com",
    databaseURL: "https://touch-welness-massage-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "touch-welness-massage",
    storageBucket: "touch-welness-massage.firebasestorage.app"
};

if (!firebase.apps.length) firebase.initializeApp(fbConfig);

window.twStructId = localStorage.getItem("tw_structure_id");
window.db = { app: {}, requests: {}, settings: {}, staff: [], servizi: [], chiusure: {} };
window.globalCustomers = [];
window.tempSelectedServiceId = null;
window.currentOpenedCustomerId = null;

window.pendingSecurityAction = null;
window.allUsersData = {};

window.bypassShadow = false;
window.tempShadowApp = null;
window.tempShadowOldDate = null;
window.tempShadowMoveData = null;
window.isDraggingApp = false;
window.draggedAppId = null; 
window.searchContextAppId = null; 

// UTILITY ANTI-CORRUZIONE FIREBASE
window.normalizeFbArray = function(val) {
    if(!val) return [];
    if(Array.isArray(val)) return val.filter(x => x && x.id);
    return Object.values(val).filter(x => x && x.id);
};

// SCUDO ANTI-CRASH POTENZIATO: Protezione per i nuovi campi opzionali
window.sanitizePayload = function(obj) {
    let cleanObj = { ...obj };
    
    // Forzatura stringa vuota per i nuovi campi se non compilati (evita il crash di Firebase)
    if (cleanObj.fattura === undefined) cleanObj.fattura = "";
    if (cleanObj.codCliente === undefined) cleanObj.codCliente = "";

    Object.keys(cleanObj).forEach(key => {
        if (cleanObj[key] === undefined || (typeof cleanObj[key] === 'number' && isNaN(cleanObj[key]))) {
            if(key === 'cab') cleanObj[key] = 1;
            else if(key === 'dur') cleanObj[key] = 30;
            else if(key === 'price' || key === 'basePrice' || key === 'discountValue') cleanObj[key] = 0;
            else delete cleanObj[key];
        }
    });
    return cleanObj;
};

if (window.twStructId) {
    firebase.database().ref('MASTER_ADMIN_DB/users').on('value', snap => {
        window.allUsersData = snap.val() || {};
        const authSelect = document.getElementById('authOperatorSelect');
        if(authSelect) {
            const prevVal = authSelect.value;
            authSelect.innerHTML = '<option value="">-- Chi sta eseguendo l\'operazione? --</option>';
            Object.values(window.allUsersData).forEach(u => {
                // FILTRO ANTI-FANTASMA
                const isGhost = (u.attivo === false || u.attiva === false || u.eliminato === true || u.deleted === true || u.attivo === "false" || u.attiva === "false" || u.eliminato === "true" || u.deleted === "true");
                if(String(u.structureId) === String(window.twStructId) && !isGhost) {
                    authSelect.innerHTML += `<option value="${u.nick}">${u.name} ${u.surname || ''} (${u.nick})</option>`;
                }
            });
            authSelect.value = prevVal;
        }
        
        // GRILLETTO GRAFICO
        if(typeof window.render === 'function') window.render();
    });

    const dbRefLocal = firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + window.twStructId);
    
    dbRefLocal.on('value', snap => {
        const val = snap.val() || {};
        window.db.app = val.app || {};
        window.db.requests = val.requests || {}; 
        window.db.settings = val.settings || {};
        window.db.chiusure = val.chiusure || {}; 
        
        window.db.staff = window.normalizeFbArray(val.staff);
        window.db.servizi = window.normalizeFbArray(val.servizi);
        
        if(typeof window.render === 'function') window.render();
    });

    firebase.database().ref('MASTER_ADMIN_DB/global_customers').on('value', snap => {
        window.globalCustomers = Object.entries(snap.val() || {}).map(([k, v]) => ({ id: k, ...v }));
        if(document.getElementById('crmView') && document.getElementById('crmView').style.display !== 'none') {
            if(typeof window.sysRenderLocalCRM === 'function') window.sysRenderLocalCRM();
        }
    });
}

window.addEventListener('DOMContentLoaded', () => {
    const privacyBoxes = document.querySelectorAll('.privacy-box');
    if(privacyBoxes.length > 1) { for(let i=1; i<privacyBoxes.length; i++) privacyBoxes[i].remove(); }

    if(document.getElementById("mainDate")) {
        const d = new Date();
        document.getElementById("mainDate").value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        if(typeof window.render === 'function') window.render(); 
    }
});

window.isDayClosed = function(dateStr) {
    return window.db.chiusure && window.db.chiusure[dateStr] && window.db.chiusure[dateStr].closed === true;
};

window.sysApplyAgendaUI = function() {
    const uiSettings = (window.db.settings && window.db.settings.agenda_ui) ? window.db.settings.agenda_ui : {};
    document.querySelectorAll('[data-toggle]').forEach(el => {
        const key = el.getAttribute('data-toggle');
        const isVisible = uiSettings[key] !== false; 
        if(isVisible) { el.classList.remove('hidden-by-settings'); } 
        else { el.classList.add('hidden-by-settings'); }
    });
};

window.sysChangeDate = function(offset) {
    const picker = document.getElementById("mainDate");
    if(picker && picker.value) {
        const d = new Date(picker.value); d.setDate(d.getDate() + offset);
        picker.value = d.toISOString().split('T')[0];
        if(typeof window.render === 'function') window.render();
    }
};

window.sysClosePanelAndNotify = function(msg) {
    const sf = document.getElementById('sideForm');
    if(sf) { sf.classList.remove('active'); sf.classList.remove('request-mode'); }
    if(typeof window.showToast === 'function') window.showToast(msg || "Operazione completata");
};

window.showToast = function(msg) { 
    const x = document.getElementById("toastBlue"); 
    if(x) { 
        document.getElementById("toastMsg").innerText = msg; 
        x.style.background = "var(--toast-blue, #2563eb)";
        x.style.color = "white";
        x.className = "show"; 
        setTimeout(() => x.className = x.className.replace("show", ""), 3000); 
    } 
};

window.showErrorToast = function(msg) {
    const x = document.getElementById("toastBlue"); 
    if(x) { 
        document.getElementById("toastMsg").innerText = msg; 
        x.style.background = "var(--red)";
        x.style.color = "white";
        x.className = "show"; 
        setTimeout(() => {
            x.className = x.className.replace("show", "");
            setTimeout(() => {
                x.style.background = "var(--toast-blue, #2563eb)";
                x.style.color = "white";
            }, 500);
        }, 3000); 
    }
};

window.closeSidebar = function(e, force = false) { 
    if(force || !e || (!e.target.closest('.sidebar') && !e.target.closest('.slot') && !e.target.closest('.modal-box') && !e.target.closest('.btn-quick-eseg'))) {
        const sf = document.getElementById('sideForm');
        if(sf) { sf.classList.remove('active'); sf.classList.remove('request-mode'); }
    }
};