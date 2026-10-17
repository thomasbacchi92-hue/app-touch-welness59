/* agenda/Mobile_Agenda.js - Agenda Mobile PRO (Hard Block Assoluto & Shadow Bypass, Sticky Header) */

window.activeMoveAppId = null;
window.lastSlotTapTime = 0;
window.lastSlotTapId = null;
window.m_longPressTimer = null;
window.m_blockoutTimer = null;
window.m_tempBlockout = null;
window.m_copyBlockoutData = null;

// VARIABILI GLOBALI BYPASS COLLISIONI (SOLO OMBRA/PULIZIA) MOBILE
window.m_bypassShadow = false;
window.m_tempShadowMoveData = null;

window.sysConfirmShadowOverride = function() {
    var sm = document.getElementById('shadowWarningModal');
    if(sm) sm.style.display = 'none';
    window.m_bypassShadow = true;
    if(window.m_tempShadowMoveData) {
        m_executeMoveDoubleTap(window.m_tempShadowMoveData.appId, window.m_tempShadowMoveData.newOra, window.m_tempShadowMoveData.newCab);
        window.m_tempShadowMoveData = null;
    } else if (typeof m_saveApp === 'function') {
        m_saveApp();
    }
};

document.addEventListener('touchstart', function(e) {
    if(window.activeMoveAppId) {
        window.m_longPressTimer = setTimeout(function() {
            m_cancelMove();
            if(typeof showToast === 'function') showToast("Spostamento annullato");
        }, 2000);
    }
    
    var slot = e.target.closest('.slot');
    if (slot && !slot.querySelector('.app-base') && !slot.querySelector('.app-busy') && !window.activeMoveAppId) {
        var ora = slot.getAttribute('data-ora');
        var cab = parseInt(slot.getAttribute('data-cab'), 10);
        window.m_blockoutTimer = setTimeout(function() {
            window.m_startBlockoutCreation(ora, cab);
        }, 3000);
    }
}, {passive: true});

document.addEventListener('touchmove', function() { 
    if(window.m_longPressTimer) clearTimeout(window.m_longPressTimer); 
    if(window.m_blockoutTimer) clearTimeout(window.m_blockoutTimer);
}, {passive: true});

document.addEventListener('touchend', function() { 
    if(window.m_longPressTimer) clearTimeout(window.m_longPressTimer); 
    if(window.m_blockoutTimer) clearTimeout(window.m_blockoutTimer);
}, {passive: true});

document.addEventListener('DOMContentLoaded', function() {
    var grid = document.getElementById("agendaGrid");
    if(grid) {
        grid.style.webkitUserSelect = "none";
        grid.style.userSelect = "none";
        grid.style.webkitTouchCallout = "none";
        grid.oncontextmenu = function(e) { e.preventDefault(); return false; };
    }
    m_injectStyles(); 
});

function m_injectStyles() {
    if(document.getElementById("dynamicAgendaStyles")) return;
    var style = document.createElement("style");
    style.id = "dynamicAgendaStyles";
    style.innerHTML = `
        :root { --pan-cols: 5; }
        .fab, .floating-btn, .btn-floating, .mobile-fab { display: none !important; }
        .slot { touch-action: manipulation !important; position: relative; }
        .view-container { overflow: hidden !important; } 
        #view-agenda.active { overflow: hidden !important; display: flex !important; flex-direction: column !important; }
        #agendaContent { flex: 1 !important; display: flex !important; overflow: hidden !important; height: 100% !important; }
        #agendaGrid {
            display: flex !important;
            flex-direction: row !important;
            overflow-y: auto !important; 
            overflow-x: auto !important; 
            -webkit-overflow-scrolling: touch !important; 
            scroll-snap-type: x mandatory !important;
            width: 100% !important;
            height: 100% !important; 
            align-items: flex-start !important;
            padding-bottom: 80px !important;
            padding-top: 0 !important;
            margin-top: 0 !important;
            scroll-behavior: smooth;
        }
        .colonna {
            min-width: 100vw !important;
            flex: 0 0 100vw !important;
            scroll-snap-align: start !important;
            border-right: 1px solid var(--border-line);
            margin: 0 !important;
            transition: min-width 0.3s ease, flex 0.3s ease; 
            overflow: visible !important; 
            border-radius: 0 !important;
            background: transparent !important;
            position: relative !important;
            height: max-content !important;
        }
        .col-head {
            position: -webkit-sticky !important; 
            position: sticky !important;
            top: 0 !important;
            z-index: 100 !important;
            font-size: 14px !important; 
            padding: 15px 5px !important;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            background: var(--bg-panel) !important;
            border-bottom: 2px solid var(--border-line) !important;
            margin: 0 !important;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            text-align: center;
            font-weight: 900;
            color: var(--text-main);
            text-transform: uppercase;
        }
        .panoramica-attiva {
            padding: 0 !important;
            gap: 0 !important;
            transform: none !important; 
            width: 100% !important;
            background: transparent !important;
            display: flex !important;
        }
        .panoramica-attiva .colonna {
            min-width: calc(100vw / var(--pan-cols)) !important; 
            flex: 0 0 calc(100vw / var(--pan-cols)) !important;
            margin: 0 !important;
            border-right: 1px solid var(--border-line) !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            scroll-snap-align: start !important; 
            background: transparent !important;
            cursor: pointer;
        }
        .panoramica-attiva .col-head {
            font-size: 11px !important; 
            padding: 10px 2px !important;
        }
        .moving-ghost { opacity: 0.40 !important; pointer-events: none !important; border: 3px dashed var(--accent) !important; box-shadow: 0 0 20px var(--accent) !important; z-index: 5 !important; }
        .move-dot { position: absolute; top: 5px; right: 5px; width: 28px; height: 28px; background: #fff; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; z-index: 30; cursor: pointer; border: 2px solid var(--accent); pointer-events: auto !important; }
        .cleaning-tag { position: absolute; bottom: -50px; left: 0; width: 100%; height: 50px; background: repeating-linear-gradient(45deg, transparent, transparent 5px, var(--border-line) 5px, var(--border-line) 10px); opacity: 0.3; border-radius: 0 0 10px 10px; pointer-events: none; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: bold; color: var(--text-main); }
    `;
    document.head.appendChild(style);
}

window.m_startBlockoutCreation = function(ora, cab) {
    if(window.isPanoramica) return;
    window.m_tempBlockout = {
        id: "TEMP_MOB_BLOCK_" + Date.now(),
        ora: ora,
        cab: cab,
        dur: 30,
        isBlockout: true,
        status: 'editing'
    };
    if (typeof showToast === 'function') showToast("🛠️ Blocco attivato! Trascina o usa le opzioni per confermare.");
    m_renderAgenda();
};

window.m_confirmBlockout = function(id) {
    if (!window.m_tempBlockout) return;
    var d = document.getElementById("mainDate").value;
    var currentSId = localStorage.getItem("tw_structure_id");
    var refPath = 'MASTER_ADMIN_DB/structures_data/' + currentSId + '/app/' + d;
    
    firebase.database().ref(refPath).once('value', function(snap) {
        var apps = normalizeFbArray(snap.val() || []);
        apps.push({
            id: "BLOCKOUT_" + Date.now(),
            ora: window.m_tempBlockout.ora,
            cab: parseInt(window.m_tempBlockout.cab, 10),
            dur: parseInt(window.m_tempBlockout.dur, 10),
            isBlockout: true,
            cog: 'BLOCCO CABINA',
            serv: 'FUORI SERVIZIO',
            pagato: false,
            eseguito: false
        });
        firebase.database().ref(refPath).set(apps).then(function() {
            window.m_tempBlockout = null;
            if (typeof showToast === 'function') showToast("🔒 Cabina bloccata definitivamente!");
            m_renderAgenda();
        });
    });
};

window.m_deleteTempBlockout = function() {
    window.m_tempBlockout = null;
    if (typeof showToast === 'function') showToast("Blocco rimosso.");
    m_renderAgenda();
};

window.m_copyTempBlockout = function() {
    if (!window.m_tempBlockout) return;
    window.m_copyBlockoutData = { dur: window.m_tempBlockout.dur };
    if (typeof showToast === 'function') showToast("📋 Copiato! Tocca un'altra cabina vuota per sdoppiarlo.");
};

window.m_editSavedBlockout = function(id) {
    var d = document.getElementById("mainDate").value;
    var currentSId = localStorage.getItem("tw_structure_id");
    var refPath = 'MASTER_ADMIN_DB/structures_data/' + currentSId + '/app/' + d;
    
    firebase.database().ref(refPath).once('value', function(snap) {
        var apps = normalizeFbArray(snap.val() || []);
        var idx = apps.findIndex(x => x.id === id);
        if (idx > -1) {
            var block = apps[idx];
            window.m_tempBlockout = {
                id: block.id,
                ora: block.ora,
                cab: parseInt(block.cab, 10),
                dur: parseInt(block.dur, 10),
                isBlockout: true,
                status: 'editing'
            };
            apps.splice(idx, 1);
            firebase.database().ref(refPath).set(apps).then(function() {
                if (typeof showToast === 'function') showToast("🛠️ Sbloccato per modifica.");
                m_renderAgenda();
            });
        }
    });
};

window.m_deleteSavedBlockout = function(id) {
    if (!confirm("Cancellare il blocco cabina?")) return;
    var d = document.getElementById("mainDate").value;
    var currentSId = localStorage.getItem("tw_structure_id");
    var refPath = 'MASTER_ADMIN_DB/structures_data/' + currentSId + '/app/' + d;
    
    firebase.database().ref(refPath).once('value', function(snap) {
        var apps = normalizeFbArray(snap.val() || []);
        var idx = apps.findIndex(x => x.id === id);
        if (idx > -1) {
            apps.splice(idx, 1);
            firebase.database().ref(refPath).set(apps).then(function() {
                if (typeof showToast === 'function') showToast("Blocco rimosso.");
                m_renderAgenda();
            });
        }
    });
};

window.m_extendBlockout = function(offset) {
    if (!window.m_tempBlockout) return;
    var newDur = (parseInt(window.m_tempBlockout.dur, 10) || 30) + offset;
    if (newDur < 15) newDur = 15;
    window.m_tempBlockout.dur = newDur;
    m_renderAgenda();
};

function m_startMoveMode(e, appId) {
    e.stopPropagation();
    if(window.isPanoramica) return; 
    window.activeMoveAppId = appId;
    if(typeof showToast === 'function') showToast("Tocca dove incollare l'appuntamento");
    m_renderAgenda();
}

function m_cancelMove(e) {
    if(e) e.stopPropagation();
    window.activeMoveAppId = null;
    m_renderAgenda();
}

function m_handleSlotClick(e, cab, ora) {
    e.stopPropagation();

    if(window.isPanoramica) {
        if(typeof m_zoomToCabinaAndOra === 'function') {
            m_zoomToCabinaAndOra(cab, ora);
        }
        return; 
    }

    if (window.m_copyBlockoutData) {
        window.m_tempBlockout = {
            id: "TEMP_MOB_BLOCK_" + Date.now(),
            ora: ora,
            cab: cab,
            dur: window.m_copyBlockoutData.dur,
            isBlockout: true,
            status: 'editing'
        };
        window.m_copyBlockoutData = null;
        m_renderAgenda();
        return;
    }

    if (window.activeMoveAppId) {
        var slotId = cab + "-" + ora;
        var now = Date.now();
        if (window.lastSlotTapId === slotId && (now - window.lastSlotTapTime) < 400) {
            m_executeMoveDoubleTap(window.activeMoveAppId, ora, cab);
            window.lastSlotTapId = null;
        } else {
            window.lastSlotTapId = slotId; window.lastSlotTapTime = now;
            var el = e.currentTarget; var old = el.style.background;
            el.style.background = "rgba(56, 189, 248, 0.4)";
            setTimeout(function(){ el.style.background = old; }, 300);
        }
    } else {
        if(typeof m_openForm === 'function') m_openForm(e, '', cab, ora);
    }
}

window.m_openFormSafe = function(e, id, date) {
    if(e) e.stopPropagation();
    var apps = normalizeFbArray(window.db && window.db.app && window.db.app[date] ? window.db.app[date] : []);
    var app = apps.find(x => String(x.id) === String(id));
    if(app && app.isCouple && app.price == 0 && app.linkedId) {
        id = app.linkedId;
    }
    m_openForm(null, id);
};

function m_executeMoveDoubleTap(appId, newOra, newCab) {
    var d = document.getElementById("mainDate").value; 
    var apps = normalizeFbArray(window.db && window.db.app && window.db.app[d] ? window.db.app[d] : []); 
    var idx = apps.findIndex(function(x){ return String(x.id) === String(appId); });
    
    if(idx > -1) {
        var startMin = tToM(newOra); 
        var appDur = parseInt(apps[idx].dur) || 30; 
        var endMin = startMin + appDur;

        var hasHardCollision = false;
        var hasShadowCollision = false;

        apps.forEach(function(a){
            if(String(a.id) === String(appId) || parseInt(a.cab) !== parseInt(newCab)) return;
            var aStart = tToM(a.ora);
            var aEnd = aStart + (parseInt(a.dur)||30);
            
            if(startMin < (aEnd + 10) && (endMin + 10) > aStart) {
                if(startMin < aEnd && endMin > aStart) hasHardCollision = true;
                else hasShadowCollision = true;
            }
        });

        // BLOCCO ASSOLUTO se l'appuntamento vero viene sovrascritto
        if(hasHardCollision) {
            m_cancelMove();
            if(typeof showToast === 'function') showToast("⛔ Slot occupato! Sovrascrittura non permessa.");
            return;
        }

        // POPUP SOLO per l'ombra di pulizia
        if(hasShadowCollision && !window.m_bypassShadow) {
            window.m_tempShadowMoveData = { appId: appId, newOra: newOra, newCab: newCab };
            var sm = document.getElementById('shadowWarningModal');
            if(sm) sm.style.display = 'flex';
            return;
        }

        window.m_bypassShadow = false;

        var currentSId = localStorage.getItem("tw_structure_id");
        var refPath = 'MASTER_ADMIN_DB/structures_data/' + currentSId + '/app/' + d;
        
        firebase.database().ref(refPath).once('value', function(snap) {
            var rawData = snap.val() || {};
            var realKey = null;
            
            var keys = Object.keys(rawData);
            for(var i=0; i<keys.length; i++) {
                var k = keys[i];
                if(rawData[k] && String(rawData[k].id) === String(appId)) {
                    realKey = k;
                    break;
                }
            }
            
            if (realKey !== null) {
                var updates = { ora: newOra, cab: parseInt(newCab) };
                firebase.database().ref(refPath + '/' + realKey).update(updates).then(function() {
                    window.activeMoveAppId = null; 
                    if(typeof showToast === 'function') showToast("Spostato con successo!"); 
                    m_renderAgenda(); 
                }).catch(function(err){
                    m_cancelMove();
                });
            } else {
                m_cancelMove();
            }
        });
    }
}

function m_changeDate(offset) {
    var p = document.getElementById("mainDate");
    if(!p) return;
    var d = new Date(p.value); d.setDate(d.getDate() + offset);
    var newVal = d.toISOString().split('T')[0];
    p.value = newVal; 
    
    var fDateText = document.getElementById("fakeDateText");
    if(fDateText) fDateText.innerText = newVal.split('-').reverse().join('/');
    
    if(window.activeMoveAppId) m_cancelMove();
    m_renderAgenda();
}

function tToM(t) { if(!t) return 0; var p = String(t).split(':'); return (parseInt(p[0])||0)*60 + (parseInt(p[1])||0); }
function mToT(m) { return String(Math.floor(m/60)).padStart(2,'0') + ":" + String(m%60).padStart(2,'0'); }

function m_renderAgenda() {
    var grid = document.getElementById("agendaGrid");
    var p = document.getElementById("mainDate");
    var d = p ? p.value : null; 
    if(!grid || typeof window.db === 'undefined' || !window.db || !d) return;

    var activeCabins = [];
    if (window.db.settings && window.db.settings.cabine_config && Array.isArray(window.db.settings.cabine_config)) {
        window.db.settings.cabine_config.forEach(function(cab, idx) {
            if(cab.attiva !== false && cab.attiva !== "false") {
                activeCabins.push({ id: idx + 1, name: cab.nome || ("CABINA " + (idx + 1)) });
            }
        });
    } else {
        var nCabine = (window.db.settings && window.db.settings.cabine) ? parseInt(window.db.settings.cabine) : 5;
        for(var i=1; i<=nCabine; i++) {
            activeCabins.push({ id: i, name: "CABINA " + i });
        }
    }

    var dayApps = normalizeFbArray(window.db.app && window.db.app[d] ? window.db.app[d] : []);
    var dayReqs = normalizeFbArray(window.db.requests && window.db.requests[d] ? window.db.requests[d] : []);

    var h = "";
    activeCabins.forEach(function(cabInfo) {
        var c = cabInfo.id;
        h += `<div class="colonna" data-cab-id="${c}"><div class="col-head">${cabInfo.name}</div>`;
        
        for(var i=10*60; i<=20*60; i+=15) {
            var s = mToT(i); var sMin = i;
            
            var startApp = dayApps.find(function(x){ var xM = tToM(x.ora); return parseInt(x.cab) === c && xM >= sMin && xM < (sMin + 15); });
            
            if (!startApp && window.m_tempBlockout && window.m_tempBlockout.cab === c) {
                var tempStartMin = tToM(window.m_tempBlockout.ora);
                if (tempStartMin >= sMin && tempStartMin < (sMin + 15)) {
                    startApp = window.m_tempBlockout;
                }
            }

            var busyApp = dayApps.find(function(x){ var start = tToM(x.ora); return parseInt(x.cab) === c && sMin > start && sMin < start + (parseInt(x.dur) || 30) && !startApp; });
            var tempBlockoutBusy = !startApp && window.m_tempBlockout && 
                window.m_tempBlockout.cab === c && 
                sMin > tToM(window.m_tempBlockout.ora) && 
                sMin < (tToM(window.m_tempBlockout.ora) + (parseInt(window.m_tempBlockout.dur) || 30));

            var startReq = dayReqs.find(function(x){ if(x.status !== 'pending') return false; var xM = tToM(x.ora); return parseInt(x.cab) === c && xM >= sMin && xM < (sMin + 15); });
            var busyReq = dayReqs.find(function(x){ if(x.status !== 'pending') return false; var start = tToM(x.ora); return parseInt(x.cab) === c && sMin > start && sMin < start + (parseInt(x.dur) || 30); });

            if(startApp) {
                if (startApp.isBlockout) {
                    var isEditing = startApp.status === 'editing';
                    var exactDur = parseInt(startApp.dur) || 30;
                    var slotsCount = Math.ceil(exactDur / 15);
                    var hCss = `height: calc(${slotsCount * 100}% - 4px); top: 2px; padding: 0; display:flex; flex-direction:column; overflow:hidden; position:relative;`;
                    
                    var styleStr = isEditing 
                        ? "background: rgba(239, 68, 68, 0.15) !important; border: 2px dashed #ef4444 !important; color: #ef4444 !important; border-radius:8px;" 
                        : "background: #0f172a !important; border: 2px solid #1e3a8a !important; color: #3b82f6 !important; border-radius:8px;";

                    var buttonsHtml = '';
                    if (isEditing) {
                        buttonsHtml = `
                            <div style="display: flex; gap: 4px; position: absolute; right: 10px; bottom: 10px; z-index: 20;">
                                <button onclick="event.stopPropagation(); window.m_extendBlockout(-15)" style="background:#555; color:white; border:none; border-radius:4px; width:26px; height:26px;">-</button>
                                <button onclick="event.stopPropagation(); window.m_extendBlockout(15)" style="background:#555; color:white; border:none; border-radius:4px; width:26px; height:26px;">+</button>
                                <button onclick="event.stopPropagation(); window.m_confirmBlockout('${startApp.id}')" style="background:#10b981; color:white; border:none; border-radius:4px; width:26px; height:26px; display:flex; align-items:center; justify-content:center;"><i class="material-icons-round" style="font-size:14px;">check</i></button>
                                <button onclick="event.stopPropagation(); window.m_copyTempBlockout()" style="background:#3b82f6; color:white; border:none; border-radius:4px; width:26px; height:26px; display:flex; align-items:center; justify-content:center;"><i class="material-icons-round" style="font-size:14px;">content_copy</i></button>
                                <button onclick="event.stopPropagation(); window.m_deleteTempBlockout()" style="background:#ef4444; color:white; border:none; border-radius:4px; width:26px; height:26px; display:flex; align-items:center; justify-content:center;"><i class="material-icons-round" style="font-size:14px;">delete</i></button>
                            </div>
                        `;
                    } else {
                        buttonsHtml = `
                            <div style="display: flex; gap: 4px; position: absolute; right: 10px; top: 50%; transform:translateY(-50%); z-index: 20;">
                                <button onclick="event.stopPropagation(); window.m_editSavedBlockout('${startApp.id}')" style="background:#eab308; color:black; border:none; border-radius:4px; width:26px; height:26px; display:flex; align-items:center; justify-content:center;"><i class="material-icons-round" style="font-size:14px;">edit</i></button>
                                <button onclick="event.stopPropagation(); window.m_deleteSavedBlockout('${startApp.id}')" style="background:#ef4444; color:white; border:none; border-radius:4px; width:26px; height:26px; display:flex; align-items:center; justify-content:center;"><i class="material-icons-round" style="font-size:14px;">delete</i></button>
                            </div>
                        `;
                    }

                    h += `<div class="time-row"><div class="time-lbl">${s}</div>
                          <div class="slot" data-ora="${s}" data-cab="${c}" onclick="m_handleSlotClick(event, ${c}, '${s}')">
                            <div class="app-base" style="${hCss} ${styleStr}">
                                <div style="padding: 10px; position:relative; width:100%; height:100%; box-sizing:border-box;">
                                    <div style="font-size:11px; font-weight:900; text-transform:uppercase;">
                                        <i class="material-icons-round" style="font-size:12px; vertical-align:middle; margin-right:4px;">block</i> 
                                        ${isEditing ? 'Configura Blocco' : 'CABINA BLOCCATA'}
                                    </div>
                                    <div style="font-size:9px; opacity:0.8; margin-top:2px;">Copertura: ${exactDur} minuti</div>
                                    ${buttonsHtml}
                                </div>
                            </div>
                          </div></div>`;
                } else {
                    var isEseg = startApp.eseguito ? "eseguito-style" : "";
                    var isCoupleCls = startApp.isCouple ? "couple-style" : "";
                    var isTwinCls = (startApp.isCouple && startApp.price == 0) ? "is-twin" : "";
                    var isMoving = (window.activeMoveAppId === String(startApp.id)) ? "moving-ghost" : "";
                    var isSigned = !!(startApp.privacyLink && String(startApp.privacyLink).startsWith("http")) ? "border-left: 6px solid var(--green) !important;" : "";
                    var slotsCount = Math.ceil((parseInt(startApp.dur) || 30) / 15);
                    var hCss = `height: calc(${slotsCount * 100}% - 4px); top: 2px; ${isSigned}`;
                    
                    var coupleIcon = startApp.isCouple ? '<i class="material-icons-round" style="font-size:11px; vertical-align:middle; margin-right:3px;">people</i>' : '';
                    var priceLbl = (startApp.isCouple && startApp.price == 0) ? "GEMELLO" : (startApp.dur||30) + "m";
                    
                    var opHtml = startApp.op ? `<span style="font-size:10px; font-weight:bold; color:var(--gold); display:block; margin-top:1px;">OP: ${startApp.op}</span>` : '';
                    var noteHtml = startApp.note ? `<div style="font-size:9px; font-style:italic; opacity:0.9; margin-top:2px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">💬 ${startApp.note}</div>` : '';

                    h += `<div class="time-row"><div class="time-lbl">${s}</div>
                          <div class="slot" data-ora="${s}" data-cab="${c}" onclick="m_handleSlotClick(event, ${c}, '${s}')">
                            <div class="app-base ${isEseg} ${isCoupleCls} ${isTwinCls} ${isMoving}" style="${hCss}" onclick="if(!window.activeMoveAppId && typeof m_openFormSafe === 'function') m_openFormSafe(event, '${startApp.id}', '${d}')">
                                ${isMoving || startApp.isCouple ? '' : `<div class="move-dot" onclick="m_startMoveMode(event, '${startApp.id}')"><i class="material-icons-round" style="font-size:16px; color:var(--accent);">open_with</i></div>`}
                                <div class="app-info-col" style="pointer-events:none; padding-right:15px; z-index:2; position:relative;">
                                    <b>${coupleIcon}${startApp.cog || 'N.D.'}</b>
                                    <span style="font-size:10px; opacity:0.8; margin-top:1px; display:block;">${startApp.serv || '-'} (${priceLbl})</span>
                                    ${opHtml}
                                    ${noteHtml}
                                </div>
                            </div>
                            <div class="cleaning-tag" style="top:calc(${slotsCount * 100}%);"><i class="material-icons-round" style="font-size:10px; margin-right:3px;">cleaning_services</i> +10m Pulizia</div>
                          </div></div>`;
                }
            } else if(busyApp || tempBlockoutBusy) {
                var busyId = busyApp ? busyApp.id : "TEMP_BLOCK_ID";
                h += `<div class="time-row"><div class="time-lbl">${s}</div><div class="slot" data-ora="${s}" data-cab="${c}" onclick="m_handleSlotClick(event, ${c}, '${s}')"><div class="app-busy" data-id="${busyId}" onclick="if(!window.activeMoveAppId && typeof m_openFormSafe === 'function' && '${busyId}' !== 'TEMP_BLOCK_ID') m_openFormSafe(event, '${busyId}', '${d}')"></div></div></div>`;
            } else if(startReq) {
                var slotsCountReq = Math.ceil((parseInt(startReq.dur) || 30) / 15);
                var hCssReq = `height: calc(${slotsCountReq * 100}% - 4px); top: 2px;`;
                h += `<div class="time-row"><div class="time-lbl">${s}</div>
                      <div class="slot" data-ora="${s}" data-cab="${c}" onclick="m_handleSlotClick(event, ${c}, '${s}')">
                        <div class="app-base req-style" style="${hCssReq}" onclick="if(!window.activeMoveAppId) alert('Richiesta SPA')">
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
    });
    grid.innerHTML = h;
}