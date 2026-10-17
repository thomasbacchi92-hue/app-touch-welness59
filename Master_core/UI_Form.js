/* Master_core/UI_Form.js - Interfaccia Sidebar, Fix Grafici e Form Logic */

// ==========================================
// CAPSULA JAVASCRIPT: Distruzione definitiva del resize Note
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const __twNoteProtector = document.createElement('style');
    __twNoteProtector.innerHTML = "textarea#aNote { resize: none !important; }";
    document.head.appendChild(__twNoteProtector);
});

window.sysCloseSidebar = function(e, force = false) {
    const sidebar = document.getElementById('sideForm');
    if(!sidebar) return;
    if (force || (e && (e.target.classList.contains('layout') || e.target.classList.contains('grid-container')))) {
        sidebar.classList.remove('active'); sidebar.classList.remove('request-mode');
    }
};

window.sysRenderServiceBox = function() {
    const area = document.getElementById('serviceRenderArea'); 
    if(!area) return;
    const sName = document.getElementById('aServ') ? document.getElementById('aServ').value : "";
    
    if(sName) { 
        const finalP = parseFloat(document.getElementById('aPrice')?.value) || parseFloat(document.getElementById('aBasePrice')?.value) || 0;
        const dur = document.getElementById('aDur')?.value || 30;
        area.innerHTML = `
            <div class="selected-service-badge" style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 12px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div class="info">
                    <b style="color: var(--green); display: block; font-size: 13px; margin-bottom: 2px; text-transform:uppercase;">${sName}</b>
                    <span style="color: var(--text-muted); font-size: 10px; font-weight: bold;">${dur} min | ${finalP.toFixed(2)} €</span>
                </div>
                <div style="display:flex; gap:8px; align-items:center;">
                    <div title="Applica Sconto" onclick="document.getElementById('discountModule').style.display='block';" style="color: var(--gold); background: rgba(251, 191, 36, 0.1); border: 1px solid var(--gold); border-radius: 6px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s;">
                        <i class="material-icons-round" style="font-size:14px;">local_offer</i>
                    </div>
                    <div title="Rimuovi Servizio" onclick="if(typeof window.sysExecuteRemoveService === 'function') window.sysExecuteRemoveService()" style="color: var(--red); background: rgba(239, 68, 68, 0.1); border: 1px solid var(--red); border-radius: 6px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s;">
                        <i class="material-icons-round" style="font-size:14px;">close</i>
                    </div>
                </div>
            </div>`; 
    } 
    else { 
        area.innerHTML = `
            <button type="button" class="btn-save" style="background: #2563eb !important; border: 1px solid #1d4ed8 !important; margin-bottom: 12px;" onclick="if(typeof window.sysOpenServiceSelector === 'function') window.sysOpenServiceSelector()">
                <i class="material-icons-round" style="color: #ffffff !important;">add_circle</i> <span style="color: #ffffff !important;">AGGIUNGI SERVIZIO</span>
            </button>`; 
    }
};

window.sysExecuteRemoveService = function() { 
    ['aServ', 'aDur', 'aPrice', 'aBasePrice'].forEach(id => { if(document.getElementById(id)) document.getElementById(id).value = (id==="aDur"?"30":""); });
    window.sysRenderServiceBox();
};

window.sysSetDiscountType = function(type) {
    if(document.getElementById('aDiscountType')) document.getElementById('aDiscountType').value = type;
    if(document.getElementById('btnScontoPerc')) { document.getElementById('btnScontoPerc').style.background = type === 'perc' ? 'var(--accent)' : 'transparent'; document.getElementById('btnScontoPerc').style.color = type === 'perc' ? '#0f172a' : 'var(--text-main)'; }
    if(document.getElementById('btnScontoEuro')) { document.getElementById('btnScontoEuro').style.background = type === 'euro' ? 'var(--accent)' : 'transparent'; document.getElementById('btnScontoEuro').style.color = type === 'euro' ? '#0f172a' : 'var(--text-main)'; }
    window.sysCalculatePrice();
};

window.sysCalculatePrice = function() {
    const base = parseFloat(document.getElementById('aBasePrice')?.value) || 0;
    const type = document.getElementById('aDiscountType')?.value || 'euro';
    const val = parseFloat(document.getElementById('discountValue')?.value) || 0;
    let finalPrice = base;
    if (val > 0) { if(type === 'euro') finalPrice = base - val; else if(type === 'perc') finalPrice = base - (base * (val / 100)); }
    if(finalPrice < 0) finalPrice = 0;
    if(document.getElementById('aPrice')) document.getElementById('aPrice').value = finalPrice.toFixed(2);
    window.sysRenderServiceBox(); 
};

window.sysRemoveDiscount = function() {
    if(document.getElementById('discountModule')) document.getElementById('discountModule').style.display = 'none';
    if(document.getElementById('discountValue')) document.getElementById('discountValue').value = '';
    window.sysSetDiscountType('euro'); 
};

window.sysPopulateOperators = function() {
    const op1 = document.getElementById('aOp'); const op2 = document.getElementById('aOp2');
    if (!op1 && !op2) return;
    const currentVal1 = op1 ? op1.value : null; const currentVal2 = op2 ? op2.value : null;
    const d = document.getElementById('aDate') ? document.getElementById('aDate').value : null;
    const ora = document.getElementById('aOra') ? document.getElementById('aOra').value : null;
    const dur = parseInt(document.getElementById('aDur') ? document.getElementById('aDur').value : 30, 10);
    const currentAppId = document.getElementById('mId') ? document.getElementById('mId').value : null;
    let dayApps = (d && window.db && window.db.app && window.db.app[d]) ? window.normalizeFbArray(window.db.app[d]) : [];
    let startMin = (ora && typeof window.tToM === 'function') ? window.tToM(ora) : null;
    let endMin = startMin !== null ? startMin + dur : null;

    let optionsHtml = '<option value="">-- Seleziona --</option>';

    if (window.allUsersData && window.twStructId) {
        Object.values(window.allUsersData).forEach(u => {
            const isGhost = (u.attivo === false || u.eliminato === true);
            if (String(u.structureId) === String(window.twStructId) && !isGhost) {
                let isBusy = false; 
                if (startMin !== null) {
                    isBusy = dayApps.some(a => {
                        if (a.id === currentAppId || a.id === "TWIN_" + currentAppId) return false;
                        if ((a.op || '').toLowerCase() !== (u.nick || '').toLowerCase()) return false;
                        const aStart = window.tToM(a.ora); const aEnd = aStart + (parseInt(a.dur) || 30) + 10;
                        return (startMin < aEnd && endMin > aStart);
                    });
                }
                const cleanName = `${u.name || ''} ${u.surname || ''}`.trim();
                if (isBusy) { optionsHtml += `<option value="${u.nick}">🔴 ${cleanName}</option>`; } 
                else { optionsHtml += `<option value="${u.nick}">🟢 ${cleanName}</option>`; }
            }
        });
    }
    if (op1) { op1.innerHTML = optionsHtml; if (currentVal1) op1.value = currentVal1; }
    if (op2) { op2.innerHTML = optionsHtml; if (currentVal2) op2.value = currentVal2; }
};

window.sysHandleOperatorChange = function(selectElement) {
    if (!selectElement.value) return;
    window.sysPopulateOperators();
};

window.sysOpenSlot = function(ora, cab) {
    window._currentEditingOldName = null; const sideForm = document.getElementById('sideForm'); if(!sideForm) return;
    if (sideForm.classList.contains('active')) { if(document.getElementById("aOra")) document.getElementById("aOra").value = ora; if(document.getElementById("aCab")) document.getElementById("aCab").value = cab; window.sysPopulateOperators(); return; }
    
    sideForm.classList.remove('request-mode'); 
    if(document.getElementById("sidebarTitle")) { document.getElementById("sidebarTitle").innerText = "Nuovo Appuntamento"; document.getElementById("sidebarTitle").style.color = "#ffffff"; }
    if(document.getElementById("mId")) document.getElementById("mId").value = ""; 
    const cd = document.getElementById("mainDate") ? document.getElementById("mainDate").value : new Date().toISOString().split('T')[0]; 
    if(document.getElementById("aDate")) document.getElementById("aDate").value = cd; 
    if(document.getElementById("mOldDate")) document.getElementById("mOldDate").value = cd; 
    if(document.getElementById("aOra")) document.getElementById("aOra").value = ora; 
    if(document.getElementById("aCab")) document.getElementById("aCab").value = cab;
    
    ['aCam', 'aCog', 'aTel', 'aDataNascita', 'aOp', 'aNote', 'aFattura', 'aCodCliente', 'aPatologie'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ""; });
    
    if(document.getElementById('coupleFields')) document.getElementById('coupleFields').style.display = 'none';
    if(document.getElementById('aIsCouple')) document.getElementById('aIsCouple').value = "false";
    if(document.getElementById('aCab2')) document.getElementById('aCab2').value = ""; if(document.getElementById('aOp2')) document.getElementById('aOp2').value = "";
    if(document.getElementById('aServ')) document.getElementById('aServ').value = ""; if(document.getElementById('aDur')) document.getElementById('aDur').value = "30"; 
    if(document.getElementById('aPrice')) document.getElementById('aPrice').value = "0"; if(document.getElementById('aBasePrice')) document.getElementById('aBasePrice').value = "0"; 
    
    if(document.getElementById("patologieWrapper")) { document.getElementById("patologieWrapper").style.display = "none"; if(document.getElementById("btnShowPatologie")) document.getElementById("btnShowPatologie").style.display = "flex"; }
    if(document.getElementById("aEseguito")) document.getElementById("aEseguito").checked = false;
    if(document.getElementById("btnSaveAppStandard")) document.getElementById("btnSaveAppStandard").style.display = "flex"; 
    if(document.getElementById("editActionButtons")) document.getElementById("editActionButtons").style.setProperty("display", "none", "important"); 
    
    window.sysRenderServiceBox(); window.sysPopulateOperators(); sideForm.classList.add('active');
};

window.sysOpenEdit = function(id) {
    const d = document.getElementById("mainDate") ? document.getElementById("mainDate").value : null;
    if(!d || !window.db || !window.db.app) return;
    let apps = window.normalizeFbArray(window.db.app[d]);
    let app = apps.find(x => x.id === id); if(!app) return;
    if(app.isCouple && app.linkedId && app.price === 0) app = apps.find(x => x.id === app.linkedId) || app;

    window._currentEditingOldName = app.cog || "Ospite"; const sideForm = document.getElementById('sideForm'); if(!sideForm) return;

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
    
    let patValue = app.patologie || "";
    if (!patValue && window.globalCustomers && app.cog) {
        const crmMatch = window.globalCustomers.find(c => c.nome && c.nome.toLowerCase() === app.cog.toLowerCase());
        if (crmMatch && crmMatch.patologie) patValue = crmMatch.patologie;
    }
    
    if(document.getElementById("aPatologie")) {
        document.getElementById("aPatologie").value = patValue;
        if(patValue.trim() !== "") { 
            document.getElementById("patologieWrapper").style.display = "block";
            if(document.getElementById("btnShowPatologie")) document.getElementById("btnShowPatologie").style.display = "none"; 
        } else { 
            document.getElementById("patologieWrapper").style.display = "none";
            if(document.getElementById("btnShowPatologie")) document.getElementById("btnShowPatologie").style.display = "flex"; 
        }
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
    window.sysRenderServiceBox(); window.sysPopulateOperators();
    setTimeout(() => {
        if(document.getElementById("aOp")) document.getElementById("aOp").value = app.op || ""; 
        if(app.isCouple && app.linkedId) { const twin = apps.find(x => x.id === app.linkedId); if(twin && document.getElementById("aOp2")) document.getElementById("aOp2").value = twin.op || ""; }
    }, 50);
    
    if(document.getElementById("btnSaveAppStandard")) document.getElementById("btnSaveAppStandard").style.display = "flex"; 
    if(document.getElementById("editActionButtons")) document.getElementById("editActionButtons").style.setProperty("display", "flex", "important"); 
    sideForm.classList.add('active');
};

window.sysOpenCRMProfileGrid = function(nomeCliente) {
    if (!nomeCliente || nomeCliente === "N.D." || nomeCliente.toLowerCase() === "ospite") {
        if(window.showErrorToast) window.showErrorToast("Ospite generico, nessun profilo CRM associato.");
        return;
    }
    if (!window.globalCustomers) {
        if(window.showErrorToast) window.showErrorToast("Anagrafica CRM in caricamento...");
        return;
    }
    const match = window.globalCustomers.find(c => c.nome && c.nome.toLowerCase() === nomeCliente.toLowerCase());
    if (!match) {
        if(window.showErrorToast) window.showErrorToast("Cliente non trovato in anagrafica CRM.");
        return;
    }
    if(document.getElementById('cp_nome')) document.getElementById('cp_nome').innerText = match.nome || "Sconosciuto";
    if(document.getElementById('cp_tel')) document.getElementById('cp_tel').innerText = match.tel || "-";
    if(document.getElementById('cp_dob')) document.getElementById('cp_dob').innerText = match.dataNascita || "-";
    if(document.getElementById('cp_note')) document.getElementById('cp_note').value = match.note || "";
    if(document.getElementById('cp_spent')) document.getElementById('cp_spent').innerText = "-";
    
    if(document.getElementById('customerProfileModal')) document.getElementById('customerProfileModal').style.display = 'flex';
};

window.checkAndSendPrivacy = function() {
    const structId = window.twStructId || localStorage.getItem('tw_structure_id');
    if(!structId) return;
    
    const idInput = document.getElementById('mId'); 
    const dateInput = document.getElementById('aDate');
    const appId = (idInput && idInput.value) ? idInput.value : "APP_" + Date.now();
    const date = (dateInput && dateInput.value) ? dateInput.value : new Date().toISOString().split('T')[0];
    const guestName = document.getElementById('aCog') && document.getElementById('aCog').value ? document.getElementById('aCog').value : "Ospite";
    const guestPhone = document.getElementById('aTel') && document.getElementById('aTel').value ? document.getElementById('aTel').value : "Non inserito";
    const guestDobRaw = document.getElementById('aDataNascita') && document.getElementById('aDataNascita').value ? document.getElementById('aDataNascita').value : "";
    const guestDob = guestDobRaw ? guestDobRaw.split('-').reverse().join('/') : "___/___/____";
    const signatureDate = new Date().toLocaleDateString('it-IT');
    const patologieTesto = document.getElementById('aPatologie') ? document.getElementById('aPatologie').value.trim() : "";
    
    if(window.showToast) window.showToast("Generazione Contratto in corso...");

    firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${structId}`).once('value').then(snap => {
        const structData = snap.val() || {}; 
        const activeDocNames = (structData.settings && structData.settings.active_docs) ? structData.settings.active_docs : [];
        const allContracts = structData.contracts || {}; 
        let docsPayload = [];
        
        if(activeDocNames.length === 0) {
            docsPayload = [{ title: "Avviso", content: "Nessun documento configurato in Admin." }];
        } else {
            activeDocNames.forEach(name => {
                let foundContent = "Testo non trovato.";
                for(let key in allContracts) {
                    let c = allContracts[key];
                    if((c.documentName || key) === name && c.testoGenerato) {
                        foundContent = c.testoGenerato.replace(/\{\{NOME_CLIENTE\}\}/gi, guestName).replace(/\{\{TELEFONO\}\}/gi, guestPhone).replace(/\{\{DATA_NASCITA\}\}/gi, guestDob).replace(/\{\{DATA_FIRMA\}\}/gi, signatureDate);
                        let tempDiv = document.createElement('div'); tempDiv.innerHTML = foundContent;
                        tempDiv.innerHTML = tempDiv.innerHTML.replace(/Data di [Nn]ascita[^_]*_+[\/]+_+[\/]+_+/g, 'Data di Nascita <b style="color:black">' + guestDob + '</b>');
                        let patHtml = patologieTesto ? '<b style="color:black">' + patologieTesto + '</b>' : '............';
                        tempDiv.innerHTML = tempDiv.innerHTML.replace(/Altro,\s*specificare:\s*\.+/gi, 'Altro, specificare: ' + patHtml);
                        
                        let currentHtml = tempDiv.innerHTML;
                        currentHtml = currentHtml.replace(/☐(?=[\s\S]{0,40}Relax)/gi, '☑');
                        currentHtml = currentHtml.replace(/☐(?=[\s\S]{0,80}buona salute)/gi, '☑');
                        currentHtml = currentHtml.replace(/☐(?=[\s\S]{0,80}idoneo)/gi, '☑');
                        tempDiv.innerHTML = currentHtml;
                        
                        const walk = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT, null, false);
                        let textNodes = []; let n; while(n = walk.nextNode()) textNodes.push(n);
                        textNodes.forEach(node => {
                            let txt = node.nodeValue.toLowerCase();
                            if(txt.includes("relax") || txt.includes("buona salute") || txt.includes("idoneo")) {
                                let current = node.parentElement; let found = false; let attempts = 0;
                                while(current && attempts < 5 && !found) {
                                    let cb = current.querySelector('input[type="checkbox"]');
                                    if(cb) { cb.setAttribute("checked", "checked"); found = true; } 
                                    else {
                                        let prevContainer = current.previousElementSibling;
                                        if(prevContainer) {
                                            let prevCb = prevContainer.querySelector('input[type="checkbox"]');
                                            if(prevCb) { prevCb.setAttribute("checked", "checked"); found = true; } 
                                            else if (prevContainer.nodeName === 'INPUT' && prevContainer.type === 'checkbox') { prevContainer.setAttribute("checked", "checked"); found = true; }
                                        }
                                    }
                                    current = current.parentElement; attempts++;
                                }
                            }
                        });
                        foundContent = tempDiv.innerHTML; break;
                    }
                }
                docsPayload.push({ title: name, content: foundContent });
            });
        }
        
        if(window.DeviceSync && typeof window.DeviceSync.sendToMobile === 'function') { 
            window.DeviceSync.sendToMobile(appId, date, docsPayload); 
            if(window.showToast) window.showToast("Modulo Privacy inviato con successo al Tablet!");
        } 
    });
};