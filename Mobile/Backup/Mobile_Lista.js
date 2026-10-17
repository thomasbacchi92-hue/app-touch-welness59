/* Mobile_Lista.js - Fix Sfondo Override e Singola Leva */

let searchTimeout = null;
window.mCurrentPage = 1;
const itemsPerPage = 50;

document.addEventListener('DOMContentLoaded', () => {
    const d = new Date();
    const mSelect = document.getElementById('mFilterMonth');
    const ySelect = document.getElementById('mFilterYear');
    
    if(mSelect && ySelect) {
        const mesi = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
        
        mSelect.innerHTML = '<option value="">Tutti i mesi</option>';
        mesi.forEach((m, i) => mSelect.innerHTML += `<option value="${String(i+1).padStart(2,'0')}">${m}</option>`);
        
        ySelect.innerHTML = '<option value="">Tutti gli anni</option>';
        for(let i=-1; i<3; i++) ySelect.innerHTML += `<option value="${d.getFullYear()+i}">${d.getFullYear()+i}</option>`;
        
        mSelect.value = String(d.getMonth()+1).padStart(2,'0');
        ySelect.value = String(d.getFullYear());
    }
});

function m_toggleAdvFilters() {
    const box = document.getElementById('mAdvBox');
    if(box) {
        box.classList.toggle('open');
        if(!box.classList.contains('open')) {
            document.getElementById('mFDateDal').value = ""; 
            document.getElementById('mFDateAl').value = "";
            document.getElementById('mFilterStruct').value = "all";
            m_changePage(0, true);
        }
    }
}

function m_handleTypeChange() {
    const tipo = document.getElementById("mFTipo").value;
    const dettInput = document.getElementById("mFMassaggioSpec");
    if(tipo && dettInput) {
        if(tipo.value === 'massaggi') { dettInput.style.display = 'block'; } 
        else { dettInput.style.display = 'none'; dettInput.value = ''; }
    }
    m_changePage(0, true);
}

function m_handlePredictiveSearch() {
    const el = document.getElementById('mSearchPredictive');
    if(!el) return;
    const val = el.value.trim();
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => { if(val.length >= 3 || val.length === 0) m_changePage(0, true); }, 300);
}

function populateOperatorsMobile() {
    const opSelect = document.getElementById("mFOperatore");
    if(!opSelect) return;
    const currentSelected = opSelect.value;
    opSelect.innerHTML = '<option value="all">Staff</option>';
    if(typeof db !== 'undefined' && db.staff) {
        db.staff.forEach(s => { 
            if(s && s.nome && String(s.nome).trim() !== '') {
                opSelect.innerHTML += `<option value="${s.nome}">${s.nome}</option>`; 
            }
        });
    }
    if(currentSelected) opSelect.value = currentSelected;
}

function m_getFilteredDataMobile() {
    const elQuery = document.getElementById("mSearchPredictive");
    const query = elQuery ? String(elQuery.value || "").toLowerCase().trim() : "";
    
    const fMonth = document.getElementById("mFilterMonth") ? document.getElementById("mFilterMonth").value : "";
    const fYear = document.getElementById("mFilterYear") ? document.getElementById("mFilterYear").value : "";
    
    const elDal = document.getElementById("mFDateDal"); const fDal = elDal ? elDal.value : ""; 
    const elAl = document.getElementById("mFDateAl"); const fAl = elAl ? elAl.value : "";
    
    const elTipo = document.getElementById("mFTipo"); const fTipo = elTipo ? elTipo.value : "all"; 
    const elOp = document.getElementById("mFOperatore"); const fOp = elOp ? elOp.value : "all";
    const elStato = document.getElementById("mFStato"); const fStato = elStato ? elStato.value : "all"; 
    const elDett = document.getElementById("mFMassaggioSpec"); const fDettaglio = elDett ? String(elDett.value).toLowerCase().trim() : "";

    let all = [];
    
    try {
        if(typeof db !== 'undefined' && db.app) {
            Object.keys(db.app).forEach(d => { 
                let dayData = db.app[d];
                if(!dayData) return;
                let dayApps = [];
                if(Array.isArray(dayData)) {
                    dayApps = dayData.filter(x => x && typeof x === 'object');
                } else if(typeof dayData === 'object') {
                    Object.keys(dayData).forEach(k => {
                        let item = dayData[k];
                        if(item && typeof item === 'object') {
                            if(!item.id) item.id = k; 
                            dayApps.push(item);
                        }
                    });
                }
                dayApps.forEach(a => all.push({...a, fullDate: String(d)})); 
            });
        }
        all.sort((a,b) => (String(b.fullDate)+" "+String(b.ora)).localeCompare(String(a.fullDate)+" "+String(a.ora)));
    } catch(e) { 
        console.error(e); 
        return []; 
    }

    return all.filter(a => {
        if(query.length >= 3) {
            const matchQuery = String(a.cog || '').toLowerCase().includes(query) || String(a.cam || '').toLowerCase().includes(query) || String(a.op || '').toLowerCase().includes(query) || String(a.id || '').toLowerCase().includes(query);
            if(!matchQuery) return false;
        } else { 
            if(fDal || fAl) {
                if(fDal && a.fullDate < fDal) return false; 
                if(fAl && a.fullDate > fAl) return false; 
            } else if (fMonth && fYear) {
                if(!a.fullDate.startsWith(`${fYear}-${fMonth}`)) return false;
            }
        }
        
        if (fOp !== 'all' && String(a.op) !== String(fOp)) return false;
        if(fStato === 'eseguito' && !a.eseguito) return false;
        if(fStato === 'pagato' && !a.pagato) return false;
        if(fStato === 'dapagare' && a.pagato) return false;

        const servNome = String(a.serv || '').toLowerCase();
        if(fTipo === 'spa' && !servNome.includes('spa') && !servNome.includes('percors')) return false;
        if(fTipo === 'massaggi') {
            if(!servNome.includes('massagg') && !servNome.includes('ritual') && !servNome.includes('lomi') && !servNome.includes('thai')) return false; 
            if(fDettaglio && !servNome.includes(fDettaglio)) return false;
        }
        return true;
    });
}

function m_goToPage(num) { window.mCurrentPage = num; m_renderLista(); const v = document.getElementById('view-lista'); if(v) v.scrollTop = 0; }
function m_changePage(dir, reset = false) { if(reset) window.mCurrentPage = 1; else window.mCurrentPage += dir; m_renderLista(); const v = document.getElementById('view-lista'); if(v) v.scrollTop = 0; }

function m_renderLista() {
    try {
        populateOperatorsMobile();
        
        const container = document.getElementById('mTableBody');
        if(!container) return;

        let filtered = m_getFilteredDataMobile();

        if(filtered.length === 0) { 
            container.innerHTML = "<tr><td colspan='9' style='text-align:center; padding:40px; color:var(--text-muted); font-weight:bold;'>Nessun appuntamento trovato in questo periodo.</td></tr>"; 
            return; 
        }

        const totalPages = Math.ceil(filtered.length / itemsPerPage);
        if(window.mCurrentPage > totalPages) window.mCurrentPage = totalPages;
        if(window.mCurrentPage < 1) window.mCurrentPage = 1;

        const startIdx = (window.mCurrentPage - 1) * itemsPerPage;
        const pageData = filtered.slice(startIdx, startIdx + itemsPerPage);

        // MODIFICA 1: Sfondo applicato esplicitamente a tutti i TD per bucare il CSS globale
        // MODIFICA 2: Leva ricreata usando SOLO la classe nativa CSS, senza slider custom.
        container.innerHTML = pageData.map(a => {
            const dFormat = a.fullDate ? String(a.fullDate).split('-').reverse().join('/') : '-';
            const shortId = String(a.id || '').replace("APP", "").substring(0, 6);
            const safeName = String(a.cog || 'N.D.').replace(/'/g, "\\'");
            
            let bgRow = "";
            let borderLeft = "border-left: 4px solid transparent !important;";
            
            if (a.pagato) {
                bgRow = "background-color: rgba(16, 185, 129, 0.25) !important;";
                borderLeft = "border-left: 4px solid var(--green) !important;";
            } else if (a.eseguito) {
                bgRow = "background-color: rgba(251, 191, 36, 0.25) !important;";
                borderLeft = "border-left: 4px solid var(--gold) !important;";
            }

            return `
            <tr style="transition: background 0.3s; border-bottom: 1px solid var(--border-line);">
                <td class="sticky-col" style="${bgRow} ${borderLeft} transition: background 0.3s; vertical-align: middle; padding:10px; width:55px; text-align:center; border-right: 1px solid var(--border-line);">
                    <div style="font-weight:900; font-size:13px; color:var(--text-main);">${a.ora||'-'}</div>
                    <div style="font-size:10px; font-weight:bold; color:var(--text-muted); margin-top:2px;">C.${a.cam||'-'}</div>
                </td>
                
                <td style="${bgRow} padding:10px; max-width: 160px; overflow: hidden; transition: background 0.3s;">
                    <div style="display:flex; align-items:center; gap:5px; overflow:hidden; white-space:nowrap;">
                        <b class="client-name" style="margin:0; font-size:14px; color:var(--gold); cursor:pointer; text-overflow:ellipsis; overflow:hidden;" onclick="m_openCustomerProfile(event, '${safeName}')">${a.cog||'N.D.'}</b>
                        <span class="link-blue" style="font-size:9px; padding:2px 4px; cursor:pointer;" onclick="m_openForm(event, '${a.id}')">#${shortId}</span>
                    </div>
                    <div style="font-size:11px; margin-top:4px; color:var(--text-main); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                        <span style="color:var(--accent); font-weight:bold;">${a.serv||'-'}</span> <span style="color:var(--text-muted);">| Op: ${a.op||'-'} | ${dFormat}</span>
                    </div>
                    ${a.note ? `<div style="font-size:10px; color:var(--text-muted); margin-top:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-style:italic;">Note: ${a.note}</div>` : ''}
                </td>

                <td style="${bgRow} padding:10px; width:45px; text-align:right; vertical-align:middle; font-weight:900; font-size:14px; color:var(--text-main); transition: background 0.3s;">
                    ${parseFloat(a.price||0).toFixed(0)}€
                </td>

                <td style="${bgRow} padding:10px; width: 70px; vertical-align:middle; text-align:right; transition: background 0.3s;">
                    <div style="display:flex; flex-direction:column; align-items:flex-end; gap:8px;">
                        <div style="display:flex; align-items:center; gap:6px;">
                            <span style="color:var(--gold); font-weight:900; font-size:13px;">V</span>
                            <label class="switch" style="transform: scale(0.65); transform-origin: right; margin:0; display:block;">
                                <input type="checkbox" onchange="m_toggleField('${a.id}','${a.fullDate}','eseguito')" ${a.eseguito?'checked':''}>
                                <span class="slider"></span>
                            </label>
                        </div>
                        <div style="display:flex; align-items:center; gap:6px;">
                            <span style="color:var(--green); font-weight:900; font-size:13px;">€</span>
                            <label class="switch" style="transform: scale(0.65); transform-origin: right; margin:0; display:block;">
                                <input type="checkbox" onchange="m_toggleField('${a.id}','${a.fullDate}','pagato')" ${a.pagato?'checked':''}>
                                <span class="slider"></span>
                            </label>
                        </div>
                    </div>
                </td>

                <td style="${bgRow} padding:10px; width:35px; text-align:center; vertical-align:middle; transition: background 0.3s;">
                    <i class="material-icons-round" style="color:var(--red); font-size:20px; cursor:pointer;" onclick="m_delAppFromList('${a.id}','${a.fullDate}')">delete</i>
                </td>
            </tr>`;
        }).join('');

    } catch(err) {
        console.error(err);
        const container = document.getElementById('mTableBody');
        if(container) container.innerHTML = "<tr><td colspan='9' style='padding:20px; color:red; text-align:center;'>Errore nel rendering della lista.</td></tr>";
    }
}

function m_toggleField(id, date, field) {
    if(typeof firebase === 'undefined' || typeof sId === 'undefined') return;
    firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + sId + '/app/' + date).once('value').then(snap => {
        let val = snap.val(); if(!val) return;
        let apps = [];
        if(Array.isArray(val)) apps = val.filter(x => x && typeof x === 'object');
        else apps = Object.keys(val).map(k => ({id: k, ...val[k]}));

        const idx = apps.findIndex(x => String(x.id) === String(id));
        if(idx > -1) { 
            apps[idx][field] = !apps[idx][field]; 
            firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + sId + '/app').child(date).set(apps).then(() => { 
                if(typeof showToast === 'function') showToast("Aggiornato!"); 
                m_renderLista(); 
            }); 
        }
    });
}

function m_delAppFromList(id, d) {
    let modal = document.getElementById('elegantPromptModal');
    if(!modal) {
        modal = document.createElement('div');
        modal.id = 'elegantPromptModal';
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:9999; display:none; align-items:center; justify-content:center; padding:20px; backdrop-filter: blur(4px);';
        modal.innerHTML = `
            <div style="background:var(--bg-panel); border:1px solid var(--border-line); border-radius:16px; padding:25px; width:100%; max-width:350px; text-align:center; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <i class="material-icons-round" style="font-size:48px; color:var(--red); margin-bottom:10px;">delete_forever</i>
                <h3 style="color:var(--text-main); margin-top:0; font-size:18px;">Annulla Appuntamento</h3>
                <p style="font-size:13px; color:var(--text-muted); margin-bottom:15px;">Inserisci il motivo:</p>
                <input type="text" id="elegantPromptInput" style="width:100%; padding:14px; border-radius:10px; border:1px solid var(--border-line); background:var(--bg-body); color:var(--text-main); margin-bottom:25px; outline:none; font-size:14px;" placeholder="Motivo...">
                <div style="display:flex; gap:10px;">
                    <button id="elegantPromptCancel" style="flex:1; padding:14px; border-radius:10px; background:transparent; border:1px solid var(--border-line); color:var(--text-main); font-weight:bold; cursor:pointer;">INDIETRO</button>
                    <button id="elegantPromptOk" style="flex:1; padding:14px; border-radius:10px; background:var(--red); border:none; color:white; font-weight:bold; cursor:pointer;">ELIMINA</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    const input = document.getElementById('elegantPromptInput');
    input.value = '';
    modal.style.display = 'flex';

    document.getElementById('elegantPromptCancel').onclick = () => modal.style.display = 'none';

    document.getElementById('elegantPromptOk').onclick = () => {
        const m = input.value.trim();
        if(m === '') { if(typeof showToast === 'function') showToast("Motivo obbligatorio."); return; }
        modal.style.display = 'none';

        if(typeof firebase === 'undefined' || typeof sId === 'undefined') return;

        firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + sId + '/app/' + d).once('value').then(snap => {
            let val = snap.val(); if(!val) return;
            let apps = Array.isArray(val) ? val.filter(x => x && typeof x === 'object') : Object.keys(val).map(k => ({id: k, ...val[k]}));

            const appToDel = apps.find(x => String(x.id) === String(id)); 
            apps = apps.filter(x => String(x.id) !== String(id));
            
            firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + sId + '/app').child(d).set(apps).then(() => {
                if(appToDel) { 
                    appToDel.deleteReason = m; appToDel.date = d; appToDel.deletedAt = new Date().toLocaleString('it-IT'); 
                    firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + sId + '/deleted_apps').push(appToDel); 
                }
                if(typeof showToast === 'function') showToast("Eliminato!"); 
                m_renderLista();
            });
        });
    };
}

function m_exportExcel() {
    let filtered = m_getFilteredDataMobile(); if(filtered.length === 0) { if(typeof showToast === 'function') showToast("Nessun dato da esportare."); return; }
    let tableHTML = `<table border="1"><thead><tr style="background-color: #f8fafc; font-weight: bold; font-size: 14px;"><th>DATA E ORA</th><th>NOME E COGNOME</th><th>CAMERA</th><th>TRATTAMENTO</th><th>OPERATORE</th><th>PREZZO</th><th>NOTE</th><th>STATO</th></tr></thead><tbody>`;
    filtered.forEach(a => { const dataOra = `${String(a.fullDate).split('-').reverse().join('/')} ${String(a.ora)}`; let statoArr = []; if(a.eseguito) statoArr.push("Eseguito"); if(a.pagato) statoArr.push("Pagato"); if(statoArr.length===0) statoArr.push("In Attesa"); tableHTML += `<tr><td>${dataOra}</td><td>${a.cog||'-'}</td><td>${a.cam||'-'}</td><td>${a.serv||'-'}</td><td>${a.op||'-'}</td><td>${a.price||0}</td><td>${a.note||'-'}</td><td>${statoArr.join(' e ')}</td></tr>`; });
    tableHTML += `</tbody></table>`; const uri = 'data:application/vnd.ms-excel;base64,'; const template = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"></head><body>{table}</body></html>'; const base64 = function(s) { return window.btoa(unescape(encodeURIComponent(s))) }; const format = function(s, c) { return s.replace(/{(\w+)}/g, function(m, p) { return c[p]; }) }; const link = document.createElement("a"); link.download = `Export_Appuntamenti_Mobile.xls`; link.href = uri + base64(format(template, { worksheet: 'Report', table: tableHTML })); document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

function m_openProfileTab(tabName, event) { document.querySelectorAll('#customerProfileModal .tab-content').forEach(el => el.classList.remove('active')); document.querySelectorAll('#customerProfileModal .tab-btn').forEach(el => el.classList.remove('active')); document.getElementById('tab-' + tabName).classList.add('active'); if(event) event.currentTarget.classList.add('active'); }

function m_openCustomerProfile(e, name) {
    if(e) e.stopPropagation(); if(!name || name === 'N.D.') return;
    let custData = { tel: 'N.D.', dataNascita: 'N.D.', note: '', docs: {} }; let custId = null; 
    let target = null; if(typeof globalCustomersList !== 'undefined') { target = globalCustomersList.find(c => c.nome && String(c.nome).toLowerCase() === String(name).toLowerCase()); }
    if(target) { custId = target.id; custData = target; }
    const elNome = document.getElementById('cp_nome'); if(elNome) elNome.innerText = name; 
    const elTel = document.getElementById('cp_tel'); if(elTel) elTel.innerText = custData.tel || 'N.D.'; 
    const elDob = document.getElementById('cp_dob'); if(elDob) elDob.innerText = custData.dataNascita ? String(custData.dataNascita).split('-').reverse().join('/') : 'N.D.'; 
    const elNote = document.getElementById('cp_note'); if(elNote) elNote.value = custData.note || ''; 
    window.currentOpenedCustomerId = custId;
    let history = []; let totalSpent = 0;
    if(typeof db !== 'undefined' && db.app) {
        Object.keys(db.app).forEach(d => { 
            let dayData = db.app[d]; if(!dayData) return;
            let dayApps = Array.isArray(dayData) ? dayData : Object.keys(dayData).map(k=>dayData[k]);
            dayApps.forEach(a => { if(a && a.cog && String(a.cog).toLowerCase() === String(name).toLowerCase()) { let price = parseFloat(a.price) || 0; if(a.pagato) totalSpent += price; history.push({ date: d, serv: a.serv||'-', op: a.op||'-', price: price }); } }); 
        });
    }
    const elSpent = document.getElementById('cp_spent'); if(elSpent) elSpent.innerText = totalSpent.toFixed(2).replace('.', ',') + ' €'; 
    history.sort((a,b) => String(b.date).localeCompare(String(a.date)));
    const hBody = document.getElementById('cp_history'); 
    if(hBody) { hBody.innerHTML = history.map(h => { return `<tr><td>${String(h.date).split('-').reverse().join('/')}</td><td>SPA</td><td>${h.serv}<br><span style="font-size:11px;color:var(--text-muted)">Op: ${h.op}</span></td><td style="text-align:right"><b>€ ${h.price.toFixed(2).replace('.',',')}</b></td></tr>`; }).join(''); if(history.length === 0) hBody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:20px; color:var(--text-muted)'>Nessun trattamento registrato.</td></tr>"; }
    const docsTable = document.getElementById('cp_docs_table');
    if(docsTable) { docsTable.innerHTML = ""; if(custData.docs && Object.keys(custData.docs).length > 0) { Object.entries(custData.docs).forEach(([docId, doc]) => { docsTable.innerHTML += `<tr><td>${(doc.dataInserimento||'-').split(',')[0]}</td><td><b>${doc.nomeDoc}</b></td><td style="text-align:right"><a href="${doc.link}" target="_blank" class="btn-save btn-outline" style="background:rgba(16,185,129,0.1); color:var(--green); border-color:var(--green); padding:8px;"><i class="material-icons-round">picture_as_pdf</i></a></td></tr>`; }); } else { docsTable.innerHTML = "<tr><td colspan='3' style='text-align:center; padding:20px; color:var(--text-muted)'>Nessun file associato.</td></tr>"; } }
    const modal = document.getElementById('customerProfileModal'); if(modal) modal.style.display = 'flex'; m_openProfileTab('history');
}

function m_saveCustomerNote() { const elNote = document.getElementById('cp_note'); if(!elNote) return; const note = elNote.value; if(window.currentOpenedCustomerId && typeof firebase !== 'undefined') { firebase.database().ref('MASTER_ADMIN_DB/global_customers/' + window.currentOpenedCustomerId).update({ note: note }); if(typeof showToast === 'function') showToast("Note aggiornate nel CRM!"); } }