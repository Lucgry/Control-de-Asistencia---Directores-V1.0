// ** ¡URL CORRECTA DE GOOGLE APPS SCRIPT PARA LECTURA! **
// Esta es la URL que me has confirmado: https://script.google.com/macros/s/AKfycbzqUQLauJqzWo6rZPEkYLpKWLWA_0EFjPAUljTPmL4aSZdk7VtBTsyP5sbfDfUcVqPG/exec
const GOOGLE_SCRIPT_READ_URL = 'https://script.google.com/macros/s/AKfycbzqUQLauJqzWo6rZPEkYLpKWLWA_0EFjPAUljTPmL4aSZdk7VtBTsyP5sbfDfUcVqPG/exec'; 

const attendanceTableBody = document.querySelector('#attendance-table tbody');
const totalRegistradosSpan = document.getElementById('total-registrados');
const totalPresentesSpan = document.getElementById('total-presentes'); 
const totalTardeSpan = document.getElementById('total-tarde');
const totalAusentesSpan = document.getElementById('total-ausentes');
const lastUpdatedSpan = document.getElementById('last-updated');
const refreshButton = document.getElementById('refresh-button');
const loadingMessage = document.getElementById('loading-message');
const currentDateDisplay = document.getElementById('current-date');
const currentTimeDisplay = document.getElementById('current-time'); 
const dateSelector = document.getElementById('date-selector'); 

// Miembros del coro, organizados por cuerda y ordenados alfabéticamente
// ¡IMPORTANTE! Asegúrate de que esta lista sea EXACTA con los nombres en tu planilla.
const allChoirMembersBySection = {
    "Sopranos": [
        "Aparicio Rocío",
        "Aramayo Valentina",
        "Evangelista Maira",
        "Ferri Mónica",
        "Gallardo Cintia",
        "Perez Gesualdo Anahi",
        "Romina Andrea",
        "Ruiz Paola",
        "Solís Lucero",
        "Suárez Daniela"
    ].sort((a, b) => a.localeCompare(b)),
    "Contraltos": [
        "Aguilera Abril",
        "Buchller Patricia",
        "Caro Zaira",
        "Cuello Sandra",
        "Galvez Delfina",
        "Salmoral Carolina"
    ].sort((a, b) => a.localeCompare(b)),
    "Tenores": [
        "Groppa Octavio",
        "Liendro Gabriel",
        "Otero Oscar",
        "Roldán Cristian",
        "Silva G. José",
        "Valdez Julio",
        "Velárdez José"
    ].sort((a, b) => a.localeCompare(b)),
    "Bajos": [
        "Colqui Marcelo",
        "Goytia Abel",
        "Ibarra Wally",
        "Jardín Augusto",
        "Rocha Ariel",
        "Villafañe Valentín"
    ].sort((a, b) => a.localeCompare(b))
};

// Convertir la lista organizada por secciones a una lista plana con sección para facilitar la búsqueda
// y para el conteo total de miembros.
const allChoirMembers = [];
for (const section in allChoirMembersBySection) {
    allChoirMembersBySection[section].forEach(name => {
        allChoirMembers.push({ name: name, section: section });
    });
}

// Define el orden de las cuerdas para la visualización en la tabla
const sectionOrder = {
    "Sopranos": 1,
    "Contraltos": 2,
    "Tenores": 3,
    "Bajos": 4
};

// Función para formatear la fecha a YYYY-MM-DD para el input type="date"
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `<span class="math-inline">\{year\}\-</span>{month}-${day}`;
}

// Función para actualizar la hora actual
function updateCurrentTime() {
    const now = new Date();
    currentTimeDisplay.textContent = now.toLocaleTimeString('es-AR');
}
// Actualiza la hora cada segundo
setInterval(updateCurrentTime, 1000);

// Inicializa el selector de fecha y carga los datos del día actual al inicio
function initializeDateSelector() {
    const today = new Date();
    dateSelector.value = formatDateForInput(today);
    // Agrega el event listener para que cuando cambie la fecha, se actualice la tabla
    dateSelector.addEventListener('change', fetchAttendanceData);
}


async function fetchAttendanceData() {
    refreshButton.disabled = true; // Deshabilitar botón mientras carga
    loadingMessage.style.display = 'block'; // Mostrar mensaje de carga
    attendanceTableBody.innerHTML = ''; // Limpiar tabla

    // Obtener la fecha seleccionada del input
    const selectedDateStr = dateSelector.value; // Formato YYYY-MM-DD
    const selectedDate = new Date(selectedDateStr);
    selectedDate.setHours(0, 0, 0, 0); // Normalizar a medianoche para comparación

    // Formatear la fecha seleccionada para mostrar en el H2
    const displayDate = selectedDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    currentDateDisplay.textContent = `Asistencia para: ${displayDate}`;


    try {
        // Llama al script SIN parámetros, asumiendo que devuelve todos los datos.
        const response = await fetch(GOOGLE_SCRIPT_READ_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();

        if (result.status === "success") {
            const data = result.data;
            
            // Si no hay datos o solo encabezados en la hoja, inicializar contadores y mostrar ausentes
            if (data.length <= 1) { 
                totalRegistradosSpan.textContent = "0";
                totalPresentesSpan.textContent = "0"; 
                totalTardeSpan.textContent = "0";
                totalAusentesSpan.textContent = allChoirMembers.length; // Usar el total de la lista plana
                lastUpdatedSpan.textContent = `Última actualización: ${new Date().toLocaleTimeString('es-AR')}`;
                
                // Mostrar todos los miembros como ausentes y ordenados por cuerda
                allChoirMembers.sort((a, b) => {
                    // Ordenar por cuerda primero, luego alfabéticamente
                    if (sectionOrder[a.section] !== sectionOrder[b.section]) {
                        return sectionOrder[a.section] - sectionOrder[b.section];
                    }
                    return a.name.localeCompare(b.name);
                }).forEach(member => {
                    const row = attendanceTableBody.insertRow();
                    row.insertCell(0).textContent = member.name; // Nombre
                    const statusCell = row.insertCell(1); // Estado
                    row.insertCell(2).textContent = '-'; // Fecha
                    row.insertCell(3).textContent = '-'; // Hora
                    statusCell.textContent = 'A'; // Ausente
                    statusCell.classList.add('status-cell', 'Ausente');
                });
                loadingMessage.style.display = 'none';
                refreshButton.disabled = false;
                return; // Salir
