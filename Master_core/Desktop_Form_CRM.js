/* Master_core/Desktop_Form_CRM.js - Autocomplete, Servizi e Box Sconti */

window.sysCheckCustomerInput = function() {
    const input = document.getElementById('aCog');
    const box = document.getElementById('cogSuggestions');
    if(!input || !box) return;

    const val = input.value.toLowerCase().trim();
    if(val.length < 3) {
        box.style.display = 'none';
        return;
    }

    if(!window.globalCustomers || window.globalCustomers.length === 0) return;

    const matches = window.globalCustomers.filter(c => c.nome && c.nome.toLowerCase().includes(val)).slice(0, 5);

    if(matches.length === 0) {
        box.style.display = 'none';
        return;
    }

    box.innerHTML = '';
    box.style.display = 'block';
    box.style.zIndex = '99999'; 

    matches.forEach(c => {
        const div = document.createElement('div');
        div.className = 'auto-item';
        div.style.padding = '8px 12px';
        div.style.borderBottom = '1px solid var(--border-line)';
        div.style.cursor = 'pointer';
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.style.alignItems = 'center';
        
        div.innerHTML = `<div><b style="color:var(--accent); font-size:12px; text-transform:uppercase; display:block; margin-bottom:2px;">${c.nome}</b><span style="font-size:10px; color:var(--text-muted);">${c.tel || 'Nessun tel.'}</span></div>`;
        
        div.onmouseover = function() { this.style.background = 'rgba(56, 189, 248, 0.1)'; this.style.borderLeft = '3px solid var(--accent)'; this.style.paddingLeft = '9px'; };
        div.onmouseout = function() { this.style.background = 'transparent'; this.style.borderLeft = 'none'; this.style.paddingLeft = '12px'; };

        div.onclick = function() {
            input.value = c.nome;
            if(document.getElementById('aTel') && c.tel && c.tel !== 'N.D.') document.getElementById('aTel').value = c.tel;
            if(document.getElementById('aDataNascita') && c.dataNascita && c.dataNascita !== 'N.D.') document.getElementById('aDataNascita').value = c.dataNascita;
            if(document.getElementById('aCodCliente') && c.codCliente) document.getElementById('aCodCliente').value = c.codCliente;
            
            // Auto-compilazione Camera
            if(document.getElementById('aCam') && c.cam) document.getElementById('aCam').value = c.cam;
            
            // Auto-compilazione Patologie
            if(document.getElementById('aPatologie') && c.patologie) {
                document.getElementById('aPatologie').value = c.patologie;
                if(document.getElementById('patologieWrapper')) document.getElementById('patologieWrapper').style.display = 'block';
                if(document.getElementById('btnShowPatologie')) document.getElementById('btnShowPatologie').style.display = 'none';
            }

            box.style.display = 'none';
        };
        box.appendChild(div);
    });
};

document.addEventListener('click', function(e) {
    if(!e.target.closest('#aCog') && !e.target.closest('#cogSuggestions')) {
        const box = document.getElementById('cogSuggestions');
        if(box) box.style.display = 'none';
    }
});

// ================= GESTIONE SERVIZI =================

window.sysSetDiscountType = function(type) {
    if(document.getElementById('aDiscountType')) document.getElementById('aDiscountType').value = type;
    if(document.getElementById('btnScontoPerc')) {
        document.getElementById('btnScontoPerc').style.background = type === 'perc' ? 'var(--accent)' : 'transparent';
        document.getElementById('btnScontoPerc').style.color = type === 'perc' ? '#0f172a' : 'var(--text-main)';
    }
    if(document.getElementById('btnScontoEuro')) {
        document.getElementById('btnScontoEuro').style.background = type === 'euro' ? 'var(--accent)' : 'transparent';
        document.getElementById('btnScontoEuro').style.color = type === 'euro' ? '#0f172a' : 'var(--text-main)';
    }
    window.sysCalculatePrice();
};

window.sysCalculatePrice = function() {
    const baseEl = document.getElementById('aBasePrice');
    const typeEl = document.getElementById('aDiscountType');
    const valEl = document.getElementById('discountValue');
    
    const base = baseEl ? parseFloat(baseEl.value) || 0 : 0;
    const type = typeEl ? typeEl.value || 'euro' : 'euro';
    const val = valEl ? parseFloat(valEl.value) || 0 : 0;
    
    let finalPrice = base;
    if (val > 0) {
        if(type === 'euro') {
            finalPrice = base - val;
        } else if(type === 'perc') {
            finalPrice = base - (base * (val / 100));
        }
    }
    
    if(finalPrice < 0) finalPrice = 0;
    if(document.getElementById('aPrice')) document.getElementById('aPrice').value = finalPrice.toFixed(2);
    if(typeof window.sysRenderServiceBox === 'function') window.sysRenderServiceBox(); 
};

window.sysRemoveDiscount = function(silent = false) {
    const mod = document.getElementById('discountModule');
    if(mod) mod.style.display = 'none';
    
    const valInput = document.getElementById('discountValue');
    if(valInput) valInput.value = '';
    
    if(typeof window.sysSetDiscountType === 'function') window.sysSetDiscountType('euro'); 
};

window.sysRenderServiceBox = function() {
    const area = document.getElementById('serviceRenderArea'); 
    if(!area) return;
    
    const sNameEl = document.getElementById('aServ');
    const sName = sNameEl ? sNameEl.value : "";
    
    if(sName) { 
        const baseP = parseFloat(document.getElementById('aBasePrice')?.value) || 0;
        const finalP = parseFloat(document.getElementById('aPrice')?.value) || 0;
        const dur = document.getElementById('aDur')?.value || 30;
        
        let priceHtml = finalP < baseP 
            ? `<span style="text-decoration:line-through; opacity:0.6; margin-right:6px;">${baseP.toFixed(2)}€</span><span style="color:var(--gold); font-weight:900; font-size:14px;">${finalP.toFixed(2)} €</span>`
            : `<span style="font-weight:900; font-size:14px;">${finalP.toFixed(2)} €</span>`;
        
        area.innerHTML = `
            <div class="selected-service-badge" style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 12px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div class="info">
                    <b style="color: var(--green); display: block; font-size: 13px; margin-bottom: 2px; text-transform:uppercase;">${sName}</b>
                    <span style="color: var(--text-muted); font-size: 10px; font-weight: bold;">${dur} min | ${priceHtml}</span>
                </div>
                <div style="display:flex; gap:8px; align-items:center;">
                    <div title="Applica Sconto" onclick="document.getElementById('discountModule').style.display='block';" style="color: var(--gold); background: rgba(251, 191, 36, 0.1); border: 1px solid var(--gold); border-radius: 6px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s;">
                        <i class="material-icons-round" style="font-size:14px;">local_offer</i>
                    </div>
                    <div title="Rimuovi Servizio" onclick="if(typeof window.sysExecuteRemoveService === 'function') window.sysExecuteRemoveService()" style="color: var(--red); background: rgba(239, 68, 68, 0.1); border: 1px solid var(--red); border-radius: 6px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s;">
                        <i class="material-icons-round" style="font-size:14px;">close</i>
                    </div>
                </div>
            </div>`; 
    } 
    else { 
        area.innerHTML = `
            <button type="button" class="btn-save" style="background: #2563eb !important; border: 1px solid #1d4ed8 !important; margin-bottom: 12px;" onclick="if(typeof window.sysOpenServiceSelector === 'function') window.sysOpenServiceSelector()">
                <i class="material-icons-round" style="color: #ffffff !important;">add_circle</i> <span style="color: #ffffff !important;">AGGIUNGI SERVIZIO</span>
            </button>`; 
    }
};

window.sysExecuteRemoveService = function() { 
    if(document.getElementById('aServ')) document.getElementById('aServ').value = ""; 
    if(document.getElementById('aDur')) document.getElementById('aDur').value = "30"; 
    if(document.getElementById('aPrice')) document.getElementById('aPrice').value = "0"; 
    if(document.getElementById('aBasePrice')) document.getElementById('aBasePrice').value = "0"; 
    
    if(document.getElementById('coupleFields')) document.getElementById('coupleFields').style.display = 'none';
    if(document.getElementById('aIsCouple')) document.getElementById('aIsCouple').value = "false";
    
    if(typeof window.sysRemoveDiscount === 'function') window.sysRemoveDiscount();
    if(typeof window.sysPopulateOperators === 'function') window.sysPopulateOperators();
    window.sysRenderServiceBox();
};

document.addEventListener('dragover', function(e) {
    let slot = e.target.closest('.slot');
    if(slot) {
        e.preventDefault(); 
        e.dataTransfer.dropEffect = 'move';
    }
});

window.sysOpenServiceSelector = function() {
    const listUI = document.getElementById('desktopServiziUIList'); 
    if(!listUI) return;
    listUI.innerHTML = ""; 
    if(document.getElementById('desktopSearchServiceInput')) document.getElementById('desktopSearchServiceInput').value = ""; 
    
    let rawList = window.db && window.db.servizi ? window.db.servizi : []; 
    let servList = Array.isArray(rawList) ? rawList : Object.values(rawList);
    servList = servList.filter(s => s && s.nome);
    
    if(servList.length === 0) { 
        listUI.innerHTML = "<div style='text-align:center; padding:20px; color:var(--text-muted); font-size:12px'>Nessun servizio abilitato.</div>"; 
    } else {
        servList.forEach((s, index) => {
            const sId = s.id || ('SV_TEMP_' + index); s.id = sId;
            const div = document.createElement('div'); 
            div.className = 'serv-item'; 
            div.id = 'srvUI_' + sId; 
            div.setAttribute('data-name', s.nome.toLowerCase());
            div.innerHTML = `<i class="material-icons-round" style="color:var(--text-muted); font-size:18px;">spa</i><div class="serv-info"><b>${s.nome}</b><span style="color:var(--accent); margin-left:10px; display:block;">${s.durata || 30} min - ${parseFloat(s.prezzo || 0).toFixed(2)} €</span></div>`;
            div.onclick = function() { window.sysTempSelectService(sId); }; 
            listUI.appendChild(div);
        });
    }
    window.tempSelectedServiceId = null; 
    const mod = document.getElementById('desktopServiceSelectModal');
    if(mod) mod.style.display = 'flex';
};

window.sysTempSelectService = function(id) { 
    document.querySelectorAll('.serv-item').forEach(x => x.classList.remove('active')); 
    const el = document.getElementById('srvUI_' + id); 
    if(el) el.classList.add('active'); 
    
    const srvList = window.db && window.db.servizi ? (Array.isArray(window.db.servizi) ? window.db.servizi : Object.values(window.db.servizi)) : [];
    const s = srvList.find(x => x && x.id === id); 
    if(s) { window.tempSelectedServiceId = { nome: s.nome, dur: s.durata, price: s.prezzo, isCouple: s.isCouple }; }
};

window.sysConfirmServiceSelection = function() { 
    if(window.tempSelectedServiceId) { 
        if(document.getElementById('aServ')) document.getElementById('aServ').value = window.tempSelectedServiceId.nome; 
        if(document.getElementById('aDur')) document.getElementById('aDur').value = window.tempSelectedServiceId.dur; 
        if(document.getElementById('aBasePrice')) document.getElementById('aBasePrice').value = window.tempSelectedServiceId.price;
        
        if(typeof window.sysCalculatePrice === 'function') window.sysCalculatePrice(); 
        if(typeof window.sysPopulateOperators === 'function') window.sysPopulateOperators();
        
        const mod = document.getElementById('desktopServiceSelectModal');
        if(mod) mod.style.display = 'none'; 
        
        if(typeof window.sysRenderServiceBox === 'function') window.sysRenderServiceBox();
    } else { 
        if(typeof window.showToast === 'function') window.showToast("Seleziona un trattamento prima di confermare."); 
    } 
};

window.sysFilterServices = function() { 
    const inputEl = document.getElementById('desktopSearchServiceInput');
    if(!inputEl) return;
    const val = inputEl.value.toLowerCase(); 
    document.querySelectorAll('#desktopServiziUIList .serv-item').forEach(el => { 
        const name = el.getAttribute('data-name') || '';
        el.style.display = name.includes(val) ? 'flex' : 'none'; 
    }); 
};