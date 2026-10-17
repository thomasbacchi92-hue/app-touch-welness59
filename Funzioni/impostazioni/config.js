/* funzioni/impostazioni/config.js */

window.configModule = {
    campiAgenda: { 
        "camera": { title: "Camera / Alloggio", desc: "Mostra il campo per la camera" }, 
        "telefono": { title: "Telefono Cliente", desc: "Campo per contatto telefonico" }, 
        "nascita": { title: "Data di Nascita", desc: "Acquisisci compleanno cliente" }, 
        "operatore": { title: "Scelta Operatore", desc: "Menu a tendina dello staff" }, 
        "note": { title: "Note Generali", desc: "Box per note libere testuali" }, 
        "patologie": { title: "Patologie Mediche", desc: "Tasto e Modulo per Privacy" }, 
        "eseguito": { title: "Tasto 'Eseguito'", desc: "Spunta esecuzione trattamento" }, 
        "privacy": { title: "Contratto e Privacy", desc: "Box per firma e invio Tablet" }, 
        "whatsapp": { title: "Tasto WhatsApp", desc: "Invio promemoria automatico" },
        "fattura": { title: "Numero Fattura", desc: "Campo opzionale per numero fattura" },
        "codcliente": { title: "Codice Cliente", desc: "Campo opzionale ID anagrafica Cliente" }
    },
    init: function() {
        if(!window.twStructId) return;
        firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + window.twStructId + '/settings').once('value').then(snap => {
            const sett = snap.val() || {}; const currentUISettings = sett.agenda_ui || {};
            document.getElementById('ui_max_discount').value = sett.max_discount_euro || 0;
            
            // Carica la durata del blocco di default
            if(document.getElementById('ui_block_duration')) {
                document.getElementById('ui_block_duration').value = sett.default_block_duration || 60;
            }

            const container = document.getElementById('agendaUiSwitchesContainer'); container.innerHTML = "";
            for (const [key, info] of Object.entries(this.campiAgenda)) {
                const isChecked = currentUISettings[key] !== false ? "checked" : "";
                container.insertAdjacentHTML('beforeend', `<div class="switch-row"><div><b>${info.title}</b><span>${info.desc}</span></div><label class="switch"><input type="checkbox" id="ui_toggle_${key}" ${isChecked}><span class="slider"></span></label></div>`);
            }
        });
    },
    saveUISettings: function() {
        let newUISettings = {}; 
        for (const key of Object.keys(this.campiAgenda)) { const el = document.getElementById(`ui_toggle_${key}`); if(el) newUISettings[key] = el.checked; }
        const maxDiscount = parseFloat(document.getElementById('ui_max_discount').value) || 0;
        const blockDuration = parseInt(document.getElementById('ui_block_duration').value) || 60;

        const dbRef = firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + window.twStructId + '/settings');
        
        let updates = {
            agenda_ui: newUISettings,
            max_discount_euro: maxDiscount,
            default_block_duration: blockDuration
        };

        dbRef.update(updates).then(() => { 
            if(window.showToast) window.showToast("Configurazione Salvata!");
            // Aggiorna anche la cache locale per la navigazione fluida
            if(window.db && window.db.settings) {
                window.db.settings.default_block_duration = blockDuration;
                localStorage.setItem('tw_db_cache_settings', JSON.stringify(window.db.settings));
            }
        });
    }
};
document.addEventListener('DOMContentLoaded', () => window.configModule.init());
