/* funzioni/impostazioni/grafica_appuntamenti.js - Motore Grafico e Notifica Corretta */

window.graficaModule = {
    premiumPalette: {
        "#e0f2fe": "Azzurro Default", "#bae6fd": "Celeste Chiaro", "#38bdf8": "Blu Neon", "#0284c7": "Blu Oceano", "#1e3a8a": "Blu Zaffiro",
        "#dcfce7": "Verde Menta", "#10b981": "Verde Smeraldo", "#064e3b": "Verde Foresta", "#fef08a": "Giallo Limone", "#f59e0b": "Oro Ambra",
        "#b45309": "Arancio Ruggine", "#fecdd3": "Rosa Cipria", "#e11d48": "Rosso Rubino", "#f3e8ff": "Lilla Lavanda", "#9333ea": "Viola Prugna", "#475569": "Grigio Ardesia"
    },
    serviziObj: {}, durateDisponibili: [], tipiDisponibili: [], isPresetActive: true, activeLogic: 'servizio', savedColorsServizio: {}, savedColorsDurata: {}, savedColorsPriorita: {}, savedColorsTipologia: {},

    init: function() {
        if(!window.twStructId) return;
        const dbRef = firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${window.twStructId}`);
        
        dbRef.child('servizi').once('value').then(srvSnap => {
            this.serviziObj = srvSnap.val() || {};
            let rawDurations = [];
            let rawTipi = [];
            Object.values(this.serviziObj).forEach(s => {
                if(s.durata) rawDurations.push(parseInt(s.durata));
                if(s.tipo) rawTipi.push(s.tipo);
            });
            
            this.durateDisponibili = [...new Set(rawDurations)].sort((a,b) => a - b);
            this.tipiDisponibili = [...new Set(rawTipi)].filter(t => t.trim() !== "");
            if(this.tipiDisponibili.length === 0) this.tipiDisponibili = ["Massaggi", "Estetica", "SPA"]; // Default se non ci sono tipi
            
            dbRef.child('settings/grafica').once('value').then(prefSnap => {
                const data = prefSnap.val() || {};
                this.isPresetActive = data.usa_preset !== false;
                this.activeLogic = data.criterio_attivo || 'servizio';
                this.savedColorsServizio = data.colori_servizio || {};
                this.savedColorsDurata = data.colori_durata || {};
                this.savedColorsPriorita = data.colori_priorita || {};
                this.savedColorsTipologia = data.colori_tipologia || {};
                
                document.getElementById('graficaPresetToggle').checked = this.isPresetActive;
                this.togglePreset(true); 
                this.switchLogic(this.activeLogic);
            });
        });
        this.renderPaletteModal();
    },

    togglePreset: function(isInit = false) {
        this.isPresetActive = document.getElementById('graficaPresetToggle').checked;
        const wrapper = document.getElementById('graficaLogicWrapper');
        wrapper.style.opacity = this.isPresetActive ? "0.3" : "1";
        wrapper.style.pointerEvents = this.isPresetActive ? "none" : "auto";
        
        // Auto-save immediately when toggled so it isn't "ignored"
        if(!isInit) {
            this.saveAll(true);
        }
    },

    switchLogic: function(logicId) {
        if(this.isPresetActive) return; 
        this.activeLogic = logicId;
        
        document.querySelectorAll('.logic-card').forEach(c => c.classList.remove('active'));
        const card = document.getElementById('cardLogic' + logicId.charAt(0).toUpperCase() + logicId.slice(1));
        if(card) card.classList.add('active');
        
        this.renderDynamicRows();
    },

    renderDynamicRows: function() {
        const container = document.getElementById('graficaDynamicRows');
        const prioContainer = document.getElementById('graficaPriorityRows');
        let html = '';
        let prioHtml = '';

        const createSquare = (id, nomeRiga, minutiInfo, colorHex, logicType) => {
            const colorName = this.premiumPalette[colorHex] || "Personalizzato";
            return `
                <div style="background:var(--bg-body); padding:15px; border-radius:12px; border:1px solid var(--border-line); display:flex; flex-direction:column; align-items:center; text-align:center; gap:10px; box-shadow:0 4px 10px rgba(0,0,0,0.1); cursor:pointer; transition:0.2s;" onclick="window.graficaModule.openPaletteModal('${id}', '${logicType}', '${colorHex}')" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border-line)'">
                    <b style="font-size:12px; text-transform:uppercase; color:var(--text-main); line-height:1.2; height:30px; display:flex; align-items:center; justify-content:center;">${nomeRiga}</b>
                    <span style="font-size:11px; color:var(--accent); font-weight:900;">${minutiInfo}</span>
                    <div style="width:50px; height:50px; border-radius:12px; background-color:${colorHex}; box-shadow:0 4px 8px rgba(0,0,0,0.4); border:2px solid rgba(255,255,255,0.1); margin:5px 0;" id="indicator_${id}"></div>
                    <span style="font-size:11px; font-weight:bold; color:var(--text-muted);" id="nameLabel_${id}">${colorName}</span>
                </div>
            `;
        };

        // Generazione Logica Principale (Dinamica)
        if (this.activeLogic === 'servizio') {
            const bloccoCol = this.savedColorsServizio['blocco_cabina'] || "#334155";
            html += createSquare('blocco_cabina', '<i class="material-icons-round" style="font-size:14px; margin-right:4px;">block</i>Blocco Cabina', 'Durata Variabile', bloccoCol, 'servizio');

            for (const [key, srv] of Object.entries(this.serviziObj)) {
                if (srv && srv.nome) {
                    const col = this.savedColorsServizio[key] || "#e0f2fe"; 
                    const minText = srv.durata ? `${srv.durata} MINUTI` : '30 MINUTI';
                    html += createSquare(key, srv.nome, minText, col, 'servizio');
                }
            }
        } 
        else if (this.activeLogic === 'durata') {
            this.durateDisponibili.forEach(dur => {
                const key = `dur_${dur}`;
                const col = this.savedColorsDurata[key] || "#e0f2fe";
                html += createSquare(key, `Tutti i Trattamenti`, `${dur} MINUTI`, col, 'durata');
            });
        }
        else if (this.activeLogic === 'tipologia') {
             this.tipiDisponibili.forEach(tipo => {
                const key = `tipo_${tipo.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
                const col = this.savedColorsTipologia[key] || "#e0f2fe";
                html += createSquare(key, `Tipo: ${tipo}`, `Trattamenti ${tipo}`, col, 'tipologia');
            });
        }
        
        container.innerHTML = html;

        // Generazione Sottomodulo Priorità (Sempre Fisso)
        const prioritaList = ['Alta', 'Media', 'Bassa'];
        prioritaList.forEach(p => {
            const key = `prio_${p.toLowerCase()}`;
            const col = this.savedColorsPriorita[key] || (p === 'Alta' ? '#ef4444' : (p === 'Media' ? '#fbbf24' : '#10b981'));
            prioHtml += createSquare(key, `Priorità ${p}`, `Livello Segnalazione`, col, 'priorita');
        });
        
        if (prioContainer) prioContainer.innerHTML = prioHtml;
    },

    resetColors: function() {
        if (!document.getElementById('modalResetConfirm')) {
            const resetModalHTML = `
            <div id="modalResetConfirm" class="modal-overlay" onclick="if(event.target===this) this.style.display='none'" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:10001; align-items:center; justify-content:center; backdrop-filter:blur(5px);">
                <div class="tw-premium-modal" style="max-width:400px; text-align:center; border: 1px solid rgba(251, 191, 36, 0.3); border-top: 4px solid var(--gold);">
                    <div class="tw-modal-icon-container" style="background: rgba(251, 191, 36, 0.15); box-shadow: 0 0 20px rgba(251, 191, 36, 0.2);">
                        <i class="material-icons-round" style="font-size:36px; color:var(--gold);">replay</i>
                    </div>
                    <h3 style="color:var(--text-main); margin:0 0 10px 0; font-size:20px; font-weight:900;">Ripristina Colori?</h3>
                    <p style="color:var(--text-muted); font-size:14px; margin: 0 0 25px 0; line-height:1.6;">
                        Vuoi davvero ripristinare tutti i colori a quelli <b style="color:var(--text-main);">predefiniti</b> (inclusa la priorità)?
                    </p>
                    <div style="display:flex; gap:12px;">
                        <button class="btn-save btn-outline" style="flex:1; border-color:transparent;" onclick="document.getElementById('modalResetConfirm').style.display='none'">ANNULLA</button>
                        <button class="btn-save" style="flex:1; background:var(--gold); color:#000; border:none;" onclick="window.graficaModule.confirmResetColors()">SI, RIPRISTINA</button>
                    </div>
                </div>
            </div>
            `;
            document.body.insertAdjacentHTML('beforeend', resetModalHTML);
        }
        document.getElementById('modalResetConfirm').style.display = 'flex';
    },
    
    confirmResetColors: function() {
        if (this.activeLogic === 'servizio') {
            this.savedColorsServizio = {};
        } else if (this.activeLogic === 'durata') {
            this.savedColorsDurata = {};
        } else if (this.activeLogic === 'tipologia') {
            this.savedColorsTipologia = {};
        }
        // Resettiamo sempre anche le priorità in fase di reset globale
        this.savedColorsPriorita = {};
        
        this.renderDynamicRows();
        document.getElementById('modalResetConfirm').style.display = 'none';
        if(window.showToast) window.showToast("Colori ripristinati. Ricorda di salvare!");
    },

    renderPaletteModal: function() {
        const grid = document.getElementById('paletteGridContainer');
        let html = '';
        for (const [hex, name] of Object.entries(this.premiumPalette)) {
            html += `<div class="palette-item" onclick="window.graficaModule.applySelectedColor('${hex}', '${name}')"><div class="palette-swatch" style="background-color: ${hex};"></div><span class="palette-name">${name}</span></div>`;
        }
        grid.innerHTML = html;
    },

    openPaletteModal: function(targetId, targetType, currentHex) {
        document.getElementById('paletteTargetId').value = targetId; document.getElementById('paletteTargetType').value = targetType;
        document.getElementById('paletteCustomPicker').value = currentHex; document.getElementById('modalColorPalette').style.display = 'flex';
    },

    applySelectedColor: function(hex, name) {
        const targetId = document.getElementById('paletteTargetId').value; const targetType = document.getElementById('paletteTargetType').value;
        if(targetType === 'servizio') this.savedColorsServizio[targetId] = hex;
        else if(targetType === 'durata') this.savedColorsDurata[targetId] = hex;
        else if(targetType === 'tipologia') this.savedColorsTipologia[targetId] = hex;
        else if(targetType === 'priorita') this.savedColorsPriorita[targetId] = hex;
        
        const indicator = document.getElementById(`indicator_${targetId}`); const nameLabel = document.getElementById(`nameLabel_${targetId}`);
        if(indicator) indicator.style.backgroundColor = hex; if(nameLabel) nameLabel.innerText = name || "Personalizzato";
        document.getElementById('modalColorPalette').style.display = 'none';
    },

    applyCustomColor: function(hex) { this.applySelectedColor(hex, "Personalizzato"); },

    saveAll: function(silent = false) {
        if(!window.twStructId) return;
        const dbRef = firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${window.twStructId}/settings/grafica`);
        dbRef.set({ 
            usa_preset: this.isPresetActive, 
            criterio_attivo: this.activeLogic, 
            colori_servizio: this.savedColorsServizio, 
            colori_durata: this.savedColorsDurata,
            colori_tipologia: this.savedColorsTipologia,
            colori_priorita: this.savedColorsPriorita
        }).then(() => {
            if(!silent && window.showToast) window.showToast("Motore Grafico Aggiornato!");
        });
    }
};
document.addEventListener('DOMContentLoaded', () => window.graficaModule.init());
