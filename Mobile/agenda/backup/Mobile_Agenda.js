/* Mobile_Agenda.js - Griglia RTL (A blocchi di 3) e Tasti Sticky Infallibili */

let mRowHeight = 75; 
let isPanoramica = false;
let activeMoveAppId = null;
let lastSlotTapTime = 0;
let lastSlotTapId = null;
let m_longPressTimer = null;

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
});

function m_injectStyles() {
    if(document.getElementById("dynamicAgendaStyles")) return;
    const style = document.createElement("style");
    style.id = "dynamicAgendaStyles";
    style.innerHTML = `
        .fab, .floating-btn, .btn-floating, .mobile-fab { display: none !important; }
        .slot { touch-action: manipulation !important; }

        /* MODALITA' NORMALE: GRIGLIA A BLOCCHI DI 3 CABINE, INVERTITA (RTL) */
        #agendaGrid:not(.agendaGrid-zoom) {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            direction: rtl !important; /* Cabina 1 a destra, poi 2 e 3 a sinistra */
            gap: 15px !important;
            padding: 15px !important;
            align-items: start !important;
            width: 100% !important;
            overflow-y: auto !important; /* Permette lo scorrimento verticale pulito */
        }
        #agendaGrid:not(.agendaGrid-zoom) .colonna {
            width: 100% !important;
            direction: ltr !important; /* Il testo dentro la colonna resta da sinistra a destra */
            margin: 0 !important;
        }

        /* MODALITA' PANORAMICA (ZOOM CSS) */
        .agendaGrid-zoom { transform: scale(0.45) !important; transform-origin: top center !important; width: max-content !important; padding: 20px !important; background: transparent !important; display: flex !important; flex-direction: row !important; direction: ltr !important; align-items: flex-start !important; }
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
    const viewAgenda = document.getElementById('view-agenda');
    if(!viewAgenda) return;
    
    const btnContainer = document.createElement('div');
    btnContainer.id = 'injTopActions';
    // Il position: sticky è ancorato a view-agenda, quindi NON SPARIRANNO MAI con lo scroll
    btnContainer.style.cssText = "display:flex; justify-content:center; gap:8px; padding:10px; background:var(--bg-panel); border-bottom:1px solid var(--border-line); position: sticky; top: 0; z-index: 1000;";
    
    btnContainer.innerHTML = `
        <button onclick="if(typeof m_openSearchEngine === 'function') m_openSearchEngine(); else showToast('Modulo Ricerca non caricato.');" style="flex:1; padding:10px; border-radius:8px; border:2px solid var(--accent); background:var(--bg-body); color:var(--accent); font-weight:900; font-size:11px; display:flex; align-items:center; justify-content:center; gap:4px; cursor:pointer;"><i class="material-icons-round" style="font-size:16px;">search</i> TROVA</button>
        <button onclick="if(typeof m_togglePanoramica === 'function') m_togglePanoramica(); else showToast('Modulo Panoramica non caricato.');" style="flex:1; padding:10px; border-radius:8px; border:2px solid var(--border-line); background:var(--bg-body); color:var(--text-main); font-weight:900; font-size:11px; display:flex; align-items:center; justify-content:center; gap:4px; cursor:pointer;"><i class="material-icons-round" style="font-size:16px;">zoom_out_map</i> PANORAMICA</button>
        <button onclick="if(typeof m_openForm === 'function') m_openForm(event, '', 1, '10:00'); else showToast('Modulo Form non caricato.');" style="flex:1; padding:10px; border-radius:8px; border:none; background:var(--accent); color:#fff; font-weight:900; font-size:11px; display:flex; align-items:center; justify-content:center; gap:4px; cursor:pointer;"><i class="material-icons-round" style="font-size:16px;">add</i> NUOVO</button>
    `;
    
    // Lo inseriamo come PRIMO figlio del contenitore con lo scroll.
    viewAgenda.insertBefore(btnContainer, viewAgenda.firstChild);
}

function m_startMoveMode(e, appId) {
    e.stopPropagation();
    if(typeof isPanoramica !== 'undefined' && isPanoramica) return; 
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
    if(typeof isPanoramica !== 'undefined' && isPanoramica) return; 

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
        if(typeof m_openForm === 'function') m_openForm(e, '', cab, ora);
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
            if(typeof showToast === 'function') showToast("Bloccato: Sovrapposizione con appuntamento o pulizia!"); 
            return;
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
    m_injectTopButtons();
    const grid = document.getElementById("agendaGrid");
    const p = document.getElementById("mainDate");
    const d = p ? p.value : null; 
    if(!grid || !db || !d) return;

    const nCabine = (db.settings && db.settings.cabine) ? parseInt(db.settings.cabine) : 5;
    let dayApps = normalizeFbArray(db.app && db.app[d] ? db.app[d] : []);
    let dayReqs = normalizeFbArray(db.requests && db.requests[d] ? db.requests[d] : []);

    let h = "";
    for(let c = 1; c <= nCabine; c++) {
        h += `<div class="colonna" data-cab-id="${c}">
                <div class="col-head">CABINA ${c}</div>
                <div class="panoramica-overlay" onclick="if(typeof m_zoomToCabina === 'function') m_zoomToCabina(${c}, event)"></div>`;
        
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
                        <div class="app-base ${isEseg} ${isMoving}" style="${hCss}" onclick="if(!activeMoveAppId && typeof m_openForm === 'function') m_openForm(event, '${startApp.id}')">
                            ${isMoving ? '' : `<div class="move-dot" onclick="m_startMoveMode(event, '${startApp.id}')"><i class="material-icons-round" style="font-size:16px; color:var(--accent);">open_with</i></div>`}
                            <div class="app-info-col" style="pointer-events:none; padding-right:15px; z-index:2; position:relative;">
                                <b>${startApp.cog || 'N.D.'}</b>
                                <span style="font-size:10px; opacity:0.8; margin-top:1px; display:block;">${startApp.serv || '-'} (${startApp.dur||30}m)</span>
                            </div>
                        </div>
                        <div class="cleaning-tag" style="top:calc(${slotsCount * 100}%);"><i class="material-icons-round" style="font-size:10px; margin-right:3px;">cleaning_services</i> +10m Pulizia</div>
                      </div></div>`;
            } else if(busyApp) {
                h += `<div class="time-row"><div class="time-lbl">${s}</div><div class="slot" data-ora="${s}" data-cab="${c}" onclick="m_handleSlotClick(event, ${c}, '${s}')"><div class="app-busy" data-id="${busyApp.id}" onclick="if(!activeMoveAppId && typeof m_openForm === 'function') m_openForm(event, '${busyApp.id}')"></div></div></div>`;
            } else if(startReq) {
                const slotsCount = Math.ceil((parseInt(startReq.dur) || 30) / 15);
                const hCss = `height: calc(${slotsCount * 100}% - 4px); top: 2px;`;
                h += `<div class="time-row"><div class="time-lbl">${s}</div>
                      <div class="slot" data-ora="${s}" data-cab="${c}" onclick="m_handleSlotClick(event, ${c}, '${s}')">
                        <div class="app-base req-style" style="${hCss}" onclick="if(!activeMoveAppId) alert('Richiesta SPA')">
                            <div class="app-info-col" style="pointer-events:none;">
                                <b><i class="material-icons-round" style="font-size:12px">notifications_active</i> RICHIESTA SPA</b>
                            </div>
                        </div>
                      </div></div>`;
            } else if(busyReq) {
                h += `<div class="time-row"><div class="time-lbl">${s}</div><div class="slot" data-ora="${s}" data-cab="${c}" onclick="m_handleSlotClick(event, ${c}, '${s}')"><div class="app-busy req-busy"></div></div></div>`;
            } else {
                h += `<div class="time-row"><div class="time-lbl">${s}</div><div class="slot" data-ora="${s}" data-cab="${c}" onclick="m_handleSlotClick(event, ${c}, '${s}')"></div></div>`;
            }
        }
        h += `</div>`;
    }
    grid.innerHTML = h;
}