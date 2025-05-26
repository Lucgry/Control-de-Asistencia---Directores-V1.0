// ** ¡URL CORRECTA DE GOOGLE APPS SCRIPT PARA LECTURA! **
const GOOGLE_SCRIPT_READ_URL = 'https://script.google.com/macros/s/AKfycbzqUQLauJqzWo6rZPEkYLpKWLWA_0EFjPAUljTPmL4aSZdk7VtBTsyP5sbfDfUcVqPG/exec'; 

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

// Función para formatear la fecha a DD/MM/AA
function formatDisplayDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2); // Últimos dos dígitos del año
    return `${day}/${month}/${year}`;
}

// Función para formatear la hora a HH:MM
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

// Función para normalizar una fecha a medianoche LOCAL
function normalizeDateToLocalMidnight(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0); // Establece horas, minutos, segundos, milisegundos a 0 en la zona horaria local
    return d;
}

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
    
    // Crear un objeto Date para la fecha seleccionada, asegurándose de que sea en la zona horaria LOCAL
    // Al usar 'T00:00:00', estamos diciendo que es la medianoche en la zona horaria *del navegador*.
    const selectedDate = new Date(selectedDateStr + 'T00:00:00'); 
    
    // ** Depuración: Fecha seleccionada y su día de la semana LOCAL **
    console.log(`Fecha seleccionada (desde input, normalizada a medianoche local): ${selectedDate.toISOString()} (Día ${selectedDate.getDay()})`);

    // Lógica para verificar si es un día de ensayo (usando getDay() para la zona horaria local)
    const selectedDayOfWeek = selectedDate.getDay(); // Obtiene el día de la semana LOCAL (0=Domingo, 1=Lunes, etc.)
    if (!REHEARSAL_DAYS.includes(selectedDayOfWeek)) {
        attendanceTableBody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 20px; color: #f1c40f;">No hay ensayo en esta fecha. Selecciona Lunes, Miércoles o Viernes.</td></tr>`;
        totalRegistradosSpan.textContent = allChoirMembers.length; // Muestra el total de miembros aunque no haya ensayo
        totalPresentesSpan.textContent = '0';
        totalTardeSpan.textContent = '0';
        totalAusentesSpan.textContent = '0';
        lastUpdatedSpan.textContent = `Última actualización: --`;
        loadingMessage.style.display = 'none';
        refreshButton.disabled = false;
        return; // Detiene la ejecución si no es un día de ensayo
    }
    // ** Fin Lógica de día de ensayo **

    // Para mostrar la fecha
    const displayDateFull = selectedDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    currentDateDisplay.textContent = `Asistencia para: ${displayDateFull}`;

    try {
        const response = await fetch(GOOGLE_SCRIPT_READ_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();

        if (result.status === "success") {
            const data = result.data;
            
            let presentCountForSelectedDay = 0;
            let lateCountForSelectedDay = 0;

            const registeredMembersOnSelectedDay = new Set(); // Para saber quién YA tiene un registro (P, T, A)
            const recordsForSelectedDay = []; 

            if (data.length > 1) { // Si hay datos más allá de los encabezados
                const attendanceEntries = data.slice(1); // Entradas de asistencia (excluyendo encabezados)

                attendanceEntries.forEach(entry => {
                    const memberName = entry[0]; // Columna A (Nombre)
                    const statusFromSheet = entry[1];    // Columna B (Estado como viene de la hoja)
                    const dateIsoStr = entry[2]; // Columna C (Fecha en formato ISO)
                    const timeIsoStr = entry[3]; // Columna D (Hora en formato ISO)

                    // Normalizar la fecha de la hoja a medianoche LOCAL para comparación
                    const entryDate = normalizeDateToLocalMidnight(dateIsoStr); 
                    
                    // ** Depuración: Fechas que se están comparando **
                    // console.log(`Procesando entrada: ${memberName}, Fecha Hoja (ISO): ${dateIsoStr}, Fecha Hoja (Normalizada LOCAL medianoche): ${entryDate.toISOString()}`);


                    if (entryDate.getTime() === selectedDate.getTime()) {
                        // console.log(`    -> Coincidencia de fecha para ${memberName}!`); // Debug de coincidencia
                        registeredMembersOnSelectedDay.add(memberName); 

                        let statusChar = '';
                        let statusClass = '';
                        let displayTime = '-'; // Por defecto, si es ausente, la hora es '-'

                        // Obtener el día de la semana y la hora actual para la lógica de Ausentes
                        const todayForAbsentLogic = new Date(); // Usamos una nueva instancia para evitar posibles conflictos de zona horaria si selectedDate fuera de otro día
                        const dayOfWeekForAbsentLogic = todayForAbsentLogic.getDay(); // 0=Domingo, 1=Lunes, ..., 6=Sábado
                        const currentHourForAbsentLogic = todayForAbsentLogic.getHours(); // La hora en formato 24h

                        // Días de ensayo: 1 (Lunes), 3 (Miércoles), 5 (Viernes)
                        const isRehearsalDayForAbsentLogic = (dayOfWeekForAbsentLogic === 1 || dayOfWeekForAbsentLogic === 3 || dayOfWeekForAbsentLogic === 5);

                        // Condición para mostrar 'A' solo después de las 23:00 en días de ensayo
                        const showAbsentAfterRehearsal = (isRehearsalDayForAbsentLogic && currentHourForAbsentLogic >= 23);


                        // MODIFICACIÓN CLAVE AQUÍ: MANEJO DE ESTADOS
                        if (statusFromSheet === "Presente" || statusFromSheet === "P") {
                            statusChar = 'P';
                            statusClass = 'Presente';
                            presentCountForSelectedDay++;
                            displayTime = formatDisplayTime(new Date(timeIsoStr)); // Solo hay hora si está Presente o Tarde
                        } else if (statusFromSheet === "Tarde" || statusFromSheet === "T") {
                            statusChar = 'T';
                            statusClass = 'Tarde';
                            lateCountForSelectedDay++;
                            displayTime = formatDisplayTime(new Date(timeIsoStr)); // Solo hay hora si está Presente o Tarde
                        } else if (statusFromSheet === "Ausente" || statusFromSheet === "A") {
                            // Solo mostramos 'A' si es día de ensayo Y después de las 23:00
                            if (showAbsentAfterRehearsal) {
                                statusChar = 'A';
                                statusClass = 'Ausente';
                                // No sumamos a ausentes aquí, se calculará al final.
                                // La hora ya está en '-' por defecto
                            } else {
                                // Si es ausente pero no cumple la condición de día/hora, mostrar guion
                                statusChar = '-';
                                statusClass = ''; // No aplica ninguna clase de color
                                displayTime = '-';
                            }
                        } else { // Para cualquier otro valor inesperado en la hoja
                            statusChar = '-';
                            statusClass = ''; // No aplica ninguna clase de color
                            displayTime = '-';
                        }
                        
                        const memberInfo = allChoirMembers.find(m => m.name === memberName);
                        const section = memberInfo ? memberInfo.section : "Desconocida"; 
                        
                        recordsForSelectedDay.push({
                            name: memberName,
                            statusChar: statusChar,
                            statusClass: statusClass,
                            time: displayTime, 
                            section: section 
                        });
                    } else {
                            // console.log(`    -> NO Coincidencia de fecha para ${memberName}. Fecha Hoja (normalizada LOCAL): ${entryDate.toISOString()}, Fecha Seleccionada (normalizada LOCAL): ${selectedDate.toISOString()}`); // Debug sin coincidencia
                    }
                });
            }

            // Determinar los miembros ausentes que NO tienen registro en la hoja para el día SELECCIONADO
            const trulyAbsentMembers = allChoirMembers.filter(memberObj => !registeredMembersOnSelectedDay.has(memberObj.name));
            trulyAbsentMembers.forEach(memberObj => {
                // Aplicar la misma lógica de día/hora para los ausentes "realmente" ausentes
                const todayForAbsentLogic = new Date();
                const dayOfWeekForAbsentLogic = todayForAbsentLogic.getDay();
                const currentHourForAbsentLogic = todayForAbsentLogic.getHours();
                const isRehearsalDayForAbsentLogic = (dayOfWeekForAbsentLogic === 1 || dayOfWeekForAbsentLogic === 3 || dayOfWeekForAbsentLogic === 5);
                const showAbsentAfterRehearsal = (isRehearsalDayForAbsentLogic && currentHourForAbsentLogic >= 23);

                let statusCharForAbsent = '-';
                let statusClassForAbsent = '';

                if (showAbsentAfterRehearsal) {
                    statusCharForAbsent = 'A';
                    statusClassForAbsent = 'Ausente';
                }

                recordsForSelectedDay.push({
                    name: memberObj.name,
                    statusChar: statusCharForAbsent,
                    statusClass: statusClassForAbsent,
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
                // MODIFICACIÓN: Aquí se asegura que las clases se apliquen para el CSS de colores
                if (rowData.statusClass) { // Solo añade la clase si no está vacía
                    statusCell.classList.add('status-cell', `status-${rowData.statusClass}`);
                }
                row.insertCell(2).textContent = rowData.time; // La hora ahora va en el índice 2
            });

            // Actualizar contadores
            totalRegistradosSpan.textContent = allChoirMembers.length; // Total de miembros en la lista
            totalPresentesSpan.textContent = presentCountForSelectedDay;
            totalTardeSpan.textContent = lateCountForSelectedDay;
            // Calcular Ausentes: Total de miembros - (Presentes + Tarde)
            // Esta cuenta debe reflejar los ausentes que se muestran como 'A' en la tabla.
            // Para ello, contamos cuántos miembros tienen statusChar 'A' en recordsForSelectedDay
            const displayedAbsentCount = recordsForSelectedDay.filter(record => record.statusChar === 'A').length;
            totalAusentesSpan.textContent = displayedAbsentCount;

            lastUpdatedSpan.textContent = `Última actualización: ${formatDisplayTime(new Date())}`; // Usa el nuevo formato de hora

        } else {
            console.error('Error al obtener datos:', result.message);
            // Reemplazado alert() con un mensaje en la interfaz
            loadingMessage.textContent = 'Error al cargar la asistencia: ' + result.message;
            loadingMessage.style.color = '#e74c3c'; // Rojo para error
            loadingMessage.style.display = 'block';
        }
    } catch (error) {
        console.error('Error de conexión o de red:', error);
        // Reemplazado alert() con un mensaje en la interfaz
        loadingMessage.textContent = 'No se pudieron cargar los datos. Revisa tu conexión a internet o la URL del script.';
        loadingMessage.style.color = '#e74c3c'; // Rojo para error
        loadingMessage.style.display = 'block';
    } finally {
        // Ocultar mensaje de carga solo si no es un mensaje de error persistente
        if (loadingMessage.style.color !== 'rgb(231, 76, 60)') { // Verifica si el color no es rojo de error
             loadingMessage.style.display = 'none'; 
        }
        refreshButton.disabled = false; 
    }
}

// Event Listeners y Inicialización
refreshButton.addEventListener('click', fetchAttendanceData);
initializeDateSelector();
updateCurrentTime(); // Llama a la función para mostrar la hora al cargar
fetchAttendanceData(); // Carga los datos al iniciar la página
