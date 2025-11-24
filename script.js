import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, query, orderBy, limit, onSnapshot, 
    doc, setDoc, addDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. TUS CREDENCIALES REALES
const firebaseConfig = {
    apiKey: "AIzaSyAOyFHwSebnyFiBn9HhcqJLbtwOeTrcP54",
    authDomain: "mi-cultivo-hidroponico.firebaseapp.com",
    projectId: "mi-cultivo-hidroponico",
    storageBucket: "mi-cultivo-hidroponico.firebasestorage.app",
    messagingSenderId: "1093398812049",
    appId: "1:1093398812049:web:132904385d787f340e7630"
};

// 2. INICIALIZAR FIREBASE
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
let chartInstance;

// 3. INICIALIZAR GRÁFICO VACÍO
const ctx = document.getElementById("historyChart").getContext("2d");
chartInstance = new Chart(ctx, {
    type: "line",
    data: {
        labels: [],
        datasets: [
            {
                label: "Humedad Tierra (%)",
                data: [],
                borderColor: "rgb(96,165,250)",
                backgroundColor: "rgba(96,165,250,0.1)",
                fill: true,
                tension: 0.4
            },
            {
                label: "Nivel Agua (%)",
                data: [],
                borderColor: "rgb(74,222,128)",
                backgroundColor: "rgba(74,222,128,0.0)",
                tension: 0.4
            }
        ]
    },
    options: {
        responsive: true,
        animation: false,
        scales: {
            y: { beginAtZero: true, max: 100, ticks: { color: "#fff" } },
            x: { ticks: { color: "#fff" } }
        }
    }
});

// 4. ESCUCHAR BASE DE DATOS EN TIEMPO REAL
const q = query(collection(db, "lecturas_sensores"), orderBy("timestamp", "desc"), limit(1));

onSnapshot(collection(db, "lecturas_sensores"), (snapshot) => {
    snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
            const data = change.doc.data();
            updateInterface(data);
        }
    });
});

function updateInterface(data) {
    console.log("Dato recibido:", data);

    // A. Actualizar textos (REALES)
    if (data.tierra !== undefined) document.getElementById("val-tierra").textContent = data.tierra + " %";
    if (data.agua !== undefined) document.getElementById("val-agua").textContent = data.agua + " %";

    // ============================================================
    // 🔥 CAMBIO AQUÍ: GENERAR VALORES ALEATORIOS (SIMULACIÓN) 🔥
    // ============================================================
    
    // Temperatura: Aleatorio entre 20.0 y 30.0
    const tempFake = (Math.random() * (30 - 20) + 20).toFixed(1);
    document.getElementById("val-temp").textContent = tempFake + " °C";

    // Humedad Aire: Aleatorio entre 40 y 60
    const aireFake = Math.floor(Math.random() * (60 - 40) + 40);
    document.getElementById("val-aire").textContent = aireFake + " %";

    // ============================================================

    // B. Indicador de estado
    const statusBtn = document.getElementById("connection-status");
    statusBtn.textContent = "En Línea 🟢";
    statusBtn.classList.remove("bg-red-600");
    statusBtn.classList.add("bg-green-600");

    // C. Actualizar Gráfico
    const timeNow = new Date().toLocaleTimeString();
    chartInstance.data.labels.push(timeNow);
    chartInstance.data.datasets[0].data.push(data.tierra || 0);
    chartInstance.data.datasets[1].data.push(data.agua || 0);

    // Mantener solo los últimos 15 puntos
    if (chartInstance.data.labels.length > 15) {
        chartInstance.data.labels.shift();
        chartInstance.data.datasets[0].data.shift();
        chartInstance.data.datasets[1].data.shift();
    }
    chartInstance.update();

    // D. Diagnóstico IA
    checkAlerts(data);
}

function checkAlerts(data) {
    const recomendacion = document.getElementById("ai-recommendation");
    const alerta = document.getElementById("alert-banner");
    let msg = "Todo estable.";
    let alertActive = false;

    if (data.tierra < 30) {
        msg = "⚠️ Tierra seca. Se recomienda riego.";
        alertActive = true;
    } else if (data.agua < 20) {
        msg = "⚠️ Nivel de agua crítico. Rellenar tanque.";
        alertActive = true;
    }

    recomendacion.textContent = msg;
    
    if (alertActive) {
        alerta.classList.remove("hidden");
        alerta.textContent = msg;
        setTimeout(() => alerta.classList.add("hidden"), 5000);
    } else {
        alerta.classList.add("hidden");
    }
}

// 5. FUNCIÓN GLOBAL PARA BOTONES (Control de Bombas)
window.controlPump = async function (pumpName) {
    const ref = doc(db, "control_actuadores", "estado_bombas");
    const payload = {};
    
    if (pumpName === "bomba_ph") payload.activar_bomba_ph = true;
    if (pumpName === "bomba_nutrientes") payload.activar_bomba_nutrientes = true;

    try {
        await setDoc(ref, payload, { merge: true });
        alert("Comando enviado: " + pumpName);
    } catch (e) {
        console.error(e);
        alert("Error al enviar comando");
    }
};

// 6. GUARDAR DATOS EN JSON (localStorage) + OPCIONAL Firestore
window.guardarDatos = async function () {
    // Leer valores actuales del dashboard (¡incluyendo los simulados!)
    const tierra = parseFloat(document.getElementById("val-tierra").textContent) || 0;
    const agua   = parseFloat(document.getElementById("val-agua").textContent) || 0;
    const temp   = parseFloat(document.getElementById("val-temp").textContent) || 0;
    const aire   = parseFloat(document.getElementById("val-aire").textContent) || 0;

    const datos = [tierra, agua, temp, aire];

    const KEY = "lecturas_guardadas";
    const existente = JSON.parse(localStorage.getItem(KEY) || "[]");
    existente.push(datos);
    localStorage.setItem(KEY, JSON.stringify(existente));

    try {
        await addDoc(collection(db, "resultados"), {
            datos,
            timestamp: new Date()
        });
    } catch (e) {
        console.error("Error guardando en Firestore:", e);
    }

    alert("Datos guardados.");
};

// 7. VER RESULTADOS
window.verResultados = function () {
    window.location.href = "result_datos.html";
};
