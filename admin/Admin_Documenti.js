/* Admin_Documenti.js - Motore Documenti (Ripristinato e Pulito) */

const fbConfigDoc = { apiKey: "AIzaSyCrDuK7SWHdbzrJR-pNpxmRwGnZgV2Dd2Y", authDomain: "touch-welness-massage.firebaseapp.com", databaseURL: "https://touch-welness-massage-default-rtdb.europe-west1.firebasedatabase.app", projectId: "touch-welness-massage", storageBucket: "touch-welness-massage.firebasestorage.app" };
if (!firebase.apps.length) firebase.initializeApp(fbConfigDoc);

window.docApp = window.docApp || {};
Object.assign(window.docApp, {
    db: firebase.database().ref('MASTER_ADMIN_DB'),
    currentTemplateId: null,
    driveFolderId: localStorage.getItem('tw_admin_drive_folder') || '',

    init: function() {
        this.loadTemplates();
        this.loadStructures();
        this.renderDriveIframe();
    },

    showToast: function(m) { const t=document.getElementById("toastBlue"); t.innerText=m; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),3000); },

    // --- GESTIONE DRIVE ---
    setupDrive: function() {
        const id = prompt("Inserisci l'ID della cartella pubblica di Google Drive:", this.driveFolderId);
        if(id !== null) {
            this.driveFolderId = id.trim();
            localStorage.setItem('tw_admin_drive_folder', this.driveFolderId);
            this.renderDriveIframe();
        }
    },
    renderDriveIframe: function() {
        const container = document.getElementById('driveFrameContainer');
        if(!this.driveFolderId) {
            container.innerHTML = "<div style='text-align:center; padding:50px; color:var(--text-muted);'>Nessun ID Cartella impostato. Clicca su 'ID CARTELLA' in alto.</div>";
        } else {
            container.innerHTML = `<iframe src="https://drive.google.com/embeddedfolderview?id=${this.driveFolderId}#grid" style="width:100%; height:100%; border:none;"></iframe>`;
        }
    },
    openNativeDriveEditor: function() {
        if(!this.driveFolderId) return this.showToast("Devi prima impostare l'ID della cartella!");
        window.open(`https://drive.google.com/drive/folders/${this.driveFolderId}`, '_blank');
    },

    // --- CARICAMENTO STRUTTURE ---
    loadStructures: function() {
        this.db.child('structures').once('value').then(snap => {
            const structs = snap.val() || {};
            let opts = '<option value="">-- Seleziona Struttura --</option>';
            Object.values(structs).forEach(s => {
                if(s && !s.archived) opts += `<option value="${s.id}">${s.name}</option>`;
            });
            const selTrans = document.getElementById('transStruct');
            const selConf = document.getElementById('configStructSelect');
            if(selTrans) selTrans.innerHTML = opts;
            if(selConf) selConf.innerHTML = opts;
        });
    },

    // --- GESTIONE TEMPLATES (FILE VERGINI) ---
    loadTemplates: function() {
        this.db.child('documents/templates').on('value', snap => {
            const data = snap.val() || {};
            const tb = document.getElementById('templatesTable');
            if(!tb) return;
            tb.innerHTML = '';
            let count = 0;
            Object.entries(data).forEach(([id, t]) => {
                count++;
                tb.innerHTML += `
                <tr>
                    <td><b style="color:var(--text-main)">${t.name}</b></td>
                    <td style="color:var(--text-muted); font-size:12px;">${t.date || '-'}</td>
                    <td style="text-align:right">
                        <button class="btn-icon" onclick="docApp.openTransform('${id}')" title="Trasforma e Intesta"><i class="material-icons-round" style="color:var(--accent)">auto_fix_high</i></button>
                        <button class="btn-icon" onclick="docApp.editTemplate('${id}')" title="Modifica"><i class="material-icons-round">edit</i></button>
                        <button class="btn-icon btn-del" onclick="docApp.deleteTemplate('${id}')"><i class="material-icons-round">delete</i></button>
                    </td>
                </tr>`;
            });
            if(count === 0) tb.innerHTML = "<tr><td colspan='3' style='text-align:center; padding:20px; color:var(--text-muted)'>Nessun modello salvato.</td></tr>";
        });
    },

    saveTemplate: function() {
        const id = document.getElementById('tplId').value || 'TPL' + Date.now();
        const name = document.getElementById('tplName').value.trim();
        const content = document.getElementById('tplContent').value.trim();
        
        if(!name || !content) return this.showToast("Compila nome e testo!");
        
        this.db.child(`documents/templates/${id}`).set({
            id: id, name: name, content: content, date: new Date().toLocaleDateString('it-IT')
        }).then(() => {
            document.getElementById('templateModal').style.display = 'none';
            this.showToast("Modello Salvato!");
        });
    },

    editTemplate: function(id) {
        this.db.child(`documents/templates/${id}`).once('value').then(snap => {
            const t = snap.val(); if(!t) return;
            document.getElementById('tplId').value = t.id;
            document.getElementById('tplName').value = t.name;
            document.getElementById('tplContent').value = t.content;
            document.getElementById('tplModalTitle').innerText = "Modifica File Vergine";
            document.getElementById('templateModal').style.display = 'flex';
        });
    },

    deleteTemplate: function(id) {
        if(confirm("Vuoi eliminare definitivamente questo modello?")) {
            this.db.child(`documents/templates/${id}`).remove().then(() => this.showToast("Eliminato!"));
        }
    },

    // --- TRASFORMAZIONE ---
    openTransform: function(tplId) {
        this.currentTemplateId = tplId;
        document.getElementById('transStruct').value = "";
        document.getElementById('transPreview').value = "";
        document.getElementById('transformModal').style.display = 'flex';
    },

    generatePreview: function() {
        const sId = document.getElementById('transStruct').value;
        if(!sId || !this.currentTemplateId) return;

        this.db.child(`structures/${sId}/info`).once('value').then(snapInfo => {
            const info = snapInfo.val() || {};
            const map = {
                '{{NOME_STRUTTURA}}': document.getElementById('transStruct').options[document.getElementById('transStruct').selectedIndex].text || '',
                '{{SOCIETA_GESTORE}}': info.g_ragione || 'N.D.',
                '{{INDIRIZZO}}': info.s_addr || 'N.D.',
                '{{CITTA}}': info.s_city || 'N.D.',
                '{{PIVA}}': info.g_piva || 'N.D.',
                '{{TELEFONO}}': info.s_tel || 'N.D.',
                '{{EMAIL}}': info.s_email || 'N.D.'
            };
            
            this.db.child(`documents/templates/${this.currentTemplateId}`).once('value').then(snapTpl => {
                let text = snapTpl.val().content;
                for (let key in map) { text = text.replace(new RegExp(key, 'g'), map[key]); }
                document.getElementById('transPreview').value = text;
            });
        });
    },

    saveTransformed: function() {
        const sId = document.getElementById('transStruct').value;
        const text = document.getElementById('transPreview').value;
        if(!sId || !text) return this.showToast("Seleziona la struttura e genera l'anteprima.");

        this.db.child(`documents/templates/${this.currentTemplateId}`).once('value').then(snapTpl => {
            const docName = snapTpl.val().name;
            const newId = 'DOC' + Date.now();
            this.db.child(`structures_data/${sId}/contracts/${newId}`).set({
                id: newId, documentName: docName, testoGenerato: text, date: new Date().toLocaleDateString('it-IT')
            }).then(() => {
                document.getElementById('transformModal').style.display = 'none';
                this.showToast("Collegato con successo alla struttura!");
                if(document.getElementById('configStructSelect').value === sId) {
                    this.loadGeneratedDocs();
                }
            });
        });
    },

    // --- DOCUMENTI GENERATI (Per il Tablet) ---
    loadGeneratedDocs: function() {
        const sId = document.getElementById('configStructSelect').value;
        const container = document.getElementById('generatedDocsContainer');
        if(!sId) { container.innerHTML = "<div style='text-align:center; padding:20px; color:var(--text-muted);'>Seleziona una struttura.</div>"; return; }

        container.innerHTML = "<div style='text-align:center; padding:20px; color:var(--text-muted);'>Analisi database...</div>";

        this.db.child(`structures_data/${sId}`).once('value').then(snap => {
            const data = snap.val() || {};
            const docs = data.contracts || {};
            const activeDocs = (data.settings && data.settings.active_docs) ? data.settings.active_docs : [];

            let html = `<div style="overflow-x:auto;"><table class="data-table"><thead><tr><th>Nome Modulo</th><th>Data Creazione</th><th style="text-align:center; color:var(--accent);">MOSTRA SU TABLET</th><th style="text-align:right">Azione</th></tr></thead><tbody>`;
            let count = 0;
            
            Object.entries(docs).forEach(([id, doc]) => {
                if(doc.testoGenerato) {
                    count++;
                    const isChecked = activeDocs.includes(doc.documentName) ? "checked" : "";
                    html += `
                    <tr>
                        <td><b style="color:var(--text-main)">${doc.documentName}</b></td>
                        <td style="color:var(--text-muted); font-size:12px;">${doc.date || '-'}</td>
                        <td style="text-align:center;">
                            <label class="switch" style="transform:scale(0.8); margin:0;">
                                <input type="checkbox" class="tablet-doc-toggle" value="${doc.documentName}" ${isChecked}>
                                <span class="slider"></span>
                            </label>
                        </td>
                        <td style="text-align:right">
                            <button class="btn-icon btn-del" onclick="docApp.deleteGeneratedDoc('${sId}', '${id}')"><i class="material-icons-round">delete</i></button>
                        </td>
                    </tr>`;
                }
            });

            if(count === 0) html += `<tr><td colspan='4' style='text-align:center; padding:20px; color:var(--text-muted);'>Nessun documento generato per questa struttura.</td></tr>`;
            html += `</tbody></table></div>`;
            
            html += `<div style="margin-top:20px;"><button class="btn-action btn-green w-100" onclick="docApp.saveActiveDocsConfig('${sId}')"><i class="material-icons-round">save</i> SALVA IMPOSTAZIONI TABLET</button></div>`;

            container.innerHTML = html;
        });
    },

    saveActiveDocsConfig: function(sId) {
        if(!sId) return;
        const checkboxes = document.querySelectorAll('.tablet-doc-toggle');
        let active = [];
        checkboxes.forEach(chk => { if(chk.checked) active.push(chk.value); });
        
        this.db.child(`structures_data/${sId}/settings/active_docs`).set(active).then(() => {
            this.showToast("Configurazione salvata con successo!");
        });
    },

    deleteGeneratedDoc: function(sId, docId) {
        if(confirm("Vuoi rimuovere questo documento dalla struttura?")) {
            this.db.child(`structures_data/${sId}/contracts/${docId}`).remove().then(() => {
                this.showToast("Documento rimosso.");
                this.loadGeneratedDocs();
            });
        }
    }
});

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', () => window.docApp.init()); } else { window.docApp.init(); }