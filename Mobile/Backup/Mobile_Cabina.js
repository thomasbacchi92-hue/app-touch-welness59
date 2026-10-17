/* Mobile_Cabina.js - Assistente Cabina (Filtro Tollerante & Data Picker Nativo) */

let cabTimerInterval = null; 
let cabSecondsLeft = 50 * 60; 
let cabIsRunning = false; 
let cabOriginalSeconds = 50 * 60;
let cabinaCurrentDate = null; 

function m_switchCabinaTab(tab) {
    document.querySelectorAll('.c-tab').forEach(e => e.classList.remove('active'));
    document.querySelectorAll('.c-tab-content').forEach(e => e.classList.remove('active'));
    document.getElementById('tab-btn-' + tab).classList.add('active');
    document.getElementById('c-tab-' + tab).classList.add('active');

    if(tab === 'cliente') {
        if(!cabinaCurrentDate) cabinaCurrentDate = document.getElementById('mainDate').value || new Date().toISOString().split('T')[0];
        m_renderMyClients();
    }
}

function cabinaCustomTimer() {
    const m = prompt("Inserisci i minuti personalizzati per il Timer:");
    if(m && !isNaN(m) && m > 0) { cabinaSetTimer(parseInt(m)); } else { if(m !== null) showToast("Inserisci un numero valido."); }
}

function cabinaSetTimer(minutes) { 
    cabOriginalSeconds = minutes * 60; 
    cabSecondsLeft = cabOriginalSeconds; 
    cabinaUpdateDisplay(); 
}

function cabinaUpdateDisplay() { 
    const m = Math.floor(cabSecondsLeft / 60); const s = cabSecondsLeft % 60; 
    document.getElementById('cabinaTimerDisplay').innerText = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`; 
}

function cabinaToggleTimer() {
    const btn = document.getElementById('btnCabinaPlay'); const status = document.getElementById('cabinaTimerStatus'); const circle = document.getElementById('cabinaTimerCircle');
    
    if (cabIsRunning) {
        clearInterval(cabTimerInterval); cabIsRunning = false;
        btn.innerHTML = '<i class="material-icons-round" style="font-size:28px;">play_arrow</i>';
        status.innerText = "IN PAUSA"; status.style.color = "var(--gold)"; circle.classList.remove('running');
    } else {
        if (cabSecondsLeft <= 0) return showToast("Imposta un tempo valido.");
        cabIsRunning = true;
        btn.innerHTML = '<i class="material-icons-round" style="font-size:28px;">pause</i>';
        status.innerText = "IN ESECUZIONE"; status.style.color = "var(--green)"; circle.classList.add('running');
        
        cabTimerInterval = setInterval(() => {
            cabSecondsLeft--; cabinaUpdateDisplay();
            if (cabSecondsLeft <= 0) {
                clearInterval(cabTimerInterval); cabIsRunning = false;
                btn.innerHTML = '<i class="material-icons-round" style="font-size:28px;">play_arrow</i>';
                status.innerText = "TRATTAMENTO CONCLUSO"; status.style.color = "var(--accent)"; circle.classList.remove('running');
                if(navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 1000]); 
            }
        }, 1000);
    }
}

function cabinaResetTimer() {
    clearInterval(cabTimerInterval); cabIsRunning = false;
    document.getElementById('btnCabinaPlay').innerHTML = '<i class="material-icons-round" style="font-size:28px;">play_arrow</i>';
    document.getElementById('cabinaTimerStatus').innerText = "PRONTO"; document.getElementById('cabinaTimerStatus').style.color = "var(--accent)";
    document.getElementById('cabinaTimerCircle').classList.remove('running');
    cabSecondsLeft = cabOriginalSeconds; cabinaUpdateDisplay();
}

function m_changeCabinaDate(offset) {
    const d = new Date(cabinaCurrentDate); d.setDate(d.getDate() + offset);
    cabinaCurrentDate = d.toISOString().split('T')[0];
    m_renderMyClients();
}

function m_renderMyClients() {
    const cont = document.getElementById('c-tab-cliente');
    if(!cont) return;

    if(!uData) { cont.innerHTML = "<div style='text-align:center; padding:40px; color:var(--text-muted);'>Caricamento dati operatore in corso...</div>"; return; }
    
    let apps = [];
    if(typeof normalizeFbArray === 'function' && db && db.app) {
        apps = normalizeFbArray(db.app[cabinaCurrentDate]);
    }
    
    // OPERAZIONE NUOVA 1: Filtro Tollerante per l'operatore (ignora spazi extra e maiuscole)
    const myNick = String(uData.nick || "").trim().toLowerCase();
    const myName = String(uData.name || "").trim().toLowerCase();
    const localUser = String(localStorage.getItem("tw_user") || "").trim().toLowerCase();

    let myApps = apps.filter(a => {
        let opName = String(a.op || "").trim().toLowerCase();
        return opName === myNick || opName === myName || opName === localUser;
    });
    
    myApps.sort((a,b) => String(a.ora).localeCompare(String(b.ora)));

    // OPERAZIONE NUOVA 2: Contenitore data esteso e cliccabile per aprire il picker nativo
    let h = `
    <div style="background:var(--bg-body); padding:15px; border-bottom:1px solid var(--border-line);">
        <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-panel); padding:5px; border-radius:10px; border:1px solid var(--border-line);">
            <button style="background:var(--accent); color:#000; border:none; padding:8px; border-radius:8px; cursor:pointer; display:flex;" onclick="m_changeCabinaDate(-1)"><i class="material-icons-round">chevron_left</i></button>
            <div style="flex:1; display:flex; justify-content:center; align-items:center; padding:5px; cursor:pointer;" onclick="const d = document.getElementById('cabDateInput'); if(d && d.showPicker) d.showPicker();">
                <input type="date" id="cabDateInput" value="${cabinaCurrentDate}" onchange="cabinaCurrentDate=this.value; m_renderMyClients()" style="background:transparent; color:var(--text-main); border:none; font-weight:900; font-size:16px; text-align:center; outline:none; -webkit-appearance:none; width:130px; pointer-events:none;">
            </div>
            <button style="background:var(--accent); color:#000; border:none; padding:8px; border-radius:8px; cursor:pointer; display:flex;" onclick="m_changeCabinaDate(1)"><i class="material-icons-round">chevron_right</i></button>
        </div>
    </div>
    <div style="padding:15px;">
    `;

    if(myApps.length === 0) {
        h += `<div style='text-align:center; padding:40px; color:var(--text-muted); font-size:14px; line-height:1.5;'>
                 <i class='material-icons-round' style='font-size:50px; margin-bottom:15px; color:var(--border-line)'>event_busy</i><br>
                 Per la giornata di oggi non sono presenti nuovi clienti assegnati al tuo account.
              </div>`;
    } else {
        myApps.forEach(a => {
            const esegCss = a.eseguito ? "border-color:var(--green);" : "border-color:var(--border-line);";
            const icon = a.eseguito ? "<i class='material-icons-round' style='color:var(--green); font-size:14px;'>check_circle</i>" : "<i class='material-icons-round' style='color:var(--accent); font-size:14px;'>schedule</i>";
            
            h += `<div style="background:var(--bg-panel); border-left:4px solid var(--accent); ${esegCss} padding:15px; border-radius:10px; margin-bottom:12px; box-shadow:0 4px 10px rgba(0,0,0,0.2);">
                <div style="display:flex; justify-content:space-between; margin-bottom:8px; border-bottom:1px solid var(--border-line); padding-bottom:8px;">
                    <b style="font-size:18px; color:var(--text-main);">${icon} ${a.ora}</b>
                    <span style="font-size:12px; font-weight:bold; color:var(--text-muted); background:var(--bg-body); padding:2px 8px; border-radius:10px;">Cam: ${a.cam||'-'}</span>
                </div>
                <div style="font-size:15px; font-weight:bold; color:var(--text-main); margin-bottom:4px; text-transform:uppercase;">${a.cog||'Ospite'}</div>
                <div style="font-size:13px; color:var(--accent);">${a.serv||'-'}</div>
                ${a.note ? `<div style="margin-top:8px; font-size:11px; color:var(--gold); font-style:italic;">Nota: ${a.note}</div>` : ''}
            </div>`;
        });
    }
    h += `</div>`;
    
    cont.innerHTML = h;
}