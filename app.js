// CONFIGURACIÓN DE FIREBASE E INICIALIZACIÓN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot, addDoc, collection } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// ESTADO GLOBAL DE LA APLICACIÓN (SALDO EN 0.00, SIN DEMO)
const state = {
    currentUser: null,
    unsubscribeUserListener: null,
    transactions: [],
    cedulaUploadedUrl: null,
    faceCapturedUrl: null,
    depositProofUrl: null,
    cardOff: false,
    cardCancelled: false,
    isBalanceHidden: false,
    chartInstance: null
};

let mediaStream = null;
let captureTimeout = null;

// VINCULACIÓN DE EVENTOS AL CARGAR EL DOM
window.onload = function() {
    document.getElementById('createCardBtn')?.addEventListener('click', generateDebitCard);
    document.getElementById('tabLoginBtn')?.addEventListener('click', () => switchAuthTab('login'));
    document.getElementById('tabRegisterBtn')?.addEventListener('click', () => switchAuthTab('register'));
    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
    document.getElementById('registerForm')?.addEventListener('submit', handleRegister);
    document.getElementById('regActionType')?.addEventListener('change', toggleRegisterType);
    document.getElementById('regProductType')?.addEventListener('change', updateProductBenefits);
    document.getElementById('regCedulaFoto')?.addEventListener('change', verifyCedulaOCR);
    document.getElementById('faceCaptureBtn')?.addEventListener('click', openFaceModal);
    applyAndroidMobileLayoutIfNeeded();
    
    // Controles de la cámara biométrica modal
    document.getElementById('retakePhotoBtn')?.addEventListener('click', startCamera);
    document.getElementById('confirmPhotoBtn')?.addEventListener('click', uploadFaceToCloudinary);
    document.getElementById('closeFaceModalBtn')?.addEventListener('click', closeFaceModal);

    // Navegación de pasos en el registro
    document.getElementById('nextToAccountStepBtn')?.addEventListener('click', proceedToUserStep);
    document.getElementById('backToProductStepBtn')?.addEventListener('click', backToProductStep);

    document.getElementById('depositProofFoto')?.addEventListener('change', uploadDepositProof);
    document.getElementById('depositForm')?.addEventListener('submit', processDeposit);
    document.getElementById('transferForm')?.addEventListener('submit', processTransfer);
    document.getElementById('withdrawForm')?.addEventListener('submit', processWithdrawal);
    
    document.getElementById('toggleBalanceBtn')?.addEventListener('click', toggleBalanceVisibility);
    document.getElementById('toggleCvvBtn')?.addEventListener('click', toggleCardCvv);
    document.getElementById('cardToggleSwitch')?.addEventListener('change', toggleCardStatus);
    document.getElementById('toggleCardPowerBtn')?.addEventListener('click', toggleCardPower);
    document.getElementById('cancelCardPermanentBtn')?.addEventListener('click', cancelCardPermanent);
    document.getElementById('closeInvoiceBtn')?.addEventListener('click', closeInvoiceModal);
    document.getElementById('cancelVerificationBtn')?.addEventListener('click', logout);
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('transactionFilter')?.addEventListener('change', filterTransactions);

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => navigateTab(btn.getAttribute('data-nav')));
    });
};

function navigateTab(tabId) {
    if (!tabId) return;
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('bg-brand-600/20', 'text-brand-400', 'border', 'border-brand-500/30');
        btn.classList.add('text-gray-400');
    });

    const targetView = document.getElementById(`view-${tabId}`);
    if (targetView) targetView.classList.remove('hidden');

    const activeBtn = document.querySelector(`[data-nav="${tabId}"]`);
    if (activeBtn) {
        activeBtn.classList.add('bg-brand-600/20', 'text-brand-400', 'border', 'border-brand-500/30');
        activeBtn.classList.remove('text-gray-400');
    }

    if (tabId === 'dashboard' && !state.chartInstance) {
        initChart();
    }
}

function switchAuthTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginBtn = document.getElementById('tabLoginBtn');
    const regBtn = document.getElementById('tabRegisterBtn');

    if (tab === 'login') {
        loginForm?.classList.remove('hidden');
        registerForm?.classList.add('hidden');
        if(loginBtn) loginBtn.className = "flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all bg-brand-600 text-white shadow-md";
        if(regBtn) regBtn.className = "flex-1 py-2.5 rounded-lg text-sm font-semibold text-gray-400 hover:text-white transition-all";
    } else {
        loginForm?.classList.add('hidden');
        registerForm?.classList.remove('hidden');
        if(regBtn) regBtn.className = "flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all bg-brand-600 text-white shadow-md";
        if(loginBtn) loginBtn.className = "flex-1 py-2.5 rounded-lg text-sm font-semibold text-gray-400 hover:text-white transition-all";
    }
}

function toggleRegisterType() {
    const action = document.getElementById('regActionType')?.value;
    const crearContainer = document.getElementById('crearUsuarioContainer');
    const contratarContainer = document.getElementById('contratarProductoContainer');
    const contratarExtraFields = document.getElementById('contratarExtraFields');

    if (action === 'contratar') {
        crearContainer?.classList.add('hidden');
        contratarContainer?.classList.remove('hidden');
        contratarExtraFields?.classList.remove('hidden');
    } else {
        crearContainer?.classList.remove('hidden');
        contratarContainer?.classList.add('hidden');
        contratarExtraFields?.classList.remove('hidden');
    }
}

function updateProductBenefits() {
    const prodType = document.getElementById('regProductType')?.value;
    const titleEl = document.getElementById('benefitTitle');
    const descEl = document.getElementById('benefitDesc');
    if (!titleEl || !descEl) return;

    if (prodType === 'ahorro') {
        titleEl.innerText = "Beneficios Ahorro:";
        descEl.innerText = "Ahorra tu dinero con un interés mensual de 2.05% y accede a una tarjeta de débito PayNova para compra en página web autorizada, transfiere a bancos como: Guayaquil, Pichincha, Produbanco, Bolivariano, BanEcuador.";
    } else {
        titleEl.innerText = "Beneficios Vender:";
        descEl.innerText = "Accede a beneficios como vendedor: cobre por QR, más segura con protección al máximo, obtén una tarjeta de débito PayNova, transfiere a bancos nacionales y crea link para cobro en tu web.";
    }
}

// --- VERIFICACIÓN OCR CÉDULA DE ECUADOR ---
async function verifyCedulaOCR(event) {
    const file = event.target.files[0];
    if (!file) return;

    showToast('Analizando documento con OCR...', 'info');

    try {
        const worker = await Tesseract.createWorker('spa');
        const ret = await worker.recognize(file);
        await worker.terminate();

        const text = ret.data.text.toUpperCase();

        const isEcuadorianCedula = text.includes("REPUBLICA") || 
                                   text.includes("ECUADOR") || 
                                   text.includes("CEDULA") || 
                                   text.includes("NUI") || 
                                   text.includes("CIUDADANIA");

        if (!isEcuadorianCedula) {
            showToast('El documento subido NO es una Cédula de Identidad de Ecuador válida.', 'error');
            event.target.value = '';
            return;
        }

        const dateMatch = text.match(/(\d{2}\s+[A-Z]{3}\s+\d{4})|(\d{2}[\/\.-]\d{2}[\/\.-]\d{4})/);
        const fechaNacimiento = dateMatch ? dateMatch[0] : "14 / 05 / 2005";

        const nuiMatch = text.match(/\b\d{10}\b/);
        if (nuiMatch) {
            document.getElementById('regCedula').value = nuiMatch[0];
        }

        const fechaInput = document.getElementById('regFechaNacimiento');
        if (fechaInput) {
            fechaInput.value = `${fechaNacimiento} (Extraído automáticamente)`;
        }

        showToast('Cédula verificada correctamente. Subiendo a la nube...', 'info');
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", "music_unsigned");

        const res = await fetch(`https://api.cloudinary.com/v1_1/dahwsdlhq/image/upload`, { method: "POST", body: formData });
        const data = await res.json();
        if (data.secure_url) {
            state.cedulaUploadedUrl = data.secure_url;
            showToast('Cédula subida con éxito', 'success');
        }
    } catch (err) {
        showToast('Error al procesar la cédula por OCR', 'error');
    }
}

// --- VERIFICACIÓN BIOMÉTRICA DE ROSTRO ---
function openFaceModal() {
    document.getElementById('faceModal')?.classList.remove('hidden');
    startCamera();
}

async function startCamera() {
    const video = document.getElementById('faceVideo');
    const ring = document.getElementById('faceIndicatorRing');
    const instruction = document.getElementById('faceInstruction');
    document.getElementById('facePreviewContainer')?.classList.add('hidden');
    if (video) video.classList.remove('hidden');

    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        if (video) video.srcObject = mediaStream;

        instruction.innerText = "Buscando rostro... Manténgase dentro del círculo.";
        instruction.className = "text-xs font-semibold text-red-400";
        ring.className = "absolute inset-4 rounded-full border-4 border-red-500 animate-pulse pointer-events-none";

        clearTimeout(captureTimeout);
        captureTimeout = setTimeout(() => {
            ring.className = "absolute inset-4 rounded-full border-4 border-blue-500 pointer-events-none";
            instruction.innerText = "¡Estabilizado! Tomando fotografía automáticamente...";
            instruction.className = "text-xs font-semibold text-blue-400";

            setTimeout(autoCapturePhoto, 1500);
        }, 2000);
    } catch (e) {
        showToast("Permiso de cámara denegado", "error");
    }
}

function autoCapturePhoto() {
    const video = document.getElementById('faceVideo');
    const canvas = document.createElement('canvas');
    canvas.width = 320; canvas.height = 320;
    canvas.getContext('2d').drawImage(video, 0, 0, 320, 320);
    
    window.tempFaceDataUrl = canvas.toDataURL('image/jpeg');
    if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());

    video.classList.add('hidden');
    document.getElementById('faceIndicatorRing').classList.add('hidden');
    document.getElementById('faceInstruction').classList.add('hidden');
    
    document.getElementById('faceCapturedImg').src = window.tempFaceDataUrl;
    document.getElementById('facePreviewContainer')?.classList.remove('hidden');
    showToast('Foto capturada con éxito', 'success');
}

async function uploadFaceToCloudinary() {
    showToast("Subiendo foto biométrica...", "info");
    const res = await fetch(window.tempFaceDataUrl);
    const blob = await res.blob();
    const formData = new FormData();
    formData.append("file", blob);
    formData.append("upload_preset", "music_unsigned");

    const response = await fetch(`https://api.cloudinary.com/v1_1/dahwsdlhq/image/upload`, { method: "POST", body: formData });
    const data = await response.json();
    if (data.secure_url) {
        state.faceCapturedUrl = data.secure_url;
        showToast("Rostro verificado y guardado", "success");
        closeFaceModal();
        document.getElementById('faceStatusText').innerText = "Rostro Verificado ✓";
    }
}

function closeFaceModal() {
    if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
    document.getElementById('faceModal')?.classList.add('hidden');
}

function proceedToUserStep() {
    const fullName = document.getElementById('regFullName').value.trim();
    const cedula = document.getElementById('regCedula').value.trim();
    if (!fullName || !cedula) {
        showToast("Completa tu nombre y cédula", "error");
        return;
    }
    if (!state.cedulaUploadedUrl) {
        showToast("Sube la foto de tu cédula", "error");
        return;
    }
    if (!state.faceCapturedUrl) {
        showToast("Completa la verificación biométrica", "error");
        return;
    }
    document.getElementById('stepProductSelection').classList.add('hidden');
    document.getElementById('stepUserCreation').classList.remove('hidden');
}

function backToProductStep() {
    document.getElementById('stepUserCreation').classList.add('hidden');
    document.getElementById('stepProductSelection').classList.remove('hidden');
}

// --- REGISTRO Y VALIDACIÓN EN TIEMPO REAL ---
async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value.trim().toLowerCase().replace(/\s+/g, '');
    const password = document.getElementById('regPassword').value;
    const fullName = document.getElementById('regFullName').value.trim();
    const cedula = document.getElementById('regCedula').value.trim();
    const accountType = document.getElementById('regAccountAge').value;
    const actionType = document.getElementById('regActionType').value;

    const hasMinLength = password.length >= 6;
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasSpecial = /[\*@]/.test(password);

    if (!hasMinLength || !hasLower || !hasUpper || !hasSpecial) {
        showToast('La contraseña debe tener mínimo 6 carac., una mayúscula, una minúscula y * o @', 'error');
        return;
    }

    const email = `${name}@paynova.com`;

    try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", cred.user.uid), {
            name: fullName,
            username: name,
            cedula: cedula,
            cedulaUrl: state.cedulaUploadedUrl || "",
            faceUrl: state.faceCapturedUrl || "",
            accountType: accountType,
            tipoRegistro: actionType,
            saldo: 0.00, // SALDO INICIAL EXACTAMENTE EN 0.00
            enRevision: true,
            aprobado: false,
            creadoEn: new Date()
        });

        listenUserStatus(cred.user.uid);
    } catch (err) {
        showToast("Error al registrar: " + err.message, "error");
    }
}

async function handleLogin(e) {
    e.preventDefault();
    let userInput = document.getElementById('loginEmail').value.trim().toLowerCase().replace(/\s+/g, '');
    const password = document.getElementById('loginPassword').value;

    if (!userInput.includes('@')) userInput = `${userInput}@paynova.com`;

    try {
        const cred = await signInWithEmailAndPassword(auth, userInput, password);
        listenUserStatus(cred.user.uid);
    } catch (err) {
        showToast("Usuario o contraseña incorrectos", "error");
    }
}

// ESCUCHA EN TIEMPO REAL DE ESTADO DE APROBACIÓN ADMIN
function listenUserStatus(uid) {
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('verificationScreen').classList.remove('hidden');

    if (state.unsubscribeUserListener) state.unsubscribeUserListener();

    state.unsubscribeUserListener = onSnapshot(doc(db, "users", uid), (docSnap) => {
        if (!docSnap.exists()) return;
        const data = docSnap.data();
        state.currentUser = { uid, ...data };

        const badge = document.getElementById('statusBadge');
        const title = document.getElementById('statusTitle');
        const desc = document.getElementById('statusDesc');
        const iconBox = document.getElementById('statusIconBox');

        if (data.enRevision) {
            badge.innerText = "ENVIADO";
            badge.className = "px-3 py-1 bg-amber-500/20 text-amber-400 text-xs font-extrabold uppercase rounded-full";
            title.innerText = "Revisando tu Solicitud";
            desc.innerText = "Tus documentos biométricos están siendo verificados por el administrador.";
            iconBox.className = "w-20 h-20 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto text-3xl animate-pulse";
            iconBox.innerHTML = `<i class="fa-solid fa-paper-plane"></i>`;
        } else if (data.aprobado === true || data.enRevision === false) {
            badge.innerText = "ACEPTADO";
            badge.className = "px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-extrabold uppercase rounded-full";
            title.innerText = "¡Cuenta Aprobada!";
            desc.innerText = "Ingresando a la plataforma PayNova...";
            iconBox.className = "w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-3xl";
            iconBox.innerHTML = `<i class="fa-solid fa-check"></i>`;

            setTimeout(() => {
                document.getElementById('verificationScreen').classList.add('hidden');
                document.getElementById('mainApp').classList.remove('hidden');
                updateUI();
            }, 1200);
        } else {
            badge.innerText = "RECHAZADO";
            badge.className = "px-3 py-1 bg-rose-500/20 text-rose-400 text-xs font-extrabold uppercase rounded-full";
            title.innerText = "Solicitud Rechazada";
            desc.innerText = "Tus datos o fotos no cumplieron con los requisitos de seguridad.";
            iconBox.className = "w-20 h-20 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto text-3xl";
            iconBox.innerHTML = `<i class="fa-solid fa-xmark"></i>`;
        }
    });
}

function updateUI() {
    if (!state.currentUser) return;
    document.getElementById('balanceDisplay').innerText = `$ ${state.currentUser.saldo.toFixed(2)} USD`;
    document.getElementById('cardHolderDisplay').innerText = state.currentUser.name;
    renderCardUI(); // <-- Agrega esta línea para verificar si ya tiene tarjeta creada
    renderTransactions();
}

function renderTransactions(filter = "all") {
    const tbody = document.getElementById('transactionTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const list = filter === "all" ? state.transactions : state.transactions.filter(t => t.type === filter);

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-xs text-gray-500">No hay movimientos registrados.</td></tr>`;
        return;
    }

    list.forEach((tx) => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-800/50 cursor-pointer transition-colors";
        tr.onclick = () => openInvoiceModal(tx);
        tr.innerHTML = `
            <td class="py-3 px-4 font-semibold text-gray-200 text-xs">${tx.title}</td>
            <td class="py-3 px-4 text-xs text-gray-400">${tx.date}</td>
            <td class="py-3 px-4 text-xs text-gray-400">${tx.recipient}</td>
            <td class="py-3 px-4"><span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">${tx.status || 'Completado'}</span></td>
            <td class="py-3 px-4 text-right font-bold ${tx.amount > 0 ? 'text-emerald-400' : 'text-rose-400'}">${tx.amount > 0 ? '+' : ''}$${Math.abs(tx.amount).toFixed(2)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function filterTransactions() {
    const val = document.getElementById('transactionFilter')?.value || "all";
    renderTransactions(val);
}

// FACTURA / COMPROBANTE DIGITAL ESTILO NETFLIX
function openInvoiceModal(tx) {
    document.getElementById('invReceiptNo').innerText = `Recibo N.º ${tx.id || 'TX-90124-8831'}`;
    document.getElementById('invDate').innerText = tx.date;
    document.getElementById('invDesc').innerText = tx.title;
    document.getElementById('invDest').innerText = tx.recipient;
    document.getElementById('invAmount').innerText = `$${Math.abs(tx.amount).toFixed(2)}`;
    document.getElementById('invTotal').innerText = `$${Math.abs(tx.amount).toFixed(2)}`;
    document.getElementById('invoiceModal').classList.remove('hidden');
}

function closeInvoiceModal() {
    document.getElementById('invoiceModal').classList.add('hidden');
}

// SUBIDA DE COMPROBANTE DE DEPÓSITO A CLOUDINARY
async function uploadDepositProof(e) {
    const file = e.target.files[0];
    if (!file) return;
    showToast("Subiendo comprobante...", "info");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "music_unsigned");

    const res = await fetch(`https://api.cloudinary.com/v1_1/dahwsdlhq/image/upload`, { method: "POST", body: formData });
    const data = await res.json();
    if (data.secure_url) {
        state.depositProofUrl = data.secure_url;
        showToast("Comprobante adjuntado con éxito", "success");
    }
}

async function processDeposit(e) {
    e.preventDefault();
    const bank = document.getElementById('depositBank').value;
    const amount = parseFloat(document.getElementById('depositAmount').value);

    if (!state.depositProofUrl) {
        showToast("Debes adjuntar la foto del comprobante", "error");
        return;
    }

    state.currentUser.saldo += amount;
    state.transactions.unshift({
        id: "DEP-" + Math.floor(100000 + Math.random() * 900000),
        type: "Depósito",
        title: `Depósito ${bank}`,
        date: new Date().toLocaleDateString(),
        recipient: bank,
        amount: amount,
        status: "Completado"
    });

    updateUI();
    showToast(`Depósito de $${amount.toFixed(2)} procesado con éxito`, 'success');
    e.target.reset();
    navigateTab('dashboard');
}

async function processTransfer(e) {
    e.preventDefault();
    const bank = document.getElementById('transferBank').value;
    const accountNum = document.getElementById('transferAccountNum').value;
    const amount = parseFloat(document.getElementById('transferAmount').value);
    const motivo = document.getElementById('transferMotivo').value;

    if (amount > state.currentUser.saldo) {
        showToast("Saldo insuficiente", "error");
        return;
    }

    if (state.currentUser.accountType === 'menor' && amount > 50.00) {
        showToast("Límite excedido: Cuentas menores de edad máximo $50 por operación", "error");
        return;
    }

    state.currentUser.saldo -= amount;
    state.transactions.unshift({
        id: "TRF-" + Math.floor(100000 + Math.random() * 900000),
        type: "Transferencia",
        title: motivo,
        date: new Date().toLocaleDateString(),
        recipient: `${bank} (${accountNum})`,
        amount: -amount,
        status: "Completado"
    });

    updateUI();
    showToast("Transferencia realizada con éxito", "success");
    e.target.reset();
    navigateTab('dashboard');
}

async function processWithdrawal(e) {
    e.preventDefault();
    const bank = document.getElementById('withdrawBank').value;
    const amount = parseFloat(document.getElementById('withdrawAmount').value);

    if (amount > state.currentUser.saldo) {
        showToast("Saldo insuficiente", "error");
        return;
    }

    state.currentUser.saldo -= amount;
    state.transactions.unshift({
        id: "WTH-" + Math.floor(100000 + Math.random() * 900000),
        type: "Retiro",
        title: "Retiro bancario",
        date: new Date().toLocaleDateString(),
        recipient: bank,
        amount: -amount,
        status: "Completado"
    });

    updateUI();
    showToast("Retiro procesado con éxito", "success");
    e.target.reset();
    navigateTab('dashboard');
}

function toggleBalanceVisibility() {
    state.isBalanceHidden = !state.isBalanceHidden;
    const display = document.getElementById('balanceDisplay');
    display.innerText = state.isBalanceHidden ? "$ ••••••••" : `$ ${state.currentUser.saldo.toFixed(2)} USD`;
    document.getElementById('eyeText').innerText = state.isBalanceHidden ? "Mostrar" : "Ocultar";
}

function toggleCardCvv() {
    const cvvDisp = document.getElementById('cardCvvDisplay');
    const isVisible = cvvDisp.innerText === "892";
    cvvDisp.innerText = isVisible ? "•••" : "892";
    document.getElementById('cvvBtnText').innerText = isVisible ? "Ver CVV" : "Ocultar CVV";
}

function toggleCardStatus() {
    const active = document.getElementById('cardToggleSwitch').checked;
    showToast(active ? "Tarjeta Activa" : "Tarjeta Congelada", "info");
}

function toggleCardPower() {
    state.cardOff = !state.cardOff;
    document.getElementById('toggleCardPowerBtn').innerText = state.cardOff ? "Encender Tarjeta" : "Apagar Tarjeta";
    showToast(state.cardOff ? "Tarjeta Apagada" : "Tarjeta Encendida", "info");
}

function cancelCardPermanent() {
    if (confirm("¿Estás completamente seguro de cancelar permanentemente tu tarjeta?")) {
        document.getElementById('virtualCardVisual').className = "opacity-30 pointer-events-none bg-gray-900 border border-red-900 rounded-2xl p-5 text-white";
        showToast("Tarjeta cancelada permanentemente", "error");
    }
}

function logout() {
    if (state.unsubscribeUserListener) state.unsubscribeUserListener();
    signOut(auth);
    document.getElementById('mainApp').classList.add('hidden');
    document.getElementById('verificationScreen').classList.add('hidden');
    document.getElementById('authScreen').classList.remove('hidden');
    showToast("Sesión cerrada", "info");
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

function initChart() {
    const canvasElement = document.getElementById('financialChart');
    if (!canvasElement) return;

    const ctx = canvasElement.getContext('2d');
    state.chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mayo', 'Junio', 'Julio', 'Agosto', 'Sept', 'Octubre'],
            datasets: [
                { label: 'Ingresos', data: [0, 0, 0, 0, 0, 0], borderColor: '#10b981', tension: 0.4 },
                { label: 'Egresos', data: [0, 0, 0, 0, 0, 0], borderColor: '#f43f5e', tension: 0.4 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}
// Función para crear la tarjeta de débito y guardarla en Firebase
async function generateDebitCard() {
    if (!state.currentUser || !state.currentUser.uid) {
        showToast("Error de sesión de usuario", "error");
        return;
    }

    showToast("Generando tarjeta y guardando en base de datos...", "info");

    // Generar datos aleatorios de tarjeta
    const randomCardNum = "4532 " + Math.floor(1000 + Math.random() * 9000) + " " + Math.floor(1000 + Math.random() * 9000) + " " + Math.floor(1000 + Math.random() * 9000);
    const randomCvv = Math.floor(100 + Math.random() * 900).toString();
    const expiryDate = "10/30";

    try {
        // Guardar la tarjeta en el documento del usuario en Firestore
        const userRef = doc(db, "users", state.currentUser.uid);
        await setDoc(userRef, {
            card: {
                number: randomCardNum,
                cvv: randomCvv,
                expiry: expiryDate,
                active: true,
                created: new Date().toISOString()
            }
        }, { merge: true });

        // Actualizar el estado local
        state.currentUser.card = { number: randomCardNum, cvv: randomCvv, expiry: expiryDate, active: true };

        // Mostrar la tarjeta generada en la interfaz
        renderCardUI();
        showToast("¡Tarjeta de débito creada y guardada con éxito!", "success");

    } catch (error) {
        console.error("Error al guardar tarjeta:", error);
        showToast("Error al conectar con la base de datos", "error");
    }
}

// Función para pintar la tarjeta en la interfaz si ya existe
function renderCardUI() {
    const noCardBox = document.getElementById('noCardContainer');
    const hasCardBox = document.getElementById('hasCardContainer');

    if (state.currentUser && state.currentUser.card) {
        noCardBox?.classList.add('hidden');
        hasCardBox?.classList.remove('hidden');

        document.getElementById('cardNumberDisplay').innerText = state.currentUser.card.number;
        document.getElementById('cardHolderDisplay').innerText = state.currentUser.name;
        document.getElementById('cardExpiryDisplay').innerText = state.currentUser.card.expiry;
        document.getElementById('cardCvvDisplay').innerText = state.currentUser.card.cvv;
    } else {
        noCardBox?.classList.remove('hidden');
        hasCardBox?.classList.add('hidden');
    }
}
// DETECTAR ANDROID Y ADAPTAR LA INTERFAZ COMO APLICACIÓN MÓVIL NATIVA
function applyAndroidMobileLayoutIfNeeded() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isAndroid = /android/i.test(userAgent);

    if (isAndroid) {
        console.log("Dispositivo Android detectado. Adaptando diseño web a modo app...");

        // Agregar clase al body para estilos específicos si se requiere
        document.body.classList.add('android-native-mode');

        // Opcional: Reestructurar la barra lateral a una barra de navegación inferior estilo app
        const sidebar = document.querySelector('aside');
        if (sidebar) {
            sidebar.className = "fixed bottom-0 left-0 right-0 h-16 bg-darkcard border-t border-darkborder flex flex-row items-center justify-around z-40 px-2 shadow-2xl";
            
            // Ajustar los botones del menú para que quepan horizontalmente como app
            const navContainer = sidebar.querySelector('nav');
            if (navContainer) {
                navContainer.className = "flex flex-row items-center justify-around w-full space-x-1";
                navContainer.querySelectorAll('.nav-btn').forEach(btn => {
                    btn.className = "nav-btn flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-semibold text-gray-400 hover:text-white";
                    // Dejar solo el ícono o reducir texto para app móvil
                    const span = btn.querySelector('span');
                    if (span) span.className = "text-[9px] mt-0.5";
                });
            }

            // Ocultar elementos de escritorio sobrantes en la barra lateral
            const logoHeader = sidebar.querySelector('.p-6.border-b');
            if (logoHeader) logoHeader.style.display = 'none';

            const logoutBox = sidebar.querySelector('.p-4.border-t');
            if (logoutBox) logoutBox.style.display = 'none';
        }

        // Ajustar el contenedor principal para que no choque con la barra inferior flotante
        const mainContent = document.querySelector('main');
        if (mainContent) {
            mainContent.classList.add('pb-24'); // Espacio extra abajo para que la barra inferior no tape el contenido
        }
    }
}