import { supabase } from './supabase-client.js';
import { initializeTheme } from './theme.js';

// --- DOM ELEMENTS ---
const dateTimeElement = document.getElementById('datetime-display');
const weatherElement = document.getElementById('weather-display');
const yearSelect = document.getElementById('year-select');
const batchSelect = document.getElementById('batch-select');
const syllabusBtn = document.getElementById('syllabus-btn');
const currentClassInfo = document.getElementById('current-class-info');
const upcomingClassInfo = document.getElementById('upcoming-class-info');
const announcementsDisplay = document.getElementById('announcements-display');
const fullScheduleDisplay = document.getElementById('full-schedule-display');

// --- GLOBAL STATE ---
let allBatches = [];
let allSchedules = [];
let allHolidays = [];
let allSyllabuses = [];

// --- UTILITY FUNCTIONS ---
const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return new Date(`1970-01-01T${timeStr}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':');
    return parseInt(h, 10) * 60 + parseInt(m, 10);
};

// --- INDEPENDENT DATA FETCHING & DISPLAY ---

async function loadAnnouncements() {
    const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(5);
    if (error) {
        console.error("Error fetching announcements:", error);
        announcementsDisplay.innerHTML = `<p style="color: #e74c3c;">Could not load announcements.</p>`;
        return;
    }
    if (!data || data.length === 0) {
        announcementsDisplay.innerHTML = `<p>No recent announcements.</p>`;
        return;
    }
    announcementsDisplay.innerHTML = data.map(a => {
        const linkButton = (a.link_url && a.link_text)
            ? `<a href="${a.link_url}" target="_blank" class="action-btn student-login-btn" style="margin-top: 1rem; display: inline-flex;">${a.link_text}</a>`
            : '';
        let formattedContent = a.content || '';
        formattedContent = formattedContent.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
        formattedContent = formattedContent.replace(/_(.*?)_/g, '<em>$1</em>');
        formattedContent = formattedContent.replace(/~(.*?)~/g, '<s>$1</s>');

        return `
        <div class="card" style="margin-bottom: 1rem; text-align: left;">
            <h4>${a.title}</h4>
            <p>${formattedContent}</p>
            ${linkButton}
            <small style="display: block; margin-top: 1rem;">Posted: ${new Date(a.created_at).toLocaleDateString('en-IN')}</small>
        </div>
    `}).join('');
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
    const todayIST = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();

    const holiday = allHolidays.find(h => h.holiday_date === todayIST);
    if (holiday) {
        currentClassInfo.innerHTML = `<p>It's a holiday!</p><h4>${holiday.occasion}</h4>`;
        upcomingClassInfo.innerHTML = `<p>Enjoy your day off!</p>`;
        return;
    }
    
    if (dayOfWeek === 7) {
        currentClassInfo.innerHTML = `<p>It's Sunday!</p>`;
        upcomingClassInfo.innerHTML = `<p>Relax and recharge!</p>`;
        return;
    }
    
    const scheduleForToday = allSchedules.filter(s => s.batch_id == batchId && s.day_of_week === dayOfWeek);
    
    if (scheduleForToday.length === 0 && dayOfWeek === 6) {
        currentClassInfo.innerHTML = `<p>It's the weekend!</p>`;
        upcomingClassInfo.innerHTML = `<p>Enjoy!</p>`;
        return;
    }

    const istNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const currentTimeInMinutes = istNow.getHours() * 60 + istNow.getMinutes();

    const currentClass = scheduleForToday.find(c => {
        const start = timeToMinutes(c.time_slots.start_time);
        const end = timeToMinutes(c.time_slots.end_time);
        return currentTimeInMinutes >= start && currentTimeInMinutes < end;
    });

    if (currentClass) {
        currentClassInfo.innerHTML = `<strong>${currentClass.subjects.name}</strong><p>${currentClass.teachers ? currentClass.teachers.name : 'No Teacher'}</p><small>${formatTime(currentClass.time_slots.start_time)} - ${formatTime(currentClass.time_slots.end_time)}</small>`;
    } else {
        currentClassInfo.innerHTML = `<p>No class right now.</p>`;
    }

    const upcomingClass = scheduleForToday
        .filter(c => timeToMinutes(c.time_slots.start_time) > currentTimeInMinutes)
        .sort((a, b) => timeToMinutes(a.time_slots.start_time) - timeToMinutes(b.time_slots.start_time))[0];

    if (upcomingClass) {
        upcomingClassInfo.innerHTML = `<strong>${upcomingClass.subjects.name}</strong><p>${upcomingClass.teachers ? upcomingClass.teachers.name : 'No Teacher'}</p><small>Starts at ${formatTime(upcomingClass.time_slots.start_time)}</small>`;
    } else {
        upcomingClassInfo.innerHTML = `<p>No more classes today.</p>`;
    }
}

function updateAllDisplays(batchId) {
    if (!batchId) {
        clearDisplays();
        return;
    }
    displayFullSchedule(batchId);
    displaySmartInfo(batchId);
}

function clearDisplays() {
    currentClassInfo.innerHTML = `<p>Select your batch to see details.</p>`;
    upcomingClassInfo.innerHTML = `<p>Select your batch to see details.</p>`;
    fullScheduleDisplay.innerHTML = `<p>Select your batch to view the full schedule.</p>`;
    syllabusBtn.classList.add('disabled');
    syllabusBtn.href = '#';
}

// --- BATCH & SYLLABUS SELECTION ---
function updateSyllabusButton(year) {
    if (!year) {
        syllabusBtn.classList.add('disabled');
        syllabusBtn.href = '#';
        return;
    }
    const syllabus = allSyllabuses.find(s => s.year_level == year);
    if (syllabus && syllabus.syllabus_url) {
        syllabusBtn.href = syllabus.syllabus_url;
        syllabusBtn.classList.remove('disabled');
    } else {
        syllabusBtn.classList.add('disabled');
        syllabusBtn.href = '#';
    }
}

function populateYearSelect() {
    const years = [...new Set(allBatches.map(b => b.year_level))].sort((a, b) => a - b);
    yearSelect.innerHTML = '<option value="">-- Select Year --</option>' + years.map(y => `<option value="${y}">Year ${y}</option>`).join('');
}

function populateBatchSelect(year) {
    const batchesForYear = allBatches.filter(b => b.year_level == year);
    batchSelect.innerHTML = '<option value="">-- Select Batch --</option>' + batchesForYear.map(b => `<option value="${b.id}">${b.batch_name}</option>`).join('');
    batchSelect.disabled = false;
}

function setupEventListeners() {
    yearSelect.addEventListener('change', () => {
        const selectedYear = yearSelect.value;
        batchSelect.disabled = !selectedYear;
        updateSyllabusButton(selectedYear);
        if (selectedYear) {
            populateBatchSelect(selectedYear);
        }
        updateAllDisplays(null);
    });

    batchSelect.addEventListener('change', () => {
        const selectedBatchId = batchSelect.value;
        if (selectedBatchId) {
            localStorage.setItem('selectedBatchId', selectedBatchId);
            updateAllDisplays(selectedBatchId);
        } else {
            localStorage.removeItem('selectedBatchId');
            clearDisplays();
        }
    });
}

function loadSavedSelection() {
    const savedBatchId = localStorage.getItem('selectedBatchId');
    if (savedBatchId && allBatches.some(b => b.id == savedBatchId)) {
        const savedBatch = allBatches.find(b => b.id == savedBatchId);
        yearSelect.value = savedBatch.year_level;
        updateSyllabusButton(savedBatch.year_level);
        populateBatchSelect(savedBatch.year_level);
        batchSelect.value = savedBatch.id;
        updateAllDisplays(savedBatchId);
    } else {
        clearDisplays();
    }
}

// --- LIVE UPDATES ---
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

// --- INITIALIZATION ---
async function main() {
    initializeTheme();
    updateDateTime();
    fetchWeather();
    setInterval(updateDateTime, 1000);
    setInterval(fetchWeather, 900000);
    setupEventListeners();

    try {
        const [batchesRes, schedulesRes, holidaysRes, syllabusesRes] = await Promise.all([
            supabase.from('batches').select('*').order('year_level'),
            supabase.from('schedules').select(`*, time_slots(*), subjects(*), teachers(*)`),
            supabase.from('holidays').select('*'),
            supabase.from('syllabuses').select('*')
        ]);

        allBatches = batchesRes.data || [];
        allSchedules = schedulesRes.data || [];
        allHolidays = holidaysRes.data || [];
        allSyllabuses = syllabusesRes.data || [];

        populateYearSelect();
        loadSavedSelection();

    } catch (error) {
        console.error("CRITICAL ERROR: Could not fetch initial data.", error);
        document.querySelector('.dashboard-container').innerHTML = `<div class="card" style="color: red;"><h2>Error</h2><p>Could not load schedule data. Please check your internet connection and try again.</p></div>`;
    }
    
    loadAnnouncements();

    setInterval(() => {
        const selectedBatchId = batchSelect.value;
        if (selectedBatchId) displaySmartInfo(selectedBatchId);
    }, 60000);
}

document.addEventListener('DOMContentLoaded', main);
