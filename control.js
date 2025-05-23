// ** ¡LA ÚLTIMA URL DE GOOGLE APPS SCRIPT PARA LECTURA QUE ME DISTE! **
// Usamos la URL que tienes guardada y la que aparece en tu control.js
const GOOGLE_SCRIPT_READ_URL = 'https://script.google.com/macros/s/AKfycbxYLCxEVkvQ7eCh0FT9pPHlLL7veqTfOiyp7_0uGCOx6qxuKIeXXheXL-62IQIopz7weQ/exec';

const attendanceTableBody = document.querySelector('#attendance-table tbody');
const totalRegistradosSpan = document.getElementById('total-registrados');
const totalTardeSpan = document.getElementById('total-tarde');
const totalAusentesSpan = document.getElementById('total-ausentes');
const lastUpdatedSpan = document.getElementById('last-updated');
const refreshButton = document.getElementById('refresh-button');
const loadingMessage = document.getElementById('loading-message');
const currentDateDisplay = document.getElementById('current-date');
const currentTimeDisplay = document.getElementById('current-time'); // Elemento para el reloj

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
    ].sort((a, b) => a.localeCompare(b)), // Ordena alfabéticamente las sopranos
    "Contraltos": [
        "Aguilera Abril",
        "Buchller Patricia",
        "Caro Zaira",
        "Cuello Sandra",
        "Galvez Delfina",
        "Salmoral Carolina"
    ].sort((a, b) => a.localeCompare(b)), // Ordena alfabéticamente las contraltos
    "Tenores": [
        "Groppa Octavio",
        "Liendro Gabriel",
        "Otero Oscar",
        "Roldán Cristian",
        "Silva G. José",
        "Valdez Julio",
        "Velárdez José"
    ].sort((a, b) => a.localeCompare(b)), // Ordena alfabéticamente los tenores
    "Bajos": [
        "Colqui Marcelo",
        "Goytia Abel",
        "Ibarra Wally",
        "Jardín Augusto",
        "Rocha Ariel",
        "Villafañe Valentín"
    ].sort((a, b) => a.localeCompare(b)) // Ordena alfabéticamente los bajos
};

// Crea una lista plana de todos los miembros para verificaciones rápidas y el conteo total
const allChoirMembersFlat = Object.values(allChoirMembersBySection).flat();

// Función para actualizar el reloj y la fecha en tiempo real
function updateClock() {
    const ahora = new Date();
    const zona = 'es-AR'; // 'es-AR' para español de Argentina
    const opcionesHora = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false // Formato de 24 horas
    };

    const opcionesFecha = {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    };

    currentTimeDisplay.textContent = ahora.toLocaleTimeString(zona, opcionesHora);
    currentDateDisplay.textContent = `Asistencia para hoy: ${ahora.toLocaleDateString(zona, opcionesFecha)}`;
}


async function fetchAttendanceData() {
    attendanceTableBody.innerHTML = ''; // Limpiar tabla
    loadingMessage.style.display = 'block'; // Mostrar mensaje de carga
    refreshButton.disabled = true; // Deshabilitar botón durante la carga

    try {
        const response = await fetch(GOOGLE_SCRIPT_READ_URL);
        const result = await response.json();

        if (result.status === "success") {
            const todayAttendance = result.data; // Ya está filtrado por hoy desde el script

            let countRegistrados = 0;
            let countTarde = 0;

            // Crear un mapa para buscar rápidamente la asistencia de un coreuta
            const attendanceMap = new Map();
            // En esta versión, no esperamos 'fecha' del script para evitar errores
            todayAttendance.forEach(entry => {
                attendanceMap.set(entry.nombre, { hora: entry.hora, estado: entry.estado });
            });

            // Iterar por cada cuerda definida en allChoirMembersBySection
            for (const sectionName in allChoirMembersBySection) {
                // Añadir un encabezado de cuerda a la tabla
                const sectionHeaderRow = attendanceTableBody.insertRow();
                sectionHeaderRow.classList.add('section-header'); // Para estilizar con CSS
                const headerCell = sectionHeaderRow.insertCell(0);
                headerCell.colSpan = 3; // ¡VOLVEMOS A 3 COLUMNAS!
                headerCell.textContent = sectionName;

                // Iterar por cada miembro dentro de la cuerda (ya están ordenados alfabéticamente)
                allChoirMembersBySection[sectionName].forEach(member => {
                    const row = attendanceTableBody.insertRow();
                    row.insertCell(0).textContent = member; // Nombre del coreuta (Índice 0)

                    if (attendanceMap.has(member)) {
                        // El coreuta ha registrado hoy
                        const entry = attendanceMap.get(member);

                        // Celda para la Hora (Índice 1) - Con formato
                        const timeCell = row.insertCell(1);
                        const rawTime = entry.hora;
                        let formattedTime = '-'; // Valor por defecto si no se puede formatear

                        try {
                            const dateObj = new Date(rawTime);
                            if (!isNaN(dateObj.getTime())) {
                                formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            }
                        } catch (e) {
                            console.error("Error al parsear la hora para", member, ":", rawTime, e);
                        }
                        timeCell.textContent = formattedTime; // Asignar la hora formateada

                        // Celda para el Estado (Índice 2)
                        const statusCell = row.insertCell(2);
                        statusCell.textContent = entry.estado;
                        statusCell.classList.add('status-cell', `status-${entry.estado.replace(/\s/g, '-')}`);

                        countRegistrados++; // Contar coreutas registrados
                        if (entry.estado === 'Tarde') {
                            countTarde++;
                        }
                    } else {
                        // El coreuta NO ha registrado hoy (posible ausente)
                        row.insertCell(1).textContent = '-'; // Celda Hora (vacía)
                        const statusCell = row.insertCell(2); // Celda Estado
                        statusCell.textContent = 'Ausente';
                        statusCell.classList.add('status-cell', 'status-Ausente');
                    }
                });
            }

            // Actualizar contadores globales en la interfaz
            totalRegistradosSpan.textContent = countRegistrados;
            totalTardeSpan.textContent = countTarde;
            totalAusentesSpan.textContent = allChoirMembersFlat.length - countRegistrados;

        } else {
            console.error('Error al obtener datos:', result.message);
            alert('Error al cargar la asistencia: ' + result.message);
        }
    } catch (error) {
        console.error('Error de conexión o de red:', error);
        alert('No se pudieron cargar los datos. Revisa tu conexión a internet o la URL del script.');
    } finally {
        loadingMessage.style.display = 'none'; // Ocultar mensaje de carga
        refreshButton.disabled = false; // Habilitar botón
        lastUpdatedSpan.textContent = `Última actualización: ${new Date().toLocaleTimeString('es-AR')}`;
    }
}

// Event listener para el botón de actualizar
refreshButton.addEventListener('click', fetchAttendanceData);

// --- INICIO CÓDIGO RELOJ Y FECHA ---
updateClock();
setInterval(updateClock, 1000);
// --- FIN CÓDIGO RELOJ Y FECHA ---

// Cargar datos de asistencia al iniciar la página
fetchAttendanceData();
