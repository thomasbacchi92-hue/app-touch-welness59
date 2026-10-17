/* OperatoriDisp/Logic_Operatori.js - Motore di Rendering, D&D Custom Ghost e Privacy */

window._timeCache = new Map();
window.isAdminMode = false; // Di default la trasparenza è nascosta (prezzi e durate censurati)

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

window.renderOperatori = function() {
    try {
        const grid = document.getElementById("mainGrid"); 
        if(!grid) return;
        const d = document.getElementById("mainDate") ? document.getElementById("mainDate").value : null; 
        if(!d) return;

        let rawApps = (window.db && window.db.app && window.db.app[d]) ? Object.values(window.db.app[d]) : [];
        let ops = window.allUsersData ? Object.values(window.allUsersData).filter(u => String(u.structureId) === String(window.twStructId) && u.attivo !== false && u.eliminato !== true) : [];

        // Filtro Blocchi Cabina
        let dayApps = rawApps.filter(a => {
            if(!a) return false;
            let isBlockFlag = (a.isBlock === true || a.isBlock === "true");
            let srv = (a.serv || "").toLowerCase();
            let cog = (a.cog || "").toLowerCase();
            if(isBlockFlag || srv.includes("blocco") || cog.includes("blocco")) return false;
            return true;
        });

        let stats = {};
        ops.forEach(o => {
            stats[o.nick] = { incasso: 0, count: 0, minuti: 0, apps: [] };
        });

        let unassignedApps = [];

        dayApps.forEach(a => {
            if(!a.op || a.op === '' || a.op.toLowerCase() === 'nessuno' || a.op === 'non assegnato') {
                unassignedApps.push(a);
            } else if(stats[a.op]) {
                stats[a.op].incasso += parseFloat(a.price || a.basePrice || 0);
                stats[a.op].count++;
                stats[a.op].minuti += parseInt(a.dur || 30);
                stats[a.op].apps.push(a);
            }
        });

        let h = `<style>
            .free-time-style { background: #475569 !important; border-left: 5px solid #94a3b8 !important; color: #ffffff !important; width: calc(100% - 4px) !important; left: 2px !important; pointer-events: none; z-index: 1; display:flex; flex-direction:column; align-items:flex-start; justify-content:flex-start; padding:6px 10px; }
            .slot.drag-over-slot { background: rgba(168, 85, 247, 0.2) !important; box-shadow: inset 0 0 0 2px var(--purple) !important; z-index: 20; }
        </style>`;

        // 1. COLONNA ASSEGNAZIONI
        h += `<div class="colonna op-drop-zone unassigned-col" data-op="Nessuno" style="min-width:280px; flex:none; border-right: 2px dashed var(--accent); background: rgba(56, 189, 248, 0.03);">
            <div class="col-head" style="border-bottom-color: var(--accent);">
                <div class="op-name" style="color: var(--accent);">ASSEGNAZIONI</div>
                <div style="font-size:10px; margin-top:10px; color:var(--text-muted); font-weight:bold;">APPUNTAMENTI DA PIAZZARE</div>
            </div>`;
        
        window.getSlots().forEach(slotTime => {
            let sMin = window.tToM(slotTime);
            h += `<div class="time-row"><div class="time-lbl">${slotTime}</div><div class="slot" data-ora="${slotTime}">`;
            let appsHere = unassignedApps.filter(a => window.tToM(a.ora) >= sMin && window.tToM(a.ora) < sMin+10);
            appsHere.forEach((app, idx) => {
                let exactDur = parseInt(app.dur || 30);
                let durText = window.isAdminMode ? `${exactDur}m` : `--m`;
                let hCss = `height: calc(${((exactDur + 10) / 10) * 100}% - 4px);`;
                let styleClass = idx === 0 ? "app-normal" : "app-overlap";
                
                h += `<div class="app-base ${styleClass}" style="${hCss} background:#0284c7; border-left-color:#7dd3fc;" data-id="${app.id}" draggable="true">
                    <b style="display:block; font-size:13px; text-transform:uppercase; margin-bottom:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${app.cog || 'Ospite'}</b>
                    <span>${app.serv || 'Trattamento'} (${durText})</span>
                    <div style="font-size:9px; margin-top:4px; opacity:0.8; font-weight:bold;">Cam ${app.cam || '-'}</div>
                </div>`;
            });
            h += `</div></div>`;
        });
        h += `</div>`;

        // 2. COLONNE OPERATORI
        ops.forEach(op => {
            let s = stats[op.nick];
            let oreStr = window.isAdminMode ? (Math.floor(s.minuti / 60) > 0 ? `${Math.floor(s.minuti / 60)}h ${s.minuti % 60}m` : `${s.minuti % 60}m`) : `--h --m`;
            let incassoStr = window.isAdminMode ? `${s.incasso.toFixed(2)}€` : `*** €`;

            let freeGaps = [];
            let currentMin = 600;
            let sortedApps = s.apps.sort((a,b) => window.tToM(a.ora) - window.tToM(b.ora));
            
            sortedApps.forEach(app => {
                let start = window.tToM(app.ora);
                let dur = parseInt(app.dur || 30);
                if (start > currentMin) { freeGaps.push({ start: currentMin, dur: start - currentMin }); }
                currentMin = Math.max(currentMin, start + dur + 10);
            });
            if (currentMin < 1200) { freeGaps.push({ start: currentMin, dur: 1200 - currentMin }); }

            h += `<div class="colonna op-drop-zone" data-op="${op.nick}" style="transition:0.2s;">
                <div class="col-head">
                    <div class="op-name">${op.name} ${op.surname || ''}</div>
                    <div class="metrics-box">
                        <span title="Fatturato" style="color:var(--green);">💰 ${incassoStr}</span>
                        <span title="N° Appuntamenti" style="color:var(--accent);">🗓️ ${s.count}</span>
                        <span title="Ore di Lavoro" style="color:var(--gold);">⏱️ ${oreStr}</span>
                    </div>
                </div>`;

            window.getSlots().forEach(slotTime => {
                let sMin = window.tToM(slotTime);
                h += `<div class="time-row"><div class="time-lbl">${slotTime}</div><div class="slot" data-ora="${slotTime}">`;

                let gapsHere = freeGaps.filter(g => g.start === sMin && g.dur >= 10);
                gapsHere.forEach(g => {
                    let hCss = `height: calc(${((g.dur) / 10) * 100}% - 4px);`;
                    let gapDurText = window.isAdminMode ? `${g.dur}m disponibili` : `In Turno`;
                    h += `<div class="app-base free-time-style" style="${hCss}">
                        <b style="display:block; font-size:13px; text-transform:uppercase; margin-bottom:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"><i class="material-icons-round" style="font-size:14px; vertical-align:middle; margin-right:4px;">support_agent</i>FRONT OFFICE</b>
                        <span style="font-size:9px; opacity:0.8; font-weight:bold;">${gapDurText}</span>
                    </div>`;
                });

                let appsHere = s.apps.filter(a => window.tToM(a.ora) >= sMin && window.tToM(a.ora) < sMin+10);
                appsHere.forEach((app, idx) => {
                    let exactDur = parseInt(app.dur || 30);
                    let durText = window.isAdminMode ? `${exactDur}m` : `--m`;
                    let hCss = `height: calc(${((exactDur + 10) / 10) * 100}% - 4px);`;
                    let styleClass = idx === 0 ? "app-normal" : "app-overlap";
                    
                    h += `<div class="app-base ${styleClass}" style="${hCss}" data-id="${app.id}" draggable="true">
                        <b style="display:block; font-size:13px; text-transform:uppercase; margin-bottom:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${app.cog || 'Ospite'}</b>
                        <span>${app.serv || 'Trattamento'} (${durText})</span>
                        <div style="font-size:9px; margin-top:4px; opacity:0.8; font-weight:bold;">Cam ${app.cam || '-'}</div>
                    </div>`;
                });

                h += `</div></div>`;
            });
            h += `</div>`;
        });

        grid.innerHTML = h;
        
        // Creazione del Custom Ghost per il D&D
        if (!document.getElementById('drag-ghost-cube')) {
            const ghost = document.createElement('div');
            ghost.id = 'drag-ghost-cube';
            ghost.style.width = '40px';
            ghost.style.height = '40px';
            ghost.style.backgroundColor = '#a855f7'; // Colore Viola
            ghost.style.border = '2px solid #fff';
            ghost.style.borderRadius = '8px';
            ghost.style.position = 'absolute';
            ghost.style.top = '-1000px';
            ghost.style.zIndex = '-1000';
            document.body.appendChild(ghost);
        }

        window.sysInitOperatoriDnD();
        
    } catch(err) { console.error("Errore nel rendering Operatori: ", err); }
};

window.sysInitOperatoriDnD = function() {
    const grid = document.getElementById("mainGrid");
    if (!grid || grid.getAttribute('data-has-dnd') === 'true') return;

    grid.addEventListener('dragstart', (e) => {
        const appEl = e.target.closest('.app-base:not(.free-time-style)');
        if (appEl && appEl.hasAttribute('draggable')) {
            window.draggedAppId = appEl.getAttribute('data-id');
            e.dataTransfer.setData("text/plain", window.draggedAppId);
            e.dataTransfer.effectAllowed = "move";
            
            // Imposta l'immagine custom (il quadratino) al posto dell'elemento intero
            const ghost = document.getElementById('drag-ghost-cube');
            e.dataTransfer.setDragImage(ghost, 20, 20);

            // Mantiene l'elemento originale leggermente visibile per capire da dove viene spostato
            setTimeout(() => { appEl.style.opacity = "0.5"; }, 10);
        } else {
            e.preventDefault(); 
        }
    });

    grid.addEventListener('dragend', (e) => {
        document.querySelectorAll('.app-base').forEach(el => el.style.opacity = "1");
        document.querySelectorAll('.slot.drag-over-slot').forEach(el => el.classList.remove('drag-over-slot'));
    });

    grid.addEventListener('dragover', (e) => {
        e.preventDefault(); 
        e.dataTransfer.dropEffect = "move";
        const slot = e.target.closest('.slot');
        if (slot) {
            if (!slot.classList.contains('drag-over-slot')) {
                document.querySelectorAll('.slot.drag-over-slot').forEach(el => el.classList.remove('drag-over-slot'));
                slot.classList.add('drag-over-slot');
            }
        }
    });

    grid.addEventListener('drop', (e) => {
        e.preventDefault();
        document.querySelectorAll('.slot.drag-over-slot').forEach(el => el.classList.remove('drag-over-slot'));

        const dropZone = e.target.closest('.op-drop-zone');
        if (!dropZone) return;

        const newOp = dropZone.getAttribute('data-op');
        let appId = e.dataTransfer.getData("text/plain");
        if (!appId) appId = window.draggedAppId; 

        if (newOp && appId) {
            window.sysMoveOperatorOnly(appId, newOp);
        }
    });

    grid.setAttribute('data-has-dnd', 'true');
};

window.sysMoveOperatorOnly = function(appId, newOp) {
    const d = document.getElementById("mainDate").value;
    if (!d || !window.twStructId) return;

    const appRoot = firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${window.twStructId}/app/${d}`);
    
    appRoot.once('value').then(snap => {
        let data = snap.val();
        if (!data) return;
        
        let apps = Array.isArray(data) ? data : Object.values(data);
        let appToMove = apps.find(x => x && String(x.id) === String(appId));
        
        if (!appToMove) return;
        if (appToMove.op === newOp) return; 

        appToMove.op = newOp;

        appRoot.set(apps).then(() => {
            if(window.showToast) window.showToast("Assegnazione aggiornata con successo!");
            window.renderOperatori();
        });
    });
};