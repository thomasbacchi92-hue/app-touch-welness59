/* Master_core/UI_Grid.js - Renderer Griglia con Filtro Anti-Crash e Motore Grafico Sicuro */

window._timeCache = new Map();

window.tToM = function(t) { 
    if(!t || typeof t !== 'string') return 0; 
    if(window._timeCache.has(t)) return window._timeCache.get(t);
    const p = t.split(':'); 
    const mins = (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0);
    window._timeCache.set(t, mins);
    return mins;
};

window.mToT = function(m) { 
    const h = Math.floor(m/60); const mm = m%60; 
    return `${String(h).padStart(2,'0')}:${String(mm).padStart(2,'0')}`; 
};

window.getSlots = function() { 
    let s = []; for(let i=10*60; i<=20*60; i+=10) s.push(window.mToT(i)); 
    return s; 
};

window.sysFixTwinData = function(app) {
    if(app.isCouple && !app.linkedId) return { ...app, linkedId: "RECOVERED_" + app.id };
    return app;
};

// FILTRO ANTI-BUCHI: Previene il crash se Firebase invia dati nulli
window.normalizeFbArray = function(data) {
    if (!data) return [];
    const arr = Array.isArray(data) ? data : Object.values(data);
    return arr.filter(app => app !== null && app !== undefined).map(app => {
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
        targetSlot.innerHTML = ''; targetSlot.appendChild(appElement);
        appElement.classList.remove('dragging'); appElement.style.opacity = "1";
    } else { window.render(); }
};

window.render = function() {
    try {
        const grid = document.getElementById("mainGrid"); 
        if(!grid || grid.style.display === 'none') return;
        const d = document.getElementById("mainDate") ? document.getElementById("mainDate").value : null; 
        if(!d) return;

        let dayApps = (window.db && window.db.app && window.db.app[d]) ? window.normalizeFbArray(window.db.app[d]) : [];
        let cabineConfig;
        
        if (window.db && window.db.settings && window.db.settings.cabine_config) {
            cabineConfig = Object.values(window.db.settings.cabine_config);
            localStorage.setItem('tw_cached_cabine', JSON.stringify(cabineConfig));
        } else {
            const cached = localStorage.getItem('tw_cached_cabine');
            if(cached) { try { cabineConfig = JSON.parse(cached); } catch(e){} }
        }

        // Ponte Real-Time per il Motore Grafico
        let gfx = (window.cuscinetto && window.cuscinetto.graphicsSettings) ? window.cuscinetto.graphicsSettings : ((window.db && window.db.settings && window.db.settings.grafica) ? window.db.settings.grafica : null);

        if (!cabineConfig || cabineConfig.length === 0) {
            grid.innerHTML = `
                <div style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; background:var(--bg-body); color:var(--text-muted);">
                    <i class="material-icons-round" style="font-size:48px; color:var(--accent); animation: tw-spin 2s linear infinite;">sync</i>
                    <h3 style="margin-top:15px; text-transform:uppercase; font-size:14px; letter-spacing:1px; color:var(--text-main);">Sincronizzazione Struttura...</h3>
                    <style>@keyframes tw-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
                </div>
            `;
            return;
        }

        let h = "";
        cabineConfig.forEach((cab, index) => {
            const cabNum = index + 1;
            if(cab.attiva === false) return; 
            const startM = window.tToM(cab.orari ? cab.orari.start : "10:00");
            const endM = window.tToM(cab.orari ? cab.orari.end : "20:00");

            h += `<div class="colonna" data-cab="${cabNum}"><div class="col-head">${cab.nome || ('CABINA ' + cabNum)}</div>`;
            window.getSlots().forEach(s => {
                const sMin = window.tToM(s);
                const slotAttrs = `data-ora="${s}" data-cab="${cabNum}"`;
                
                if(sMin < startM || sMin >= endM) {
                    h += `<div class="time-row"><div class="time-lbl">${s}</div><div class="slot cabina-chiusa-bg" style="background: repeating-linear-gradient(45deg, rgba(0,0,0,0.05), rgba(0,0,0,0.05) 10px, transparent 10px, transparent 20px); cursor:not-allowed;"></div></div>`;
                    return; 
                }

                let startApp = dayApps.find(x => parseInt(x.cab) === cabNum && x.oraMin >= sMin && x.oraMin < (sMin + 10));
                const busyApp = dayApps.find(x => parseInt(x.cab) === cabNum && sMin >= x.oraMin && sMin < (x.oraFine + 10) && !startApp);

                if(startApp) {
                    const exactDur = startApp.durInt || 30;
                    
                    let extraStyles = "";
                    let isCustomPainted = false;

                    // Paracadute Verniciatore Anti-Crash
                    try {
                        if (gfx && gfx.usa_preset === false) {
                            let appColor = null;
                            if (gfx.criterio_attivo === 'servizio' && gfx.colori_servizio) {
                                let srvKey = startApp.servId || startApp.aServ || startApp.serv_id;
                                if (!srvKey && startApp.serv && window.db && window.db.servizi) {
                                    const serviziArr = Array.isArray(window.db.servizi) ? window.db.servizi : Object.values(window.db.servizi);
                                    for (const v of serviziArr) {
                                        if (v && v.nome === startApp.serv) { srvKey = v.id; break; }
                                    }
                                }
                                if (!srvKey) srvKey = startApp.serv; 
                                if (srvKey && gfx.colori_servizio[srvKey]) appColor = gfx.colori_servizio[srvKey];
                                
                            } else if (gfx.criterio_attivo === 'durata' && gfx.colori_durata) {
                                if (gfx.colori_durata[`dur_${exactDur}`]) appColor = gfx.colori_durata[`dur_${exactDur}`];
                            }

                            if (appColor && appColor !== "default") {
                                extraStyles = `background-color: ${appColor} !important; color: #ffffff !important; border-left-color: rgba(255,255,255,0.4) !important; box-shadow: inset 4px 0 0 rgba(0,0,0,0.3) !important;`;
                                isCustomPainted = true;
                            }
                        }
                    } catch (colorErr) { console.warn("Colore skippato per App ID:", startApp.id); }

                    const hCss = `height: calc(${((exactDur + 10) / 10) * 100}\% - 4px); top: 2px; padding: 0; display: flex; flex-direction: column; overflow: hidden; position:absolute; ${extraStyles}`;
                    
                    let coupleClass = startApp.isCouple ? "couple-style" : "";
                    let twinClass = (startApp.isCouple && startApp.price == 0) ? "is-twin" : "";
                    let priceText = (startApp.isCouple && startApp.price == 0) ? "GEMELLO" : `${startApp.price || 0}€`;
                    
                    let statusIcon = "";
                    if (startApp.pagato) statusIcon = `<i class="material-icons-round" style="font-size:12px; color:#10b981; vertical-align:middle; background:#fff; border-radius:50%; margin-left:4px; box-shadow:0 1px 2px rgba(0,0,0,0.2);" title="Pagato">check_circle</i>`;
                    else if (startApp.eseguito) statusIcon = `<i class="material-icons-round" style="font-size:12px; color:var(--purple); vertical-align:middle; background:#fff; border-radius:50%; margin-left:4px; box-shadow:0 1px 2px rgba(0,0,0,0.2);" title="Eseguito">done</i>`;

                    let quickActions = `
                        <div style="position:absolute; top:4px; right:4px; display:flex; gap:4px; z-index:10; background:inherit; padding-left:4px; border-radius:0 0 0 6px;">
                            <div title="Profilo Cliente" onclick="event.stopPropagation(); if(window.sysOpenCRMProfileGrid) window.sysOpenCRMProfileGrid('${startApp.cog}')" style="width:22px; height:22px; background:var(--purple); border-radius:6px; display:flex; align-items:center; justify-content:center; color:#fff; box-shadow:0 2px 4px rgba(0,0,0,0.3); cursor:pointer;"><i class="material-icons-round" style="font-size:14px;">person</i></div>
                            <div title="Elimina" onclick="event.stopPropagation(); if(window.sysPromptDelete) window.sysPromptDelete('${startApp.id}', '${d}')" style="width:22px; height:22px; background:var(--red); border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; box-shadow:0 2px 4px rgba(0,0,0,0.3); cursor:pointer;"><i class="material-icons-round" style="font-size:14px;">close</i></div>
                        </div>
                    `;

                    let extNote = startApp.note ? `<div style="flex:1; overflow-y:auto; background:rgba(255,255,255,0.85); border-left:2px solid var(--accent); padding:4px 6px; border-radius:4px; font-size:10px; font-style:italic; color:#0f172a; font-weight:800;">${startApp.note}</div>` : '';
                    let extPat = startApp.patologie ? `<div style="flex:1; overflow-y:auto; background:var(--bg-panel); border-left:2px solid var(--red); color:var(--red); padding:4px 6px; border-radius:4px; font-size:10px; font-weight:bold;">${startApp.patologie}</div>` : '';

                    h += `<div class="time-row"><div class="time-lbl">${s}</div>
                          <div class="slot" ${slotAttrs}>
                            <div class="app-base ${!isCustomPainted && startApp.pagato?'pagato-style':(!isCustomPainted && startApp.eseguito?'eseguito-style':'')} ${coupleClass} ${twinClass}" style="${hCss}" ${startApp.isCouple?'':'draggable="true"'} data-app-id="${startApp.id}" data-serv="${startApp.servId || startApp.serv}" data-dur="${exactDur}">
                                ${quickActions}
                                <div style="display:flex; flex-direction:column; height: ${(exactDur/(exactDur+10))*100}%; padding: 6px; box-sizing: border-box; overflow:hidden;">
                                    
                                    <div style="flex-shrink:0; padding-right:55px; margin-bottom:4px;">
                                        <b style="display:block; font-size:13px; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:2px;">Cam ${startApp.cam || '?'} -${startApp.cog || 'N.D.'}</b>
                                        <div style="font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${startApp.serv || '-'} (${exactDur}m | ${priceText})${statusIcon}</div>
                                        <div style="font-size:10px; font-weight:bold; color:${isCustomPainted ? 'rgba(255,255,255,0.8)' : 'var(--gold)'}; margin-top:2px;">OP: ${startApp.op || '-'}</div>
                                    </div>
                                    
                                    <div style="flex:1; display:flex; flex-direction:column; gap:4px; overflow:hidden;">
                                        ${extNote}${extPat}
                                    </div>

                                </div>
                                <div style="height: ${(10/(exactDur+10))*100}%; background: repeating-linear-gradient(45deg, rgba(0,0,0,0.05), rgba(0,0,0,0.05) 5px, transparent 5px, transparent 10px); border-top: 1px dashed rgba(0,0,0,0.15); display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:bold; opacity:0.8;">+10m Pulizia</div>
                            </div>
                          </div></div>`;
                } else if(busyApp) { 
                    h += `<div class="time-row"><div class="time-lbl">${s}</div><div class="slot" ${slotAttrs}><div class="app-busy" data-id="${busyApp.id}"></div></div></div>`;
                } else { 
                    h += `<div class="time-row"><div class="time-lbl">${s}</div><div class="slot" ${slotAttrs}></div></div>`; 
                }
            });
            h += `</div>`;
        });
        
        grid.innerHTML = h;
        if(window.sysInitGridEventDelegation) window.sysInitGridEventDelegation();
        
        setTimeout(() => {
            const todayStr = new Date().toISOString().split('T')[0];
            if(d !== todayStr) return;
            const now = new Date(); const mins = ((now.getHours() - 10) * 60) + now.getMinutes();
            if (mins >= 0 && now.getHours() < 20) {
                let laser = document.getElementById("timeLaser");
                if (!laser) { laser = document.createElement("div"); laser.id = "timeLaser"; grid.appendChild(laser); }
                laser.style.cssText = "position:absolute; left:0; height:1px !important; background-color:var(--purple) !important; z-index:15; pointer-events:none; box-shadow:none !important; border:none !important;";
                laser.style.width = grid.scrollWidth > 0 ? grid.scrollWidth + "px" : "100%";
                laser.style.top = `${(mins * 6) + 46}px`; 
                laser.style.display = 'block';
            }
        }, 100);
        
    } catch(err) { console.error("Render error: ", err); }
};

window.sysCheckIfTodayAndCenter = function() {
    const dEl = document.getElementById("mainDate");
    const todayStr = new Date().toISOString().split('T')[0];
    if(!dEl || dEl.value !== todayStr) return;
    setTimeout(() => {
        const laser = document.getElementById("timeLaser");
        const grid = document.getElementById("mainGrid");
        if(laser && laser.style.display !== 'none' && grid) {
            const targetY = parseFloat(laser.style.top) - (grid.clientHeight / 2);
            grid.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
        }
    }, 400);
};

window.sysInitGridEventDelegation = function() {
    const grid = document.getElementById("mainGrid");
    if (!grid || grid.getAttribute('data-has-delegation') === 'true') return;
    grid.addEventListener('click', window.sysHandleGridClick);
    grid.addEventListener('dragstart', (e) => { const appEl = e.target.closest('.app-base'); if (appEl && appEl.getAttribute('draggable') === 'true') { window.sysDragStart(e, appEl.getAttribute('data-app-id')); } });
    grid.addEventListener('dragend', window.sysDragEnd);
    grid.addEventListener('dragover', (e) => { if(e.target.closest('.slot')) window.sysAllowDrop(e); });
    grid.addEventListener('dragleave', (e) => { if(e.target.closest('.slot')) window.sysDragLeave(e); });
    grid.addEventListener('drop', (e) => { if(e.target.closest('.slot')) window.sysDrop(e); });
    grid.setAttribute('data-has-delegation', 'true');
};

window.sysHandleGridClick = function(e) {
    e.stopPropagation();
    const target = e.target;
    if (target.closest('b[onclick]') || target.closest('div[onclick]')) return; 
    const appEl = target.closest('.app-base');
    if (appEl) { if(typeof window.sysOpenEdit === 'function') window.sysOpenEdit(appEl.getAttribute('data-app-id')); return; }
    const busyEl = target.closest('.app-busy');
    if (busyEl && typeof window.sysOpenEdit === 'function') return window.sysOpenEdit(busyEl.getAttribute('data-id'));
    const slotEl = target.closest('.slot');
    if (slotEl && !slotEl.querySelector('.cabina-chiusa-bg')) {
        if(typeof window.sysOpenSlot === 'function') window.sysOpenSlot(slotEl.getAttribute('data-ora'), parseInt(slotEl.getAttribute('data-cab'), 10));
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const ghost = document.createElement('div');
    ghost.id = 'tw-drag-ghost';
    ghost.style.cssText = "width:40px; height:40px; background:var(--purple); border:2px solid white; border-radius:8px; position:absolute; top:-1000px; left:-1000px; z-index:-1;";
    document.body.appendChild(ghost);
});

window.sysDragStart = function(e, appId) { 
    window.isDraggingApp = true; window.draggedAppId = appId; 
    e.dataTransfer.setData("text/plain", appId); 
    const ghost = document.getElementById('tw-drag-ghost');
    if(ghost) e.dataTransfer.setDragImage(ghost, 20, 20);
    setTimeout(() => { if(e.target) { e.target.classList.add('dragging'); e.target.style.opacity = "0.01"; e.target.style.pointerEvents = "none"; } }, 10);
};

window.sysDragEnd = function(e) {
    window.isDraggingApp = false; window.draggedAppId = null;
    if(e.target) { e.target.classList.remove('dragging'); e.target.style.opacity = "1"; e.target.style.pointerEvents = "auto"; }
    document.querySelectorAll('.slot').forEach(s => s.classList.remove('drag-over'));
};

window.sysAllowDrop = function(e) { 
    const slot = e.target.closest('.slot');
    if(!slot || slot.querySelector('.cabina-chiusa-bg')) return;
    e.preventDefault(); slot.classList.add('drag-over'); 
};

window.sysDragLeave = function(e) { if(e.target.closest('.slot')) e.target.closest('.slot').classList.remove('drag-over'); };

window.sysDrop = function(e) { 
    e.preventDefault(); window.isDraggingApp = false;
    document.querySelectorAll('.slot').forEach(s => s.classList.remove('drag-over'));
    const slot = e.target.closest('.slot'); 
    if(!slot) return;
    const appId = e.dataTransfer.getData("text/plain") || window.draggedAppId; 
    if(appId && slot.getAttribute('data-ora') && slot.getAttribute('data-cab') && window.sysValidateMove) {
        window.sysValidateMove(appId, slot.getAttribute('data-ora'), slot.getAttribute('data-cab'));
    }
};
