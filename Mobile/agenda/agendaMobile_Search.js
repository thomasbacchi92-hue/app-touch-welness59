/* agenda/agendaMobile_Search.js - Radar con Chiamata al Calendario Custom Infallibile */

document.addEventListener('DOMContentLoaded', function(){ m_injectSearchModal(); });

function m_injectSearchModal() {
    if(document.getElementById("searchEngineModal")) return;
    var modal = document.createElement('div');
    modal.id = "searchEngineModal";
    modal.style.cssText = "display:none; position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:10000; flex-direction:column; justify-content:flex-end;";
    
    var td = new Date();
    var today = new Date(td.getTime() - (td.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    var todayFormatted = today.split('-').reverse().join('/');
    
    modal.innerHTML = `
        <div style="background:var(--bg-panel); width:100%; height:90vh; border-radius:20px 20px 0 0; display:flex; flex-direction:column; overflow:hidden;">
            
            <div style="padding:15px; border-bottom:1px solid var(--border-line); display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
                <h3 style="margin:0; font-size:16px; color:var(--accent);"><i class="material-icons-round" style="vertical-align:middle;">radar</i> Trova Disponibilità</h3>
                <i class="material-icons-round" style="font-size:24px; color:var(--text-muted); cursor:pointer;" onclick="document.getElementById('searchEngineModal').style.display='none'">close</i>
            </div>
            
            <div id="searchScrollArea" style="flex:1; overflow-y:auto; display:flex; flex-direction:column;">
                
                <div style="padding:15px; display:flex; flex-direction:column; gap:10px; flex-shrink:0;">
                    
                    <div style="text-align:center; padding: 10px 0; display:flex; flex-direction:column; align-items:center;">
                        <label style="font-size:11px; font-weight:bold; color:var(--text-muted); margin-bottom:8px; display:block; text-transform:uppercase;">Data Appuntamento</label>
                        
                        <div style="width:100%; height:45px; background:var(--bg-body); border:1px solid var(--border-line); border-radius:10px; display:flex; align-items:center; justify-content:center; cursor:pointer;" onclick="if(typeof window.m_openCustomCalendar === 'function') window.m_openCustomCalendar('sDate', 'fakeSearchDateText')">
                            <div id="fakeSearchDateText" style="font-weight:bold; font-size:16px; color:var(--text-main); pointer-events:none;">${todayFormatted}</div>
                            <input type="hidden" id="sDate" value="${today}" onchange="if(typeof m_executeSearch === 'function') m_executeSearch()">
                        </div>
                    </div>

                    <div style="display:flex; gap:10px;">
                        <div style="flex:1">
                            <label style="font-size:11px; font-weight:bold; color:var(--text-muted); margin-bottom:5px; display:block;">Da (Ora)</label>
                            <input type="time" id="sTimeStart" value="10:00" class="form-input" style="width:100%; cursor:pointer;" onclick="if(this.showPicker) this.showPicker();">
                        </div>
                        <div style="flex:1">
                            <label style="font-size:11px; font-weight:bold; color:var(--text-muted); margin-bottom:5px; display:block;">A (Ora)</label>
                            <input type="time" id="sTimeEnd" value="20:00" class="form-input" style="width:100%; cursor:pointer;" onclick="if(this.showPicker) this.showPicker();">
                        </div>
                    </div>
                    
                    <div style="display:flex; gap:10px;">
                        <div style="flex:1">
                            <label style="font-size:11px; font-weight:bold; color:var(--text-muted); margin-bottom:5px; display:block;">Durata</label>
                            <select id="sDur" class="form-input" style="width:100%;">
                                <option value="30">30 Min</option>
                                <option value="50">50 Min</option>
                                <option value="60">60 Min</option>
                                <option value="70">70 Min</option>
                                <option value="80">80 Min</option>
                                <option value="100">100 Min</option>
                            </select>
                        </div>
                        <div style="flex:1">
                            <label style="font-size:11px; font-weight:bold; color:var(--text-muted); margin-bottom:5px; display:block;">Genere Op.</label>
                            <select id="sGender" class="form-input" style="width:100%;">
                                <option value="">Indifferente</option>
                                <option value="M">Maschile</option>
                                <option value="F">Femminile</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label style="font-size:11px; font-weight:bold; color:var(--text-muted); margin-bottom:5px; display:block;">Operatore Specifico</label>
                        <select id="sOpSearch" class="form-input" style="width:100%;"><option value="">Qualsiasi</option></select>
                    </div>

                    <button class="btn-save" onclick="m_executeSearch()" style="margin-top:10px;"><i class="material-icons-round">search</i> CERCA DISPONIBILITÀ</button>
                </div>
                
                <div id="searchResults" style="flex:1; padding:15px; background:var(--bg-body); border-top:1px solid var(--border-line);"></div>
                
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    var cModal = document.createElement('div');
    cModal.id = "cabinChoiceModal";
    cModal.style.cssText = "display:none; position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:10001; align-items:center; justify-content:center;";
    document.body.appendChild(cModal);
}

function m_openSearchEngine(isMove) {
    window.searchContextAppId = isMove ? document.getElementById('fId').value : null;
    if(isMove && typeof m_closeForm === 'function') m_closeForm(null, true);
    
    var dEl = document.getElementById("fDate");
    var sDate = document.getElementById("sDate");
    if(dEl && dEl.value && sDate) {
        sDate.value = dEl.value;
        var fakeSearch = document.getElementById('fakeSearchDateText');
        if(fakeSearch) fakeSearch.innerText = dEl.value.split('-').reverse().join('/');
    }

    var selOp = document.getElementById("sOpSearch");
    if(selOp && typeof firebase !== 'undefined') {
        selOp.innerHTML = '<option value="">Qualsiasi</option>';
        firebase.database().ref('MASTER_ADMIN_DB/users').once('value').then(function(snap){
            var allUsers = snap.val() || {};
            var sId = localStorage.getItem("tw_structure_id");
            var validOps = Object.values(allUsers).filter(function(u){ return String(u.structureId) === String(sId);});
            validOps.forEach(function(op){
                var n = op.nick || op.name || "Sconosciuto";
                selOp.innerHTML += `<option value="${n}">${n}</option>`;
            });
        }).catch(function(e) { console.warn("Fetch operatori radar fallito", e); });
    }

    document.getElementById('searchEngineModal').style.display = 'flex';
    document.getElementById('searchResults').innerHTML = '';
}

function m_executeSearch() {
    var d = document.getElementById("sDate").value;
    var startMin = tToM(document.getElementById("sTimeStart").value || "10:00");
    var endMin = tToM(document.getElementById("sTimeEnd").value || "20:00");
    var dur = parseInt(document.getElementById("sDur").value || 30);
    var reqGender = document.getElementById("sGender").value;
    var reqOp = document.getElementById("sOpSearch").value;
    
    var resDiv = document.getElementById('searchResults');
    resDiv.innerHTML = "<div style='text-align:center; padding:20px;'><i class='material-icons-round' style='animation: spin 1s linear infinite;'>autorenew</i><br>Ricerca in corso...</div>";

    var nCab = (window.db && window.db.settings && window.db.settings.cabine) ? parseInt(window.db.settings.cabine) : 5;
    var dayApps = (window.db && window.db.app && window.db.app[d]) ? normalizeFbArray(window.db.app[d]) : [];
    var dayReqs = (window.db && window.db.requests && window.db.requests[d]) ? normalizeFbArray(window.db.requests[d]) : [];
    
    firebase.database().ref('MASTER_ADMIN_DB/users').once('value').then(function(snap){
        var allUsers = snap.val() || {};
        var sId = localStorage.getItem("tw_structure_id");
        var validOps = Object.values(allUsers).filter(function(u){ return String(u.structureId) === String(sId);});

        var matchingOps = validOps.filter(function(u){
            var n = u.nick || u.name;
            if(reqOp && n !== reqOp) return false;
            if(reqGender) {
                var sesso = (u.sesso || u.gender || "").toUpperCase();
                if(sesso !== reqGender && sesso.charAt(0) !== reqGender) return false;
            }
            return true;
        });

        var results = [];
        for(var m = startMin; m <= endMin - dur; m += 15) {
            var isAnyOpFree = matchingOps.some(function(op){
                var opName = op.nick || op.name;
                var isOpBusy = dayApps.some(function(a){
                    if(window.searchContextAppId && String(a.id) === String(window.searchContextAppId)) return false;
                    if(String(a.op).toLowerCase().trim() !== String(opName).toLowerCase().trim()) return false;
                    var as = tToM(a.ora); var ae = as + (parseInt(a.dur)||30) + 10;
                    return (m < ae && (m+dur+10) > as);
                });
                return !isOpBusy;
            });

            if(!isAnyOpFree) continue;

            var freeCabs = [];
            for(var c=1; c<=nCab; c++) {
                var cBusy = dayApps.some(function(a){ 
                    if(window.searchContextAppId && String(a.id) === String(window.searchContextAppId)) return false;
                    var as = tToM(a.ora); var ae = as + (parseInt(a.dur)||30) + 10; 
                    return parseInt(a.cab) === c && m < ae && (m+dur+10) > as; 
                });
                var rBusy = dayReqs.some(function(r){ 
                    if(r.status !== 'pending') return false;
                    var rs = tToM(r.ora); var re = rs + (parseInt(r.dur)||30); 
                    return parseInt(r.cab) === c && m < re && (m+dur) > rs; 
                });
                if(!cBusy && !rBusy) freeCabs.push(c);
            }
            if(freeCabs.length > 0) results.push({time: mToT(m), cabs: freeCabs});
        }

        if(results.length === 0) { 
            resDiv.innerHTML = "<div style='text-align:center; color:var(--red); padding:20px;'><i class='material-icons-round' style='font-size:32px;'>event_busy</i><br>Nessuno slot disponibile per i criteri scelti</div>"; 
            setTimeout(function() { resDiv.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
            return; 
        }
        
        var h = "<h4 style='margin-top:0; color:var(--text-muted);'>Slot Disponibili:</h4><div style='display:flex; flex-direction:column; gap:10px; padding-bottom:30px;'>";
        results.forEach(function(r){
            var cabStr = encodeURIComponent(JSON.stringify(r.cabs));
            h += `<div style="background:var(--bg-panel); border:1px solid var(--border-line); border-radius:10px; padding:15px; display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-size:18px; font-weight:bold; color:var(--accent);">${r.time}</div>
                    <div style="font-size:11px; color:var(--text-muted);">${r.cabs.length} Cab. Libere</div>
                    <button class="btn-save" style="width:auto; margin:0; padding:8px 15px; font-size:12px;" onclick="m_showCabinChoice('${d}', '${r.time}', ${dur}, '${cabStr}')">SELEZIONA</button>
                  </div>`;
        });
        h += "</div>";
        resDiv.innerHTML = h;

        // Effetto Sgancio: Scorre ai risultati automaticamente mostrando tutto lo schermo
        setTimeout(function() {
            resDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);

    }).catch(function(e){
        resDiv.innerHTML = "<div style='text-align:center; color:var(--red); padding:20px;'>Errore nel recupero operatori.</div>";
    });
}

function m_showCabinChoice(date, time, dur, cabStr) {
    var cabins = JSON.parse(decodeURIComponent(cabStr));
    var cModal = document.getElementById('cabinChoiceModal');
    var h = `
        <div class="modal-box" style="background:var(--bg-panel); padding:25px; border-radius:20px; width:90%; max-width:350px; text-align:center;">
            <h3 style="margin-top:0; color:var(--accent);">Scegli Cabina</h3>
            <p style="font-size:12px; color:var(--text-muted); margin-bottom:20px;">Orario: <b>${time}</b></p>
            <div style="display:flex; flex-direction:column; gap:10px; text-align:left; margin-bottom:20px; max-height:200px; overflow-y:auto; padding:10px;">
                <label style="display:flex; align-items:center; gap:10px; padding:10px; border:1px solid var(--border-line); border-radius:8px; cursor:pointer;">
                    <input type="radio" name="cabChoice" value="indifferente" checked style="width:auto; margin:0;"> <b>Qualsiasi Cabina Libera</b>
                </label>
    `;
    cabins.forEach(function(c){
        h += `<label style="display:flex; align-items:center; gap:10px; padding:10px; border:1px solid var(--border-line); border-radius:8px; cursor:pointer;">
                <input type="radio" name="cabChoice" value="${c}" style="width:auto; margin:0;"> <b>Cabina ${c}</b>
              </label>`;
    });
    h += `  </div>
            <div style="display:flex; gap:10px;">
                <button class="btn-save btn-outline" style="flex:1; margin:0;" onclick="document.getElementById('cabinChoiceModal').style.display='none'">ANNULLA</button>
                <button class="btn-save" style="flex:1; margin:0;" onclick="m_confirmCabinAndSearch('${date}', '${time}', ${dur}, '${cabStr}')">CONFERMA</button>
            </div>
        </div>`;
    cModal.innerHTML = h;
    cModal.style.display = 'flex';
}

function m_confirmCabinAndSearch(date, time, dur, cabStr) {
    var cabins = JSON.parse(decodeURIComponent(cabStr));
    var radios = document.getElementsByName('cabChoice');
    var selectedCab = "indifferente";
    for(var i=0; i<radios.length; i++) { if(radios[i].checked) { selectedCab = radios[i].value; break; } }
    if(selectedCab === "indifferente") selectedCab = cabins[0];

    document.getElementById('cabinChoiceModal').style.display = 'none';
    document.getElementById('searchEngineModal').style.display = 'none';

    setTimeout(function(){
        if(window.searchContextAppId) {
            var fDate = document.getElementById("fDate");
            var fOra = document.getElementById("fOra");
            var fCab = document.getElementById("fCab");
            
            if(fDate) fDate.value = date;
            if(fOra) fOra.value = time;
            if(fCab) fCab.value = selectedCab;
            
            document.getElementById("appFormSheet").classList.add("active");
            
            if(typeof window.m_refreshOperators === 'function') window.m_refreshOperators();
            if(typeof showToast === 'function') showToast("Spostato! Ora clicca SALVA IN AGENDA.");
            
            window.searchContextAppId = null;
        } else {
            var p = document.getElementById("mainDate");
            if(p) { p.value = date; if(typeof m_renderAll === 'function') m_renderAll(); }
            if(typeof m_openForm === 'function') m_openForm(null, '', selectedCab, time);
            setTimeout(function(){
                var dEl = document.getElementById("fDur");
                if(dEl) dEl.value = dur;
                
                var reqOp = document.getElementById("sOpSearch") ? document.getElementById("sOpSearch").value : "";
                if(reqOp && document.getElementById("fOp")) document.getElementById("fOp").value = reqOp;
            }, 100);
        }
    }, 100);
}

function tToM(t) { if(!t) return 0; var p = String(t).split(':'); return (parseInt(p[0])||0)*60 + (parseInt(p[1])||0); }
function mToT(m) { return String(Math.floor(m/60)).padStart(2,'0') + ":" + String(m%60).padStart(2,'0'); }