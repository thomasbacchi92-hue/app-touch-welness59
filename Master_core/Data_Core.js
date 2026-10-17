/* Master_core/Data_Core.js - Inserimento ed Eliminazione Dati DB */

window.sysFinalSaveToDB = function(d, oldD, appsToSave, appId, isEdit, isCouple) {
    const btn = document.getElementById("btnSaveAppStandard");
    if(btn) btn.innerHTML = "SALVATAGGIO IN CORSO...";

    const appRoot = firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${window.twStructId}/app`);

    const finishSave = () => {
        if(btn) btn.innerHTML = `<i class="material-icons-round" style="color:#ffffff;">save</i> <span style="color:#ffffff;">SALVA IN AGENDA</span>`;
        if(window.sysCloseSidebar) window.sysCloseSidebar(null, true);
        if(window.showToast) window.showToast("Appuntamento salvato con successo!");
        if(window.render) window.render();
    };

    if (isEdit && oldD && oldD !== d) {
        appRoot.child(oldD).once('value').then(snapOld => {
            let oldApps = window.normalizeFbArray(snapOld.val()).filter(x => x.id !== appId && x.id !== "TWIN_" + appId);
            appRoot.child(oldD).set(oldApps).then(() => {
                appRoot.child(d).once('value').then(snapNew => {
                    let newApps = window.normalizeFbArray(snapNew.val());
                    appsToSave.forEach(newApp => newApps.push(newApp));
                    appRoot.child(d).set(newApps).then(finishSave);
                });
            });
        });
    } else {
        appRoot.child(d).once('value').then(snap => {
            let apps = window.normalizeFbArray(snap.val());
            appsToSave.forEach(appToSave => {
                const idx = apps.findIndex(x => x.id === appToSave.id);
                if (idx > -1) { 
                    appToSave.pagato = apps[idx].pagato || false; 
                    apps[idx] = appToSave; 
                } else { 
                    apps.push(appToSave); 
                }
            });
            if (isEdit && !isCouple) apps = apps.filter(x => x.id !== "TWIN_" + appId);
            appRoot.child(d).set(apps).then(finishSave);
        });
    }
};

window._pendingDeleteData = null;

// 1. ELIMINAZIONE DA GRIGLIA (PALLINO ROSSO) -> Apre Pop-Up
window.sysPromptDelete = function(appId, d) {
    if(!appId || !d) return;
    window._pendingDeleteData = { appId, d };
    if (document.getElementById('deleteAppModal')) {
        document.getElementById('deleteAppModal').style.display = 'flex';
    } else {
        if(window.showErrorToast) window.showErrorToast("Errore di caricamento modale.");
    }
};

// 2. ELIMINAZIONE ISTANTANEA DAL FORM LATERALE (TASTO X) -> Nessun Pop-Up
window.sysInstantDelete = function() {
    const appId = document.getElementById('mId') ? document.getElementById('mId').value : null;
    const d = document.getElementById('mainDate') ? document.getElementById('mainDate').value : null;
    
    if(!appId || !d) {
        if(window.showErrorToast) window.showErrorToast("Nessun appuntamento selezionato.");
        return;
    }
    
    const appRoot = firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${window.twStructId}/app/${d}`);
    appRoot.once('value').then(snap => {
        let apps = window.normalizeFbArray(snap.val());
        apps = apps.filter(a => a.id !== appId && a.id !== "TWIN_" + appId && a.linkedId !== appId);
        appRoot.set(apps).then(() => {
            if(window.showToast) window.showToast("🗑️ Eliminazione istantanea eseguita.");
            if(window.sysCloseSidebar) window.sysCloseSidebar(null, true);
            if(window.render) window.render();
        }).catch(err => {
            console.error(err);
            if(window.showErrorToast) window.showErrorToast("Errore di connessione Firebase.");
        });
    });
};

// CONFERMA ELIMINAZIONE (Dal Pop-up del Cestino)
window.sysConfirmDeleteApp = function() {
    if(!window._pendingDeleteData) return;
    
    const { appId, d } = window._pendingDeleteData;
    const appRoot = firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${window.twStructId}/app/${d}`);
    
    appRoot.once('value').then(snap => {
        let apps = window.normalizeFbArray(snap.val());
        apps = apps.filter(a => a.id !== appId && a.id !== "TWIN_" + appId && a.linkedId !== appId);
        
        appRoot.set(apps).then(() => {
            if(window.showToast) window.showToast("🗑️ Appuntamento eliminato.");
            if(window.sysCloseSidebar) window.sysCloseSidebar(null, true);
            if(window.render) window.render();
            if(document.getElementById('deleteAppModal')) document.getElementById('deleteAppModal').style.display = 'none';
            window._pendingDeleteData = null;
        }).catch(err => {
            console.error(err);
            if(window.showErrorToast) window.showErrorToast("Errore di connessione a Firebase.");
        });
    });
};