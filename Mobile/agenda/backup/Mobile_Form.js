/* Mobile_Form.js - Segreteria, Colori Operatori (Anti-crash garantito) */

document.addEventListener('DOMContentLoaded', function(){ m_injectFormStyles(); });

function m_injectFormStyles() {
    if(document.getElementById("formDynamicStyles")) return;
    var style = document.createElement("style");
    style.id = "formDynamicStyles";
    style.innerHTML = `
        .op-free { color: #00ff88 !important; font-weight: bold; background: rgba(0, 255, 136, 0.1); }
        .op-busy { color: #ff4444 !important; font-style: italic; background: rgba(255, 68, 68, 0.1); }
        .light-theme .op-free { color: #10b981 !important; background: rgba(16, 185, 129, 0.05); }
        .light-theme .op-busy { color: #ef4444 !important; background: rgba(239, 68, 68, 0.05); }
    `;
    document.head.appendChild(style);
}

function m_openForm(e, id, cab, ora) {
    id = id || ''; cab = cab || 1; ora = ora || "10:00";
    try {
        if(e) e.stopPropagation(); 
        if(isPanoramica) return;
        
        var custSugg = document.getElementById("customerSuggestions");
        if(custSugg) custSugg.style.display = 'none';
        
        m_injectFormButtons();

        var targetApp = null; var tDate = null;
        if(id) {
            Object.keys(db.app || {}).forEach(function(d){ var arr = normalizeFbArray(db.app[d]); var found = arr.find(function(x){ return String(x.id) === String(id); }); if(found) { targetApp = found; tDate = d; } });
        }

        if(id && targetApp) {
            var elTitle = document.getElementById("formTitle"); if(elTitle) elTitle.innerText = "Modifica Appuntamento";
            
            var fId = document.getElementById("fId"); if(fId) { fId.value = id; fId.dataset.originalName = targetApp.cog || ""; }
            var fDate = document.getElementById("fDate"); if(fDate) fDate.value = tDate;
            var fOldDate = document.getElementById("fOldDate"); if(fOldDate) fOldDate.value = tDate;
            var fOra = document.getElementById("fOra"); if(fOra) fOra.value = targetApp.ora;
            var fCab = document.getElementById("fCab"); if(fCab) fCab.value = targetApp.cab;
            var fCam = document.getElementById("fCam"); if(fCam) fCam.value = targetApp.cam || "";
            var fTel = document.getElementById("fTel"); if(fTel) fTel.value = targetApp.tel || "";
            var fCog = document.getElementById("fCog"); if(fCog) fCog.value = targetApp.cog || "";
            var fNote = document.getElementById("fNote"); if(fNote) fNote.value = targetApp.note || "";
            var fEseguito = document.getElementById("fEseguito"); if(fEseguito) fEseguito.checked = targetApp.eseguito || false;
            var fPatologie = document.getElementById("fPatologie"); if(fPatologie) fPatologie.value = targetApp.patologie || "";
            var fServ = document.getElementById("fServ"); if(fServ) fServ.value = targetApp.serv || "";
            var fDur = document.getElementById("fDur"); if(fDur) fDur.value = targetApp.dur || 30;
            var fPrice = document.getElementById("fPrice"); if(fPrice) fPrice.value = targetApp.price || 0;
            
            var hasDocs = false; var c = globalCustomersList.find(function(x){ return x.nome && x.nome.toLowerCase() === (targetApp.cog||'').toLowerCase();});
            if(c && c.docs && Object.keys(c.docs).length > 0) hasDocs = true;
            var hasLinkToday = !!(targetApp.privacyLink && String(targetApp.privacyLink).startsWith("http"));
            if(typeof m_updatePrivacyUI === 'function') m_updatePrivacyUI(hasLinkToday, hasDocs);
            
            var editBox = document.getElementById("editActionButtons"); if(editBox) editBox.style.display = "flex";
        } else {
            var elTitle = document.getElementById("formTitle"); if(elTitle) elTitle.innerText = "Nuovo Appuntamento";
            
            var fId = document.getElementById("fId"); if(fId) { fId.value = ""; fId.dataset.originalName = ""; }
            var mDateEl = document.getElementById("mainDate"); var cd = mDateEl ? mDateEl.value : new Date().toISOString().split('T')[0];
            var fDate = document.getElementById("fDate"); if(fDate) fDate.value = cd;
            var fOldDate = document.getElementById("fOldDate"); if(fOldDate) fOldDate.value = cd;
            var fOra = document.getElementById("fOra"); if(fOra) fOra.value = ora;
            var fCab = document.getElementById("fCab"); if(fCab) fCab.value = cab;
            
            ['fCam','fTel','fCog','fNote','fServ','fPatologie'].forEach(function(x){ var el = document.getElementById(x); if(el) el.value=""; });
            
            var fDur = document.getElementById("fDur"); if(fDur) fDur.value = "30";
            var fPrice = document.getElementById("fPrice"); if(fPrice) fPrice.value = "0";
            var fEseguito = document.getElementById("fEseguito"); if(fEseguito) fEseguito.checked = false;
            
            if(typeof m_updatePrivacyUI === 'function') m_updatePrivacyUI(false, false);
            var editBox = document.getElementById("editActionButtons"); if(editBox) editBox.style.display = "none";
        }
        
        var sel = document.getElementById("fOp"); 
        if(sel) {
            sel.innerHTML = '<option value="">-- Indifferente --</option>';
            sel.onchange = function(ev) { if(typeof m_checkOperatorConflict === 'function') m_checkOperatorConflict(ev.target); };

            firebase.database().ref('MASTER_ADMIN_DB/users').once('value').then(function(snap){
                var allUsers = snap.val() || {};
                var validOperators = Object.values(allUsers).filter(function(u){ return String(u.structureId) === String(sId);});
                
                var formDateEl = document.getElementById("fDate"); var formDate = formDateEl ? formDateEl.value : "";
                var fOraEl = document.getElementById("fOra"); var startMin = fOraEl ? tToM(fOraEl.value) : 0;
                var fDurEl = document.getElementById("fDur"); var endMin = startMin + parseInt(fDurEl ? fDurEl.value : 30);
                
                var dayApps = normalizeFbArray(db.app && db.app[formDate] ? db.app[formDate] : []);

                validOperators.forEach(function(u){ 
                    var opName = u.nick || u.name || "Sconosciuto";
                    var isBusy = dayApps.some(function(a){
                        if(id && String(a.id) === String(id)) return false; 
                        if(String(a.op).toLowerCase().trim() !== String(opName).toLowerCase().trim()) return false;
                        var aStart = tToM(a.ora); var aEnd = aStart + (parseInt(a.dur) || 30) + 10; 
                        return (startMin < aEnd && endMin > aStart);
                    });

                    var cssClass = isBusy ? "op-busy" : "op-free";
                    var label = isBusy ? `🔴 ${opName} (Occupato)` : `🟢 ${opName} (Libero)`;
                    var opt = new Option(label, opName);
                    opt.className = cssClass;
                    opt.dataset.busy = isBusy;
                    sel.appendChild(opt);
                });
                
                if(targetApp && targetApp.op) sel.value = targetApp.op;
            });
        }

        if(typeof m_renderServiceBox === 'function') m_renderServiceBox(); 
        
        var formSheet = document.getElementById("appFormSheet");
        if(formSheet) formSheet.classList.add("active");
        
    } catch(err) { console.error("Errore script interno form:", err); }
}

function m_checkOperatorConflict(selectEl) {
    var selectedOption = selectEl.options[selectEl.selectedIndex];
    if (selectedOption && selectedOption.dataset.busy === "true") {
        var opName = selectedOption.value;
        var formDate = document.getElementById("fDate").value;
        var startMin = tToM(document.getElementById("fOra").value);
        var endMin = startMin + parseInt(document.getElementById("fDur").value || 30);
        
        var dayApps = normalizeFbArray(db.app && db.app[formDate] ? db.app[formDate] : []);
        var conflictApp = dayApps.find(function(a){
            if(document.getElementById("fId").value && String(a.id) === String(document.getElementById("fId").value)) return false;
            if(a.op !== opName) return false;
            var aStart = tToM(a.ora); var aEnd = aStart + (parseInt(a.dur) || 30) + 10;
            return (startMin < aEnd && endMin > aStart);
        });

        if(conflictApp) {
            var modal = document.getElementById('opConflictModal');
            if(!modal) {
                modal = document.createElement('div');
                modal.id = 'opConflictModal';
                modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:10001; display:none; align-items:center; justify-content:center; padding:20px; backdrop-filter: blur(4px);';
                document.body.appendChild(modal);
            }
            modal.innerHTML = `
                <div style="background:var(--bg-panel); border:1px solid var(--border-line); border-radius:16px; padding:25px; width:100%; max-width:350px; text-align:center; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                    <i class="material-icons-round" style="font-size:48px; color:var(--red); margin-bottom:10px;">assignment_late</i>
                    <h3 style="color:var(--text-main); margin-top:0; font-size:16px;">Operatore Occupato</h3>
                    <p style="font-size:13px; color:var(--text-muted); margin-bottom:15px;"><b>${opName}</b> è già in Cabina ${conflictApp.cab} alle ${conflictApp.ora}. Vuoi rimuoverlo dal vecchio e assegnarlo qui?</p>
                    <div style="display:flex; gap:10px;">
                        <button onclick="document.getElementById('fOp').value=''; document.getElementById('opConflictModal').style.display='none'" style="flex:1; padding:14px; border-radius:10px; background:transparent; border:1px solid var(--border-line); color:var(--text-main); font-weight:bold; cursor:pointer;">ANNULLA</button>
                        <button onclick="m_stealOperator('${conflictApp.id}', '${formDate}')" style="flex:1; padding:14px; border-radius:10px; background:var(--red); border:none; color:white; font-weight:bold; cursor:pointer;">INSERISCI</button>
                    </div>
                </div>
            `;
            modal.style.display = 'flex';
        }
    }
}

function m_stealOperator(conflictId, date) {
    var apps = normalizeFbArray(db.app && db.app[date] ? db.app[date] : []);
    var idx = apps.findIndex(function(x){ return String(x.id) === String(conflictId); });
    if(idx > -1) {
        apps[idx].op = ""; 
        firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + sId + '/app').child(date).set(apps).then(function(){
            document.getElementById('opConflictModal').style.display = 'none';
            if(typeof showToast === 'function') showToast("Operatore spostato!");
            m_openForm(null, document.getElementById("fId").value, document.getElementById("fCab").value, document.getElementById("fOra").value);
        });
    }
}

function m_injectFormButtons() {
    var fCog = document.getElementById("fCog");
    if(fCog && !document.getElementById("btnGoCrm")) {
        var btn = document.createElement("button");
        btn.id = "btnGoCrm";
        btn.className = "btn-save btn-outline";
        btn.style.cssText = "padding:10px; width:45px; flex-shrink:0; border-color:var(--accent); color:var(--accent); display:flex; align-items:center; justify-content:center; margin:0; height: 44px;";
        btn.innerHTML = "<i class='material-icons-round'>badge</i>";
        btn.onclick = function(e){ e.preventDefault(); if(typeof m_goToCustomerDocsFromForm === 'function') m_goToCustomerDocsFromForm(); };
        
        if (fCog.parentNode && fCog.parentNode.style.display === 'flex') { fCog.parentNode.appendChild(btn); } 
        else if (fCog.insertAdjacentElement) { fCog.insertAdjacentElement('afterend', btn); }
    }

    var editBox = document.getElementById("editActionButtons");
    if(editBox && !document.getElementById("btnQuickMove")) {
        var qm = document.createElement("button");
        qm.id = "btnQuickMove";
        qm.className = "btn-save btn-outline";
        qm.style.cssText = "width:100%; margin-top:10px; margin-bottom:10px; border-color:var(--gold); color:var(--gold); display:flex; align-items:center; justify-content:center; gap:5px;";
        qm.innerHTML = "<i class='material-icons-round'>bolt</i> SPOSTAMENTO RAPIDO";
        qm.onclick = function(e){ e.preventDefault(); if(typeof m_openSearchEngine === 'function') m_openSearchEngine(true); };
        editBox.insertBefore(qm, editBox.firstChild); 
    }
}

function m_saveApp() {
    var idEl = document.getElementById("fId"); var id = idEl ? idEl.value : "";
    var dateEl = document.getElementById("fDate"); var date = dateEl ? dateEl.value : ""; 
    var servEl = document.getElementById("fServ"); var serv = servEl ? servEl.value : "";
    
    if(!date || !serv) { if(typeof showToast === 'function') showToast("Mancano dati obbligatori"); return; }

    var cogEl = document.getElementById("fCog");
    var currentName = cogEl ? cogEl.value.trim() : "";
    var originalName = idEl && idEl.dataset.originalName ? idEl.dataset.originalName : "";

    if (id && originalName && originalName.toLowerCase() !== currentName.toLowerCase() && currentName !== "") {
        m_showElegantConfirmNameChange(originalName, currentName, 
            function(){ m_executeFinalSave(true, null); }, 
            function(){ m_executeFinalSave(false, originalName); } 
        );
    } else {
        m_executeFinalSave(false, null);
    }
}

function m_executeFinalSave(createNewCustomer, oldNameForCorrection) {
    try {
        var id = document.getElementById("fId").value || "APP"+Date.now(); 
        var date = document.getElementById("fDate").value; 
        var oldDate = document.getElementById("fOldDate").value;
        var currentName = document.getElementById("fCog").value.trim();
        
        var existingLink = "";
        if (id && oldDate && db.app[oldDate]) {
            var oldApp = normalizeFbArray(db.app[oldDate]).find(function(x){ return String(x.id) === String(id);});
            if (oldApp && oldApp.privacyLink) existingLink = oldApp.privacyLink;
        }

        var startMin = tToM(document.getElementById("fOra").value);
        var endMin = startMin + parseInt(document.getElementById("fDur").value || 30);
        var appsCheck = normalizeFbArray(db.app && db.app[date] ? db.app[date] : []);
        
        var hasCollision = appsCheck.some(function(a){ 
            if(String(a.id) === String(id) || parseInt(a.cab) !== parseInt(document.getElementById("fCab").value)) return false; 
            var aStart = tToM(a.ora); 
            var aEndWithClean = aStart + (parseInt(a.dur)||30) + 10; 
            return (startMin < aEndWithClean && endMin > aStart); 
        });

        if(hasCollision) { if(typeof showToast === 'function') showToast("Bloccato: Sovrapposizione con appuntamento o pulizia!"); return; }

        var privEl = document.getElementById("fPrivacy");
        var privacyChecked = existingLink !== "" ? true : (privEl ? (privEl.value === 'true') : false);
        
        if(currentName && typeof globalCustomersList !== 'undefined') {
            if (createNewCustomer) {
                var newId = "CUST_" + Date.now();
                firebase.database().ref('MASTER_ADMIN_DB/global_customers/' + newId).set({
                    nome: currentName, tel: document.getElementById("fTel").value, cam: document.getElementById("fCam").value,
                    patologie: document.getElementById("fPatologie").value, privacy: privacyChecked, lastStruct: sId
                });
            } else if (oldNameForCorrection) {
                var custToFix = globalCustomersList.find(function(c){ return c.nome && String(c.nome).toLowerCase() === String(oldNameForCorrection).toLowerCase();});
                if(custToFix) {
                    firebase.database().ref('MASTER_ADMIN_DB/global_customers/' + custToFix.id).update({
                        nome: currentName, tel: document.getElementById("fTel").value, cam: document.getElementById("fCam").value,
                        patologie: document.getElementById("fPatologie").value, privacy: privacyChecked, lastStruct: sId
                    });
                }
            } else {
                var custToUpdate = globalCustomersList.find(function(c){ return c.nome && String(c.nome).toLowerCase() === String(currentName).toLowerCase();});
                var custId = custToUpdate ? custToUpdate.id : "CUST_" + Date.now();
                firebase.database().ref('MASTER_ADMIN_DB/global_customers/' + custId).update({
                    nome: currentName, tel: document.getElementById("fTel").value, cam: document.getElementById("fCam").value,
                    patologie: document.getElementById("fPatologie").value, privacy: privacyChecked, lastStruct: sId
                });
            }
        }

        var opValue = document.getElementById("fOp").value || "";
        var cleanOp = opValue.replace(/[🔴🟢]/g, '').replace(/\(Libero\)/g, '').replace(/\(Occupato\)/g, '').trim();

        var obj = {
            id: id,
            ora: document.getElementById("fOra").value || "10:00",
            cab: parseInt(document.getElementById("fCab").value) || 1,
            cog: currentName || "N.D.",
            tel: document.getElementById("fTel").value || "",
            cam: document.getElementById("fCam").value || "",
            serv: document.getElementById("fServ").value || "",
            dur: parseInt(document.getElementById("fDur").value) || 30,
            price: parseFloat(document.getElementById("fPrice").value) || 0,
            op: cleanOp,
            note: document.getElementById("fNote").value || "",
            patologie: document.getElementById("fPatologie").value || "",
            privacy: privacyChecked,
            privacyLink: existingLink,
            eseguito: document.getElementById("fEseguito").checked || false,
            pagato: false,
            fromReception: false,
            reqId: ""
        };

        var dbRefLocal = firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + sId + '/app');
        if(id && oldDate && oldDate !== date) { 
            var oldApps = normalizeFbArray(db.app && db.app[oldDate] ? db.app[oldDate] : []); 
            dbRefLocal.child(oldDate).set(oldApps.filter(function(x){ return String(x.id) !== String(id);})); 
        }
        
        var targetApps = normalizeFbArray(db.app && db.app[date] ? db.app[date] : []);
        if(id && oldDate === date) { 
            var i = targetApps.findIndex(function(x){ return String(x.id) === String(id); }); 
            if(i > -1) { 
                obj.pagato = targetApps[i].pagato || false; 
                obj.fromReception = targetApps[i].fromReception || false; 
                obj.reqId = targetApps[i].reqId || ""; 
                targetApps[i] = obj; 
            } else targetApps.push(obj); 
        } else { targetApps.push(obj); }
        
        dbRefLocal.child(date).set(targetApps).then(function(){ 
            m_closeForm(null, true); if(typeof showToast === 'function') showToast("Salvato con successo!"); 
            if(typeof m_renderAll === 'function') m_renderAll(); 
        });

    } catch(e) { console.error(e); if(typeof showToast === 'function') showToast("Errore di Salvataggio"); }
}

function m_closeForm(e, force) { 
    if(force || (e && !e.target.closest('.sheet-content') && !e.target.closest('.modal-box'))) { 
        var formSheet = document.getElementById("appFormSheet");
        if(formSheet) formSheet.classList.remove("active"); 
        var custSugg = document.getElementById("customerSuggestions");
        if(custSugg) custSugg.style.display = 'none'; 
    } 
}
function m_delApp() { 
    var d = document.getElementById("fOldDate").value; var id = document.getElementById("fId").value; 
    var apps = normalizeFbArray(db.app && db.app[d] ? db.app[d] : []); var appToDel = apps.find(function(x){ return String(x.id) === String(id); }); 
    if(typeof m_showElegantPrompt === 'function') m_showElegantPrompt("Elimina", "Motivo:", function(motivo){ m_executeDeleteApp(motivo, appToDel, apps, d, id); }); 
}
function m_executeDeleteApp(motivo, appToDel, apps, d, id) { 
    apps = apps.filter(function(x){ return String(x.id) !== String(id);}); 
    var promises = [firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + sId + '/app').child(d).set(apps)]; 
    if(appToDel) { 
        appToDel.deleteReason = motivo; appToDel.date = d; appToDel.deletedAt = new Date().toLocaleString('it-IT'); appToDel.deletedBy = localStorage.getItem("tw_user") || "Staff"; 
        promises.push(firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + sId + '/deleted_apps').push(appToDel)); 
    } 
    Promise.all(promises).then(function(){ m_closeForm(null, true); if(typeof showToast==='function') showToast("Eliminato."); if(typeof m_renderAll === 'function') m_renderAll(); }); 
}
function m_shareWA() { var t = document.getElementById("fTel").value; if(t) window.open(`https://wa.me/${t}?text=Gentile%20Ospite,%20ti%20aspettiamo%20in%20SPA.`, '_blank'); }

function m_showElegantConfirmNameChange(oldName, newName, onCreaNuovo, onCorreggi) {
    var modal = document.getElementById('nameChangeModalUI'); 
    if(!modal) { 
        modal = document.createElement('div'); 
        modal.id = 'nameChangeModalUI'; 
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:10000; display:none; align-items:center; justify-content:center; padding:20px; backdrop-filter: blur(4px);'; 
        modal.innerHTML = `
        <div style="background:var(--bg-panel); border:1px solid var(--border-line); border-radius:16px; padding:25px; width:100%; max-width:350px; text-align:center; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
            <i class="material-icons-round" style="font-size:48px; color:var(--accent); margin-bottom:10px;">manage_accounts</i>
            <h3 style="color:var(--text-main); margin-top:0; font-size:16px;">Cambio Nome Rilevato</h3>
            <p style="font-size:13px; color:var(--text-muted); margin-bottom:15px;">Da <b id="ncOld" style="color:var(--red)"></b> a <b id="ncNew" style="color:var(--green)"></b>.</p>
            <div style="display:flex; flex-direction:column; gap:10px;">
                <button id="ncCreaNuovo" style="width:100%; padding:14px; border-radius:10px; background:transparent; border:2px solid var(--accent); color:var(--text-main); font-weight:bold;">NUOVO CLIENTE</button>
                <button id="ncCorreggi" style="width:100%; padding:14px; border-radius:10px; background:var(--accent); border:none; color:#fff; font-weight:bold;">CORREGGI NOME</button>
            </div>
            <span id="ncAnnulla" style="display:inline-block; margin-top:20px; font-size:11px; text-decoration:underline; color:var(--text-muted); cursor:pointer;">Annulla</span>
        </div>`; 
        document.body.appendChild(modal); 
    } 
    document.getElementById('ncOld').innerText = oldName; 
    document.getElementById('ncNew').innerText = newName; 
    modal.style.display = 'flex'; 
    document.getElementById('ncAnnulla').onclick = function(){ modal.style.display = 'none'; }; 
    document.getElementById('ncCreaNuovo').onclick = function(){ modal.style.display = 'none'; onCreaNuovo(); };
    document.getElementById('ncCorreggi').onclick = function(){ modal.style.display = 'none'; onCorreggi(); };
}

function m_goToCustomerDocsFromForm() {
    var elCog = document.getElementById("fCog"); if(!elCog) return;
    var nome = elCog.value.trim();
    if(!nome) { if(typeof showToast === 'function') showToast("Nessun cliente inserito."); return; }
    
    var cust = globalCustomersList.find(function(c){ return c.nome && String(c.nome).toLowerCase() === String(nome).toLowerCase(); });
    if(cust) {
        m_closeForm(null, true);
        window.currentOpenedCustomerId = cust.id;
        
        var elNome = document.getElementById('cp_nome'); if(elNome) elNome.innerText = cust.nome || 'Cliente';
        var elTel = document.getElementById('cp_tel'); if(elTel) elTel.innerText = cust.tel || '-';
        var elDob = document.getElementById('cp_dob'); if(elDob) elDob.innerText = cust.dataNascita ? String(cust.dataNascita).split('-').reverse().join('/') : '-';
        var noteEl = document.getElementById('cp_note'); if(noteEl) noteEl.value = cust.note || '';

        var hBody = document.getElementById('cp_history');
        if(hBody && typeof db !== 'undefined' && db.app) {
            var history = []; var totalSpent = 0;
            Object.keys(db.app).forEach(function(date){
                var dayApps = normalizeFbArray(db.app[date]);
                dayApps.forEach(function(a){
                    if((a.cog || '').toLowerCase() === (cust.nome || '').toLowerCase()) {
                        var price = parseFloat(a.price || a.prezzo || 0);
                        if(a.pagato) totalSpent += price;
                        history.push({ date: date, serv: a.serv||'-', op: a.op||'-', price: price, cam: a.cam||'-' });
                    }
                });
            });
            var elSpent = document.getElementById('cp_spent'); if(elSpent) elSpent.innerText = totalSpent.toFixed(2).replace('.', ',') + ' €';
            history.sort(function(a,b){ return new Date(b.date) - new Date(a.date); });
            var historyHTML = history.map(function(h){ return `<tr><td>${new Date(h.date).toLocaleDateString('it-IT')}</td><td>Cam ${h.cam}</td><td>${h.serv}<br><small style="color:var(--text-muted)">${h.op}</small></td><td style="text-align:right">€${h.price}</td></tr>`; }).join('');
            if(history.length === 0) historyHTML = "<tr><td colspan='4' style='text-align:center; padding:20px; color:var(--text-muted)'>Nessun trattamento.</td></tr>";
            hBody.innerHTML = historyHTML;
        }

        var docsTable = document.getElementById('cp_docs_table');
        if(docsTable) {
            var docsHTML = "";
            if(cust.docs && Object.keys(cust.docs).length > 0) {
                Object.entries(cust.docs).forEach(function(arr){
                    var doc = arr[1];
                    docsHTML += `<tr><td>${(doc.dataInserimento||'-').split(',')[0]}</td><td><b>${doc.nomeDoc}</b></td><td style="text-align:right"><a href="${doc.link}" target="_blank" class="btn-save btn-outline" style="background:rgba(16,185,129,0.1); color:var(--green); border-color:var(--green); padding:8px; display:inline-block;"><i class="material-icons-round">picture_as_pdf</i></a></td></tr>`;
                });
            } else { docsHTML = "<tr><td colspan='3' style='text-align:center; padding:20px; color:var(--text-muted)'>Nessun file associato.</td></tr>"; }
            docsTable.innerHTML = docsHTML;
        }

        var modal = document.getElementById('customerProfileModal');
        if(modal) { modal.style.display = 'flex'; if(typeof m_openProfileTab === 'function') m_openProfileTab('history'); }
    } else {
        if(typeof showToast === 'function') showToast("Cliente non trovato.");
    }
}

function m_updatePrivacyUI(hasLinkToday, hasDocs) {
    var ind = document.getElementById("privacyIndicator"); var inp = document.getElementById("fPrivacy");
    if(ind && inp) {
        inp.value = hasLinkToday ? "true" : "false";
        ind.style.background = hasLinkToday ? "var(--green)" : "var(--red)";
        ind.style.boxShadow = hasLinkToday ? "0 0 8px var(--green)" : "0 0 8px var(--red)";
        ind.onclick = function(e) { if (hasLinkToday) m_openPrivacyPDF(); else m_openPrivacySignature(e); };
    }
}
function m_openPrivacyPDF() {
    var id = document.getElementById("fId").value; var date = document.getElementById("fDate").value;
    var app = normalizeFbArray(db.app && db.app[date] ? db.app[date] : []).find(function(x){ return String(x.id) === String(id);});
    if(app && app.privacyLink) window.open(app.privacyLink, '_blank');
}
function m_openPrivacySignature(e) {
    if(e) e.preventDefault();
    var nome = document.getElementById("fCog").value.trim();
    if(!nome) { if(typeof showToast==='function') showToast("Inserisci il Nome!"); return;}
    var appId = document.getElementById("fId").value;
    if(!appId) { if(typeof showToast==='function') showToast("SALVA l'appuntamento prima!"); return;}
    window.open(`Mobile_Firma.html?cliente=${encodeURIComponent(nome)}&appId=${appId}&date=${document.getElementById("fDate").value}`, '_blank');
}
function m_handleCustomerSearch(val) {
    var sug = document.getElementById("customerSuggestions");
    if(!val || String(val).length < 3) { sug.style.display = 'none'; return; }
    var matches = globalCustomersList.filter(function(c){ return c.nome && String(c.nome).toLowerCase().includes(String(val).toLowerCase());});
    if(matches.length > 0) {
        sug.innerHTML = matches.map(function(c){ return `<div style="padding:12px; border-bottom:1px solid var(--border-line); cursor:pointer;" onclick="m_selectCustomer('${(c.nome||'').replace(/'/g,"\\\\'")}', '${c.tel||''}', '${(c.patologie||'').replace(/'/g,"\\\\'")}', ${c.privacy||false}, ${c.docs && Object.keys(c.docs).length > 0}, '${c.cam||''}')"><b>${c.nome}</b> <span style="font-size:10px; float:right;">${c.tel||''}</span></div>`;}).join('');
        sug.style.display = 'block';
    } else sug.style.display = 'none';
}
function m_selectCustomer(nome, tel, pat, priv, hasDocs, cam) {
    document.getElementById("fCog").value = nome || ""; document.getElementById("fTel").value = tel || "";
    document.getElementById("fPatologie").value = pat || ""; document.getElementById("fCam").value = cam || "";
    m_updatePrivacyUI(false, hasDocs); document.getElementById("customerSuggestions").style.display = 'none';
}
function m_renderServiceBox() {
    var area = document.getElementById("fServiceArea"); var nEl = document.getElementById("fServ");
    if(!area || !nEl) return;
    var n = nEl.value;
    if(n) area.innerHTML = `<div style="background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); border-radius:10px; padding:15px; display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;"><div style="display:flex; flex-direction:column;"><b style="color:var(--green)">${n}</b><span style="font-size:11px; color:var(--text-muted);">${document.getElementById('fDur').value} min | ${document.getElementById('fPrice').value} €</span></div><div style="background:rgba(239,68,68,0.2); color:var(--red); border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; cursor:pointer;" onclick="event.stopPropagation(); document.getElementById('fServ').value=''; m_renderServiceBox()"><i class="material-icons-round" style="font-size:16px;">close</i></div></div>`;
    else area.innerHTML = `<button class="btn-save btn-outline" style="border:1px dashed var(--border-line) !important; color:var(--text-main) !important;" onclick="if(typeof m_openSrvModal === 'function') m_openSrvModal(event)"><i class="material-icons-round" style="color:var(--accent);">add_circle</i> SCEGLI SERVIZIO</button>`;
}
function m_openSrvModal(e) { if(e) e.stopPropagation(); document.getElementById('srvSearchInput').value = ""; if(typeof m_filterSrv === 'function') m_filterSrv(); document.getElementById('srvModal').style.display='flex'; }
function m_closeSrvModal(e) { if(e) e.stopPropagation(); document.getElementById('srvModal').style.display='none'; }
function m_filterSrv() { var query = document.getElementById('srvSearchInput').value.toLowerCase(); var l = document.getElementById("srvListUI"); l.innerHTML = ""; (db.servizi || []).forEach(function(s){ if(s && s.nome && (s.nome.toLowerCase().includes(query) || query === "")) { l.innerHTML += `<div style="background:var(--bg-body); border:1px solid var(--border-line); border-radius:8px; padding:12px; display:flex; align-items:center; gap:10px; color:var(--text-main);" onclick="document.getElementById('fServ').value='${s.nome.replace(/'/g,"\\'")}'; document.getElementById('fDur').value='${s.durata||30}'; document.getElementById('fPrice').value='${s.prezzo||0}'; m_renderServiceBox(); m_closeSrvModal(event);"><b>${s.nome}</b> <span style="margin-left:auto; color:var(--accent); font-size:11px;">${s.durata}m - ${s.prezzo}€</span></div>`; } }); if(l.innerHTML === "") l.innerHTML = "<div style='text-align:center; padding:20px; color:var(--text-muted);'>Nessun servizio.</div>"; }
function m_showElegantPrompt(title, msg, onConfirm) { var modal = document.getElementById('elegantPromptModal'); if(!modal) { modal = document.createElement('div'); modal.id = 'elegantPromptModal'; modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:9999; display:none; align-items:center; justify-content:center; padding:20px; backdrop-filter: blur(4px);'; modal.innerHTML = `<div style="background:var(--bg-panel); border:1px solid var(--border-line); border-radius:16px; padding:25px; width:100%; max-width:350px; text-align:center; box-shadow: 0 10px 30px rgba(0,0,0,0.5);"><i class="material-icons-round" style="font-size:48px; color:var(--red); margin-bottom:10px;">delete_forever</i><h3 style="color:var(--text-main); margin-top:0; font-size:18px;" id="elegantPromptTitle">Titolo</h3><p style="font-size:13px; color:var(--text-muted); margin-bottom:15px;" id="elegantPromptMsg">Messaggio</p><input type="text" id="elegantPromptInput" style="width:100%; padding:14px; border-radius:10px; border:1px solid var(--border-line); background:var(--bg-body); color:var(--text-main); margin-bottom:25px; outline:none; font-size:14px;" placeholder="Scrivi qui..."><div style="display:flex; gap:10px;"><button id="elegantPromptCancel" style="flex:1; padding:14px; border-radius:10px; background:transparent; border:1px solid var(--border-line); color:var(--text-main); font-weight:bold; cursor:pointer;">ANNULLA</button><button id="elegantPromptOk" style="flex:1; padding:14px; border-radius:10px; background:var(--red); border:none; color:white; font-weight:bold; cursor:pointer;">CONFERMA</button></div></div>`; document.body.appendChild(modal); } document.getElementById('elegantPromptTitle').innerText = title; document.getElementById('elegantPromptMsg').innerText = msg; var input = document.getElementById('elegantPromptInput'); input.value = ''; modal.style.display = 'flex'; input.focus(); document.getElementById('elegantPromptCancel').onclick = function(){ modal.style.display = 'none';}; document.getElementById('elegantPromptOk').onclick = function(){ var val = input.value.trim(); if(val === '') { if(typeof showToast==='function') showToast("Campo obbligatorio."); return; } modal.style.display = 'none'; onConfirm(val); }; }