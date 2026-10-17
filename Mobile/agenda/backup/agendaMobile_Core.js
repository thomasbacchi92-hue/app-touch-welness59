/* agendaMobile_Core.js - Cervello Globale v2.0 (Isolamento Variabili & Session Check) */

var fbConfig = {
    apiKey: "AIzaSyCrDuK7SWHdbzrJR-pNpxmRwGnZgV2Dd2Y",
    authDomain: "touch-welness-massage.firebaseapp.com",
    databaseURL: "https://touch-welness-massage-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "touch-welness-massage",
    storageBucket: "touch-welness-massage.firebasestorage.app"
};

if (!firebase.apps.length) firebase.initializeApp(fbConfig);

// --- PROTEZIONE SESSIONE ---
var TW_CORE_sId = localStorage.getItem("tw_structure_id");
var TW_CORE_uNick = localStorage.getItem("tw_user");

if (!TW_CORE_sId || TW_CORE_sId === "undefined") {
    console.error("SESSIONE ASSENTE: Reindirizzamento al login...");
    window.location.replace("../login.html");
}

// --- VARIABILI GLOBALI PROTETTE ---
var TW_CORE_db = { app: {}, requests: {}, settings: {}, staff: [], servizi: [] };
var TW_CORE_uKey = null; 
var TW_CORE_uData = null;
var globalCustomersList = [];
window.currentOpenedCustomerId = null;
var currentView = 'agenda';

// --- UTILITY: NORMALIZZAZIONE DATE ISO (PUNTO 2) ---
function TW_CORE_formatToISO(dateStr) {
    if (!dateStr) return "";
    // Se è già YYYY-MM-DD ritorna
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    // Se è DD/MM/YYYY converte
    var parts = dateStr.split('/');
    if (parts.length === 3) {
        return parts[2] + "-" + parts[1].padStart(2, '0') + "-" + parts[0].padStart(2, '0');
    }
    return dateStr;
}

function showToast(msg) { 
    var t = document.getElementById("toastBlue"); 
    var m = document.getElementById("toastMsg");
    if(t && m) { m.innerText = msg; t.classList.add('show'); setTimeout(function(){ t.classList.remove('show'); }, 3000); }
}

// --- INIZIALIZZAZIONE DATI ---
if (TW_CORE_sId) {
    var structRef = firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + TW_CORE_sId);
    
    structRef.child('app').on('value', function(snap) { 
        TW_CORE_db.app = snap.val() || {}; 
        m_renderAll(); 
    });
    
    structRef.child('requests').on('value', function(snap) { 
        TW_CORE_db.requests = snap.val() || {}; 
        m_renderAll(); 
    });

    structRef.child('settings').on('value', function(snap) { 
        TW_CORE_db.settings = snap.val() || {}; 
        m_renderAll(); 
    });

    firebase.database().ref('MASTER_ADMIN_DB/users').orderByChild('structureId').equalTo(TW_CORE_sId).on('value', function(snap) {
        var users = snap.val() || {};
        TW_CORE_db.staff = Object.entries(users).map(function(e) { return { id: e[0], nick: e[1].nick, name: e[1].name, surname: e[1].surname, color: e[1].color }; });
        
        var found = Object.entries(users).find(function(u) { return u[1].nick === TW_CORE_uNick; });
        if (found) { TW_CORE_uKey = found[0]; TW_CORE_uData = found[1]; if(typeof m_renderProfilo === 'function') m_renderProfilo(); }
        m_renderAll();
    });

    firebase.database().ref('MASTER_ADMIN_DB/global_treatments').on('value', function(snap) {
        var treats = snap.val() || {};
        TW_CORE_db.servizi = Object.entries(treats).map(function(e) { return { id: e[0], nome: e[1].nome, prezzo: e[1].prezzo, durata: e[1].durata }; });
    });

    firebase.database().ref('MASTER_ADMIN_DB/global_customers').on('value', function(snap) {
        var custs = snap.val() || {};
        globalCustomersList = Object.entries(custs).map(function(e) { return { id: e[0], name: e[1].name, surname: e[1].surname, tel: e[1].tel, email: e[1].email }; });
    });
}

function m_switchView(viewName) {
    currentView = viewName;
    document.querySelectorAll('.view-page').forEach(function(e) { e.classList.remove('active'); });
    document.querySelectorAll('.nav-item').forEach(function(e) { e.classList.remove('active'); });
    
    var targetView = document.getElementById('view-' + viewName);
    if(targetView) targetView.classList.add('active');
    
    var targetNav = document.getElementById('nav-' + viewName);
    if(targetNav) targetNav.classList.add('active');

    var title = document.getElementById('mainHeaderTitle');
    var dCtrl = document.getElementById('headerDateCtrl');

    if(viewName === 'agenda') { if(title) title.innerText = "Agenda Cabine"; if(dCtrl) dCtrl.style.display = "flex"; }
    else { if(dCtrl) dCtrl.style.display = "none"; }
    
    if(viewName === 'cabina') { 
        if(title) title.innerText = "Assistente Cabina"; 
        document.body.style.background = "#000"; 
        if(typeof m_renderMyClients === 'function') m_renderMyClients();
    } else { 
        document.body.style.background = "var(--bg-body)"; 
    }

    if(viewName === 'lista' && title) title.innerText = "Lista Completa";
    if(viewName === 'menu' && title) title.innerText = "Impostazioni";
    
    m_renderAll();
}

function m_renderAll() {
    if(currentView === 'agenda' && typeof m_renderAgenda === 'function') m_renderAgenda();
    if(currentView === 'lista' && typeof m_renderLista === 'function') m_renderLista();
}

function normalizeFbArray(val) {
    if(!val) return [];
    if(Array.isArray(val)) return val.filter(Boolean);
    return Object.values(val).filter(Boolean);
}