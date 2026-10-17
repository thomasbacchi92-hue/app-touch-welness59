/* Master_core/Desktop_AppManager.js - Gestione Dati, Form, Operatori, Modali e CRM Sync */

window._opConflicts = {};
window._theftData = null;
window._theftMoveData = null;
window._pendingSaveData = null;
window._currentEditingOldName = null;

// ================= GESTIONE OPERATORI E SEMAFORI =================

window.sysPopulateOperators = function() {
    const op1 = document.getElementById('aOp');
    const op2 = document.getElementById('aOp2');
    if (!op1 && !op2) return;

    const currentVal1 = op1 ? op1.value : null;
    const currentVal2 = op2 ? op2.value : null;

    const d = document.getElementById('aDate') ? document.getElementById('aDate').value : null;
    const ora = document.getElementById('aOra') ? document.getElementById('aOra').value : null;
    const dur = parseInt(document.getElementById('aDur') ? document.getElementById('aDur').value : 30, 10);
    const currentAppId = document.getElementById('mId') ? document.getElementById('mId').value : null;

    let dayApps = [];
    if (d && window.db && window.db.app && window.db.app[d]) {
        dayApps = typeof window.normalizeFbArray === 'function' ? window.normalizeFbArray(window.db.app[d]) : [];
    }

    let startMin = (ora && typeof window.tToM === 'function') ? window.tToM(ora) : null;
    let endMin = startMin !== null ? startMin + dur : null;

    window._opConflicts = {};
    let optionsHtml = '<option value="">-- Seleziona --</option>';

    if (window.allUsersData && window.twStructId) {
        Object.values(window.allUsersData).forEach(u => {
            const isGhost = (u.attivo === false || u.attiva === false || u.eliminato === true || u.deleted === true || u.attivo === "false" || u.attiva === "false" || u.eliminato === "true" || u.deleted === "true");
            if (String(u.structureId) === String(window.twStructId) && !isGhost) {
                let isBusy = false;
                let conflictApp = null;

                if (startMin !== null) {
                    conflictApp = dayApps.find(a => {
                        if (a.id === currentAppId || a.id === "TWIN_" + currentAppId) return false;
                        if ((a.op || '').toLowerCase() !== (u.nick || '').toLowerCase()) return false;
                        const aStart = window.tToM(a.ora);
                        const aEnd = aStart + (parseInt(a.dur) || 30) + 10;
                        return (startMin < aEnd && endMin > aStart);
                    });
                    if (conflictApp) isBusy = true;
                }

                const cleanName = `${u.name || ''} ${u.surname || ''}`.trim();

                if (isBusy) {
                    window._opConflicts[u.nick] = conflictApp;
                    optionsHtml += `<option value="${u.nick}">🔴 ${cleanName}</option>`;
                } else {
                    optionsHtml += `<option value="${u.nick}">🟢 ${cleanName}</option>`;
                }
            }
        });
    }

    if (op1) { op1.innerHTML = optionsHtml; if (currentVal1) op1.value = currentVal1; }
    if (op2) { op2.innerHTML = optionsHtml; if (currentVal2) op2.value = currentVal2; }
};

window.sysHandleOperatorChange = function(selectElement) {
    if (!selectElement.value) return;
    const conflictApp = window._opConflicts ? window._opConflicts[selectElement.value] : null;
    
    if (conflictApp) {
        const opName = selectElement.options[selectElement.selectedIndex].text.replace('🔴 ', '').replace('🟢 ', '');
        const oldTime = `${conflictApp.ora} - ${window.mToT(window.tToM(conflictApp.ora) + parseInt(conflictApp.dur || 30))}`;
        
        const repSelect = document.getElementById('theftReplacementOp');
        if (repSelect) {
            repSelect.innerHTML = '<option value="">-- Seleziona Sostituto Libero --</option>';
            const ora = document.getElementById('aOra').value;
            const dur = parseInt(document.getElementById('aDur').value || 30, 10);
            const startMin = window.tToM(ora);
            const endMin = startMin + dur;
            const d = document.getElementById('aDate').value;
            const currentAppId = document.getElementById('mId').value;
            const dayApps = window.normalizeFbArray(window.db.app[d]);

            Object.values(window.allUsersData).forEach(u => {
                const isGhost = (u.attivo === false || u.attiva === false || u.eliminato === true || u.deleted === true || u.attivo === "false" || u.attiva === "false" || u.eliminato === "true" || u.deleted === "true");
                if (String(u.structureId) === String(window.twStructId) && !isGhost && u.nick !== selectElement.value) {
                    const isRepBusy = dayApps.some(a => {
                        if (a.id === currentAppId) return false;
                        if ((a.op || '').toLowerCase() !== (u.nick || '').toLowerCase()) return false;
                        const aStart = window.tToM(a.ora);
                        const aEnd = aStart + parseInt(a.dur || 30) + 10;
                        return (startMin < aEnd && endMin > aStart);
                    });
                    if (!isRepBusy) {
                        const cleanName = `${u.name || ''} ${u.surname || ''}`.trim();
                        repSelect.innerHTML += `<option value="${u.nick}">🟢 ${cleanName}</option>`;
                    }
                }
            });
        }
        
        document.getElementById('theftOpName').innerText = opName;
        document.getElementById('theftOldTime').innerText = `Impegnato con: ${conflictApp.cog || 'Cliente'} alle ${oldTime}`;
        window._theftData = { selectElement: selectElement };
        if (document.getElementById('operatorTheftModal')) document.getElementById('operatorTheftModal').style.display = 'flex';
    }
};

window.sysConfirmOperatorTheft = function() {
    const repOp = document.getElementById('theftReplacementOp').value;
    if (!repOp) { if(window.showErrorToast) window.showErrorToast("Seleziona un sostituto per questo appuntamento!"); return; }

    if (window._theftMoveData) {
        // Gestione Sostituzione da Drag & Drop
        const { appId, newOra, newCab } = window._theftMoveData;
        const d = document.getElementById("mainDate").value; 
        const appRoot = firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${window.twStructId}/app/${d}`);
        
        appRoot.once('value').then(snap => {
            let apps = window.normalizeFbArray(snap.val());
            const idx = apps.findIndex(x => x.id === appId);
            if (idx > -1) {
                apps[idx].ora = newOra;
                apps[idx].cab = parseInt(newCab);
                apps[idx].op = repOp;
                
                window.sysDeltaUpdateDOM(appId, newOra, newCab);
                appRoot.set(apps).then(() => {
                    if(window.showToast) window.showToast("Spostamento forzato con nuovo operatore eseguito!");
                    document.getElementById('operatorTheftModal').style.display = 'none';
                    window._theftMoveData = null;
                    window.bypassShadow = false;
                });
            }
        });
    } else if (window._theftData) {
        // Gestione Sostituzione da Form Laterale
        window._theftData.selectElement.value = repOp;
        document.getElementById('operatorTheftModal').style.display = 'none';
        window._theftData = null;
    }
};

window.sysCancelOperatorTheft = function() {
    if (window._theftMoveData) {
        window._theftMoveData = null;
        if(window.render) window.render(); // Fa ritornare lo slot dove era prima visivamente
    } else if (window._theftData && window._theftData.selectElement) {
        window._theftData.selectElement.value = ""; 
    }
    document.getElementById('operatorTheftModal').style.display = 'none'; 
    window._theftData = null;
};

// ================= GESTIONE FORM E SALVATAGGIO (CON CRM E BYPASS) =================

window.sysOpenSlot = function(ora, cab) {
    window._currentEditingOldName = null;
    const sideForm = document.getElementById('sideForm');
    if(!sideForm) return;

    if (sideForm.classList.contains('active')) { 
        if(document.getElementById("aOra")) document.getElementById("aOra").value = ora; 
        if(document.getElementById("aCab")) document.getElementById("aCab").value = cab; 
        window.sysPopulateOperators(); return; 
    }
    
    sideForm.classList.remove('request-mode'); 
    if(document.getElementById("sidebarTitle")) { document.getElementById("sidebarTitle").innerText = "Nuovo Appuntamento"; document.getElementById("sidebarTitle").style.color = "#ffffff"; }
    if(document.getElementById("mId")) document.getElementById("mId").value = ""; 
    if(document.getElementById("mReqId")) document.getElementById("mReqId").value = ""; 
    
    const cd = document.getElementById("mainDate") ? document.getElementById("mainDate").value : new Date().toISOString().split('T')[0]; 
    if(document.getElementById("aDate")) document.getElementById("aDate").value = cd; 
    if(document.getElementById("mOldDate")) document.getElementById("mOldDate").value = cd; 
    if(document.getElementById("aOra")) document.getElementById("aOra").value = ora; 
    if(document.getElementById("aCab")) document.getElementById("aCab").value = cab;
    
    ['aCam', 'aCog', 'aTel', 'aDataNascita', 'aOp', 'aNote', 'aFattura', 'aCodCliente', 'aPatologie'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ""; });
    
    if(document.getElementById('coupleFields')) document.getElementById('coupleFields').style.display = 'none';
    if(document.getElementById('aIsCouple')) document.getElementById('aIsCouple').value = "false";
    if(document.getElementById('aCab2')) document.getElementById('aCab2').value = "";
    if(document.getElementById('aOp2')) document.getElementById('aOp2').value = "";
    if(document.getElementById('aServ')) document.getElementById('aServ').value = ""; 
    if(document.getElementById('aDur')) document.getElementById('aDur').value = "30"; 
    if(document.getElementById('aPrice')) document.getElementById('aPrice').value = "0"; 
    if(document.getElementById('aBasePrice')) document.getElementById('aBasePrice').value = "0"; 
    
    if(document.getElementById("patologieWrapper")) { document.getElementById("patologieWrapper").style.display = "none"; if(document.getElementById("btnShowPatologie")) document.getElementById("btnShowPatologie").style.display = "flex"; }
    if(document.getElementById("aEseguito")) document.getElementById("aEseguito").checked = false;
    if(document.getElementById("btnSaveAppStandard")) document.getElementById("btnSaveAppStandard").style.display = "flex"; 
    if(document.getElementById("editActionButtons")) document.getElementById("editActionButtons").style.setProperty("display", "none", "important"); 
    
    if(typeof window.sysRenderServiceBox === 'function') window.sysRenderServiceBox();
    window.sysPopulateOperators(); sideForm.classList.add('active');
};

window.sysOpenEdit = function(id) {
    const d = document.getElementById("mainDate") ? document.getElementById("mainDate").value : null;
    if(!d || !window.db || !window.db.app) return;
    
    let apps = window.normalizeFbArray(window.db.app[d]);
    let app = apps.find(x => x.id === id); 
    if(!app) return;
    if(app.isCouple && app.linkedId && app.price === 0) app = apps.find(x => x.id === app.linkedId) || app;

    window._currentEditingOldName = app.cog || "Ospite";
    const sideForm = document.getElementById('sideForm');
    if(!sideForm) return;

    sideForm.classList.remove('request-mode'); 
    if(document.getElementById("sidebarTitle")) { document.getElementById("sidebarTitle").innerText = "Modifica Appuntamento"; document.getElementById("sidebarTitle").style.color = "#ffffff"; }
    
    if(document.getElementById("mId")) document.getElementById("mId").value = app.id; 
    if(document.getElementById("aDate")) document.getElementById("aDate").value = d; 
    if(document.getElementById("mOldDate")) document.getElementById("mOldDate").value = d;
    if(document.getElementById("aOra")) document.getElementById("aOra").value = app.ora; 
    if(document.getElementById("aCab")) document.getElementById("aCab").value = app.cab;
    if(document.getElementById("aCam")) document.getElementById("aCam").value = app.cam || "";
    if(document.getElementById("aCog")) document.getElementById("aCog").value = app.cog || ""; 
    if(document.getElementById("aTel")) document.getElementById("aTel").value = app.tel || "";
    if(document.getElementById("aFattura")) document.getElementById("aFattura").value = app.fattura || "";
    if(document.getElementById("aCodCliente")) document.getElementById("aCodCliente").value = app.codCliente || "";
    if(document.getElementById("aDataNascita")) document.getElementById("aDataNascita").value = app.dataNascita || "";
    if(document.getElementById("aNote")) document.getElementById("aNote").value = app.note || ""; 
    
    if(app.isCouple && app.linkedId) {
        const twin = apps.find(x => x.id === app.linkedId);
        if(twin) {
            if(document.getElementById('coupleFields')) document.getElementById('coupleFields').style.display = 'block';
            if(document.getElementById('aIsCouple')) document.getElementById('aIsCouple').value = "true";
            if(document.getElementById('aCab2')) document.getElementById('aCab2').value = twin.cab || "";
        }
    } else {
        if(document.getElementById('coupleFields')) document.getElementById('coupleFields').style.display = 'none';
        if(document.getElementById('aIsCouple')) document.getElementById('aIsCouple').value = "false";
    }

    if(document.getElementById("aEseguito")) document.getElementById("aEseguito").checked = app.eseguito === true;
    if(document.getElementById("aPatologie")) document.getElementById("aPatologie").value = app.patologie || "";
    if(document.getElementById("patologieWrapper")) {
        if(app.patologie && app.patologie.trim() !== "") { document.getElementById("patologieWrapper").style.display = "block"; if(document.getElementById("btnShowPatologie")) document.getElementById("btnShowPatologie").style.display = "none"; }
        else { document.getElementById("patologieWrapper").style.display = "none"; if(document.getElementById("btnShowPatologie")) document.getElementById("btnShowPatologie").style.display = "flex"; }
    }
    
    if(app.serv) { 
        if(document.getElementById('aServ')) document.getElementById('aServ').value = app.serv; 
        if(document.getElementById('aDur')) document.getElementById('aDur').value = app.dur || 30; 
        if(document.getElementById('aBasePrice')) document.getElementById('aBasePrice').value = app.basePrice !== undefined ? app.basePrice : (app.price || 0);
        if(document.getElementById('aPrice')) document.getElementById('aPrice').value = app.price || 0;
        if(app.discountValue > 0) {
            if(document.getElementById('discountModule')) document.getElementById('discountModule').style.display = 'block';
            if(document.getElementById('discountValue')) document.getElementById('discountValue').value = app.discountValue;
            if(document.getElementById('aDiscountType')) document.getElementById('aDiscountType').value = app.discountType || 'euro';
        }
    }
    if(typeof window.sysRenderServiceBox === 'function') window.sysRenderServiceBox(); 
    window.sysPopulateOperators();
    
    setTimeout(() => {
        if(document.getElementById("aOp")) document.getElementById("aOp").value = app.op || ""; 
        if(app.isCouple && app.linkedId) { const twin = apps.find(x => x.id === app.linkedId); if(twin && document.getElementById("aOp2")) document.getElementById("aOp2").value = twin.op || ""; }
    }, 50);
    
    if(document.getElementById("btnSaveAppStandard")) document.getElementById("btnSaveAppStandard").style.display = "flex"; 
    if(document.getElementById("editActionButtons")) document.getElementById("editActionButtons").style.setProperty("display", "flex", "important"); 
    sideForm.classList.add('active');
};

window.sysSaveApp = function() {
    const d = document.getElementById('aDate').value;
    const oldD = document.getElementById('mOldDate').value;
    const appId = document.getElementById('mId').value || ("APP_" + Date.now());
    const ora = document.getElementById('aOra').value;
    const cab = parseInt(document.getElementById('aCab').value, 10);
    const isEdit = document.getElementById('mId').value !== "";
    const newName = document.getElementById('aCog') ? document.getElementById('aCog').value.trim() || "Ospite" : "Ospite";
    const newCam = document.getElementById('aCam') ? document.getElementById('aCam').value : "";

    if (!d || !ora || !cab) { if(window.showErrorToast) window.showErrorToast("Errore: Data, Ora e Cabina sono obbligatori!"); return; }

    let appObj = {
        id: appId, ora: ora, cab: cab, cam: newCam,
        cog: newName, tel: document.getElementById('aTel') ? document.getElementById('aTel').value : "",
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
        eseguito: document.getElementById('aEseguito') ? document.getElementById('aEseguito').checked : false,
        isCouple: document.getElementById('aIsCouple') ? document.getElementById('aIsCouple').value === "true" : false,
        pagato: false
    };

    let twinObj = null;
    if (appObj.isCouple) {
        twinObj = { ...appObj }; twinObj.id = "TWIN_" + appId;
        twinObj.cab = parseInt(document.getElementById('aCab2').value, 10) || (cab + 1);
        twinObj.op = document.getElementById('aOp2') ? document.getElementById('aOp2').value : "";
        twinObj.price = 0; twinObj.linkedId = appId; appObj.linkedId = twinObj.id;
    } else { appObj.linkedId = null; }

    const dayApps = window.db && window.db.app && window.db.app[d] ? window.normalizeFbArray(window.db.app[d]) : [];
    const startMin = window.tToM(ora);
    const endMin = startMin + appObj.dur;
    let hardCollision = false;
    let shadowCollision = false;
    
    dayApps.forEach(a => {
        if (a.id === appId || a.id === appObj.linkedId) return;
        if (a.cab === cab) {
            if (startMin < (a.oraFine + 10) && (endMin + 10) > a.oraMin) {
                if(startMin < a.oraFine && endMin > a.oraMin) hardCollision = true; else shadowCollision = true;
            }
        }
    });

    if (hardCollision) { if(window.showErrorToast) window.showErrorToast("⛔ Cabina occupata!"); return; }
    if (shadowCollision && !window.bypassShadow) {
        window.tempShadowMoveData = null; 
        window._pendingSaveData = { d, oldD, appObj, twinObj, isEdit, newName, newCam };
        if (document.getElementById('shadowWarningModal')) document.getElementById('shadowWarningModal').style.display = 'flex';
        return;
    }

    window.bypassShadow = false;
    window._pendingSaveData = { d, oldD, appObj, twinObj, isEdit, newName, newCam };

    if (isEdit && window._currentEditingOldName && window._currentEditingOldName.toLowerCase() !== newName.toLowerCase()) {
        const mod = document.getElementById('nameChangeModal');
        if (mod) {
            document.getElementById('ncOldName').innerText = window._currentEditingOldName;
            document.getElementById('ncNewName').innerText = newName;
            mod.style.display = 'flex';
            return; 
        }
    }

    if (isEdit) {
        let existingCustomer = null;
        if (window.globalCustomers) existingCustomer = window.globalCustomers.find(c => c.nome && c.nome.toLowerCase() === newName.toLowerCase());
        if (existingCustomer && existingCustomer.cam && existingCustomer.cam !== newCam && newCam !== "") {
            const cmod = document.getElementById('cameraChangeModal');
            if (cmod) {
                document.getElementById('ccOldCam').innerText = existingCustomer.cam;
                document.getElementById('ccNewCam').innerText = newCam;
                cmod.style.display = 'flex';
                return;
            }
        }
    }
    
    window.sysProceedSave('update');
};

window.sysResolveNameChange = function(action) {
    if(document.getElementById('nameChangeModal')) document.getElementById('nameChangeModal').style.display = 'none';
    window.sysProceedSave(action);
};

window.sysResolveCameraChange = function(action) {
    if(document.getElementById('cameraChangeModal')) document.getElementById('cameraChangeModal').style.display = 'none';
    if (action === 'ignore' && window._pendingSaveData) {
        window._pendingSaveData.ignoreCameraSync = true;
    }
    window.sysProceedSave('update');
};

window.sysProceedSave = function(actionParams) {
    if (!window._pendingSaveData) return;
    const { d, oldD, appObj, twinObj, isEdit, ignoreCameraSync } = window._pendingSaveData;
    const appId = appObj.id;

    window.sysUpdateCRM(appObj, isEdit, ignoreCameraSync, actionParams);

    const btn = document.getElementById("btnSaveAppStandard");
    if(btn) btn.innerHTML = "SALVATAGGIO...";

    const appRoot = firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${window.twStructId}/app`);

    let appsToSave = [window.sanitizePayload ? window.sanitizePayload(appObj) : appObj];
    if (twinObj) appsToSave.push(window.sanitizePayload ? window.sanitizePayload(twinObj) : twinObj);

    const finishSave = () => {
        if(btn) btn.innerHTML = `<i class="material-icons-round" style="color:#ffffff;">save</i> <span style="color:#ffffff;">SALVA IN AGENDA</span>`;
        if(window.closeSidebar) window.closeSidebar(null, true);
        if(window.showToast) window.showToast("Appuntamento salvato con successo!");
        if(window.render) window.render();
        window._pendingSaveData = null;
        window._currentEditingOldName = null;
    };

    const isDateChanged = isEdit && oldD && oldD !== d;

    if (isDateChanged) {
        appRoot.child(oldD).once('value').then(snapOld => {
            let oldApps = window.normalizeFbArray(snapOld.val());
            oldApps = oldApps.filter(x => x.id !== appId && x.id !== "TWIN_" + appId);
            
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

            if (isEdit && !appObj