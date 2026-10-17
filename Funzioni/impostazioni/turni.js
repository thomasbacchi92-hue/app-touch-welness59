/* funzioni/impostazioni/turni.js */

window.turniModule = {
    adminTurniDate: new Date(),
    init: function() {
        if(!window.twStructId) return;
        firebase.database().ref('MASTER_ADMIN_DB/users').once('value').then(snap => {
            const users = snap.val() || {}; const sel = document.getElementById('turniOpSelect'); sel.innerHTML = '<option value="">-- Seleziona --</option>';
            Object.values(users).forEach(u => {
                if(String(u.structureId) === String(window.twStructId) && u.attivo !== false && u.eliminato !== true) { sel.innerHTML += `<option value="${u.nick}">${u.name} ${u.surname||''} (${u.nick})</option>`; }
            });
            this.renderTurniGrid();
        });
    },
    changeWeek: function(offset) { this.adminTurniDate.setDate(this.adminTurniDate.getDate() + (offset * 7)); this.renderTurniGrid(); },
    renderTurniGrid: function() {
        const opNick = document.getElementById('turniOpSelect').value; const grid = document.getElementById('turniGridContainer');
        const dayOfWeek = this.adminTurniDate.getDay(); const diffToMonday = this.adminTurniDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const startOfWeek = new Date(this.adminTurniDate); startOfWeek.setDate(diffToMonday);
        const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 6);
        document.getElementById('adminWeekLabel').innerText = `Dal ${startOfWeek.toLocaleDateString('it-IT')} al ${endOfWeek.toLocaleDateString('it-IT')}`;
        
        if(!opNick) { grid.innerHTML = "<div style='text-align:center; color:var(--text-muted);'>Seleziona un collaboratore.</div>"; return; }
        
        firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + window.twStructId + '/turni').once('value').then(snap => {
            const allTurni = snap.val() || {}; let html = "";
            for(let i=0; i<7; i++) {
                const currentDay = new Date(startOfWeek); currentDay.setDate(startOfWeek.getDate() + i);
                const dateStr = `${currentDay.getFullYear()}-${String(currentDay.getMonth()+1).padStart(2,'0')}-${String(currentDay.getDate()).padStart(2,'0')}`;
                const dayName = currentDay.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase();
                let myShift = null; if(allTurni[dateStr] && allTurni[dateStr][opNick]) { myShift = allTurni[dateStr][opNick]; }
                
                const type = myShift ? myShift.type : "libero"; const s1 = myShift && myShift.start ? myShift.start : "09:00"; const e1 = myShift && myShift.end ? myShift.end : "13:00";
                html += `<div style="display:flex; justify-content:space-between; align-items:center; padding:15px; background:var(--bg-body); border:1px solid var(--border-line); border-radius:8px;">
                    <div style="font-weight:bold; width:100px;">${dayName}</div>
                    <select id="tType_${dateStr}" class="form-input" style="width:120px;" onchange="document.getElementById('tTime_${dateStr}').style.display = this.value==='lavoro'?'flex':'none'">
                        <option value="libero" ${type==='libero'?'selected':''}>Libero</option><option value="lavoro" ${type==='lavoro'?'selected':''}>Lavoro</option><option value="malattia" ${type==='malattia'?'selected':''}>Malattia</option>
                    </select>
                    <div id="tTime_${dateStr}" style="display:${type==='lavoro'?'flex':'none'}; gap:10px; align-items:center;">
                        <input type="time" id="tS1_${dateStr}" class="form-input" style="width:100px;" value="${s1}"> - <input type="time" id="tE1_${dateStr}" class="form-input" style="width:100px;" value="${e1}">
                    </div>
                </div>`;
            }
            grid.innerHTML = html;
        });
    },
    saveTurniWeek: function() {
        const opNick = document.getElementById('turniOpSelect').value; if(!opNick) return;
        const dayOfWeek = this.adminTurniDate.getDay(); const diffToMonday = this.adminTurniDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const startOfWeek = new Date(this.adminTurniDate); startOfWeek.setDate(diffToMonday);
        const dbTurniRef = firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + window.twStructId + '/turni');
        let promises = [];
        for(let i=0; i<7; i++) {
            const currentDay = new Date(startOfWeek); currentDay.setDate(startOfWeek.getDate() + i);
            const dateStr = `${currentDay.getFullYear()}-${String(currentDay.getMonth()+1).padStart(2,'0')}-${String(currentDay.getDate()).padStart(2,'0')}`;
            const type = document.getElementById(`tType_${dateStr}`).value; const refDayUser = dbTurniRef.child(dateStr).child(opNick);
            if(type === 'libero') promises.push(refDayUser.remove());
            else if(type === 'lavoro') { const s1 = document.getElementById(`tS1_${dateStr}`).value; const e1 = document.getElementById(`tE1_${dateStr}`).value; promises.push(refDayUser.set({ type: 'lavoro', start: s1, end: e1 })); }
            else promises.push(refDayUser.set({ type: type }));
        }
        Promise.all(promises).then(() => { 
            // Fix Toast applicato qui
            if(window.showToast) window.showToast("Planning Salvato!"); 
        });
    }
};
document.addEventListener('DOMContentLoaded', () => window.turniModule.init());