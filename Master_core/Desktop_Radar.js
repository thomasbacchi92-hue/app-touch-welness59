/* master core/Desktop_Radar.js - Motore di Ricerca e Spostamento Rapido (Desktop) - AUTO INIEZIONE HTML */

// 1. INIEZIONE FORZATA DELLE MODALI (Previene i crash se l'HTML manca)
window.addEventListener('DOMContentLoaded', () => {
    if(!document.getElementById('searchEngineModal')) {
        const searchModalHtml = `
        <div id="searchEngineModal" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:4000; align-items:center; justify-content:center; backdrop-filter:blur(4px); padding:15px;" onclick="if(event.target===this) this.style.display='none'">
            <div class="modal-box large-modal" style="background:var(--bg-panel); padding:0; border-radius:16px; max-width:900px; width:95%; border:1px solid var(--border-line); box-shadow:0 10px 40px rgba(0,0,0,0.8); max-height:85vh; display:flex; flex-direction:column; overflow:hidden;">
                
                <div style="background:linear-gradient(135deg, var(--bg-panel) 0%, rgba(56, 189, 248, 0.1) 100%); padding:20px 25px; border-bottom:1px solid var(--border-line); display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
                    <div>
                        <h2 style="margin:0; color:var(--accent); font-size:20px; text-transform:uppercase; display:flex; align-items:center; gap:10px;">
                            <i class="material-icons-round" style="font-size:28px;">radar</i> MOTORE DI RICERCA CABINE
                        </h2>
                        <div style="font-size:11px; color:var(--text-muted); margin-top:5px; font-weight:bold; letter-spacing:0.5px;">TROVA IL PRIMO SLOT LIBERO INCROCIANDO ORARI E OPERATORI</div>
                    </div>
                    <button type="button" style="font-size:28px; border:none; background:transparent; color:var(--text-muted); cursor:pointer; transition:0.2s;" onclick="document.getElementById('searchEngineModal').style.display='none'" onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--text-muted)'"><i class="material-icons-round">close</i></button>
                </div>

                <div style="padding:25px; display:flex; flex-direction:column; gap:20px; flex:1; overflow-y:auto; background:var(--bg-body);">
                    <div style="background:var(--bg-panel); padding:20px; border-radius:12px; border:1px solid var(--border-line); display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:15px; flex-shrink:0;">
                        
                        <div class="form-group-modal" style="margin:0;">
                            <label><i class="material-icons-round" style="font-size:12px; vertical-align:middle; color:var(--accent);">calendar_today</i> Data Ricerca</label>
                            <input type="date" id="sDate" class="filter-input" style="width:100%; padding:10px; background-image:none;">
                        </div>
                        <div class="form-group-modal" style="margin:0;">
                            <label><i class="material-icons-round" style="font-size:12px; vertical-align:middle; color:var(--gold);">timer</i> Durata (Min)</label>
                            <input type="number" id="sDur" class="filter-input" value="30" step="10" style="width:100%; padding:10px; background-image:none;">
                        </div>
                        <div class="form-group-modal" style="margin:0;">
                            <label><i class="material-icons-round" style="font-size:12px; vertical-align:middle; color:var(--purple);">person</i> Filtro Operatore</label>
                            <select id="sOpSearch" class="filter-select" style="width:100%; padding:10px;"><option value="">Qualsiasi</option></select>
                        </div>
                        <div class="form-group-modal" style="margin:0;">
                            <label><i class="material-icons-round" style="font-size:12px; vertical-align:middle; color:var(--green);">wc</i> Genere Desiderato</label>
                            <select id="sGender" class="filter-select" style="width:100%; padding:10px;">
                                <option value="">Qualsiasi (Uomo o Donna)</option>
                                <option value="F">Solo Personale Femminile</option>
                                <option value="M">Solo Personale Maschile</option>
                            </select>
                        </div>
                        <div class="form-group-modal" style="margin:0;">
                            <label>Da Ore</label>
                            <input type="time" id="sTimeStart" class="filter-input" value="10:00" style="width:100%; padding:10px; background-image:none;">
                        </div>
                        <div class="form-group-modal" style="margin:0;">
                            <label>Fino a Ore</label>
                            <input type="time" id="sTimeEnd" class="filter-input" value="20:00" style="width:100%; padding:10px; background-image:none;">
                        </div>

                    </div>
                    
                    <button class="btn-save" style="margin:0; padding:15px; font-size:14px;" onclick="sysExecuteSearch()">
                        <i class="material-icons-round">manage_search</i> AVVIA SCANSIONE ALGORITMICA
                    </button>
                    
                    <div id="searchResults" style="flex:1; display:flex; flex-direction:column; gap:10px;">
                        <div style="text-align:center; padding:50px; color:var(--text-muted); border:2px dashed var(--border-line); border-radius:12px; background:rgba(0,0,0,0.2);">
                            <i class="material-icons-round" style="font-size:48px; color:var(--accent); opacity:0.5; margin-bottom:10px;">satellite_alt</i>
                            <div style="font-weight:bold; font-size:14px;">Imposta i parametri e avvia la scansione.</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', searchModalHtml);
    }

    if(!document.getElementById('cabinChoiceModal')) {
        const cabinChoiceHtml = `
        <div id="cabinChoiceModal" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:4500; align-items:center; justify-content:center; padding:15px;" onclick="if(event.target===this) this.style.display='none'">
            <div class="modal-box" style="background:var(--bg-panel); padding:25px; border-radius:16px; width:100%; max-width:400px; border:1px solid var(--accent); box-shadow:0 0 30px rgba(56, 189, 248, 0.2);">
                <h3 id="cabinChoiceTimeLabel" style="color:var(--accent); margin-top:0; border-bottom:1px solid var(--border-line); padding-bottom:10px; font-size:16px; text-transform:uppercase;"><i class="material-icons-round" style="vertical-align:middle;">meeting_room</i> Appuntamenti Liberi</h3>
                <div id="cabinChoiceList" style="display:flex; flex-direction:column; gap:10px; margin-bottom:20px; max-height:300px; overflow-y:auto; padding-right:5px;"></div>
                <div style="display:flex; gap:10px;">
                    <button class="btn-save" style="flex:1;" onclick="sysConfirmCabinAndSearch()">CONFERMA ASSEGNAZIONE</button>
                    <button class="btn-save btn-outline" style="flex:1;" onclick="document.getElementById('cabinChoiceModal').style.display='none'">ANNULLA</button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', cabinChoiceHtml);
    }
});


// 2. MOTORE ALGORTMICO (Intatto rispetto all'originale)
window.sysOpenSearchEngine = function(isMove) {
    window.searchContextAppId = isMove ? document.getElementById("mId").value : null;
    if(isMove && typeof window.closeSidebar === 'function') window.closeSidebar(null, true);
    
    // Inizializzazione data corrente
    let baseDate = new Date().toISOString().split('T')[0];
    const mainDateEl = document.getElementById("mainDate");
    const dEl = document.getElementById("aDate");
    if (dEl && dEl.value) baseDate = dEl.value;
    else if (mainDateEl && mainDateEl.value) baseDate = mainDateEl.value;

    const sDate = document.getElementById("sDate");
    if(sDate) sDate.value = baseDate;

    // Popolamento operatori dal database globale (allUsersData)
    const selOp = document.getElementById("sOpSearch");
    if(selOp && window.allUsersData) {
        selOp.innerHTML = '<option value="">Qualsiasi</option>';
        Object.values(window.allUsersData).forEach(u => {
            const isGhost = (u.attivo === false || u.attiva === false || u.eliminato === true || u.deleted === true || u.attivo === "false" || u.attiva === "false" || u.eliminato === "true" || u.deleted === "true");
            if(String(u.structureId) === String(window.twStructId) && !isGhost) {
                selOp.innerHTML += `<option value="${u.nick}">${u.name} ${u.surname||''} (${u.nick})</option>`;
            }
        });
    }

    const modal = document.getElementById('searchEngineModal');
    if(modal) modal.style.display = 'flex';
};

window.sysExecuteSearch = function() {
    const d = document.getElementById('sDate').value;
    const dur = parseInt(document.getElementById('sDur').value) || 30;
    const reqOp = document.getElementById('sOpSearch').value;
    const reqGen = document.getElementById('sGender').value;
    const startH = document.getElementById('sTimeStart').value;
    const endH = document.getElementById('sTimeEnd').value;

    if(!d || !startH || !endH) { if(typeof window.showToast==='function') window.showToast("Compila data e orari."); return; }

    const sMin = window.tToM(startH);
    const eMin = window.tToM(endH);
    
    let activeCabins = [];
    if (window.db && window.db.settings && window.db.settings.cabine_config) {
        let config = Array.isArray(window.db.settings.cabine_config) ? window.db.settings.cabine_config : Object.values(window.db.settings.cabine_config);
        config.forEach((cab, idx) => {
            if (cab.attiva !== false && cab.attiva !== "false") {
                activeCabins.push({ id: idx + 1, data: cab });
            }
        });
    } else {
        const num = (window.db && window.db.settings && window.db.settings.cabine) ? parseInt(window.db.settings.cabine) : 2;
        for(let i=1; i<=num; i++) activeCabins.push({ id: i, data: { attiva: true, start: "10:00", end: "20:00" } });
    }
    if(activeCabins.length === 0) activeCabins = [{ id: 1, data: { attiva: true } }, { id: 2, data: { attiva: true } }];

    let dayApps = (window.db && window.db.app && window.db.app[d]) ? window.normalizeFbArray(window.db.app[d]) : [];
    let freeSlots = [];
    
    let availableOps = window.allUsersData ? Object.values(window.allUsersData).filter(u => {
        const isGhost = (u.attivo === false || u.attiva === false || u.eliminato === true || u.deleted === true || u.attivo === "false" || u.attiva === "false" || u.eliminato === "true" || u.deleted === "true");
        if(String(u.structureId) !== String(window.twStructId) || isGhost) return false;
        if(reqOp && u.nick !== reqOp) return false;
        if(reqGen && u.gender !== reqGen && u.sesso !== reqGen) return false;
        return true;
    }) : [];

    activeCabins.forEach(cabObj => {
        let c = cabObj.id;
        let cStart = window.tToM(cabObj.data.orari ? cabObj.data.orari.start : "10:00");
        let cEnd = window.tToM(cabObj.data.orari ? cabObj.data.orari.end : "20:00");

        for(let t = sMin; t <= (eMin - dur); t += 15) {
            if (t < cStart || (t + dur) > cEnd) continue; 
            
            let collision = dayApps.some(a => {
                if(parseInt(a.cab) !== c) return false;
                const aStart = window.tToM(a.ora);
                const aEnd = aStart + (parseInt(a.dur) || 30) + 10;
                return (t < aEnd && (t + dur) > aStart);
            });
            
            if(!collision) {
                let validOpsForSlot = availableOps.filter(op => {
                    return !dayApps.some(a => {
                        if((a.op || '').toLowerCase() !== op.nick.toLowerCase()) return false;
                        const aStart = window.tToM(a.ora);
                        const aEnd = aStart + (parseInt(a.dur) || 30) + 10;
                        return (t < aEnd && (t + dur) > aStart);
                    });
                });

                if(validOpsForSlot.length > 0) {
                    freeSlots.push({ time: window.mToT(t), cab: c, ops: validOpsForSlot });
                }
            }
        }
    });

    const resBox = document.getElementById('searchResults');
    if(!resBox) return;
    
    resBox.innerHTML = "";

    if(freeSlots.length === 0) {
        resBox.innerHTML = `<div style="text-align:center; padding:50px; color:var(--red);">
            <i class="material-icons-round" style="font-size:48px; opacity:0.5; margin-bottom:10px;">search_off</i>
            <h3>Nessuno slot trovato</h3>
            <p style="font-size:13px;">Prova a cambiare operatore, orario o durata.</p>
        </div>`;
        return;
    }

    let grouped = {};
    freeSlots.forEach(s => {
        if(!grouped[s.time]) grouped[s.time] = [];
        grouped[s.time].push(s);
    });

    Object.keys(grouped).sort().forEach(time => {
        let row = document.createElement('div');
        row.style.cssText = "background:var(--bg-body); border:1px solid var(--border-line); border-radius:12px; padding:15px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; transition:0.2s;";
        
        let cabinsInfo = grouped[time].map(x => `Cabina ${x.cab}`).join(" - ");
        let opAvailCount = grouped[time][0].ops.length;

        row.innerHTML = `
            <div style="display:flex; align-items:center; gap:15px;">
                <div style="background:var(--accent); color:#000; width:50px; height:50px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:16px; box-shadow:0 4px 10px rgba(0,0,0,0.2);">
                    ${time}
                </div>
                <div>
                    <div style="font-weight:bold; font-size:14px; color:var(--text-main); margin-bottom:4px;">Disponibile</div>
                    <div style="font-size:11px; color:var(--text-muted);">
                        <span style="display:inline-block; margin-right:10px;"><i class="material-icons-round" style="font-size:12px; vertical-align:middle; color:var(--gold);">meeting_room</i> ${cabinsInfo}</span>
                        <span><i class="material-icons-round" style="font-size:12px; vertical-align:middle; color:var(--green);">person</i> ${opAvailCount} Op. Liberi</span>
                    </div>
                </div>
            </div>
            <button class="btn-save" style="width:auto; margin:0; padding:10px 20px; font-size:12px;" onclick="sysAssignFoundSlot('${d}', '${time}', '${encodeURIComponent(JSON.stringify(grouped[time]))}')">SCEGLI</button>
        `;
        resBox.appendChild(row);
    });
};

window.sysAssignFoundSlot = function(date, time, groupDataRaw) {
    let groupData = JSON.parse(decodeURIComponent(groupDataRaw));
    const listUI = document.getElementById('cabinChoiceList');
    if(!listUI) return;
    
    listUI.innerHTML = "";
    const lbl = document.getElementById('cabinChoiceTimeLabel');
    if(lbl) lbl.innerText = `Appuntamenti liberi alle ore ${time}`;
    
    groupData.forEach((slot, index) => {
        let opsNames = slot.ops.map(o => o.nick).join(", ");
        listUI.innerHTML += `
            <div style="background:var(--bg-body); border:1px solid var(--border-line); border-radius:10px; padding:10px 15px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <b style="color:var(--text-main); font-size:14px;">Cabina ${slot.cab}</b><br>
                    <span style="color:var(--text-muted); font-size:10px;">Op: ${opsNames}</span>
                </div>
                <label style="cursor:pointer;">
                    <input type="radio" name="radarCabRadio" value="${slot.cab}" style="accent-color:var(--accent); width:18px; height:18px;" ${index===0 ? 'checked' : ''}>
                </label>
            </div>
        `;
    });
    
    window.tempAssignTime = time;
    window.tempAssignDate = date;
    const cabModal = document.getElementById('cabinChoiceModal');
    if(cabModal) cabModal.style.display = 'flex';
};

window.sysConfirmCabinAndSearch = function() {
    const time = window.tempAssignTime;
    const date = window.tempAssignDate;
    
    let selectedCab = null;
    let radios = document.getElementsByName("radarCabRadio");
    for(let i=0; i<radios.length; i++) { if(radios[i].checked) { selectedCab = radios[i].value; break; } }
    if(!selectedCab) { if(typeof window.showToast==='function') window.showToast("Seleziona una cabina."); return; }

    const cabModal = document.getElementById('cabinChoiceModal');
    if(cabModal) cabModal.style.display = 'none';
    const searchModal = document.getElementById('searchEngineModal');
    if(searchModal) searchModal.style.display = 'none';

    if(window.searchContextAppId) {
        const appId = window.searchContextAppId;
        const appRoot = firebase.database().ref(`MASTER_ADMIN_DB/structures_data/${window.twStructId}/app/${date}`);
        appRoot.once('value').then(snap => {
            let apps = typeof window.normalizeFbArray === 'function' ? window.normalizeFbArray(snap.val()) : [];
            const idx = apps.findIndex(x => x.id === appId);
            if(idx > -1) {
                apps[idx].ora = time;
                apps[idx].cab = parseInt(selectedCab);
                appRoot.set(apps).then(() => {
                    if(typeof window.showToast==='function') window.showToast("Spostamento Rapido Eseguito!");
                    if(typeof window.render === 'function') window.render();
                    window.searchContextAppId = null;
                });
            }
        });
    } else {
        const mainDateEl = document.getElementById("mainDate");
        if(mainDateEl && mainDateEl.value !== date) {
            mainDateEl.value = date;
            if(typeof window.sysUpdateFakeDate === 'function') window.sysUpdateFakeDate();
            if(typeof window.render === 'function') window.render();
        }
        
        // Verifica se siamo in un contesto in cui sysOpenSlot esiste (cioè in Agenda principale)
        // Se non esiste, forziamo il redirect in agenda mantenendo data e cabina (opzionale)
        if(typeof window.sysOpenSlot === 'function') {
            window.sysOpenSlot(time, selectedCab);
        } else {
            // Se siamo in Lista, naviga all'Agenda per poter aprire lo slot
            const path = window.location.pathname.toLowerCase();
            const base = (path.includes('/funzioni')) ? '../' : './';
            if(typeof window.showToast==='function') window.showToast(`Posto trovato. Torna in Agenda per prenotare.`);
            setTimeout(() => { window.location.href = base + 'index.html'; }, 1000);
        }
    }
};