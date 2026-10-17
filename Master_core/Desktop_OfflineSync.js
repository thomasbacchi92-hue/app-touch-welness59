/* master core/Desktop_OfflineSync.js - Motore di Sincronizzazione Offline, UI di Rete e Coda */

window.twOfflineQueue = JSON.parse(localStorage.getItem('tw_offline_queue')) || [];

window.addEventListener('DOMContentLoaded', () => {
    const queueModalHtml = `
        <div id="offlineQueueModal" class="modal-overlay" style="z-index:4000; display:none; align-items:center; justify-content:center; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); backdrop-filter:blur(5px); padding:15px;" onclick="if(event.target===this) this.style.display='none'">
            <div class="modal-box" style="background:var(--bg-panel); padding:20px; border-radius:16px; width:100%; max-width:600px; border:1px solid var(--border-line); box-shadow:0 10px 40px rgba(0,0,0,0.8); display:flex; flex-direction:column; max-height:85vh;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-line); padding-bottom:15px; margin-bottom:15px;">
                    <h3 style="margin:0; color:var(--text-main); display:flex; align-items:center; gap:10px;"><i class="material-icons-round" style="color:var(--gold);">sync_problem</i> Coda di Sincronizzazione</h3>
                    <button class="btn-icon" style="background:transparent; border:none; color:var(--text-muted); cursor:pointer;" onclick="document.getElementById('offlineQueueModal').style.display='none'"><i class="material-icons-round">close</i></button>
                </div>
                
                <div id="queueListArea" style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:10px; margin-bottom:15px; padding-right:5px;"></div>
                
                <div style="display:flex; gap:10px; border-top:1px solid var(--border-line); padding-top:15px;">
                    <button class="btn-save btn-outline" style="flex:1; margin:0;" onclick="document.getElementById('offlineQueueModal').style.display='none'">CHIUDI</button>
                    <button class="btn-save" style="flex:1; margin:0; background:var(--accent);" id="btnForceSync" onclick="sysProcessQueue()"><i class="material-icons-round">sync</i> FORZA INVIO MANUALE</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', queueModalHtml);
    
    sysUpdateNetworkUI();
});

window.addEventListener('online', () => { 
    if(typeof window.showToast === 'function') window.showToast("🟢 Rete ripristinata. Sincronizzazione automatica in corso..."); 
    sysUpdateNetworkUI(); 
    sysProcessQueue(); 
});
window.addEventListener('offline', () => { 
    if(typeof window.showErrorToast === 'function') window.showErrorToast("🔴 Connessione persa. Modalità Offline Attiva."); 
    sysUpdateNetworkUI(); 
});

window.sysUpdateNetworkUI = function() {
    const dot = document.getElementById('netStatusDot');
    const badge = document.getElementById('netStatusBadge');
    if(!dot || !badge) return;
    
    if (navigator.onLine) {
        dot.style.background = 'var(--green)';
        dot.style.animation = 'none';
    } else {
        dot.style.background = 'var(--red)';
        dot.style.animation = 'pulseRed 2s infinite';
    }

    if (window.twOfflineQueue.length > 0) {
        badge.style.display = 'block';
        badge.innerText = window.twOfflineQueue.length;
        dot.style.background = 'var(--gold)'; 
    } else {
        badge.style.display = 'none';
    }
};

const style = document.createElement('style');
style.innerHTML = `@keyframes pulseRed { 0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.7); } 70% { box-shadow: 0 0 0 8px rgba(239,68,68,0); } 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); } }`;
document.head.appendChild(style);

window.sysSafeSync = function(payloadData, updateObj, successMsg) {
    if (navigator.onLine) {
        firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${window.twStructId}`).update(updateObj)
            .then(() => { if(successMsg && typeof window.sysClosePanelAndNotify === 'function') window.sysClosePanelAndNotify(successMsg); })
            .catch(err => { window.sysQueueFailedAction(payloadData, updateObj, successMsg); });
    } else {
        window.sysQueueFailedAction(payloadData, updateObj, successMsg);
        if(successMsg && typeof window.sysClosePanelAndNotify === 'function') window.sysClosePanelAndNotify(successMsg + " (Salvato Offline)");
    }
};

window.sysQueueFailedAction = function(payloadData, updateObj, successMsg) {
    const task = {
        id: "Q_" + Date.now(),
        timestamp: new Date().toLocaleTimeString('it-IT'),
        payload: payloadData, 
        rawUpdates: updateObj,
        msg: successMsg,
        status: 'pending' 
    };
    window.twOfflineQueue.push(task);
    localStorage.setItem('tw_offline_queue', JSON.stringify(window.twOfflineQueue));
    sysUpdateNetworkUI();
};

window.sysOpenOfflineQueue = function() {
    const list = document.getElementById('queueListArea');
    if(!list) return;
    list.innerHTML = "";
    
    if (window.twOfflineQueue.length === 0) {
        list.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted);"><i class="material-icons-round" style="font-size:48px; opacity:0.5; margin-bottom:10px;">check_circle</i><br>Tutto sincronizzato. Nessuna pendenza.</div>`;
    } else {
        window.twOfflineQueue.forEach(task => {
            let icon = 'sync_disabled'; let color = 'var(--text-muted)'; let bgColor = 'rgba(0,0,0,0.2)';
            let conflictHtml = '';

            if(task.status === 'conflict') {
                icon = 'warning'; color = 'var(--gold)'; bgColor = 'rgba(251,191,36,0.1)';
                conflictHtml = `
                    <div style="margin-top:10px; padding-top:10px; border-top:1px dashed var(--border-line);">
                        <span style="font-size:10px; color:var(--red); font-weight:bold;">ATTENZIONE: SLOT ORA OCCUPATO DAL SERVER!</span>
                        <div style="display:flex; gap:5px; margin-top:8px;">
                            <button onclick="sysResolveQueueConflict('${task.id}', 'FORCE')" style="flex:1; padding:6px; background:var(--red); color:white; border:none; border-radius:4px; font-weight:bold; cursor:pointer; font-size:10px;">FORZA SOVRASCRITTURA</button>
                            <button onclick="sysResolveQueueConflict('${task.id}', 'DISCARD')" style="flex:1; padding:6px; background:transparent; border:1px solid var(--text-muted); color:var(--text-main); border-radius:4px; font-weight:bold; cursor:pointer; font-size:10px;">SCARTA OFFLINE</button>
                        </div>
                    </div>
                `;
            } else if (task.status === 'pending') {
                icon = 'schedule'; color = 'var(--accent)'; bgColor = 'rgba(56,189,248,0.1)';
            }

            const appDetails = task.payload && task.payload.appObj ? `${task.payload.appObj.cog} | Cab ${task.payload.appObj.cab} | Ore ${task.payload.appObj.ora}` : "Aggiornamento Dati Generico";

            list.innerHTML += `
                <div style="background:var(--bg-body); border:1px solid var(--border-line); border-left:4px solid ${color}; border-radius:8px; padding:12px; display:flex; flex-direction:column; position:relative; overflow:hidden;">
                    <div style="position:absolute; top:0; right:0; background:${bgColor}; color:${color}; padding:4px 8px; border-bottom-left-radius:8px; font-size:10px; font-weight:bold; display:flex; align-items:center; gap:4px;">
                        <i class="material-icons-round" style="font-size:12px;">${icon}</i> ${task.timestamp}
                    </div>
                    <b style="font-size:13px; color:var(--text-main); margin-bottom:4px; padding-right:80px;">${appDetails}</b>
                    <span style="font-size:11px; color:var(--text-muted);">${task.msg || 'Operazione di sistema'}</span>
                    ${conflictHtml}
                </div>
            `;
        });
    }
    
    if(document.getElementById('offlineQueueModal')) document.getElementById('offlineQueueModal').style.display = 'flex';
};

window.sysProcessQueue = async function() {
    if(!navigator.onLine || window.twOfflineQueue.length === 0) return;
    
    const btnSync = document.getElementById('btnForceSync');
    if(btnSync) btnSync.innerHTML = '<i class="material-icons-round" style="animation:twSpin 1s linear infinite;">sync</i> ELABORAZIONE...';
    
    let hasConflicts = false;

    const liveSnap = await firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${window.twStructId}/app`).once('value');
    const liveAppDB = liveSnap.val() || {};

    for (let i = window.twOfflineQueue.length - 1; i >= 0; i--) {
        let task = window.twOfflineQueue[i];
        if (task.status === 'conflict') { hasConflicts = true; continue; } 

        if (task.payload && task.payload.type === 'APP') {
            const pDate = task.payload.date;
            const pApp = task.payload.appObj;
            let liveDayApps = typeof window.normalizeFbArray === 'function' ? window.normalizeFbArray(liveAppDB[pDate]) : [];
            
            const pStart = typeof window.tToM === 'function' ? window.tToM(pApp.ora) : 0;
            const pEnd = pStart + parseInt(pApp.dur || 30);
            
            let collision = liveDayApps.find(a => {
                if(a.id === pApp.id) return false; 
                if(parseInt(a.cab) !== parseInt(pApp.cab)) return false;
                const aStart = typeof window.tToM === 'function' ? window.tToM(a.ora) : 0;
                const aEnd = aStart + (parseInt(a.dur) || 30);
                return (pStart < aEnd && pEnd > aStart);
            });

            if(collision) {
                task.status = 'conflict';
                hasConflicts = true;
                continue; 
            }
        }

        try {
            await firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${window.twStructId}`).update(task.rawUpdates);
            window.twOfflineQueue.splice(i, 1);
        } catch (e) {
            console.error("Errore sync task", e);
        }
    }

    localStorage.setItem('tw_offline_queue', JSON.stringify(window.twOfflineQueue));
    sysUpdateNetworkUI();
    if(btnSync) btnSync.innerHTML = '<i class="material-icons-round">sync</i> FORZA INVIO MANUALE';
    
    const modalEl = document.getElementById('offlineQueueModal');
    if (modalEl && modalEl.style.display === 'flex') window.sysOpenOfflineQueue();
    
    if (hasConflicts && typeof window.showErrorToast === 'function') {
        window.showErrorToast("⚠️ Attenzione: Alcuni salvataggi offline sono andati in conflitto col Server.");
    } else if (window.twOfflineQueue.length === 0 && typeof window.showToast === 'function') {
        window.showToast("Sincronizzazione completata!");
    }
};

window.sysResolveQueueConflict = function(taskId, resolution) {
    const idx = window.twOfflineQueue.findIndex(t => t.id === taskId);
    if(idx === -1) return;
    
    if (resolution === 'DISCARD') {
        window.twOfflineQueue.splice(idx, 1);
        if(typeof window.showToast === 'function') window.showToast("Operazione scartata.");
    } else if (resolution === 'FORCE') {
        window.twOfflineQueue[idx].status = 'pending'; 
        firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${window.twStructId}`).update(window.twOfflineQueue[idx].rawUpdates).then(() => {
            window.twOfflineQueue.splice(idx, 1);
            localStorage.setItem('tw_offline_queue', JSON.stringify(window.twOfflineQueue));
            if(typeof window.showToast === 'function') window.showToast("Sovrascrittura forzata eseguita sul server!");
            
            const modalEl = document.getElementById('offlineQueueModal');
            if(modalEl && modalEl.style.display === 'flex') window.sysOpenOfflineQueue();
            sysUpdateNetworkUI();
        });
        return;
    }
    
    localStorage.setItem('tw_offline_queue', JSON.stringify(window.twOfflineQueue));
    const modalEl = document.getElementById('offlineQueueModal');
    if(modalEl && modalEl.style.display === 'flex') window.sysOpenOfflineQueue();
    sysUpdateNetworkUI();
};