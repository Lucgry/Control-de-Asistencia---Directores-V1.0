// ** ¡URL CORRECTA DE GOOGLE APPS SCRIPT PARA LECTURA! **
const GOOGLE_SCRIPT_READ_URL = 'https://script.google.com/macros/s/AKfycbzqUQLauJqzWo6rZPEkYLpKWLWA_0EFjPAUljTPmL4aSZdk7VtBTsyP5sbfDfUcVPG/exec'; 

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

// Miembros del coro (debe ser el mismo listado que en tu app de registro)
const allChoirMembers = [
    "Aparicio Rocío", "Aramayo Valentina", "Evangelista Maira", "Ferreyra Agustina", "Gamboa Martina", 
    "Giménez Martina", "López Catalina", "Mena Priscila", "Nuñez Martina", "Rodríguez Candelaria", 
    "Aguirre Matías", "Álvarez Matías", "Castellanos Matías", "Cruz Ramiro", "Gonzales Benjamín", 
    "Gordillo Facundo", "Martínez Ramiro", "Nuñez Benjamín", "Paniagua Benjamín", "Salva Benjamín"
];

// Función para formatear la fecha a YYYY-MM-DD para el input type="date"
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
        // *** CAMBIO CLAVE: Llama al script SIN parámetros, asumiendo que devuelve todos los datos. ***
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
                totalAusentesSpan.textContent = allChoirMembers.length;
                lastUpdatedSpan.textContent = `Última actualización: ${new Date().toLocaleTimeString('es-AR')}`;
                
                // Mostrar todos los miembros como ausentes para el día seleccionado si no hay registros
                allChoirMembers.forEach(member => {
                    const row = attendanceTableBody.insertRow();
                    row.insertCell(0).textContent = member; // Nombre
                    const statusCell = row.insertCell(1); // Estado
                    row.insertCell(2).textContent = '-'; // Fecha
                    row.insertCell(3).textContent = '-'; // Hora
                    statusCell.textContent = 'A'; // Ausente
                    statusCell.classList.add('status-cell', 'Ausente');
                });
                loadingMessage.style.display = 'none';
                refreshButton.disabled = false;
                return; // Salir de la función
            }

            const attendanceEntries = data.slice(1); // Entradas de asistencia (excluyendo encabezados)

            let registeredCountForSelectedDay = 0; // Total registrados para el día seleccionado
            let lateCountForSelectedDay = 0;    // Tardes para el día seleccionado
            let presentCountForSelectedDay = 0; // Presentes a tiempo para el día seleccionado

            const registeredMembersOnSelectedDay = new Set(); // Para llevar un registro de los que asistieron en el día seleccionado
            
            const recordsForSelectedDay = []; // Array para almacenar los registros del día seleccionado

            // FILTRADO POR FECHA EN EL LADO DEL CLIENTE
            attendanceEntries.forEach(entry => {
                const memberName = entry[0];
                const time = entry[1]; // Columna de Hora de Registro
                const status = entry[2]; // Columna de Estado (Presente/Tarde)
                const dateStr = entry[3]; // Columna de Fecha (formato DD/MM/YYYY)

                // Convertir la fecha de la hoja (DD/MM/YYYY) a un objeto Date para comparación
                const [day, month, year] = dateStr.split('/').map(Number);
                const entryDate = new Date(year, month - 1, day); // month - 1 porque los meses son 0-indexados
                entryDate.setHours(0, 0, 0, 0); // Normalizar a medianoche para comparación

                // ***** LÓGICA CLAVE: FILTRAR POR FECHA SELECCIONADA EN EL CLIENTE *****
                if (entryDate.getTime() === selectedDate.getTime()) {
                    registeredMembersOnSelectedDay.add(memberName); 
                    registeredCountForSelectedDay++; 

                    let statusChar = '';
                    let statusClass = '';

                    // Modificaciones de texto a P, T, A
                    if (status === "Presente") {
                        statusChar = 'P';
                        statusClass = 'Presente';
                        presentCountForSelectedDay++; // Contar para el resumen de presentes a tiempo
                    } else if (status === "Tarde") {
                        statusChar = 'T';
                        statusClass = 'Tarde';
                        lateCountForSelectedDay++; // Contar para el resumen de tardes
                    } else {
                        statusChar = '-'; // En caso de estado inesperado
                        statusClass = '';
                    }
                    
                    recordsForSelectedDay.push({
                        name: memberName,
                        statusChar: statusChar,
                        statusClass: statusClass,
                        date: dateStr, // Usar el string original para mostrar
                        time: time
                    });
                }
            });

            // Determinar los miembros ausentes para el día SELECCIONADO
            const absentMembersOnSelectedDay = allChoirMembers.filter(member => !registeredMembersOnSelectedDay.has(member));
            absentMembersOnSelectedDay.forEach(member => {
                recordsForSelectedDay.push({
                    name: member,
                    statusChar: 'A',
                    statusClass: 'Ausente',
                    date: displayDate, // Usar la fecha formateada del selector para los ausentes
                    time: '-'
                });
            });

            // Ordenar los registros del día seleccionado: P, T, A, luego alfabéticamente
            recordsForSelectedDay.sort((a, b) => {
                const statusOrder = { 'P': 1, 'T': 2, 'A': 3, '-': 4 };
                if (statusOrder[a.statusChar] !== statusOrder[b.statusChar]) {
                    return statusOrder[a.statusChar] - statusOrder[b.statusChar];
                }
                return a.name.localeCompare(b.name); 
            });

            // Llenar la tabla con los registros ordenados del día seleccionado
            recordsForSelectedDay.forEach(rowData => {
                const row = attendanceTableBody.insertRow();
                row.insertCell(0).textContent = rowData.name; 
                
                const statusCell = row.insertCell(1); 
                statusCell.textContent = rowData.statusChar;
                statusCell.classList.add('status-cell', rowData.statusClass);

                row.insertCell(2).textContent = rowData.date; 
                row.insertCell(3).textContent = rowData.time; 
            });

            // Actualizar los resúmenes para el DÍA SELECCIONADO
            totalRegistradosSpan.textContent = registeredCountForSelectedDay;
            totalPresentesSpan.textContent = presentCountForSelectedDay;
            totalTardeSpan.textContent = lateCountForSelectedDay;
            totalAusentesSpan.textContent = absentMembersOnSelectedDay.length;

            lastUpdatedSpan.textContent = `Última actualización: ${new Date().toLocaleTimeString('es-AR')}`;
            // currentDateDisplay ya se actualiza al inicio de la función con la fecha seleccionada

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

// Inicializar el selector de fecha y cargar los datos al iniciar la página
initializeDateSelector();
fetchAttendanceData(); // Cargar datos para el día actual al iniciar

// Opcional: Actualizar automáticamente la tabla cada cierto tiempo (ej. cada 30 segundos)
// setInterval(fetchAttendanceData, 30000);
