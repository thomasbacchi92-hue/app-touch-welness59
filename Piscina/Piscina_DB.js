/* Database Manager - Piscina Module v30.0 - FULL CLOUD FIREBASE */

const fbConfigPool = {
    apiKey: "AIzaSyCrDuK7SWHdbzrJR-pNpxmRwGnZgV2Dd2Y",
    authDomain: "touch-welness-massage.firebaseapp.com",
    databaseURL: "https://touch-welness-massage-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "touch-welness-massage",
    storageBucket: "touch-welness-massage.firebasestorage.app"
};

// Inizializza solo se non esiste già
if (!firebase.apps.length) firebase.initializeApp(fbConfigPool);

// Recupera ID Struttura (che serve per sapere in quale cartella di Firebase entrare)
const currentStructureId = localStorage.getItem("tw_structure_id");

if (!currentStructureId) {
    alert("Sessione scaduta. Effettua il Login.");
    window.location.href = "../login.html";
    throw new Error("Accesso Negato: ID Struttura mancante"); 
}

// Punta ESCLUSIVAMENTE a Firebase
const poolRef = firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + currentStructureId + '/piscina_db_v1');
const settingsRef = firebase.database().ref('MASTER_ADMIN_DB/structures_data/' + currentStructureId + '/settings/orari_moduli');

// Variabili locali di appoggio (non salvano nella cache del browser)
let poolData = {};
let dbOrari = { piscina: {}, spa: {} };

function initDB() {
    // Resta in ascolto degli appuntamenti
    poolRef.on('value', snapshot => {
        poolData = snapshot.val() || {};
        if(typeof loadPoolData === "function") loadPoolData();
    });

    // Resta in ascolto delle impostazioni orari
    settingsRef.on('value', snap => {
        const val = snap.val() || {};
        dbOrari.piscina = val.piscina || buildDefaultOrari();
        dbOrari.spa = val.spa || buildDefaultOrari();
        if(typeof loadPoolData === "function") loadPoolData();
    });
}

function buildDefaultOrari() {
    let obj = {};
    // Default 7 giorni aperti 10:00 - 19:00
    for(let i=1; i<=7; i++) obj[i] = { active: true, m_in: "10:00", m_out: "13:00", p_in: "14:00", p_out: "19:00" };
    return obj;
}

function savePoolEntry(date, entry, isFullUpdate = false) {
    if (!poolData) poolData = {};
    if (!poolData[date]) poolData[date] = [];

    if (!isFullUpdate && entry) {
        poolData[date].push(entry);
    }

    // Forza la scrittura FISICA SUL SERVER (No Cache)
    poolRef.child(date).set(poolData[date])
        .then(() => {
            if(typeof loadPoolData === "function") loadPoolData();
        })
        .catch((error) => {
            console.error("Errore salvataggio Cloud:", error);
        });
}

function removePoolEntry(date, id) {
    if(poolData[date]) {
        poolData[date] = poolData[date].filter(x => x.id !== id);
        // Cancella FISICAMENTE DAL SERVER
        poolRef.child(date).set(poolData[date]);
    }
}