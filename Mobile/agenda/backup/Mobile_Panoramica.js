/* agenda/agendaMobile_Search.js - Radar Raggruppato e Scelta Cabina */

document.addEventListener('DOMContentLoaded', function(){ m_injectSearchModal(); });

function m_injectSearchModal() {
    if(document.getElementById("searchEngineModal")) return;
    var modal = document.createElement('div');
    modal.id = "searchEngineModal";
    modal.style.cssText = "display:none; position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:10000; flex-direction:column; justify-content:flex-end;";
    var today = new Date().toISOString().split('T')[0];
    modal.innerHTML = `
        <div style="background:var(--bg-panel); width:100%; height:85vh; border-radius:20px 20px 0 0; display:flex; flex-direction:column; overflow:hidden;">
            <div style="padding:15px; border-bottom:1px solid var(--border-line); display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin:0; font-size:16px; color:var(--accent);" id="searchModalTitle"><i class="material-icons-round" style="vertical-align:middle;">radar</i> Trova Disponibilità</h3>
                <i class="material-icons-round" style="font-size:24px; color:var(--text-muted); cursor:pointer;" onclick="document.getElementById('searchEngineModal').style.display='none'">close</i>
            </div>
            <div style="padding:15px; overflow-y:auto; flex:1; background:var(--bg-body);" id="searchFormArea">
                <div id="searchSimpleDateBox" style="margin-bottom:15px;">
                    <label style="font-size:11px; font-weight:bold; color:var(--text-muted);">DATA RICERCA</label>
                    <input type="date" id="searchDate" value="${today}" style="width:100%; padding:12px; border:1px solid var(--border-line); background:var(--bg-panel); color:var(--text-main); border-radius:8px; margin-top:5px; font-size:14px; color-scheme: dark;">
                </div>
                <div style="margin-bottom:15px;">
                    <label style="font-size:11px; font-weight:bold; color:var(--text-muted);">DURATA TRATTAMENTO (MINUTI)</label>
                    <select id="searchDur" style="width:100%; padding:12px; border:1px solid var(--border-line); background:var(--bg-panel); color:var(--text-main); border-radius:8px; margin-top:5px; font-size:14px;">
                        <option value="15">15 Minuti</option><option value="30" selected>30 Minuti</option><option value="45">45 Minuti</option><option value="50">50 Minuti</option><option value="60">60 Minuti</option><option value="90">90 Minuti</option><option value="120">120 Minuti</option>
                    </select>
                </div>
                <div style="margin-bottom:15px;">
                    <label style="font-size:11px; font-weight:bold; color:var(--text-muted);">SESSO OPERATORE</label>
                    <select id="searchGender" style="width:100%; padding:12px; border:1px solid var(--border-line); background:var(--bg-panel); color:var(--text-main); border-radius:8px; margin-top:5px; font-size:13px;">
                        <option value="ALL">Indifferente (Tutti)</option>
                        <option value="M">Solo Maschile</option>
                        <option value="F">Solo Femminile</option>
                    </select>
                </div>
                <div style="margin-bottom:20px; display:flex; align-items:center; gap:10px; background:var(--bg-panel); padding:12px; border-radius:8px; border:1px solid var(--border-line);">
                    <input type="checkbox" id="searchOmitCleaning" style="width:20px; height:20px; accent-color:var(--accent);">
                    <label for="searchOmitCleaning" style="font-size:13px; font-weight:bold; color:var(--text-main); margin:0;">Ometti pulizia (Ignora +10 min)</label>
                </div>
                <button onclick="m_executeSearch()" style="width:100%; padding:15px; border-radius:8px; background:var(--accent); color:#000; border:none; font-weight:900; font-size:14px; cursor:pointer;">CERCA DISPONIBILITÀ</button>
                <div id="searchResultsArea" style="margin-top:20px; display:none;">
                    <h4 style="margin:0 0 10px 0; font-size:13px; color:var(--text-muted);">RISULTATI (Tocca un orario per scegliere cabina):</h4>
                    <div id="searchResultsList" style="display:flex; flex-direction:column; gap:8px;"></div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function m_openSearchEngine(isQuickMove) {
    var formSheet = document.getElementById("appFormSheet");
    var currentIdEl = document.getElementById("fId");
    
    if (isQuickMove && formSheet && formSheet.classList.contains("active") && currentIdEl && currentIdEl.value !== "") {
        window.searchContextAppId = currentIdEl.value;
        document.getElementById("searchModalTitle").innerHTML = `<i class="material-icons-round" style="vertical-align:middle; color:var(--gold);">event_note</i> Spostamento Rapido`;
    } else {
        window.searchContextAppId = null;
        document.getElementById("searchModalTitle").innerHTML = `<i class="material-icons-round" style="vertical-align:middle;">radar</i> Trova Disponibilità`;
    }
    document.getElementById('searchEngineModal').style.display = 'flex';
    document.getElementById('searchResultsArea').style.display = 'none';
}

function m_executeSearch() {
    var listUI = document.getElementById('searchResultsList');
    listUI.innerHTML = "<div style='text-align:center; padding:20px; color:var(--text-muted);'>Ricerca in corso...</div>";
    document.getElementById('searchResultsArea').style.display = 'block';

    setTimeout(function(){
        var dur = parseInt(document.getElementById('searchDur').value) || 30;
        var omitCleaning = document.getElementById('searchOmitCleaning').checked;
        var requiredTime = omitCleaning ? dur : dur + 10;
        var nCabine = (typeof db !== 'undefined' && db.settings && db.settings.cabine) ? parseInt(db.settings.cabine) : 5;

        var genderFilter = document.getElementById('searchGender').value;
        var validOps = [];
        if (genderFilter !== 'ALL') {
            var rawStaff = db.staff || [];
            var staffArr = Array.isArray(rawStaff) ? rawStaff : Object.values(rawStaff);
            validOps = staffArr.filter(function(s){ return s.sesso === genderFilter; }).map(function(s){ return s.nome; });
            if(validOps.length === 0) {
                listUI.innerHTML = `<div style='text-align:center; padding:20px; color:var(--red); font-weight:bold;'>Nessun operatore di questo sesso configurato.</div>`;
                return;
            }
        }

        var dStr = document.getElementById('searchDate').value;
        var dayApps = normalizeFbArray(db.app && db.app[dStr] ? db.app[dStr] : []);
        var dayReqs = normalizeFbArray(db.requests && db.requests[dStr] ? db.requests[dStr] : []);
        var combined = dayApps.concat(dayReqs.filter(function(r){ return r.status === 'pending'; }));

        var groupedResults = {}; 

        for(var m = 9*60; m <= 20*60; m += 15) {
            var slotStart = m; 
            var slotEnd = m + requiredTime;
            var timeKey = mToT(m);
            
            var opsOccupati = combined.filter(function(a){
                var aStart = tToM(a.ora); var aEnd = aStart + (parseInt(a.dur) || 30) + 10;
                return (slotStart < aEnd && slotEnd > aStart) && a.op && a.op !== "";
            }).map(function(a){ return a.op; });
            
            var hasValidOpFree = true;
            if (genderFilter !== 'ALL') {
                hasValidOpFree = validOps.some(function(opName){ return !opsOccupati.includes(opName); });
            }
            if (!hasValidOpFree) continue;

            var freeCabins = [];
            for(var c = 1; c <= nCabine; c++) {
                var isCollision = combined.some(function(a){
                    if(window.searchContextAppId && String(a.id) === String(window.searchContextAppId)) return false;
                    if(parseInt(a.cab) !== c) return false;
                    var aStart = tToM(a.ora); var aEnd = aStart + (parseInt(a.dur) || 30) + (omitCleaning ? 0 : 10);
                    return (slotStart < aEnd && slotEnd > aStart);
                });
                if(!isCollision) freeCabins.push(c);
            }

            if(freeCabins.length > 0) {
                groupedResults[timeKey] = { date: dStr, time: timeKey, cabins: freeCabins, dur: dur };
            }
        }

        var timeKeys = Object.keys(groupedResults);
        if(timeKeys.length === 0) {
            listUI.innerHTML = "<div style='text-align:center; padding:20px; color:var(--red); font-weight:bold;'>Nessuna disponibilità trovata.</div>";
        } else {
            listUI.innerHTML = timeKeys.map(function(k){
                var r = groupedResults[k];
                var dateObj = new Date(r.date);
                var dateStr = dateObj.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'long' });
                var cabStr = r.cabins.join(', ');
                var jsonData = JSON.stringify(r).replace(/'/g, "\\'");
                
                return `
                <div class="search-res-item" onclick="m_promptCabinChoice('${jsonData}')" style="background:var(--bg-panel); border:2px solid var(--border-line); border-radius:8px; padding:15px; display:flex; align-items:center; justify-content:space-between; cursor:pointer; margin-bottom:5px;">
                    <div>
                        <div style="font-size:15px; font-weight:900; color:var(--text-main); text-transform:uppercase;">${dateStr} - ORE ${r.time}</div>
                        <div style="font-size:12px; color:var(--green); margin-top:4px; font-weight:bold;">Cabine Libere: ${cabStr}</div>
                    </div>
                    <i class="material-icons-round" style="color:var(--accent);">chevron_right</i>
                </div>`;
            }).join('');
        }
    }, 150);
}

function m_promptCabinChoice(jsonStr) {
    var data = JSON.parse(jsonStr);
    var modal = document.getElementById('cabinChoiceModal');
    if(!modal) {
        modal = document.createElement('div');
        modal.id = "cabinChoiceModal";
        modal.style.cssText = "display:none; position:fixed; inset:0; background:rgba(0,0,0,0.9); z-index:10001; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(4px);";
        document.body.appendChild(modal);
    }
    
    var radiosHtml = `
        <label style="display:flex; align-items:center; gap:10px; background:var(--bg-body); padding:15px; border-radius:10px; border:1px solid var(--border-line); margin-bottom:10px; cursor:pointer;">
            <input type="radio" name="cabChoice" value="indifferente" checked style="width:20px; height:20px; accent-color:var(--accent);">
            <span style="font-weight:bold; font-size:14px; color:var(--text-main);">Indifferente (Auto)</span>
        </label>
    `;
    
    data.cabins.forEach(function(c){
        radiosHtml += `
        <label style="display:flex; align-items:center; gap:10px; background:var(--bg-body); padding:15px; border-radius:10px; border:1px solid var(--border-line); margin-bottom:10px; cursor:pointer;">
            <input type="radio" name="cabChoice" value="${c}" style="width:20px; height:20px; accent-color:var(--accent);">
            <span style="font-weight:bold; font-size:14px; color:var(--text-main);">Cabina ${c}</span>
        </label>
        `;
    });

    var safeCabinsArr = JSON.stringify(data.cabins);

    modal.innerHTML = `
        <div style="background:var(--bg-panel); width:100%; max-width:350px; border-radius:20px; padding:25px; border:1px solid var(--border-line); box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
            <h3 style="margin-top:0; color:var(--accent); font-size:18px;">Seleziona Cabina</h3>
            <p style="font-size:13px; color:var(--text-muted); margin-bottom:20px;">Prenotazione ore <b>${data.time}</b>. Scegli dove allocare il cliente:</p>
            <div style="max-height:40vh; overflow-y:auto; margin-bottom:20px;">
                ${radiosHtml}
            </div>
            <div style="display:flex; gap:10px;">
                <button onclick="document.getElementById('cabinChoiceModal').style.display='none'" style="flex:1; padding:14px; border-radius:10px; background:transparent; border:1px solid var(--border-line); color:var(--text-main); font-weight:bold; cursor:pointer;">ANNULLA</button>
                <button onclick="m_confirmGroupedSearch('${data.date}', '${data.time}', '${data.dur}', '${safeCabinsArr}')" style="flex:1; padding:14px; border-radius:10px; background:var(--green); border:none; color:#000; font-weight:bold; cursor:pointer;">INSERISCI</button>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
}

function m_confirmGroupedSearch(date, time, dur, cabinsStr) {
    var cabins = JSON.parse(cabinsStr);
    var radios = document.getElementsByName('cabChoice');
    
    var selectedCab = "indifferente";
    for(var i=0; i<radios.length; i++) { if(radios[i].checked) { selectedCab = radios[i].value; break; } }
    
    if (selectedCab === "indifferente") { selectedCab = cabins[0]; }

    document.getElementById('cabinChoiceModal').style.display = 'none';
    document.getElementById('searchEngineModal').style.display = 'none';

    setTimeout(function(){
        if (window.searchContextAppId) {
            var fDate = document.getElementById("fDate"); var fOra = document.getElementById("fOra"); var fCab = document.getElementById("fCab");
            if(fDate) fDate.value = date; if(fOra) fOra.value = time; if(fCab) fCab.value = selectedCab;
            document.getElementById("appFormSheet").classList.add("active");
            if(typeof showToast === 'function') showToast("Orario aggiornato! Ricordati di cliccare SALVA.");
        } else {
            var p = document.getElementById("mainDate");
            if(p) { p.value = date; m_renderAll(); }
            m_openForm(null, '', selectedCab, time);
            setTimeout(function(){
                var durInput = document.getElementById("fDur");
                if(durInput) durInput.value = dur;
                if(typeof m_renderServiceBox === 'function') m_renderServiceBox();
            }, 100);
        }
    }, 300);
}