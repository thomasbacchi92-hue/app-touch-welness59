/* Master_core/firma.js - Motore Privacy e Comunicazione Tablet */

window.twPrivacyState = {
    appId: null, date: null, cog: null, docs: null, signature: null, listenerRef: null, spinnerMove: null
};

const SERVER_URL = 'https://script.google.com/macros/s/AKfycbx1EPW47IfK5F2LBZpkxep-7tKiqC-eaZfSVUD9NCM5mT_FscPmPLiYHd45XnniPQZWiA/exec';

window.checkAndSendPrivacy = function() {
    const appId = document.getElementById('mId') ? document.getElementById('mId').value : null;
    
    if (!appId || appId.trim() === "") {
        if (window.showToast) window.showToast("⚠️ Devi prima cliccare su 'SALVA IN AGENDA' per registrare l'appuntamento!", true);
        const btn = document.querySelector('.btn-outline[onclick*="checkAndSendPrivacy"]');
        if (btn) {
            btn.innerHTML = '<i class="material-icons-round">tablet_android</i> INVIA A TABLET';
            btn.disabled = false;
            btn.style.borderColor = 'var(--accent)';
        }
        return;
    }

    const date = document.getElementById('aDate') ? document.getElementById('aDate').value : new Date().toISOString().split('T')[0];
    const cog = document.getElementById('aCog') ? document.getElementById('aCog').value || "Ospite" : "Ospite";
    const dataNascita = document.getElementById('aDataNascita') ? document.getElementById('aDataNascita').value : "___/___/______";
    const displayDataNascita = dataNascita && dataNascita !== "___/___/______" ? dataNascita.split('-').reverse().join('/') : "___/___/______";
    const telefono = document.getElementById('aTel') ? document.getElementById('aTel').value || "__________________" : "__________________";
    
    let servName = "Trattamento SPA";
    const eServNameNode = document.getElementById('eServName');
    if(eServNameNode && eServNameNode.innerText) {
        servName = eServNameNode.innerText.split('(')[0].trim();
    } else {
        const aServNode = document.getElementById('aServ');
        if(aServNode && aServNode.value) servName = aServNode.value;
    }

    const patologie = document.getElementById('aPatologie') ? document.getElementById('aPatologie').value || "Nessuna patologia dichiarata." : "Nessuna patologia.";
    const safeStructId = window.twStructId || localStorage.getItem("tw_structure_id");
    if (!safeStructId) return;

    const displayDate = date.split('-').reverse().join('/');

    const btn = document.querySelector('.btn-outline[onclick*="checkAndSendPrivacy"]');
    if (btn) {
        btn.innerHTML = '<i class="material-icons-round">sync</i> RECUPERO MODELLO...'; 
        btn.style.borderColor = 'var(--accent)';
        btn.disabled = true;
    }

    showCursorSpinner();

    firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${safeStructId}/settings/firma/modelli`).once('value').then(snap => {
        const modelli = snap.val();
        let customHtml = null;
        
        if (modelli) {
            for (const key in modelli) {
                if (modelli[key].isDefault) {
                    customHtml = modelli[key].corpo;
                    break;
                }
            }
        }

        let docHtml = "";
        
        // Recupero nome struttura se disponibile
        let nomeStruttura = "La Direzione";
        let societaGestore = "La Società Gestore";

        if (window.db && window.db.settings && window.db.settings.company) {
             nomeStruttura = window.db.settings.company.nome || "La Direzione";
             societaGestore = window.db.settings.company.ragioneSociale || "La Società Gestore";
        }
        
        if (customHtml) {
            docHtml = customHtml
                .replace(/\{\{NOME_CLIENTE\}\}/g, `${cog}`)
                .replace(/\{\{NOME_STRUTTURA\}\}/g, `${nomeStruttura}`)
                .replace(/\{\{SOCIETA_GESTORE\}\}/g, `${societaGestore}`)
                .replace(/\{\{TELEFONO\}\}/g, `${telefono}`)
                .replace(/___\/___\/______/g, `${displayDataNascita}`)
                .replace(/\[CLIENTE\]/g, `${cog}`)
                .replace(/\[DATA\]/g, `${displayDate}`)
                .replace(/\[SERVIZIO\]/g, `${servName}`)
                .replace(/\[PATOLOGIE\]/g, `${patologie}`)
                .replace(/\[CHECK\]/g, `&#9744;`);
            
            // Applica sfondo bianco per non alterare il layout
            docHtml = `<div style="font-family: -apple-system, sans-serif; color: #000; padding: 10px; line-height: 1.6; text-align: left; background:#ffffff;">${docHtml}</div>`;
        } else {
            docHtml = `
                <div style="font-family: -apple-system, sans-serif; color: #1e293b; padding: 10px; line-height: 1.6; text-align: left;">
                    <h2 style="color: #0f172a; border-bottom: 2px solid #a855f7; padding-bottom: 10px; text-align: center; text-transform: uppercase;">Consenso Informato e Privacy</h2>
                    <p style="font-size: 16px;">Il/La sottoscritto/a <b style="color: #a855f7; font-size:18px;">${cog}</b>, in data <b>${displayDate}</b>, in relazione al servizio di <b>${servName}</b>, dichiara quanto segue:</p>
                    <div style="background: #f1f5f9; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px;">
                        <b style="color: #ef4444; font-size:14px;">QUADRO CLINICO DICHIARATO:</b><br>
                        <span style="font-size: 15px;">${patologie}</span>
                    </div>
                    <div style="font-size: 15px; margin-top: 20px; display: flex; flex-direction: column; gap: 15px;">
                        <div style="display: flex; gap: 10px; align-items: flex-start;">
                            <span style="font-size:24px;">&#9744;</span> <span>Acconsento al trattamento dei dati.</span>
                        </div>
                    </div>
                </div>`;
        }

        if (btn) btn.innerHTML = '<i class="material-icons-round">sync</i> IN COMPILAZIONE SUL TABLET...'; 

        window.twPrivacyState.appId = appId;
        window.twPrivacyState.date = date;
        window.twPrivacyState.cog = cog;

        const tabletRef = firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${safeStructId}/device_sync/tablet`);
        tabletRef.set({ status: 'pending', appId: appId, date: date, docs: [{ content: docHtml }] });

        if(window.twPrivacyState.listenerRef) tabletRef.off('value', window.twPrivacyState.listenerRef);
        
        window.twPrivacyState.listenerRef = tabletRef.on('value', snap => {
            const data = snap.val();
            if(data && data.status === 'review' && data.appId === appId) {
                hideCursorSpinner();
                if (btn) btn.innerHTML = '<i class="material-icons-round" style="color:var(--gold)">visibility</i> VERIFICA ANTEPRIMA...';
                openPreviewModal(data.docs, data.signature, appId, date, cog);
            }
            else if (data && (data.status === 'idle' || data.status === 'completed')) {
                hideCursorSpinner();
                if (btn && data.status === 'completed') {
                    btn.innerHTML = '<i class="material-icons-round" style="color:var(--green)">check_circle</i> PRIVACY SALVATA';
                    btn.style.borderColor = 'var(--green)';
                    setTimeout(() => { btn.innerHTML = '<i class="material-icons-round">tablet_android</i> INVIA A TABLET'; btn.disabled = false; btn.style=''; }, 4000);
                } else if (btn && data.status === 'idle') {
                    btn.innerHTML = '<i class="material-icons-round">tablet_android</i> INVIA A TABLET';
                    btn.disabled = false;
                    btn.style='';
                }
            }
        });

    }).catch(err => {
        hideCursorSpinner();
        if (btn) { btn.innerHTML = '<i class="material-icons-round">tablet_android</i> INVIA A TABLET'; btn.disabled = false; btn.style.borderColor = 'var(--accent)'; }
    });
};

function showCursorSpinner() {
    if(document.getElementById('tw-cursor-spinner')) return;
    const spinner = document.createElement('div');
    spinner.id = 'tw-cursor-spinner';
    spinner.innerHTML = `<div style="width:28px; height:28px; border:3px solid rgba(56, 189, 248, 0.2); border-top-color:var(--accent); border-radius:50%; animation:spin 0.8s linear infinite; box-shadow: 0 4px 10px rgba(0,0,0,0.3);"></div>`;
    spinner.style.cssText = "position:fixed; pointer-events:none; z-index:999999; margin-top: 15px; margin-left: 15px; transition: opacity 0.2s;";
    document.body.appendChild(spinner);
    window.twPrivacyState.spinnerMove = (e) => { spinner.style.left = e.clientX + 'px'; spinner.style.top = e.clientY + 'px'; };
    document.addEventListener('mousemove', window.twPrivacyState.spinnerMove);
}

function hideCursorSpinner() {
    const s = document.getElementById('tw-cursor-spinner');
    if(s) { s.style.opacity = '0'; setTimeout(() => s.remove(), 200); }
    if(window.twPrivacyState.spinnerMove) document.removeEventListener('mousemove', window.twPrivacyState.spinnerMove);
}

function openPreviewModal(docs, signature, appId, date, cog) {
    if(document.getElementById('tw-privacy-preview-modal')) document.getElementById('tw-privacy-preview-modal').remove();
    
    window.twPrivacyState.docs = docs;
    window.twPrivacyState.signature = signature;

    const modalHtml = `
        <div id="tw-privacy-preview-modal" class="modal-overlay" style="display:flex; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.9); z-index:100000; align-items:center; justify-content:center; backdrop-filter:blur(8px);">
            <div style="background:var(--bg-panel); border-radius:16px; width:95%; max-width:700px; height:90vh; display:flex; flex-direction:column; border:1px solid var(--border-line); box-shadow: 0 20px 50px rgba(0,0,0,0.6); overflow:hidden;">
                
                <div style="padding:20px; border-bottom:1px solid var(--border-line); display:flex; align-items:center; justify-content:space-between; background:rgba(0,0,0,0.2);">
                    <h2 style="margin:0; font-size:18px; color:var(--accent); display:flex; align-items:center; gap:8px;">
                        <i class="material-icons-round">plagiarism</i> REVISIONE CONTRATTO
                    </h2>
                    <span style="background:var(--bg-body); padding:5px 12px; border-radius:20px; font-size:12px; font-weight:bold; color:var(--text-main);">${cog}</span>
                </div>
                
                <div style="flex:1; overflow-y:auto; padding:20px; background:#fff; color:#0f172a; position:relative;">
                    ${docs[0].content}
                    <div style="margin-top:30px; border-top:2px dashed #cbd5e1; padding-top:20px; text-align:center;">
                        <h4 style="margin:0 0 15px 0; color:#64748b; text-transform:uppercase; font-size:12px;">Firma Acquisita dal Tablet</h4>
                        <img src="${signature}" style="max-width:100%; max-height:200px; border-bottom:2px solid #0f172a; padding-bottom:5px;">
                    </div>
                </div>

                <div style="padding:15px; background:var(--bg-panel); border-top:1px solid var(--border-line); display:flex; gap:10px;">
                    <button class="btn-save" style="flex:1; margin:0; background:rgba(239, 68, 68, 0.1); color:var(--red); border:1px solid rgba(239, 68, 68, 0.3);" onclick="window.twPrivacyAction('elimina')">
                        <i class="material-icons-round">delete</i> ELIMINA
                    </button>
                    <button class="btn-save" style="flex:1; margin:0; background:rgba(251, 191, 36, 0.1); color:var(--gold); border:1px solid rgba(251, 191, 36, 0.3);" onclick="window.twPrivacyAction('rifai')">
                        <i class="material-icons-round">refresh</i> RIFAI
                    </button>
                    <button class="btn-save" id="btnApproveDoc" style="flex:2; margin:0; background:var(--green); color:#fff; border:none;" onclick="window.twPrivacyAction('accetta')">
                        <i class="material-icons-round">check_circle</i> ACCETTA E ARCHIVIA
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

window.twPrivacyAction = function(action) {
    const safeStructId = window.twStructId || localStorage.getItem("tw_structure_id");
    const tabletRef = firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${safeStructId}/device_sync/tablet`);
    
    if (action === 'elimina') {
        tabletRef.update({ status: 'idle' });
        document.getElementById('tw-privacy-preview-modal').remove();
        resetBtn();
        if(window.showToast) window.showToast("Acquisizione firma annullata.");
    } 
    else if (action === 'rifai') {
        tabletRef.update({ status: 'pending' });
        document.getElementById('tw-privacy-preview-modal').remove();
        showCursorSpinner(); 
        const btn = document.querySelector('.btn-outline[onclick*="checkAndSendPrivacy"]');
        if (btn) { btn.innerHTML = '<i class="material-icons-round">sync</i> IN COMPILAZIONE SUL TABLET...'; }
        if(window.showToast) window.showToast("Rimandato al tablet per una nuova firma.");
    }
    else if (action === 'accetta') {
        const btnApprove = document.getElementById('btnApproveDoc');
        btnApprove.innerHTML = '<i class="material-icons-round" style="animation:spin 1s linear infinite;">sync</i> CREAZIONE PDF IN CORSO...';
        btnApprove.disabled = true;

        fetch(SERVER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ 
                appId: window.twPrivacyState.appId, 
                image: window.twPrivacyState.signature, 
                now: new Date().toLocaleString('it-IT'),
                docs: window.twPrivacyState.docs 
            }),
            redirect: "follow"
        })
        .then(async res => { 
            const textResponse = await res.text();
            try { return JSON.parse(textResponse); } catch(e) { return { url: textResponse }; }
        })
        .then(data => {
            const finalLink = data.url || data.fileUrl || data.link || "";
            if(!finalLink || !finalLink.includes("http")) throw new Error("Errore del server PDF.");
            
            tabletRef.update({ status: 'completed', driveLink: finalLink });
            
            firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${safeStructId}/app/${window.twPrivacyState.date}`).once('value').then(appSnap => {
                let dayArr = appSnap.val() || [];
                if(!Array.isArray(dayArr)) dayArr = Object.values(dayArr);
                const idx = dayArr.findIndex(x => x && x.id === window.twPrivacyState.appId);
                if(idx > -1) {
                    dayArr[idx].driveLink = finalLink;
                    firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${safeStructId}/app/${window.twPrivacyState.date}`).set(dayArr);
                }
            });

            document.getElementById('tw-privacy-preview-modal').remove();
            if(window.showToast) window.showToast("Contratto archiviato con successo in Anagrafica!", false);
            
            resetBtn(true);

        }).catch(err => {
            btnApprove.innerHTML = '<i class="material-icons-round">error</i> RIPROVA';
            btnApprove.disabled = false;
            if(window.showToast) window.showToast("ERRORE: Impossibile archiviare il PDF su Drive.", true);
        });
    }
};

function resetBtn(success = false) {
    const btn = document.querySelector('.btn-outline[onclick*="checkAndSendPrivacy"]');
    if(btn) {
        if(success) {
            btn.innerHTML = '<i class="material-icons-round" style="color:var(--green)">check_circle</i> FIRMATO E SALVATO';
            btn.style.borderColor = 'var(--green)';
        } else {
            btn.innerHTML = '<i class="material-icons-round">tablet_android</i> INVIA A TABLET';
            btn.style.borderColor = 'var(--accent)';
            btn.disabled = false;
        }
    }
}
