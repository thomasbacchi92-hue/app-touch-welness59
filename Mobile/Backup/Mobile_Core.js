/* agenda/Mobile_Core.js - Cervello Globale */

if(!localStorage.getItem("tw_token")) window.location.href="../login.html";

const fbConfig = {
    apiKey: "AIzaSyCrDuK7SWHdbzrJR-pNpxmRwGnZgV2Dd2Y",
    authDomain: "touch-welness-massage.firebaseapp.com",
    databaseURL: "https://touch-welness-massage-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "touch-welness-massage",
    storageBucket: "touch-welness-massage.firebasestorage.app"
};

if (!firebase.apps.length) firebase.initializeApp(fbConfig);

const sId = localStorage.getItem("tw_structure_id");
const uNick = localStorage.getItem("tw_user");
let db = { app: {}, requests: {}, settings: {}, staff: [], servizi: [] };
let uKey = null; let uData = null;
let globalCustomersList = [];
window.currentOpenedCustomerId = null;
let currentView = 'agenda';

function showToast(msg) { 
    const t = document.getElementById("toastBlue"); 
    if(!t) return;
    document.getElementById("toastMsg").innerText = msg; 
    t.classList.add("show"); 
    setTimeout(() => t.classList.remove("show"), 3000); 
}

function normalizeFbArray(val) {
    if(!val) return [];
    if(typeof val !== 'object') return [];
    if(Array.isArray(val)) return val.filter(x => x && typeof x === 'object');
    return Object.keys(val).map(key => {
        let obj = val[key];
        if (obj && typeof obj === 'object') { if (!obj.id) obj.id = key; return obj; }
        return null;
    }).filter(x => x !== null);
}

firebase.database().ref('MASTER_ADMIN_DB/global_customers').on('value', snap => {
    globalCustomersList = Object.entries(snap.val() || {}).map(([k, v]) => ({ id: k, ...v }));
});

firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + sId).on('value', snap => {
    const val = snap.val() || {};
    db.app = val.app || {}; 
    db.requests = val.requests || {}; 
    db.settings = val.settings || {};
    db.staff = normalizeFbArray(val.staff);
    db.servizi = normalizeFbArray(val.servizi);
    if(typeof m_renderAll === 'function') m_renderAll(); 
});

firebase.database().ref('MASTER_ADMIN_DB/users').on('value', snap => {
    const users = snap.val() || {};
    for(let key in users) { if(users[key].nick === uNick) { uKey = key; uData = users[key]; break; } }
    if(typeof m_renderProfilo === 'function') m_renderProfilo(); 
    if(typeof m_calcCommissions === 'function') m_calcCommissions();
});

function m_switchView(viewName) {
    currentView = viewName;
    document.querySelectorAll('.app-view').forEach(e => e.classList.remove('active'));
    document.querySelectorAll('.mobile-bottom-bar .nav-item').forEach(e => e.classList.remove('active'));
    
    const targetView = document.getElementById('view-' + viewName);
    if(targetView) targetView.classList.add('active');
    
    const targetNav = document.getElementById('nav-' + viewName);
    if(targetNav) targetNav.classList.add('active');

    const title = document.getElementById('mainHeaderTitle');
    const dCtrl = document.getElementById('headerDateCtrl');

    if(viewName === 'agenda') { if(title) title.innerText = "Agenda Cabine"; if(dCtrl) dCtrl.style.display = "flex"; }
    if(viewName === 'lista') { if(title) title.innerText = "Lista Completa"; if(dCtrl) dCtrl.style.display = "none"; }
    if(viewName === 'piscina') { if(title) title.innerText = "Piscina e SPA"; if(dCtrl) dCtrl.style.display = "none"; }
    if(viewName === 'chat') { if(title) title.innerText = "Chat Direzione"; if(dCtrl) dCtrl.style.display = "none"; }
    if(viewName === 'menu') { if(title) title.innerText = "Impostazioni"; if(dCtrl) dCtrl.style.display = "none"; }
    
    if(viewName === 'cabina') { 
        if(title) title.innerText = "Assistente Cabina"; 
        if(dCtrl) dCtrl.style.display = "none"; 
        document.body.style.background = "#000"; 
        if(typeof m_renderMyClients === 'function' && document.getElementById('tab-btn-cliente') && document.getElementById('tab-btn-cliente').classList.contains('active')) m_renderMyClients();
    } else { 
        document.body.style.background = "var(--bg-body)"; 
    }
    
    if(typeof m_renderAll === 'function') m_renderAll();
}

function m_renderAll() {
    if(currentView === 'agenda' && typeof m_renderAgenda === 'function') m_renderAgenda();
    if(currentView === 'lista' && typeof m_renderLista === 'function') m_renderLista();
    if(currentView === 'cabina' && typeof m_renderMyClients === 'function') m_renderMyClients();
}

function m_logout() {
    localStorage.removeItem("tw_token");
    window.location.href="../login.html";
}

document.addEventListener('DOMContentLoaded', () => {
    const td = new Date();
    const mDate = document.getElementById("mainDate");
    if(mDate) mDate.value = td.toISOString().split('T')[0];
    if(localStorage.getItem('tw_theme') === 'light' || localStorage.getItem('tw_admin_theme') === 'light') {
        document.documentElement.classList.add('light-theme');
    }
});