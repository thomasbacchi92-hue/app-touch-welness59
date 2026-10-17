// pwa-install.js - Gestione del pulsante Installa App
let deferredPrompt;

// Registra il Service Worker cercando sw.js nella stessa cartella
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then((registration) => {
                console.log('Service Worker registrato con successo:', registration.scope);
            })
            .catch((error) => {
                console.error('Registrazione Service Worker fallita:', error);
            });
    });
}

// Cattura l'evento di installazione prima che il browser faccia da solo
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Trova il pulsante che si trova dentro Mobile.html
    const installButton = document.getElementById('btn-installa-app');
    if (installButton) {
        installButton.style.display = 'flex'; // Usiamo flex per mantenere l'icona allineata
        
        installButton.addEventListener('click', async () => {
            installButton.style.display = 'none';
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`Scelta dell'utente: ${outcome}`);
            deferredPrompt = null;
        });
    }
});

// Nascondi il pulsante se l'app è già stata installata
window.addEventListener('appinstalled', () => {
    const installButton = document.getElementById('btn-installa-app');
    if (installButton) {
        installButton.style.display = 'none';
    }
    console.log('Touch Wellness Mobile è stata installata correttamente.');
});