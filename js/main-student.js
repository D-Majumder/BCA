import { supabase } from './supabase-client.js';
import { initializeTheme } from './theme.js';

// --- DOM ELEMENTS ---
const dateTimeElement = document.getElementById('datetime-display');
const weatherElement = document.getElementById('weather-display');
const yearSelect = document.getElementById('year-select');
const batchSelect = document.getElementById('batch-select');
const currentClassInfo = document.getElementById('current-class-info');
const upcomingClassInfo = document.getElementById('upcoming-class-info');
const announcementsDisplay = document.getElementById('announcements-display');
const fullScheduleDisplay = document.getElementById('full-schedule-display');

// --- GLOBAL STATE ---
let allBatches = [];
let allSchedules = [];
let allHolidays = [];

// --- DATA FETCHING ---
async function fetchInitialData() {
    const [batchesRes, schedulesRes, holidaysRes, announcementsRes] = await Promise.all([
        supabase.from('batches').select('*').order('year_level'),
        supabase.from('schedules').select(`*, time_slots(*), subjects(*), teachers(*)`),
        supabase.from('holidays').select('*'),
        supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(5)
    ]);

    if (batchesRes.error) console.error("Error fetching batches:", batchesRes.error);
    else allBatches = batchesRes.data;

    if (schedulesRes.error) console.error("Error fetching schedules:", schedulesRes.error);
    else allSchedules = schedulesRes.data;

    if (holidaysRes.error) console.error("Error fetching holidays:", holidaysRes.error);
    else allHolidays = holidaysRes.data;

    // Display announcements immediately
    displayAnnouncements(announcementsRes.data);
}

// --- BATCH SELECTION LOGIC ---
function populateYearSelect() {
    const years = [...new Set(allBatches.map(b => b.year_level))];
    yearSelect.innerHTML = '<option value="">-- Select Year --</option>' + years.map(y => `<option value="${y}">Year ${y}</option>`).join('');
}

function populateBatchSelect(year) {
    const batchesForYear = allBatches.filter(b => b.year_level == year);
    batchSelect.innerHTML = '<option value="">-- Select Batch --</option>' + batchesForYear.map(b => `<option value="${b.id}">${b.batch_name}</option>`).join('');
    batchSelect.disabled = false;
}

yearSelect.addEventListener('change', () => {
    const selectedYear = yearSelect.value;
    if (selectedYear) {
        populateBatchSelect(selectedYear);
    } else {
        batchSelect.innerHTML = '<option value="">-- Select Batch --</option>';
        batchSelect.disabled = true;
    }
    clearDisplays();
});

batchSelect.addEventListener('change', () => {
    const selectedBatchId = batchSelect.value;
    if (selectedBatchId) {
        localStorage.setItem('selectedBatchId', selectedBatchId); // Remember selection
        updateAllDisplays(selectedBatchId);
    } else {
        clearDisplays();
    }
});

function loadSavedSelection() {
    const savedBatchId = localStorage.getItem('selectedBatchId');
    if (savedBatchId && allBatches.some(b => b.id == savedBatchId)) {
        const savedBatch = allBatches.find(b => b.id == savedBatchId);
        yearSelect.value = savedBatch.year_level;
        populateBatchSelect(savedBatch.year_level);
        batchSelect.value = savedBatch.id;
        updateAllDisplays(savedBatchId);
    }
}

// --- DISPLAY LOGIC ---
function displayAnnouncements(announcements) {
    if (!announcements || announcements.length === 0) {
        announcementsDisplay.innerHTML = `<p>No recent announcements.</p>`;
        return;
    }
    announcementsDisplay.innerHTML = announcements.map(a => `
        <div class="card" style="margin-bottom: 1rem; text-align: left;">
            <h4>${a.title}</h4>
            <p>${a.content || ''}</p>
            <small>Posted: ${new Date(a.created_at).toLocaleDateString('en-IN')}</small>
        </div>
    `).join('');
}

function displayFullSchedule(batchId) {
    const scheduleForBatch = allSchedules.filter(s => s.batch_id == batchId);
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    fullScheduleDisplay.innerHTML = days.map((day, index) => {
        const dayIndex = index + 1;
        const classesForDay = scheduleForBatch
            .filter(c => c.day_of_week === dayIndex)
            .sort((a, b) => a.time_slots.start_time.localeCompare(b.time_slots.start_time));
            
        return `
            <div class="day-column">
                <h4>${day}</h4>
                ${classesForDay.length > 0 ? classesForDay.map(c => `
                    <div class="class-card">
                        <strong>${c.subjects.name}</strong>
                        <span>${c.teachers ? c.teachers.name : 'No Teacher'}</span><br>
                        <small>${formatTime(c.time_slots.start_time)} - ${formatTime(c.time_slots.end_time)}</small>
                    </div>
                `).join('') : '<p style="font-size: 0.8rem; text-align: center;">No classes.</p>'}
            </div>
        `;
    }).join('');
}

function displaySmartInfo(batchId) {
    const now = new Date();
    const todayIST = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
    const dayOfWeek = now.getDay(); // Sunday = 0, Monday = 1
    
    // Check for Holiday
    const holiday = allHolidays.find(h => h.holiday_date === todayIST);
    if (holiday) {
        currentClassInfo.innerHTML = `<p>It's a holiday!</p><h4>${holiday.occasion}</h4>`;
        upcomingClassInfo.innerHTML = `<p>Enjoy your day off!</p>`;
        return;
    }
    
    // Check for Weekend
    if (dayOfWeek === 0 || (dayOfWeek === 6 && !allSchedules.some(s => s.batch_id == batchId && s.day_of_week === 6))) {
        currentClassInfo.innerHTML = `<p>It's the weekend!</p>`;
        upcomingClassInfo.innerHTML = `<p>Relax and recharge!</p>`;
        return;
    }
    
    const scheduleForToday = allSchedules.filter(s => s.batch_id == batchId && s.day_of_week === dayOfWeek);
    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

    const timeToMinutes = (timeStr) => {
        const [h, m] = timeStr.split(':');
        return parseInt(h) * 60 + parseInt(m);
    };

    const currentClass = scheduleForToday.find(c => {
        const start = timeToMinutes(c.time_slots.start_time);
        const end = timeToMinutes(c.time_slots.end_time);
        return currentTimeInMinutes >= start && currentTimeInMinutes < end;
    });

    if (currentClass) {
        currentClassInfo.innerHTML = `
            <strong>${currentClass.subjects.name}</strong>
            <p>${currentClass.teachers ? currentClass.teachers.name : 'No Teacher'}</p>
            <small>${formatTime(currentClass.time_slots.start_time)} - ${formatTime(currentClass.time_slots.end_time)}</small>
        `;
    } else {
        currentClassInfo.innerHTML = `<p>No class right now.</p>`;
    }

    const upcomingClass = scheduleForToday
        .filter(c => timeToMinutes(c.time_slots.start_time) > currentTimeInMinutes)
        .sort((a, b) => timeToMinutes(a.time_slots.start_time) - timeToMinutes(b.time_slots.start_time))[0];

    if (upcomingClass) {
        upcomingClassInfo.innerHTML = `
            <strong>${upcomingClass.subjects.name}</strong>
            <p>${upcomingClass.teachers ? upcomingClass.teachers.name : 'No Teacher'}</p>
            <small>Starts at ${formatTime(upcomingClass.time_slots.start_time)}</small>
        `;
    } else {
        upcomingClassInfo.innerHTML = `<p>No more classes today.</p>`;
    }
}

function updateAllDisplays(batchId) {
    displayFullSchedule(batchId);
    displaySmartInfo(batchId);
}

function clearDisplays() {
    currentClassInfo.innerHTML = `<p>Select your batch to see details.</p>`;
    upcomingClassInfo.innerHTML = `<p>Select your batch to see details.</p>`;
    fullScheduleDisplay.innerHTML = `<p>Select your batch to view the full schedule.</p>`;
}

// --- UTILITY & LIVE INFO FUNCTIONS ---
const formatTime = timeStr => new Date(`1970-01-01T${timeStr}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

function updateDateTime() {
    const now = new Date();
    const options = { timeZone: 'Asia/Kolkata', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    dateTimeElement.textContent = now.toLocaleString('en-IN', options);
}

async function fetchWeather() {
    const lat = 23.4;
    const long = 88.5;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${long}&current_weather=true`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Weather response not ok');
        const data = await response.json();
        weatherElement.textContent = `| Krishnanagar: ${data.current_weather.temperature}°C`;
    } catch (error) {
        console.error("Failed to fetch weather:", error);
    }
}

// --- PAGE INITIALIZATION ---
async function initializePage() {
    initializeTheme();
    updateDateTime();
    fetchWeather();
    setInterval(updateDateTime, 1000);
    setInterval(fetchWeather, 900000);

    await fetchInitialData();
    populateYearSelect();
    loadSavedSelection();
    setInterval(() => {
        const selectedBatchId = batchSelect.value;
        if (selectedBatchId) displaySmartInfo(selectedBatchId);
    }, 60000);
}

document.addEventListener('DOMContentLoaded', initializePage);
