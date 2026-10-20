import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, updateDoc, onSnapshot, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAAQ4f1wD8W3WOoZANRO5KvOJW2gfP_wwE",
    authDomain: "bancomovil-421ff.firebaseapp.com",
    projectId: "bancomovil-421ff",
    storageBucket: "bancomovil-421ff.firebasestorage.app",
    messagingSenderId: "280973267975",
    appId: "1:280973267975:web:c99d0bc0cd665faee346a2",
    measurementId: "G-LJH4R34Y63"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

let allUsers = [];

window.onload = function() {
    applyAdminAndroidMobileLayoutIfNeeded();
    document.getElementById('adminLoginForm')?.addEventListener('submit', handleAdminLogin);
    document.getElementById('adminLogoutBtn')?.addEventListener('click', handleAdminLogout);
    document.getElementById('refreshUsersBtn')?.addEventListener('click', loadUsers);
};

// LOGIN DEL ADMINISTRADOR (Valida con Firebase Auth o Credencial Segura)
async function handleAdminLogin(e) {
    e.preventDefault();
    const userInput = document.getElementById('adminUser').value.trim();
    const pass = document.getElementById('adminPass').value;

    if (!userInput || !pass) {
        showToast("Ingresa usuario y contraseña", "error");
        return;
    }

    try {
        // Opción 1: Si tu admin es un usuario registrado en Firebase Auth
        let adminEmail = userInput;
        if (!adminEmail.includes('@')) {
            adminEmail = `${userInput}@paynova.com`;
        }

        await signInWithEmailAndPassword(auth, adminEmail, pass);
        
        document.getElementById('adminAuthScreen').classList.add('hidden');
        document.getElementById('adminMainContent').classList.remove('hidden');
        showToast("¡Bienvenido al Panel de Administración!", "success");
        loadUsers();

    } catch (error) {
        console.error("Error admin login:", error);
        // Opción 2 de respaldo: Credencial maestra fija si prefieres usarla
        if (userInput === "admin" && pass === "Admin2026*") {
            document.getElementById('adminAuthScreen').classList.add('hidden');
            document.getElementById('adminMainContent').classList.remove('hidden');
            showToast("¡Bienvenido al Panel de Administración (Modo Maestro)!", "success");
            loadUsers();
        } else {
            showToast("Credenciales de administrador incorrectas", "error");
        }
    }
}

function handleAdminLogout() {
    document.getElementById('adminMainContent').classList.add('hidden');
    document.getElementById('adminAuthScreen').classList.remove('hidden');
    showToast("Sesión de admin cerrada", "info");
}

// CARGAR USUARIOS EN TIEMPO REAL DESDE FIREBASE
function loadUsers() {
    onSnapshot(collection(db, "users"), (snapshot) => {
        allUsers = [];
        let totalMoney = 0;
        let pendingCount = 0;

        snapshot.forEach((docSnap) => {
            const userData = { id: docSnap.id, ...docSnap.data() };
            allUsers.push(userData);
            totalMoney += userData.saldo || 0;
            if (userData.enRevision) pendingCount++;
        });

        document.getElementById('totalUsersCount').innerText = allUsers.length;
        document.getElementById('pendingUsersCount').innerText = pendingCount;
        document.getElementById('totalSystemBalance').innerText = `$${totalMoney.toFixed(2)}`;

        renderAdminTable(allUsers);
    });
}

function renderAdminTable(users) {
    const tbody = document.getElementById('adminUsersTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-4 text-center text-xs text-gray-500">No hay usuarios registrados.</td></tr>`;
        return;
    }

    users.forEach((user) => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-800/50 transition-colors";
        
        let statusBadge = '';
        if (user.enRevision) {
            statusBadge = `<span class="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-bold rounded-full">EN REVISIÓN</span>`;
        } else if (user.aprobado) {
            statusBadge = `<span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full">APROBADO</span>`;
        } else {
            statusBadge = `<span class="px-2 py-0.5 bg-rose-500/20 text-rose-400 text-[10px] font-bold rounded-full">RECHAZADO</span>`;
        }

        const cedulaLink = user.cedulaUrl ? `<a href="${user.cedulaUrl}" target="_blank" class="text-indigo-400 underline text-xs">Ver Cédula</a>` : 'Sin foto';
        const faceLink = user.faceUrl ? `<a href="${user.faceUrl}" target="_blank" class="text-brand-400 underline text-xs">Ver Rostro</a>` : 'Sin rostro';

        tr.innerHTML = `
            <td class="py-3 px-4">
                <p class="font-bold text-white text-xs">${user.name || 'Sin Nombre'}</p>
                <p class="text-[10px] text-gray-400">Saldo: $${(user.saldo || 0).toFixed(2)}</p>
            </td>
            <td class="py-3 px-4 text-xs text-gray-300">${user.cedula || 'N/A'}</td>
            <td class="py-3 px-4 text-xs text-gray-300 uppercase">${user.accountType || 'Mayor'}</td>
            <td class="py-3 px-4">${cedulaLink}</td>
            <td class="py-3 px-4">${faceLink}</td>
            <td class="py-3 px-4">${statusBadge}</td>
            <td class="py-3 px-4 text-right space-x-1">
                <button onclick="approveUser('${user.id}', true)" class="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-lg">Aprobar</button>
                <button onclick="approveUser('${user.id}', false)" class="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold rounded-lg">Rechazar</button>
                <button onclick="openModifyBalanceModal('${user.id}', '${user.name}')" class="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-lg">Modificar Saldo</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.approveUser = async function(userId, approve) {
    try {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
            enRevision: false,
            aprobado: approve
        });
        showToast(approve ? "Usuario aprobado con éxito" : "Usuario rechazado", approve ? "success" : "error");
    } catch (err) {
        showToast("Error al actualizar estado: " + err.message, "error");
    }
}

window.openModifyBalanceModal = function(userId, userName) {
    const modalHtml = `
        <div class="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div class="bg-darkcard border border-darkborder rounded-3xl max-w-sm w-full p-6 text-white space-y-4 shadow-2xl">
                <h3 class="text-base font-bold">Modificar Saldo: ${userName}</h3>
                <div class="space-y-3 text-xs">
                    <div>
                        <label class="block text-gray-400 uppercase mb-1">Acción</label>
                        <select id="modAction" class="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-white">
                            <option value="agregar">Agregar Dinero (Depósito/Bono)</option>
                            <option value="quitar">Quitar Dinero (Retiro/Cobro)</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-gray-400 uppercase mb-1">Monto (USD)</label>
                        <input type="number" id="modAmount" step="0.01" placeholder="0.00" class="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-white">
                    </div>
                    <div>
                        <label class="block text-gray-400 uppercase mb-1">Motivo o Concepto</label>
                        <input type="text" id="modMotivo" placeholder="Ej. Aprobación de depósito / Retiro procesado" class="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-white">
                    </div>
                </div>
                <div class="flex gap-2 pt-2">
                    <button onclick="closeCustomModal()" class="flex-1 py-2.5 bg-slate-800 text-gray-300 rounded-xl text-xs font-bold">Cancelar</button>
                    <button onclick="executeBalanceModification('${userId}')" class="flex-1 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold">Confirmar</button>
                </div>
            </div>
        </div>
    `;
    const div = document.createElement('div');
    div.id = "customModalContainer";
    div.innerHTML = modalHtml;
    document.body.appendChild(div);
}

window.closeCustomModal = function() {
    document.getElementById('customModalContainer')?.remove();
}

window.executeBalanceModification = async function(userId) {
    const action = document.getElementById('modAction').value;
    const amount = parseFloat(document.getElementById('modAmount').value);
    const motivo = document.getElementById('modMotivo').value.trim();

    if (!amount || amount <= 0) {
        showToast("Ingresa un monto válido", "error");
        return;
    }
    if (!motivo) {
        showToast("Debes ingresar un motivo", "error");
        return;
    }

    const userObj = allUsers.find(u => u.id === userId);
    if (!userObj) return;

    let newBalance = userObj.saldo || 0;

    if (action === 'agregar') {
        newBalance += amount;
    } else {
        if (amount > newBalance) {
            showToast("El usuario no tiene suficiente saldo para retirar esa cantidad", "error");
            return;
        }
        newBalance -= amount;
    }

    try {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, { saldo: newBalance });

        showToast(`Saldo actualizado correctamente. Motivo: ${motivo}`, "success");
        closeCustomModal();
        loadUsers();
    } catch (err) {
        showToast("Error al actualizar saldo: " + err.message, "error");
    }
}

function showToast(message, type = "info") {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `px-4 py-3 rounded-xl shadow-xl text-white text-xs font-semibold ${type === 'success' ? 'bg-emerald-600' : type === 'error' ? 'bg-rose-600' : 'bg-indigo-600'}`;
    toast.innerHTML = `<i class="fa-solid fa-circle-info mr-2"></i>${message}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}
// DETECTAR ANDROID Y ADAPTAR EL PANEL ADMIN COMO APLICACIÓN MÓVIL
function applyAdminAndroidMobileLayoutIfNeeded() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isAndroid = /android/i.test(userAgent);

    if (isAndroid) {
        console.log("Android detectado en Admin. Adaptando panel a vista móvil...");

        // Ajustar el header superior para que los botones no se desborden en pantallas angostas
        const header = document.querySelector('header');
        if (header) {
            header.className = "bg-darkcard border-b border-darkborder px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3";
        }

        // Permitir desplazamiento horizontal fluido en las tablas de usuarios y solicitudes
        document.querySelectorAll('.overflow-x-auto').forEach(container => {
            container.style.webkitOverflowScrolling = 'touch';
            container.className += " shadow-inner border border-slate-800/80 rounded-2xl";
        });

        // Asegurar que las tarjetas de estadísticas se acomoden en columna en celulares
        const statsGrid = document.querySelector('.grid.grid-cols-1');
        if (statsGrid) {
            statsGrid.className = "grid grid-cols-1 gap-4";
        }
    }
}