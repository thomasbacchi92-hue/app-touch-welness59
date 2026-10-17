/* Master_core/Logic_CRM.js - Sincronizzazione CRM e Autocomplete */

window.sysCheckCustomerInput = function() {
    const input = document.getElementById('aCog');
    const box = document.getElementById('cogSuggestions');
    if(!input || !box || !window.globalCustomers) return;

    const val = input.value.toLowerCase().trim();
    if(val.length < 3) { box.style.display = 'none'; return; }

    const matches = window.globalCustomers.filter(c => c.nome && c.nome.toLowerCase().includes(val)).slice(0, 5);
    if(matches.length === 0) { box.style.display = 'none'; return; }

    box.innerHTML = ''; box.style.display = 'block'; box.style.zIndex = '99999'; 

    matches.forEach(c => {
        const div = document.createElement('div');
        div.className = 'auto-item';
        div.innerHTML = `<div><b style="color:var(--accent); font-size:12px; text-transform:uppercase; display:block; margin-bottom:2px;">${c.nome}</b><span style="font-size:10px; color:var(--text-muted);">${c.tel || 'Nessun tel.'}</span></div>`;
        
        div.onclick = function() {
            input.value = c.nome;
            if(document.getElementById('aTel') && c.tel) document.getElementById('aTel').value = c.tel;
            if(document.getElementById('aDataNascita') && c.dataNascita) document.getElementById('aDataNascita').value = c.dataNascita;
            if(document.getElementById('aCodCliente') && c.codCliente) document.getElementById('aCodCliente').value = c.codCliente;
            
            if(document.getElementById('aCam') && c.cam) document.getElementById('aCam').value = c.cam;
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

window.sysUpdateCRM = function(appObj, ignoreCamera) {
    if (!window.twStructId) return;
    const crmRef = firebase.database().ref('MASTER_ADMIN_DB/global_customers');
    const newName = (appObj.cog || "Ospite").toLowerCase();

    let targetId = null;
    let updateData = {
        nome: appObj.cog || "Ospite",
        tel: appObj.tel || "",
        dataNascita: appObj.dataNascita || "",
        note: appObj.note || "",
        patologie: appObj.patologie || "",
        structId: window.twStructId,
        last_update: new Date().toISOString()
    };
    if (!ignoreCamera) updateData.cam = appObj.cam || "";

    if (window.globalCustomers) {
        const existingCustomer = window.globalCustomers.find(c => c.nome && c.nome.toLowerCase() === newName);
        if (existingCustomer) targetId = existingCustomer.id;
    }

    if (targetId) { crmRef.child(targetId).update(updateData); } 
    else { updateData.created_at = new Date().toISOString(); crmRef.push(updateData); }
};