// ** ¡URL CORRECTA DE GOOGLE APPS SCRIPT PARA LECTURA! **
const GOOGLE_SCRIPT_READ_URL = 'https://script.google.com/macros/s/AKfycbzqUQLauJqzWo6rZPEkYLpKWLWA_0EFjPAUljTPmL4aSZdk7VtBTsyP5sbfDfUcVqPG/exec'; // ¡¡¡HE ACTUALIZADO ESTA URL CON LA QUE ME ACABAS DE CONFIRMAR!!!

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
// const dateSelector = document.getElementById('date-selector'); // Este ya no existe en el HTML directo, lo comentamos aquí

// --- NUEVAS CONSTANTES PARA EL REPORTE ---
const startDateSelector = document.getElementById('start-date-selector');
const endDateSelector = document.getElementById('end-date-selector');
const generateReportButton = document.getElementById('generate-report-button');
// ------------------------------------------

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

// Función para formatear la fecha a DD/MM/AA (ya la tenías)
function formatDisplayDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2); // Últimos dos dígitos del año
    return `${day}/${month}/${year}`;
}

// Función para formatear la hora a HH:MM (ya la tenías)
function formatDisplayTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

// Función para actualizar la hora actual (ya la tenías)
function updateCurrentTime() {
    const now = new Date();
    currentTimeDisplay.textContent = formatDisplayTime(now);
}
// Actualiza la hora cada segundo
setInterval(updateCurrentTime, 1000);

// Función para normalizar una fecha a medianoche LOCAL (sin información de hora) (ya la tenías)
function normalizeDateToLocalMidnight(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

// La función initializeDateSelector ya no es necesaria con el nuevo HTML y lógica
// Ya que no hay un dateSelector independiente para la vista diaria.
// La vista diaria siempre mostrará la fecha de hoy por defecto al cargar.

// --- MODIFICACIÓN CLAVE: fetchAttendanceData ahora acepta un "modo" y un rango de fechas ---
// La función `fetchAttendanceData` se encargará de ambos: la vista diaria y los reportes.
async function fetchAttendanceData(mode = 'daily', customStartDate = null, customEndDate = null) {
    refreshButton.disabled = true;
    generateReportButton.disabled = true; // Deshabilita el botón de reporte también durante la carga
    loadingMessage.style.display = 'block';
    loadingMessage.style.color = '#f1c40f';
    loadingMessage.textContent = 'Cargando datos...';
    attendanceTableBody.innerHTML = '';

    let url = GOOGLE_SCRIPT_READ_URL;
    let action = '';
    
    let selectedDateForDailyView = null; // Usaremos esta para la vista diaria

    if (mode === 'report' && customStartDate && customEndDate) {
        action = 'getReportByDateRange';
        url += `?action=${action}&startDate=${formatDateForInput(customStartDate)}&endDate=${formatDateForInput(customEndDate)}`;
        currentDateDisplay.textContent = `Reporte del ${formatDisplayDate(customStartDate)} al ${formatDisplayDate(customEndDate)}`;

    } else { // 'daily' mode
        // En modo 'daily', siempre usamos la fecha actual del usuario
        selectedDateForDailyView = normalizeDateToLocalMidnight(new Date());
        action = 'read'; // Esta acción trae todos los datos, y luego JS filtra por día
        url += `?action=${action}`; // No enviamos parámetros de fecha al script para 'read'
        
        // Para mostrar la fecha completa en el encabezado para la vista diaria
        const displayDateFull = selectedDateForDailyView.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        currentDateDisplay.textContent = `Asistencia para: ${displayDateFull}`;
    }

    // Lógica para verificar si es un día de ensayo (SOLO APLICA PARA MODO 'DAILY')
    if (mode === 'daily') {
        const selectedDayOfWeek = selectedDateForDailyView.getDay(); 
        const isSelectedDateARehearsalDay = REHEARSAL_DAYS.includes(selectedDayOfWeek);

        if (!isSelectedDateARehearsalDay) {
            attendanceTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px; color: #f1c40f;">No hay ensayo en esta fecha. Selecciona Lunes, Miércoles o Viernes.</td></tr>`; // Colspan a 4
            totalRegistradosSpan.textContent = allChoirMembers.length; 
            totalPresentesSpan.textContent = '0';
            totalTardeSpan.textContent = '0';
            totalAusentesSpan.textContent = '0';
            lastUpdatedSpan.textContent = `Última actualización: --`;
            loadingMessage.style.display = 'none';
            refreshButton.disabled = false;
            generateReportButton.disabled = false;
            return; 
        }
    }
    // ** Fin Lógica de día de ensayo para DAILY **

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();

        if (result.status === "success") {
            const data = result.data;
            
            let presentCount = 0; // Contadores para la vista actual (diaria o reporte)
            let lateCount = 0;
            let absentCount = 0;

            const recordsToRender = []; // Lista final de registros a mostrar en la tabla

            if (mode === 'report') {
                // En modo reporte, la data ya viene filtrada por el script para el rango.
                // Simplemente la preparamos para renderizar.
                if (data.length > 1) { // Asegurarse de que haya datos además del encabezado
                    data.slice(1).forEach(entry => { // Saltar el encabezado
                        const memberName = entry[0];
                        const statusFromSheet = entry[1];
                        const dateStr = entry[2]; // Formato DD/MM/AA
                        const timeStr = entry[3]; // Formato HH:mm:ss

                        let statusChar = '';
                        let statusClass = '';
                        if (statusFromSheet === "Presente" || statusFromSheet === "P") {
                            statusChar = 'P';
                            statusClass = 'Presente';
                        } else if (statusFromSheet === "Tarde" || statusFromSheet === "T") {
                            statusChar = 'T';
                            statusClass = 'Tarde';
                        } else {
                            statusChar = 'A'; // Si no es P ni T, asumimos Ausente en el reporte
                            statusClass = 'Ausente';
                        }

                        recordsToRender.push({
                            name: memberName,
                            statusChar: statusChar,
                            statusClass: statusClass,
                            time: timeStr, // Mostrar la hora tal cual del registro
                            date: dateStr, // Mostrar la fecha tal cual del registro
                            section: allChoirMembers.find(m => m.name === memberName)?.section || "Desconocida" // Añadir sección para ordenar si es necesario
                        });
                    });
                }
                // Contadores para el reporte: solo el total de registros encontrados
                totalRegistradosSpan.textContent = recordsToRender.length;
                totalPresentesSpan.textContent = 'N/A'; // No aplica sumatoria de Presentes/Tarde/Ausentes para rango
                totalTardeSpan.textContent = 'N/A';
                totalAusentesSpan.textContent = 'N/A';

            } else { // 'daily' mode (tu lógica original de vista diaria)
                const registeredMembersOnSelectedDay = new Set(); 
                const attendanceEntriesForSelectedDay = [];

                if (data.length > 1) {
                    data.slice(1).forEach(entry => {
                        const memberName = entry[0];
                        const statusFromSheet = entry[1];
                        const dateSheetStr = entry[2]; // DD/MM/AA desde la hoja
                        const timeSheetStr = entry[3]; // HH:mm:ss desde la hoja

                        // Convertir DD/MM/AA de la hoja a Date para comparación
                        const parts = dateSheetStr.split('/');
                        // Asegurarse de que el año sea de 4 dígitos para Date constructor
                        const sheetYear = parseInt(parts[2]) < 100 ? 2000 + parseInt(parts[2]) : parseInt(parts[2]);
                        const entryDate = new Date(sheetYear, parseInt(parts[1]) - 1, parseInt(parts[0]));
                        entryDate.setHours(0,0,0,0); // Normalizar a medianoche local

                        if (entryDate.getTime() === selectedDateForDailyView.getTime()) {
                            registeredMembersOnSelectedDay.add(memberName);
                            
                            let statusChar = '';
                            let statusClass = '';
                            let displayTime = timeSheetStr; // Usar la hora de la hoja

                            const now = new Date(); // Re-obtener hora actual para la lógica de hoy
                            const currentHour = now.getHours();

                            if (statusFromSheet === "Presente" || statusFromSheet === "P") {
                                statusChar = 'P';
                                statusClass = 'Presente';
                                presentCount++;
                            } else if (statusFromSheet === "Tarde" || statusFromSheet === "T") {
                                if (selectedDateForDailyView.getTime() === normalizeDateToLocalMidnight(now).getTime() && currentHour < 21) {
                                    statusChar = '-'; // Si es hoy y antes de las 21:00, muestra guion
                                    statusClass = '';
                                    displayTime = '-';
                                } else {
                                    statusChar = 'T';
                                    statusClass = 'Tarde';
                                    lateCount++;
                                }
                            } else if (statusFromSheet === "Ausente" || statusFromSheet === "A") {
                                if (selectedDateForDailyView.getTime() === normalizeDateToLocalMidnight(now).getTime() && currentHour < 23) {
                                    statusChar = '-'; // Si es hoy y antes de las 23:00, muestra guion
                                    statusClass = '';
                                    displayTime = '-';
                                } else {
                                    statusChar = 'A';
                                    statusClass = 'Ausente';
                                    // absentCount se cuenta al final con el filtro de recordsToRender
                                    displayTime = '-';
                                }
                            } else { // Para cualquier otro valor inesperado
                                statusChar = '-';
                                statusClass = '';
                                displayTime = '-';
                            }
                            
                            attendanceEntriesForSelectedDay.push({
                                name: memberName,
                                statusChar: statusChar,
                                statusClass: statusClass,
                                time: displayTime,
                                date: dateSheetStr, // Fecha original de la hoja
                                section: allChoirMembers.find(m => m.name === memberName)?.section || "Desconocida"
                            });
                        }
                    });
                }

                // Determinar los ausentes que NO tienen registro en la hoja para el día seleccionado
                allChoirMembers.forEach(memberObj => {
                    if (!registeredMembersOnSelectedDay.has(memberObj.name)) {
                        let statusCharForAbsent = '-';
                        let statusClassForAbsent = '';

                        const now = new Date();
                        const currentHour = now.getHours();

                        if (selectedDateForDailyView.getTime() === normalizeDateToLocalMidnight(now).getTime() && currentHour < 23) {
                            // Si es hoy y antes de las 23:00, muestra guion para ausentes no registrados
                            statusCharForAbsent = '-';
                            statusClassForAbsent = '';
                        } else {
                            // Para fechas pasadas o hoy después de las 23:00, estos son ausentes
                            statusCharForAbsent = 'A';
                            statusClassForAbsent = 'Ausente';
                        }
                        
                        attendanceEntriesForSelectedDay.push({
                            name: memberObj.name,
                            statusChar: statusCharForAbsent,
                            statusClass: statusClassForAbsent,
                            time: '-',
                            date: formatDisplayDate(selectedDateForDailyView), // La fecha actual formateada para el ausente
                            section: memberObj.section
                        });
                    }
                });
                recordsToRender.push(...attendanceEntriesForSelectedDay); // Añade a la lista final
                
                // Contadores para el modo diario
                totalRegistradosSpan.textContent = allChoirMembers.length;
                totalPresentesSpan.textContent = presentCount;
                totalTardeSpan.textContent = lateCount;
                absentCount = recordsToRender.filter(record => record.statusChar === 'A').length;
                totalAusentesSpan.textContent = absentCount;
            }

            // --- LÓGICA DE ORDENAMIENTO DE LA TABLA ---
            if (mode === 'daily') {
                recordsToRender.sort((a, b) => {
                    if (sectionOrder[a.section] !== sectionOrder[b.section]) {
                        return sectionOrder[a.section] - sectionOrder[b.section];
                    }
                    return a.name.localeCompare(b.name);
                });
            } else { // Report mode: order by date first, then by name
                 recordsToRender.sort((a, b) => {
                    // Convertir "DD/MM/AA" a objetos Date para ordenar correctamente
                    const datePartsA = a.date.split('/');
                    const dateObjA = new Date(parseInt(datePartsA[2]) + 2000, parseInt(datePartsA[1]) - 1, parseInt(datePartsA[0]));

                    const datePartsB = b.date.split('/');
                    const dateObjB = new Date(parseInt(datePartsB[2]) + 2000, parseInt(datePartsB[1]) - 1, parseInt(datePartsB[0]));
                    
                    if (dateObjA.getTime() !== dateObjB.getTime()) {
                        return dateObjA.getTime() - dateObjB.getTime();
                    }
                    // Si las fechas son iguales, ordenar por nombre
                    return a.name.localeCompare(b.name);
                });
            }


            // --- Llenar la tabla ---
            let currentSection = '';
            // Si estamos en modo reporte, no mostramos los encabezados de sección
            const showSectionHeaders = (mode === 'daily');

            recordsToRender.forEach(rowData => {
                if (showSectionHeaders && rowData.section && rowData.section !== currentSection) {
                    currentSection = rowData.section;
                    const headerRow = attendanceTableBody.insertRow();
                    headerRow.classList.add('section-header'); 
                    const headerCell = headerRow.insertCell(0);
                    headerCell.colSpan = 4; // Cambiado a 4 columnas para incluir Nombre, Estado, Fecha, Hora
                    headerCell.textContent = currentSection;
                }

                const row = attendanceTableBody.insertRow();
                // Utiliza la clase CSS para el estilo de fila basado en el estado
                row.classList.add(`status-${rowData.statusClass}`); 
                
                // Celdas según tu tabla: Nombre | Estado | Fecha | Hora
                const nameCell = row.insertCell(0);
                nameCell.textContent = rowData.name; 
                nameCell.classList.add('nombre-col');

                const statusCell = row.insertCell(1); 
                statusCell.textContent = rowData.statusChar; // Muestra el carácter ('P', 'T', 'A', '-')
                statusCell.classList.add('status-col', `status-${rowData.statusClass}`); // Agrega clase de estado
                
                const dateCell = row.insertCell(2); // NUEVA CELDA PARA LA FECHA
                dateCell.textContent = rowData.date; // Mostrar la fecha
                dateCell.classList.add('fecha-col');

                const timeCell = row.insertCell(3); // AHORA ES LA CUARTA CELDA PARA LA HORA
                timeCell.textContent = rowData.time;
                timeCell.classList.add('hora-col');
            });
            
            lastUpdatedSpan.textContent = `Última actualización: ${formatDisplayTime(new Date())}`;

        } else {
            console.error('Error al obtener datos:', result.message);
            loadingMessage.textContent = 'Error al cargar la asistencia: ' + result.message;
            loadingMessage.style.color = '#e74c3c'; 
            loadingMessage.style.display = 'block';
            totalRegistradosSpan.textContent = '0';
            totalPresentesSpan.textContent = '0';
            totalTardeSpan.textContent = '0';
            totalAusentesSpan.textContent = '0';
        }
    } catch (error) {
        console.error('Error de conexión o de red:', error);
        loadingMessage.textContent = 'No se pudieron cargar los datos. Revisa tu conexión a internet o la URL del script.';
        loadingMessage.style.color = '#e74c3c'; 
        loadingMessage.style.display = 'block';
        totalRegistradosSpan.textContent = '0';
        totalPresentesSpan.textContent = '0';
        totalTardeSpan.textContent = '0';
        totalAusentesSpan.textContent = '0';
    } finally {
        if (loadingMessage.style.color !== 'rgb(231, 76, 60)') { 
             loadingMessage.style.display = 'none'; 
        }
        refreshButton.disabled = false; 
        generateReportButton.disabled = false; // Asegurarse de habilitar el botón de reporte
    }
}

// Event Listeners y Inicialización
refreshButton.addEventListener('click', () => fetchAttendanceData('daily')); // El botón de refrescar ahora llama a la vista diaria

// Establecer la fecha actual como default en los selectores de reporte
const today = new Date();
startDateSelector.value = formatDateForInput(today);
endDateSelector.value = formatDateForInput(today);

// NUEVO: Event Listener para el botón de generar reporte
generateReportButton.addEventListener('click', () => {
    const startDate = new Date(startDateSelector.value);
    const endDate = new Date(endDateSelector.value);

    // Validar las fechas seleccionadas
    if (isNaN(startDate) || isNaN(endDate) || startDate > endDate) {
        alert('Por favor, selecciona un rango de fechas válido para el reporte.');
        return;
    }
    // Llama a la función con el modo 'report' y las fechas seleccionadas
    fetchAttendanceData('report', startDate, endDate);
});

// Inicialización: cargar datos al iniciar la app (siempre en modo diario)
updateCurrentTime();
fetchAttendanceData('daily'); // Carga la asistencia del día actual al inicio

// NOTA: El `dateSelector` original ha sido eliminado del HTML y su lógica de `initializeDateSelector`
// ya no es necesaria aquí, ya que el modo 'daily' ahora siempre muestra la fecha de hoy.
// Si necesitas volver a tener un selector para cambiar el día de la vista diaria,
// deberías reintroducir ese input en el HTML y ajustar la lógica de `fetchAttendanceData('daily')`
// para que use el valor de ese selector en lugar de `new Date()`.
