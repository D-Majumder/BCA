import { supabase } from './supabase-client.js';
import { initializeTheme } from './theme.js';
import { protectPage, handleLogout } from './auth.js';

// --- DOM ELEMENTS ---
const dateTimeElement = document.getElementById('datetime-display');
const weatherElement = document.getElementById('weather-display');
const announcementsList = document.getElementById('announcements-list');
const announcementForm = document.getElementById('announcement-form');
const announcementIdInput = document.getElementById('announcement-id');
const announcementTitleInput = document.getElementById('announcement-title');
const announcementContentInput = document.getElementById('announcement-content');
const formSubmitButton = document.getElementById('form-submit-button');
const formCancelButton = document.getElementById('form-cancel-button');
const slotForm = document.getElementById('slot-form');
const slotsList = document.getElementById('slots-list');
const teacherForm = document.getElementById('teacher-form');
const teachersList = document.getElementById('teachers-list');
const subjectForm = document.getElementById('subject-form');
const subjectsList = document.getElementById('subjects-list');
const batchForm = document.getElementById('batch-form');
const batchesList = document.getElementById('batches-list');
const syllabusForm = document.getElementById('syllabus-form'); // New
const syllabusesList = document.getElementById('syllabuses-list'); // New
const scheduleForm = document.getElementById('schedule-form');
const scheduleBatchSelect = document.getElementById('schedule-batch');
const scheduleDaySelect = document.getElementById('schedule-day');
const scheduleSlotSelect = document.getElementById('schedule-slot');
const scheduleSubjectSelect = document.getElementById('schedule-subject');
const scheduleTeacherSelect = document.getElementById('schedule-teacher');
const batchSelect = document.getElementById('batch-select');
const scheduleGrid = document.getElementById('schedule-grid');

// --- DATA FETCHING & RENDERING ---

async function fetchItems(tableName, listElement, renderFunc, orderBy = 'id') {
    const { data, error } = await supabase.from(tableName).select('*').order(orderBy);
    if (error) {
        console.error(`Error fetching ${tableName}:`, error);
        if (listElement) listElement.innerHTML = `<p style="color:red;">Could not load data.</p>`;
        return [];
    }
    if (listElement) {
        if (data.length === 0) {
            listElement.innerHTML = `<p>No items yet.</p>`;
        } else {
            listElement.innerHTML = `<ul>${data.map(renderFunc).join('')}</ul>`;
        }
    }
    return data;
}

const renderSlot = slot => {
    const formatTime = timeStr => new Date(`1970-01-01T${timeStr}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `<li>${slot.period_name} (${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}) <button class="delete-btn" data-id="${slot.id}" data-table="time_slots">✖</button></li>`;
};
const renderTeacher = teacher => `<li>${teacher.name} <button class="delete-btn" data-id="${teacher.id}" data-table="teachers">✖</button></li>`;
const renderSubject = subject => `<li>${subject.name} (${subject.code}) <button class="delete-btn" data-id="${subject.id}" data-table="subjects">✖</button></li>`;
const renderBatch = batch => `<li>Year ${batch.year_level} - ${batch.batch_name} <button class="delete-btn" data-id="${batch.id}" data-table="batches">✖</button></li>`;
const renderSyllabus = syllabus => `<li>Year ${syllabus.year_level} <a href="${syllabus.syllabus_url}" target="_blank">(link)</a> <button class="delete-btn" data-id="${syllabus.id}" data-table="syllabuses">✖</button></li>`; // New

// FETCH FUNCTIONS
const fetchSlots = () => fetchItems('time_slots', slotsList, renderSlot, 'start_time');
const fetchTeachers = () => fetchItems('teachers', teachersList, renderTeacher, 'name');
const fetchSubjects = () => fetchItems('subjects', subjectsList, renderSubject, 'name');
const fetchBatches = () => fetchItems('batches', batchesList, renderBatch, 'year_level');
const fetchSyllabuses = () => fetchItems('syllabuses', syllabusesList, renderSyllabus, 'year_level'); // New

// --- EVENT DELEGATION FOR ALL CLICKS ---
document.addEventListener('click', async function(event) {
    const target = event.target;

    if (target.matches('.delete-btn')) {
        const id = target.dataset.id;
        const table = target.dataset.table;
        if (!id || !table) return;

        if (confirm(`Are you sure you want to delete this item?`)) {
            const { error } = await supabase.from(table).delete().eq('id', id);
            if (error) {
                alert(`Error deleting: ${error.message}`);
            } else {
                if (table === 'announcements') fetchAnnouncements();
                if (table === 'teachers') fetchTeachers();
                if (table === 'subjects') fetchSubjects();
                if (table === 'batches') fetchBatches();
                if (table === 'time_slots') fetchSlots();
                if (table === 'syllabuses') fetchSyllabuses(); // New
                if (table === 'schedules') renderSchedule(batchSelect.value);
            }
        }
    }

    if (target.matches('.edit-announcement-btn')) {
        const id = target.dataset.id;
        const title = target.dataset.title.replace(/&quot;/g, '"');
        const content = target.dataset.content.replace(/&quot;/g, '"');
        
        announcementIdInput.value = id;
        announcementTitleInput.value = title;
        announcementContentInput.value = content;
        formSubmitButton.textContent = 'Update Announcement';
        formCancelButton.style.display = 'inline-block';
        window.scrollTo({ top: announcementForm.offsetTop - 20, behavior: 'smooth' });
    }
});

// --- FORM SUBMISSION LOGIC ---
slotForm.addEventListener('submit', async e => {
    e.preventDefault();
    const period_name = document.getElementById('slot-name').value;
    const start_time = document.getElementById('slot-start-time').value;
    const end_time = document.getElementById('slot-end-time').value;
    const { error } = await supabase.from('time_slots').insert([{ period_name, start_time, end_time }]);
    if (error) { alert(error.message); } 
    else { slotForm.reset(); fetchSlots(); }
});

teacherForm.addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('teacher-name').value;
    const { error } = await supabase.from('teachers').insert([{ name }]);
    if (error) { alert(error.message); }
    else { teacherForm.reset(); fetchTeachers(); }
});

subjectForm.addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('subject-name').value;
    const code = document.getElementById('subject-code').value;
    const { error } = await supabase.from('subjects').insert([{ name, code }]);
    if (error) { alert(error.message); }
    else { subjectForm.reset(); fetchSubjects(); }
});

batchForm.addEventListener('submit', async e => {
    e.preventDefault();
    const year_level = document.getElementById('batch-year').value;
    const batch_name = document.getElementById('batch-name').value;
    const { error } = await supabase.from('batches').insert([{ year_level, batch_name }]);
    if (error) { alert(error.message); }
    else { batchForm.reset(); fetchBatches(); }
});

syllabusForm.addEventListener('submit', async e => { // New
    e.preventDefault();
    const year_level = document.getElementById('syllabus-year').value;
    const syllabus_url = document.getElementById('syllabus-url').value;
    const { error } = await supabase.from('syllabuses').insert([{ year_level, syllabus_url }]);
    if (error) { alert("Error adding syllabus. Note: Each year can only have one syllabus link. " + error.message); }
    else { syllabusForm.reset(); fetchSyllabuses(); }
});

announcementForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = announcementIdInput.value;
    const title = announcementTitleInput.value;
    const content = announcementContentInput.value;
    let error;
    if (id) {
        ({ error } = await supabase.from('announcements').update({ title, content }).eq('id', id));
    } else {
        ({ error } = await supabase.from('announcements').insert([{ title, content }]));
    }
    if (error) {
        alert('Error: ' + error.message);
    } else {
        resetForm();
        fetchAnnouncements();
    }
});

function resetForm() {
    announcementForm.reset();
    announcementIdInput.value = '';
    formSubmitButton.textContent = 'Publish Announcement';
    formCancelButton.style.display = 'none';
}
formCancelButton.addEventListener('click', resetForm);

scheduleForm.addEventListener('submit', async e => {
    e.preventDefault();
    const newScheduleItem = {
        batch_id: scheduleBatchSelect.value,
        day_of_week: scheduleDaySelect.value,
        time_slot_id: scheduleSlotSelect.value,
        subject_id: scheduleSubjectSelect.value,
        teacher_id: scheduleTeacherSelect.value || null
    };
    const { error } = await supabase.from('schedules').insert([newScheduleItem]);
    if (error) {
        alert("Error adding class: " + error.message);
    } else {
        alert("Class added successfully!");
        renderSchedule(batchSelect.value);
    }
});

batchSelect.addEventListener('change', () => renderSchedule(batchSelect.value));

// --- ANNOUNCEMENT & SCHEDULE RENDER FUNCTIONS ---
async function fetchAnnouncements() {
    const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
    if (error) {
        console.error('Error fetching announcements:', error);
        announcementsList.innerHTML = `<p style="color:red;">Could not fetch announcements.</p>`;
        return;
    }
    if (data.length === 0) {
        announcementsList.innerHTML = `<p>No announcements yet.</p>`;
        return;
    }
    announcementsList.innerHTML = data.map(announcement => `
        <div class="card" style="margin-bottom: 1rem; text-align: left;">
            <h4>${announcement.title}</h4>
            <p>${announcement.content || ''}</p>
            <small>Posted on: ${new Date(announcement.created_at).toLocaleString('en-IN')}</small>
            <div style="margin-top: 1rem;">
                <button class="edit-announcement-btn" data-id="${announcement.id}" data-title="${announcement.title.replace(/"/g, '&quot;')}" data-content="${(announcement.content || '').replace(/"/g, '&quot;')}">Edit</button>
                <button class="delete-btn cancel-button" data-id="${announcement.id}" data-table="announcements">Delete</button>
            </div>
        </div>
    `).join('');
}

async function renderSchedule(batchId) {
    if (!batchId) {
        scheduleGrid.innerHTML = `<p>Select a batch to view its schedule.</p>`;
        return;
    }
    const { data, error } = await supabase.from('schedules').select(`id, day_of_week, time_slots(*), subjects(*), teachers(*)`).eq('batch_id', batchId).order('day_of_week').order('start_time', { referencedTable: 'time_slots' });
    if (error) { console.error('Error fetching schedule:', error); return; }
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    scheduleGrid.innerHTML = days.map((day, index) => {
        const dayIndex = index + 1;
        const classesForDay = data.filter(c => c.day_of_week === dayIndex);
        return `
            <div class="day-column">
                <h4>${day}</h4>
                ${classesForDay.length > 0 ? classesForDay.map(c => `
                    <div class="class-card">
                        <button class="delete-btn" data-id="${c.id}" data-table="schedules">✖</button>
                        <strong>${c.subjects.name}</strong>
                        <span>${c.teachers ? c.teachers.name : 'No Teacher'}</span><br>
                        <small>${new Date('1970-01-01T' + c.time_slots.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit'})} - ${new Date('1970-01-01T' + c.time_slots.end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit'})}</small>
                    </div>
                `).join('') : '<p style="font-size: 0.8rem; text-align: center;">No classes scheduled.</p>'}
            </div>
        `;
    }).join('');
}

async function populateScheduleFormSelects() {
    const [batches, slots, subjects, teachers] = await Promise.all([
        fetchItems('batches', null, null, 'year_level'),
        fetchItems('time_slots', null, null, 'start_time'),
        fetchItems('subjects', null, null, 'name'),
        fetchItems('teachers', null, null, 'name')
    ]);
    const batchOptions = batches.map(b => `<option value="${b.id}">Year ${b.year_level} - ${b.batch_name}</option>`).join('');
    scheduleBatchSelect.innerHTML = batchOptions;
    batchSelect.innerHTML = `<option value="">-- Select a Batch --</option>` + batchOptions;
    scheduleSlotSelect.innerHTML = slots.map(s => {
        const formatTime = timeStr => new Date(`1970-01-01T${timeStr}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        return `<option value="${s.id}">${s.period_name} (${formatTime(s.start_time)})</option>`
    }).join('');
    scheduleSubjectSelect.innerHTML = subjects.map(s => `<option value="${s.id}">${s.name} (${s.code})</option>`).join('');
    scheduleTeacherSelect.innerHTML = `<option value="">-- None --</option>` + teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
}

// --- LIVE INFO & INITIALIZATION ---
function updateDateTime() {
    const now = new Date();
    const options = { timeZone: 'Asia/Kolkata', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
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
        const temp = data.current_weather.temperature;
        weatherElement.textContent = `| Krishnanagar: ${temp}°C`;
    } catch (error) {
        console.error("Failed to fetch weather:", error);
        weatherElement.textContent = "| Weather data unavailable";
    }
}

document.addEventListener('DOMContentLoaded', () => {
    protectPage();
    handleLogout();
    initializeTheme();
    updateDateTime();
    fetchWeather();
    
    fetchAnnouncements();
    fetchSlots();
    fetchTeachers();
    fetchSubjects();
    fetchBatches();
    fetchSyllabuses(); // New
    populateScheduleFormSelects();
    
    setInterval(updateDateTime, 1000);
    setInterval(fetchWeather, 900000);
});
