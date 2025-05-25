// ** ¡TU NUEVA URL DE GOOGLE APPS SCRIPT PARA LECTURA AQUÍ! **
// ESTA ES LA URL QUE ME PASASTE: https://script.google.com/macros/s/AKfycbwRMbh5YeYeFlKUYjK37S8I5rZkTGFGwpbtCkXkGXK-vvGUyJcRrj4zYx_Yct8dcwMkQQ/exec
const GOOGLE_SCRIPT_READ_URL = 'https://script.google.com/macros/s/AKfycbwRMbh5YeYeFlKUYjK37S8I5rZkTGFGwpbtCkXkGXK-vvGUyJcRrj4zYx_Yct8dcwMkQQ/exec'; 

const attendanceTableBody = document.querySelector('#attendance-table tbody');
const totalRegistradosSpan = document.getElementById('total-registrados');
const totalTardeSpan = document.getElementById('total-tarde');
const totalAusentesSpan = document.getElementById('total-ausentes');
const lastUpdatedSpan = document.getElementById('last-updated');
const refreshButton = document.getElementById('refresh-button');
const loadingMessage = document.getElementById('loading-message');
const currentDateDisplay = document.getElementById('current-date');

// Miembros del coro (debe ser el mismo listado que en tu app de registro)
// Es mejor consolidar esta lista si se usa en varios lugares
const allChoirMembers = [
    "Aparicio Rocío", "Aramayo Valentina", "Evangelista Maira", "Ferreyra Agustina", "Gamboa Martina", 
    "Giménez Martina", "López Catalina", "Mena Priscila", "Nuñez Martina", "Rodríguez Candelaria", 
    "Aguirre Matías", "Álvarez Matías", "Castellanos Matías", "Cruz Ramiro", "Gonzales Benjamín", 
    "Gordillo Facundo", "Martínez Ramiro", "Nuñez Benjamín", "Paniagua Benjamín", "Salva Benjamín"
];


async function fetchAttendanceData() {
    refreshButton.disabled = true; // Deshabilitar botón mientras carga
    loadingMessage.style.display = 'block'; // Mostrar mensaje de carga
    attendanceTableBody.innerHTML = ''; // Limpiar tabla

    try {
        const response = await fetch(GOOGLE_SCRIPT_READ_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();

        if (result.status === "success") {
            const data = result.data;
            const headers = data[0]; // La primera fila son los encabezados
            const attendanceEntries = data.slice(1); // El resto son las entradas

            let registeredCount = 0;
            let lateCount = 0; // Se asume que tu script ya distingue tarde

            const registeredMembersToday = new Set();

            attendanceEntries.forEach(entry => {
                const memberName = entry[0];
                const time = entry[1]; // Suponiendo que esta es la columna de Hora de Registro
                const status = entry[2]; // Suponiendo que esta es la columna de Estado (Presente/Tarde)
                
                // Procesar solo registros del día actual
                const entryDate = new Date(entry[3]); // Suponiendo que la fecha está en la columna 3 (Fecha)
                const today = new Date(); // Fecha actual

                // Compara solo el día, mes y año
                if (entryDate.getDate() === today.getDate() &&
                    entryDate.getMonth() === today.getMonth() &&
                    entryDate.getFullYear() === today.getFullYear()) {

                    registeredMembersToday.add(memberName);
                    registeredCount++;

                    const row = attendanceTableBody.insertRow();
                    row.insertCell(0).textContent = memberName;
                    row.insertCell(1).textContent = time; // Hora de Registro
                    const statusCell = row.insertCell(2);

                    // ***** INICIO DE LA MODIFICACIÓN *****
                    if (status === "Presente") {
                        statusCell.textContent = 'P'; // Cambiado de 'Presente' a 'P'
                        statusCell.classList.add('status-cell', 'Presente');
                    } else if (status === "Tarde") {
                        statusCell.textContent = 'T';    // Cambiado de 'Tarde' a 'T'
                        statusCell.classList.add('status-cell', 'Tarde');
                        lateCount++; // Asumimos que tu script de google ya cuenta tarde
                    } else {
                        // En caso de un estado inesperado, usar P por defecto y el color original
                        statusCell.textContent = 'P'; 
                        statusCell.classList.add('status-cell', 'Presente');
                    }
                    // ***** FIN DE LA MODIFICACIÓN *****
                }
            });

            // Lógica para determinar los ausentes (Miembros en la lista total que no se registraron hoy)
            const absentMembers = allChoirMembers.filter(member => !registeredMembersToday.has(member));
            
            absentMembers.forEach(member => {
                const row = attendanceTableBody.insertRow();
                row.insertCell(0).textContent = member;
                row.insertCell(1).textContent = '-'; // No hay hora de registro para ausentes
                const statusCell = row.insertCell(2);
                // ***** INICIO DE LA MODIFICACIÓN *****
                statusCell.textContent = 'A'; // Cambiado de 'Ausente' a 'A'
                // ***** FIN DE LA MODIFICACIÓN *****
                statusCell.classList.add('status-cell', 'Ausente');
            });

            totalRegistradosSpan.textContent = registeredCount;
            totalTardeSpan.textContent = lateCount;
            totalAusentesSpan.textContent = absentMembers.length;

            lastUpdatedSpan.textContent = `Última actualización: ${new Date().toLocaleTimeString('es-AR')}`;
            currentDateDisplay.textContent = `Asistencia para hoy: ${new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`;

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
    }
}

// Event listener para el botón de actualizar
refreshButton.addEventListener('click', fetchAttendanceData);

// Cargar datos al iniciar la página
fetchAttendanceData();
// Opcional: Actualizar automáticamente cada cierto tiempo (ej. cada 30 segundos)
// setInterval(fetchAttendanceData, 30000); // 30000 ms = 30 segundos
