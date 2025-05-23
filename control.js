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

                    if (attendanceMap.has(member)) {
                        const entry = attendanceMap.get(member);

                        // NUEVA POSICIÓN: Estado
                        const statusCell = row.insertCell(1);
                        statusCell.textContent = entry.estado;
                        statusCell.classList.add('status-cell', `status-${entry.estado.replace(/\s/g, '-')}`);

                        // NUEVA POSICIÓN: Fecha
                        const rawDate = entry.fecha; // Ej: "2025-05-23"
                        let formattedDate = '-';
                        if (rawDate && typeof rawDate === 'string' && rawDate.includes('-')) {
                            const parts = rawDate.split('-'); // ["2025", "05", "23"]
                            if (parts.length === 3) {
                                formattedDate = `${parts[2]}/${parts[1]}/${parts[0].substring(2)}`; // "23/05/25"
                            }
                        }
                        row.insertCell(2).textContent = formattedDate;

                        // NUEVA POSICIÓN: Hora
                        const timeCell = row.insertCell(3);
                        const rawTime = entry.hora;
                        let formattedTime = '-';

                        try {
                            const dateObj = new Date(rawTime);
                            if (!isNaN(dateObj.getTime())) {
                                formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            }
                        } catch (e) {
                            console.error("Error al parsear la hora para", member, ":", rawTime, e);
                        }
                        timeCell.textContent = formattedTime;

                        countRegistrados++;
                        if (entry.estado === 'Tarde') {
                            countTarde++;
                        } else if (entry.estado === 'Presente') {
                            countPresente++;
                        }
                    } else {
                        // NUEVA POSICIÓN: Estado "Ausente"
                        const statusCell = row.insertCell(1);
                        statusCell.textContent = 'Ausente';
                        statusCell.classList.add('status-cell', 'status-Ausente');

                        row.insertCell(2).textContent = '-'; // NUEVA POSICIÓN: Fecha (vacía/guion)
                        row.insertCell(3).textContent = '-'; // NUEVA POSICIÓN: Hora (vacía/guion)
                    }
                });
            }

            totalRegistradosSpan.textContent = countRegistrados;
            totalPresentesSpan.textContent = countPresente;
            totalTardeSpan.textContent = countTarde;

            // --- INICIO DE LA MODIFICACIÓN PARA "AUSENTES" ---
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();

            // Si es después de las 23:05, muestra el conteo real de ausentes
            if (currentHour > 23 || (currentHour === 23 && currentMinute >= 5)) {
                totalAusentesSpan.textContent = allChoirMembersFlat.length - countRegistrados;
            } else {
                // De lo contrario, muestra "---"
                totalAusentesSpan.textContent = '---';
            }
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
