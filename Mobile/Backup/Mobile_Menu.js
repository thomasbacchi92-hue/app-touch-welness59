/* Mobile_Menu.js - Hub Impostazioni, CRM Mobile e Gestione Documenti (Delete + Refresh) */

function m_renderProfilo() {
    if(!uData) return;
    document.getElementById("prof_name").innerText = `${uData.name || ''} ${uData.surname || ''}`;
    document.getElementById("prof_nick").innerText = uData.nick || '';
}

function m_calcCommissions() {
    if(!uData) return;
    const period = document.getElementById("commMonth").value; 
    const comm = uData.commissions || {};
    const fisso = parseFloat(comm.fisso) || 0; const ivaPerc = parseFloat(comm.iva) || 0;
    const pMas = parseFloat(comm.op_massaggi) || 0; const pSpa = parseFloat(comm.op_spa) || 0;
    
    let tMas = 0, tSpa = 0;
    
    Object.keys(db.app || {}).forEach(dateStr => {
        if(dateStr.startsWith(period)) {
            let dayApps = normalizeFbArray(db.app[dateStr]);
            dayApps.forEach(a => {
                if(a.eseguito && a.pagato && (a.op === uData.nick || a.op === uData.name)) {
                    let lordo = parseFloat(a.price) || parseFloat(a.prezzo) || 0;
                    let netto = lordo / (1 + (ivaPerc / 100));
                    let sName = (a.serv || "").toLowerCase();
                    if(sName.includes('spa') || sName.includes('percors')) {
                        tSpa += netto * (pSpa/100); 
                    } else {
                        tMas += netto * (pMas/100);
                    }
                }
            });
        }
    });
    
    document.getElementById('valFisso').innerText = fisso.toFixed(2) + " €"; 
    document.getElementById('valMassaggi').innerText = tMas.toFixed(2) + " €";
    document.getElementById('valSpa').innerText = tSpa.toFixed(2) + " €"; 
    document.getElementById('valTotale').innerText = (fisso + tMas + tSpa).toFixed(2) + " €";
}

function m_toggleWA() { 
    firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + sId + '/settings').update({
        waEnabled: document.getElementById('waToggle').checked
    }); 
}

function m_setTheme(t) { 
    localStorage.setItem('tw_theme', t); 
    if(t === 'light') document.documentElement.classList.add('light-theme'); 
    else document.documentElement.classList.remove('light-theme'); 
    if(typeof showToast === 'function') showToast("Tema Aggiornato"); 
}

function m_logout() { 
    localStorage.removeItem("tw_token"); 
    window.location.href="../login.html"; 
}

// ==================== NAVIGAZIONE HUB IMPOSTAZIONI ====================
function m_navSettings(pageId) {
    document.querySelectorAll('.menu-page').forEach(p => p.classList.remove('active'));
    const targetPage = document.getElementById('menu-' + pageId);
    if(targetPage) targetPage.classList.add('active');

    const backBtn = document.getElementById("menuBackBtn");
    const title = document.getElementById("menuTitle");

    if(pageId === 'main') {
        backBtn.style.display = 'none';
        title.innerText = "IMPOSTAZIONI";
        m_renderProfilo();
    } else {
        backBtn.style.display = 'block';
        if(pageId === 'commissioni') { title.innerText = "COMMISSIONI E INCASSI"; m_calcCommissions(); }
        if(pageId === 'anagrafica') { title.innerText = "ANAGRAFICA CRM"; m_renderMobileCRM(); }
        if(pageId === 'generali') { title.innerText = "IMPOSTAZIONI GENERALI"; }
    }
}

// ==================== CRM ANAGRAFICA MOBILE (LISTA CARD) ====================
function m_renderMobileCRM() {
    const listUI = document.getElementById("mobileCrmList");
    const searchVal = document.getElementById("mobileCrmSearch").value.toLowerCase().trim();
    
    if(!globalCustomersList || globalCustomersList.length === 0) {
        listUI.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted);"><i class="material-icons-round" style="font-size:40px; margin-bottom:10px;">cloud_off</i><br>Nessun cliente in memoria...</div>`;
        return;
    }

    let filtered = globalCustomersList.filter(c => {
        if(!searchVal) return true;
        let n = (c.nome || "").toLowerCase();
        let t = (c.tel || "").toLowerCase();
        return n.includes(searchVal) || t.includes(searchVal);
    });

    filtered.sort((a,b) => (a.nome || "").localeCompare(b.nome || ""));

    if(filtered.length === 0) {
        listUI.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted);">Nessun risultato trovato.</div>`;
        return;
    }

    let h = "";
    filtered.slice(0, 50).forEach(c => {
        let isSigned = (c.privacy === true || c.privacy === 'true');
        let hasDocs = (c.docs && Object.keys(c.docs).length > 0);
        let privStatus = (isSigned || hasDocs) ? 'ok' : 'no';
        let privIcon = (isSigned || hasDocs) ? 'verified_user' : 'warning';
        let privText = (isSigned || hasDocs) ? 'Firmato' : 'Manca Firma';
        let custIdSafe = c.id ? c.id.replace(/'/g,"\\'") : "";

        h += `
        <div class="crm-card">
            <div class="crm-card-header">
                <div>
                    <div class="crm-card-name">${c.nome || 'N.D.'}</div>
                    <div style="font-size:12px; color:var(--text-muted);"><i class="material-icons-round" style="font-size:12px;">phone</i> ${c.tel || '-'}</div>
                </div>
                <div class="crm-privacy-badge crm-privacy-${privStatus}">
                    <i class="material-icons-round" style="font-size:12px;">${privIcon}</i> ${privText}
                </div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:11px; color:var(--text-muted);"><i class="material-icons-round" style="font-size:12px; vertical-align:middle;">cake</i> ${c.dob || '--/--/----'}</span>
                <button onclick="m_openCustomerProfileMobile('${custIdSafe}')" class="btn-save btn-outline" style="width:auto; margin:0; padding:6px 12px; font-size:11px; border-color:var(--accent); color:var(--accent);"><i class="material-icons-round" style="font-size:14px;">folder_shared</i> APRI SCHEDA</button>
            </div>
        </div>
        `;
    });
    
    if(filtered.length > 50) {
        h += `<div style="text-align:center; padding:15px; font-size:11px; color:var(--text-muted);">Mostrati i primi 50 risultati. Cerca per vedere gli altri.</div>`;
    }
    
    listUI.innerHTML = h;
}

// ==================== SCHEDA DETTAGLIO CLIENTE E GESTIONE DOCUMENTI ====================
function m_openCustomerProfileMobile(custId) {
    let cust = globalCustomersList.find(c => c.id === custId);
    if(!cust) {
        if(typeof showToast === 'function') showToast("Cliente non trovato");
        return;
    }

    window.currentOpenedCustomerId = custId;

    document.getElementById('cp_nome').innerText = cust.nome || 'N.D.';
    document.getElementById('cp_tel').innerText = cust.tel || '-';
    document.getElementById('cp_dob').innerText = cust.dob || '-';
    document.getElementById('cp_note').value = cust.note || '';

    // Storico
    let historyHTML = "";
    let totalSpent = 0;
    let appsList = [];

    if (db && db.app) {
        Object.keys(db.app).forEach(date => {
            let dayApps = normalizeFbArray(db.app[date]);
            dayApps.forEach(a => {
                let cName = (a.cog || "").trim().toLowerCase();
                let custName = (cust.nome || "").trim().toLowerCase();
                if (cName === custName && cName !== "") {
                    a._date = date;
                    appsList.push(a);
                    if(a.pagato) totalSpent += parseFloat(a.price || a.prezzo || 0);
                }
            });
        });
    }

    document.getElementById('cp_spent').innerText = totalSpent.toFixed(2) + " €";
    appsList.sort((a,b) => b._date.localeCompare(a._date));

    if(appsList.length === 0) {
        historyHTML = "<tr><td colspan='4' style='text-align:center; padding:15px; color:var(--text-muted)'>Nessuno storico trattamenti</td></tr>";
    } else {
        appsList.forEach(a => {
            let dObj = new Date(a._date);
            let dStr = !isNaN(dObj.getTime()) ? dObj.toLocaleDateString('it-IT', {day:'2-digit', month:'2-digit', year:'numeric'}) : a._date;
            let statusIcon = a.pagato ? "<i class='material-icons-round' style='color:var(--green); font-size:14px; vertical-align:middle;'>check_circle</i>" : "<i class='material-icons-round' style='color:var(--gold); font-size:14px; vertical-align:middle;'>schedule</i>";
            historyHTML += `
            <tr>
                <td><b>${dStr}</b><br><span style="font-size:10px; color:var(--text-muted)">${a.ora||''}</span></td>
                <td>${localStorage.getItem('tw_structure_id') || 'SPA'}</td>
                <td><b>${a.serv||'-'}</b><br><span style="font-size:10px; color:var(--text-muted)">Op: ${a.op||'-'}</span></td>
                <td style="text-align:right;"><b>${parseFloat(a.price||a.prezzo||0).toFixed(2)} €</b><br>${statusIcon}</td>
            </tr>`;
        });
    }
    document.getElementById('cp_history').innerHTML = historyHTML;

    // Popola e formatta i documenti
    m_renderCustomerDocs(cust);

    m_openProfileTab('history'); 
    document.getElementById('customerProfileModal').style.display = 'flex';
}

function m_renderCustomerDocs(cust) {
    let docsHTML = "";
    if(cust.docs && Object.keys(cust.docs).length > 0) {
        let dList = Object.entries(cust.docs).map(([key, value]) => ({ key, ...value }));
        
        // Ordina dal più recente
        dList.sort((a,b) => {
            let tA = a.timestamp ? parseInt(a.timestamp) : 0;
            let tB = b.timestamp ? parseInt(b.timestamp) : 0;
            return tB - tA;
        });

        dList.forEach(doc => {
            // FIX DATE INVALID
            let dStr = "N.D.";
            if (doc.timestamp) {
                let dObj = new Date(doc.timestamp);
                if (!isNaN(dObj.getTime())) {
                    dStr = dObj.toLocaleDateString('it-IT') + "<br><span style='font-size:9px; color:var(--text-muted)'>" + dObj.toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'}) + "</span>";
                }
            } else if (doc.date) {
                dStr = doc.date;
            }

            // FIX NOME DOCUMENTO
            let docName = doc.title || doc.name || doc.documentName || 'Documento SPA';

            let btnHTML = "";
            if (doc.link && doc.link !== "#") {
                btnHTML = `<a href="${doc.link}" target="_blank" class="btn-save" style="padding:6px 12px; margin:0; display:inline-flex; width:auto; font-size:11px; background:var(--green); color:white; text-decoration:none;"><i class="material-icons-round" style="font-size:14px;">picture_as_pdf</i></a>`;
            } else {
                btnHTML = `<span style="color:var(--gold); font-size:10px; font-weight:bold;">In elaborazione...</span>`;
            }

            docsHTML += `
            <tr>
                <td><span style="font-size:11px;">${dStr}</span></td>
                <td><b style="font-size:12px; color:var(--text-main);">${docName}</b></td>
                <td style="text-align:right; display:flex; gap:10px; justify-content:flex-end; align-items:center;">
                    ${btnHTML}
                    <i class="material-icons-round" style="color:var(--red); cursor:pointer; font-size:20px; opacity:0.8;" title="Elimina file bloccato" onclick="m_deleteCustomerDoc('${cust.id}', '${doc.key}')">delete_forever</i>
                </td>
            </tr>`;
        });
    } else {
        docsHTML = "<tr><td colspan='3' style='text-align:center; padding:15px; color:var(--text-muted)'>Nessun documento firmato</td></tr>";
    }
    
    // Tasto REFRESH Veloce
    docsHTML += `<tr><td colspan="3" style="text-align:center; padding:15px; border-bottom:none;"><button class="btn-save btn-outline" style="width:auto; padding:6px 15px; font-size:11px;" onclick="m_refreshCustomerData('${cust.id}')"><i class="material-icons-round" style="font-size:14px;">refresh</i> AGGIORNA LISTA</button></td></tr>`;
    
    document.getElementById('cp_docs_table').innerHTML = docsHTML;
}

function m_refreshCustomerData(custId) {
    if(typeof showToast === 'function') showToast("Controllo Documenti in corso...");
    firebase.database().ref('MASTER_ADMIN_DB/global_customers/' + custId).once('value').then(snap => {
        let updatedCust = { id: custId, ...snap.val() };
        m_renderCustomerDocs(updatedCust);
    });
}

function m_deleteCustomerDoc(custId, docKey) {
    if(!confirm("Vuoi eliminare definitivamente questo file?")) return;
    firebase.database().ref(`MASTER_ADMIN_DB/global_customers/${custId}/docs/${docKey}`).remove().then(() => {
        if(typeof showToast === 'function') showToast("Documento rimosso");
        m_refreshCustomerData(custId);
    }).catch(e => {
        if(typeof showToast === 'function') showToast("Errore di connessione.");
    });
}

function m_openProfileTab(tab, e) {
    if(e) e.preventDefault();
    document.querySelectorAll('#customerProfileModal .tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('#customerProfileModal .tab-content').forEach(c => c.classList.remove('active'));
    
    if(tab === 'history') {
        document.querySelectorAll('#customerProfileModal .tab-btn')[0].classList.add('active');
        document.getElementById('tab-history').classList.add('active');
    } else {
        document.querySelectorAll('#customerProfileModal .tab-btn')[1].classList.add('active');
        document.getElementById('tab-docs').classList.add('active');
    }
}

function m_saveCustomerNote() {
    if(!window.currentOpenedCustomerId) return;
    const note = document.getElementById('cp_note').value;
    firebase.database().ref('MASTER_ADMIN_DB/global_customers/' + window.currentOpenedCustomerId).update({
        note: note
    }).then(() => {
        if(typeof showToast === 'function') showToast("Note salvate!");
    });
}