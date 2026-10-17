/* Logic Manager v3.0 - Blue Toast, Calendario & Orari Dinamici */

function showBlueToast(msg) {
    const x = document.getElementById("toastBlue");
    const txt = document.getElementById("toastMsg");
    txt.innerText = msg;
    x.className = "show";
    setTimeout(function(){ x.className = x.className.replace("show", ""); }, 3000);
}

function tToMin(timeStr) {
    if(!timeStr || typeof timeStr !== 'string') return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h * 60) + m;
}

function mToT(m) { 
    return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`; 
}

// LOGICA CALENDARIO
function changePoolDate(offset) {
    const p = document.getElementById("poolDate");
    const d = new Date(p.value); 
    d.setDate(d.getDate() + offset);
    p.value = d.toISOString().split('T')[0];
    loadPoolData();
}

function getDayOfWeek(dateString) {
    let d = new Date(dateString).getDay();
    return d === 0 ? 7 : d; // 1=Lunedì, 7=Domenica
}

// GENERAZIONE SLOT DINAMICI IN BASE ALLE IMPOSTAZIONI
function generateDynamicSlots(dateStr) {
    const dayIdx = getDayOfWeek(dateStr);
    const orariP = dbOrari.piscina[dayIdx];
    const orariS = dbOrari.spa[dayIdx];
    
    let slotsSet = new Set();
    
    // Funzione che inserisce in lista tutti gli orari aperti
    const addSlots = (orari) => {
        if(!orari || !orari.active) return;
        if(orari.m_in && orari.m_out) {
            for(let i = tToMin(orari.m_in); i < tToMin(orari.m_out); i += 60) {
                slotsSet.add(mToT(Math.floor(i/60)*60)); // Arrotonda all'ora spaccata
            }
        }
        if(orari.p_in && orari.p_out) {
            for(let i = tToMin(orari.p_in); i < tToMin(orari.p_out); i += 60) {
                slotsSet.add(mToT(Math.floor(i/60)*60));
            }
        }
    };
    
    addSlots(orariP);
    addSlots(orariS);
    
    // Ritorna la lista unificata e ordinata
    let sortedSlots = Array.from(slotsSet).sort((a,b) => tToMin(a) - tToMin(b));
    return sortedSlots;
}


function loadPoolData() {
    const d = document.getElementById("poolDate").value;
    const list = Array.isArray(poolData[d]) ? poolData[d] : [];
    
    // RENDER LISTA
    list.sort((a,b) => (a.ora || "").localeCompare(b.ora || ""));
    const grid = document.getElementById("poolGrid");
    grid.innerHTML = "";

    list.forEach(item => {
        const badgeClass = item.area === "SPA" ? "bg-spa" : (item.area === "Esterni" ? "bg-out" : "bg-pool");
        const checkClass = item.checked ? "checked" : "";
        const checkIcon = item.checked ? "check_circle" : "login";
        const checkText = item.checked ? "SI" : "NO"; 

        const row = `
            <div class="row">
                <div style="font-weight:bold">${item.ora}</div>
                <div><b>${item.cam}</b></div>
                <div>${item.cog}</div>
                <div style="text-align:center">${item.pers}</div>
                <div><span class="badge ${badgeClass}">${item.area}</span></div>
                <div>
                    <button class="btn-check ${checkClass}" onclick="toggleCheckIn('${item.id}')">
                        <i class="material-icons-round" style="font-size:14px">${checkIcon}</i> ${checkText}
                    </button>
                </div>
                <div><button class="btn-icon" onclick="editEntry('${item.id}')"><i class="material-icons-round" style="color:#f59e0b">edit</i></button></div>
                <div><button class="btn-icon" onclick="deleteEntry('${item.id}')"><i class="material-icons-round" style="color:#ef4444">delete</i></button></div>
            </div>
        `;
        grid.innerHTML += row;
    });

    // RENDER TABELLA ORARIA (Ora è dinamica)
    const slotTable = document.getElementById("slotTable");
    slotTable.innerHTML = "";

    const dynamicSlots = generateDynamicSlots(d);

    if (dynamicSlots.length === 0) {
        slotTable.innerHTML = "<tr><td colspan='5' style='padding:20px; color:#ef4444;'>Struttura Chiusa o Orari Non Impostati</td></tr>";
        return;
    }

    dynamicSlots.forEach(slot => {
        const slotStart = tToMin(slot);
        const slotEnd = slotStart + 60; 
        
        let pPisc = 0, pSpa = 0, pTot = 0, pCheck = 0;

        list.forEach(item => {
            const nPers = Number(item.pers); 
            if (isNaN(nPers) || nPers <= 0) return;

            const entryStart = tToMin(item.ora);
            const entryEnd = entryStart + 120; // 2 ore logica di base
            const overlap = Math.max(entryStart, slotStart) < Math.min(entryEnd, slotEnd);

            if (overlap) {
                pTot += nPers;
                if (item.area === "SPA") pSpa += nPers;
                else if (item.area === "Piscina") pPisc += nPers;
                if (item.checked === true) pCheck += nPers;
            }
        });

        const bgRow = pTot > 0 ? "background:#f0f9ff" : "";
        const wBold = pTot > 0 ? "font-weight:bold; color:#0f172a" : "opacity:0.5";
        const checkColor = pCheck > 0 ? "var(--green)" : "inherit";

        slotTable.innerHTML += `
            <tr style="${bgRow}; ${wBold}">
                <td>${slot}</td>
                <td>${pPisc > 0 ? pPisc : '-'}</td>
                <td>${pSpa > 0 ? pSpa : '-'}</td>
                <td style="font-size:13px">${pTot > 0 ? pTot : '-'}</td>
                <td style="color:${checkColor}">${pCheck > 0 ? pCheck : '-'}</td>
            </tr>
        `;
    });
}


// LOGICA PANNELLO IMPOSTAZIONI ORARI
let currentSetService = 'piscina';
const giorniNomi = { 1:'Lunedì', 2:'Martedì', 3:'Mercoledì', 4:'Giovedì', 5:'Venerdì', 6:'Sabato', 7:'Domenica' };

function openSettingsModal() {
    document.getElementById("settingsOverlay").style.display = "flex";
    renderSettingsDays();
}

function closeSettingsModal() {
    document.getElementById("settingsOverlay").style.display = "none";
}

function switchSettingsService(srv) {
    currentSetService = srv;
    document.getElementById('set-tab-piscina').style.background = srv === 'piscina' ? 'var(--primary)' : 'transparent';
    document.getElementById('set-tab-piscina').style.color = srv === 'piscina' ? 'white' : 'var(--primary)';
    
    document.getElementById('set-tab-spa').style.background = srv === 'spa' ? 'var(--primary)' : 'transparent';
    document.getElementById('set-tab-spa').style.color = srv === 'spa' ? 'white' : 'var(--primary)';
    renderSettingsDays();
}

function renderSettingsDays() {
    const cont = document.getElementById("daysContainer");
    let html = '';
    const data = dbOrari[currentSetService] || {};

    for(let i=1; i<=7; i++) {
        const d = data[i] || { active: false, m_in:"", m_out:"", p_in:"", p_out:"" };
        const checked = d.active ? 'checked' : '';
        const display = d.active ? 'flex' : 'none';

        html += `
        <div style="border:1px solid var(--line); border-radius:8px; padding:12px; margin-bottom:10px; background:#f8fafc;">
            <div style="display:flex; justify-content:space-between; align-items:center; font-weight:bold; color:var(--primary); margin-bottom:5px;">
                <span style="text-transform:uppercase; font-size:12px;">${giorniNomi[i]}</span>
                <label style="display:flex; align-items:center; gap:5px; cursor:pointer; font-size:11px; color:#64748b;">
                    <input type="checkbox" id="set_act_${i}" ${checked} onchange="toggleDaySettings(${i})"> Aperto
                </label>
            </div>
            <div id="set_times_${i}" style="display:${display}; flex-direction:column; gap:8px; margin-top:10px; border-top:1px solid var(--line); padding-top:10px;">
                <div style="display:flex; gap:10px; align-items:center;">
                    <span style="font-size:10px; font-weight:bold; width:35px; color:#64748b;">MAT</span>
                    <input type="time" id="set_m_in_${i}" value="${d.m_in}" style="margin:0; flex:1;">
                    <input type="time" id="set_m_out_${i}" value="${d.m_out}" style="margin:0; flex:1;">
                </div>
                <div style="display:flex; gap:10px; align-items:center;">
                    <span style="font-size:10px; font-weight:bold; width:35px; color:#64748b;">POM</span>
                    <input type="time" id="set_p_in_${i}" value="${d.p_in}" style="margin:0; flex:1;">
                    <input type="time" id="set_p_out_${i}" value="${d.p_out}" style="margin:0; flex:1;">
                </div>
            </div>
        </div>`;
    }
    cont.innerHTML = html;
}

function toggleDaySettings(dayIdx) {
    const isAct = document.getElementById(`set_act_${dayIdx}`).checked;
    document.getElementById(`set_times_${dayIdx}`).style.display = isAct ? 'flex' : 'none';
}

function saveSettings() {
    let newData = {};
    for(let i=1; i<=7; i++) {
        newData[i] = {
            active: document.getElementById(`set_act_${i}`).checked,
            m_in: document.getElementById(`set_m_in_${i}`).value,
            m_out: document.getElementById(`set_m_out_${i}`).value,
            p_in: document.getElementById(`set_p_in_${i}`).value,
            p_out: document.getElementById(`set_p_out_${i}`).value
        };
    }
    
    dbOrari[currentSetService] = newData;
    // Salva su Firebase
    firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + localStorage.getItem("tw_structure_id") + '/settings/orari_moduli').set(dbOrari).then(() => {
        showBlueToast("Orari Salvati!");
        loadPoolData();
        closeSettingsModal();
    });
}


// LOGICA CRUD APPUNTAMENTI
function editEntry(id) {
    const d = document.getElementById("poolDate").value;
    const item = (poolData[d] || []).find(x => x.id === id);
    if(!item) return;

    document.getElementById("pId").value = item.id;
    document.getElementById("pOra").value = item.ora;
    document.getElementById("pCam").value = item.cam;
    document.getElementById("pCog").value = item.cog;
    document.getElementById("pPers").value = item.pers;
    document.getElementById("pArea").value = item.area;
    document.getElementById("pNote").value = item.note || "";

    const btn = document.getElementById("btnSave");
    btn.innerText = "AGGIORNA";
    btn.classList.add("editing");
    document.getElementById("formTitle").innerText = "MODIFICA IN CORSO";
    document.getElementById("btnCancel").style.display = "block";
}

function resetForm() {
    document.getElementById("pId").value = "";
    document.getElementById("pCam").value = "";
    document.getElementById("pCog").value = "";
    document.getElementById("pNote").value = "";
    document.getElementById("pPers").value = "2";
    const now = new Date();
    document.getElementById("pOra").value = now.toTimeString().split(' ')[0].substring(0,5);

    const btn = document.getElementById("btnSave");
    btn.innerText = "SALVA";
    btn.classList.remove("editing");
    document.getElementById("formTitle").innerText = "NUOVO INGRESSO (2H)";
    document.getElementById("btnCancel").style.display = "none";
}

function addEntry() {
    const d = document.getElementById("poolDate").value;
    const id = document.getElementById("pId").value;
    const ora = document.getElementById("pOra").value;
    
    if(!ora) { showBlueToast("Errore: Orario mancante"); return; }
    if(!document.getElementById("pCam").value) { showBlueToast("Errore: Camera mancante"); return; }

    if (!poolData[d]) poolData[d] = [];

    let isChecked = false;
    if(id) {
        const existing = poolData[d].find(x => x.id === id);
        if(existing) isChecked = existing.checked;
    }

    const entry = {
        id: id ? id : "P" + Date.now(),
        ora: ora,
        cam: document.getElementById("pCam").value,
        cog: document.getElementById("pCog").value,
        pers: parseInt(document.getElementById("pPers").value) || 0,
        area: document.getElementById("pArea").value,
        note: document.getElementById("pNote").value,
        checked: isChecked
    };

    if(id) {
        poolData[d] = poolData[d].filter(x => x.id !== id);
        poolData[d].push(entry);
        savePoolEntry(d, null, true);
        showBlueToast("Appuntamento Modificato");
    } else {
        savePoolEntry(d, entry, false);
        showBlueToast("Nuovo Inserimento Creato");
    }
    
    resetForm();
}

function toggleCheckIn(id) {
    const d = document.getElementById("poolDate").value;
    if(!poolData[d]) return;
    const item = poolData[d].find(x => x.id === id);
    if(item) { 
        item.checked = !item.checked; 
        savePoolEntry(d, null, true);
    }
}

function deleteEntry(id) { 
    const d = document.getElementById("poolDate").value; 
    removePoolEntry(d, id); 
    if(document.getElementById("pId").value === id) resetForm();
    showBlueToast("Appuntamento Eliminato");
}

function searchRoom() {
    const cam = document.getElementById("searchCam").value;
    if(!cam) { showBlueToast("Inserisci Camera"); return; }
    const d = document.getElementById("poolDate").value;
    const list = poolData[d] || [];
    const found = list.filter(x => x.cam == cam);
    
    const mBtns = document.getElementById("modalBtns");
    const modal = document.getElementById("actionModal");
    mBtns.innerHTML = ""; 

    if(found.length > 0) {
        document.getElementById("modalTitle").innerText = `Camera ${cam} TROVATA`;
        document.getElementById("modalMsg").innerText = `Ci sono ${found.length} prenotazioni.`;
        
        found.forEach(item => {
            const status = item.checked ? "GIA' DENTRO" : "FAI CHECK-IN";
            const color = item.checked ? "#94a3b8" : "var(--green)";
            mBtns.innerHTML += `
                <div style="border:1px solid #eee; padding:10px; border-radius:8px; margin-bottom:5px; background:#f8fafc; text-align:left">
                    <div style="font-size:11px; font-weight:bold">${item.ora} - ${item.area} (${item.pers} pax)</div>
                    <button class="modal-btn" style="background:${color}; color:white; margin-top:5px; padding:8px" 
                            onclick="forceCheckIn('${item.id}')">${status}</button>
                </div>
            `;
        });
        mBtns.innerHTML += `<button class="modal-btn" style="background:var(--gold); margin-top:10px" onclick="prefillNew('${cam}')">AGGIUNGI NUOVO ORARIO</button>`;
    } else {
        document.getElementById("modalTitle").innerText = `Camera ${cam}`;
        document.getElementById("modalMsg").innerText = "Nessun accesso registrato oggi.";
        mBtns.innerHTML = `<button class="modal-btn" style="background:var(--primary); color:white" onclick="prefillNew('${cam}')">CREA INGRESSO</button>`;
    }
    modal.style.display = "flex";
}

function forceCheckIn(id) { toggleCheckIn(id); closeModal(); showBlueToast("Check-in Effettuato"); }
function prefillNew(cam) { resetForm(); document.getElementById("pCam").value = cam; document.getElementById("pCam").focus(); closeModal(); }
function closeModal() { document.getElementById("actionModal").style.display = "none"; }