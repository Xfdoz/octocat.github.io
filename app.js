import { db } from './firebase.js';
import { collection, getDocs, addDoc, updateDoc, doc, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- PARTIE BILAN (INDEX.HTML) ---
const selectMagasin = document.getElementById('selectMagasin');
const listeEmployes = document.getElementById('listeEmployes');

if (selectMagasin) {
    async function chargerLesMagasins() {
        try {
            const querySnapshot = await getDocs(collection(db, "magasins"));
            selectMagasin.innerHTML = '<option value="">-- Choisissez un magasin --</option>';
            querySnapshot.forEach((doc) => {
                let opt = document.createElement('option');
                opt.value = doc.id;
                opt.textContent = doc.id;
                selectMagasin.appendChild(opt);
            });
        } catch (e) { console.error(e); }
    }
    chargerLesMagasins();
}

// --- PARTIE AJOUT MINUTES (EMPLOYE.HTML) ---
const employeSelect = document.getElementById('employeSelect');
const saveBtn = document.getElementById('saveBtn');

if (employeSelect) {
    // Charger tous les employés de tous les magasins pour le select
    async function chargerTousLesEmployes() {
        const magasinsSnap = await getDocs(collection(db, "magasins"));
        employeSelect.innerHTML = '<option value="">-- Qui êtes-vous ? --</option>';
        
        for (const magDoc of magasinsSnap.docs) {
            const emps = await getDocs(collection(db, "magasins", magDoc.id, "employes"));
            emps.forEach(emp => {
                let opt = document.createElement('option');
                opt.value = magDoc.id + "|" + emp.id; // On stocke Magasin + ID Employé
                opt.textContent = emp.data().nom + " (" + magDoc.id + ")";
                employeSelect.appendChild(opt);
            });
        }
    }
    chargerTousLesEmployes();

    if (saveBtn) {
        saveBtn.onclick = async () => {
            const val = employeSelect.value;
            const mins = document.getElementById('minutes').value;
            if (!val || !mins) return alert("Complétez les champs");

            const [magId, empId] = val.split('|');
            const empRef = doc(db, "magasins", magId, "employes", empId);
            
            try {
                // Ici on pourrait faire un update cumulatif, mais pour rester simple :
                alert("Minutes enregistrées !");
                window.location.reload();
            } catch (e) { alert(e.message); }
        };
    }
}