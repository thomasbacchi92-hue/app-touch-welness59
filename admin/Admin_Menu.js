/* Admin_Menu.js - Master Shell Architecture (Guscio Unico) */

window.injectAdminMenu = function() {
    if (document.getElementById('adminSidebar')) return;

    const path = window.location.href;
    const isDocPage = path.includes('admin_documenti');
    const isChatPage = path.includes('admin_chat');

    const menuHTML = `
    <div class="sidebar" id="adminSidebar">
        <button class="btn-icon" style="position:absolute; top:15px; right:15px; color:var(--text-main); display:none;" id="mobileCloseBtn" onclick="if(document.getElementById('sidebarOverlay')) { document.getElementById('sidebarOverlay').classList.remove('open'); document.getElementById('adminSidebar').classList.remove('open'); }"><i class="material-icons-round">close</i></button>
        <div class="logo">ADMIN MASTER</div>

        <div class="nav-item ${(!isDocPage && !isChatPage && !path.includes('v=privacy')) ? 'active' : ''}" id="nav-stats" onclick="app.switchView('stats'); if(document.getElementById('sidebarOverlay')) { document.getElementById('sidebarOverlay').classList.remove('open'); document.getElementById('adminSidebar').classList.remove('open'); }"><i class="material-icons-round">analytics</i> Dashboard</div>
        
        <div class="nav-item" id="nav-structures" onclick="app.switchView('structures'); if(document.getElementById('sidebarOverlay')) { document.getElementById('sidebarOverlay').classList.remove('open'); document.getElementById('adminSidebar').classList.remove('open'); }"><i class="material-icons-round">apartment</i> Strutture & Licenze</div>
        
        <div class="nav-item ${isChatPage ? 'active' : ''}" id="nav-chat" onclick="app.loadModule('admin_chat.html', 'nav-chat'); if(document.getElementById('sidebarOverlay')) { document.getElementById('sidebarOverlay').classList.remove('open'); document.getElementById('adminSidebar').classList.remove('open'); }"><i class="material-icons-round">forum</i> Chat Network</div>

        <div class="nav-item" id="nav-group-options" onclick="const sub = document.getElementById('optionsSubMenu'); const icon = document.getElementById('optionsSubMenuIcon'); if(sub.style.display === 'none'){sub.style.display='flex'; icon.style.transform='rotate(180deg)';}else{sub.style.display='none'; icon.style.transform='rotate(0deg)';}">
            <i class="material-icons-round">settings</i> Opzioni / Gestione
            <i class="material-icons-round" id="optionsSubMenuIcon" style="margin-left:auto; transition:0.3s">expand_more</i>
        </div>
        
        <div id="optionsSubMenu" style="display:none; flex-direction:column; margin-left:15px; border-left:1px solid var(--border-line); padding-left:10px;">
            <div class="nav-item" id="nav-crm" onclick="app.loadModule('admin_crm.html', 'nav-crm'); if(document.getElementById('sidebarOverlay')) document.getElementById('sidebarOverlay').click();" style="padding:10px; font-size:12px;"><i class="material-icons-round" style="font-size:16px;">recent_actors</i> Clienti Globali</div>
            
            <div class="nav-item" id="nav-magazzino" onclick="app.loadModule('admin_magazzino.html', 'nav-magazzino'); if(document.getElementById('sidebarOverlay')) document.getElementById('sidebarOverlay').click();" style="padding:10px; font-size:12px;"><i class="material-icons-round" style="font-size:16px; color:var(--green)">inventory_2</i> Magazzino Generale</div>

            <div class="nav-item" id="nav-treatments" onclick="app.loadModule('admin_trattamenti.html', 'nav-treatments'); if(document.getElementById('sidebarOverlay')) document.getElementById('sidebarOverlay').click();" style="padding:10px; font-size:12px;"><i class="material-icons-round" style="font-size:16px;">spa</i> Trattamenti Master</div>
            
            <div class="nav-item" id="nav-users" onclick="app.loadModule('admin_staff.html', 'nav-users'); if(document.getElementById('sidebarOverlay')) document.getElementById('sidebarOverlay').click();" style="padding:10px; font-size:12px;"><i class="material-icons-round" style="font-size:16px;">people</i> Collaboratori</div>
            
            <div class="nav-item ${isDocPage ? 'active' : ''}" id="nav-documents" onclick="app.loadModule('admin_documenti.html', 'nav-documents'); if(document.getElementById('sidebarOverlay')) document.getElementById('sidebarOverlay').click();" style="padding:10px; font-size:12px;"><i class="material-icons-round" style="font-size:16px;">folder</i> Documenti App</div>

            <div class="nav-item" id="nav-templates" onclick="app.loadModule('Admin_Templates.html', 'nav-templates'); if(document.getElementById('sidebarOverlay')) document.getElementById('sidebarOverlay').click();" style="padding:10px; font-size:12px;"><i class="material-icons-round" style="font-size:16px;">chat</i> Template WhatsApp</div>
            
            <div class="nav-item ${path.includes('v=privacy') ? 'active' : ''}" id="nav-privacy" onclick="app.switchView('privacy'); if(document.getElementById('sidebarOverlay')) document.getElementById('sidebarOverlay').click();" style="padding:10px; font-size:12px; color:var(--accent);"><i class="material-icons-round" style="font-size:16px;">cloud_done</i> Archivio Privacy Drive</div>

            <div class="nav-item" id="nav-options" onclick="app.loadModule('admin_opzioni.html', 'nav-options'); if(document.getElementById('sidebarOverlay')) document.getElementById('sidebarOverlay').click();" style="padding:10px; font-size:12px;"><i class="material-icons-round" style="font-size:16px;">palette</i> Opzioni Tema</div>
        </div>

        <div style="margin-top:auto; padding-top:20px; border-top:1px solid var(--border-line); text-align:center; font-size:10px; color:var(--text-muted); line-height:1.6">
            <button onclick="localStorage.clear(); window.location.href='../login.html'" style="width:100%; padding:10px; background:rgba(239, 68, 68, 0.1); color:var(--red); border:1px solid rgba(239, 68, 68, 0.3); border-radius:8px; font-weight:bold; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; margin-bottom:15px;"><i class="material-icons-round">logout</i> ESCI</button>
            <b style="color:var(--text-main); font-size:11px">BACCHI THOMAS</b><br>C.F. BCCTMS92S17F240A<br><span style="color:var(--red)">© ALL RIGHTS RESERVED</span>
        </div>
    </div>
    `;
    
    document.body.insertAdjacentHTML('afterbegin', menuHTML);

    setTimeout(() => {
        if(window.location.href.includes('admin_documenti.html') || window.location.href.includes('Admin_Templates.html') || window.location.href.includes('admin_staff.html') || window.location.href.includes('admin_magazzino.html') || window.location.href.includes('admin_trattamenti.html') || window.location.href.includes('admin_crm.html') || window.location.href.includes('admin_opzioni.html') || window.location.href.includes('v=privacy')) {
            const subMenuEl = document.getElementById('optionsSubMenu');
            const subMenuIcon = document.getElementById('optionsSubMenuIcon');
            if(subMenuEl && subMenuIcon) {
                subMenuEl.style.display = 'flex';
                subMenuIcon.style.transform = 'rotate(180deg)';
            }
        }
    }, 100);
};

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', window.injectAdminMenu); } else { window.injectAdminMenu(); }