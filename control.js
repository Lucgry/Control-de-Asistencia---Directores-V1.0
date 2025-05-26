// ** ¡URL CORRECTA DE GOOGLE APPS SCRIPT PARA LECTURA! **
const GOOGLE_SCRIPT_READ_URL = 'https://script.google.com/macros/s/AKfycbxYLCxEVkvQ7eCh0FT9pPHlLL7veqTfOiyp7_0uGCOx6qxuKIeXXheXL-62IQIopz7weQ/exec'; 

// Días de la semana de ensayo (0=Domingo, 1=Lunes, 2=Martes, etc.)
const REHEARSAL_DAYS = [1, 3, 5]; // Lunes, Miércoles, Viernes

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
    return `${year}-${month}-${day}`;
}

// NUEVA Función para formatear la fecha a DD/MM/AA
function formatDisplayDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2); // Últimos dos dígitos del año
    return `${day}/${month}/${year}`;
}

// NUEVA Función para formatear la hora a HH:MM
function formatDisplayTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

// Función para actualizar la hora actual
function updateCurrentTime() {
    const now = new Date();
    currentTimeDisplay.textContent = formatDisplayTime(now); // Usa el nuevo formato para la hora actual
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
    
    // Crear un objeto Date para la fecha seleccionada y normalizarlo a la medianoche UTC
    const selectedDate = new Date(selectedDateStr + 'T00:00:00.000Z'); 
    console.log(`Fecha seleccionada (normalizada a UTC medianoche para comparación): ${selectedDate.toISOString()}`); // Debug

    // ** Lógica para verificar si es un día de ensayo **
    const selectedDayOfWeek = selectedDate.getUTCDay(); // Obtiene el día de la semana (0=Domingo, 1=Lunes, 2=Martes, etc.)
    if (!REHEARSAL_DAYS.includes(selectedDayOfWeek)) {
        attendanceTableBody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 20px; color: #f1c40f;">No hay ensayo en esta fecha. Selecciona Lunes, Miércoles o Viernes.</td></tr>`;
        totalRegistradosSpan.textContent = '0';
        totalPresentesSpan.textContent = '0';
        totalTardeSpan.textContent = '0';
        totalAusentesSpan.textContent = '0';
        lastUpdatedSpan.textContent = `Última actualización: --`;
        loadingMessage.style.display = 'none';
        refreshButton.disabled = false;
        return; // Detiene la ejecución si no es un día de ensayo
    }
    // ** Fin Lógica de día de ensayo **

    // Para mostrar la fecha, creamos un objeto Date que JavaScript interpretará en la zona horaria local.
    const dateForDisplay = new Date(selectedDateStr + 'T12:00:00'); 
    const displayDateFull = dateForDisplay.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    currentDateDisplay.textContent = `Asistencia para: ${displayDateFull}`;

    try {
        const response = await fetch(GOOGLE_SCRIPT_READ_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();

        if (result.status === "success") {
            const data = result.data;
            
            let registeredCountForSelectedDay = 0;
            let lateCountForSelectedDay = 0;
            let presentCountForSelectedDay = 0;

            const registeredMembersOnSelectedDay = new Set(); 
            const recordsForSelectedDay = []; 

            if (data.length > 1) { // Si hay datos más allá de los encabezados
                const attendanceEntries = data.slice(1); // Entradas de asistencia (excluyendo encabezados)

                attendanceEntries.forEach(entry => {
                    const memberName = entry[0]; // Columna A (Nombre)
                    const status = entry[1];     // Columna B (Estado)
                    const dateIsoStr = entry[2]; // Columna C (Fecha en formato ISO)
                    const timeIsoStr = entry[3]; // Columna D (Hora en formato ISO)

                    const entryDate = new Date(dateIsoStr); 
                    entryDate.setUTCHours(0, 0, 0, 0); // Normalizar a medianoche UTC
                    
                    if (entryDate.getTime() === selectedDate.getTime()) {
                        registeredMembersOnSelectedDay.add(memberName); 
                        registeredCountForSelectedDay++; 

                        let statusChar = '';
                        let statusClass = '';

                        if (status === "Presente") {
                            statusChar = 'P';
                            statusClass = 'Presente';
                            presentCountForSelectedDay++;
                        } else if (status === "Tarde") {
                            statusChar = 'T';
                            statusClass = 'Tarde';
                            lateCountForSelectedDay++;
                        } else {
                            statusChar = '-'; 
                            statusClass = '';
                        }
                        
                        const memberInfo = allChoirMembers.find(m => m.name === memberName);
                        const section = memberInfo ? memberInfo.section : "Desconocida"; 
                        
                        recordsForSelectedDay.push({
                            name: memberName,
                            statusChar: statusChar,
                            statusClass: statusClass,
                            time: formatDisplayTime(new Date(timeIsoStr)), 
                            section: section 
                        });
                    }
                });
            }

            // Determinar los miembros ausentes para el día SELECCIONADO
            const absentMembersOnSelectedDay = allChoirMembers.filter(memberObj => !registeredMembersOnSelectedDay.has(memberObj.name));
            absentMembersOnSelectedDay.forEach(memberObj => {
                recordsForSelectedDay.push({
                    name: memberObj.name,
                    statusChar: 'A',
                    statusClass: 'Ausente',
                    time: '-',
                    section: memberObj.section 
                });
            });

            // --- LÓGICA DE ORDENAMIENTO DE LA TABLA ---
            // Ordenar: 1. Por cuerda, 2. Alfabéticamente por nombre
            recordsForSelectedDay.sort((a, b) => {
                // Primero, ordenar por el orden definido de las cuerdas
                if (sectionOrder[a.section] !== sectionOrder[b.section]) {
                    return sectionOrder[a.section] - sectionOrder[b.section];
                }
                // Si están en la misma cuerda, ordenar alfabéticamente por nombre
                return a.name.localeCompare(b.name); 
            });

            // --- Llenar la tabla con encabezados de cuerda ---
            let currentSection = '';
            recordsForSelectedDay.forEach(rowData => {
                // Si la cuerda cambia, inserta una fila de encabezado de cuerda
                if (rowData.section !== currentSection) {
                    currentSection = rowData.section;
                    const headerRow = attendanceTableBody.insertRow();
                    headerRow.classList.add('section-header'); // Para darle estilo CSS
                    const headerCell = headerRow.insertCell(0);
                    headerCell.colSpan = 3; // ¡AJUSTADO A 3 COLUMNAS! (Nombre, Estado, Hora)
                    headerCell.textContent = currentSection;
                }

                const row = attendanceTableBody.insertRow();
                row.insertCell(0).textContent = rowData.name; 
                const statusCell = row.insertCell(1); 
                statusCell.textContent = rowData.statusChar;
                statusCell.classList.add('status-cell', rowData.statusClass);
                row.insertCell(2).textContent = rowData.time; // La hora ahora va en el índice 2
            });

            // Actualizar contadores
            totalRegistradosSpan.textContent = registeredCountForSelectedDay;
            totalPresentesSpan.textContent = presentCountForSelectedDay;
            totalTardeSpan.textContent = lateCountForSelectedDay;
            totalAusentesSpan.textContent = absentMembersOnSelectedDay.length;

            lastUpdatedSpan.textContent = `Última actualización: ${formatDisplayTime(new Date())}`; // Usa el nuevo formato de hora

        } else {
            console.error('Error al obtener datos:', result.message);
            alert('Error al cargar la asistencia: ' + result.message);
        }
    } catch (error) {
        console.error('Error de conexión o de red:', error);
        alert('No se pudieron cargar los datos. Revisa tu conexión a internet o la URL del script.');
    } finally {
        loadingMessage.style.display = 'none'; 
        refreshButton.disabled = false; 
    }
}

// Event Listeners y Inicialización
refreshButton.addEventListener('click', fetchAttendanceData);
initializeDateSelector();
fetchAttendanceData(); // Carga los datos al iniciar la página
