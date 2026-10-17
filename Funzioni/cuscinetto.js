/* funzioni/cuscinetto.js - Cache Real-Time Indipendente per Blocchi e Motore Grafico */

document.addEventListener('DOMContentLoaded', () => {
    const stili = document.createElement('style');
    stili.innerHTML = `
        .blocco-cabina { background: #334155 !important; border-left: 5px solid #64748b !important; color: #f8fafc !important; z-index: 4; box-shadow: 0 4px 6px rgba(0,0,0,0.3) !important; padding: 8px 12px; cursor: grab; position: relative; }
        .light-theme .blocco-cabina { background: rgba(100, 116, 139, 0.15) !important; border-left-color: #64748b !important; color: #0f172a !important; }
        .blocco-cabina:active { cursor: grabbing !important; }
        body.is-dragging-mode .app-base, body.is-dragging-mode .blocco-cabina { pointer-events: none !important; }
        .blocco-actions { position: absolute; top: 4px; right: 4px; display: flex; gap: 4px; opacity: 0; transition: 0.2s; }
        .blocco-cabina:hover .blocco-actions { opacity: 1; }
        .blocco-actions i { font-size: 14px; background: rgba(0,0,0,0.6); color: white; border-radius: 4px; padding: 3px; cursor: pointer; transition: 0.2s; }
        .blocco-actions i.edit-btn:hover { background: var(--accent); color: #000; }
        .blocco-actions i.del-btn:hover { background: var(--red); color: white; }
        .resizer-bottom { position: absolute; bottom: 0; left: 0; width: 100%; height: 10px; cursor: ns-resize; background: rgba(255,255,255,0.05); border-top: 1px dashed rgba(100,116,139,0.5); transition: 0.2s; z-index: 10; pointer-events: auto !important; }
        .resizer-bottom:hover { background: rgba(100,116,139,0.4); border-top: 1px solid #94a3b8; height: 12px; }
        #tw-context-menu { display: none; position: fixed; z-index: 10000; background: var(--bg-panel); border: 1px solid var(--border-line); border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); overflow: hidden; width: 220px; }
        .tw-ctx-item { padding: 12px 15px; cursor: pointer; color: var(--text-main); display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: bold; transition: 0.2s; }
        .tw-ctx-item:hover { background: rgba(56, 189, 248, 0.1); color: var(--accent); padding-left: 20px; }
    `;
    document.head.appendChild(stili);

    const menuHtml = `
        <div id="tw-context-menu">
            <div class="tw-ctx-item" onclick="window.cuscinetto.createInstantBlock()"><i class="material-icons-round">block</i> Crea Blocco</div>
            <div class="tw-ctx-item" onclick="window.cuscinetto.openRadar()"><i class="material-icons-round" style="color:var(--accent);">radar</i> Ricerca Rapida</div>
        </div>
        
        <div id="modalEditBlocco" class="modal-overlay" onclick="if(event.target===this) this.style.display='none'" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:10001; align-items:center; justify-content:center; backdrop-filter:blur(5px);">
            <div style="background:var(--bg-panel); padding:30px; border-radius:16px; width:90%; max-width:400px; border:1px solid var(--border-line); box-shadow:0 10px 40px rgba(0,0,0,0.6);">
                <h3 style="color:var(--text-main); margin-top:0; border-bottom:1px solid var(--border-line); padding-bottom:15px; font-size:18px; text-transform:uppercase; display:flex; align-items:center; gap:8px;"><i class="material-icons-round" style="color:var(--accent);">edit</i> Rinomina Blocco</h3>
                <input type="hidden" id="editBloccoId">
                <div style="margin-bottom:25px; margin-top:15px;">
                    <label style="font-size:11px; color:var(--text-muted); font-weight:bold; text-transform:uppercase;">Motivo del blocco</label>
                    <input type="text" id="editBloccoNote" class="form-input" style="width:100%; padding:12px; border-radius:8px; border:1px solid var(--border-line); background:var(--bg-body); color:var(--text-main); font-size:14px; font-weight:bold; outline:none; margin-top:5px;">
                </div>
                <div style="display:flex; gap:10px;">
                    <button class="blocco-action-btn blocco-btn-close" style="flex:1; padding:12px; border-radius:8px; font-weight:900; background:var(--bg-body); color:var(--text-main); border:1px solid var(--border-line); cursor:pointer;" onclick="document.getElementById('modalEditBlocco').style.display='none'">Annulla</button>
                    <button class="blocco-action-btn" style="flex:2; padding:12px; border-radius:8px; font-weight:900; background:var(--accent); color:#0f172a; border:none; cursor:pointer;" onclick="window.cuscinetto.saveEditedNote()"><i class="material-icons-round" style="vertical-align:middle; font-size:16px;">save</i> Salva Modifica</button>
                </div>
            </div>
        </div>

        <div id="modalDeleteConfirm" class="modal-overlay" onclick="if(event.target===this) this.style.display='none'" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:10001; align-items:center; justify-content:center; backdrop-filter:blur(5px);">
            <div style="background:var(--bg-panel); padding:30px; border-radius:16px; width:90%; max-width:350px; border:1px solid var(--red); box-shadow:0 10px 40px rgba(0,0,0,0.6); text-align:center;">
                <i class="material-icons-round" style="font-size:40px; color:var(--red); margin-bottom:10px;">warning</i>
                <h3 style="color:var(--text-main); margin-top:0; font-size:18px;">Confermi l'eliminazione?</h3>
                <p style="color:var(--text-muted); font-size:13px; margin-bottom:25px;">Il blocco verrà rimosso in modo permanente dalla griglia.</p>
                <input type="hidden" id="deleteBloccoId">
                <div style="display:flex; gap:10px;">
                    <button style="flex:1; padding:12px; border-radius:8px; font-weight:900; background:var(--bg-body); color:var(--text-main); border:1px solid var(--border-line); cursor:pointer;" onclick="document.getElementById('modalDeleteConfirm').style.display='none'">Annulla</button>
                    <button style="flex:1; padding:12px; border-radius:8px; font-weight:900; background:var(--red); color:#fff; border:none; cursor:pointer;" onclick="window.cuscinetto.confirmDeleteBlock()"><i class="material-icons-round" style="vertical-align:middle; font-size:16px;">delete</i> Elimina</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', menuHtml);

    if (!document.getElementById('drag-ghost-cube')) {
        const ghost = document.createElement('div');
        ghost.id = 'drag-ghost-cube'; ghost.style.width = '40px'; ghost.style.height = '40px';
        ghost.style.backgroundColor = '#475569'; ghost.style.border = '2px solid #fff'; ghost.style.borderRadius = '8px';
        ghost.style.position = 'absolute'; ghost.style.top = '-1000px'; ghost.style.zIndex = '-1000';
        document.body.appendChild(ghost);
    }
});

window.cuscinetto = {
    ctxTargetCab: null, ctxTargetOra: null, blocchiLocali: [], graphicsSettings: null, isResizing: false, resizeStartY: 0, resizeStartDur: 0, resizeBlockId: null,
    
    initEventListeners: function() {
        const grid = document.getElementById('mainGrid');
        if(!grid) return;

        const safeStructId = window.twStructId || localStorage.getItem("tw_structure_id");

        if(safeStructId) {
            firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${safeStructId}/blocchi`).on('value', snap => {
                const allDates = snap.val() || {};
                const d = document.getElementById("mainDate") ? document.getElementById("mainDate").value : null;
                if(d && allDates[d]) this.blocchiLocali = Object.values(allDates[d]).filter(b => b !== null && b !== undefined); else this.blocchiLocali = [];
                if(typeof window.render === 'function') window.render(); 
            });
            
            firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${safeStructId}/settings/grafica`).on('value', snap => {
                this.graphicsSettings = snap.val() || null;
                if(typeof window.render === 'function') window.render(); 
            });
        }

        document.addEventListener('dragstart', (e) => { setTimeout(() => { document.body.classList.add('is-dragging-mode'); }, 10); }, true);
        document.addEventListener('dragend', () => { document.body.classList.remove('is-dragging-mode'); }, true);
        document.addEventListener('drop', () => { document.body.classList.remove('is-dragging-mode'); }, true);

        grid.addEventListener('contextmenu', (e) => {
            const slot = e.target.closest('.slot'); const blocco = e.target.closest('.blocco-cabina');
            if (blocco) { e.preventDefault(); return; } 
            if (slot) {
                e.preventDefault(); const col = slot.closest('.colonna');
                let cabId = col.getAttribute('data-id') || col.getAttribute('data-cab') || col.getAttribute('data-room') || (col.id ? col.id.replace('col_','') : null);
                if (!cabId) { const header = col.querySelector('.col-head'); if (header) cabId = header.innerText.trim(); }
                window.cuscinetto.ctxTargetCab = cabId; window.cuscinetto.ctxTargetOra = slot.getAttribute('data-ora');
                const menu = document.getElementById('tw-context-menu'); menu.style.display = 'block';
                let x = e.clientX; let y = e.clientY;
                if(x + 220 > window.innerWidth) x -= 220; if(y + 60 > window.innerHeight) y -= 60;
                menu.style.left = x + 'px'; menu.style.top = y + 'px';
            }
        });

        document.addEventListener('click', (e) => { if(!e.target.closest('#tw-context-menu')) { const menu = document.getElementById('tw-context-menu'); if(menu) menu.style.display = 'none'; } });

        grid.addEventListener('drop', (e) => {
            if(window.draggedType === 'blocco') {
                e.preventDefault(); e.stopImmediatePropagation();
                document.querySelectorAll('.slot.drag-over-slot, .slot.drag-over').forEach(el => { el.classList.remove('drag-over-slot'); el.classList.remove('drag-over'); });
                const dropZoneSlot = e.target.closest('.slot');
                if (dropZoneSlot) {
                    const col = dropZoneSlot.closest('.colonna');
                    let newCab = col.getAttribute('data-id') || col.getAttribute('data-cab') || col.getAttribute('data-room') || (col.id ? col.id.replace('col_','') : null);
                    if (!newCab) { const header = col.querySelector('.col-head'); if (header) newCab = header.innerText.trim(); }
                    const newOra = dropZoneSlot.getAttribute('data-ora'); window.cuscinetto.moveBlock(window.draggedAppId, newCab, newOra);
                }
            }
        }, true);

        // Synchronously intercept window.render so it's ready before the very first call
        const originalRender = window.render;
        if (typeof originalRender === 'function') {
            window.render = function() {
                originalRender(); 
                
                document.querySelectorAll('.app-base:not(.blocco-cabina)').forEach(app => {
                    app.querySelectorAll('div, span, i').forEach(el => {
                        const text = el.innerText ? el.innerText.trim().toLowerCase() : '';
                        const bg = window.getComputedStyle(el).backgroundColor;
                        const isNoteIcon = text === 'edit_note' || text === 'note' || (el.className && typeof el.className === 'string' && el.className.toLowerCase().includes('note'));
                        const isWhiteModule = bg === 'rgb(255, 255, 255)' || bg === 'white' || el.style.backgroundColor === 'white';
                        if (isNoteIcon) { el.style.display = 'none'; el.style.opacity = '0'; if (el.parentElement && el.parentElement !== app && el.parentElement.tagName !== 'B') el.parentElement.style.display = 'none'; }
                        if (isWhiteModule && el !== app && el.tagName !== 'B') el.style.display = 'none';
                    });
                });

                window.cuscinetto.drawBlocksSynchronously();
            };
        }
    },

    drawBlocksSynchronously: function() {
        document.querySelectorAll('.blocco-cabina').forEach(el => el.remove());
        
        let baseColor = "#334155";
        if(this.graphicsSettings && this.graphicsSettings.usa_preset === false && this.graphicsSettings.criterio_attivo === 'servizio') {
            if(this.graphicsSettings.colori_servizio && this.graphicsSettings.colori_servizio['blocco_cabina']) {
                baseColor = this.graphicsSettings.colori_servizio['blocco_cabina'];
            }
        }

        this.blocchiLocali.forEach(b => {
            if(!b || !b.cab || !b.ora) return;
            let col = document.querySelector(`.colonna[data-id="${b.cab}"]`) || document.querySelector(`.colonna[data-cab="${b.cab}"]`) || document.querySelector(`.colonna[data-room="${b.cab}"]`) || document.getElementById(`col_${b.cab}`) || document.getElementById(b.cab);
            if(!col) { Array.from(document.querySelectorAll('.colonna')).forEach(c => { const h = c.querySelector('.col-head'); if(h && h.innerText.trim() === String(b.cab).trim()) col = c; }); }
            if(!col) return;
            
            let p = b.ora.split(':'); let minH = parseInt(p[0]); let minM = parseInt(p[1]);
            let slotBaseM = Math.floor(minM / 10) * 10; let offsetTop = minM - slotBaseM;
            let slotOra = `${String(minH).padStart(2,'0')}:${String(slotBaseM).padStart(2,'0')}`;
            
            const slotEl = col.querySelector(`.slot[data-ora="${slotOra}"]`);
            if(slotEl) {
                const hCss = `height: calc(${((b.dur + offsetTop) / 10) * 100}% - 4px);`;
                const topCss = offsetTop > 0 ? `top: calc(${(offsetTop/10)*100}% + 2px);` : ``;
                const html = `<div class="app-base blocco-cabina" style="${hCss} ${topCss} background-color:${baseColor} !important; border-left-color:rgba(255,255,255,0.2) !important;" data-id="${b.id}" draggable="true">
                    <div class="blocco-actions">
                        <i class="material-icons-round edit-btn" title="Rinomina Testo" onclick="window.cuscinetto.openEditModal('${b.id}', event)">edit</i>
                        <i class="material-icons-round del-btn" title="Elimina" onclick="window.cuscinetto.openDeleteModal('${b.id}', event)">delete</i>
                    </div>
                    <b style="display:block; font-size:12px; text-transform:uppercase; margin-bottom:2px;"><i class="material-icons-round" style="font-size:14px; vertical-align:middle; margin-right:4px;">block</i> ${b.note}</b>
                    <span style="font-weight:bold; font-size:11px;" class="blocco-dur-label">${b.dur}m</span>
                    <div class="resizer-bottom" onmousedown="window.cuscinetto.startResize(event, '${b.id}', ${b.dur})"></div>
                </div>`;
                slotEl.insertAdjacentHTML('beforeend', html);
            }
        });
        window.cuscinetto.initDragAndDrop();
    },

    openRadar: function() {
        document.getElementById('tw-context-menu').style.display = 'none';
        if (typeof window.sysOpenSearchEngine === 'function') {
            window.sysOpenSearchEngine(false);
        } else {
            const rootPath = window.location.pathname.includes('/funzioni/') ? '../' : './';
            window.location.href = rootPath + 'index.html?view=radar';
        }
    },

    createInstantBlock: function() {
        document.getElementById('tw-context-menu').style.display = 'none';
        const d = document.getElementById("mainDate").value;
        const safeStructId = window.twStructId || localStorage.getItem("tw_structure_id");
        if (!d || !safeStructId) return;
        const cab = this.ctxTargetCab; if(!cab) return;

        const id = firebase.database().ref().child('MASTER_ADMIN_DB/structures_data').push().key;
        const ora = this.ctxTargetOra; 
        let dur = 60;
        if (window.db && window.db.settings && window.db.settings.default_block_duration) {
            dur = parseInt(window.db.settings.default_block_duration) || 60;
        }
        const note = "Blocco Operativo";
        
        firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${safeStructId}/blocchi/${d}/${id}`).set({ id, cab, ora, dur, note }).then(() => { 
            if(window.showToast) window.showToast(`Blocco di ${dur} min creato!`); 
        });
    },

    openEditModal: function(id, e) {
        e.stopPropagation();
        const b = this.blocchiLocali.find(x => x.id === id); if(!b) return;
        document.getElementById('editBloccoId').value = id;
        document.getElementById('editBloccoNote').value = b.note;
        document.getElementById('modalEditBlocco').style.display = 'flex';
    },

    saveEditedNote: function() {
        const id = document.getElementById('editBloccoId').value;
        const newNote = document.getElementById('editBloccoNote').value.trim();
        if(newNote === "") return;
        const d = document.getElementById("mainDate").value;
        const safeStructId = window.twStructId || localStorage.getItem("tw_structure_id");
        firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${safeStructId}/blocchi/${d}/${id}`).update({ note: newNote }).then(() => { 
            document.getElementById('modalEditBlocco').style.display = 'none'; 
            if(window.showToast) window.showToast("Testo aggiornato!"); 
        });
    },

    openDeleteModal: function(id, e) {
        e.stopPropagation();
        document.getElementById('deleteBloccoId').value = id;
        document.getElementById('modalDeleteConfirm').style.display = 'flex';
    },

    confirmDeleteBlock: function() {
        const id = document.getElementById('deleteBloccoId').value;
        const d = document.getElementById("mainDate").value;
        const safeStructId = window.twStructId || localStorage.getItem("tw_structure_id");
        firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${safeStructId}/blocchi/${d}/${id}`).remove().then(() => { 
            document.getElementById('modalDeleteConfirm').style.display = 'none'; 
            if(window.showToast) window.showToast("Blocco rimosso!"); 
        });
    },

    startResize: function(e, id, currentDur) {
        e.preventDefault(); e.stopPropagation();
        this.isResizing = true; this.resizeStartY = e.clientY; this.resizeStartDur = currentDur; this.resizeBlockId = id;
        document.body.classList.add('is-dragging-mode');
        document.addEventListener('mousemove', this.onResizeMove); document.addEventListener('mouseup', this.onResizeEnd);
    },

    onResizeMove: function(e) {
        if (!window.cuscinetto.isResizing) return;
        const deltaY = e.clientY - window.cuscinetto.resizeStartY;
        let deltaMins = Math.round(deltaY / 6) / 10 * 10; 
        let newDur = window.cuscinetto.resizeStartDur + deltaMins; if (newDur < 10) newDur = 10;
        const blockEl = document.querySelector(`.blocco-cabina[data-id="${window.cuscinetto.resizeBlockId}"]`);
        if(blockEl) { blockEl.style.height = `calc(${((newDur) / 10) * 100}% - 4px)`; const label = blockEl.querySelector('.blocco-dur-label'); if(label) label.innerText = `${newDur}m`; }
    },

    onResizeEnd: function(e) {
        if (!window.cuscinetto.isResizing) return;
        window.cuscinetto.isResizing = false; document.body.classList.remove('is-dragging-mode');
        document.removeEventListener('mousemove', window.cuscinetto.onResizeMove); document.removeEventListener('mouseup', window.cuscinetto.onResizeEnd);
        const deltaY = e.clientY - window.cuscinetto.resizeStartY;
        let deltaMins = Math.round(deltaY / 6) / 10 * 10;
        let newDur = window.cuscinetto.resizeStartDur + deltaMins; if (newDur < 10) newDur = 10;
        const d = document.getElementById("mainDate").value;
        const safeStructId = window.twStructId || localStorage.getItem("tw_structure_id");
        firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${safeStructId}/blocchi/${d}/${window.cuscinetto.resizeBlockId}`).update({ dur: newDur });
    },

    moveBlock: function(blockId, newCab, newOra) {
        const d = document.getElementById("mainDate").value;
        const safeStructId = window.twStructId || localStorage.getItem("tw_structure_id");
        firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${safeStructId}/blocchi/${d}/${blockId}`).update({ cab: newCab, ora: newOra }).then(() => { 
            if(window.showToast) window.showToast("Blocco Spostato!"); 
        });
    },

    initDragAndDrop: function() {
        const blocchiEls = document.querySelectorAll('.blocco-cabina');
        blocchiEls.forEach(el => {
            if(el.getAttribute('data-dnd-init') === 'true') return;
            el.addEventListener('dragstart', (e) => {
                e.stopPropagation();
                window.draggedAppId = el.getAttribute('data-id'); window.draggedType = 'blocco'; 
                e.dataTransfer.setData("text/plain", window.draggedAppId); e.dataTransfer.effectAllowed = "move";
                const ghost = document.getElementById('drag-ghost-cube'); if(ghost) e.dataTransfer.setDragImage(ghost, 20, 20);
                setTimeout(() => { el.style.opacity = "0.5"; }, 10);
            });
            el.addEventListener('dragend', (e) => { e.stopPropagation(); el.style.opacity = "1"; window.draggedType = null; });
            el.setAttribute('data-dnd-init', 'true');
        });
    }
};

// Start synchronously if script is loaded dynamically, or immediately on DOMReady
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.cuscinetto.initEventListeners());
} else {
    window.cuscinetto.initEventListeners();
}
