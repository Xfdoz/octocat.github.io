import { db } from './firebase.js';
import { doc, setDoc, collection, addDoc, getDocs, deleteDoc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- RÉINITIALISATION MENSUELLE AUTO ---
async function verifierResetMensuel() {
    const maintenant = new Date();
    const moisCle = `${maintenant.getFullYear()}-${maintenant.getMonth() + 1}`;
    const systemRef = doc(db, "config", "lastReset");
    
    try {
        const systemSnap = await getDoc(systemRef);
        if (!systemSnap.exists() || systemSnap.data().mois !== moisCle) {
            const magasinsSnap = await getDocs(collection(db, "magasins"));
            for (const magDoc of magasinsSnap.docs) {
                const empSnap = await getDocs(collection(db, "magasins", magDoc.id, "employes"));
                const updates = empSnap.docs.map(e => 
                    updateDoc(doc(db, "magasins", magDoc.id, "employes", e.id), { temps: 0 })
                );
                await Promise.all(updates);
            }
            await setDoc(systemRef, { mois: moisCle, dateReset: new Date() });
            alert("🌙 Nouveau mois : Tous les compteurs ont été réinitialisés à 0.");
            rafraichirDonnees();
        }
    } catch (e) { console.error("Erreur reset:", e); }
}

// --- AFFICHAGE DONNÉES & X-FLASH ---
async function rafraichirDonnees() {
    try {
        const magasinsSnap = await getDocs(collection(db, "magasins"));
        const detailContainer = document.getElementById('details-complets-magasins');
        const tableBody = document.getElementById('table-magasins-body');
        const selectAdmin = document.getElementById('selectMagasinAdmin');
        const xflashForm = document.getElementById('formulaire-xflash');

        let totalMagasins = magasinsSnap.size;
        let totalEmployes = 0;
        let tempsCumule = 0;
        let htmlXFlash = "";

        if (detailContainer) detailContainer.innerHTML = "";
        if (tableBody) tableBody.innerHTML = "";
        
        const currentSelectVal = selectAdmin ? selectAdmin.value : "";
        if (selectAdmin) selectAdmin.innerHTML = '<option value="">-- Choisir le magasin --</option>';

        for (const docSnap of magasinsSnap.docs) {
            const magId = docSnap.id;
            const empSnap = await getDocs(collection(db, "magasins", magId, "employes"));
            
            // Ligne du formulaire X-Flash avec Saisie des Montants Nuls
            htmlXFlash += `
                <div style="display:grid; grid-template-columns: 1fr 1.5fr; align-items:center; padding:10px; border-bottom:1px solid rgba(255,255,255,0.1);">
                    <span style="font-weight:bold; color:var(--accent-blue);">${magId}</span>
                    <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                        <label style="font-size:0.7rem;"><input type="checkbox" class="xf-matin" data-name="${magId}"> X-M</label>
                        <label style="font-size:0.7rem;"><input type="checkbox" class="xf-soir" data-name="${magId}"> X-S</label>
                        <input type="number" placeholder="Nul M(€)" class="val-nm" data-name="${magId}" style="width:65px; padding:2px; font-size:0.7rem; background:rgba(0,0,0,0.3); color:white; border:1px solid #444;">
                        <input type="number" placeholder="Nul S(€)" class="val-ns" data-name="${magId}" style="width:65px; padding:2px; font-size:0.7rem; background:rgba(0,0,0,0.3); color:white; border:1px solid #444;">
                    </div>
                </div>`;

            let htmlEmployes = "";
            let magTempsTotal = 0;

            empSnap.forEach(e => {
                const empData = e.data();
                const minutes = parseInt(empData.temps) || 0;
                totalEmployes++;
                tempsCumule += minutes;
                magTempsTotal += minutes;

                htmlEmployes += `
                    <tr>
                        <td style="padding: 10px 0;">${empData.nom}</td>
                        <td style="text-align: right; display: flex; gap: 5px; justify-content: flex-end;">
                            <span style="color: #00d2ff; font-weight: bold; line-height: 30px;">${minutes} min</span>
                            <button onclick="gererPhoto('${magId}', '${e.id}', '${empData.photo}', '${empData.nom}')" style="background:#6366f1; border:none; border-radius:5px; padding:5px 8px; cursor:pointer;">📷</button>
                            <button onclick="ajouterMinutesRapide('${magId}', '${e.id}', '${empData.nom}')" style="background:#10b981; border:none; border-radius:5px; padding:5px 8px; cursor:pointer;">➕</button>
                            <button onclick="reinitialiserTemps('${magId}', '${e.id}', '${empData.nom}')" style="background:#ef4444; border:none; border-radius:5px; padding:5px 8px; cursor:pointer;">🔄</button>
                        </td>
                    </tr>`;
            });

            if (detailContainer) {
                detailContainer.innerHTML += `
                    <div class="container" style="margin-bottom: 20px; border-left: 3px solid #00d2ff;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <h4 style="margin: 0;">${magId}</h4>
                            <small style="color: #00d2ff;">${magTempsTotal} min</small>
                        </div>
                        <table style="width: 100%; border-collapse: collapse;"><tbody>${htmlEmployes || '<tr><td style="color:#64748b;">Vide</td></tr>'}</tbody></table>
                    </div>`;
            }

            if (tableBody) {
                tableBody.innerHTML += `
                    <tr>
                        <td>${magId}</td>
                        <td>${empSnap.size} pers.</td>
                        <td>
                            <button class="btn-edit" onclick="editerMagasin('${magId}')">✏️</button>
                            <button class="btn-delete" onclick="supprimerMagasinSecurise('${magId}')">🗑️</button>
                        </td>
                    </tr>`;
            }

            if (selectAdmin) {
                let opt = document.createElement('option');
                opt.value = magId; opt.textContent = magId;
                selectAdmin.appendChild(opt);
            }
        }
        if (xflashForm) xflashForm.innerHTML = htmlXFlash;
        if(currentSelectVal && selectAdmin) selectAdmin.value = currentSelectVal;
        
        document.getElementById('kpi-magasins').innerText = totalMagasins;
        document.getElementById('kpi-employes').innerText = totalEmployes;
        document.getElementById('kpi-temps').innerText = tempsCumule + " min";
    } catch (error) { console.error(error); }
}

// --- RAPPORT X-FLASH & NULS AVEC MONTANTS ---
window.genererMessageRapport = () => {
    const date = new Date().toLocaleDateString('fr-FR', {day: '2-digit', month: '2-digit'});
    
    // Checkboxes X-Flash
    const xMatin = Array.from(document.querySelectorAll('.xf-matin:checked')).map(cb => cb.dataset.name);
    const xSoir = Array.from(document.querySelectorAll('.xf-soir:checked')).map(cb => cb.dataset.name);
    
    // Inputs Montants Nuls (On ne prend que ceux > 0)
    const nulMatin = Array.from(document.querySelectorAll('.val-nm'))
        .filter(input => input.value && parseFloat(input.value) > 0)
        .map(input => `${input.dataset.name} (${input.value}€)`);
        
    const nulSoir = Array.from(document.querySelectorAll('.val-ns'))
        .filter(input => input.value && parseFloat(input.value) > 0)
        .map(input => `${input.dataset.name} (${input.value}€)`);

    let rapport = `Equipe matin :\n\nBonjour, ( Si vous recevez le message = votre équipe est concernée )\n\nVoici le point sur les envois de l’équipe de la Matinée ${date} :\n\n`;
    
    rapport += `Magasins n’ayant pas envoyé le X Flash de la Matinée :\n${xMatin.length > 0 ? xMatin.map(m => `- ${m}`).join('\n') : '- Aucun'}\n\nTotal Manque X - Flash : ${xMatin.length}\n\n`;
    
    rapport += `Magasins n’ayant pas envoyé les Nuls Tickets de la Matinée :\n${nulMatin.length > 0 ? nulMatin.map(m => `- ${m}`).join('\n') : '- Aucun'}\n\nTotal Manque Nuls Tickets : ${nulMatin.length}\n\n`;
    
    rapport += `--------------------------\n\nEquipe Soir :\n\nD'autre part, voici le point sur les envois de l’équipe du Soir ${date} :\n\n`;
    
    rapport += `Magasins n’ayant pas envoyé le X Flash du Soir :\n${xSoir.length > 0 ? xSoir.map(m => `- ${m}`).join('\n') : '- Aucun'}\n\nTotal Manque X - Flash : ${xSoir.length}\n\n`;
    
    rapport += `Magasins n’ayant pas envoyé les Nuls Tickets du Soir :\n${nulSoir.length > 0 ? nulSoir.map(m => `- ${m}`).join('\n') : '- Aucun'}\n\nTotal Manque Nuls Tickets : ${nulSoir.length}`;
    
    document.getElementById('resultatRapport').value = rapport;
};

window.copierRapport = () => {
    const text = document.getElementById('resultatRapport');
    text.select();
    document.execCommand('copy');
    alert("Rapport copié avec succès !");
};

// --- ACTIONS EMPLOYES & MAGASINS ---
window.gererPhoto = (magId, empId, photoNom, nom) => {
    const overlay = document.createElement('div');
    overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); display:flex; justify-content:center; align-items:center; z-index:1000; cursor:pointer;";
    overlay.onclick = () => overlay.remove();
    const src = photoNom ? `photos/${photoNom}` : "https://cdn-icons-png.flaticon.com/512/149/149071.png";
    overlay.innerHTML = `<div style="text-align:center;"><img src="${src}" onerror="this.src='https://cdn-icons-png.flaticon.com/512/149/149071.png'" style="max-width:300px; border-radius:10px; border: 2px solid #00d2ff;"><h2 style="color:white; margin-top:10px;">${nom}</h2></div>`;
    document.body.appendChild(overlay);
};

window.configurerNomPhoto = async (magId, empId, actuel, nom) => {
    const nouveau = prompt(`Fichier image pour ${nom} :`, actuel || "");
    if (nouveau !== null) {
        await updateDoc(doc(db, "magasins", magId, "employes", empId), { photo: nouveau });
        window.chargerEmployesDuMagasin(magId);
        rafraichirDonnees();
    }
};

window.ajouterMinutesRapide = async (magId, empId, nom) => {
    const montant = prompt(`Ajouter minutes à ${nom} :`, "15");
    if (!montant || isNaN(montant)) return;
    const empRef = doc(db, "magasins", magId, "employes", empId);
    const snap = await getDoc(empRef);
    await updateDoc(empRef, { temps: (snap.data().temps || 0) + parseInt(montant) });
    rafraichirDonnees();
};

window.reinitialiserTemps = async (magId, empId, nom) => {
    if(confirm(`Mettre à 0 ${nom} ?`)) {
        await updateDoc(doc(db, "magasins", magId, "employes", empId), { temps: 0 });
        rafraichirDonnees();
    }
};

window.creerMagasin = async () => {
    const nom = document.getElementById('nomMagasin').value.trim();
    if (!nom) return;
    await setDoc(doc(db, "magasins", nom), { creeLe: new Date() });
    document.getElementById('nomMagasin').value = "";
    rafraichirDonnees();
};

window.ajouterEmploye = async () => {
    const mag = document.getElementById('selectMagasinAdmin').value;
    const nom = document.getElementById('nomEmploye').value.trim();
    const temps = document.getElementById('tempsTel').value;
    if (!mag || !nom) return alert("Magasin et Nom requis");
    await addDoc(collection(db, "magasins", mag, "employes"), {
        nom: nom,
        temps: parseInt(temps) || 0,
        photo: "",
        dateAjout: new Date()
    });
    document.getElementById('nomEmploye').value = "";
    document.getElementById('tempsTel').value = "";
    window.chargerEmployesDuMagasin(mag);
    rafraichirDonnees();
};

window.chargerEmployesDuMagasin = async (magId) => {
    const container = document.getElementById('liste-employes-edition');
    if (!magId) { container.innerHTML = ""; return; }
    const empSnap = await getDocs(collection(db, "magasins", magId, "employes"));
    let html = `<table class="admin-table">`;
    empSnap.forEach(e => {
        const d = e.data();
        html += `<tr><td>${d.nom}</td><td style="text-align:right;"><button onclick="configurerNomPhoto('${magId}', '${e.id}', '${d.photo}', '${d.nom}')" style="background:#6366f1; color:white; border:none; border-radius:4px; padding:3px 8px; margin-right:5px; cursor:pointer;">📷 Image</button><button onclick="supprimerEmploye('${magId}', '${e.id}', '${d.nom}')" style="background:none; border:none; color:#ef4444; cursor:pointer;">✕</button></td></tr>`;
    });
    container.innerHTML = html + "</table>";
};

window.supprimerEmploye = async (magId, empId, nom) => {
    if (confirm(`Supprimer ${nom} ?`)) {
        await deleteDoc(doc(db, "magasins", magId, "employes", empId));
        window.chargerEmployesDuMagasin(magId);
        rafraichirDonnees();
    }
};

window.supprimerMagasinSecurise = async (id) => {
    if (confirm("🚨 ATTENTION : Supprimer le magasin " + id + " supprimera tout son historique. Confirmer ?")) {
        await deleteDoc(doc(db, "magasins", id));
        rafraichirDonnees();
    }
};

window.editerMagasin = (id) => {
    window.switchTab('employes');
    setTimeout(() => {
        const select = document.getElementById('selectMagasinAdmin');
        if(select) { select.value = id; window.chargerEmployesDuMagasin(id); }
    }, 100);
};

window.filtrerDashboardAdmin = () => {
    const input = document.getElementById('adminSearchInput').value.toLowerCase();
    const containers = document.querySelectorAll('#details-complets-magasins > .container');
    containers.forEach(c => c.style.display = c.innerText.toLowerCase().includes(input) ? "" : "none");
};

// --- INIT ---
verifierResetMensuel();
rafraichirDonnees();