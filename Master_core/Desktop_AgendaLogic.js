/* Master_core/Desktop_AgendaLogic.js - Motore Grafico, Render Griglia e Drag & Drop */

window._timeCache = new Map();
window._blockoutTimer = null;
window._isCreatingBlockout = false;
window._blockoutStartOra = null;
window._blockoutEndOra = null;
window._blockoutCab = null;
window._tempActiveBlockout = null;
window._copyBlockoutData = null;
window._activeResizingBlockoutId = null;
window._resizingDirection = null;

window.bypassShadow = false;
window.tempShadowMoveData = null;

window.sysConfirmShadowOverride = function() {
    var sm = document.getElementById('shadowWarningModal');
    if(sm) sm.style.display = 'none';
    window.bypassShadow = true;
    if (window.tempShadowMoveData) {
        window.sysMoveAppointment(window.tempShadowMoveData.appId, window.tempShadowMoveData.newOra, window.tempShadowMoveData.newCab);
        window.tempShadowMoveData = null;
    } else if (typeof window.sysSaveApp === 'function') {
        window.sysSaveApp();
    }
};

window.tToM = function(t) { 
    if(!t || typeof t !== 'string') return 0; 
    if(window._timeCache.has(t)) return window._timeCache.get(t);
    const p = t.split(':'); 
    const mins = (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0);
    window._timeCache.set(t, mins);
    return mins;
};

window.mToT = function(m) { 
    const h = Math.floor(m/60); 
    const mm = m%60; 
    return `${String(h).padStart(2,'0')}:${String(mm).padStart(2,'0')}`; 
};

window.getSlots = function() { 
    let s = []; 
    for(let i=10*60; i<=20*60; i+=10) s.push(window.mToT(i)); 
    return s; 
};

window.sysFixTwinData = function(app) {
    if(app.isCouple && !app.linkedId) return { ...app, linkedId: "RECOVERED_" + app.id };
    return app;
};

window.normalizeFbArray = function(data) {
    if (!data) return [];
    const arr = Array.isArray(data) ? data : Object.values(data);
    return arr.map(app => {
        let cleanApp = window.sysFixTwinData(app);
        if (!window._timeCache.has(cleanApp.ora)) {
            const parts = (cleanApp.ora || "00:00").split(':');
            window._timeCache.set(cleanApp.ora, (parseInt(parts[0], 10) * 60) + parseInt(parts[1], 10));
        }
        cleanApp.oraMin = window._timeCache.get(cleanApp.ora);
        cleanApp.durInt = parseInt(cleanApp.dur, 10) || 30;
        cleanApp.oraFine = cleanApp.oraMin + cleanApp.durInt;
        return cleanApp;
    });
};

window.sysDeltaUpdateDOM = function(appId, newOra, newCab) {
    const appElement = document.querySelector(`.app-base[data-app-id="${appId}"]`);
    if (!appElement) return window.render(); 

    const targetSlot = document.querySelector(`.slot[data-ora="${newOra}"][data-cab="${newCab}"]`);
    if (targetSlot) {
        targetSlot.innerHTML = ''; 
        targetSlot.appendChild(appElement);
        appElement.classList.remove('dragging');
        appElement.style.opacity = "1";
    } else {
        window.render();
    }
};

window._startBlockoutCreation = function(ora, cab) {
    window._isCreatingBlockout = true;
    window._blockoutStartOra = ora;
    window._blockoutCab = cab;
    window._blockoutEndOra = ora;
    if(window.showToast) window.showToast("🛠️ Selezione Blocco attiva! Muovi il mouse per estendere, clicca per stabilizzare.");
    window.render();
};

window._drawTempBlockout = function() {
    document.querySelectorAll('.slot-temp-blockout').forEach(el => {
        el.classList.remove('slot-temp-blockout');
        el.style.backgroundColor = '';
    });
    const startMin = Math.min(window.tToM(window._blockoutStartOra), window.tToM(window._blockoutEndOra));
    const endMin = Math.max(window.tToM(window._blockoutStartOra), window.tToM(window._blockoutEndOra));
    for (let m = startMin; m <= endMin; m += 10) {
        const slot = document.querySelector(`.slot[data-ora="${window.mToT(m)}"][data-cab="${window._blockoutCab}"]`);
        if (slot) {
            slot.classList.add('slot-temp-blockout');
            slot.style.backgroundColor = 'rgba(239, 68, 68, 0.25)';
        }
    }
};

window._stabilizeBlockout = function() {
    const startMin = Math.min(window.tToM(window._blockoutStartOra), window.tToM(window._blockoutEndOra));
    const endMin = Math.max(window.tToM(window._blockoutStartOra), window.tToM(window._blockoutEndOra));
    window._tempActiveBlockout = {
        id: "TEMP_BLOCKOUT_" + Date.now(),
        ora: window.mToT(startMin),
        cab: window._blockoutCab,
        dur: (endMin - startMin) + 10,
        isBlockout: true,
        status: 'editing'
    };
    window._isCreatingBlockout = false;
    window._blockoutStartOra = null; window._blockoutEndOra = null; window._blockoutCab = null;
    window.render();
};

window._confirmTempBlockout = function(id) {
    if (!window._tempActiveBlockout || !window.twStructId) return;
    const d = document.getElementById("mainDate").value;
    const appRoot = firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${window.twStructId}/app`);
    appRoot.child(d).once('value').then(snap => {
        let apps = window.normalizeFbArray(snap.val());
        apps.push({
            id: "BLOCKOUT_" + Date.now(), ora: window._tempActiveBlockout.ora,
            cab: parseInt(window._tempActiveBlockout.cab, 10), dur: parseInt(window._tempActiveBlockout.dur, 10),
            isBlockout: true, cog: 'BLOCCO CABINA', serv: 'FUORI SERVIZIO', pagato: false, eseguito: false
        });
        appRoot.child(d).set(apps).then(() => {
            window._tempActiveBlockout = null;
            if(window.showToast) window.showToast("🔒 Blocco Cabina Cristallizzato!");
            window.render();
        });
    });
};

window._deleteTempBlockout = function(id) {
    window._tempActiveBlockout = null;
    window.render();
};

window._copyTempBlockout = function(id) {
    if (!window._tempActiveBlockout) return;
    window._copyBlockoutData = { dur: window._tempActiveBlockout.dur, ora: window._tempActiveBlockout.ora };
    if(window.showToast) window.showToast("📋 Copiato! Clicca su uno slot in un'altra cabina per duplicarlo.");
};

window._editSavedBlockout = function(id) {
    const d = document.getElementById("mainDate").value;
    const appRoot = firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${window.twStructId}/app/${d}`);
    appRoot.once('value').then(snap => {
        let apps = window.normalizeFbArray(snap.val());
        const idx = apps.findIndex(x => x.id === id);
        if (idx > -1) {
            window._tempActiveBlockout = {
                id: apps[idx].id, ora: apps[idx].ora, cab: parseInt(apps[idx].cab, 10),
                dur: parseInt(apps[idx].dur, 10), isBlockout: true, status: 'editing'
            };
            apps.splice(idx, 1);
            appRoot.set(apps).then(() => window.render());
        }
    });
};

window._deleteSavedBlockout = function(id) {
    if (!confirm("Rimuovere definitivamente questo blocco cabina protetto?")) return;
    const d = document.getElementById("mainDate").value;
    const appRoot = firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${window.twStructId}/app/${d}`);
    appRoot.once('value').then(snap => {
        let apps = window.normalizeFbArray(snap.val());
        const idx = apps.findIndex(x => x.id === id);
        if (idx > -1) {
            apps.splice(idx, 1);
            appRoot.set(apps).then(() => window.render());
        }
    });
};

window.sysInitGridEventDelegation = function() {
    const grid = document.getElementById("mainGrid");
    if (!grid || grid.getAttribute('data-has-delegation') === 'true') return;
    grid.addEventListener('click', window.sysHandleGridClick);
    grid.addEventListener('mousedown', (e) => {
        const slot = e.target.closest('.slot');
        if (!slot || slot.querySelector('.cabina-chiusa-bg') || slot.querySelector('.app-base') || slot.querySelector('.app-busy')) return;
        const handle = e.target.closest('.resize-handle');
        if (handle) {
            e.stopPropagation();
            window._activeResizingBlockoutId = handle.closest('.app-base').getAttribute('data-app-id');
            window._resizingDirection = handle.classList.contains('handle-top') ? 'top' : 'bottom';
            document.body.style.cursor = 'ns-resize';
            return;
        }
        window._blockoutTimer = setTimeout(() => { window._startBlockoutCreation(slot.getAttribute('data-ora'), parseInt(slot.getAttribute('data-cab'), 10)); }, 3000); 
    });
    grid.addEventListener('mouseup', () => { clearTimeout(window._blockoutTimer); window._activeResizingBlockoutId = null; document.body.style.cursor = ''; });
    grid.addEventListener('mouseleave', () => { clearTimeout(window._blockoutTimer); window._activeResizingBlockoutId = null; document.body.style.cursor = ''; });
    grid.addEventListener('mousemove', (e) => {
        if (window._isCreatingBlockout) {
            const slot = e.target.closest('.slot');
            if (slot && parseInt(slot.getAttribute('data-cab'), 10) === window._blockoutCab) {
                window._blockoutEndOra = slot.getAttribute('data-ora');
                window._drawTempBlockout();
            }
            return;
        }
        if (window._activeResizingBlockoutId) {
            const slot = e.target.closest('.slot');
            if (!slot || !window._tempActiveBlockout) return;
            const currentMin = window.tToM(slot.getAttribute('data-ora'));
            const startMin = window.tToM(window._tempActiveBlockout.ora);
            const endMin = startMin + (parseInt(window._tempActiveBlockout.dur) || 30);
            if (window._resizingDirection === 'bottom' && currentMin > startMin) {
                window._tempActiveBlockout.dur = currentMin - startMin + 10;
            } else if (window._resizingDirection === 'top' && currentMin < endMin) {
                window._tempActiveBlockout.ora = slot.getAttribute('data-ora');
                window._tempActiveBlockout.dur = endMin - currentMin;
            }
            window.render();
        }
    });
    grid.addEventListener('dragstart', (e) => {
        const appEl = e.target.closest('.app-base');
        if (appEl && appEl.getAttribute('draggable') === 'true') { window.sysDragStart(e, appEl.getAttribute('data-app-id')); }
    });
    grid.addEventListener('dragend', window.sysDragEnd);
    grid.addEventListener('dragover', (e) => { if(e.target.closest('.slot')) window.sysAllowDrop(e); });
    grid.addEventListener('dragleave', (e) => { if(e.target.closest('.slot')) window.sysDragLeave(e); });
    grid.addEventListener('drop', (e) => { if(e.target.closest('.slot')) window.sysDrop(e); });
    grid.setAttribute('data-has-delegation', 'true');
};

window.sysHandleGridClick = function(e) {
    e.stopPropagation();
    const target = e.target;
    if (window._isCreatingBlockout) return window._stabilizeBlockout();
    if (window._copyBlockoutData) {
        const slotEl = target.closest('.slot');
        if (slotEl && !slotEl.querySelector('.cabina-chiusa-bg')) {
            window._tempActiveBlockout = { id: "TEMP_BLOCKOUT_" + Date.now(), ora: slotEl.getAttribute('data-ora'), cab: parseInt(slotEl.getAttribute('data-cab'), 10), dur: window._copyBlockoutData.dur, isBlockout: true, status: 'editing' };
            window._copyBlockoutData = null;
            if(window.showToast) window.showToast("📋 Blocco incollato con successo!");
            return window.render();
        }
    }
    if (target.closest('b[onclick]')) return; 
    const appEl = target.closest('.app-base');
    if (appEl && !appEl.classList.contains('blockout-editing-style') && !appEl.classList.contains('blockout-confirmed-style')) {
        if(typeof window.sysOpenEdit === 'function') window.sysOpenEdit(appEl.getAttribute('data-app-id'));
        return;
    }
    const busyEl = target.closest('.app-busy');
    if (busyEl && typeof window.sysOpenEdit === 'function') return window.sysOpenEdit(busyEl.getAttribute('data-id'));
    const slotEl = target.closest('.slot');
    if (slotEl && !slotEl.querySelector('.cabina-chiusa-bg')) {
        if(typeof window.sysOpenSlot === 'function') window.sysOpenSlot(slotEl.getAttribute('data-ora'), parseInt(slotEl.getAttribute('data-cab'), 10));
    }
};

window.render = function() {
    try {
        const grid = document.getElementById("mainGrid"); 
        if(!grid || grid.style.display === 'none') return;
        const d = document.getElementById("mainDate") ? document.getElementById("mainDate").value : null; 
        if(!d) return;

        let dayApps = (window.db && window.db.app && window.db.app[d]) ? window.normalizeFbArray(window.db.app[d]) : [];
        let cabineConfig = (window.db && window.db.settings && window.db.settings.cabine_config) ? Object.values(window.db.settings.cabine_config) : [{ attiva: true, nome: "Cabina 1", start: "10:00", end: "20:00" }, { attiva: true, nome: "Cabina 2", start: "10:00", end: "20:00" }];

        let h = "";
        cabineConfig.forEach((cab, index) => {
            const cabNum = index + 1;
            if(cab.attiva === false) return; 
            const startM = window.tToM(cab.orari ? cab.orari.start : "10:00");
            const endM = window.tToM(cab.orari ? cab.orari.end : "20:00");

            h += `<div class="colonna"><div class="col-head">${cab.nome || ('CABINA ' + cabNum)}</div>`;
            window.getSlots().forEach(s => {
                const sMin = window.tToM(s);
                const slotAttrs = `data-ora="${s}" data-cab="${cabNum}"`;
                
                if(sMin < startM || sMin >= endM) {
                    h += `<div class="time-row"><div class="time-lbl">${s}</div><div class="slot cabina-chiusa-bg" style="background: repeating-linear-gradient(45deg, rgba(0,0,0,0.05), rgba(0,0,0,0.05) 10px, transparent 10px, transparent 20px); cursor:not-allowed;"></div></div>`;
                    return; 
                }

                let startApp = dayApps.find(x => parseInt(x.cab) === cabNum && x.oraMin >= sMin && x.oraMin < (sMin + 10));
                if (!startApp && window._tempActiveBlockout && window._tempActiveBlockout.cab === cabNum && window.tToM(window._tempActiveBlockout.ora) >= sMin && window.tToM(window._tempActiveBlockout.ora) < (sMin + 10)) {
                    startApp = window._tempActiveBlockout;
                }
                const busyApp = dayApps.find(x => parseInt(x.cab) === cabNum && sMin >= x.oraMin && sMin < (x.oraFine + 10) && !startApp);
                const tempBlockoutBusy = !startApp && window._tempActiveBlockout && window._tempActiveBlockout.cab === cabNum && sMin > window.tToM(window._tempActiveBlockout.ora) && sMin < (window.tToM(window._tempActiveBlockout.ora) + (parseInt(window._tempActiveBlockout.dur) || 30));

                if(startApp) {
                    if (startApp.isBlockout) {
                        const isEditing = startApp.status === 'editing';
                        const exactDur = parseInt(startApp.dur) || 30;
                        const hCss = `height: calc(${(exactDur / 10) * 100}% - 4px); top: 2px; padding: 0; display: flex; flex-direction: column; overflow: hidden; position: relative;`;
                        let styleStr = isEditing ? "background: rgba(239, 68, 68, 0.15) !important; border: 2px dashed #ef4444 !important; color: #ef4444 !important; font-weight: bold; border-radius: 8px;" : "background: #0f172a !important; border: 2px solid #1e3a8a !important; color: #3b82f6 !important; box-shadow: inset 0 0 10px rgba(59, 130, 246, 0.2); font-weight: bold; border-radius: 8px;";
                        let btns = isEditing ? `
                            <button onclick="event.stopPropagation(); window._confirmTempBlockout('${startApp.id}')" style="background:#10b981; color:white; border:none; border-radius:50%; width:28px; height:28px; cursor:pointer;"><i class="material-icons-round" style="font-size:16px;">check</i></button>
                            <button onclick="event.stopPropagation(); window._deleteTempBlockout('${startApp.id}')" style="background:#ef4444; color:white; border:none; border-radius:50%; width:28px; height:28px; cursor:pointer;"><i class="material-icons-round" style="font-size:16px;">delete</i></button>` : `
                            <button onclick="event.stopPropagation(); window._editSavedBlockout('${startApp.id}')" style="background:#eab308; border:none; border-radius:50%; width:28px; height:28px; cursor:pointer;"><i class="material-icons-round" style="font-size:16px;">edit</i></button>
                            <button onclick="event.stopPropagation(); window._deleteSavedBlockout('${startApp.id}')" style="background:#ef4444; color:white; border:none; border-radius:50%; width:28px; height:28px; cursor:pointer;"><i class="material-icons-round" style="font-size:16px;">delete</i></button>`;

                        h += `<div class="time-row"><div class="time-lbl">${s}</div><div class="slot" ${slotAttrs}><div class="app-base" style="${hCss} ${styleStr}" data-app-id="${startApp.id}"><div style="padding:10px 15px; display:flex; flex-direction:column; height:100%; justify-content:center; box-sizing:border-box; position:relative;"><span style="font-size:12px;">${isEditing ? 'Configurazione...' : 'ZONA PROTETTA'}</span><div style="position:absolute; right:10px; display:flex; gap:4px;">${btns}</div></div></div></div></div>`;
                        return;
                    }

                    const exactDur = startApp.durInt || 30;
                    const hCss = `height: calc(${((exactDur + 10) / 10) * 100}% - 4px); top: 2px; padding: 0; display: flex; flex-direction: column; overflow: hidden;`;
                    let noteHtml = startApp.note ? `<div class="app-note-preview"><i class="material-icons-round" style="font-size:10px; vertical-align:middle">chat</i> ${startApp.note}</div>` : '';
                    let patologieHtml = startApp.patologie ? `<div class="app-note-preview" style="color:var(--purple); border-left-color:var(--purple); background:rgba(168,85,247,0.1);"><i class="material-icons-round" style="font-size:10px; vertical-align:middle">medical_information</i> ${startApp.patologie}</div>` : '';
                    
                    let coupleClass = startApp.isCouple ? "couple-style" : "";
                    let twinClass = (startApp.isCouple && startApp.price == 0) ? "is-twin" : "";
                    let priceText = (startApp.isCouple && startApp.price == 0) ? "GEMELLO" : `${startApp.price || 0}€`;
                    
                    h += `<div class="time-row"><div class="time-lbl">${s}</div>
                          <div class="slot" ${slotAttrs}>
                            <div class="app-base ${startApp.pagato?'pagato-style':(startApp.eseguito?'eseguito-style':'')} ${coupleClass} ${twinClass}" style="${hCss}" ${startApp.isCouple?'':'draggable="true"'} data-app-id="${startApp.id}">
                                <div style="height: ${(exactDur/(exactDur+10))*100}%; padding: 6px 10px; box-sizing: border-box; overflow:hidden;">
                                    <b>Cam ${startApp.cam || '?'} - ${startApp.cog || 'N.D.'}</b><br>
                                    <span style="font-size:11px;">${startApp.serv || '-'} (${exactDur} min - ${priceText})</span><br>
                                    <span style="font-size:10px; font-weight:bold; color:var(--gold);">OP: ${startApp.op || '-'}</span>
                                    ${noteHtml}${patologieHtml}
                                </div>
                                <div style="height: ${(10/(exactDur+10))*100}%; background: repeating-linear-gradient(45deg, rgba(0,0,0,0.05), rgba(0,0,0,0.05) 5px, transparent 5px, transparent 10px); border-top: 1px dashed rgba(0,0,0,0.15); display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:bold; opacity:0.8;">+10m Pulizia</div>
                            </div>
                          </div></div>`;
                } else if(busyApp || tempBlockoutBusy) { 
                    h += `<div class="time-row"><div class="time-lbl">${s}</div><div class="slot" ${slotAttrs}><div class="app-busy" data-id="${busyApp ? busyApp.id : 'TEMP'}"></div></div></div>`;
                } else { 
                    h += `<div class="time-row"><div class="time-lbl">${s}</div><div class="slot" ${slotAttrs}></div></div>`; 
                }
            });
            h += `</div>`;
        });
        
        grid.innerHTML = h;
        if(window.sysApplyZoom) window.sysApplyZoom();
        if(window.sysInitGridEventDelegation) window.sysInitGridEventDelegation();
        
    } catch(err) { console.error("Render error: ", err); }
};

window.sysDragStart = function(e, appId) { 
    window.isDraggingApp = true; window.draggedAppId = appId; 
    e.dataTransfer.setData("text/plain", appId); 
    setTimeout(() => { if(e.target) { e.target.classList.add('dragging'); e.target.style.opacity = "0.01"; e.target.style.pointerEvents = "none"; } }, 10);
};

window.sysDragEnd = function(e) {
    window.isDraggingApp = false; window.draggedAppId = null;
    if(e.target) { e.target.classList.remove('dragging'); e.target.style.opacity = "1"; e.target.style.pointerEvents = "auto"; }
    document.querySelectorAll('.slot').forEach(s => s.classList.remove('drag-over'));
};

window.sysAllowDrop = function(e) { 
    const slot = e.target.closest('.slot');
    if(!slot || slot.querySelector('.cabina-chiusa-bg') || (slot.querySelector('.app-busy') && slot.querySelector('.app-busy').getAttribute('data-id') !== window.draggedAppId)) return;
    e.preventDefault(); slot.classList.add('drag-over'); 
};

window.sysDragLeave = function(e) { if(e.target.closest('.slot')) e.target.closest('.slot').classList.remove('drag-over'); };

window.sysDrop = function(e) { 
    e.preventDefault(); window.isDraggingApp = false;
    document.querySelectorAll('.slot').forEach(s => s.classList.remove('drag-over'));
    const slot = e.target.closest('.slot'); 
    if(!slot) return;
    const appId = e.dataTransfer.getData("text/plain") || window.draggedAppId; 
    if(appId && slot.getAttribute('data-ora') && slot.getAttribute('data-cab')) window.sysMoveAppointment(appId, slot.getAttribute('data-ora'), slot.getAttribute('data-cab'));
};

// Logica Drag and Drop SPOSTAMENTO
window.sysMoveAppointment = function(appId, newOra, newCab) {
    const d = document.getElementById("mainDate").value; 
    if(!d || !window.twStructId) return;
    const appRoot = firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${window.twStructId}/app`);
    appRoot.child(d).once('value').then(snap => {
        let apps = window.normalizeFbArray(snap.val());
        const idx = apps.findIndex(x => x.id === appId);
        if(idx > -1) {
            const appToMove = apps[idx];
            if(appToMove.isCouple) { if(window.showErrorToast) window.showErrorToast("Spostamento rapido disabilitato per massaggi di coppia."); return; }
            const startMin = window.tToM(newOra); 
            const endMin = startMin + (appToMove.durInt || 30);
            
            let hardCollision = false; let shadowCollision = false; let opCollision = null;
            apps.forEach(a => { 
                if(a.id === appId) return;
                if(parseInt(a.cab) === parseInt(newCab) && startMin < (a.oraFine + 10) && (endMin + 10) > a.oraMin) {
                    if(startMin < a.oraFine && endMin > a.oraMin) hardCollision = true; else shadowCollision = true;
                }
                if(appToMove.op && a.op && (a.op || '').toLowerCase() === (appToMove.op || '').toLowerCase() && startMin < (a.oraFine + 10) && (endMin + 10) > a.oraMin) opCollision = a;
            });

            if (hardCollision) { if(window.showErrorToast) window.showErrorToast("⛔ Spazio occupato!"); return window.render(); }
            
            // CONFLITTO OPERATORE NEL DRAG & DROP
            if (opCollision) {
                const repSelect = document.getElementById('theftReplacementOp');
                if (repSelect) {
                    repSelect.innerHTML = '<option value="">-- Seleziona Sostituto Libero --</option>';
                    Object.values(window.allUsersData).forEach(u => {
                        const isGhost = (u.attivo === false || u.attiva === false || u.eliminato === true || u.deleted === true || u.attivo === "false" || u.attiva === "false" || u.eliminato === "true" || u.deleted === "true");
                        if (String(u.structureId) === String(window.twStructId) && !isGhost && u.nick !== appToMove.op) {
                            const isRepBusy = apps.some(a => {
                                if (a.id === appId) return false; 
                                if ((a.op || '').toLowerCase() !== (u.nick || '').toLowerCase()) return false;
                                const aStart = window.tToM(a.ora);
                                const aEnd = aStart + parseInt(a.dur || 30) + 10;
                                return (startMin < aEnd && (endMin + 10) > aStart);
                            });
                            if (!isRepBusy) {
                                const cleanName = `${u.name || ''} ${u.surname || ''}`.trim();
                                repSelect.innerHTML += `<option value="${u.nick}">🟢 ${cleanName}</option>`;
                            }
                        }
                    });
                }
                
                document.getElementById('theftOpName').innerText = appToMove.op;
                document.getElementById('theftOldTime').innerText = `Spostamento in conflitto con: ${opCollision.cog || 'Cliente'} alle ${opCollision.ora}`;
                
                // Salva i dati per il pop-up
                window._theftMoveData = { appId: appId, newOra: newOra, newCab: newCab, conflictApp: opCollision };
                if (document.getElementById('operatorTheftModal')) document.getElementById('operatorTheftModal').style.display = 'flex';
                return;
            }

            if (shadowCollision && !window.bypassShadow) {
                window.tempShadowMoveData = { appId: appId, newOra: newOra, newCab: newCab };
                if(document.getElementById('shadowWarningModal')) document.getElementById('shadowWarningModal').style.display = 'flex';
                return; 
            }

            window.bypassShadow = false;
            apps[idx].ora = newOra; apps[idx].cab = parseInt(newCab);
            window.sysDeltaUpdateDOM(appId, newOra, newCab);
            appRoot.set(apps).then(() => {
                if(window.showToast) window.showToast("Spostamento eseguito con successo!");
            });
        }
    });
};

window.sysSetZoom = function(offset) {
    const slider = document.getElementById('gridZoom');
    if(!slider) return;
    let val = parseInt(slider.value) + offset;
    if(val < 50) val = 50; if(val > 150) val = 150;
    slider.value = val; window.sysApplyZoom();
};

window.sysApplyZoom = function() {
    const slider = document.getElementById('gridZoom');
    if(!slider) return;
    let styleEl = document.getElementById('dynamicZoomStyle');
    if(!styleEl) { styleEl = document.createElement('style'); styleEl.id = 'dynamicZoomStyle'; document.head.appendChild(styleEl); }
    styleEl.innerHTML = `.time-row { height: ${Math.floor(60 * (parseInt(slider.value) / 100))}px !important; }`;
};