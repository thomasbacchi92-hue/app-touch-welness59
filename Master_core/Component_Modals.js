/* Master_core/Component_Modals.js - Contenitore Isolato per Modali di Sistema */

window.addEventListener('DOMContentLoaded', () => {
    const oldIds = ['operatorTheftModal', 'shadowWarningModal', 'nameChangeModal', 'cameraChangeModal', 'customerProfileModal', 'customCalendarModal', 'deleteAppModal'];
    oldIds.forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });

    if (document.getElementById('tw-system-modals-core')) return;

    const modaliHTML = `
        <div id="tw-system-modals-core">
            
            <style>
                .tw-premium-modal {
                    background: rgba(30, 41, 59, 0.95) !important;
                    backdrop-filter: blur(16px) !important;
                    -webkit-backdrop-filter: blur(16px) !important;
                    border-radius: 16px !important;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7) !important;
                    padding: 30px !important;
                    color: #fff;
                    box-sizing: border-box;
                }
                .tw-modal-icon-container {
                    width: 70px; height: 70px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto;
                }
            </style>

            <!-- CESTINO (ELIMINA APPUNTAMENTO) -->
            <div id="deleteAppModal" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; align-items:center; justify-content:center; background:rgba(0,0,0,0.75); backdrop-filter:blur(6px); z-index:5000;" onclick="if(event.target===this) this.style.display='none'">
                <div class="modal-box tw-premium-modal" style="max-width: 400px; width:95%; text-align: center; border: 1px solid rgba(239,68,68,0.3); border-top: 4px solid var(--red);">
                    <div class="tw-modal-icon-container" style="background: rgba(239,68,68,0.15); box-shadow: 0 0 20px rgba(239,68,68,0.2);">
                        <i class="material-icons-round" style="font-size:36px; color:var(--red);">delete_forever</i>
                    </div>
                    <h3 style="margin:0 0 10px 0; font-size:20px; font-weight:900;">Elimina Appuntamento</h3>
                    <p style="font-size: 14px; color: var(--text-muted); margin: 0 0 25px 0; line-height:1.6;">
                        Sei sicuro di voler <b style="color:var(--red);">cancellare definitivamente</b> questo appuntamento dall'agenda?
                    </p>
                    <div style="display:flex; gap:12px;">
                        <button class="btn-save btn-outline" style="flex:1; border-color:transparent;" onclick="document.getElementById('deleteAppModal').style.display='none'">ANNULLA</button>
                        <button class="btn-save" style="flex:1; background:var(--red); color:#fff; border:none;" onclick="if(typeof window.sysConfirmDeleteApp === 'function') window.sysConfirmDeleteApp()">SI, ELIMINA</button>
                    </div>
                </div>
            </div>

            <!-- FURTO OPERATORE -->
            <div id="operatorTheftModal" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; align-items:center; justify-content:center; background:rgba(0,0,0,0.75); backdrop-filter:blur(6px); z-index:5000;" onclick="if(event.target===this) window.sysCancelOperatorTheft()">
                <div class="modal-box tw-premium-modal" style="max-width: 420px; width:95%; text-align: center; border: 1px solid rgba(239,68,68,0.3); border-top: 4px solid var(--red);">
                    <div class="tw-modal-icon-container" style="background: rgba(239,68,68,0.15); box-shadow: 0 0 20px rgba(239,68,68,0.2);">
                        <i class="material-icons-round" style="font-size:36px; color:var(--red);">person_off</i>
                    </div>
                    <h3 style="margin:0 0 10px 0; font-size:20px; font-weight:900; letter-spacing:0.5px;">Operatore Impegnato</h3>
                    <p style="font-size: 14px; color: var(--text-muted); margin: 0 0 20px 0; line-height:1.6;">
                        <span id="theftOpName" style="color:var(--text-main); font-weight:bold; font-size:16px;"></span> è già occupato.<br>
                        <span id="theftOldTime" style="font-size:12px; color:var(--gold);"></span>
                    </p>
                    <div style="background:rgba(0,0,0,0.3); padding:15px; border-radius:10px; margin-bottom:25px; text-align:left; border:1px solid rgba(255,255,255,0.05);">
                        <label style="display:block; font-size:11px; font-weight:bold; color:var(--accent); margin-bottom:8px; text-transform:uppercase;">Assegna un Sostituto Libero</label>
                        <select id="theftReplacementOp" class="form-input" style="width:100%; border-color:rgba(56, 189, 248, 0.4); background:var(--bg-body); font-weight:bold;"></select>
                    </div>
                    <div style="display:flex; gap:12px;">
                        <button class="btn-save btn-outline" style="flex:1; border-color:transparent;" onclick="window.sysCancelOperatorTheft()">ANNULLA</button>
                        <button class="btn-save" style="flex:1; background:var(--red); color:#fff; border:none;" onclick="window.sysConfirmOperatorTheft()">CONFERMA</button>
                    </div>
                </div>
            </div>

            <!-- BLOCCO OMBRA / PULIZIA -->
            <!-- BLINDATURA ROLLBACK: Ora ANNULLA invoca la funzione di pulizia della griglia -->
            <div id="shadowWarningModal" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; align-items:center; justify-content:center; background:rgba(0,0,0,0.75); backdrop-filter:blur(6px); z-index:5000;" onclick="if(event.target===this) { if(window.sysCancelShadowOverride) window.sysCancelShadowOverride(); else this.style.display='none'; }">
                <div class="modal-box tw-premium-modal" style="max-width: 400px; width:95%; text-align: center; border: 1px solid rgba(251, 191, 36, 0.3); border-top: 4px solid var(--gold);">
                    <div class="tw-modal-icon-container" style="background: rgba(251, 191, 36, 0.15); box-shadow: 0 0 20px rgba(251, 191, 36, 0.2);">
                        <i class="material-icons-round" style="font-size:36px; color:var(--gold);">cleaning_services</i>
                    </div>
                    <h3 style="margin:0 0 10px 0; font-size:20px; font-weight:900;">Tempo di Riordino</h3>
                    <p style="font-size: 14px; color: var(--text-muted); margin: 0 0 25px 0; line-height:1.6;">
                        Questo orario è riservato alla <b style="color:var(--text-main)">pulizia della cabina</b> per l'appuntamento precedente.
                    </p>
                    <div style="display:flex; gap:12px;">
                        <button class="btn-save btn-outline" style="flex:1; border-color:transparent;" onclick="if(window.sysCancelShadowOverride) window.sysCancelShadowOverride(); else document.getElementById('shadowWarningModal').style.display='none'">ANNULLA</button>
                        <button class="btn-save" style="flex:1; background:var(--gold); color:#000; border:none;" onclick="if(typeof window.sysConfirmShadowOverride === 'function') window.sysConfirmShadowOverride()">FORZA INSERIMENTO</button>
                    </div>
                </div>
            </div>

            <!-- CAMBIO NOME (ANTI-DUPLICATI) -->
            <div id="nameChangeModal" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; align-items:center; justify-content:center; background:rgba(0,0,0,0.75); backdrop-filter:blur(6px); z-index:5000;" onclick="if(event.target===this) { this.style.display='none'; window._pendingActionData=null; }">
                <div class="modal-box tw-premium-modal" style="max-width: 450px; width:95%; text-align: center; border: 1px solid rgba(56, 189, 248, 0.3); border-top: 4px solid var(--accent);">
                    <div class="tw-modal-icon-container" style="background: rgba(56, 189, 248, 0.15); box-shadow: 0 0 20px rgba(56, 189, 248, 0.2);">
                        <i class="material-icons-round" style="font-size:36px; color:var(--accent);">manage_accounts</i>
                    </div>
                    <h3 style="margin:0 0 10px 0; font-size:20px; font-weight:900;">Modifica Nome CRM</h3>
                    <div style="background:rgba(0,0,0,0.2); padding:15px; border-radius:8px; margin-bottom:20px;">
                        <p style="font-size: 14px; color: var(--text-muted); margin: 0; line-height:1.6;">
                            Passaggio rilevato da:<br>
                            <b id="ncOldName" style="color:var(--red); font-size:15px;"></b> <i class="material-icons-round" style="font-size:14px; vertical-align:middle;">arrow_forward</i> <b id="ncNewName" style="color:var(--green); font-size:15px;"></b>
                        </p>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        <button class="btn-save" style="background:var(--accent); color:#000; border:none;" onclick="if(window.sysResolveNameChange) window.sysResolveNameChange('correction')">È LA STESSA PERSONA (CORREGGI CRM)</button>
                        <button class="btn-save" style="background:var(--green); color:#fff; border:none;" onclick="if(window.sysResolveNameChange) window.sysResolveNameChange('new')">È UN OSPITE NUOVO (CREA IN CRM)</button>
                        <button class="btn-save btn-outline" style="border-color:transparent;" onclick="document.getElementById('nameChangeModal').style.display='none'; window._pendingActionData=null;">ANNULLA</button>
                    </div>
                </div>
            </div>

            <!-- CAMBIO CAMERA -->
            <div id="cameraChangeModal" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; align-items:center; justify-content:center; background:rgba(0,0,0,0.75); backdrop-filter:blur(6px); z-index:5000;" onclick="if(event.target===this) window.sysResolveCameraChange('ignore')">
                <div class="modal-box tw-premium-modal" style="max-width: 400px; width:95%; text-align: center; border: 1px solid rgba(168, 85, 247, 0.3); border-top: 4px solid var(--purple);">
                    <div class="tw-modal-icon-container" style="background: rgba(168, 85, 247, 0.15); box-shadow: 0 0 20px rgba(168, 85, 247, 0.2);">
                        <i class="material-icons-round" style="font-size:36px; color:var(--purple);">meeting_room</i>
                    </div>
                    <h3 style="margin:0 0 10px 0; font-size:20px; font-weight:900;">Aggiorna Camera</h3>
                    <p style="font-size: 14px; color: var(--text-muted); margin: 0 0 20px 0; line-height:1.6;">
                        L'ospite ha comunicato <b id="ccNewCam" style="color:var(--green);"></b>, ma nel CRM ha la <b id="ccOldCam" style="color:var(--red);"></b>.
                    </p>
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        <button class="btn-save" style="background:var(--purple); color:#fff; border:none;" onclick="window.sysResolveCameraChange('update')">AGGIORNA NEL CRM</button>
                        <button class="btn-save btn-outline" style="border-color:transparent;" onclick="window.sysResolveCameraChange('ignore')">MANTIENI VECCHIA IN CRM</button>
                    </div>
                </div>
            </div>
            
            <!-- CUSTOMER PROFILE CRM -->
            <div id="customerProfileModal" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; align-items:center; justify-content:center; background:rgba(0,0,0,0.75); backdrop-filter:blur(6px); z-index:6000;" onclick="if(event.target===this) this.style.display='none'">
                <div class="modal-box tw-premium-modal" style="max-width: 850px; width: 95%; padding: 25px !important; text-align:left;">
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid var(--border-line); padding-bottom: 15px; margin-bottom: 20px;">
                        <h2 style="margin:0; color:var(--accent); font-size:24px; display:flex; align-items:center; gap:10px;">
                            <i class="material-icons-round" style="font-size:32px;">account_circle</i>
                            <span id="cp_nome" style="text-transform:uppercase;">Cliente</span>
                        </h2>
                        <button class="btn-icon" style="font-size:28px; border:none; background:transparent; color:var(--text-muted); cursor:pointer;" onclick="document.getElementById('customerProfileModal').style.display='none'"><i class="material-icons-round">close</i></button>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 20px;">
                        <div class="stat-card" style="border-bottom-color:var(--gold); background:rgba(0,0,0,0.2); padding:15px; border-radius:8px; border-bottom:3px solid var(--gold);"><div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; margin-bottom:5px; font-weight:bold;">Telefono</div><div id="cp_tel" style="font-size:18px; font-weight:bold; color:var(--text-main)">-</div></div>
                        <div class="stat-card" style="border-bottom-color:var(--accent); background:rgba(0,0,0,0.2); padding:15px; border-radius:8px; border-bottom:3px solid var(--accent);"><div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; margin-bottom:5px; font-weight:bold;">Data Nascita</div><div id="cp_dob" style="font-size:18px; font-weight:bold; color:var(--text-main)">-</div></div>
                        <div class="stat-card" style="border-bottom-color:var(--green); background:rgba(0,0,0,0.2); padding:15px; border-radius:8px; border-bottom:3px solid var(--green);"><div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; margin-bottom:5px; font-weight:bold;">Spesa SPA (Rete)</div><div id="cp_spent" style="font-size:20px; font-weight:900; color:var(--green)">0.00 €</div></div>
                    </div>
                    <div class="tabs-header" style="display:flex; gap:10px; border-bottom:1px solid var(--border-line); margin-bottom:15px;">
                        <button class="tab-btn active" style="background:transparent; border:none; color:var(--accent); border-bottom:2px solid var(--accent); padding:10px 15px; font-weight:bold; cursor:pointer;" onclick="sysOpenProfileTab('history')">Storico e Note</button>
                        <button class="tab-btn" style="background:transparent; border:none; color:var(--text-muted); border-bottom:2px solid transparent; padding:10px 15px; font-weight:bold; cursor:pointer;" onclick="sysOpenProfileTab('docs')">Documenti Firmati</button>
                    </div>
                    <div id="tab-history" class="tab-content active">
                        <div class="form-group" style="margin-bottom:20px;">
                            <label style="color:var(--accent);">Note Interne Cliente (Condivise)</label>
                            <textarea id="cp_note" rows="2" class="form-input" style="font-size:14px; height:auto; min-height:60px;" placeholder="Preferenze, allergie, note generali..." onchange="sysSaveCustomerNote()"></textarea>
                        </div>
                        <div style="max-height:250px; overflow-y:auto; border:1px solid var(--border-line); border-radius:12px; background:var(--bg-body);">
                            <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
                                <thead style="background:var(--bg-body); position:sticky; top:0;"><tr><th style="padding:12px; border-bottom:1px solid var(--border-line); color:var(--text-muted);">Data</th><th style="padding:12px; border-bottom:1px solid var(--border-line); color:var(--text-muted);">Struttura SPA</th><th style="padding:12px; border-bottom:1px solid var(--border-line); color:var(--text-muted);">Trattamento / Operatore</th><th style="padding:12px; border-bottom:1px solid var(--border-line); text-align:right; color:var(--text-muted);">Costo / Stato</th></tr></thead>
                                <tbody id="cp_history"></tbody>
                            </table>
                        </div>
                    </div>
                    <div id="tab-docs" class="tab-content" style="display:none;">
                        <div style="max-height:250px; overflow-y:auto; border:1px solid var(--border-line); border-radius:12px; background:var(--bg-body);">
                            <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
                                <thead style="background:var(--bg-body); position:sticky; top:0;"><tr><th style="padding:12px; border-bottom:1px solid var(--border-line); color:var(--text-muted);">Data Firma</th><th style="padding:12px; border-bottom:1px solid var(--border-line); color:var(--text-muted);">Nome Documento Registrato</th><th style="padding:12px; border-bottom:1px solid var(--border-line); text-align:right; color:var(--text-muted);">Azione</th></tr></thead>
                                <tbody id="cp_docs_table"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- CALENDARIO CUSTOM -->
            <div id="customCalendarModal" class="modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; align-items:center; justify-content:center; background:rgba(0,0,0,0.8); backdrop-filter:blur(4px); z-index:10005;" onclick="if(event.target===this) window.sysCloseCustomCalendar()">
                <div class="modal-box" style="padding:0; overflow:hidden; width:100%; max-width:320px; border-radius:4px; border:1px solid var(--border-line); background:var(--bg-panel); display:flex; flex-direction:column; box-shadow:0 10px 40px rgba(0,0,0,0.6);">
                    <div style="background:var(--bg-body); border-bottom:1px solid var(--border-line); padding:15px; display:flex; justify-content:space-between; align-items:center;">
                        <button onclick="window.sysChangeCalendarMonth(-1)" style="background:transparent; border:none; color:var(--text-main); cursor:pointer; padding:5px;"><i class="material-icons-round" style="font-size:24px;">chevron_left</i></button>
                        <div id="calMonthYear" style="font-weight:900; font-size:16px; color:var(--accent); text-transform:uppercase;"></div>
                        <button onclick="window.sysChangeCalendarMonth(1)" style="background:transparent; border:none; color:var(--text-main); cursor:pointer; padding:5px;"><i class="material-icons-round" style="font-size:24px;">chevron_right</i></button>
                    </div>
                    <div style="display:grid; grid-template-columns:repeat(7, 1fr); gap:1px; background:var(--border-line); padding:1px; text-align:center; font-size:11px; font-weight:bold; color:var(--text-muted);">
                        <div style="background:var(--bg-panel); padding:8px 0;">LUN</div><div style="background:var(--bg-panel); padding:8px 0;">MAR</div><div style="background:var(--bg-panel); padding:8px 0;">MER</div><div style="background:var(--bg-panel); padding:8px 0;">GIO</div><div style="background:var(--bg-panel); padding:8px 0;">VEN</div><div style="background:var(--bg-panel); padding:8px 0;">SAB</div><div style="background:var(--bg-panel); padding:8px 0;">DOM</div>
                    </div>
                    <div id="calDaysGrid" style="display:grid; grid-template-columns:repeat(7, 1fr); gap:1px; background:var(--border-line); border-top:none;"></div>
                    <div style="padding:15px; background:var(--bg-body); display:flex; justify-content:center;">
                        <button onclick="window.sysCloseCustomCalendar()" style="width:100%; padding:12px; background:transparent; border:1px solid var(--border-line); color:var(--text-muted); border-radius:4px; font-weight:bold; cursor:pointer;">ANNULLA</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modaliHTML);
});

// CALENDARIO LOGIC OMETTO PER BREVITA'...
window.currentCalDate = new Date();
window.calTargetInputId = '';
window.calTargetLabelId = '';

window.sysOpenCustomCalendar = function(inputId, labelId) {
    window.calTargetInputId = inputId;
    window.calTargetLabelId = labelId;
    var currentVal = document.getElementById(inputId).value;
    if(currentVal) { window.currentCalDate = new Date(currentVal); } else { window.currentCalDate = new Date(); }
    window.sysRenderCalendar();
    document.getElementById('customCalendarModal').style.display = 'flex';
};

window.sysCloseCustomCalendar = function() {
    if(document.getElementById('customCalendarModal')) document.getElementById('customCalendarModal').style.display = 'none';
};

window.sysChangeCalendarMonth = function(offset) {
    window.currentCalDate.setMonth(window.currentCalDate.getMonth() + offset);
    window.sysRenderCalendar();
};

window.sysRenderCalendar = function() {
    var year = window.currentCalDate.getFullYear();
    var month = window.currentCalDate.getMonth();
    var mesi = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
    document.getElementById('calMonthYear').innerText = mesi[month] + " " + year;
    
    var firstDay = new Date(year, month, 1).getDay();
    if(firstDay === 0) firstDay = 7;
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    
    var grid = document.getElementById('calDaysGrid');
    grid.innerHTML = '';
    
    var today = new Date();
    var isCurrentMonth = (today.getFullYear() === year && today.getMonth() === month);
    var selectedVal = document.getElementById(window.calTargetInputId).value;
    
    for(var i = 1; i < firstDay; i++) {
        grid.innerHTML += '<div style="background:var(--bg-panel); opacity:0.3; padding:15px 0;"></div>';
    }
    
    for(var d = 1; d <= daysInMonth; d++) {
        var cellDate = new Date(year, month, d);
        var dateString = new Date(cellDate.getTime() - (cellDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        
        var isToday = isCurrentMonth && (today.getDate() === d);
        var isSelected = (selectedVal === dateString);
        var bg = "var(--bg-panel)"; var color = "var(--text-main)"; var weight = "normal";
        
        if(isToday) { color = "var(--accent)"; weight = "900"; }
        if(isSelected) { bg = "var(--accent)"; color = "#0f172a"; weight = "900"; }
        
        grid.innerHTML += '<div onclick="window.sysSelectCalendarDate(\''+dateString+'\')" style="background:'+bg+'; color:'+color+'; font-weight:'+weight+'; padding:15px 0; cursor:pointer; font-size:14px; transition:all 0.2s;">'+d+'</div>';
    }
};

window.sysSelectCalendarDate = function(dateString) {
    var input = document.getElementById(window.calTargetInputId);
    var label = document.getElementById(window.calTargetLabelId);
    input.value = dateString;
    if(label) {
        var parts = dateString.split('-');
        label.innerText = parts[2] + '/' + parts[1] + '/' + parts[0];
    }
    input.dispatchEvent(new Event('change'));
    window.sysCloseCustomCalendar();
};