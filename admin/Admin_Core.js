/* ADMIN CORE - GUSCIO UNICO E ROUTING CON GESTIONE "COPPIA" E PROTEZIONE ANTI-CRASH */

const fbConfig = { apiKey: "AIzaSyCrDuK7SWHdbzrJR-pNpxmRwGnZgV2Dd2Y", authDomain: "touch-welness-massage.firebaseapp.com", databaseURL: "https://touch-welness-massage-default-rtdb.europe-west1.firebasedatabase.app", projectId: "touch-welness-massage", storageBucket: "touch-welness-massage.firebasestorage.app" };
if (!firebase.apps.length) firebase.initializeApp(fbConfig);

const dbRef = firebase.database().ref('MASTER_ADMIN_DB');
const dataRef = firebase.database().ref('MASTER_ADMIN_DB/structures_data');

window.app = {
    data: { structures: {}, users: {}, global_treatments: {}, structures_data: {} },
    currentId: null, currentManagerUid: null, turniDate: new Date(), currentFilteredApps: [], currentPage: 1, itemsPerPage: 50,

    init: function() {
        dbRef.on('value', snap => {
            try {
                const val = snap.val() || {};
                this.data.structures = val.structures || {};
                this.data.users = val.users || {};
                this.data.global_treatments = val.global_treatments || {};
                
                this.safeRender(() => this.renderStructures());
                this.safeRender(() => this.renderGlobalStats());
                
                if(this.currentId) {
                    this.safeRender(() => this.renderWh());
                    this.safeRender(() => this.renderStructStaff());
                    this.safeRender(() => this.renderStructTreatments());
                    if(document.getElementById('detailTitle')) this.loadDetail(this.currentId, false);
                }
            } catch(e) { console.error("Errore Init:", e); }
        });
    },

    safeRender: function(func) { try { func(); } catch(e) { console.warn("Render skip:", e.message); } },

    showToast: function(m) { const t=document.getElementById("toastBlue"); if(t){ t.innerText=m; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),3000); } },

    switchView: function(v) {
        document.getElementById('moduleFrame').style.display = 'none';
        document.getElementById('nativeContent').style.display = 'block';
        document.querySelectorAll('.view-section').forEach(x => x.classList.remove('active'));
        const target = document.getElementById('view-' + v);
        if(target) target.classList.add('active');
        document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
        const navEl = document.getElementById('nav-' + v);
        if(navEl) navEl.classList.add('active');
    },

    loadModule: function(url, navId = null) {
        document.getElementById('nativeContent').style.display = 'none';
        const frame = document.getElementById('moduleFrame');
        frame.style.display = 'block';
        if (!frame.src.endsWith(url)) {
            const targetUrl = url.includes('?') ? url + "&mode=shell" : url + "?mode=shell";
            frame.src = targetUrl;
        }
        document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
        if(navId) {
            const navEl = document.getElementById(navId); 
            if(navEl) navEl.classList.add('active');
            const navGroup = document.getElementById('nav-group-options');
            if (navEl.closest('#optionsSubMenu') && navGroup) navGroup.classList.add('active');
        }
    },

    openIframeTab: function(url, el) {
        document.querySelectorAll('#view-structure-detail .tab-content').forEach(x=>x.classList.remove('active')); 
        document.querySelectorAll('#view-structure-detail .tab-btn').forEach(x=>x.classList.remove('active')); 
        let btn = el ? (el.closest ? el.closest('.tab-btn') : el) : null; 
        if(btn) btn.classList.add('active');
        document.getElementById('tab-iframe-container').classList.add('active');
        localStorage.setItem('tw_admin_current_struct', this.currentId);
        const frame = document.getElementById('structTabFrame'); 
        const targetUrl = url.includes('?') ? url + "&mode=tab" : url + "?mode=tab";
        frame.src = targetUrl;
    },

    openStaffInTab: function(uid) {
        const btn = document.querySelector('.tabs-header button[onclick*="staff"]');
        this.openIframeTab('admin_staff.html?uid=' + uid, btn);
    },

    openTab: function(t, el) {
        document.querySelectorAll('#view-structure-detail .tab-content').forEach(x=>x.classList.remove('active'));
        document.querySelectorAll('#view-structure-detail .tab-btn').forEach(x=>x.classList.remove('active'));
        document.getElementById('tab-'+t).classList.add('active');
        if(el) el.classList.add('active');
    },

    renderGlobalStats: function() {
        const table = document.getElementById('globalStatsTable'); if(!table) return;
        table.innerHTML = ""; let count = 0;
        Object.values(this.data.structures).forEach(s => {
            if(s && !s.archived) {
                count++; table.innerHTML += `<tr class="clickable" onclick="app.loadDetail('${s.id}')"><td><b style="font-size:15px; color:var(--text-main)">${s.name}</b></td><td><span class="badge" style="background:var(--bg-body); color:var(--text-muted); border:1px solid var(--border-line)">${s.id}</span></td><td style="text-align:right"><button class="btn-action btn-sm btn-outline">APRI SCHEDA</button></td></tr>`;
            }
        });
        if(count === 0) table.innerHTML = "<tr><td colspan='3' style='text-align:center; padding:20px; color:var(--text-muted)'>Nessuna struttura attiva.</td></tr>";
    },

    renderStructures: function() {
        const l = document.getElementById('structureList'); if(!l) return;
        l.innerHTML = "";
        const structs = Object.values(this.data.structures);
        structs.sort((a,b) => (a.archived === b.archived) ? 0 : a.archived ? 1 : -1);
        structs.forEach(s => {
            if(!s || !s.id) return;
            const bg = s.archived ? "background:var(--bg-body); opacity:0.6;" : "";
            const badge = s.archived ? `<span class="badge" style="background:#64748b; color:white; margin-left:10px">ARCHIVIATA</span>` : "";
            l.innerHTML += `<div class="list-row clickable" style="${bg}" onclick="app.loadDetail('${s.id}')"><div class="row-info"><b>${s.name} ${badge}</b><span>ID: ${s.id}</span></div><i class="material-icons-round" style="color:var(--accent)">chevron_right</i></div>`;
        });
    },

    loadDetail: function(id, sw = true) {
        this.currentId = id; const s = this.data.structures[id]; if(!s) return;
        document.getElementById('detailTitle').innerText = s.name;
        
        const info = s.info || {}; 
        const el = (idStr) => document.getElementById(idStr);
        if(el('d_s_addr')) el('d_s_addr').value = info.s_addr || ""; if(el('d_s_city')) el('d_s_city').value = info.s_city || ""; if(el('d_s_tel')) el('d_s_tel').value = info.s_tel || ""; if(el('d_s_email')) el('d_s_email').value = info.s_email || "";
        if(el('d_g_ragione')) el('d_g_ragione').value = info.g_ragione || ""; if(el('d_g_addr')) el('d_g_addr').value = info.g_addr || ""; if(el('d_g_city')) el('d_g_city').value = info.g_city || ""; if(el('d_g_piva')) el('d_g_piva').value = info.g_piva || ""; if(el('d_g_sdi')) el('d_g_sdi').value = info.g_sdi || ""; if(el('d_g_pec')) el('d_g_pec').value = info.g_pec || "";
        if(el('d_spaNick')) el('d_spaNick').value = info.spaNick || ""; if(el('d_spaPass')) el('d_spaPass').value = info.spaPass || ""; if(el('d_recNick')) el('d_recNick').value = info.recNick || ""; if(el('d_recPass')) el('d_recPass').value = info.recPass || ""; 
        
        const lExp = document.getElementById('lic_exp_date'); if(lExp) lExp.value = s.licenseSuspended ? "SOSPESA" : (s.licenseExp || "NON ATTIVA");
        
        dataRef.child(id).child('license').once('value').then(snap => {
            const lic = snap.val() || {};
            if(el('lic_struct_name')) el('lic_struct_name').value = lic.nomeStruttura || s.name;
            if(el('lic_manager_name')) el('lic_manager_name').value = lic.responsabile || "";
            if(el('lic_max_cabine')) el('lic_max_cabine').value = lic.max_cabine || 10;
        });

        dataRef.child(`${id}/settings/access_prices`).once('value').then(snap => {
            const p = snap.val() || {};
            if(el('admPriceSpa')) el('admPriceSpa').value = p.spa || 30;
            if(el('admPricePool')) el('admPricePool').value = p.pool || 15;
        });

        const mSel = document.getElementById('selManager');
        if(mSel) {
            mSel.innerHTML = '<option value="">-- Seleziona Manager --</option>';
            Object.entries(this.data.users).forEach(([uid, u]) => {
                if(u.structureId === id && (u.isManager || u.role === 'admin')) {
                    mSel.innerHTML += `<option value="${uid}">${u.name || u.nick}</option>`;
                }
            });
            const area = document.getElementById('managerSettingsArea');
            if(area) area.style.display = 'none';
        }

        this.calculateStructStats(id); this.renderStructStaff(); this.renderStructTreatments(); this.renderWh();
        if(sw) { this.openTab('stats'); this.switchView('structure-detail'); }
    },

    saveInfo: function() { 
        const el = (idStr) => document.getElementById(idStr); 
        const i = { s_addr: el('d_s_addr').value, s_city: el('d_s_city').value, s_tel: el('d_s_tel').value, s_email: el('d_s_email').value, g_ragione: el('d_g_ragione').value, g_addr: el('d_g_addr').value, g_city: el('d_g_city').value, g_piva: el('d_g_piva').value, g_sdi: el('d_g_sdi').value, g_pec: el('d_g_pec').value, spaNick: el('d_spaNick').value, spaPass: el('d_spaPass').value, recNick: el('d_recNick').value, recPass: el('d_recPass').value }; 
        dbRef.child('structures').child(this.currentId).child('info').set(i).then(() => this.showToast("Dati Aggiornati")); 
    },

    saveLicenseParams: function() {
        if(!this.currentId) return;
        const licData = {
            nomeStruttura: document.getElementById('lic_struct_name').value,
            responsabile: document.getElementById('lic_manager_name').value,
            max_cabine: parseInt(document.getElementById('lic_max_cabine').value) || 10
        };
        dataRef.child(this.currentId).child('license').set(licData).then(() => {
            this.showToast("Parametri Licenza Salvati con Successo.");
        });
    },

    savePrices: function() {
        if(!this.currentId) return;
        const p = { 
            spa: parseFloat(document.getElementById('admPriceSpa').value) || 0, 
            pool: parseFloat(document.getElementById('admPricePool').value) || 0 
        };
        dataRef.child(`${this.currentId}/settings/access_prices`).set(p).then(() => this.showToast("Prezzi salvati con successo!"));
    },

    loadManagerSettings: function() {
        const mSel = document.getElementById('selManager');
        if(!mSel) return;
        const uid = mSel.value;
        this.currentManagerUid = uid;
        const area = document.getElementById('managerSettingsArea');
        if(!uid) { area.style.display = 'none'; return; }
        area.style.display = 'block';

        const u = this.data.users[uid];
        if(!u) return;
        
        document.getElementById('m_lever_perc').value = u.levers?.max_perc || 0;
        document.getElementById('m_lever_budget').value = u.levers?.budget || 0;
        document.getElementById('m_perm_cassa').checked = u.permissions?.auth_annulla_cassa || false;
        document.getElementById('m_perm_pricing').checked = u.permissions?.auth_pricing || false;
        document.getElementById('m_perm_turni').checked = u.permissions?.auth_turni || false;

        if(!this.turniDate) this.turniDate = new Date();
        this.renderTurniGrid();
    },

    saveManagerSettings: function() {
        if(!this.currentManagerUid) return;
        const uid = this.currentManagerUid;
        dbRef.child(`users/${uid}/levers`).set({ 
            max_perc: parseFloat(document.getElementById('m_lever_perc').value) || 0, 
            budget: parseFloat(document.getElementById('m_lever_budget').value) || 0 
        });
        dbRef.child(`users/${uid}/permissions`).update({ 
            auth_annulla_cassa: document.getElementById('m_perm_cassa').checked, 
            auth_pricing: document.getElementById('m_perm_pricing').checked, 
            auth_turni: document.getElementById('m_perm_turni').checked 
        });
        this.saveTurni();
        this.showToast("Configurazione Responsabile Salvata!");
    },

    changeTurniWeek: function(dir) { 
        if(!this.turniDate) this.turniDate = new Date();
        this.turniDate.setDate(this.turniDate.getDate() + (dir * 7)); 
        this.renderTurniGrid(); 
    },

    renderTurniGrid: function() {
        const grid = document.getElementById('managerTurniGrid');
        if(!grid) return;
        const opNick = this.data.users[this.currentManagerUid]?.nick;
        if(!opNick) return;
        
        if(!this.turniDate) this.turniDate = new Date();
        const dw = this.turniDate.getDay(); 
        const diff = this.turniDate.getDate() - dw + (dw === 0 ? -6 : 1);
        const sw = new Date(this.turniDate); sw.setDate(diff); 
        const ew = new Date(sw); ew.setDate(sw.getDate() + 6);
        
        const label = document.getElementById('turniWeekLabel');
        if(label) label.innerText = `Dal ${sw.toLocaleDateString('it-IT')} al ${ew.toLocaleDateString('it-IT')}`;

        dataRef.child(`${this.currentId}/turni`).once('value').then(snap => {
            const allT = snap.val() || {}; 
            let html = "";
            for(let i=0; i<7; i++) {
                const cd = new Date(sw); cd.setDate(sw.getDate() + i); 
                const ds = `${cd.getFullYear()}-${String(cd.getMonth()+1).padStart(2,'0')}-${String(cd.getDate()).padStart(2,'0')}`;
                const myS = allT[ds] && allT[ds][opNick] ? allT[ds][opNick] : { type: 'libero' };
                html += `
                <div class="shift-card" style="border-left-color:${myS.type === 'lavoro' ? 'var(--accent)' : 'var(--border-line)'}">
                    <div class="shift-card-header"><b>${cd.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' })}</b>
                        <select id="m_st_${ds}" class="form-input" style="width:120px; margin:0; padding:5px;">
                            <option value="libero" ${myS.type === 'libero' ? 'selected' : ''}>Libero</option>
                            <option value="lavoro" ${myS.type === 'lavoro' ? 'selected' : ''}>Lavoro SPA</option>
                            <option value="malattia" ${myS.type === 'malattia' ? 'selected' : ''}>Malattia</option>
                            <option value="ferie" ${myS.type === 'ferie' ? 'selected' : ''}>Ferie/Permesso</option>
                        </select>
                    </div>
                    <div id="m_sh_${ds}" style="display:${myS.type==='lavoro'?'flex':'none'}; gap:10px; margin-top:10px;">
                        <input type="time" id="m_s1_${ds}" value="${myS.start || '09:00'}" class="form-input" style="padding:6px; font-weight:bold;">
                        <input type="time" id="m_e1_${ds}" value="${myS.end || '18:00'}" class="form-input" style="padding:6px; font-weight:bold;">
                    </div>
                </div>`;
            }
            grid.innerHTML = html;
            
            for(let i=0; i<7; i++) {
                const cd = new Date(sw); cd.setDate(sw.getDate() + i); 
                const ds = `${cd.getFullYear()}-${String(cd.getMonth()+1).padStart(2,'0')}-${String(cd.getDate()).padStart(2,'0')}`;
                const sel = document.getElementById(`m_st_${ds}`);
                if(sel) {
                    sel.addEventListener('change', function() {
                        const sh = document.getElementById(`m_sh_${ds}`);
                        const card = this.closest('.shift-card');
                        if(sh) sh.style.display = this.value === 'lavoro' ? 'flex' : 'none';
                        if(card) card.style.borderLeftColor = this.value === 'lavoro' ? 'var(--accent)' : 'var(--border-line)';
                    });
                }
            }
        });
    },

    saveTurni: function() {
        const opNick = this.data.users[this.currentManagerUid]?.nick;
        if(!opNick || !this.currentId) return;
        
        if(!this.turniDate) this.turniDate = new Date();
        const dw = this.turniDate.getDay(); 
        const diff = this.turniDate.getDate() - dw + (dw === 0 ? -6 : 1);
        const sw = new Date(this.turniDate); sw.setDate(diff);
        
        let promises = [];
        for(let i=0; i<7; i++) {
            const cd = new Date(sw); cd.setDate(sw.getDate() + i); 
            const ds = `${cd.getFullYear()}-${String(cd.getMonth()+1).padStart(2,'0')}-${String(cd.getDate()).padStart(2,'0')}`;
            
            const tEl = document.getElementById(`m_st_${ds}`);
            if(!tEl) continue;
            
            const ref = dataRef.child(`${this.currentId}/turni/${ds}/${opNick}`);
            if(tEl.value === 'libero') { 
                promises.push(ref.remove()); 
            } else if(tEl.value === 'lavoro') { 
                const startVal = document.getElementById(`m_s1_${ds}`) ? document.getElementById(`m_s1_${ds}`).value : "09:00";
                const endVal = document.getElementById(`m_e1_${ds}`) ? document.getElementById(`m_e1_${ds}`).value : "18:00";
                promises.push(ref.set({ type: 'lavoro', start: startVal, end: endVal })); 
            } else {
                promises.push(ref.set({ type: tEl.value })); 
            }
        }
        Promise.all(promises);
    },

    openStructActionModal: function() { document.getElementById('deleteStructAuthArea').style.display = 'none'; document.getElementById('delStructPwd').value = ''; const isArchived = this.data.structures[this.currentId]?.archived; const btnArch = document.getElementById('btnArchiviaStruttura'); if(isArchived) { btnArch.innerText = "RIPRISTINA STRUTTURA"; btnArch.style.background = "var(--primary)"; btnArch.onclick = () => app.toggleArchiveStructure(false); } else { btnArch.innerText = "ARCHIVIA STRUTTURA"; btnArch.style.background = "var(--gold)"; btnArch.onclick = () => app.toggleArchiveStructure(true); } document.getElementById('structActionModal').style.display = 'flex'; },
    toggleArchiveStructure: function(archivedStatus) { if(!this.currentId) return; dbRef.child('structures').child(this.currentId).update({ archived: archivedStatus }).then(() => { this.showToast(archivedStatus ? "Struttura archiviata." : "Struttura attiva."); document.getElementById('structActionModal').style.display = 'none'; this.switchView('structures'); }); },
    promptDeleteStructure: function() { document.getElementById('deleteStructAuthArea').style.display = 'block'; },
    confirmDeleteStructure: function() { const pwd = document.getElementById('delStructPwd').value; if (pwd === "171192") { const sid = this.currentId; if(!sid) return; dbRef.child('structures').child(sid).remove().then(() => { dataRef.child(sid).remove(); this.showToast("STRUTTURA ELIMINATA"); document.getElementById('structActionModal').style.display = 'none'; this.currentId = null; this.switchView('structures'); }); } else { this.showToast("Password Errata!"); document.getElementById('delStructPwd').value = ''; } },
    addStructure: function() { const n = document.getElementById('strName').value; const id = document.getElementById('strId').value.toUpperCase().trim(); if(n && id) { dbRef.child('structures').child(id).set({ name: n, id: id, created: new Date().toISOString(), archived: false }); document.getElementById('strName').value=""; document.getElementById('strId').value=""; this.showToast("Struttura Creata!"); } },
    
    renderStructStaff: function() { 
        if(!this.currentId) return; 
        const tbodyStaff = document.getElementById('structStaffTable'); 
        const tbodyManager = document.getElementById('structManagerTable'); 
        const selOp = document.getElementById('selOpContratto');
        
        if(!tbodyStaff || !tbodyManager) return; 
        tbodyStaff.innerHTML = ""; tbodyManager.innerHTML = ""; 
        if(selOp) selOp.innerHTML = '<option value="">-- Seleziona Operatore --</option>'; 

        let countS = 0, countM = 0; 
        Object.entries(this.data.users).forEach(([uid, u]) => { 
            if(u.structureId === this.currentId) { 
                const isManager = u.isManager === true; 
                const rowHtml = `<tr><td><b style="color:${isManager ? 'var(--gold)' : 'var(--text-main)'}">${u.nick}</b></td><td>${u.name||''} ${u.surname||''}</td><td>${u.phone||'-'}</td><td style="text-align:right"><button class="btn-action btn-sm btn-outline" onclick="app.openStaffInTab('${uid}')">VEDI PROFILO</button></td></tr>`; 
                if(isManager) { countM++; tbodyManager.innerHTML += rowHtml; } else { countS++; tbodyStaff.innerHTML += rowHtml; } 
                if(selOp) selOp.innerHTML += `<option value="${uid}">${u.nick} (${u.name||''} ${u.surname||''})</option>`;
            } 
        }); 
        if(countM === 0) tbodyManager.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:15px; color:var(--text-muted)'>Nessun responsabile.</td></tr>"; 
        if(countS === 0) tbodyStaff.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:15px; color:var(--text-muted)'>Nessun collaboratore in cabina.</td></tr>"; 
    },

    calculateStructStats: function(structId = this.currentId) {
        if(!structId) return; const fy = document.getElementById('fYear'); const fm = document.getElementById('fMonth'); if(!fy || !fm) return;
        const targetPrefix = `${fy.value}-${fm.value}`; 
        dataRef.child(structId).once('value').then(snap => {
            const data = snap.val() || {}; const appsObj = data.app || {}; const delObj = data.deleted_apps || {}; let serviziList = []; if (data.servizi) serviziList = Array.isArray(data.servizi) ? data.servizi : Object.values(data.servizi);
            let all = []; let cPren = 0, cEseg = 0, cElim = 0, cPag = 0; let ePren = 0, eEseg = 0, eElim = 0, ePag = 0; let opStats = {};
            Object.values(this.data.users).filter(u => u.structureId === structId).forEach(u => { opStats[u.nick] = { executed: 0, billed: 0, matches: [u.nick.toLowerCase(), (u.name||'').toLowerCase(), ((u.name||'') + ' ' + (u.surname||'')).toLowerCase()] }; });
            for (const dateKey in appsObj) { if(dateKey.startsWith(targetPrefix)) { appsObj[dateKey].forEach(a => { let status = "Prenotato"; let price = parseFloat(a.price) || parseFloat(a.prezzo) || 0; if(price === 0 && a.serv) { const srv = serviziList.find(s => a.serv.includes(s.nome)); if(srv && srv.prezzo) price = parseFloat(srv.prezzo); } const opNameLower = (a.op || "").toLowerCase(); let matchedNick = null; for(let nick in opStats) { if(opStats[nick].matches.includes(opNameLower)) { matchedNick = nick; break; } } if(a.eseguito) { status = "Eseguito"; cEseg++; eEseg += price; if(matchedNick) opStats[matchedNick].executed++; } else { cPren++; ePren += price; } if(a.pagato) { cPag++; ePag += price; if(matchedNick) opStats[matchedNick].billed += price; } all.push({...a, date: dateKey, finalStatus: status}); }); } }
            Object.values(delObj).forEach(a => { const effectiveDate = a.rawDate || a.date; if(effectiveDate && effectiveDate.startsWith(targetPrefix)) { let price = parseFloat(a.price) || parseFloat(a.prezzo) || 0; if(price === 0 && a.serv) { const srv = serviziList.find(s => a.serv.includes(s.nome)); if(srv && srv.prezzo) price = parseFloat(srv.prezzo); } cElim++; eElim += price; all.push({...a, date: effectiveDate, finalStatus: "Eliminato"}); } });
            const opBody = document.getElementById('statsOpTable'); if(opBody) { let opHtml = ''; Object.keys(opStats).sort().forEach(nick => { opHtml += `<tr><td><b style="color:var(--text-main)">${nick}</b></td><td>${opStats[nick].executed}</td><td><b style="color:var(--gold)">${opStats[nick].billed.toFixed(2)} €</b></td></tr>`; }); if(opHtml === '') opHtml = '<tr><td colspan="3" style="text-align:center; padding:15px; color:var(--text-muted)">Nessun operatore registrato.</td></tr>'; opBody.innerHTML = opHtml; }
            document.getElementById('sPren').innerText = cPren; document.getElementById('ePren').innerText = ePren.toFixed(2) + " €"; document.getElementById('sEseg').innerText = cEseg; document.getElementById('eEseg').innerText = eEseg.toFixed(2) + " €"; document.getElementById('sElim').innerText = cElim; document.getElementById('eElim').innerText = eElim.toFixed(2) + " €"; document.getElementById('sPag').innerText = cPag; document.getElementById('ePag').innerText = ePag.toFixed(2) + " €";
            all.sort((a,b) => { if(a.date === b.date) return (b.ora||'').localeCompare(a.ora||''); return b.date.localeCompare(a.date); });
            this.currentFilteredApps = all; this.renderAppPage(1);
        });
    },
    renderAppPage: function(page) {
        this.currentPage = page; const tbody = document.getElementById('structStatsTable'); const start = (page - 1) * this.itemsPerPage; const end = start + this.itemsPerPage; const paginatedApps = this.currentFilteredApps.slice(start, end);
        tbody.innerHTML = paginatedApps.map(x => { let badge = ""; if(x.finalStatus==="Prenotato") badge = `<span class="badge b-pren">PRENOTATO</span>`; else if(x.finalStatus==="Eseguito") badge = `<span class="badge b-eseg">ESEGUITO</span>`; else badge = `<span class="badge b-elim">ELIMINATO</span>`; if(x.pagato && x.finalStatus !== "Eliminato") badge += ` <span class="badge" style="background:var(--gold); color:#0f172a">PAGATO</span>`; const dFormat = (x.date||'').split('-').reverse().join('/'); const reasonText = x.deleteReason ? `<i class="material-icons-round" style="font-size:12px; vertical-align:middle">info</i> ${x.deleteReason}` : '-'; return `<tr><td>${badge}</td><td><b>${dFormat}</b> <span style="color:var(--accent)">${x.ora||'-'}</span></td><td>${x.cog||'-'}</td><td>${x.serv||'-'}</td><td>${x.op||'-'}</td><td style="color:var(--red); font-size:12px; font-weight:bold">${reasonText}</td></tr>`; }).join('');
        if(paginatedApps.length === 0) tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; padding:30px; font-weight:bold; color:var(--text-muted)'>Nessun appuntamento in questo mese.</td></tr>";
        const totalPages = Math.ceil(this.currentFilteredApps.length / this.itemsPerPage); const controls = document.getElementById('paginationControls');
        if(totalPages > 1) { let btns = ''; for(let i=1; i<=totalPages; i++) { btns += `<button class="btn-sm ${i === page ? 'btn-action' : 'btn-outline'}" style="width:35px; height:35px; padding:0; display:inline-flex; border-radius:5px; margin-right:5px; margin-top:5px;" onclick="app.renderAppPage(${i})">${i}</button>`; } controls.innerHTML = `<div style="display:flex; justify-content:center; align-items:center; width:100%; flex-wrap:wrap"><span style="margin-right:15px; font-size:12px; font-weight:bold; color:var(--text-muted)">Pagina:</span>${btns}</div>`; } else controls.innerHTML = `<div style="text-align:center; font-size:11px; color:var(--text-muted)">Visualizzati: ${this.currentFilteredApps.length} (Max 50/pagina)</div>`;
    },
    
    // ==========================================
    // SEZIONE TRATTAMENTI SPA E GESTIONE COPPIA
    // ==========================================
    addAllStructTreatments: function() {
        if(!this.currentId) return; const sId = this.currentId; const treats = Object.values(this.data.global_treatments); if(treats.length === 0) return this.showToast("L'archivio master è vuoto."); 
        dataRef.child(sId).child('servizi').once('value').then(snap => { 
            let current = snap.val() || {}; let newObj = {}; 
            if (Array.isArray(current)) { current.forEach((item, index) => { if(item && item.id) newObj[item.id] = item; else if(item) newObj["OLD_" + index] = item; }); } else { newObj = current; } 
            const enabledNames = Object.values(newObj).map(x => x.nome); 
            treats.forEach(t => { 
                if(!enabledNames.includes(t.nome)) { 
                    const newId = "SV" + Date.now() + Math.floor(Math.random() * 100000); 
                    let tipologiaDefault = (t.nome.toLowerCase().includes("spa") || t.nome.toLowerCase().includes("percors")) ? "spa" : "massaggi";
                    newObj[newId] = { id: newId, nome: t.nome, tipologia: tipologiaDefault, isCouple: false, durata: parseInt(t.durata)||30, prezzo: parseFloat(t.prezzo)||0 }; 
                } 
            }); 
            dataRef.child(sId).child('servizi').set(newObj).then(() => { this.showToast("Tutti i trattamenti sono stati abilitati per questa SPA!"); this.renderStructTreatments(); }); 
        }); 
    },
    
    renderStructTreatments: function() {
        if(!this.currentId) return; const tbodyGlob = document.getElementById('stGlobalTreatments'); const tbodyEnab = document.getElementById('stEnabledTreatments'); if(!tbodyGlob || !tbodyEnab) return;
        dataRef.child(this.currentId).child('servizi').once('value').then(snap => {
            const enabledRaw = snap.val() || {}; const enabled = Array.isArray(enabledRaw) ? enabledRaw : Object.values(enabledRaw);
            tbodyEnab.innerHTML = ""; if(enabled.length === 0) tbodyEnab.innerHTML = "<tr><td colspan='3' style='text-align:center; padding:20px; color:var(--text-muted)'>Nessuna tecnica abilitata. Clicca su ABILITA TUTTI.</td></tr>";
            
            enabled.forEach(e => { 
                if(e && e.nome) { 
                    const tipologiaLabel = e.tipologia ? e.tipologia.toUpperCase() : "NON DEFINITA";
                    const coupleBadge = e.isCouple ? `<span style="background:var(--purple); color:white; padding:2px 6px; border-radius:4px; font-size:9px; margin-left:5px; vertical-align:middle; font-weight:bold;">COPPIA</span>` : '';

                    tbodyEnab.innerHTML += `<tr>
                        <td>
                            <b style="color:var(--text-main)">${e.nome}</b> ${coupleBadge}<br>
                            <span style="font-size:10px; color:var(--text-muted);">${tipologiaLabel}</span>
                        </td>
                        <td>${e.prezzo} € / ${e.durata}m</td>
                        <td style="text-align:right; white-space:nowrap;">
                            <button class="btn-icon" style="color:var(--gold); display:inline-block; margin-right:5px;" onclick="app.openEditStructService('${e.id}')"><i class="material-icons-round">edit</i></button>
                            <button class="btn-icon btn-del" style="display:inline-block;" onclick="app.removeStructTreatment('${e.id}')"><i class="material-icons-round">remove_circle_outline</i></button>
                        </td>
                    </tr>`; 
                } 
            });
            
            tbodyGlob.innerHTML = ""; const treats = Object.entries(this.data.global_treatments); if(treats.length === 0) tbodyGlob.innerHTML = "<tr><td colspan='3' style='text-align:center; padding:20px; color:var(--text-muted)'>Nessuna tecnica in Master.</td></tr>";
            treats.forEach(([k, t]) => { 
                const isEn = enabled.find(x => x && x.nome === t.nome); 
                const safeName = t.nome.replace(/'/g, "\\'").replace(/"/g, "&quot;"); 
                if(isEn) { tbodyGlob.innerHTML += `<tr style="opacity:0.5"><td><b style="color:var(--text-main)">${t.nome}</b></td><td>${t.prezzo} € / ${t.durata}m</td><td style="text-align:right"><span style="font-size:11px; font-weight:bold; color:var(--green);">GIÀ ATTIVO</span></td></tr>`; } 
                else { tbodyGlob.innerHTML += `<tr><td><b style="color:var(--text-main)">${t.nome}</b></td><td>${t.prezzo} € / ${t.durata}m</td><td style="text-align:right"><button class="btn-action btn-sm" onclick="app.addStructTreatment('${safeName}', ${t.durata}, ${t.prezzo})"><i class="material-icons-round">add</i> ABILITA</button></td></tr>`; }
            });
        });
    },

    addStructTreatment: function(nome, durata, prezzo) { 
        if(!this.currentId) return; const sId = this.currentId; 
        dataRef.child(sId).child('servizi').once('value').then(snap => { 
            let current = snap.val() || {}; let newObj = {}; 
            if (Array.isArray(current)) { current.forEach((item, index) => { if(item && item.id) newObj[item.id] = item; else if(item) newObj["OLD_" + index] = item; }); } else { newObj = current; } 
            
            const newId = "SV" + Date.now() + Math.floor(Math.random() * 1000); 
            let tipologiaDefault = (nome.toLowerCase().includes("spa") || nome.toLowerCase().includes("percors")) ? "spa" : "massaggi";
            newObj[newId] = { id: newId, nome: nome, tipologia: tipologiaDefault, isCouple: false, durata: parseInt(durata)||30, prezzo: parseFloat(prezzo)||0 }; 
            
            dataRef.child(sId).child('servizi').set(newObj).then(() => { this.showToast("Tecnica Caricata nell'Agenda Struttura"); this.renderStructTreatments(); }); 
        }); 
    },

    removeStructTreatment: function(id) { 
        if(!this.currentId) return; 
        dataRef.child(this.currentId).child('servizi').child(id).remove().then(() => { this.showToast("Tecnica rimossa"); this.renderStructTreatments(); }); 
    },

    // -----------------------------------------------------
    // FUNZIONI POPUP AGGIUNGI / MODIFICA TRATTAMENTO SPA
    // -----------------------------------------------------
    openAddStructServiceModal: function() {
        if(!this.currentId) return;
        
        try {
            const titleEl = document.getElementById('ess_modalTitle');
            if(titleEl) titleEl.innerHTML = '<i class="material-icons-round" style="vertical-align:middle; margin-right:5px;">add_circle</i> Nuovo Trattamento';
            
            document.getElementById('ess_serviceId').value = "NEW";
            document.getElementById('ess_nome').value = "";
            document.getElementById('ess_tipologia').value = "massaggi";
            
            const cCheck = document.getElementById('ess_isCouple');
            if(cCheck) cCheck.checked = false;
            
            document.getElementById('ess_durata').value = 30;
            document.getElementById('ess_prezzo').value = 0;
            document.getElementById('editStructServiceModal').style.display = 'flex';
        } catch(e) {
            console.error("Errore DOM in apertura modal Add:", e);
            document.getElementById('editStructServiceModal').style.display = 'flex';
        }
    },

    openEditStructService: function(serviceId) {
        if(!this.currentId) return;
        dataRef.child(this.currentId).child('servizi').once('value').then(snap => {
            let current = snap.val() || {};
            let list = Array.isArray(current) ? current : Object.values(current);
            const service = list.find(x => x && String(x.id) === String(serviceId));
            if(!service) return this.showToast("Servizio non trovato.");

            try {
                const titleEl = document.getElementById('ess_modalTitle');
                if(titleEl) titleEl.innerHTML = '<i class="material-icons-round" style="vertical-align:middle; margin-right:5px;">edit_note</i> Personalizza Trattamento';
                
                document.getElementById('ess_serviceId').value = serviceId;
                document.getElementById('ess_nome').value = service.nome || "Trattamento";
                document.getElementById('ess_tipologia').value = service.tipologia || "massaggi";
                
                const cCheck = document.getElementById('ess_isCouple');
                if(cCheck) cCheck.checked = service.isCouple === true;
                
                document.getElementById('ess_durata').value = service.durata || 30;
                document.getElementById('ess_prezzo').value = service.prezzo || 0;

                document.getElementById('editStructServiceModal').style.display = 'flex';
            } catch(e) {
                console.error("Errore DOM in apertura modal Edit:", e);
                this.showToast("Errore di caricamento form.");
            }
        });
    },

    saveStructServiceCustomization: function() {
        if(!this.currentId) return;
        
        try {
            const serviceId = document.getElementById('ess_serviceId').value;
            const nome = document.getElementById('ess_nome').value.trim();
            const tipologia = document.getElementById('ess_tipologia').value;
            
            const cCheck = document.getElementById('ess_isCouple');
            const isCouple = cCheck ? cCheck.checked : false;
            
            let durata = parseInt(document.getElementById('ess_durata').value);
            let prezzo = parseFloat(document.getElementById('ess_prezzo').value);

            if(!nome) return this.showToast("Il nome del trattamento è obbligatorio.");
            if(isNaN(durata) || durata < 5) durata = 30;
            if(isNaN(prezzo) || prezzo < 0) prezzo = 0;

            dataRef.child(this.currentId).child('servizi').once('value').then(snap => {
                let current = snap.val() || {};
                let newObj = {};
                
                // Conversione sicura in Oggetto Firebase
                if (Array.isArray(current)) { 
                    current.forEach((item, index) => { 
                        if(item && item.id) newObj[item.id] = item; 
                        else if(item) newObj["OLD_" + index] = item; 
                    }); 
                } else { 
                    newObj = current; 
                }

                if(serviceId === "NEW") {
                    const newId = "SVCUST_" + Date.now() + Math.floor(Math.random() * 1000);
                    newObj[newId] = {
                        id: newId,
                        nome: nome,
                        tipologia: tipologia,
                        isCouple: isCouple,
                        durata: durata,
                        prezzo: prezzo
                    };
                } else {
                    if(newObj[serviceId]) {
                        newObj[serviceId].nome = nome;
                        newObj[serviceId].tipologia = tipologia;
                        newObj[serviceId].isCouple = isCouple;
                        newObj[serviceId].durata = durata;
                        newObj[serviceId].prezzo = prezzo;
                    }
                }
                
                dataRef.child(this.currentId).child('servizi').set(newObj).then(() => {
                    document.getElementById('editStructServiceModal').style.display = 'none';
                    this.showToast(serviceId === "NEW" ? "Trattamento aggiunto!" : "Trattamento personalizzato!");
                    this.renderStructTreatments(); // Refresh automatico immediato
                });
            });
        } catch(e) {
            console.error("Errore salvataggio:", e);
            this.showToast("Errore di compilazione salvataggio.");
        }
    },
    // ==========================================

    renderWh: function() {
        if(!this.currentId) return; const sId = this.currentId;
        dataRef.child(sId).child('in_transit').once('value').then(snap => {
            const transit = snap.val() || {}; const area = document.getElementById('pendingShipmentsArea');
            if(!area) return; area.innerHTML = "";
            Object.entries(transit).forEach(([tId, t]) => {
                if(t.status === 'PENDING') {
                    area.innerHTML += `<div style="background:rgba(56,189,248,0.1); border:1px solid var(--accent); padding:15px; border-radius:12px; margin-bottom:15px; display:flex; justify-content:space-between; align-items:center;"><div><h3 style="margin:0; border:none; color:var(--accent);">Spedizione in arrivo Master (${t.date})</h3></div><button class="btn-action" onclick="app.acceptMasterShipment('${tId}')">ACCETTA MERCE</button></div>`;
                }
            });
        });
        dataRef.child(sId).child('products').once('value').then(snap => {
            const inv = document.getElementById('whAdminInventory'); if(!inv) return;
            inv.innerHTML = "";
            Object.values(snap.val() || {}).forEach(p => {
                inv.innerHTML += `<tr><td><b>${p.name}</b></td><td>${(p.cost||0).toFixed(2)} €</td><td><b style="color:var(--accent)">${p.qty}</b></td><td>${p.unit}</td></tr>`;
            });
        });
        dataRef.child(sId).child('logs').once('value').then(snap => { 
            const logs = snap.val() || {}; const logBody = document.getElementById('whAdminLogs'); 
            if(logBody) { 
                logBody.innerHTML = ""; const logArray = Object.values(logs).reverse(); 
                if(logArray.length === 0) logBody.innerHTML = "<tr><td colspan='5' style='text-align:center; padding:20px; color:var(--text-muted)'>Nessun movimento locale.</td></tr>"; 
                else logArray.forEach(l => { const color = l.type.includes('CARICO') ? 'var(--green)' : 'var(--red)'; logBody.innerHTML += `<tr><td style="font-size:11px; color:var(--text-muted)">${l.date}</td><td><b style="color:${color}">${l.type}</b></td><td>${l.prodName}</td><td><b style="color:var(--text-main)">${l.qty}</b></td><td>${l.operator}</td></tr>`; }); 
            } 
        });
    },
    acceptMasterShipment: function(tId) {
        const sId = this.currentId;
        dataRef.child(sId).child('in_transit').child(tId).once('value').then(snap => {
            const transit = snap.val();
            if(!transit || transit.status !== 'PENDING') return;
            dataRef.child(sId).child('products').once('value').then(pSnap => {
                let prods = pSnap.val() || {};
                let promises = [];
                transit.items.forEach(item => {
                    if(!prods[item.id]) prods[item.id] = { id: item.id, name: item.name, unit: item.unit, cost: item.cost, qty: 0 };
                    prods[item.id].qty += item.qty;
                    promises.push(dataRef.child(sId).child('logs').push({ date: new Date().toLocaleString('it-IT'), type: 'CARICO MASTER', prodId: item.id, prodName: item.name, qty: item.qty, operator: 'Ricezione Automatica' }));
                });
                promises.push(dataRef.child(sId).child('products').set(prods));
                promises.push(dataRef.child(sId).child('in_transit').child(tId).child('status').set('ACCEPTED'));
                Promise.all(promises).then(() => {
                    this.showToast("Merce caricata a scaffale con successo!");
                    this.renderWh();
                });
            });
        });
    },

    updateLicense: function(m) { let currentExp = this.data.structures[this.currentId].licenseExp; let d = new Date(currentExp || Date.now()); d.setMonth(d.getMonth() + m); dbRef.child('structures').child(this.currentId).update({ licenseExp: d.toISOString().split('T')[0], licenseSuspended: false }); this.showToast("Licenza Rinnovata"); },
    toggleSuspend: function() { dbRef.child('structures').child(this.currentId).child('licenseSuspended').set(!this.data.structures[this.currentId].licenseSuspended); this.showToast("Stato modificato"); },

    uploadContract: function(type) {
        if(!this.currentId) return this.showToast("Seleziona una struttura prima.");
        const sid = this.currentId;
        let fileInput, pathStr, toastMsg;

        if (type === 'struttura') {
            fileInput = document.getElementById('fileContrattoStruttura');
            pathStr = `contratti/${sid}/struttura_contratto.pdf`;
            toastMsg = "Contratto Struttura Caricato!";
        } else {
            const opId = document.getElementById('selOpContratto').value;
            if(!opId) return this.showToast("Seleziona un operatore dal menu a tendina.");
            fileInput = document.getElementById('fileContrattoOp');
            pathStr = `contratti/${sid}/operatori/${opId}_contratto.pdf`;
            toastMsg = "Contratto Operatore Caricato!";
        }

        if (!fileInput || !fileInput.files[0]) return this.showToast("Seleziona un file prima di premere carica.");
        
        const file = fileInput.files[0];
        const storageRef = firebase.storage().ref(pathStr);
        
        this.showToast("Caricamento su Cloud in corso...");
        storageRef.put(file).then(snapshot => {
            snapshot.ref.getDownloadURL().then(url => {
                if(type === 'struttura') {
                    dbRef.child(`structures/${sid}/contractUrl`).set(url);
                } else {
                    const opId = document.getElementById('selOpContratto').value;
                    dbRef.child(`users/${opId}/contractUrl`).set(url);
                }
                this.showToast(toastMsg);
            });
        }).catch(err => {
            console.error(err);
            this.showToast("Errore durante il caricamento.");
        });
    },

    openEditGenDoc: function(docId) {
        if(!this.currentId) return;
        dataRef.child(this.currentId).child('contracts').child(docId).once('value').then(snap => {
            const doc = snap.val();
            if(!doc) return;
            const modal = document.getElementById('editGenDocModal');
            if(!modal) return;
            document.getElementById('egd_docId').value = docId;
            document.getElementById('egd_content').value = doc.testoGenerato || '';
            modal.style.display = 'flex';
        });
    },
    saveEditedDoc: function() {
        if(!this.currentId) return;
        const docId = document.getElementById('egd_docId').value;
        const content = document.getElementById('egd_content').value;
        if(!docId || !content) return;
        dataRef.child(this.currentId).child('contracts').child(docId).update({
            testoGenerato: content,
            date: new Date().toLocaleDateString('it-IT')
        }).then(() => {
            document.getElementById('editGenDocModal').style.display = 'none';
            this.showToast("Documento aggiornato.");
            if(typeof renderMergedStructDocs === 'function') renderMergedStructDocs(this.currentId);
        });
    }
};

window.app.init();