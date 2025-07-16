import { supabase } from './supabase-client.js';
import { initializeTheme } from './theme.js';
import { protectPage, handleLogout } from './auth.js';
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
const scheduleForm = document.getElementById('schedule-form');
const scheduleBatchSelect = document.getElementById('schedule-batch');
const scheduleDaySelect = document.getElementById('schedule-day');
const scheduleSlotSelect = document.getElementById('schedule-slot');
const scheduleSubjectSelect = document.getElementById('schedule-subject');
const scheduleTeacherSelect = document.getElementById('schedule-teacher');
const batchSelect = document.getElementById('batch-select');
const scheduleGrid = document.getElementById('schedule-grid');

// Generic Fetch Items
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

// Generic Delete Item
window.deleteItem = async (tableName, id, fetchFunc) => {
    if (confirm(`Are you sure you want to delete this item?`)) {
        const { error } = await supabase.from(tableName).delete().eq('id', id);
        if (error) {
            alert(`Error deleting item: ${error.message}`);
        } else {
            fetchFunc();
        }
    }
};

// --- Specific Implementations for Core Data ---

// TIME SLOTS
const renderSlot = slot => {
    const formatTime = timeStr => new Date(`1970-01-01T${timeStr}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `<li>${slot.period_name} (${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}) <button class="delete-btn" onclick="deleteItem('time_slots', ${slot.id}, fetchSlots)">✖</button></li>`;
};
const fetchSlots = () => fetchItems('time_slots', slotsList, renderSlot, 'start_time');
slotForm.addEventListener('submit', async e => {
    e.preventDefault();
    const period_name = document.getElementById('slot-name').value;
    const start_time = document.getElementById('slot-start-time').value;
    const end_time = document.getElementById('slot-end-time').value;
    const { error } = await supabase.from('time_slots').insert([{ period_name, start_time, end_time }]);
    if (error) {
        alert(error.message);
    } else {
        slotForm.reset();
        fetchSlots();
    }
});

// TEACHERS
const renderTeacher = teacher => `<li>${teacher.name} <button class="delete-btn" onclick="deleteItem('teachers', ${teacher.id}, fetchTeachers)">✖</button></li>`;
const fetchTeachers = () => fetchItems('teachers', teachersList, renderTeacher, 'name');
teacherForm.addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('teacher-name').value;
    const { error } = await supabase.from('teachers').insert([{ name }]);
    if (error) {
        alert(error.message);
    } else {
        teacherForm.reset();
        fetchTeachers();
    }
});

// SUBJECTS
const renderSubject = subject => `<li>${subject.name} (${subject.code}) <button class="delete-btn" onclick="deleteItem('subjects', ${subject.id}, fetchSubjects)">✖</button></li>`;
const fetchSubjects = () => fetchItems('subjects', subjectsList, renderSubject, 'name');
subjectForm.addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('subject-name').value;
    const code = document.getElementById('subject-code').value;
    const { error } = await supabase.from('subjects').insert([{ name, code }]);
    if (error) {
        alert(error.message);
    } else {
        subjectForm.reset();
        fetchSubjects();
    }
});

// BATCHES
const renderBatch = batch => `<li>Year ${batch.year_level} - ${batch.batch_name} <button class="delete-btn" onclick="deleteItem('batches', ${batch.id}, fetchBatches)">✖</button></li>`;
const fetchBatches = () => fetchItems('batches', batchesList, renderBatch, 'year_level');
batchForm.addEventListener('submit', async e => {
    e.preventDefault();
    const year_level = document.getElementById('batch-year').value;
    const batch_name = document.getElementById('batch-name').value;
    const { error } = await supabase.from('batches').insert([{ year_level, batch_name }]);
    if (error) {
        alert(error.message);
    } else {
        batchForm.reset();
        fetchBatches();
    }
});


// --- SCHEDULE MANAGER FUNCTIONS ---

// Populate all dropdowns in the "Add Class" form
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

// Render the schedule for the selected batch
async function renderSchedule(batchId) {
    if (!batchId) {
        scheduleGrid.innerHTML = `<p>Select a batch to view its schedule.</p>`;
        return;
    }

    const { data, error } = await supabase
        .from('schedules')
        .select(`
            id,
            day_of_week,
            time_slots ( period_name, start_time, end_time ),
            subjects ( name, code ),
            teachers ( name )
        `)
        .eq('batch_id', batchId)
        .order('day_of_week')
        .order('start_time', { referencedTable: 'time_slots' });

    if (error) {
        console.error('Error fetching schedule:', error);
        return;
    }

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    scheduleGrid.innerHTML = days.map((day, index) => {
        const dayIndex = index + 1;
        const classesForDay = data.filter(c => c.day_of_week === dayIndex);
        return `
            <div class="day-column">
                <h4>${day}</h4>
                ${classesForDay.length > 0 ? classesForDay.map(c => `
                    <div class="class-card">
                        <button class="delete-class-btn" onclick="deleteScheduleItem(${c.id})">✖</button>
                        <strong>${c.subjects.name}</strong>
                        <span>${c.teachers ? c.teachers.name : 'No Teacher'}</span><br>
                        <small>${new Date('1970-01-01T' + c.time_slots.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit'})} - ${new Date('1970-01-01T' + c.time_slots.end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit'})}</small>
                    </div>
                `).join('') : '<p style="font-size: 0.8rem; text-align: center;">No classes scheduled.</p>'}
            </div>
        `;
    }).join('');
}

// Handle adding a new class to the schedule
scheduleForm.addEventListener('submit', async e => {
    e.preventDefault();
    const newScheduleItem = {
        batch_id: scheduleBatchSelect.value,
        day_of_week: scheduleDaySelect.value,
        time_slot_id: scheduleSlotSelect.value,
        subject_id: scheduleSubjectSelect.value,
        teacher_id: scheduleTeacherSelect.value || null // Handle optional teacher
    };

    const { error } = await supabase.from('schedules').insert([newScheduleItem]);
    if (error) {
        alert("Error adding class: " + error.message);
    } else {
        alert("Class added successfully!");
        renderSchedule(batchSelect.value); // Refresh the grid for the currently viewed batch
    }
});

// Handle deleting a class from the schedule
window.deleteScheduleItem = async (id) => {
    if (confirm('Are you sure you want to remove this class from the schedule?')) {
        const { error } = await supabase.from('schedules').delete().eq('id', id);
        if (error) {
            alert("Error deleting class: " + error.message);
        } else {
            renderSchedule(batchSelect.value); // Refresh the grid
        }
    }
};

// Listen for changes on the batch selection dropdown
batchSelect.addEventListener('change', () => renderSchedule(batchSelect.value));


// --- ANNOUNCEMENT FUNCTIONS (CRUD) ---

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
                <button onclick="editAnnouncement(${announcement.id}, '${announcement.title.replace(/'/g, "\\'")}', '${(announcement.content || '').replace(/'/g, "\\'").replace(/\n/g, '\\n')}')">Edit</button>
                <button class="cancel-button" onclick="deleteAnnouncement(${announcement.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

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

window.deleteAnnouncement = async (id) => {
    if (confirm('Are you sure you want to delete this announcement?')) {
        const { error } = await supabase.from('announcements').delete().eq('id', id);
        if (error) {
            alert('Error deleting announcement: ' + error.message);
        } else {
            fetchAnnouncements();
        }
    }
};

window.editAnnouncement = (id, title, content) => {
    announcementIdInput.value = id;
    announcementTitleInput.value = title;
    announcementContentInput.value = content.replace(/\\n/g, '\n');
    formSubmitButton.textContent = 'Update Announcement';
    formCancelButton.style.display = 'inline-block';
    window.scrollTo({ top: announcementForm.offsetTop - 20, behavior: 'smooth' });
};

function resetForm() {
    announcementForm.reset();
    announcementIdInput.value = '';
    formSubmitButton.textContent = 'Publish Announcement';
    formCancelButton.style.display = 'none';
}
formCancelButton.addEventListener('click', resetForm);


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
    populateScheduleFormSelects();
    setInterval(updateDateTime, 1000);
    setInterval(fetchWeather, 900000);
});
