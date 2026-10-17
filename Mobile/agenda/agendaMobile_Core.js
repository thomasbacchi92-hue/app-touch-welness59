/* agenda/agendaMobile_Core.js - Cervello Globale e Iniezione Calendario Custom */

var fbConfig = {
    apiKey: "AIzaSyCrDuK7SWHdbzrJR-pNpxmRwGnZgV2Dd2Y",
    authDomain: "touch-welness-massage.firebaseapp.com",
    databaseURL: "https://touch-welness-massage-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "touch-welness-massage",
    storageBucket: "touch-welness-massage.firebasestorage.app"
};

if (!firebase.apps.length) firebase.initializeApp(fbConfig);

function checkSession() {
    var token = localStorage.getItem("tw_token");
    var loginTime = localStorage.getItem("tw_login_timestamp");
    var now = Date.now();
    var threeDays = 3 * 24 * 60 * 60 * 1000;

    if (!token || !loginTime || (now - parseInt(loginTime) > threeDays)) {
        localStorage.removeItem("tw_token");
        localStorage.removeItem("tw_login_timestamp");
        window.location.href = "../login.html";
        return false;
    }
    return true;
}

window.sId = localStorage.getItem("tw_structure_id");
window.uNick = localStorage.getItem("tw_user");
window.db = { app: {}, requests: {}, settings: {}, staff: [], servizi: [] };
window.uKey = null; 
window.uData = null;
window.globalCustomersList = [];
window.currentOpenedCustomerId = null;
window.currentView = 'agenda';

// Variabili globali Calendario Custom
window.calCurrentMonth = new Date().getMonth();
window.calCurrentYear = new Date().getFullYear();
window.calTargetInput = null;
window.calTargetText = null;

checkSession();

function showToast(msg) { 
    var t = document.getElementById("toastBlue"); 
    if(!t) return;
    document.getElementById("toastMsg").innerText = msg; 
    t.classList.add("show"); 
    setTimeout(function() { t.classList.remove("show"); }, 3000); 
}

function normalizeFbArray(val) {
    if(!val) return [];
    if(typeof val !== 'object') return [];
    if(Array.isArray(val)) return val.filter(function(x) { return x && typeof x === 'object'; });
    return Object.keys(val).map(function(key) {
        var obj = val[key];
        if (obj && typeof obj === 'object') { if (!obj.id) obj.id = key; return obj; }
        return null;
    }).filter(function(x) { return x !== null; });
}

document.addEventListener('DOMContentLoaded', function() {
    var td = new Date();
    var localDate = new Date(td.getTime() - (td.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    
    var mDate = document.getElementById("mainDate");
    if(mDate) mDate.value = localDate;
    
    var fakeText = document.getElementById("fakeDateText");
    if(fakeText) fakeText.innerText = localDate.split('-').reverse().join('/');
    
    var cMonth = document.getElementById("commMonth");
    if(cMonth) cMonth.value = localDate.substring(0, 7);
    
    if(localStorage.getItem('tw_theme') === 'light') document.documentElement.classList.add('light-theme');

    // INIEZIONE SICURA DEL CALENDARIO CUSTOM
    m_injectCustomCalendar();

    setTimeout(function() {
        if(typeof m_renderAll === 'function') m_renderAll();
    }, 150);
});

// LOGICA E GRAFICA CALENDARIO CUSTOM INTEGRATO
function m_injectCustomCalendar() {
    if(document.getElementById('customCalendarModal')) return;
    var modal = document.createElement('div');
    modal.id = "customCalendarModal";
    modal.className = "modal-overlay";
    modal.style.cssText = "display:none; z-index:10005;";
    modal.onclick = function(e) { if(e.target === this) m_closeCustomCalendar(); };
    modal.innerHTML = `
        <div class="modal-box" style="padding:0; overflow:hidden; max-width: 320px; border:1px solid var(--border-line); box-shadow:0 10px 40px rgba(0,0,0,0.6);">
            <div style="background:var(--bg-panel); border-bottom:1px solid var(--border-line); padding:15px; display:flex; justify-content:space-between; align-items:center;">
                <button onclick="m_changeCalendarMonth(-1)" style="background:transparent; border:none; color:var(--text-main); cursor:pointer; padding:5px;"><i class="material-icons-round">chevron_left</i></button>
                <div id="calMonthYear" style="font-weight:900; color:var(--accent); font-size:16px; text-transform:uppercase;"></div>
                <button onclick="m_changeCalendarMonth(1)" style="background:transparent; border:none; color:var(--text-main); cursor:pointer; padding:5px;"><i class="material-icons-round">chevron_right</i></button>
            </div>
            <div style="padding:15px; background:var(--bg-body);">
                <div style="display:grid; grid-template-columns:repeat(7, 1fr); gap:5px; text-align:center; font-size:10px; font-weight:bold; color:var(--text-muted); margin-bottom:10px; text-transform:uppercase;">
                    <div>Lun</div><div>Mar</div><div>Mer</div><div>Gio</div><div>Ven</div><div>Sab</div><div>Dom</div>
                </div>
                <div id="calDaysGrid" style="display:grid; grid-template-columns:repeat(7, 1fr); gap:5px;"></div>
            </div>
            <div style="padding:10px; background:var(--bg-panel); border-top:1px solid var(--border-line); display:flex; justify-content:flex-end;">
                <button class="btn-save btn-outline" style="width:auto; padding:8px 15px; font-size:12px; margin:0;" onclick="m_closeCustomCalendar()">ANNULLA</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

window.m_openCustomCalendar = function(inputId, textId) {
    window.calTargetInput = inputId;
    window.calTargetText = textId;
    
    var dVal = document.getElementById(inputId) ? document.getElementById(inputId).value : null;
    if(dVal) {
        var d = new Date(dVal);
        window.calCurrentMonth = d.getMonth();
        window.calCurrentYear = d.getFullYear();
    } else {
        var n = new Date();
        window.calCurrentMonth = n.getMonth();
        window.calCurrentYear = n.getFullYear();
    }
    
    var modal = document.getElementById('customCalendarModal');
    if(modal) {
        modal.style.display = 'flex';
        m_renderCalendar();
    }
};

window.m_closeCustomCalendar = function() {
    var modal = document.getElementById('customCalendarModal');
    if(modal) modal.style.display = 'none';
};

window.m_changeCalendarMonth = function(delta) {
    window.calCurrentMonth += delta;
    if(window.calCurrentMonth > 11) { window.calCurrentMonth = 0; window.calCurrentYear++; }
    else if(window.calCurrentMonth < 0) { window.calCurrentMonth = 11; window.calCurrentYear--; }
    m_renderCalendar();
};

window.m_renderCalendar = function() {
    var monthNames = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
    var titleEl = document.getElementById("calMonthYear");
    if(titleEl) titleEl.innerText = monthNames[window.calCurrentMonth] + " " + window.calCurrentYear;
    
    var firstDay = new Date(window.calCurrentYear, window.calCurrentMonth, 1).getDay();
    if(firstDay === 0) firstDay = 7; 
    var daysInMonth = new Date(window.calCurrentYear, window.calCurrentMonth + 1, 0).getDate();
    
    var grid = document.getElementById("calDaysGrid");
    if(!grid) return;
    grid.innerHTML = "";
    
    var today = new Date();
    var todayStr = today.getFullYear() + "-" + String(today.getMonth()+1).padStart(2,'0') + "-" + String(today.getDate()).padStart(2,'0');
    
    var selVal = document.getElementById(window.calTargetInput) ? document.getElementById(window.calTargetInput).value : "";

    for(var i=1; i<firstDay; i++) { grid.innerHTML += `<div></div>`; }
    
    for(var i=1; i<=daysInMonth; i++) {
        var dateStr = window.calCurrentYear + "-" + String(window.calCurrentMonth+1).padStart(2,'0') + "-" + String(i).padStart(2,'0');
        var isToday = (dateStr === todayStr);
        var isSelected = (dateStr === selVal);
        
        var baseStyle = "padding:10px; border-radius:10px; text-align:center; font-weight:bold; cursor:pointer; font-size:14px; transition:0.2s;";
        var currentStyle = "color:var(--text-main); background:var(--bg-panel); border:1px solid var(--border-line);";
        
        if(isSelected) {
            currentStyle = "color:#fff; background:var(--accent); border:none; box-shadow:0 2px 8px rgba(56,189,248,0.4);";
        } else if(isToday) {
            currentStyle = "color:var(--accent); background:rgba(56,189,248,0.1); border:1px solid var(--accent);";
        }
        
        grid.innerHTML += `<div style="${baseStyle} ${currentStyle}" onclick="m_selectCalendarDate('${dateStr}')">${i}</div>`;
    }
};

window.m_selectCalendarDate = function(dateStr) {
    var inp = document.getElementById(window.calTargetInput);
    var txt = document.getElementById(window.calTargetText);
    if(inp) {
        inp.value = dateStr;
        if(inp.onchange) inp.onchange(); 
    }
    if(txt) {
        txt.innerText = dateStr.split('-').reverse().join('/');
    }
    m_closeCustomCalendar();
};

firebase.database().ref('MASTER_ADMIN_DB/global_customers').on('value', function(snap) {
    window.globalCustomersList = Object.entries(snap.val() || {}).map(function(arr) { return Object.assign({ id: arr[0] }, arr[1]); });
});

firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + window.sId).on('value', function(snap) {
    var val = snap.val() || {};
    window.db.app = val.app || {}; 
    window.db.settings = val.settings || {};
    window.db.staff = normalizeFbArray(val.staff);
    window.db.servizi = normalizeFbArray(val.servizi);
    if(typeof m_renderAll === 'function') m_renderAll(); 
});

firebase.database().ref('MASTER_ADMIN_DB/users').on('value', function(snap) {
    var users = snap.val() || {};
    for(var key in users) { if(users[key].nick === window.uNick) { window.uKey = key; window.uData = users[key]; break; } }
    if(typeof m_renderProfilo === 'function') m_renderProfilo(); 
    if(typeof m_calcCommissions === 'function') m_calcCommissions();
});

// MODIFICA CHIRURGICA: Gestione dinamica dello switch delle schermate
function m_switchView(viewName) {
    window.currentView = viewName;

    // Spegne tutte le sezioni .app-view
    document.querySelectorAll('.app-view').forEach(function(el) {
        el.classList.remove('active');
    });

    // Spegne tutti i pulsanti navigazione
    document.querySelectorAll('.nav-item, .mobile-bottom-bar div').forEach(function(el) {
        el.classList.remove('active');
    });

    // Accende la sezione scelta
    var targetView = document.getElementById('view-' + viewName);
    if(targetView) targetView.classList.add('active');
    
    var targetNav = document.getElementById('nav-' + viewName);
    if(targetNav) targetNav.classList.add('active');

    // Gestione Header e Toolbar (I 3 pulsanti e la data)
    var dCtrl = document.getElementById('headerDateCtrl');
    var topTools = document.getElementById('agendaTopButtons');

    if(viewName === 'agenda') {
        if(dCtrl) dCtrl.style.display = "flex";
        if(topTools) topTools.style.display = "flex";
    } else {
        if(dCtrl) dCtrl.style.display = "none";
        if(topTools) topTools.style.display = "none";
    }

    if(viewName === 'cabina') { 
        document.body.style.background = "#000"; 
        if(typeof m_renderMyClients === 'function') m_renderMyClients();
    } else { 
        document.body.style.background = "var(--bg-body)"; 
    }

    m_renderAll();
}

function m_renderAll() {
    if(window.currentView === 'agenda' && typeof m_renderAgenda === 'function') m_renderAgenda();
    if(window.currentView === 'lista' && typeof m_renderLista === 'function') m_renderLista();
    if(window.currentView === 'cabina' && typeof m_renderMyClients === 'function') m_renderMyClients();
}

function m_logout() {
    localStorage.removeItem("tw_token");
    localStorage.removeItem("tw_login_timestamp");
    window.location.href = "../login.html";
}