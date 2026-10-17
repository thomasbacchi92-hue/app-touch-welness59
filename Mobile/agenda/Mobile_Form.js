/* agenda/Mobile_Form.js - Form Sicuro con Logica Massaggio Coppia (Gemelli) e Conversioni Universali */

document.addEventListener('DOMContentLoaded', function() {
    var dragZone = document.getElementById('formHeaderDragZone');
    var formSheet = document.getElementById('appFormSheet');
    if(!dragZone || !formSheet) return;

    var startY = 0;
    var currentY = 0;
    var isDragging = false;
    var touchStartTime = 0;

    dragZone.addEventListener('touchstart', function(e) {
        startY = e.touches[0].clientY;
        isDragging = true;
        touchStartTime = Date.now();
        formSheet.style.transition = 'none'; 
    }, {passive: true});

    dragZone.addEventListener('touchmove', function(e) {
        if(!isDragging) return;
        currentY = e.touches[0].clientY;
        var diff = currentY - startY;
        if(diff > 0) { 
            e.preventDefault(); 
            formSheet.style.transform = 'translateY(' + diff + 'px)';
        }
    }, {passive: false});

    dragZone.addEventListener('touchend', function(e) {
        if(!isDragging) return;
        isDragging = false;
        formSheet.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        
        var diff = currentY - startY;
        var timeDiff = Date.now() - touchStartTime;
        var velocity = diff / timeDiff; 

        if(diff > 150 || (diff > 30 && velocity > 0.5)) { 
            formSheet.style.transform = 'translateY(100%)';
            setTimeout(function() {
                formSheet.style.transform = ''; 
                if(typeof m_closeForm === 'function') m_closeForm(null, true);
            }, 300);
        } else {
            formSheet.style.transform = 'translateY(0)';
            setTimeout(function(){ formSheet.style.transform = ''; }, 300);
        }
    });
});

window.m_applyAgendaUI = function() {
    var uiSettings = (window.db && window.db.settings && window.db.settings.agenda_ui) ? window.db.settings.agenda_ui : {};
    var formSheet = document.getElementById('appFormSheet');
    if(!formSheet) return;
    
    var toggleElements = formSheet.querySelectorAll('[data-toggle]');
    toggleElements.forEach(function(el) {
        var key = el.getAttribute('data-toggle');
        var isVisible = uiSettings[key] !== false; 
        if (isVisible) el.style.display = ''; 
        else el.style.display = 'none'; 
    });
};

window.m_calculateMobilePrice = function() {
    var bp = parseFloat(document.getElementById("fBasePrice").value) || 0;
    var dt = document.getElementById("fDiscountType").value;
    var dv = parseFloat(document.getElementById("fDiscountValue").value) || 0;
    var finalPrice = bp;

    if (dt === "per") {
        finalPrice = bp - (bp * dv / 100);
    } else if (dt === "eur") {
        finalPrice = bp - dv;
    }
    
    if (finalPrice < 0) finalPrice = 0;
    var fPriceEl = document.getElementById("fPrice");
    if (fPriceEl) fPriceEl.value = finalPrice.toFixed(2);
};

// Funzione helper per aggiornare fCab2 escludendo la cabina selezionata
window.m_updateCab2Options = function() {
    var cabSel = document.getElementById("fCab");
    var cab2Sel = document.getElementById("fCab2");
    if(!cabSel || !cab2Sel) return;
    
    var selectedCab = cabSel.value;
    var excludeCab = selectedCab && selectedCab !== "auto" && selectedCab !== "" ? parseInt(selectedCab) : null;
    
    // Ottieni configurazione cabine
    var cabineConfig = [];
    if(window.db && window.db.settings && window.db.settings.cabine_config) {
        cabineConfig = Array.isArray(window.db.settings.cabine_config) ? window.db.settings.cabine_config : Object.values(window.db.settings.cabine_config);
    } else if(window.db && window.db.settings && window.db.settings.cabine) {
        var num = parseInt(window.db.settings.cabine) || 2;
        for(var i=0; i<num; i++) cabineConfig.push({ attiva: true, nome: "Cabina " + (i+1) });
    } else {
        cabineConfig = [{ attiva: true, nome: "Cabina 1" }, { attiva: true, nome: "Cabina 2" }];
    }
    
    var currentCab2 = cab2Sel.value;
    cab2Sel.innerHTML = '<option value="">-- Selez. Cabina 2 --</option><option value="auto">🌟 CASUALE / QUALSIASI</option>';
    cabineConfig.forEach(function(cab, idx) {
        if(cab.attiva !== false && cab.attiva !== "false") {
            var cabNum = idx + 1;
            if(excludeCab && cabNum === excludeCab) return;
            cab2Sel.innerHTML += '<option value="' + cabNum + '">' + (cab.nome || ("Cabina " + cabNum)) + '</option>';
        }
    });
    if(currentCab2) cab2Sel.value = currentCab2;
};

// FIX CONVERSIONE DB MOBILE: Trasforma sempre l'oggetto in lista per non andare in crash
window.m_watchServiceChange = function() {
    var srvName = document.getElementById('fServ').value;
    var coupleFields = document.getElementById('coupleFields');
    var isCoupleInput = document.getElementById('fIsCouple');
    
    if(!coupleFields || !isCoupleInput) return;
    
    if(window.db && window.db.servizi) {
        var srvList = Array.isArray(window.db.servizi) ? window.db.servizi : Object.values(window.db.servizi);
        var cleanSrvName = srvName.replace(/&apos;/g, "'");
        var srvData = srvList.find(function(s) { return s && s.nome === cleanSrvName; });
        
        if(srvData && (srvData.isCouple === true || srvData.isCouple === "true")) {
            coupleFields.style.display = 'block';
            isCoupleInput.value = "true";
            
            // Aggiorna fCab2 per escludere la cabina selezionata in fCab (con delay più lungo per assicurarsi che il DOM sia aggiornato)
            setTimeout(function() {
                window.m_updateCab2Options();
            }, 100);
        } else {
            coupleFields.style.display = 'none';
            isCoupleInput.value = "false";
        }
    }
};

function m_openForm(e, id, cab, ora) {
    id = id || ''; cab = cab || 1; ora = ora || "10:00";
    
    if(typeof window.isPanoramica !== 'undefined' && window.isPanoramica) return; 

    try {
        if(e) e.stopPropagation(); 
        
        m_applyAgendaUI();
        
        var formSheet = document.getElementById("appFormSheet");
        if(formSheet) formSheet.classList.add("active");
        
        var isEdit = (id !== '');
        
        var editBox = document.getElementById("editActionButtons");
        if (editBox) editBox.style.display = isEdit ? "flex" : "none";
        
        var custSugg = document.getElementById("customerSuggestions");
        if(custSugg) custSugg.style.display = 'none';
        
        var targetApp = null; var tDate = null;
        if(id) {
            Object.keys(window.db.app || {}).forEach(function(d){ 
                var arr = normalizeFbArray(window.db.app[d]); 
                var found = arr.find(function(x){ return String(x.id) === String(id); }); 
                if(found) { targetApp = found; tDate = d; } 
            });
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
            
            var fFattura = document.getElementById("fFattura"); if(fFattura) fFattura.value = targetApp.fattura || "";
            var fCodCliente = document.getElementById("fCodCliente"); if(fCodCliente) fCodCliente.value = targetApp.codCliente || "";

            var fDataNascita = document.getElementById("fDataNascita"); if(fDataNascita) fDataNascita.value = targetApp.dataNascita || "";
            var fBasePrice = document.getElementById("fBasePrice"); if(fBasePrice) fBasePrice.value = targetApp.basePrice || targetApp.price || 0;
            var fDiscountType = document.getElementById("fDiscountType"); if(fDiscountType) fDiscountType.value = targetApp.discountType || "";
            var fDiscountValue = document.getElementById("fDiscountValue"); if(fDiscountValue) fDiscountValue.value = targetApp.discountValue || 0;
            
            var fIsCouple = document.getElementById("fIsCouple");
            if(fIsCouple) fIsCouple.value = targetApp.isCouple ? "true" : "false";
            
            var coupleFields = document.getElementById("coupleFields");
            if (targetApp.isCouple) {
                if(coupleFields) coupleFields.style.display = 'block';
                if(targetApp.linkedId) {
                    var twin = normalizeFbArray(window.db.app[tDate]).find(x => x.id === targetApp.linkedId);
                    if(twin) {
                        var fCab2 = document.getElementById("fCab2"); if(fCab2) fCab2.value = twin.cab;
                        var fOp2 = document.getElementById("fOp2"); if(fOp2) fOp2.value = twin.op;
                    }
                }
            } else {
                if(coupleFields) coupleFields.style.display = 'none';
            }
            
            var hasDocs = false; 
            var c = (window.globalCustomersList) ? window.globalCustomersList.find(function(x){ return x.nome && String(x.nome).toLowerCase() === String(targetApp.cog||'').toLowerCase();}) : null;
            if(c && c.docs && Object.keys(c.docs).length > 0) hasDocs = true;
            var hasLinkToday = !!(targetApp.privacyLink && String(targetApp.privacyLink).startsWith("http"));
            if(typeof m_updatePrivacyUI === 'function') m_updatePrivacyUI(hasLinkToday, hasDocs);
            
        } else {
            var elTitle = document.getElementById("formTitle"); if(elTitle) elTitle.innerText = "Nuovo Appuntamento";
            
            var fId = document.getElementById("fId"); if(fId) { fId.value = ""; fId.dataset.originalName = ""; }
            var mDateEl = document.getElementById("mainDate"); var cd = mDateEl ? mDateEl.value : new Date().toISOString().split('T')[0];
            var fDate = document.getElementById("fDate"); if(fDate) fDate.value = cd;
            var fOldDate = document.getElementById("fOldDate"); if(fOldDate) fOldDate.value = cd;
            var fOra = document.getElementById("fOra"); if(fOra) fOra.value = ora;
            var fCab = document.getElementById("fCab"); if(fCab) fCab.value = cab;
            var fPrice = document.getElementById("fPrice"); if(fPrice) fPrice.value = "0";
            
            ['fCam','fTel','fCog','fNote','fServ','fPatologie','fDataNascita','fDiscountType', 'fFattura', 'fCodCliente'].forEach(function(x){ var el = document.getElementById(x); if(el) el.value=""; });
            ['fBasePrice','fDiscountValue'].forEach(function(x){ var el = document.getElementById(x); if(el) el.value="0"; });
            
            var fDur = document.getElementById("fDur"); if(fDur) fDur.value = "30";
            var fEseguito = document.getElementById("fEseguito"); if(fEseguito) fEseguito.checked = false;
            
            var cFields = document.getElementById('coupleFields'); if(cFields) cFields.style.display = 'none';
            var isc = document.getElementById('fIsCouple'); if(isc) isc.value = "false";
            var fC2 = document.getElementById('fCab2'); if(fC2) fC2.value = "";
            var fO2 = document.getElementById('fOp2'); if(fO2) fO2.value = "";

            if(typeof m_updatePrivacyUI === 'function') m_updatePrivacyUI(false, false);
        }
        
        window.m_refreshOperators();
        if(typeof m_renderServiceBox === 'function') m_renderServiceBox(); 
        
    } catch(err) { console.error("Errore script form:", err); }
}

window.m_refreshOperators = function() {
    var sel = document.getElementById("fOp"); 
    var sel2 = document.getElementById("fOp2"); 
    var cabSel = document.getElementById("fCab");
    var cab2Sel = document.getElementById("fCab2");
    
    if(!sel) return;
    
    var currentVal = sel.value; 
    var currentVal2 = sel2 ? sel2.value : "";
    var currentCab = cabSel ? cabSel.value : null;
    var currentCab2 = cab2Sel ? cab2Sel.value : null;

    sel.innerHTML = '<option value="">-- Indifferente --</option>';
    if(sel2) sel2.innerHTML = '<option value="">-- Selez. Operatore 2 --</option>';
    
    var cabineConfig = [];
    if(window.db && window.db.settings && window.db.settings.cabine_config) {
        cabineConfig = Array.isArray(window.db.settings.cabine_config) ? window.db.settings.cabine_config : Object.values(window.db.settings.cabine_config);
    } else if(window.db && window.db.settings && window.db.settings.cabine) {
        var num = parseInt(window.db.settings.cabine) || 2;
        for(var i=0; i<num; i++) cabineConfig.push({ attiva: true, nome: "Cabina " + (i+1) });
    } else {
        cabineConfig = [{ attiva: true, nome: "Cabina 1" }, { attiva: true, nome: "Cabina 2" }];
    }

    if(cabSel) {
        var excludeCab = currentCab && currentCab !== "auto" ? parseInt(currentCab) : null;
        cabSel.innerHTML = '<option value="auto">🌟 CASUALE / QUALSIASI</option>';
        cabineConfig.forEach(function(cab, idx) {
            if(cab.attiva !== false && cab.attiva !== "false") {
                var cabNum = idx + 1;
                if(excludeCab && cabNum === excludeCab) return;
                cabSel.innerHTML += '<option value="' + cabNum + '">' + (cab.nome || ("Cabina " + cabNum)) + '</option>';
            }
        });
        if(currentCab) cabSel.value = currentCab;
        else cabSel.value = "auto";
        
        // Aggiungi listener per aggiornare fCab2 quando cambia fCab
        // Usa addEventListener invece di onchange per evitare sovrascritture
        if(cabSel && !cabSel.hasAttribute('data-cab-listener')) {
            cabSel.addEventListener('change', function() {
                window.m_updateCab2Options();
            });
            cabSel.setAttribute('data-cab-listener', 'true');
        }
    }

    if(cab2Sel) {
        var excludeCab = currentCab && currentCab !== "auto" ? parseInt(currentCab) : null;
        cab2Sel.innerHTML = '<option value="">-- Selez. Cabina 2 --</option><option value="auto">🌟 CASUALE / QUALSIASI</option>';
        cabineConfig.forEach(function(cab, idx) {
            if(cab.attiva !== false && cab.attiva !== "false") {
                var cabNum = idx + 1;
                if(excludeCab && cabNum === excludeCab) return;
                cab2Sel.innerHTML += '<option value="' + cabNum + '">' + (cab.nome || ("Cabina " + cabNum)) + '</option>';
            }
        });
        if(currentCab2) cab2Sel.value = currentCab2;
    }

    sel.onchange = function(ev) { if(typeof m_checkOperatorConflict === 'function') m_checkOperatorConflict(ev.target); };

    if(typeof firebase !== 'undefined' && firebase.database) {
        firebase.database().ref('MASTER_ADMIN_DB/users').once('value').then(function(snap){
            var allUsers = snap.val() || {};
            var validOperators = Object.values(allUsers).filter(function(u){ 
                var isGhost = (u.attivo === false || u.attiva === false || u.eliminato === true || u.deleted === true || u.attivo === "false" || u.attiva === "false" || u.eliminato === "true" || u.deleted === "true");
                return String(u.structureId) === String(window.sId) && !isGhost;
            });
            
            var formDateEl = document.getElementById("fDate"); var formDate = formDateEl ? formDateEl.value : "";
            var fOraEl = document.getElementById("fOra"); var startMin = fOraEl ? tToM(fOraEl.value) : 0;
            var fDurEl = document.getElementById("fDur"); var endMin = startMin + parseInt(fDurEl ? fDurEl.value : 30);
            
            var dayApps = normalizeFbArray(window.db.app && window.db.app[formDate] ? window.db.app[formDate] : []);
            var currentId = document.getElementById("fId") ? document.getElementById("fId").value : "";

            validOperators.forEach(function(u){ 
                var opName = u.nick || u.name || "Sconosciuto";
                var isBusy = dayApps.some(function(a){
                    if(currentId && String(a.id) === String(currentId)) return false; 
                    if(currentId && String(a.linkedId) === String(currentId)) return false; 
                    if(String(a.op).toLowerCase().trim() !== String(opName).toLowerCase().trim()) return false;
                    var aStart = tToM(a.ora); var aEnd = aStart + (parseInt(a.dur) || 30) + 10; 
                    return (startMin < aEnd && endMin > aStart);
                });

                var label = isBusy ? `🔴 ${opName}` : `🟢 ${opName}`;
                var opt = new Option(label, opName);
                opt.dataset.busy = isBusy;
                sel.appendChild(opt);
                
                if(sel2) {
                    var opt2 = new Option(label, opName);
                    opt2.dataset.busy = isBusy;
                    sel2.appendChild(opt2);
                }
            });
            
            if(currentVal) sel.value = currentVal;
            if(currentVal2 && sel2) sel2.value = currentVal2;
        }).catch(function(e) { console.warn("Fetch operatori fallito:", e); });
    }
};

function m_checkOperatorConflict(selectEl) {
    var selectedOption = selectEl.options[selectEl.selectedIndex];
    if (selectedOption && selectedOption.dataset.busy === "true") {
        var opName = selectedOption.value;
        var formDate = document.getElementById("fDate").value;
        var startMin = tToM(document.getElementById("fOra").value);
        var endMin = startMin + parseInt(document.getElementById("fDur").value || 30);
        
        var dayApps = normalizeFbArray(window.db.app && window.db.app[formDate] ? window.db.app[formDate] : []);
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
                
                modal.onclick = function(ev) {
                    ev.stopPropagation(); 
                    if(ev.target === modal) {
                        document.getElementById('fOp').value = '';
                        modal.style.display = 'none';
                    }
                };
                document.body.appendChild(modal);
            }
            modal.innerHTML = `
                <div class="modal-box" style="background:var(--bg-panel); border:1px solid var(--border-line); border-radius:16px; padding:25px; width:100%; max-width:350px; text-align:center; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
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
    var apps = normalizeFbArray(window.db.app && window.db.app[date] ? window.db.app[date] : []);
    var idx = apps.findIndex(function(x){ return String(x.id) === String(conflictId); });
    if(idx > -1) {
        apps[idx].op = ""; 
        firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + window.sId + '/app').child(date).set(apps).then(function(){
            document.getElementById('opConflictModal').style.display = 'none';
            if(typeof showToast === 'function') showToast("Operatore spostato!");
            m_openForm(null, document.getElementById("fId").value, document.getElementById("fCab").value, document.getElementById("fOra").value);
        });
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
        if (id && oldDate && window.db.app[oldDate]) {
            var oldApp = normalizeFbArray(window.db.app[oldDate]).find(function(x){ return String(x.id) === String(id);});
            if (oldApp && oldApp.privacyLink) existingLink = oldApp.privacyLink;
        }

        var privEl = document.getElementById("fPrivacy");
        var privacyChecked = existingLink !== "" ? true : (privEl ? (privEl.value === 'true') : false);
        
        var dataNascita = document.getElementById("fDataNascita").value || "";
        var basePrice = parseFloat(document.getElementById("fBasePrice").value) || 0;
        var discountType = document.getElementById("fDiscountType").value || "";
        var discountValue = parseFloat(document.getElementById("fDiscountValue").value) || 0;
        
        var fatturaVal = document.getElementById("fFattura") ? document.getElementById("fFattura").value.trim() : "";
        var codClienteVal = document.getElementById("fCodCliente") ? document.getElementById("fCodCliente").value.trim() : "";

        m_calculateMobilePrice();
        var finalPrice = parseFloat(document.getElementById("fPrice").value) || 0;

        if(currentName && typeof window.globalCustomersList !== 'undefined') {
            if (createNewCustomer) {
                var newId = "CUST_" + Date.now();
                firebase.database().ref('MASTER_ADMIN_DB/global_customers/' + newId).set({
                    nome: currentName, tel: document.getElementById("fTel").value, cam: document.getElementById("fCam").value,
                    patologie: document.getElementById("fPatologie").value, privacy: privacyChecked, lastStruct: window.sId,
                    dataNascita: dataNascita, codCliente: codClienteVal
                });
            } else if (oldNameForCorrection) {
                var custToFix = window.globalCustomersList.find(function(c){ return c.nome && String(c.nome).toLowerCase() === String(oldNameForCorrection).toLowerCase();});
                if(custToFix) {
                    firebase.database().ref('MASTER_ADMIN_DB/global_customers/' + custToFix.id).update({
                        nome: currentName, tel: document.getElementById("fTel").value, cam: document.getElementById("fCam").value,
                        patologie: document.getElementById("fPatologie").value, privacy: privacyChecked, lastStruct: window.sId,
                        dataNascita: dataNascita, codCliente: codClienteVal
                    });
                }
            } else {
                var custToUpdate = window.globalCustomersList.find(function(c){ return c.nome && String(c.nome).toLowerCase() === String(currentName).toLowerCase();});
                var custId = custToUpdate ? custToUpdate.id : "CUST_" + Date.now();
                
                var updatePayload = {
                    nome: currentName, tel: document.getElementById("fTel").value, cam: document.getElementById("fCam").value,
                    patologie: document.getElementById("fPatologie").value, privacy: privacyChecked, lastStruct: window.sId,
                    dataNascita: dataNascita
                };
                if (codClienteVal) updatePayload.codCliente = codClienteVal;

                firebase.database().ref('MASTER_ADMIN_DB/global_customers/' + custId).update(updatePayload);
            }
        }

        var opValue = document.getElementById("fOp").value || "";
        var cleanOp = opValue.replace(/[🔴🟢]/g, '').replace(/\(Libero\)/g, '').replace(/\(Occupato\)/g, '').trim();

        var isCouple = document.getElementById("fIsCouple").value === "true";

        var startMin = tToM(document.getElementById("fOra").value || "10:00");
        var endMin = startMin + (parseInt(document.getElementById("fDur").value) || 30);
        var appsCheck = normalizeFbArray(window.db.app && window.db.app[date] ? window.db.app[date] : []);

        var cabineConfig = [];
        if(window.db && window.db.settings && window.db.settings.cabine_config) {
            cabineConfig = Array.isArray(window.db.settings.cabine_config) ? window.db.settings.cabine_config : Object.values(window.db.settings.cabine_config);
        } else if(window.db && window.db.settings && window.db.settings.cabine) {
            var num = parseInt(window.db.settings.cabine) || 2;
            for(var i=0; i<num; i++) cabineConfig.push({ attiva: true, nome: "Cabina " + (i+1), start: "10:00", end: "20:00" });
        } else {
            cabineConfig = [{ attiva: true, nome: "Cabina 1", start: "10:00", end: "20:00" }, { attiva: true, nome: "Cabina 2", start: "10:00", end: "20:00" }];
        }

        var findAvailableCabin = function(sMin, eMin, excludeCab) {
            for(var i=0; i<cabineConfig.length; i++) {
                if(cabineConfig[i].attiva === false || cabineConfig[i].attiva === "false") continue;
                var cNum = i + 1;
                if(cNum === excludeCab) continue;
                
                var hasCol = appsCheck.some(function(a){
                    if (String(a.id) === String(id) || String(a.linkedId) === String(id)) return false;
                    if (String(a.id) === "TWIN_"+String(id) || String(a.linkedId) === "TWIN_"+String(id)) return false;
                    if (parseInt(a.cab) !== cNum) return false;
                    var aStart = tToM(a.ora); var aEnd = aStart + (parseInt(a.dur) || 30) + 10;
                    return (sMin < aEnd && eMin > aStart);
                });
                if (!hasCol) return cNum;
            }
            return null;
        };

        var cab1Val = document.getElementById("fCab").value;
        var newCab1 = cab1Val === "auto" ? findAvailableCabin(startMin, endMin, null) : parseInt(cab1Val);
        if(!newCab1) { if(typeof showToast === 'function') showToast("Nessuna cabina disponibile!"); return; }

        var appA = {
            id: id,
            ora: document.getElementById("fOra").value || "10:00",
            cab: newCab1,
            cog: currentName || "N.D.",
            tel: document.getElementById("fTel").value || "",
            cam: document.getElementById("fCam").value || "",
            serv: document.getElementById("fServ").value || "",
            dur: parseInt(document.getElementById("fDur").value) || 30,
            price: finalPrice,
            basePrice: basePrice,
            discountType: discountType,
            discountValue: discountValue,
            dataNascita: dataNascita,
            op: cleanOp,
            note: document.getElementById("fNote").value || "",
            patologie: document.getElementById("fPatologie").value || "",
            privacy: privacyChecked,
            privacyLink: existingLink,
            eseguito: document.getElementById("fEseguito").checked || false,
            pagato: false,
            fromReception: false,
            reqId: "",
            fattura: fatturaVal,
            codCliente: codClienteVal,
            isCouple: isCouple,
            linkedId: isCouple ? "TWIN_" + id : null
        };

        if (window.sanitizePayload) appA = window.sanitizePayload(appA);

        var hasCollision = appsCheck.some(function(a){ 
            if(String(a.id) === String(id) || parseInt(a.cab) !== appA.cab) return false; 
            var aStart = tToM(a.ora); 
            var aEndWithClean = aStart + (parseInt(a.dur)||30) + 10; 
            return (startMin < aEndWithClean && endMin > aStart); 
        });

        if(hasCollision) { if(typeof showToast === 'function') showToast("Bloccato: Cabina 1 Occupata!"); return; }

        var finalAppsToAdd = [appA];

        if(isCouple) {
            var cab2Val = document.getElementById("fCab2").value;
            var cab2 = cab2Val === "auto" ? findAvailableCabin(startMin, endMin, newCab1) : parseInt(cab2Val);
            
            if(!cab2) { if(typeof showToast==='function') showToast("Nessuna Cabina 2 disponibile!"); return; }
            if(cab2 === appA.cab) { if(typeof showToast==='function') showToast("Le cabine devono essere diverse!"); return; }

            var op2Raw = document.getElementById("fOp2").value || "";
            var op2Clean = op2Raw.replace(/[🔴🟢]/g, '').replace(/\(Libero\)/g, '').replace(/\(Occupato\)/g, '').trim();

            var hasCollision2 = appsCheck.some(function(a){ 
                if(String(a.id) === ("TWIN_"+id) || parseInt(a.cab) !== cab2) return false; 
                var aStart = tToM(a.ora); 
                var aEndWithClean = aStart + (parseInt(a.dur)||30) + 10; 
                return (startMin < aEndWithClean && endMin > aStart); 
            });

            if(hasCollision2) { if(typeof showToast === 'function') showToast("Bloccato: Cabina 2 Occupata!"); return; }

            var appB = Object.assign({}, appA);
            appB.id = "TWIN_" + id;
            appB.linkedId = id;
            appB.cab = cab2;
            appB.op = op2Clean;
            appB.price = 0; 
            appB.basePrice = 0;
            appB.discountValue = 0;

            finalAppsToAdd.push(appB);
        }

        var dbRefLocal = firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + window.sId + '/app');
        
        if(id && oldDate && oldDate !== date) { 
            var oldApps = normalizeFbArray(window.db.app && window.db.app[oldDate] ? window.db.app[oldDate] : []); 
            dbRefLocal.child(oldDate).set(oldApps.filter(function(x){ return String(x.id) !== String(id) && String(x.id) !== ("TWIN_"+id);})); 
        }
        
        var targetApps = normalizeFbArray(window.db.app && window.db.app[date] ? window.db.app[date] : []);
        if(id && oldDate === date) { 
            targetApps = targetApps.filter(function(x) { return String(x.id) !== String(id) && String(x.id) !== ("TWIN_"+id); });
        }
        
        finalAppsToAdd.forEach(function(item) {
            var existing = (window.db.app && window.db.app[oldDate]) ? normalizeFbArray(window.db.app[oldDate]).find(x => x.id === item.id) : null;
            if(existing) {
                item.pagato = existing.pagato || false;
                item.fromReception = existing.fromReception || false;
                item.reqId = existing.reqId || "";
            }
            targetApps.push(item);
        });
        
        dbRefLocal.child(date).set(targetApps).then(function(){ 
            m_closeForm(null, true); if(typeof showToast === 'function') showToast("Salvato con successo!"); 
            if(typeof m_renderAll === 'function') m_renderAll(); 
        });

    } catch(e) { console.error(e); if(typeof showToast === 'function') showToast("Errore di Salvataggio"); }
}

function m_closeForm(e, force) { 
    if(force || (e && !e.target.closest('.bottom-sheet') && !e.target.closest('.modal-box'))) { 
        var formSheet = document.getElementById("appFormSheet");
        if(formSheet) formSheet.classList.remove("active"); 
        var custSugg = document.getElementById("customerSuggestions");
        if(custSugg) custSugg.style.display = 'none'; 
    } 
}

function m_delApp() { 
    // NOTA: Disabilitato il popup di conferma per la rimozione dell'appuntamento come richiesto.
    // if(!confirm("Vuoi eliminare definitivamente questo appuntamento?")) return;
    
    var d = document.getElementById("fOldDate").value; 
    var id = document.getElementById("fId").value; 
    var apps = normalizeFbArray(window.db.app && window.db.app[d] ? window.db.app[d] : []); 
    
    var appToDel = apps.find(function(x){ return String(x.id) === String(id); }); 
    var twinToDel = null;
    if(appToDel && appToDel.linkedId) twinToDel = apps.find(function(x){ return String(x.id) === String(appToDel.linkedId); });
    
    m_executeDeleteApp("Eliminato da Smartphone", appToDel, twinToDel, apps, d, id); 
}

function m_executeDeleteApp(motivo, appToDel, twinToDel, apps, d, id) { 
    apps = apps.filter(function(x){ return String(x.id) !== String(id) && String(x.id) !== (twinToDel ? String(twinToDel.id) : "");}); 
    
    var promises = [firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + window.sId + '/app').child(d).set(apps)]; 
    
    if(appToDel) { 
        appToDel.deleteReason = motivo; appToDel.date = d; appToDel.deletedAt = new Date().toLocaleString('it-IT'); appToDel.deletedBy = window.uNick || "Staff"; 
        promises.push(firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + window.sId + '/deleted_apps').push(appToDel)); 
    } 
    if(twinToDel) { 
        twinToDel.deleteReason = motivo; twinToDel.date = d; twinToDel.deletedAt = new Date().toLocaleString('it-IT'); twinToDel.deletedBy = window.uNick || "Staff"; 
        promises.push(firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + window.sId + '/deleted_apps').push(twinToDel)); 
    } 
    
    Promise.all(promises).then(function(){ m_closeForm(null, true); if(typeof showToast==='function') showToast("Eliminato."); if(typeof m_renderAll === 'function') m_renderAll(); }); 
}

function m_shareWA() { var t = document.getElementById("fTel").value; if(t) window.open(`https://wa.me/${t.replace(/\s+/g,'')}?text=Gentile%20Ospite,%20ti%20aspettiamo%20in%20SPA.`, '_blank'); }

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
    
    var cust = (window.globalCustomersList || []).find(function(c){ return c.nome && String(c.nome).toLowerCase() === String(nome).toLowerCase(); });
    if(cust) {
        m_closeForm(null, true);
        window.currentOpenedCustomerId = cust.id;
        
        var elNome = document.getElementById('cp_nome'); if(elNome) elNome.innerText = cust.nome || 'Cliente';
        var elTel = document.getElementById('cp_tel'); if(elTel) elTel.innerText = cust.tel || '-';
        var elDob = document.getElementById('cp_dob'); if(elDob) elDob.innerText = cust.dataNascita ? String(cust.dataNascita).split('-').reverse().join('/') : '-';
        var noteEl = document.getElementById('cp_note'); if(noteEl) noteEl.value = cust.note || '';

        var hBody = document.getElementById('cp_history');
        if(hBody && window.db && window.db.app) {
            var history = []; var totalSpent = 0;
            Object.keys(window.db.app).forEach(function(date){
                var dayApps = normalizeFbArray(window.db.app[date]);
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
    var app = normalizeFbArray(window.db.app && window.db.app[date] ? window.db.app[date] : []).find(function(x){ return String(x.id) === String(id);});
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
    var list = window.globalCustomersList || [];
    var matches = list.filter(function(c){ return c.nome && String(c.nome).toLowerCase().includes(String(val).toLowerCase());});
    if(matches.length > 0) {
        sug.innerHTML = matches.map(function(c){ 
            var safeName = (c.nome||'').replace(/'/g, "&apos;");
            var safeTel = (c.tel||'').replace(/'/g, "&apos;");
            var safePat = (c.patologie||'').replace(/'/g, "&apos;");
            var safeCam = (c.cam||'').replace(/'/g, "&apos;");
            var safeDob = (c.dataNascita||'');
            var safeCod = (c.codCliente||'').replace(/'/g, "&apos;");
            var hasDocs = (c.docs && Object.keys(c.docs).length > 0) ? 'true' : 'false';
            return `<div style="padding:12px; border-bottom:1px solid var(--border-line); cursor:pointer;" onclick="m_selectCustomer('${safeName}', '${safeTel}', '${safePat}', ${c.privacy||false}, ${hasDocs}, '${safeCam}', '${safeDob}', '${safeCod}')"><b>${c.nome}</b> <span style="font-size:10px; float:right;">${c.tel||''}</span></div>`;
        }).join('');
        sug.style.display = 'block';
    } else {
        sug.style.display = 'none';
    }
}

function m_selectCustomer(nome, tel, pat, priv, hasDocs, cam, dob, cod) {
    document.getElementById("fCog").value = nome || ""; document.getElementById("fTel").value = tel || "";
    document.getElementById("fPatologie").value = pat || ""; document.getElementById("fCam").value = cam || "";
    var dobEl = document.getElementById("fDataNascita"); if(dobEl) dobEl.value = dob || "";
    var codEl = document.getElementById("fCodCliente"); if(codEl) codEl.value = cod || "";
    m_updatePrivacyUI(false, hasDocs); document.getElementById("customerSuggestions").style.display = 'none';
}

function m_renderServiceBox() {
    var area = document.getElementById("fServiceArea"); var nEl = document.getElementById("fServ");
    if(!area || !nEl) return;
    var n = nEl.value;
    
    m_watchServiceChange();
    
    if(n) {
        area.innerHTML = `<div style="background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); border-radius:10px; padding:15px; display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;"><div style="display:flex; flex-direction:column;"><b style="color:var(--green)">${n}</b><span style="font-size:11px; color:var(--text-muted);">${document.getElementById('fDur').value} min | ${document.getElementById('fBasePrice').value} €</span></div><div style="background:rgba(239,68,68,0.2); color:var(--red); border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; cursor:pointer;" onclick="event.stopPropagation(); document.getElementById('fServ').value=''; m_renderServiceBox()"><i class="material-icons-round" style="font-size:16px;">close</i></div></div>`;
    } else {
        area.innerHTML = `<button type="button" class="btn-save btn-outline" style="border:1px dashed var(--border-line) !important; color:var(--text-main) !important; width:100%; display:flex; justify-content:center; align-items:center; gap:5px;" onclick="if(typeof m_openSrvModal === 'function') m_openSrvModal(event)"><i class="material-icons-round" style="color:var(--accent);">add_circle</i> SCEGLI SERVIZIO</button>`;
    }
}

function m_openSrvModal(e) { if(e) e.stopPropagation(); document.getElementById('srvSearchInput').value = ""; if(typeof m_filterSrv === 'function') m_filterSrv(); document.getElementById('srvModal').style.display='flex'; }
function m_closeSrvModal(e) { if(e) e.stopPropagation(); document.getElementById('srvModal').style.display='none'; }

// FIX CONVERSIONE DB MOBILE
function m_filterSrv() { 
    var query = document.getElementById('srvSearchInput').value.toLowerCase(); 
    var l = document.getElementById("srvListUI"); 
    l.innerHTML = ""; 
    
    var rawList = (window.db && window.db.servizi) ? window.db.servizi : [];
    var servList = Array.isArray(rawList) ? rawList : Object.values(rawList);

    servList.forEach(function(s){ 
        if(s && s.nome && (s.nome.toLowerCase().includes(query) || query === "")) { 
            var safeName = s.nome.replace(/'/g, "&apos;");
            var coupleBadge = s.isCouple ? '<span style="background:var(--purple); color:white; padding:2px 6px; border-radius:4px; font-size:9px; margin-left:5px;">COPPIA</span>' : '';
            l.innerHTML += `<div style="background:var(--bg-body); border:1px solid var(--border-line); border-radius:8px; padding:12px; display:flex; align-items:center; gap:10px; color:var(--text-main); cursor:pointer; margin-bottom:8px;" onclick="document.getElementById('fServ').value='${safeName}'; document.getElementById('fDur').value='${s.durata||30}'; document.getElementById('fBasePrice').value='${s.prezzo||0}'; if(typeof m_calculateMobilePrice==='function') m_calculateMobilePrice(); m_renderServiceBox(); m_closeSrvModal(event);"><b>${s.nome}</b> ${coupleBadge} <span style="margin-left:auto; color:var(--accent); font-size:11px;">${s.durata}m - ${s.prezzo}€</span></div>`; 
        } 
    }); 
    if(l.innerHTML === "") l.innerHTML = "<div style='text-align:center; padding:20px; color:var(--text-muted);'>Nessun servizio.</div>"; 
}

function m_showElegantPrompt(title, msg, onConfirm) { var modal = document.getElementById('elegantPromptModal'); if(!modal) { modal = document.createElement('div'); modal.id = 'elegantPromptModal'; modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:9999; display:none; align-items:center; justify-content:center; padding:20px; backdrop-filter: blur(4px);'; modal.innerHTML = `<div style="background:var(--bg-panel); border:1px solid var(--border-line); border-radius:16px; padding:25px; width:100%; max-width:350px; text-align:center; box-shadow: 0 10px 30px rgba(0,0,0,0.5);"><i class="material-icons-round" style="font-size:48px; color:var(--red); margin-bottom:10px;">delete_forever</i><h3 style="color:var(--text-main); margin-top:0; font-size:18px;" id="elegantPromptTitle">Titolo</h3><p style="font-size:13px; color:var(--text-muted); margin-bottom:15px;" id="elegantPromptMsg">Messaggio</p><input type="text" id="elegantPromptInput" style="width:100%; padding:14px; border-radius:10px; border:1px solid var(--border-line); background:var(--bg-body); color:var(--text-main); margin-bottom:25px; outline:none; font-size:14px;" placeholder="Scrivi qui..."><div style="display:flex; gap:10px;"><button id="elegantPromptCancel" style="flex:1; padding:14px; border-radius:10px; background:transparent; border:1px solid var(--border-line); color:var(--text-main); font-weight:bold; cursor:pointer;\">ANNULLA</button><button id="elegantPromptOk" style="flex:1; padding:14px; border-radius:10px; background:var(--red); border:none; color:white; font-weight:bold; cursor:pointer;\">CONFERMA</button></div></div>`; document.body.appendChild(modal); } document.getElementById('elegantPromptTitle').innerText = title; document.getElementById('elegantPromptMsg').innerText = msg; var input = document.getElementById('elegantPromptInput'); input.value = ''; modal.style.display = 'flex'; input.focus(); document.getElementById('elegantPromptCancel').onclick = function(){ modal.style.display = 'none';}; document.getElementById('elegantPromptOk').onclick = function(){ var val = input.value.trim(); if(val === '') { if(typeof showToast==='function') showToast("Campo obbligatorio."); return; } modal.style.display = 'none'; onConfirm(val); }; }