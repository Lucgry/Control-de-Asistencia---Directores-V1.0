// ** ¡LA ÚLTIMA URL DE GOOGLE APPS SCRIPT PARA LECTURA QUE ME DISTE! **
const GOOGLE_SCRIPT_READ_URL = 'https://script.google.com/macros/s/AKfycbwCI3qlLh6dCFGMIK2QfOY3yJeIjgXVHCWLbRxQ8Fot9B_3lgfJA6020j9ae5H01JpeZQ/exec';

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
                    row.insertCell(0).textContent = member;

                    if (attendanceMap.has(member)) {
                        const entry = attendanceMap.get(member);

                        row.insertCell(1).textContent = entry.fecha;

                        const timeCell = row.insertCell(2);
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

                        const statusCell = row.insertCell(3);
                        statusCell.textContent = entry.estado;
                        statusCell.classList.add('status-cell', `status-${entry.estado.replace(/\s/g, '-')}`);

                        countRegistrados++;
                        if (entry.estado === 'Tarde') {
                            countTarde++;
                        } else if (entry.estado === 'Presente') {
                            countPresente++;
                        }
                    } else {
                        row.insertCell(1).textContent = '-';
                        row.insertCell(2).textContent = '-';
                        const statusCell = row.insertCell(3);
                        statusCell.textContent = 'Ausente';
                        statusCell.classList.add('status-cell', 'status-Ausente');
                    }
                });
            }

            totalRegistradosSpan.textContent = countRegistrados;
            totalPresentesSpan.textContent = countPresente;
            totalTardeSpan.textContent = countTarde;
            totalAusentesSpan.textContent = allChoirMembersFlat.length - countRegistrados;

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
