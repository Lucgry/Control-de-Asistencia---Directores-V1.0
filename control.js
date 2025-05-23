// ** ¡LA ÚLTIMA URL DE GOOGLE APPS SCRIPT PARA LECTURA QUE ME DISTE! **
const GOOGLE_SCRIPT_READ_URL = 'https://script.google.com/macros/s/AKfycbwCI3qlLh6dCFGMIK2QfOY3yJeIjgXVHCWLbRxQ8Fot9B_3lgfJA6020j9ae5H01JpeZQ/exec';

const attendanceTableBody = document.querySelector('#attendance-table tbody');
const totalRegistradosSpan = document.getElementById('total-registrados');
const totalPresentesSpan = document.getElementById('total-presentes');
const totalTardeSpan = document.getElementById('total-tarde');
const totalAusentesSpan = document.getElementById('total-ausentes'); // Este es el span para Ausentes
const lastUpdatedSpan = document.getElementById('last-updated');
const refreshButton = document.getElementById('refresh-button');
const currentDateDisplay = document.getElementById('current-date');
const currentTimeDisplay = document.getElementById('current-time');
const loadingMessage = document.getElementById('loading-message'); // Asegurarse de que este elemento existe en tu HTML


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

const allChoirMembersFlat = Object.values(allChoirMembersBySection).flat();

function updateClock() {
    const ahora = new Date();
    const zona = 'es-AR';
    const opcionesHora = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
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
    attendanceTableBody.innerHTML = '';
    loadingMessage.style.display = 'block';
    refreshButton.disabled = true;

    try {
        const response = await fetch(GOOGLE_SCRIPT_READ_URL);
        const result = await response.json();

        if (result.status === "success") {
            const todayAttendance = result.data;

            let countRegistrados = 0;
            let countPresente = 0;
            let countTarde = 0;
            let countAusente = 0; // Se inicializa el contador de Ausentes aquí.

            // --- INICIO DE LA MODIFICACIÓN (NO MODIFICAR NADA FUERA DE AQUÍ) ---
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();

            const cutoffHour = 22; // Hora de corte: 22 (10 PM)
            const cutoffMinute = 50; // Minuto de corte: 50

            // Función auxiliar para verificar si la hora de corte ha pasado
            const hasCutoffPassed = (currentH, currentM, cutoffH, cutoffM) => {
                if (currentH > cutoffH) {
                    return true;
                }
                if (currentH === cutoffH && currentM >= cutoffM) {
                    return true;
                }
                return false;
            };

            const isPastDeadline = hasCutoffPassed(currentHour, currentMinute, cutoffHour, cutoffMinute);
            // --- FIN DE LA MODIFICACIÓN DE VARIABLES Y FUNCIÓN AUXILIAR ---

            const attendanceMap = new Map();
            todayAttendance.forEach(entry => {
                attendanceMap.set(entry.nombre, { hora: entry.hora, estado: entry.estado, fecha: entry.fecha });
            });

            for (const sectionName in allChoirMembersBySection) {
                const sectionHeaderRow = attendanceTableBody.insertRow();
                sectionHeaderRow.classList.add('section-header');
                const headerCell = sectionHeaderRow.insertCell(0);
                headerCell.colSpan = 4;
                headerCell.textContent = sectionName;

                allChoirMembersBySection[sectionName].forEach(member => {
                    const row = attendanceTableBody.insertRow();
                    row.insertCell(0).textContent = member; // Nombre (misma posición)

                    let estadoDisplay = ''; // Variable para el estado a mostrar (se inicializa vacía)
                    let horaDisplay = '-'; // Variable para la hora a mostrar
                    let fechaDisplay = '-'; // Variable para la fecha a mostrar

                    if (attendanceMap.has(member)) {
                        const entry = attendanceMap.get(member);
                        estadoDisplay = entry.estado;
                        horaDisplay = entry.hora; // Asumo que entry.hora es un string como "HH:MM:SS"
                        fechaDisplay = entry.fecha; // Asumo que entry.fecha es un string como "YYYY-MM-DD"

                        // Re-formatear fecha para mostrar "DD/MM/AA"
                        if (fechaDisplay && typeof fechaDisplay === 'string' && fechaDisplay.includes('-')) {
                            const parts = fechaDisplay.split('-');
                            if (parts.length === 3) {
                                fechaDisplay = `${parts[2]}/${parts[1]}/${parts[0].substring(2)}`;
                            }
                        }

                        // Re-formatear hora para mostrar "HH:MM"
                        if (horaDisplay && typeof horaDisplay === 'string') {
                            const timeParts = horaDisplay.split(':');
                            if (timeParts.length >= 2) {
                                horaDisplay = `${timeParts[0]}:${timeParts[1]}`; // Solo HH:MM
                            } else {
                                horaDisplay = '-'; // Fallback si no es un formato válido
                            }
                        } else {
                            horaDisplay = '-';
                        }

                        countRegistrados++;
                        if (estadoDisplay === 'Tarde') {
                            countTarde++;
                        } else if (estadoDisplay === 'Presente') {
                            countPresente++;
                        }
                    } else {
                        // --- INICIO DE LA MODIFICACIÓN (NO MODIFICAR NADA FUERA DE AQUÍ) ---
                        // Si el miembro no se registró, aplica la lógica de Ausente/Pendiente
                        if (isPastDeadline) {
                            estadoDisplay = 'Ausente';
                            countAusente++; // Se incrementa el contador de ausentes solo si es realmente Ausente
                        } else {
                            // AQUÍ ESTÁ EL CAMBIO: Se deja la cadena vacía en lugar de 'Pendiente'
                            estadoDisplay = ''; 
                        }
                        // fechaDisplay y horaDisplay permanecen como '-' por defecto
                        // --- FIN DE LA MODIFICACIÓN ---
                    }

                    // Renderizar la fila con el estado, fecha y hora determinados
                    const statusCell = row.insertCell(1);
                    statusCell.textContent = estadoDisplay;
                    // Se añade la clase CSS solo si hay un estado para evitar clases como "status-"
                    if (estadoDisplay) {
                        statusCell.classList.add('status-cell', `status-${estadoDisplay.replace(/\s+/g, '')}`);
                    }

                    row.insertCell(2).textContent = fechaDisplay; // Fecha
                    row.insertCell(3).textContent = horaDisplay; // Hora
                });
            }

            totalRegistradosSpan.textContent = countRegistrados;
            totalPresentesSpan.textContent = countPresente;
            totalTardeSpan.textContent = countTarde;

            // --- INICIO DE LA MODIFICACIÓN (NO MODIFICAR NADA FUERA DE AQUÍ) ---
            // El contador total de Ausentes ahora refleja directamente los que la lógica marcó como 'Ausente'.
            totalAusentesSpan.textContent = countAusente;
            // Se eliminó la condición de las 23:05 para que el total de Ausentes sea coherente
            // con el estado individual de cada miembro según la nueva lógica de las 22:50.
            // --- FIN DE LA MODIFICACIÓN ---

        } else {
            console.error('Error al obtener datos:', result.message);
            alert('Error al cargar la asistencia: ' + result.message);
        }
    } catch (error) {
        console.error('Error de conexión o de red:', error);
        alert('No se pudieron cargar los datos. Revisa tu conexión a internet o la URL del script. O puede que el script de Google Sheets no esté funcionando.');
    } finally {
        loadingMessage.style.display = 'none';
        refreshButton.disabled = false;
        lastUpdatedSpan.textContent = `Última actualización: ${new Date().toLocaleTimeString('es-AR')}`;
    }
}

refreshButton.addEventListener('click', fetchAttendanceData);

updateClock();
setInterval(updateClock, 1000);

fetchAttendanceData();
