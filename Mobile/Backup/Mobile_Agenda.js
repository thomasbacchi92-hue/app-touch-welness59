/* Mobile_Agenda.js - Fix Fantasmi Staff, CRM Sicuro, Scroll Panoramica Bloccato e UI Pulsanti */

let mRowHeight = 75; 
let isPanoramica = false;
let activeMoveAppId = null;
let lastSlotTapTime = 0;
let lastSlotTapId = null;
let m_longPressTimer = null;

// Gestore Annullamento Spostamento (Pressione Lunga)
document.addEventListener('touchstart', (e) => {
    if(activeMoveAppId) {
        m_longPressTimer = setTimeout(() => {
            m_cancelMove();
            if(typeof showToast === 'function') showToast("Spostamento annullato");
        }, 2000);
    }
}, {passive: true});
document.addEventListener('touchmove', () => { if(m_longPressTimer) clearTimeout(m_longPressTimer); }, {passive: true});
document.addEventListener('touchend', () => { if(m_longPressTimer) clearTimeout(m_longPressTimer); }, {passive: true});

function m_preventScroll(e) { e.preventDefault(); }

document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById("agendaGrid");
    if(grid) {
        grid.style.webkitUserSelect = "none";
        grid.style.userSelect = "none";
        grid.style.webkitTouchCallout = "none";
        grid.style.transition = "transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)";
        grid.oncontextmenu = (e) => { e.preventDefault(); return false; };
    }
    m_injectStyles(); 
    m_injectTopButtons();
    m_injectSearchModal();
});

function m_injectStyles() {
    if(document.getElementById("dynamicAgendaStyles")) return;
    const style = document.createElement("style");
    style.id = "dynamicAgendaStyles";
    style.innerHTML = `
        .fab, .floating-btn, .btn-floating, .mobile-fab { display: none !important; }
        .slot { touch-action: manipulation !important; }

        /* PANORAMICA BLINDATA */
        .agendaGrid-zoom { transform: scale(0.45) !important; transform-origin: top center !important; width: max-content !important; padding: 20px !important; background: transparent !important; display: flex !important; align-items: flex-start !important; }
        .agendaGrid-zoom .colonna { min-width: 320px !important; border-radius: 35px !important; box-shadow: 0 15px 35px rgba(0,0,0,0.15) !important; border: 6px solid var(--border-line) !important; background: var(--bg-panel) !important; margin: 0 15px !important; position: relative !important; overflow: hidden !important; touch-action: none !important;}
        .agendaGrid-zoom .col-head { position: sticky !important; top: 0 !important; z-index: 50 !important; font-size: 32px !important; padding: 25px !important; background: var(--bg-body) !important; border-bottom: 4px solid var(--border-line) !important; color: var(--accent) !important; text-align: center; font-weight: 900; box-shadow: 0 4px 10px rgba(0,0,0,0.1) !important; }
        
        .panoramica-overlay { display: none; }
        .agendaGrid-zoom .panoramica-overlay { display: block; position: absolute; inset: 0; z-index: 40; cursor: zoom-in; }

        .agendaGrid-zoom .time-row { border-bottom: 2px solid var(--border-line) !important; }
        .agendaGrid-zoom .time-lbl { font-size: 22px !important; color: var(--text-main) !important;}
        
        .moving-ghost { opacity: 0.40 !important; pointer-events: none !important; border: 3px dashed var(--accent) !important; box-shadow: 0 0 20px var(--accent) !important; z-index: 5 !important; }
        .move-dot { position: absolute; top: 5px; right: 5px; width: 28px; height: 28px; background: #fff; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; z-index: 30; cursor: pointer; border: 2px solid var(--accent); pointer-events: auto !important; }
        .cleaning-tag { position: absolute; bottom: -50px; left: 0; width: 100%; height: 50px; background: repeating-linear-gradient(45deg, transparent, transparent 5px, var(--border-line) 5px, var(--border-line) 10px); opacity: 0.3; border-radius: 0 0 10px 10px; pointer-events: none; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: bold; color: var(--text-main); }
    `;
    document.head.appendChild(style);
}

function m_injectTopButtons() {
    if(document.getElementById('injTopActions')) return; 
    const dateCtrl = document.querySelector('.date-controls') || document.body;
    const btnContainer = document.createElement('div');
    btnContainer.id = 'injTopActions';
    btnContainer.style.cssText = "display:flex; justify-content:center; gap:8px; padding:10px; background:var(--bg-panel); border-bottom:1px solid var(--border-line);";
    btnContainer.innerHTML = `
        <button onclick="m_openSearchEngine()" style="flex:1; padding:10px; border-radius:8px; border:2px solid var(--accent); background:var(--bg-body); color:var(--accent); font-weight:900; font-size:11px; display:flex; align-items:center; justify-content:center; gap:4px; cursor:pointer;"><i class="material-icons-round" style="font-size:16px;">search</i> TROVA</button>
        <button onclick="m_togglePanoramica()" style="flex:1; padding:10px; border-radius:8px; border:2px solid var(--border-line); background:var(--bg-body); color:var(--text-main); font-weight:900; font-size:11px; display:flex; align-items:center; justify-content:center; gap:4px; cursor:pointer;"><i class="material-icons-round" style="font-size:16px;">grid_view</i> PANORAMICA</button>
        <button onclick="m_openForm(event, '', 1, '10:00')" style="flex:1; padding:10px; border-radius:8px; border:none; background:var(--accent); color:#fff; font-weight:900; font-size:11px; display:flex; align-items:center; justify-content:center; gap:4px; cursor:pointer;"><i class="material-icons-round" style="font-size:16px;">add</i> NUOVO</button>
    `;
    if(dateCtrl !== document.body) dateCtrl.parentNode.insertBefore(btnContainer, dateCtrl.nextSibling);
    else document.body.prepend(btnContainer);
}

function m_togglePanoramica() {
    const grid = document.getElementById("agendaGrid");
    const viewAgenda = document.getElementById("view-agenda");
    if(!grid) return;
    
    isPanoramica = !isPanoramica;
    
    if(isPanoramica) {
        // SOLUZIONE SCROLL: Blocca forzatamente l'asse Y del contenitore padre
        if(viewAgenda) viewAgenda.style.overflowY = 'hidden';
        document.body.style.touchAction = 'none';
        
        let scrollY = viewAgenda ? viewAgenda.scrollTop : window.scrollY;
        grid.style.transformOrigin = `0px ${Math.max(0, scrollY - 20)}px`;
        grid.classList.add("agendaGrid-zoom");
    } else {
        if(viewAgenda) viewAgenda.style.overflowY = 'auto';
        document.body.style.touchAction = '';
        grid.classList.remove("agendaGrid-zoom");
    }
}

function m_zoomToCabina(cabNum, e) {
    if(e) e.stopPropagation();
    if(!isPanoramica) return;
    
    isPanoramica = false;
    const viewAgenda = document.getElementById("view-agenda");
    if(viewAgenda) viewAgenda.style.overflowY = 'auto';
    document.body.style.touchAction = '';
    
    const grid = document.getElementById("agendaGrid");
    if(grid) grid.classList.remove("agendaGrid-zoom");
    
    setTimeout(() => {
        const col = document.querySelector(`.colonna[data-cab-id="${cabNum}"]`);
        if(col) col.scrollIntoView({ behavior: "smooth", inline: "center", block: "start" });
    }, 350);
}

function m_startMoveMode(e, appId) {
    e.stopPropagation();
    if(isPanoramica) return; 
    activeMoveAppId = appId;
    if(typeof showToast === 'function') showToast("Spostamento in corso. Tieni premuto 2 secondi per annullare.");
    m_renderAll();
}

function m_cancelMove(e) {
    if(e) e.stopPropagation();
    activeMoveAppId = null;
    m_renderAll();
}

function m_handleSlotClick(e, cab, ora) {
    e.stopPropagation();
    if(isPanoramica) return; 

    if (activeMoveAppId) {
        const slotId = `${cab}-${ora}`;
        const now = Date.now();
        if (lastSlotTapId === slotId && (now - lastSlotTapTime) < 400) {
            m_executeMoveDoubleTap(activeMoveAppId, ora, cab);
            lastSlotTapId = null;
        } else {
            lastSlotTapId = slotId; lastSlotTapTime = now;
            let el = e.currentTarget; let old = el.style.background;
            el.style.background = "rgba(56, 189, 248, 0.4)";
            setTimeout(() => { el.style.background = old; }, 300);
        }
    } else {
        m_openForm(e, '', cab, ora);
    }
}

function m_executeMoveDoubleTap(appId, newOra, newCab) {
    const d = document.getElementById("mainDate").value; 
    let apps = normalizeFbArray(db && db.app && db.app[d] ? db.app[d] : []); 
    const idx = apps.findIndex(x => String(x.id) === String(appId));
    
    if(idx > -1) {
        const startMin = tToM(newOra); 
        const appDur = parseInt(apps[idx].dur) || 30; 
        const endMin = startMin + appDur;
        const currentSId = typeof sId !== 'undefined' ? sId : localStorage.getItem("tw_structure_id");

        let hasCollision = apps.some(a => { 
            if(String(a.id) === String(appId) || parseInt(a.cab) !== parseInt(newCab)) return false; 
            const aStart = tToM(a.ora); 
            const aEndWithClean = aStart + (parseInt(a.dur)||30) + 10; 
            const newEndWithClean = endMin + 10;
            return (startMin < aEndWithClean && newEndWithClean > aStart); 
        });

        if(hasCollision) { 
            m_cancelMove();
            return showToast("Bloccato: Sovrapposizione con appuntamento o pulizia!"); 
        }

        apps[idx].ora = newOra; apps[idx].cab = parseInt(newCab);
        firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + currentSId + '/app').child(d).set(apps).then(() => {
            m_cancelMove();
            if(typeof showToast === 'function') showToast("Appuntamento Spostato!"); 
            m_renderAll();
        });
    }
}

function m_changeDate(offset) {
    const p = document.getElementById("mainDate");
    if(!p) return;
    const d = new Date(p.value); d.setDate(d.getDate() + offset);
    p.value = d.toISOString().split('T')[0]; 
    if(activeMoveAppId) m_cancelMove();
    m_renderAll();
}
function tToM(t) { if(!t) return 0; const p = String(t).split(':'); return (parseInt(p[0])||0)*60 + (parseInt(p[1])||0); }
function mToT(m) { return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`; }

function m_renderAgenda() {
    const grid = document.getElementById("agendaGrid");
    const p = document.getElementById("mainDate");
    const d = p ? p.value : null; 
    if(!grid || !db || !d) return;

    const nCabine = (db.settings && db.settings.cabine) ? parseInt(db.settings.cabine) : 2;
    let dayApps = normalizeFbArray(db.app && db.app[d] ? db.app[d] : []);
    let dayReqs = normalizeFbArray(db.requests && db.requests[d] ? db.requests[d] : []);

    let h = "";
    for(let c = 1; c <= nCabine; c++) {
        h += `<div class="colonna" data-cab-id="${c}">
                <div class="col-head">CABINA ${c}</div>
                <div class="panoramica-overlay" onclick="m_zoomToCabina(${c}, event)"></div>`;
        
        for(let i=10*60; i<=20*60; i+=15) {
            const s = mToT(i); const sMin = i;
            const startApp = dayApps.find(x => { const xM = tToM(x.ora); return parseInt(x.cab) === c && xM >= sMin && xM < (sMin + 15); });
            const busyApp = dayApps.find(x => { const start = tToM(x.ora); return parseInt(x.cab) === c && sMin > start && sMin < start + (parseInt(x.dur) || 30); });
            const startReq = dayReqs.find(x => { if(x.status !== 'pending') return false; const xM = tToM(x.ora); return parseInt(x.cab) === c && xM >= sMin && xM < (sMin + 15); });
            const busyReq = dayReqs.find(x => { if(x.status !== 'pending') return false; const start = tToM(x.ora); return parseInt(x.cab) === c && sMin > start && sMin < start + (parseInt(x.dur) || 30); });

            if(startApp) {
                const isEseg = startApp.eseguito ? "eseguito-style" : "";
                const isMoving = (activeMoveAppId === String(startApp.id)) ? "moving-ghost" : "";
                const isSigned = !!(startApp.privacyLink && String(startApp.privacyLink).startsWith("http")) ? "border-left: 6px solid var(--green) !important;" : "";
                const slotsCount = Math.ceil((parseInt(startApp.dur) || 30) / 15);
                const hCss = `height: calc(${slotsCount * 100}% - 4px); top: 2px; ${isSigned}`;
                
                h += `<div class="time-row"><div class="time-lbl">${s}</div>
                      <div class="slot" data-ora="${s}" data-cab="${c}" onclick="m_handleSlotClick(event, ${c}, '${s}')">
                        <div class="app-base ${isEseg} ${isMoving}" style="${hCss}" onclick="if(!activeMoveAppId) m_openForm(event, '${startApp.id}')">
                            ${isMoving ? '' : `<div class="move-dot" onclick="m_startMoveMode(event, '${startApp.id}')"><i class="material-icons-round" style="font-size:16px; color:var(--accent);">open_with</i></div>`}
                            <div class="app-info-col" style="pointer-events:none; padding-right:30px; z-index:2; position:relative;">
                                <b>Cam ${startApp.cam || '?'} - ${startApp.cog || 'N.D.'}</b>
                                <span style="font-size:11px; opacity:0.9; margin-top:2px; display:block;"><i class="material-icons-round" style="font-size:11px; vertical-align:middle;">person</i> ${startApp.op || 'Nessun Op.'}</span>
                                <span style="font-size:10px; opacity:0.8; margin-top:1px; display:block;">${startApp.serv || '-'} (${startApp.dur||30}m)</span>
                            </div>
                        </div>
                        <div class="cleaning-tag" style="top:calc(${slotsCount * 100}%);"><i class="material-icons-round" style="font-size:10px; margin-right:3px;">cleaning_services</i> +10m Pulizia</div>
                      </div></div>`;
            } else if(busyApp) {
                h += `<div class="time-row"><div class="time-lbl">${s}</div><div class="slot" data-ora="${s}" data-cab="${c}" onclick="m_handleSlotClick(event, ${c}, '${s}')"><div class="app-busy" data-id="${busyApp.id}" onclick="if(!activeMoveAppId) m_openForm(event, '${busyApp.id}')"></div></div></div>`;
            } else if(startReq) {
                const slotsCount = Math.ceil((parseInt(startReq.dur) || 30) / 15);
                const hCss = `height: calc(${slotsCount * 100}% - 4px); top: 2px;`;
                h += `<div class="time-row"><div class="time-lbl">${s}</div>
                      <div class="slot" data-ora="${s}" data-cab="${c}" onclick="m_handleSlotClick(event, ${c}, '${s}')">
                        <div class="app-base req-style" style="${hCss}" onclick="if(!activeMoveAppId) m_openRequest(event, '${startReq.id}')">
                            <div class="app-info-col" style="pointer-events:none;">
                                <b><i class="material-icons-round" style="font-size:12px">notifications_active</i> RICHIESTA SPA</b>
                                <span style="font-size:10px; opacity:0.9;">Cam ${startReq.cam || '?'} - ${startReq.serv || '-'}</span>
                            </div>
                        </div>
                      </div></div>`;
            } else if(busyReq) {
                h += `<div class="time-row"><div class="time-lbl">${s}</div><div class="slot" data-ora="${s}" data-cab="${c}" onclick="m_handleSlotClick(event, ${c}, '${s}')"><div class="app-busy req-busy" onclick="if(!activeMoveAppId) m_openRequest(event, '${busyReq.id}')"></div></div></div>`;
            } else {
                h += `<div class="time-row"><div class="time-lbl">${s}</div><div class="slot" data-ora="${s}" data-cab="${c}" onclick="m_handleSlotClick(event, ${c}, '${s}')"></div></div>`;
            }
        }
        h += `</div>`;
    }
    grid.innerHTML = h;
}

// ==================== MOTORE DI RICERCA & SPOSTAMENTO RAPIDO ====================
function m_injectSearchModal() {
    if(document.getElementById("searchEngineModal")) return;
    const modal = document.createElement('div');
    modal.id = "searchEngineModal";
    modal.style.cssText = "display:none; position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:10000; flex-direction:column; justify-content:flex-end;";
    const today = new Date().toISOString().split('T')[0];
    modal.innerHTML = `
        <div style="background:var(--bg-panel); width:100%; height:85vh; border-radius:20px 20px 0 0; display:flex; flex-direction:column; overflow:hidden;">
            <div style="padding:15px; border-bottom:1px solid var(--border-line); display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin:0; font-size:16px; color:var(--accent);" id="searchModalTitle"><i class="material-icons-round" style="vertical-align:middle;">radar</i> Trova Disponibilità</h3>
                <i class="material-icons-round" style="font-size:24px; color:var(--text-muted); cursor:pointer;" onclick="document.getElementById('searchEngineModal').style.display='none'">close</i>
            </div>
            <div style="padding:15px; overflow-y:auto; flex:1; background:var(--bg-body);" id="searchFormArea">
                <div id="searchSimpleDateBox" style="margin-bottom:15px;">
                    <label style="font-size:11px; font-weight:bold; color:var(--text-muted);">DATA RICERCA</label>
                    <input type="date" id="searchDate" value="${today}" style="width:100%; padding:12px; border:1px solid var(--border-line); background:var(--bg-panel); color:var(--text-main); border-radius:8px; margin-top:5px; font-size:14px;">
                </div>
                <div style="margin-bottom:15px; text-align:right;">
                    <span onclick="m_toggleAdvancedSearch()" style="font-size:11px; font-weight:bold; color:var(--accent); text-decoration:underline; cursor:pointer;">+ Filtri Avanzati (Data da/a)</span>
                </div>
                <div id="searchAdvancedDateBox" style="display:none; margin-bottom:15px; gap:10px;">
                    <div style="flex:1;"><label style="font-size:11px; font-weight:bold; color:var(--text-muted);">DA DATA</label><input type="date" id="searchDateFrom" value="${today}" style="width:100%; padding:12px; border:1px solid var(--border-line); background:var(--bg-panel); color:var(--text-main); border-radius:8px; margin-top:5px; font-size:14px;"></div>
                    <div style="flex:1;"><label style="font-size:11px; font-weight:bold; color:var(--text-muted);">A DATA</label><input type="date" id="searchDateTo" value="${today}" style="width:100%; padding:12px; border:1px solid var(--border-line); background:var(--bg-panel); color:var(--text-main); border-radius:8px; margin-top:5px; font-size:14px;"></div>
                </div>
                <div style="margin-bottom:15px;">
                    <label style="font-size:11px; font-weight:bold; color:var(--text-muted);">DURATA TRATTAMENTO (MINUTI)</label>
                    <select id="searchDur" style="width:100%; padding:12px; border:1px solid var(--border-line); background:var(--bg-panel); color:var(--text-main); border-radius:8px; margin-top:5px; font-size:14px;">
                        <option value="15">15 Minuti</option><option value="30" selected>30 Minuti</option><option value="45">45 Minuti</option><option value="50">50 Minuti</option><option value="60">60 Minuti</option><option value="90">90 Minuti</option><option value="120">120 Minuti</option>
                    </select>
                </div>
                <div style="display:flex; gap:10px; margin-bottom:15px;">
                    <div style="flex:1;">
                        <label style="font-size:11px; font-weight:bold; color:var(--text-muted);">SESSO OPERATORE</label>
                        <select id="searchGender" style="width:100%; padding:12px; border:1px solid var(--border-line); background:var(--bg-panel); color:var(--text-main); border-radius:8px; margin-top:5px; font-size:13px;">
                            <option value="ALL">Indifferente</option>
                            <option value="M">Solo Maschile</option>
                            <option value="F">Solo Femminile</option>
                        </select>
                    </div>
                </div>
                <div style="margin-bottom:20px; display:flex; align-items:center; gap:10px; background:var(--bg-panel); padding:12px; border-radius:8px; border:1px solid var(--border-line);">
                    <input type="checkbox" id="searchOmitCleaning" style="width:20px; height:20px;">
                    <label for="searchOmitCleaning" style="font-size:13px; font-weight:bold; color:var(--text-main);">Ometti pulizia (Ignora +10 min)</label>
                </div>
                <button onclick="m_executeSearch()" style="width:100%; padding:15px; border-radius:8px; background:var(--accent); color:#fff; border:none; font-weight:900; font-size:14px; cursor:pointer;">CERCA DISPONIBILITÀ</button>
                <div id="searchResultsArea" style="margin-top:20px; display:none;"><h4 style="margin:0 0 10px 0; font-size:13px; color:var(--text-muted);">RISULTATI TROVATI:</h4><div id="searchResultsList" style="display:flex; flex-direction:column; gap:8px;"></div></div>
            </div>
            <div id="searchFinalActions" style="display:none; padding:15px; border-top:1px solid var(--border-line); background:var(--bg-panel); gap:10px;">
                <button onclick="document.getElementById('searchEngineModal').style.display='none'" style="flex:1; padding:14px; border-radius:8px; background:transparent; color:var(--text-main); border:1px solid var(--border-line); font-weight:900;">ANNULLA</button>
                <button onclick="m_confirmSearchSelection()" id="btnConfirmSearch" style="flex:2; padding:14px; border-radius:8px; background:var(--green, #15803d); color:#fff; border:none; font-weight:900;" disabled>INSERISCI</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function m_openSearchEngine(isQuickMove = false) {
    const formSheet = document.getElementById("appFormSheet");
    const currentIdEl = document.getElementById("fId");
    
    if (isQuickMove && formSheet && formSheet.classList.contains("active") && currentIdEl && currentIdEl.value !== "") {
        window.searchContextAppId = currentIdEl.value;
        document.getElementById("searchModalTitle").innerHTML = `<i class="material-icons-round" style="vertical-align:middle; color:var(--gold);">event_note</i> Spostamento Rapido`;
    } else {
        window.searchContextAppId = null;
        document.getElementById("searchModalTitle").innerHTML = `<i class="material-icons-round" style="vertical-align:middle;">radar</i> Trova Disponibilità`;
    }
    document.getElementById('searchEngineModal').style.display = 'flex';
    document.getElementById('searchResultsArea').style.display = 'none';
    document.getElementById('searchFinalActions').style.display = 'none';
    window.selectedSearchResult = null;
}

let isAdvancedSearch = false;
function m_toggleAdvancedSearch() {
    isAdvancedSearch = !isAdvancedSearch;
    document.getElementById('searchSimpleDateBox').style.display = isAdvancedSearch ? 'none' : 'block';
    document.getElementById('searchAdvancedDateBox').style.display = isAdvancedSearch ? 'flex' : 'none';
}

function m_executeSearch() {
    const listUI = document.getElementById('searchResultsList');
    listUI.innerHTML = "<div style='text-align:center; padding:20px; color:var(--text-muted);'>Ricerca in corso...</div>";
    document.getElementById('searchResultsArea').style.display = 'block';
    document.getElementById('searchFinalActions').style.display = 'none';
    window.selectedSearchResult = null;

    setTimeout(() => {
        const dur = parseInt(document.getElementById('searchDur').value) || 30;
        const omitCleaning = document.getElementById('searchOmitCleaning').checked;
        const requiredTime = omitCleaning ? dur : dur + 10;
        const nCabine = (db.settings && db.settings.cabine) ? parseInt(db.settings.cabine) : 5;

        let datesToCheck = [];
        if(isAdvancedSearch) {
            let start = new Date(document.getElementById('searchDateFrom').value);
            let end = new Date(document.getElementById('searchDateTo').value);
            while(start <= end && datesToCheck.length < 30) { datesToCheck.push(start.toISOString().split('T')[0]); start.setDate(start.getDate() + 1); }
        } else {
            datesToCheck.push(document.getElementById('searchDate').value);
        }

        let results = []; let count = 0;
        datesToCheck.forEach(dStr => {
            if(count >= 20) return; 
            let dayApps = normalizeFbArray(db.app && db.app[dStr] ? db.app[dStr] : []);
            let dayReqs = normalizeFbArray(db.requests && db.requests[dStr] ? db.requests[dStr] : []);
            let combined = [...dayApps, ...dayReqs.filter(r => r.status === 'pending')];

            for(let c = 1; c <= nCabine; c++) {
                for(let m = 9*60; m <= 20*60; m += 15) {
                    if(count >= 20) break;
                    const slotStart = m; const slotEnd = m + requiredTime;
                    let isCollision = combined.some(a => {
                        if(window.searchContextAppId && String(a.id) === String(window.searchContextAppId)) return false;
                        if(parseInt(a.cab) !== c) return false;
                        const aStart = tToM(a.ora); const aEnd = aStart + (parseInt(a.dur) || 30);
                        return (slotStart < aEnd && slotEnd > aStart);
                    });
                    if(!isCollision) {
                        results.push({ date: dStr, cab: c, time: mToT(m), dur: dur, omit: omitCleaning });
                        count++; m += (requiredTime - 15); 
                    }
                }
            }
        });

        if(results.length === 0) listUI.innerHTML = "<div style='text-align:center; padding:20px; color:#b91c1c; font-weight:bold;'>Nessun posto trovato.</div>";
        else {
            listUI.innerHTML = results.map((r, idx) => {
                const dateObj = new Date(r.date);
                const dateStr = dateObj.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'long' });
                const cleanTag = r.omit ? `<span style="background:#fef08a; color:#854d0e; padding:2px 6px; border-radius:4px; font-size:9px;">Senza Pulizia</span>` : '';
                return `
                <div class="search-res-item" id="sr_${idx}" onclick="m_selectSearchResult(${idx}, '${r.date}', '${r.time}', ${r.cab}, ${r.dur})" style="background:var(--bg-panel); border:2px solid var(--border-line); border-radius:8px; padding:12px; display:flex; align-items:center; justify-content:space-between; cursor:pointer;">
                    <div><div style="font-size:14px; font-weight:900; color:var(--text-main); text-transform:uppercase;">${dateStr} - ORE ${r.time}</div><div style="font-size:11px; color:var(--text-muted); margin-top:4px;">Cabina ${r.cab} • ${r.dur} min ${cleanTag}</div></div>
                    <i class="material-icons-round check-icon" style="color:var(--green, #15803d); opacity:0;">check_circle</i>
                </div>`;
            }).join('');
            document.getElementById('searchFinalActions').style.display = 'flex';
        }
    }, 150);
}

function m_selectSearchResult(idx, date, time, cab, dur) {
    document.querySelectorAll('.search-res-item').forEach(el => {
        el.style.borderColor = 'var(--border-line)'; el.style.background = 'var(--bg-panel)'; el.querySelector('.check-icon').style.opacity = '0';
    });
    const selected = document.getElementById('sr_' + idx);
    selected.style.borderColor = 'var(--green, #15803d)'; selected.style.background = 'rgba(21, 128, 61, 0.1)'; selected.querySelector('.check-icon').style.opacity = '1';
    window.selectedSearchResult = { date, time, cab, dur };
    document.getElementById('btnConfirmSearch').disabled = false;
}

function m_confirmSearchSelection() {
    if(!window.selectedSearchResult) return;
    const res = window.selectedSearchResult;
    document.getElementById('searchEngineModal').style.display = 'none';

    setTimeout(() => {
        if (window.searchContextAppId) {
            const fDate = document.getElementById("fDate"); const fOra = document.getElementById("fOra"); const fCab = document.getElementById("fCab");
            if(fDate) fDate.value = res.date; if(fOra) fOra.value = res.time; if(fCab) fCab.value = res.cab;
            document.getElementById("appFormSheet").classList.add("active");
            if(typeof showToast === 'function') showToast("Orario aggiornato! Ricordati di cliccare SALVA.", 3000);
        } else {
            const p = document.getElementById("mainDate");
            if(p) { p.value = res.date; m_renderAll(); }
            m_openForm(null, '', res.cab, res.time);
            setTimeout(() => {
                const durInput = document.getElementById("fDur");
                if(durInput) durInput.value = res.dur;
                if(typeof m_renderServiceBox === 'function') m_renderServiceBox();
            }, 100);
        }
    }, 300);
}

// ==================== GESTIONE CRM E APERTURA SICURA ANAGRAFICA ====================
function m_updatePrivacyUI(hasLinkToday, hasDocs = false) {
    const ind = document.getElementById("privacyIndicator"); const inp = document.getElementById("fPrivacy");
    if(ind && inp) {
        inp.value = hasLinkToday ? "true" : "false";
        ind.style.background = hasLinkToday ? "var(--green)" : "var(--red)";
        ind.style.boxShadow = hasLinkToday ? "0 0 8px var(--green)" : "0 0 8px var(--red)";
        ind.style.border = (!hasLinkToday && hasDocs) ? "2px solid var(--gold)" : "none";
        
        ind.onclick = (e) => { 
            if (hasLinkToday) m_openPrivacyPDF();
            else m_openPrivacySignature(e); 
        };
        ind.style.cursor = "pointer";
    }
}

function m_openPrivacyPDF() {
    const id = document.getElementById("fId").value;
    const date = document.getElementById("fDate").value;
    let apps = normalizeFbArray(db.app && db.app[date] ? db.app[date] : []);
    let app = apps.find(x => String(x.id) === String(id));
    if(app && app.privacyLink) window.open(app.privacyLink, '_blank');
    else if(typeof showToast === 'function') showToast("Nessun PDF collegato a questo appuntamento.");
}

function m_goToCustomerDocsFromForm() {
    const nome = document.getElementById("fCog").value.trim();
    if(!nome) return showToast("Nessun cliente inserito.");
    
    let cust = globalCustomersList.find(c => c.nome && String(c.nome).toLowerCase() === String(nome).toLowerCase());
    if(cust) {
        m_closeForm(null, true);
        window.currentOpenedCustomerId = cust.id;
        
        // SOLUZIONE CRM: Popola esattamente i campi presenti nel tuo Mobile.html
        const elNome = document.getElementById('cp_nome'); if(elNome) elNome.innerText = cust.nome || 'Cliente';
        const elTel = document.getElementById('cp_tel'); if(elTel) elTel.innerText = cust.tel || '-';
        const elDob = document.getElementById('cp_dob'); if(elDob) elDob.innerText = cust.dataNascita ? String(cust.dataNascita).split('-').reverse().join('/') : '-';
        const noteEl = document.getElementById('cp_note'); if(noteEl) noteEl.value = cust.note || '';

        const hBody = document.getElementById('cp_history');
        let totalSpent = 0;
        if(hBody) {
            hBody.innerHTML = "";
            let history = [];
            Object.keys(db.app || {}).forEach(date => {
                let apps = normalizeFbArray(db.app[date]);
                apps.forEach(a => {
                    if((a.cog || '').toLowerCase() === (cust.nome || '').toLowerCase()) {
                        let price = parseFloat(a.price || a.prezzo || 0);
                        if(a.pagato) totalSpent += price;
                        history.push({ date: date, serv: a.serv||'-', op: a.op||'-', price: price, cam: a.cam||'-' });
                    }
                });
            });
            
            const elSpent = document.getElementById('cp_spent'); 
            if(elSpent) elSpent.innerText = totalSpent.toFixed(2).replace('.', ',') + ' €';

            history.sort((a,b) => new Date(b.date) - new Date(a.date));
            hBody.innerHTML = history.map(h => `<tr><td>${new Date(h.date).toLocaleDateString('it-IT')}</td><td>Cam ${h.cam}</td><td>${h.serv}<br><small style="color:var(--text-muted)">${h.op}</small></td><td style="text-align:right">€${h.price}</td></tr>`).join('');
            if(history.length === 0) hBody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:20px; color:var(--text-muted)'>Nessun trattamento registrato.</td></tr>";
        }

        const docsTable = document.getElementById('cp_docs_table');
        if(docsTable) {
            docsTable.innerHTML = "";
            if(cust.docs && Object.keys(cust.docs).length > 0) {
                Object.entries(cust.docs).forEach(([docId, doc]) => {
                    docsTable.innerHTML += `<tr><td>${(doc.dataInserimento||'-').split(',')[0]}</td><td><b>${doc.nomeDoc}</b></td><td style="text-align:right"><a href="${doc.link}" target="_blank" class="btn-save btn-outline" style="background:rgba(16,185,129,0.1); color:var(--green); border-color:var(--green); padding:8px; display:inline-block;"><i class="material-icons-round">picture_as_pdf</i></a></td></tr>`;
                });
            } else {
                docsTable.innerHTML = "<tr><td colspan='3' style='text-align:center; padding:20px; color:var(--text-muted)'>Nessun file associato.</td></tr>";
            }
        }

        const modal = document.getElementById('customerProfileModal');
        if(modal) {
            modal.style.display = 'flex';
            document.querySelectorAll('#customerProfileModal .tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('#customerProfileModal .tab-content').forEach(c => c.classList.remove('active'));
            document.querySelectorAll('#customerProfileModal .tab-btn')[0].classList.add('active');
            document.getElementById('tab-history').classList.add('active');
        }
    } else {
        showToast("Cliente non trovato nello storico del CRM.");
    }
}

function m_openPrivacySignature(e) {
    if(e) e.preventDefault();
    const nome = document.getElementById("fCog").value.trim();
    const appId = document.getElementById("fId").value;
    const date = document.getElementById("fDate").value;
    
    if(!nome) return showToast("Inserisci prima il Nome del Cliente per firmare!");
    if(!appId) return showToast("Devi prima SALVARE l'appuntamento per poter far firmare!");
    window.open(`Mobile_Firma.html?cliente=${encodeURIComponent(nome)}&appId=${appId}&date=${date}`, '_blank');
}

function m_handleCustomerSearch(val) {
    const sug = document.getElementById("customerSuggestions");
    if(!val || String(val).length < 3) { sug.style.display = 'none'; return; }
    const query = String(val).toLowerCase();
    const matches = globalCustomersList.filter(c => c.nome && String(c.nome).toLowerCase().includes(query));
    if(matches.length > 0) {
        sug.innerHTML = matches.map(c => {
            let hasDocs = (c.docs && Object.keys(c.docs).length > 0);
            return `<div style="padding:12px; border-bottom:1px solid var(--border-line); color:var(--text-main); cursor:pointer;" onclick="m_selectCustomer('${(c.nome||'').replace(/'/g,"\\\\'")}', '${c.tel||''}', '${(c.patologie||'').replace(/'/g,"\\\\'")}', ${c.privacy||false}, ${hasDocs}, '${c.cam||''}')"><b>${c.nome}</b> <span style="font-size:10px; color:var(--text-muted); float:right;">${c.tel||''}</span></div>`;
        }).join('');
        sug.style.display = 'block';
    } else sug.style.display = 'none';
}

function m_selectCustomer(nome, tel, pat, priv, hasDocs, cam) {
    document.getElementById("fCog").value = nome || ""; document.getElementById("fTel").value = tel || "";
    document.getElementById("fPatologie").value = pat || ""; document.getElementById("fCam").value = cam || "";
    m_updatePrivacyUI(false, hasDocs);
    document.getElementById("customerSuggestions").style.display = 'none';
}

function m_injectFormButtons() {
    let nameBox = document.getElementById("fCog").parentNode;
    if(!document.getElementById("btnGoCrm")) {
        nameBox.style.display = "flex"; nameBox.style.gap = "8px"; nameBox.style.alignItems = "center";
        let btn = document.createElement("button");
        btn.id = "btnGoCrm";
        btn.className = "btn-save btn-outline";
        btn.style.cssText = "padding:10px; width:45px; flex-shrink:0; border-color:var(--accent); color:var(--accent); display:flex; align-items:center; justify-content:center;";
        btn.innerHTML = "<i class='material-icons-round'>badge</i>";
        btn.onclick = (e) => { e.preventDefault(); m_goToCustomerDocsFromForm(); };
        nameBox.appendChild(btn);
    }

    // SOLUZIONE SPOSTAMENTO RAPIDO SOTTO IL TASTO SALVA
    let saveBtn = document.getElementById("btnSaveAppStandard");
    if(saveBtn && !document.getElementById("btnQuickMove")) {
        let qm = document.createElement("button");
        qm.id = "btnQuickMove";
        qm.className = "btn-save btn-outline";
        qm.style.cssText = "width:100%; margin-top:10px; margin-bottom:10px; border-color:var(--gold); color:var(--gold); display:flex; align-items:center; justify-content:center; gap:5px;";
        qm.innerHTML = "<i class='material-icons-round'>bolt</i> SPOSTAMENTO RAPIDO";
        qm.onclick = (e) => { e.preventDefault(); m_openSearchEngine(true); };
        saveBtn.insertAdjacentElement('afterend', qm);
    }
}

function m_openForm(e, id = '', cab = 1, ora = "10:00") {
    try {
        if(isPanoramica) return; 

        if(e) e.stopPropagation(); 
        const sel = document.getElementById("fOp"); 
        
        // SOLUZIONE GHOST OPERATOR LAURA: Richiesta sincronizzata al Database principale
        if(sel) {
            sel.innerHTML = '<option value="">-- Operatore --</option>';
            firebase.database().ref('MASTER_ADMIN_DB/users').once('value').then(snap => {
                const allUsers = snap.val() || {};
                const activeNicksAndNames = Object.values(allUsers).flatMap(u => [String(u.nick).toLowerCase().trim(), String(u.name).toLowerCase().trim()]);

                let rawStaff = db.staff || []; 
                let staffArr = Array.isArray(rawStaff) ? rawStaff : Object.values(rawStaff);
                
                let filteredStaff = staffArr.filter(s => {
                    if(!s || typeof s !== 'object' || !s.nome || String(s.nome).trim() === '') return false;
                    if(s.deleted === true || String(s.deleted) === 'true') return false;
                    if(s.cestinato === true || String(s.cestinato) === 'true') return false;
                    if(s.eliminato === true || String(s.eliminato) === 'true') return false;
                    if(s.attivo === false || String(s.attivo) === 'false') return false;
                    
                    let sName = String(s.nome).toLowerCase().trim();
                    if(!activeNicksAndNames.includes(sName)) return false;

                    return true;
                });

                filteredStaff.forEach(s => { sel.innerHTML += `<option value="${s.nome}">${s.nome}</option>`; });
                
                // Mantiene operatore selezionato in fase di modifica
                if(id) {
                    let tdDate = document.getElementById("fDate").value;
                    let arrApps = normalizeFbArray(db.app && db.app[tdDate] ? db.app[tdDate] : []);
                    let fApp = arrApps.find(x => String(x.id) === String(id));
                    if(fApp && fApp.op) sel.value = fApp.op;
                }
            });
        }
        document.getElementById("customerSuggestions").style.display = 'none';

        m_injectFormButtons();

        if(id) {
            let targetApp = null; let tDate = null;
            Object.keys(db.app || {}).forEach(d => { let arr = normalizeFbArray(db.app[d]); let found = arr.find(x => String(x.id) === String(id)); if(found) { targetApp = found; tDate = d; } });
            if(!targetApp) return;
            
            document.getElementById("formTitle").innerText = "Modifica Appuntamento"; document.getElementById("formTitle").style.color = "var(--gold)";
            document.getElementById("fId").value = id; document.getElementById("fDate").value = tDate; document.getElementById("fOldDate").value = tDate;
            if(document.getElementById("fReqId")) document.getElementById("fReqId").value = ""; 
            
            document.getElementById("fId").dataset.originalName = targetApp.cog || "";
            
            document.getElementById("fOra").value = targetApp.ora; document.getElementById("fCab").value = targetApp.cab;
            document.getElementById("fCam").value = targetApp.cam || ""; document.getElementById("fTel").value = targetApp.tel || "";
            document.getElementById("fCog").value = targetApp.cog || ""; document.getElementById("fNote").value = targetApp.note || ""; 
            document.getElementById("fEseguito").checked = targetApp.eseguito || false;
            document.getElementById("fPatologie").value = targetApp.patologie || ""; document.getElementById("fServ").value = targetApp.serv || ""; document.getElementById("fDur").value = targetApp.dur || 30; document.getElementById("fPrice").value = targetApp.price || 0;
            
            let hasDocs = false; let c = globalCustomersList.find(x => x.nome && x.nome.toLowerCase() === (targetApp.cog||'').toLowerCase());
            if(c && c.docs && Object.keys(c.docs).length > 0) hasDocs = true;
            const hasLinkToday = !!(targetApp.privacyLink && String(targetApp.privacyLink).startsWith("http"));
            m_updatePrivacyUI(hasLinkToday, hasDocs);
            
            document.getElementById("eseguitoSwitchBox").style.display = "flex"; document.getElementById("btnSaveAppStandard").style.display = "flex"; 
            if(document.getElementById("editActionButtons")) document.getElementById("editActionButtons").style.display = "flex";
            if(document.getElementById("btnQuickMove")) document.getElementById("btnQuickMove").style.display = "flex";
            if(document.getElementById("reqActionButtons")) document.getElementById("reqActionButtons").style.display = "none";
            
        } else {
            document.getElementById("formTitle").innerText = "Nuovo Appuntamento"; document.getElementById("formTitle").style.color = "var(--gold)";
            document.getElementById("fId").value = ""; if(document.getElementById("fReqId")) document.getElementById("fReqId").value = "";
            document.getElementById("fId").dataset.originalName = "";
            let cd = document.getElementById("mainDate") ? document.getElementById("mainDate").value : new Date().toISOString().split('T')[0];
            document.getElementById("fDate").value = cd; document.getElementById("fOldDate").value = cd;
            document.getElementById("fOra").value = ora; document.getElementById("fCab").value = cab;
            ['fCam','fTel','fCog','fOp','fNote','fServ','fPatologie'].forEach(x => { const el = document.getElementById(x); if(el) el.value=""; });
            document.getElementById("fDur").value = "30"; document.getElementById("fPrice").value = "0"; document.getElementById("fEseguito").checked = false; 
            
            m_updatePrivacyUI(false, false);
            
            document.getElementById("eseguitoSwitchBox").style.display = "flex"; document.getElementById("btnSaveAppStandard").style.display = "flex"; 
            if(document.getElementById("editActionButtons")) document.getElementById("editActionButtons").style.display = "none"; 
            if(document.getElementById("btnQuickMove")) document.getElementById("btnQuickMove").style.display = "none";
            if(document.getElementById("reqActionButtons")) document.getElementById("reqActionButtons").style.display = "none";
        }
        
        m_renderServiceBox(); document.getElementById("appFormSheet").classList.add("active");
    } catch(err) { console.error(err); }
}

function m_saveApp() {
    const id = document.getElementById("fId").value;
    const date = document.getElementById("fDate").value; 
    
    if(!date || !document.getElementById("fServ").value) return showToast("Mancano dati obbligatori");

    const currentName = document.getElementById("fCog").value.trim();
    const originalName = document.getElementById("fId").dataset.originalName || "";

    if (id && originalName && originalName.toLowerCase() !== currentName.toLowerCase() && currentName !== "") {
        m_showElegantConfirmNameChange(originalName, currentName, 
            () => { m_executeFinalSave(true, null); }, 
            () => { m_executeFinalSave(false, originalName); } 
        );
    } else {
        m_executeFinalSave(false, null);
    }
}

function m_executeFinalSave(createNewCustomer, oldNameForCorrection) {
    try {
        const id = document.getElementById("fId").value; 
        const date = document.getElementById("fDate").value; 
        const oldDate = document.getElementById("fOldDate").value;
        const currentName = document.getElementById("fCog").value.trim();
        
        let existingLink = "";
        if (id && oldDate && db.app[oldDate]) {
            let oldApp = normalizeFbArray(db.app[oldDate]).find(x => String(x.id) === String(id));
            if (oldApp && oldApp.privacyLink) existingLink = oldApp.privacyLink;
        }

        const currentSId = localStorage.getItem("tw_structure_id");
        const startMin = tToM(document.getElementById("fOra").value);
        const endMin = startMin + parseInt(document.getElementById("fDur").value || 30);
        let appsCheck = normalizeFbArray(db.app && db.app[date] ? db.app[date] : []);
        
        let hasCollision = appsCheck.some(a => { 
            if(String(a.id) === String(id) || parseInt(a.cab) !== parseInt(document.getElementById("fCab").value)) return false; 
            const aStart = tToM(a.ora); 
            const aEndWithClean = aStart + (parseInt(a.dur)||30) + 10; 
            return (startMin < aEndWithClean && endMin > aStart); 
        });

        if(hasCollision) return showToast("Bloccato: Sovrapposizione con appuntamento o pulizia!");

        let privEl = document.getElementById("fPrivacy");
        const privacyChecked = existingLink !== "" ? true : (privEl ? (privEl.value === 'true') : false);
        
        if(currentName && typeof globalCustomersList !== 'undefined') {
            if (createNewCustomer) {
                let newId = "CUST_" + Date.now();
                firebase.database().ref('MASTER_ADMIN_DB/global_customers/' + newId).set({
                    nome: currentName, tel: document.getElementById("fTel").value, cam: document.getElementById("fCam").value,
                    patologie: document.getElementById("fPatologie").value, privacy: privacyChecked, lastStruct: currentSId
                });
            } else if (oldNameForCorrection) {
                let custToFix = globalCustomersList.find(c => c.nome && String(c.nome).toLowerCase() === String(oldNameForCorrection).toLowerCase());
                if(custToFix) {
                    firebase.database().ref('MASTER_ADMIN_DB/global_customers/' + custToFix.id).update({
                        nome: currentName, tel: document.getElementById("fTel").value, cam: document.getElementById("fCam").value,
                        patologie: document.getElementById("fPatologie").value, privacy: privacyChecked, lastStruct: currentSId
                    });
                }
            } else {
                let custToUpdate = globalCustomersList.find(c => c.nome && String(c.nome).toLowerCase() === String(currentName).toLowerCase());
                let custId = custToUpdate ? custToUpdate.id : "CUST_" + Date.now();
                firebase.database().ref('MASTER_ADMIN_DB/global_customers/' + custId).update({
                    nome: currentName, tel: document.getElementById("fTel").value, cam: document.getElementById("fCam").value,
                    patologie: document.getElementById("fPatologie").value, privacy: privacyChecked, lastStruct: currentSId
                });
            }
        }

        const obj = {
            id: id || "APP"+Date.now(),
            ora: document.getElementById("fOra").value || "10:00",
            cab: parseInt(document.getElementById("fCab").value) || 1,
            cog: currentName || "N.D.",
            tel: document.getElementById("fTel").value || "",
            cam: document.getElementById("fCam").value || "",
            serv: document.getElementById("fServ").value || "",
            dur: parseInt(document.getElementById("fDur").value) || 30,
            price: parseFloat(document.getElementById("fPrice").value) || 0,
            op: document.getElementById("fOp").value || "",
            note: document.getElementById("fNote").value || "",
            patologie: document.getElementById("fPatologie").value || "",
            privacy: privacyChecked,
            privacyLink: existingLink,
            eseguito: document.getElementById("fEseguito").checked || false,
            pagato: false,
            fromReception: false,
            reqId: ""
        };

        const dbRefLocal = firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + currentSId + '/app');
        if(id && oldDate && oldDate !== date) { 
            let oldApps = normalizeFbArray(db.app && db.app[oldDate] ? db.app[oldDate] : []); 
            dbRefLocal.child(oldDate).set(oldApps.filter(x => String(x.id) !== String(id))); 
        }
        
        let targetApps = normalizeFbArray(db.app && db.app[date] ? db.app[date] : []);
        if(id && oldDate === date) { 
            const i = targetApps.findIndex(x => String(x.id) === String(id)); 
            if(i > -1) { 
                obj.pagato = targetApps[i].pagato || false; 
                obj.fromReception = targetApps[i].fromReception || false; 
                obj.reqId = targetApps[i].reqId || ""; 
                targetApps[i] = obj; 
            } else targetApps.push(obj); 
        } else { targetApps.push(obj); }
        
        dbRefLocal.child(date).set(targetApps).then(() => { 
            m_closeForm(null, true); showToast("Salvato con successo!"); m_renderAll(); 
        }).catch(e => { console.error(e); showToast("Errore di Rete al salvataggio."); });

    } catch(e) { console.error(e); showToast("Errore di Salvataggio"); }
}

function m_showElegantConfirmNameChange(oldName, newName, onCreaNuovo, onCorreggi) {
    let modal = document.getElementById('nameChangeModalUI'); 
    if(!modal) { 
        modal = document.createElement('div'); 
        modal.id = 'nameChangeModalUI'; 
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:10000; display:none; align-items:center; justify-content:center; padding:20px; backdrop-filter: blur(4px);'; 
        modal.innerHTML = `
        <div style="background:var(--bg-panel); border:1px solid var(--border-line); border-radius:16px; padding:25px; width:100%; max-width:350px; text-align:center; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
            <i class="material-icons-round" style="font-size:48px; color:var(--accent); margin-bottom:10px;">manage_accounts</i>
            <h3 style="color:var(--text-main); margin-top:0; font-size:16px;">Cambio Nome Rilevato</h3>
            <p style="font-size:13px; color:var(--text-muted); margin-bottom:15px;">Hai cambiato il nome da <b id="ncOld" style="color:var(--red)"></b> a <b id="ncNew" style="color:var(--green)"></b>.</p>
            <p style="font-size:12px; color:var(--text-muted); margin-bottom:20px;">Si tratta di una correzione di battitura o di una persona completamente diversa?</p>
            <div style="display:flex; flex-direction:column; gap:10px;">
                <button id="ncCreaNuovo" style="width:100%; padding:14px; border-radius:10px; background:transparent; border:2px solid var(--accent); color:var(--text-main); font-weight:bold; cursor:pointer;">È UN NUOVO CLIENTE</button>
                <button id="ncCorreggi" style="width:100%; padding:14px; border-radius:10px; background:var(--accent); border:none; color:#fff; font-weight:bold; cursor:pointer;">CORREGGI IL NOME</button>
            </div>
            <span id="ncAnnulla" style="display:inline-block; margin-top:20px; font-size:11px; text-decoration:underline; color:var(--text-muted); cursor:pointer;">Torna indietro</span>
        </div>`; 
        document.body.appendChild(modal); 
    } 
    document.getElementById('ncOld').innerText = oldName; 
    document.getElementById('ncNew').innerText = newName; 
    modal.style.display = 'flex'; 
    document.getElementById('ncAnnulla').onclick = () => modal.style.display = 'none'; 
    document.getElementById('ncCreaNuovo').onclick = () => { modal.style.display = 'none'; onCreaNuovo(); };
    document.getElementById('ncCorreggi').onclick = () => { modal.style.display = 'none'; onCorreggi(); };
}

function m_renderServiceBox() {
    const area = document.getElementById("fServiceArea"); const n = document.getElementById("fServ").value;
    if(!area) return;
    if(n) area.innerHTML = `<div style="background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); border-radius:10px; padding:15px; display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;"><div style="display:flex; flex-direction:column;"><b style="color:var(--green)">${n}</b><span style="font-size:11px; color:var(--text-muted);">${document.getElementById('fDur').value} min | ${document.getElementById('fPrice').value} €</span></div><div style="background:rgba(239,68,68,0.2); color:var(--red); border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; cursor:pointer;" onclick="event.stopPropagation(); document.getElementById('fServ').value=''; m_renderServiceBox()"><i class="material-icons-round" style="font-size:16px;">close</i></div></div>`;
    else area.innerHTML = `<button class="btn-save btn-outline" style="border:1px dashed var(--border-line) !important; color:var(--text-main) !important;" onclick="m_openSrvModal(event)"><i class="material-icons-round" style="color:var(--accent);">add_circle</i> SCEGLI SERVIZIO</button>`;
}
function m_openSrvModal(e) { if(e) e.stopPropagation(); document.getElementById('srvSearchInput').value = ""; m_filterSrv(); document.getElementById('srvModal').style.display='flex'; }
function m_closeSrvModal(e) { if(e) e.stopPropagation(); document.getElementById('srvModal').style.display='none'; }
function m_filterSrv() { const query = document.getElementById('srvSearchInput').value.toLowerCase(); const l = document.getElementById("srvListUI"); l.innerHTML = ""; (db.servizi || []).forEach(s => { if(s && s.nome && (s.nome.toLowerCase().includes(query) || query === "")) { l.innerHTML += `<div style="background:var(--bg-body); border:1px solid var(--border-line); border-radius:8px; padding:12px; display:flex; align-items:center; gap:10px; color:var(--text-main);" onclick="document.getElementById('fServ').value='${s.nome.replace(/'/g,"\\'")}'; document.getElementById('fDur').value='${s.durata||30}'; document.getElementById('fPrice').value='${s.prezzo||0}'; m_renderServiceBox(); m_closeSrvModal(event);"><b>${s.nome}</b> <span style="margin-left:auto; color:var(--accent); font-size:11px;">${s.durata}m - ${s.prezzo}€</span></div>`; } }); if(l.innerHTML === "") l.innerHTML = "<div style='text-align:center; padding:20px; color:var(--text-muted);'>Nessun servizio trovato.</div>"; }

function m_closeForm(e, force = false) { if(force || (e && !e.target.closest('.bottom-sheet'))) { document.getElementById("appFormSheet").classList.remove("active"); document.getElementById("customerSuggestions").style.display = 'none'; } }
function m_shareWA() { const t = document.getElementById("fTel").value; if(t) window.open(`https://wa.me/${t}?text=Gentile%20Ospite,%20ti%20aspettiamo%20in%20SPA.`, '_blank'); }

function m_delApp() { 
    const d = document.getElementById("fOldDate").value; const id = document.getElementById("fId").value; 
    let apps = normalizeFbArray(db.app && db.app[d] ? db.app[d] : []); const appToDel = apps.find(x => String(x.id) === String(id)); 
    m_showElegantPrompt("Elimina Appuntamento", "Inserisci il motivo cancellazione:", (motivo) => { m_executeDeleteApp(motivo, appToDel, apps, d, id); }); 
}

function m_executeDeleteApp(motivo, appToDel, apps, d, id) { 
    apps = apps.filter(x => String(x.id) !== String(id)); 
    const currentSId = localStorage.getItem("tw_structure_id");
    const dbRefLocal = firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + currentSId); 
    
    let promises = [dbRefLocal.child('app').child(d).set(apps)]; 
    if(appToDel) { 
        appToDel.deleteReason = motivo; appToDel.date = d; appToDel.deletedAt = new Date().toLocaleString('it-IT'); appToDel.deletedBy = localStorage.getItem("tw_user") || "Staff"; 
        promises.push(dbRefLocal.child('deleted_apps').push(appToDel)); 
        if(appToDel.fromReception && appToDel.reqId) promises.push(dbRefLocal.child('requests_log').child(appToDel.reqId).update({ type: 'deleted-after', msg: `CANCELLATA. Motivo: ${motivo}`, date: new Date().toLocaleString('it-IT'), timestamp: Date.now() })); 
    } 
    Promise.all(promises).then(() => { m_closeForm(null, true); showToast("Eliminato."); m_renderAll(); }); 
}

function m_showElegantConfirm(title, msg, onConfirm) { let modal = document.getElementById('elegantConfirmModalUI'); if(!modal) { modal = document.createElement('div'); modal.id = 'elegantConfirmModalUI'; modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:9999; display:none; align-items:center; justify-content:center; padding:20px; backdrop-filter: blur(4px);'; modal.innerHTML = `<div style="background:var(--bg-panel); border:1px solid var(--border-line); border-radius:16px; padding:25px; width:100%; max-width:350px; text-align:center; box-shadow: 0 10px 30px rgba(0,0,0,0.5);"><i class="material-icons-round" style="font-size:48px; color:var(--gold); margin-bottom:10px;">warning</i><h3 style="color:var(--text-main); margin-top:0; font-size:18px;" id="elegantConfirmTitle">Titolo</h3><p style="font-size:13px; color:var(--text-muted); margin-bottom:25px;" id="elegantConfirmMsg">Messaggio</p><div style="display:flex; gap:10px;"><button id="elegantConfirmCancel" style="flex:1; padding:14px; border-radius:10px; background:transparent; border:1px solid var(--border-line); color:var(--text-main); font-weight:bold; cursor:pointer;">ANNULLA</button><button id="elegantConfirmOk" style="flex:1; padding:14px; border-radius:10px; background:var(--gold); border:none; color:#000; font-weight:bold; cursor:pointer;">PROCEDI</button></div></div>`; document.body.appendChild(modal); } document.getElementById('elegantConfirmTitle').innerText = title; document.getElementById('elegantConfirmMsg').innerText = msg; modal.style.display = 'flex'; document.getElementById('elegantConfirmCancel').onclick = () => modal.style.display = 'none'; document.getElementById('elegantConfirmOk').onclick = () => { modal.style.display = 'none'; onConfirm(); }; }
function m_showElegantPrompt(title, msg, onConfirm) { let modal = document.getElementById('elegantPromptModal'); if(!modal) { modal = document.createElement('div'); modal.id = 'elegantPromptModal'; modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:9999; display:none; align-items:center; justify-content:center; padding:20px; backdrop-filter: blur(4px);'; modal.innerHTML = `<div style="background:var(--bg-panel); border:1px solid var(--border-line); border-radius:16px; padding:25px; width:100%; max-width:350px; text-align:center; box-shadow: 0 10px 30px rgba(0,0,0,0.5);"><i class="material-icons-round" style="font-size:48px; color:var(--red); margin-bottom:10px;">delete_forever</i><h3 style="color:var(--text-main); margin-top:0; font-size:18px;" id="elegantPromptTitle">Titolo</h3><p style="font-size:13px; color:var(--text-muted); margin-bottom:15px;" id="elegantPromptMsg">Messaggio</p><input type="text" id="elegantPromptInput" style="width:100%; padding:14px; border-radius:10px; border:1px solid var(--border-line); background:var(--bg-body); color:var(--text-main); margin-bottom:25px; outline:none; font-size:14px;" placeholder="Scrivi qui..."><div style="display:flex; gap:10px;"><button id="elegantPromptCancel" style="flex:1; padding:14px; border-radius:10px; background:transparent; border:1px solid var(--border-line); color:var(--text-main); font-weight:bold; cursor:pointer;">ANNULLA</button><button id="elegantPromptOk" style="flex:1; padding:14px; border-radius:10px; background:var(--red); border:none; color:white; font-weight:bold; cursor:pointer;">CONFERMA</button></div></div>`; document.body.appendChild(modal); } document.getElementById('elegantPromptTitle').innerText = title; document.getElementById('elegantPromptMsg').innerText = msg; const input = document.getElementById('elegantPromptInput'); input.value = ''; modal.style.display = 'flex'; input.focus(); document.getElementById('elegantPromptCancel').onclick = () => modal.style.display = 'none'; document.getElementById('elegantPromptOk').onclick = () => { const val = input.value.trim(); if(val === '') { if(typeof showToast === 'function') showToast("Campo obbligatorio."); return; } modal.style.display = 'none'; onConfirm(val); }; }