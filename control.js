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

// Función para normalizar una fecha a medianoche LOCAL (sin información de hora)
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
    loadingMessage.style.color = '#f1c40f'; // Restaurar color normal de carga
    loadingMessage.textContent = 'Cargando datos...'; // Mensaje por defecto
    attendanceTableBody.innerHTML = ''; // Limpiar tabla

    // Obtener la fecha seleccionada del input y normalizarla a medianoche local
    const selectedDateStr = dateSelector.value; 
    const selectedDate = normalizeDateToLocalMidnight(new Date(selectedDateStr)); 
    
    // Obtener la fecha y hora actual del usuario (para la lógica de "hoy")
    const now = new Date();
    const todayNormalized = normalizeDateToLocalMidnight(now);
    const currentHour = now.getHours(); // Hora actual del usuario

    // Determinar si la fecha seleccionada es hoy, pasada o futura
    const isSelectedDateToday = selectedDate.getTime() === todayNormalized.getTime();
    const isSelectedDatePast = selectedDate.getTime() < todayNormalized.getTime();
    const isSelectedDateFuture = selectedDate.getTime() > todayNormalized.getTime();

    // Lógica para verificar si es un día de ensayo (usando getDay() para la zona horaria local de la fecha seleccionada)
    const selectedDayOfWeek = selectedDate.getDay(); 
    const isSelectedDateARehearsalDay = REHEARSAL_DAYS.includes(selectedDayOfWeek);

    if (!isSelectedDateARehearsalDay) {
        attendanceTableBody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 20px; color: #f1c40f;">No hay ensayo en esta fecha. Selecciona Lunes, Miércoles o Viernes.</td></tr>`;
        totalRegistradosSpan.textContent = allChoirMembers.length; 
        totalPresentesSpan.textContent = '0';
        totalTardeSpan.textContent = '0';
        totalAusentesSpan.textContent = '0';
        lastUpdatedSpan.textContent = `Última actualización: --`;
        loadingMessage.style.display = 'none';
        refreshButton.disabled = false;
        return; 
    }
    // ** Fin Lógica de día de ensayo **

    // Para mostrar la fecha completa en el encabezado
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
            let absentCountForSelectedDay = 0; // Se usará para el contador de ausentes

            const registeredMembersOnSelectedDay = new Set(); 
            const recordsForSelectedDay = []; 

            if (data.length > 1) { 
                const attendanceEntries = data.slice(1); 

                attendanceEntries.forEach(entry => {
                    const memberName = entry[0]; 
                    const statusFromSheet = entry[1];    
                    const dateIsoStr = entry[2]; 
                    const timeIsoStr = entry[3]; 

                    // Normalizar la fecha de la hoja a medianoche LOCAL para comparación
                    const entryDate = normalizeDateToLocalMidnight(dateIsoStr); 
                    
                    if (entryDate.getTime() === selectedDate.getTime()) {
                        registeredMembersOnSelectedDay.add(memberName); 

                        let statusChar = '';
                        let statusClass = '';
                        let displayTime = '-'; 

                        // LÓGICA CLAVE: Aplicar reglas según si la fecha es HOY, PASADO o FUTURO
                        if (isSelectedDateFuture) {
                            // Si la fecha es FUTURA, siempre es guion, no hay asistencia aún
                            statusChar = '-';
                            statusClass = '';
                            displayTime = '-';
                        } else if (statusFromSheet === "Presente" || statusFromSheet === "P") {
                            statusChar = 'P';
                            statusClass = 'Presente';
                            presentCountForSelectedDay++;
                            displayTime = formatDisplayTime(new Date(timeIsoStr)); 
                        } else if (statusFromSheet === "Tarde" || statusFromSheet === "T") {
                            // Si es hoy Y es antes de las 21:16, mostrar guion para 'T'
                            if (isSelectedDateToday && currentHour < 21) { // 21 equivale a 21:00, así que hasta 20:59. El 21:16 es un tema de redondeo visual, la lógica es la hora exacta.
                                statusChar = '-';
                                statusClass = '';
                                displayTime = '-';
                            } else {
                                statusChar = 'T';
                                statusClass = 'Tarde';
                                lateCountForSelectedDay++;
                                displayTime = formatDisplayTime(new Date(timeIsoStr)); 
                            }
                        } else if (statusFromSheet === "Ausente" || statusFromSheet === "A") {
                            // Si es hoy Y es antes de las 23:00, mostrar guion para 'A'
                            if (isSelectedDateToday && currentHour < 23) {
                                statusChar = '-';
                                statusClass = '';
                                displayTime = '-';
                            } else {
                                statusChar = 'A';
                                statusClass = 'Ausente';
                                // absentCountForSelectedDay++; // Lo contamos al final con el filtro para evitar doble conteo
                                displayTime = '-'; 
                            }
                        } else { // Para cualquier otro valor inesperado en la hoja
                            statusChar = '-';
                            statusClass = ''; 
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
                    }
                });
            }

            // Determinar los miembros ausentes que NO tienen registro en la hoja para el día SELECCIONADO
            const trulyAbsentMembers = allChoirMembers.filter(memberObj => !registeredMembersOnSelectedDay.has(memberObj.name));
            trulyAbsentMembers.forEach(memberObj => {
                let statusCharForAbsent = '-';
                let statusClassForAbsent = '';

                // Aplicar la misma lógica de día/hora para los ausentes "realmente" ausentes
                if (isSelectedDateFuture) {
                    // Si la fecha es FUTURA, siempre es guion para no registrados
                    statusCharForAbsent = '-';
                    statusClassForAbsent = '';
                } else if (isSelectedDateToday && currentHour < 23) {
                    // Si es hoy y antes de las 23:00, mostrar guion
                    statusCharForAbsent = '-';
                    statusClassForAbsent = '';
                } else {
                    // Para fechas pasadas o hoy después de las 23:00, estos son ausentes
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
            recordsForSelectedDay.sort((a, b) => {
                if (sectionOrder[a.section] !== sectionOrder[b.section]) {
                    return sectionOrder[a.section] - sectionOrder[b.section];
                }
                return a.name.localeCompare(b.name); 
            });

            // --- Llenar la tabla con encabezados de cuerda ---
            let currentSection = '';
            recordsForSelectedDay.forEach(rowData => {
                if (rowData.section !== currentSection) {
                    currentSection = rowData.section;
                    const headerRow = attendanceTableBody.insertRow();
                    headerRow.classList.add('section-header'); 
                    const headerCell = headerRow.insertCell(0);
                    headerCell.colSpan = 3; 
                    headerCell.textContent = currentSection;
                }

                const row = attendanceTableBody.insertRow();
                row.insertCell(0).textContent = rowData.name; 
                const statusCell = row.insertCell(1); 
                statusCell.textContent = rowData.statusChar;
                if (rowData.statusClass) { 
                    statusCell.classList.add('status-cell', `status-${rowData.statusClass}`);
                }
                row.insertCell(2).textContent = rowData.time; 
            });

            // Actualizar contadores FINALES
            totalRegistradosSpan.textContent = allChoirMembers.length; 
            totalPresentesSpan.textContent = presentCountForSelectedDay;
            totalTardeSpan.textContent = lateCountForSelectedDay;
            
            // Recalcular ausentes basado en lo que realmente se mostró como 'A'
            absentCountForSelectedDay = recordsForSelectedDay.filter(record => record.statusChar === 'A').length;
            totalAusentesSpan.textContent = absentCountForSelectedDay;

            lastUpdatedSpan.textContent = `Última actualización: ${formatDisplayTime(new Date())}`; 

        } else {
            console.error('Error al obtener datos:', result.message);
            loadingMessage.textContent = 'Error al cargar la asistencia: ' + result.message;
            loadingMessage.style.color = '#e74c3c'; 
            loadingMessage.style.display = 'block';
        }
    } catch (error) {
        console.error('Error de conexión o de red:', error);
        loadingMessage.textContent = 'No se pudieron cargar los datos. Revisa tu conexión a internet o la URL del script.';
        loadingMessage.style.color = '#e74c3c'; 
        loadingMessage.style.display = 'block';
    } finally {
        if (loadingMessage.style.color !== 'rgb(231, 76, 60)') { 
             loadingMessage.style.display = 'none'; 
        }
        refreshButton.disabled = false; 
    }
}

// Event Listeners y Inicialización
refreshButton.addEventListener('click', fetchAttendanceData);
initializeDateSelector();
updateCurrentTime(); 
fetchAttendanceData(); 
