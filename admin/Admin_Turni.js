/* Admin_Turni.js - Motore Esterno Pianificazione HR, AI e PDF */

const PRESETS = {
    'mattina': { s1: '09:00', e1: '14:00', s2: '', e2: '' },
    'pomeriggio': { s1: '14:00', e1: '20:00', s2: '', e2: '' },
    'spezzato': { s1: '09:00', e1: '13:00', s2: '15:00', e2: '19:00' },
    'custom': { s1: '', e1: '', s2: '', e2: '' }
};

window.turniApp = {
    currentOpNick: null,
    turniDate: new Date(),
    currentWeekData: {},

    initFromRespApp: function() {
        if(!this.turniDate) this.turniDate = new Date();
        this.renderOpCards();
    },

    renderOpCards: function() {
        const sid = window.respApp.currentStructId;
        const users = window.respApp.users;
        if(!sid) return;

        let opHtml = '';
        Object.values(users).forEach(u => {
            if(u.structureId === sid) { 
                const isMan = (u.isManager || u.role === 'admin');
                opHtml += `<div class="op-card ${isMan?'manager':''}" id="opCard_${u.nick}" onclick="turniApp.selectOperator('${u.nick}')">
                    <div class="op-card-name">${u.name||u.nick}</div>
                    <div class="op-card-nick">${isMan ? 'RESPONSABILE' : 'STAFF'}</div>
                </div>`;
            }
        });
        const cardsArea = document.getElementById('opCardsArea');
        if(cardsArea) {
            cardsArea.innerHTML = opHtml || "<div style='color:var(--text-muted); font-size:13px; grid-column:1/-1;'>Nessun operatore in questa sede.</div>";
        }
        if(this.currentOpNick) this.selectOperator(this.currentOpNick);
    },

    selectOperator: function(nick) {
        this.currentOpNick = nick;
        document.querySelectorAll('.op-card').forEach(c => c.classList.remove('active'));
        const activeCard = document.getElementById(`opCard_${nick}`);
        if(activeCard) activeCard.classList.add('active');
        this.loadWeekData();
    },

    changeTurniWeek: function(dir) { 
        if(!this.turniDate) this.turniDate = new Date();
        this.turniDate.setDate(this.turniDate.getDate() + (dir * 7)); 
        if(this.currentOpNick) this.loadWeekData(); 
    },

    loadWeekData: function() {
        const opNick = this.currentOpNick;
        const sid = window.respApp.currentStructId;
        const area = document.getElementById('planningWorkspace');
        if(!opNick || !sid) { area.style.display = 'none'; return; }
        area.style.display = 'block';

        const dw = this.turniDate.getDay(); const diff = this.turniDate.getDate() - dw + (dw === 0 ? -6 : 1);
        const sw = new Date(this.turniDate); sw.setDate(diff); const ew = new Date(sw); ew.setDate(sw.getDate() + 6);
        document.getElementById('turniWeekLabel').innerText = `Dal ${sw.toLocaleDateString('it-IT')} al ${ew.toLocaleDateString('it-IT')}`;

        window.respApp.dataRef.child(`${sid}/turni`).once('value').then(snap => {
            const allT = snap.val() || {};
            this.currentWeekData = {};
            for(let i=0; i<7; i++) {
                const cd = new Date(sw); cd.setDate(sw.getDate() + i); 
                const ds = `${cd.getFullYear()}-${String(cd.getMonth()+1).padStart(2,'0')}-${String(cd.getDate()).padStart(2,'0')}`;
                const myS = allT[ds] && allT[ds][opNick] ? allT[ds][opNick] : null; 
                
                let type = myS ? myS.type : "lavoro"; // Default
                let s1 = myS?.start || ""; let e1 = myS?.end || "";
                let s2 = myS?.start2 || ""; let e2 = myS?.end2 || "";
                let preset = myS?.preset || (type === 'lavoro' ? 'custom' : '');
                
                if(type === 'lavoro' && s1 === '' && !preset) {
                    preset = 'mattina'; s1 = PRESETS['mattina'].s1; e1 = PRESETS['mattina'].e1;
                }
                this.currentWeekData[ds] = { type: type, preset: preset, s1: s1, e1: e1, s2: s2, e2: e2 };
            }
            this.drawWeekGrid();
        });
    },

    setDayStatus: function(ds, type) {
        this.currentWeekData[ds].type = type;
        if(type === 'lavoro') {
            if(!this.currentWeekData[ds].preset) this.setPreset(ds, 'mattina');
        } else {
            this.currentWeekData[ds].preset = '';
            this.currentWeekData[ds].s1 = ''; this.currentWeekData[ds].e1 = '';
            this.currentWeekData[ds].s2 = ''; this.currentWeekData[ds].e2 = '';
        }
        this.drawWeekGrid();
    },

    setPreset: function(ds, pKey) {
        this.currentWeekData[ds].preset = pKey;
        if(pKey !== 'custom' && PRESETS[pKey]) {
            this.currentWeekData[ds].s1 = PRESETS[pKey].s1; this.currentWeekData[ds].e1 = PRESETS[pKey].e1;
            this.currentWeekData[ds].s2 = PRESETS[pKey].s2; this.currentWeekData[ds].e2 = PRESETS[pKey].e2;
        }
        this.drawWeekGrid();
    },

    updateCustomTime: function(ds) {
        this.currentWeekData[ds].preset = 'custom';
        if(document.getElementById(`cs1_${ds}`)) this.currentWeekData[ds].s1 = document.getElementById(`cs1_${ds}`).value;
        if(document.getElementById(`ce1_${ds}`)) this.currentWeekData[ds].e1 = document.getElementById(`ce1_${ds}`).value;
        if(document.getElementById(`cs2_${ds}`)) this.currentWeekData[ds].s2 = document.getElementById(`cs2_${ds}`).value;
        if(document.getElementById(`ce2_${ds}`)) this.currentWeekData[ds].e2 = document.getElementById(`ce2_${ds}`).value;
    },

    drawWeekGrid: function() {
        const grid = document.getElementById('managerTurniGrid');
        if(!grid) return;
        let html = '';
        
        Object.keys(this.currentWeekData).sort().forEach(ds => {
            const dayData = this.currentWeekData[ds];
            const dateObj = new Date(ds);
            const dName = dateObj.toLocaleDateString('it-IT', { weekday: 'short' });
            const isLav = dayData.type === 'lavoro';
            
            let presetHtml = '';
            if(isLav) {
                const p = dayData.preset;
                presetHtml = `
                <div style="margin-top:10px;">
                    <button class="preset-btn ${p==='mattina'?'active':''}" onclick="turniApp.setPreset('${ds}','mattina')">MATTINA</button>
                    <button class="preset-btn ${p==='pomeriggio'?'active':''}" onclick="turniApp.setPreset('${ds}','pomeriggio')">POMERIGGIO</button>
                    <button class="preset-btn ${p==='spezzato'?'active':''}" onclick="turniApp.setPreset('${ds}','spezzato')">SPEZZATO</button>
                    <button class="preset-btn ${p==='custom'?'active':''}" onclick="turniApp.setPreset('${ds}','custom')">⚙️ PERS.</button>
                </div>`;
                
                if(p === 'custom' || p === 'spezzato') {
                    presetHtml += `
                    <div class="custom-time-box">
                        <div class="custom-lbl">T1</div>
                        <div style="display:flex;"><input type="time" id="cs1_${ds}" value="${dayData.s1}" onchange="turniApp.updateCustomTime('${ds}')"><input type="time" id="ce1_${ds}" value="${dayData.e1}" onchange="turniApp.updateCustomTime('${ds}')"></div>
                        <div class="custom-lbl">T2</div>
                        <div style="display:flex;"><input type="time" id="cs2_${ds}" value="${dayData.s2}" onchange="turniApp.updateCustomTime('${ds}')"><input type="time" id="ce2_${ds}" value="${dayData.e2}" onchange="turniApp.updateCustomTime('${ds}')"></div>
                    </div>`;
                } else if (p === 'mattina' || p === 'pomeriggio') {
                    presetHtml += `
                    <div class="custom-time-box">
                        <div class="custom-lbl">ORARIO</div>
                        <div style="display:flex;"><input type="time" id="cs1_${ds}" value="${dayData.s1}" onchange="turniApp.updateCustomTime('${ds}')"><input type="time" id="ce1_${ds}" value="${dayData.e1}" onchange="turniApp.updateCustomTime('${ds}')"></div>
                    </div>`;
                }
            }

            html += `
            <div class="day-card ${dayData.type}">
                <b style="text-transform:uppercase; font-size:13px; color:var(--text-main);">${dName}</b>
                <span style="font-size:11px; color:var(--text-muted);">${dateObj.toLocaleDateString('it-IT', {day:'2-digit', month:'2-digit'})}</span>
                <div class="status-btn-group">
                    <button class="s-btn ${dayData.type==='lavoro'?'active p':''}" onclick="turniApp.setDayStatus('${ds}','lavoro')" title="Presente">P</button>
                    <button class="s-btn ${dayData.type==='libero'?'active r':''}" onclick="turniApp.setDayStatus('${ds}','libero')" title="Riposo">R</button>
                    <button class="s-btn ${(dayData.type==='malattia'||dayData.type==='ferie')?'active m':''}" onclick="turniApp.setDayStatus('${ds}','malattia')" title="Malattia/Ferie">M</button>
                </div>
                ${presetHtml}
            </div>`;
        });
        grid.innerHTML = html;
    },

    saveTurni: function() {
        const opNick = this.currentOpNick;
        const sid = window.respApp.currentStructId;
        if(!opNick || !sid) return window.respApp.showToast("Seleziona prima un operatore!");
        
        let promises = [];
        Object.keys(this.currentWeekData).forEach(ds => {
            const ref = window.respApp.dataRef.child(`${sid}/turni/${ds}/${opNick}`);
            const dayData = this.currentWeekData[ds];
            
            if(dayData.type === 'libero') { 
                promises.push(ref.remove()); 
            } else if (dayData.type === 'lavoro') {
                if(document.getElementById(`cs1_${ds}`)) this.updateCustomTime(ds);
                promises.push(ref.set({ 
                    type: 'lavoro', preset: dayData.preset,
                    start: dayData.s1, end: dayData.e1,
                    start2: dayData.s2, end2: dayData.e2 
                })); 
            } else { 
                promises.push(ref.set({ type: dayData.type })); 
            }
        });
        
        Promise.all(promises).then(() => {
            const authUser = localStorage.getItem("tw_user") || "Admin Master";
            window.respApp.dataRef.child(`${sid}/audit_logs`).push({
                date: new Date().toLocaleString('it-IT'), timestamp: Date.now(),
                action: 'MODIFICA TURNI', details: `Aggiornato planning di [${opNick}]`, operator: authUser
            });
            window.respApp.showToast("Planning Settimanale Salvato con Successo!");
        });
    },

    // --- AUTOPILOTA IA GLOBALE (PER TUTTA LA STRUTTURA) ---
    runGlobalAutopilot: function() {
        const sid = window.respApp.currentStructId;
        if(!sid) return window.respApp.showToast("Seleziona Struttura!");
        
        const limitCabine = parseInt(document.getElementById('adm_max_cabine').value) || 5;
        const allUsers = Object.values(window.respApp.users).filter(u => u.structureId === sid);
        if(allUsers.length === 0) return window.respApp.showToast("Nessun operatore trovato.");

        const dw = this.turniDate.getDay(); const diff = this.turniDate.getDate() - dw + (dw === 0 ? -6 : 1);
        const sw = new Date(this.turniDate); sw.setDate(diff);
        
        let promises = [];
        
        // Per ogni giorno della settimana
        for(let i=0; i<7; i++) {
            const cd = new Date(sw); cd.setDate(sw.getDate() + i); 
            const ds = `${cd.getFullYear()}-${String(cd.getMonth()+1).padStart(2,'0')}-${String(cd.getDate()).padStart(2,'0')}`;
            const dayOfWeek = cd.getDay();

            let morningCount = 0; let afternoonCount = 0;

            allUsers.forEach(u => {
                const ref = window.respApp.dataRef.child(`${sid}/turni/${ds}/${u.nick}`);
                
                // Regola Base: Domenica e Lunedi (o a rotazione) Riposo per evitare overbooking
                if(dayOfWeek === 0) { 
                    promises.push(ref.remove()); return; 
                }

                let pref = u.pref_turni || 'qualsiasi';
                let assigned = false;

                if(pref === 'mattina' || pref === 'qualsiasi') {
                    if(morningCount < limitCabine) {
                        promises.push(ref.set({ type: 'lavoro', preset: 'mattina', start: PRESETS['mattina'].s1, end: PRESETS['mattina'].e1, start2: '', end2: '' }));
                        morningCount++; assigned = true;
                    }
                }
                
                if(!assigned && (pref === 'pomeriggio' || pref === 'qualsiasi')) {
                    if(afternoonCount < limitCabine) {
                        promises.push(ref.set({ type: 'lavoro', preset: 'pomeriggio', start: PRESETS['pomeriggio'].s1, end: PRESETS['pomeriggio'].e1, start2: '', end2: '' }));
                        afternoonCount++; assigned = true;
                    }
                }

                // Se tutto pieno, Turno Spezzato per coprire i buchi, oppure Riposo Obbligato
                if(!assigned) {
                    if(morningCount < limitCabine && afternoonCount < limitCabine) {
                        promises.push(ref.set({ type: 'lavoro', preset: 'spezzato', start: PRESETS['spezzato'].s1, end: PRESETS['spezzato'].e1, start2: PRESETS['spezzato'].s2, end2: PRESETS['spezzato'].e2 }));
                        morningCount++; afternoonCount++;
                    } else {
                        promises.push(ref.set({ type: 'libero' })); // Riposo forzato per limite cabine
                    }
                }
            });
        }

        Promise.all(promises).then(() => {
            const authUser = localStorage.getItem("tw_user") || "Admin Master";
            window.respApp.dataRef.child(`${sid}/audit_logs`).push({
                date: new Date().toLocaleString('it-IT'), timestamp: Date.now(),
                action: 'AUTOPILOTA IA', details: `Generato planning settimanale per intero team. Max ${limitCabine} op/turno.`, operator: authUser
            });
            window.respApp.showToast("🪄 Pianificazione IA Globale Completata!");
            if(this.currentOpNick) this.loadWeekData(); // Refresh UI
        });
    },

    // --- EXPORT PDF PROFESSIONALE ---
    openExportModal: function() {
        document.getElementById('pdfExportModal').style.display = 'flex';
    },

    exportPDF: function(type) {
        const sid = window.respApp.currentStructId;
        const structName = window.respApp.structures[sid]?.name || "Struttura";
        
        const dw = this.turniDate.getDay(); const diff = this.turniDate.getDate() - dw + (dw === 0 ? -6 : 1);
        const sw = new Date(this.turniDate); sw.setDate(diff); const ew = new Date(sw); ew.setDate(sw.getDate() + 6);
        const periodStr = `Dal ${sw.toLocaleDateString('it-IT')} al ${ew.toLocaleDateString('it-IT')}`;

        window.respApp.dataRef.child(`${sid}/turni`).once('value').then(snap => {
            const allT = snap.val() || {};
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF(type === 'team' ? 'landscape' : 'portrait');
            
            doc.setFontSize(20);
            doc.text(`Planning Turni - ${structName}`, 14, 22);
            doc.setFontSize(11);
            doc.setTextColor(100);
            doc.text(`Settimana: ${periodStr}`, 14, 30);

            if(type === 'single') {
                if(!this.currentOpNick) return window.respApp.showToast("Seleziona prima un operatore!");
                doc.text(`Operatore: ${this.currentOpNick}`, 14, 36);
                
                const tableData = [];
                for(let i=0; i<7; i++) {
                    const cd = new Date(sw); cd.setDate(sw.getDate() + i); 
                    const ds = `${cd.getFullYear()}-${String(cd.getMonth()+1).padStart(2,'0')}-${String(cd.getDate()).padStart(2,'0')}`;
                    const shift = allT[ds] && allT[ds][this.currentOpNick] ? allT[ds][this.currentOpNick] : null;
                    let val = "RIPOSO";
                    if(shift && shift.type === 'lavoro') val = `${shift.start}-${shift.end} ${shift.start2 ? '\n'+shift.start2+'-'+shift.end2 : ''}`;
                    else if(shift && shift.type === 'malattia') val = "MALATTIA";
                    tableData.push([cd.toLocaleDateString('it-IT', {weekday:'long', day:'2-digit', month:'2-digit'}), val]);
                }
                
                doc.autoTable({
                    startY: 45,
                    head: [['Giorno', 'Orario / Stato']],
                    body: tableData,
                    theme: 'grid',
                    headStyles: { fillColor: [168, 85, 247] }
                });
                doc.save(`Turni_${this.currentOpNick}_${sw.getTime()}.pdf`);

            } else {
                // TEAM MATRIX
                const users = Object.values(window.respApp.users).filter(u => u.structureId === sid).map(u => u.nick);
                const head = ['Operatore'];
                const body = [];
                
                const dateKeys = [];
                for(let i=0; i<7; i++) {
                    const cd = new Date(sw); cd.setDate(sw.getDate() + i); 
                    head.push(cd.toLocaleDateString('it-IT', {weekday:'short', day:'2-digit'}));
                    dateKeys.push(`${cd.getFullYear()}-${String(cd.getMonth()+1).padStart(2,'0')}-${String(cd.getDate()).padStart(2,'0')}`);
                }

                users.forEach(nick => {
                    const row = [nick];
                    dateKeys.forEach(ds => {
                        const shift = allT[ds] && allT[ds][nick] ? allT[ds][nick] : null;
                        let val = "RIP";
                        if(shift && shift.type === 'lavoro') val = `${shift.start}-${shift.end} ${shift.start2 ? '\n'+shift.start2+'-'+shift.end2 : ''}`;
                        else if(shift && shift.type === 'malattia') val = "MAL";
                        row.push(val);
                    });
                    body.push(row);
                });

                doc.autoTable({
                    startY: 40,
                    head: [head],
                    body: body,
                    theme: 'grid',
                    styles: { fontSize: 8, cellPadding: 2, halign: 'center' },
                    headStyles: { fillColor: [168, 85, 247], halign: 'center' }
                });
                doc.save(`Planning_Team_${structName}_${sw.getTime()}.pdf`);
            }
            
            document.getElementById('pdfExportModal').style.display = 'none';
        });
    },

    // --- GRAFICO 3D CSS ---
    open3DGraph: function() {
        const sid = window.respApp.currentStructId;
        if(!sid) return;

        const limitCabine = parseInt(document.getElementById('adm_max_cabine').value) || 5;
        const dw = this.turniDate.getDay(); const diff = this.turniDate.getDate() - dw + (dw === 0 ? -6 : 1);
        const sw = new Date(this.turniDate); sw.setDate(diff);

        window.respApp.dataRef.child(`${sid}/turni`).once('value').then(snap => {
            const allT = snap.val() || {};
            const area = document.getElementById('graph3DArea');
            area.innerHTML = `<div class="glass-ceiling" style="bottom: ${(limitCabine * 25) + 20}px;"></div>`;

            for(let i=0; i<7; i++) {
                const cd = new Date(sw); cd.setDate(sw.getDate() + i); 
                const ds = `${cd.getFullYear()}-${String(cd.getMonth()+1).padStart(2,'0')}-${String(cd.getDate()).padStart(2,'0')}`;
                
                let activeCount = 0;
                if(allT[ds]) {
                    Object.values(allT[ds]).forEach(shift => {
                        if(shift.type === 'lavoro') activeCount++;
                    });
                }

                const isDanger = activeCount > limitCabine;
                const h = activeCount * 25; // 25px per operatore

                area.innerHTML += `
                <div class="bar-3d-wrap">
                    <span class="bar-label">${activeCount}</span>
                    <div class="bar-3d ${isDanger?'danger':''}" style="height:${h}px;"></div>
                    <span class="bar-label">${cd.toLocaleDateString('it-IT', {weekday:'short'})}</span>
                </div>`;
            }

            document.getElementById('graph3DModal').style.display = 'flex';
        });
    }
};