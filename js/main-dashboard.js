import { supabase } from './supabase-client.js';
import { initializeTheme } from './theme.js';
import { protectPage, handleLogout } from './auth.js';
import { customAlert, customConfirm } from './custom-modals.js';

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
const syllabusForm = document.getElementById('syllabus-form');
const syllabusesList = document.getElementById('syllabuses-list');
const scheduleForm = document.getElementById('schedule-form');
const scheduleBatchSelect = document.getElementById('schedule-batch');
const scheduleDaySelect = document.getElementById('schedule-day');
const scheduleSlotSelect = document.getElementById('schedule-slot');
const scheduleSubjectSelect = document.getElementById('schedule-subject');
const scheduleTeacherSelect = document.getElementById('schedule-teacher');
const batchSelect = document.getElementById('batch-select');
const scheduleGrid = document.getElementById('schedule-grid');
const auditLogList = document.getElementById('audit-log-list');
const editModal = document.getElementById('edit-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const editScheduleForm = document.getElementById('edit-schedule-form');
const editScheduleIdInput = document.getElementById('edit-schedule-id');
const editScheduleSubjectSelect = document.getElementById('edit-schedule-subject');
const editScheduleTeacherSelect = document.getElementById('edit-schedule-teacher');


// --- AUDIT LOGGING ---
async function logAction(action, details = '') {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('audit_logs').insert({ admin_email: user.email, action, details });
    if (error) console.error('Error logging action:', error);
}

async function fetchAuditLogs() {
    const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(30);
    if (error) {
        console.error('Error fetching audit logs:', error);
        auditLogList.innerHTML = `<p>Could not load activity.</p>`;
        return;
    }
    const renderLog = log => {
        const timestamp = new Date(log.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
        return `<li class="log-item"><div class="log-header"><span class="action">${log.action}</span><span class="email">${log.admin_email}</span></div><div class="log-details"><span>${log.details || ''}</span> - <span class="timestamp">${timestamp}</span></div></li>`;
    };
    auditLogList.innerHTML = `<ul>${data.map(renderLog).join('')}</ul>`;
}


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
const renderSyllabus = syllabus => `<li>Year ${syllabus.year_level} <a href="${syllabus.syllabus_url}" target="_blank">(link)</a> <button class="delete-btn" data-id="${syllabus.id}" data-table="syllabuses">✖</button></li>`;

const fetchSlots = () => fetchItems('time_slots', slotsList, renderSlot, 'start_time');
const fetchTeachers = () => fetchItems('teachers', teachersList, renderTeacher, 'name');
const fetchSubjects = () => fetchItems('subjects', subjectsList, renderSubject, 'name');
const fetchBatches = () => fetchItems('batches', batchesList, renderBatch, 'year_level');
const fetchSyllabuses = () => fetchItems('syllabuses', syllabusesList, renderSyllabus, 'year_level');

// --- EVENT DELEGATION FOR ALL CLICKS ---
document.addEventListener('click', async function(event) {
    const target = event.target;

    if (target.matches('.delete-btn')) {
        const id = target.dataset.id;
        const table = target.dataset.table;
        if (!id || !table) return;

        const confirmed = await customConfirm(`Are you sure you want to delete this item?`);
        if (confirmed) {
            const { error } = await supabase.from(table).delete().eq('id', id);
            if (error) {
                customAlert(`Error deleting: ${error.message}`);
            } else {
                logAction(`Deleted item from ${table}`, `ID: ${id}`);
                fetchAuditLogs();
                if (table === 'announcements') fetchAnnouncements();
                if (table === 'teachers') fetchTeachers();
                if (table === 'subjects') fetchSubjects();
                if (table === 'batches') fetchBatches();
                if (table === 'time_slots') fetchSlots();
                if (table === 'syllabuses') fetchSyllabuses();
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

    if (target.matches('.edit-class-btn')) {
        const id = target.dataset.id;
        openEditModal(id);
    }
});

// --- FORM SUBMISSION LOGIC ---
slotForm.addEventListener('submit', async e => {
    e.preventDefault();
    const period_name = document.getElementById('slot-name').value;
    const start_time = document.getElementById('slot-start-time').value;
    const end_time = document.getElementById('slot-end-time').value;
    const { error } = await supabase.from('time_slots').insert([{ period_name, start_time, end_time }]);
    if (error) { customAlert(error.message); } 
    else {
        logAction('Created Time Slot', `${period_name} (${start_time} - ${end_time})`);
        fetchAuditLogs();
        slotForm.reset();
        fetchSlots();
    }
});

teacherForm.addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('teacher-name').value;
    const { error } = await supabase.from('teachers').insert([{ name }]);
    if (error) { customAlert(error.message); }
    else {
        logAction('Created Teacher', name);
        fetchAuditLogs();
        teacherForm.reset();
        fetchTeachers();
    }
});

subjectForm.addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('subject-name').value;
    const code = document.getElementById('subject-code').value;
    const { error } = await supabase.from('subjects').insert([{ name, code }]);
    if (error) { customAlert(error.message); }
    else {
        logAction('Created Subject', `${name} (${code})`);
        fetchAuditLogs();
        subjectForm.reset();
        fetchSubjects();
    }
});

batchForm.addEventListener('submit', async e => {
    e.preventDefault();
    const year_level = document.getElementById('batch-year').value;
    const batch_name = document.getElementById('batch-name').value;
    const { error } = await supabase.from('batches').insert([{ year_level, batch_name }]);
    if (error) { customAlert(error.message); }
    else {
        logAction('Created Batch', `Year ${year_level} - ${batch_name}`);
        fetchAuditLogs();
        batchForm.reset();
        fetchBatches();
    }
});

syllabusForm.addEventListener('submit', async e => {
    e.preventDefault();
    const year_level = document.getElementById('syllabus-year').value;
    const syllabus_url = document.getElementById('syllabus-url').value;
    const { error } = await supabase.from('syllabuses').insert([{ year_level, syllabus_url }]);
    if (error) { customAlert("Error adding syllabus. Note: Each year can only have one syllabus link. " + error.message); }
    else {
        logAction('Added Syllabus', `Year ${year_level}`);
        fetchAuditLogs();
        syllabusForm.reset();
        fetchSyllabuses();
    }
});

announcementForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = announcementIdInput.value;
    const title = announcementTitleInput.value;
    const content = announcementContentInput.value;
    let error;
    if (id) {
        ({ error } = await supabase.from('announcements').update({ title, content }).eq('id', id));
        if (!error) logAction('Updated Announcement', title);
    } else {
        ({ error } = await supabase.from('announcements').insert([{ title, content }]));
        if (!error) logAction('Created Announcement', title);
    }
    if (error) {
        customAlert('Error: ' + error.message);
    } else {
        fetchAuditLogs();
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

    const { data, error: checkError } = await supabase.from('schedules')
        .select('id')
        .eq('batch_id', newScheduleItem.batch_id)
        .eq('day_of_week', newScheduleItem.day_of_week)
        .eq('time_slot_id', newScheduleItem.time_slot_id);

    if (checkError) {
        customAlert("Error checking for clashes: " + checkError.message);
        return;
    }

    if (data && data.length > 0) {
        customAlert("Clash Detected: A class already exists for this batch at this specific day and time slot.");
        return;
    }

    const { error } = await supabase.from('schedules').insert([newScheduleItem]);
    if (error) {
        customAlert("Error adding class: " + error.message);
    } else {
        logAction('Added Class to Schedule', `Batch ID: ${newScheduleItem.batch_id}`);
        fetchAuditLogs();
        customAlert("Class added successfully!");
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
    const { data, error } = await supabase.from('schedules').select(`id, day_of_week, time_slots(*), subjects(id, name, code), teachers(id, name)`).eq('batch_id', batchId).order('day_of_week').order('start_time', { referencedTable: 'time_slots' });
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
                        <button class="edit-class-btn" data-id="${c.id}">✎</button>
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
    const subjectOptions = subjects.map(s => `<option value="${s.id}">${s.name} (${s.code})</option>`).join('');
    scheduleSubjectSelect.innerHTML = subjectOptions;
    editScheduleSubjectSelect.innerHTML = subjectOptions;
    const teacherOptions = `<option value="">-- None --</option>` + teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    scheduleTeacherSelect.innerHTML = teacherOptions;
    editScheduleTeacherSelect.innerHTML = teacherOptions;
}

// --- EDIT SCHEDULE MODAL LOGIC ---
async function openEditModal(scheduleId) {
    const { data: scheduleItem, error } = await supabase
        .from('schedules')
        .select(`*, subjects(id, name), teachers(id, name)`)
        .eq('id', scheduleId)
        .single();

    if (error) {
        customAlert("Error fetching class details: " + error.message);
        return;
    }

    editScheduleIdInput.value = scheduleItem.id;
    editScheduleSubjectSelect.value = scheduleItem.subjects.id;
    editScheduleTeacherSelect.value = scheduleItem.teachers ? scheduleItem.teachers.id : '';

    editModal.style.display = 'flex';
    setTimeout(() => editModal.classList.add('active'), 10);
}

function closeModal() {
    editModal.classList.remove('active');
    setTimeout(() => editModal.style.display = 'none', 300);
}

editScheduleForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = editScheduleIdInput.value;
    const updatedData = {
        subject_id: editScheduleSubjectSelect.value,
        teacher_id: editScheduleTeacherSelect.value || null
    };

    const { error } = await supabase
        .from('schedules')
        .update(updatedData)
        .eq('id', id);

    if (error) {
        customAlert("Error updating class: " + error.message);
    } else {
        logAction('Updated Class in Schedule', `ID: ${id}`);
        fetchAuditLogs();
        closeModal();
        renderSchedule(batchSelect.value);
    }
});

closeModalBtn.addEventListener('click', closeModal);
editModal.addEventListener('click', (e) => {
    if (e.target === editModal) {
        closeModal();
    }
});


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
    fetchSyllabuses();
    populateScheduleFormSelects();
    fetchAuditLogs();
    
    setInterval(updateDateTime, 1000);
    setInterval(fetchWeather, 900000);
});
