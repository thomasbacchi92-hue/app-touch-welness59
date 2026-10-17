/* Master_core/Logic_Referee.js - Arbitro Collisioni (Save & Drag Drop) - PLEDGE VISIVO */

window._pendingActionData = null;

window.sysValidateMove = function(appId, newOra, newCab) {
    const d = document.getElementById("mainDate").value; 
    if(!d || !window.twStructId) return;

    const appRoot = firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${window.twStructId}/app/${d}`);
    appRoot.once('value').then(snap => {
        let apps = window.normalizeFbArray(snap.val());
        const appToMove = apps.find(x => x.id === appId);
        if(!appToMove) return;

        if (appToMove.isCouple) {
            if(window.showErrorToast) window.showErrorToast("Spostamento rapido disabilitato per massaggi di coppia."); 
            return window.render();
        }

        const startMin = window.tToM(newOra); 
        const endMin = startMin + (appToMove.durInt || 30);
        
        let hardCol = false; let shadowCol = false; let opCol = null;
        apps.forEach(a => { 
            if(a.id === appId) return;
            
            if(parseInt(a.cab) === parseInt(newCab)) {
                if(startMin < (a.oraFine + 10) && (endMin + 10) > a.oraMin) {
                    if(startMin < a.oraFine && endMin > a.oraMin) hardCol = true; else shadowCol = true;
                }
            }
            
            if(appToMove.op && a.op && (a.op || '').toLowerCase() === (appToMove.op || '').toLowerCase()) {
                if(startMin < (a.oraFine + 10) && (endMin + 10) > a.oraMin) opCol = a;
            }
        });

        if (hardCol) { if(window.showErrorToast) window.showErrorToast("⛔ Cabina occupata in questo orario!"); return window.render(); }
        
        if (opCol) {
            const repSelect = document.getElementById('theftReplacementOp');
            if (repSelect) {
                repSelect.innerHTML = '<option value="">-- Seleziona Nuovo Operatore --</option>';
                Object.values(window.allUsersData).forEach(u => {
                    const isGhost = (u.attivo === false || u.eliminato === true);
                    if (String(u.structureId) === String(window.twStructId) && !isGhost && u.nick !== appToMove.op) {
                        const isRepBusy = apps.some(a => {
                            if (a.id === appId) return false;
                            if ((a.op || '').toLowerCase() !== (u.nick || '').toLowerCase()) return false;
                            return (startMin < window.tToM(a.ora) + parseInt(a.dur || 30) + 10 && (endMin + 10) > window.tToM(a.ora));
                        });
                        if (!isRepBusy) repSelect.innerHTML += `<option value="${u.nick}">🟢 ${u.name} ${u.surname || ''}</option>`;
                    }
                });
            }
            if(document.getElementById('theftOpName')) document.getElementById('theftOpName').innerText = appToMove.op;
            if(document.getElementById('theftOldTime')) document.getElementById('theftOldTime').innerText = `Ha un appuntamento con: ${opCol.cog || 'Cliente'} alle ${opCol.ora}`;
            window._pendingActionData = { type: 'move', appId: appId, newOra: newOra, newCab: newCab, opCollision: opCol, apps: apps };
            if (document.getElementById('operatorTheftModal')) document.getElementById('operatorTheftModal').style.display = 'flex';
            return;
        }

        // ==========================================
        // ACCONTO VISIVO (Visual Pledge) per fermare il rimbalzo
        // ==========================================
        if (shadowCol) {
            window._pendingActionData = { type: 'move_shadow', appId: appId, newOra: newOra, newCab: newCab, apps: apps };
            
            // Inganniamo il browser post-dragend: lo spostiamo fisicamente ma lo rendiamo un "fantasma" sospeso
            setTimeout(() => {
                window.sysDeltaUpdateDOM(appId, newOra, newCab);
                const appElement = document.querySelector(`.app-base[data-app-id="${appId}"]`);
                if(appElement) {
                    appElement.style.opacity = "0.7";
                    appElement.style.border = "2px dashed var(--gold)";
                    appElement.style.boxShadow = "0 0 20px rgba(251, 191, 36, 0.6)";
                }
            }, 10);
            
            if(document.getElementById('shadowWarningModal')) document.getElementById('shadowWarningModal').style.display = 'flex';
            return; 
        }

        appToMove.ora = newOra; appToMove.cab = parseInt(newCab);
        window.sysDeltaUpdateDOM(appId, newOra, newCab);
        appRoot.set(apps).then(() => { if(window.showToast) window.showToast("Spostato!"); });
    });
};

window.sysValidateAndSave = function() {
    const d = document.getElementById('aDate').value;
    const oldD = document.getElementById('mOldDate').value;
    const appId = document.getElementById('mId').value || ("APP_" + Date.now());
    const ora = document.getElementById('aOra').value;
    const cab = parseInt(document.getElementById('aCab').value, 10);
    const isEdit = document.getElementById('mId').value !== "";
    const newName = document.getElementById('aCog') ? document.getElementById('aCog').value.trim() || "Ospite" : "Ospite";
    const newCam = document.getElementById('aCam') ? document.getElementById('aCam').value : "";

    if (!d || !ora || !cab) { if(window.showErrorToast) window.showErrorToast("Dati obbligatori mancanti!"); return; }

    let appObj = {
        id: appId, ora: ora, cab: cab, cam: newCam, cog: newName,
        tel: document.getElementById('aTel') ? document.getElementById('aTel').value : "",
        dataNascita: document.getElementById('aDataNascita') ? document.getElementById('aDataNascita').value : "",
        op: document.getElementById('aOp') ? document.getElementById('aOp').value : "",
        serv: document.getElementById('aServ') ? document.getElementById('aServ').value : "",
        dur: parseInt(document.getElementById('aDur') ? document.getElementById('aDur').value : 30, 10),
        price: parseFloat(document.getElementById('aPrice') ? document.getElementById('aPrice').value : 0),
        basePrice: parseFloat(document.getElementById('aBasePrice') ? document.getElementById('aBasePrice').value : 0),
        discountType: document.getElementById('aDiscountType') ? document.getElementById('aDiscountType').value : "euro",
        discountValue: parseFloat(document.getElementById('discountValue') ? document.getElementById('discountValue').value : 0) || 0,
        note: document.getElementById('aNote') ? document.getElementById('aNote').value : "",
        patologie: document.getElementById('aPatologie') ? document.getElementById('aPatologie').value : "",
        fattura: document.getElementById('aFattura') ? document.getElementById('aFattura').value : "",
        codCliente: document.getElementById('aCodCliente') ? document.getElementById('aCodCliente').value : "",
        isCouple: document.getElementById('aIsCouple') ? document.getElementById('aIsCouple').value === "true" : false
    };

    let twinObj = null;
    if (appObj.isCouple) {
        twinObj = { ...appObj }; twinObj.id = "TWIN_" + appId;
        twinObj.cab = parseInt(document.getElementById('aCab2').value, 10) || (cab + 1);
        twinObj.op = document.getElementById('aOp2') ? document.getElementById('aOp2').value : "";
        twinObj.price = 0; twinObj.linkedId = appId; appObj.linkedId = twinObj.id;
    } else { appObj.linkedId = null; }

    const dayApps = window.db && window.db.app && window.db.app[d] ? window.normalizeFbArray(window.db.app[d]) : [];
    const startMin = window.tToM(ora); const endMin = startMin + appObj.dur;
    
    let hardCollision = false; let shadowCollision = false; let opCollision = null;
    
    dayApps.forEach(a => {
        if (a.id === appId || a.id === appObj.linkedId) return;
        
        if (a.cab === cab) {
            if(startMin < (a.oraFine + 10) && (endMin + 10) > a.oraMin) {
                if(startMin < a.oraFine && endMin > a.oraMin) hardCollision = true; else shadowCollision = true;
            }
        }

        if (appObj.op && a.op && (a.op || '').toLowerCase() === (appObj.op || '').toLowerCase()) {
            if(startMin < (a.oraFine + 10) && (endMin + 10) > a.oraMin) opCollision = a;
        }
    });

    if (hardCollision) { if(window.showErrorToast) window.showErrorToast("⛔ Cabina occupata in questo orario!"); return; }

    window._pendingActionData = { type: 'save', d, oldD, appObj, twinObj, isEdit, newName, newCam };

    if (opCollision) {
        const repSelect = document.getElementById('theftReplacementOp');
        if (repSelect) {
            repSelect.innerHTML = '<option value="">-- Seleziona Sostituto Libero --</option>';
            Object.values(window.allUsersData).forEach(u => {
                const isGhost = (u.attivo === false || u.eliminato === true);
                if (String(u.structureId) === String(window.twStructId) && !isGhost && u.nick !== appObj.op) {
                    const isRepBusy = dayApps.some(a => {
                        if (a.id === appId || a.id === appObj.linkedId) return false;
                        if ((a.op || '').toLowerCase() !== (u.nick || '').toLowerCase()) return false;
                        return (startMin < window.tToM(a.ora) + parseInt(a.dur || 30) + 10 && (endMin + 10) > window.tToM(a.ora));
                    });
                    if (!isRepBusy) repSelect.innerHTML += `<option value="${u.nick}">🟢 ${u.name} ${u.surname || ''}</option>`;
                }
            });
        }
        if(document.getElementById('theftOpName')) document.getElementById('theftOpName').innerText = appObj.op;
        if(document.getElementById('theftOldTime')) document.getElementById('theftOldTime').innerText = `Ha un appuntamento con: ${opCollision.cog || 'Cliente'} alle ${opCollision.ora}`;
        if (document.getElementById('operatorTheftModal')) document.getElementById('operatorTheftModal').style.display = 'flex';
        return;
    }

    if (shadowCollision) {
        window._pendingActionData.type = 'save_shadow';
        if (document.getElementById('shadowWarningModal')) document.getElementById('shadowWarningModal').style.display = 'flex';
        return;
    }
    
    window.sysProceedToNameCheck();
};

window.sysProceedToNameCheck = function() {
    if (!window._pendingActionData) return;
    const { isEdit, newName } = window._pendingActionData;

    if (isEdit && window._currentEditingOldName && window._currentEditingOldName.toLowerCase() !== newName.toLowerCase()) {
        const mod = document.getElementById('nameChangeModal');
        if (mod) {
            if(document.getElementById('ncOldName')) document.getElementById('ncOldName').innerText = window._currentEditingOldName;
            if(document.getElementById('ncNewName')) document.getElementById('ncNewName').innerText = newName;
            mod.style.display = 'flex'; return; 
        }
    }
    window.sysProceedToAnagraficaCheck('update');
};

window.sysResolveNameChange = function(action) {
    if(document.getElementById('nameChangeModal')) document.getElementById('nameChangeModal').style.display = 'none';
    if(window._pendingActionData) window._pendingActionData.nameAction = action; 
    window.sysProceedToAnagraficaCheck();
};

window.sysProceedToAnagraficaCheck = function() {
    if (!window._pendingActionData) return;
    const { isEdit, newName, newCam } = window._pendingActionData;

    if (isEdit) {
        let existingCustomer = null;
        if (window.globalCustomers) existingCustomer = window.globalCustomers.find(c => c.nome && c.nome.toLowerCase() === newName.toLowerCase());
        if (existingCustomer && existingCustomer.cam && existingCustomer.cam !== newCam && newCam !== "") {
            if (document.getElementById('cameraChangeModal')) {
                if(document.getElementById('ccOldCam')) document.getElementById('ccOldCam').innerText = existingCustomer.cam;
                if(document.getElementById('ccNewCam')) document.getElementById('ccNewCam').innerText = newCam;
                document.getElementById('cameraChangeModal').style.display = 'flex';
                return;
            }
        }
    }
    window.sysFinalizeSaveRequest();
};

window.sysResolveCameraChange = function(action) {
    if(document.getElementById('cameraChangeModal')) document.getElementById('cameraChangeModal').style.display = 'none';
    if (action === 'ignore' && window._pendingActionData) window._pendingActionData.ignoreCameraSync = true;
    window.sysFinalizeSaveRequest();
};

window.sysFinalizeSaveRequest = function() {
    if (!window._pendingActionData) return;
    const { d, oldD, appObj, twinObj, isEdit, ignoreCameraSync } = window._pendingActionData;
    let appsToSave = [appObj]; if(twinObj) appsToSave.push(twinObj);
    if(typeof window.sysUpdateCRM === 'function') window.sysUpdateCRM(appObj, ignoreCameraSync);
    if(typeof window.sysFinalSaveToDB === 'function') window.sysFinalSaveToDB(d, oldD, appsToSave, appObj.id, isEdit, appObj.isCouple);
    
    window._pendingActionData = null; window._currentEditingOldName = null;
};

// ==========================================
// AZIONI POP-UP E ROLLBACK VISIVO
// ==========================================

// Ricarica la grafica in caso di Annullamento dal Pop-up (rimuove il "fantasma")
window.sysCancelShadowOverride = function() {
    if(document.getElementById('shadowWarningModal')) document.getElementById('shadowWarningModal').style.display = 'none';
    window._pendingActionData = null;
    if(window.render) window.render();
};

window.sysConfirmShadowOverride = function() {
    if(document.getElementById('shadowWarningModal')) document.getElementById('shadowWarningModal').style.display = 'none';
    
    if (!window._pendingActionData) return;

    if (window._pendingActionData.type === 'move_shadow') {
        const p = window._pendingActionData;
        const appRoot = firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${window.twStructId}/app/${document.getElementById("mainDate").value}`);
        const appToMove = p.apps.find(x => x.id === p.appId);
        
        if(appToMove) { appToMove.ora = p.newOra; appToMove.cab = parseInt(p.newCab); }
        
        appRoot.set(p.apps).then(() => { 
            window._pendingActionData = null; 
            if(window.showToast) window.showToast("Forzato in Pulizia!"); 
            // BULLDOZER: Ridisegna e fissa l'appuntamento solido
            if(window.render) window.render(); 
        });
        
    } else if (window._pendingActionData.type === 'save_shadow') {
        window._pendingActionData.type = 'save';
        window.sysProceedToNameCheck();
    }
};

window.sysConfirmOperatorTheft = function() {
    const repOp = document.getElementById('theftReplacementOp').value;
    if (!repOp) { if(window.showErrorToast) window.showErrorToast("Devi selezionare un sostituto libero per procedere!"); return; }

    if (window._pendingActionData && window._pendingActionData.type === 'move') {
        const { appId, newOra, newCab, apps } = window._pendingActionData;
        const appToMove = apps.find(x => x.id === appId);
        if(appToMove) { appToMove.op = repOp; appToMove.ora = newOra; appToMove.cab = parseInt(newCab); }
        firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${window.twStructId}/app/${document.getElementById("mainDate").value}`).set(apps).then(() => {
            window.sysDeltaUpdateDOM(appId, newOra, newCab);
            document.getElementById('operatorTheftModal').style.display = 'none';
            if(window.showToast) window.showToast("Operatore scambiato con successo!");
            window._pendingActionData = null;
        });
    } else if (window._pendingActionData && window._pendingActionData.type === 'save') {
        window._pendingActionData.appObj.op = repOp;
        if(document.getElementById('aOp')) document.getElementById('aOp').value = repOp;
        document.getElementById('operatorTheftModal').style.display = 'none';
        if(window.showToast) window.showToast("Nuovo operatore assegnato.");
        window.sysProceedToNameCheck();
    }
};

window.sysCancelOperatorTheft = function() {
    if(document.getElementById('operatorTheftModal')) document.getElementById('operatorTheftModal').style.display = 'none'; 
    window._pendingActionData = null;
    if(window.render) window.render(); 
};