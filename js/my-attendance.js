import { supabase } from './supabase-client.js';
import { initializeTheme } from './theme.js';
import { protectPage, handleLogout } from './auth.js';

// --- DOM ELEMENTS ---
const welcomeMessage = document.getElementById('welcome-message');
const attendanceSummary = document.getElementById('attendance-summary');
const todaysClasses = document.getElementById('todays-classes');

// --- MAIN FUNCTION ---
async function main() {
    // 1. Secure the page and initialize theme/logout
    protectPage();
    handleLogout();
    initializeTheme();

    // 2. Get user data
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // Should be handled by protectPage, but as a safeguard

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*, batches(*)')
        .eq('id', user.id)
        .single();
    
    if (profileError || !profile) {
        console.error("Could not fetch profile:", profileError);
        document.querySelector('main').innerHTML = `<p style="color:red;">Error: Could not load your profile.</p>`;
        return;
    }

    displayWelcomeMessage(profile);

    // 3. Get all necessary data
    const [scheduleRes, attendanceRes, holidaysRes] = await Promise.all([
        supabase.from('schedules').select('*, subjects(*), teachers(*), time_slots(*)').eq('batch_id', profile.batch_id),
        supabase.from('attendance_records').select('*').eq('student_id', user.id),
        supabase.from('holidays').select('*')
    ]);

    const schedule = scheduleRes.data || [];
    const attendanceRecords = attendanceRes.data || [];
    const holidays = holidaysRes.data || [];

    // 4. Render all sections of the dashboard
    displayTodaysClasses(user.id, schedule, attendanceRecords, holidays);
    displayAttendanceSummary(schedule, attendanceRecords, holidays);
}

// --- DISPLAY FUNCTIONS ---

function displayWelcomeMessage(profile) {
    welcomeMessage.textContent = `Welcome, ${profile.full_name || 'Student'}!`;
}

function displayTodaysClasses(userId, schedule, attendanceRecords, holidays) {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay(); // Monday = 1, Sunday = 7

    // Check if today is a holiday
    const isHoliday = holidays.some(h => h.holiday_date === todayStr);
    if (isHoliday) {
        const holiday = holidays.find(h => h.holiday_date === todayStr);
        todaysClasses.innerHTML = `<div class="card"><p>Today is a holiday: <strong>${holiday.occasion}</strong>. Enjoy your day off!</p></div>`;
        return;
    }

    // Filter schedule for today's classes
    const classesToday = schedule.filter(c => c.day_of_week === dayOfWeek).sort((a, b) => a.time_slots.start_time.localeCompare(b.time_slots.start_time));
    
    if (classesToday.length === 0) {
        todaysClasses.innerHTML = `<div class="card"><p>No classes scheduled for today.</p></div>`;
        return;
    }

    // Render each class
    todaysClasses.innerHTML = classesToday.map(c => {
        const record = attendanceRecords.find(r => r.schedule_id === c.id && r.attendance_date === todayStr);
        let statusHtml = '';

        if (record) {
            statusHtml = `
                <p>Status: <strong class="${record.status}">${record.status.charAt(0).toUpperCase() + record.status.slice(1)}</strong></p>
                <button class="edit-attendance-btn" data-record-id="${record.id}">Change</button>
            `;
        } else {
            statusHtml = `
                <div class="action-buttons-container">
                    <button class="present-btn" data-schedule-id="${c.id}">Present</button>
                    <button class="absent-btn cancel-button" data-schedule-id="${c.id}">Absent</button>
                </div>
            `;
        }
        return `
            <div class="class-card">
                <strong>${c.subjects.name}</strong>
                <span>${c.teachers ? c.teachers.name : 'No Teacher'}</span><br>
                <small>${new Date('1970-01-01T' + c.time_slots.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit'})}</small>
                <div class="attendance-status" data-class-id="${c.id}">
                    ${statusHtml}
                </div>
            </div>
        `;
    }).join('');
}

function displayAttendanceSummary(schedule, attendanceRecords, holidays) {
    const holidayDates = new Set(holidays.map(h => h.holiday_date));
    const subjects = {}; // { subjectId: { name, held, attended } }
    
    // Initialize subjects from the schedule
    schedule.forEach(c => {
        if (!subjects[c.subjects.id]) {
            subjects[c.subjects.id] = { name: c.subjects.name, held: 0, attended: 0 };
        }
    });

    // Calculate total classes held for each subject
    const semesterStartDate = new Date('2025-08-18'); // IMPORTANT: Set your semester start date
    let currentDate = new Date(semesterStartDate);
    const today = new Date();

    while (currentDate <= today) {
        const dayOfWeek = currentDate.getDay() === 0 ? 7 : currentDate.getDay();
        const dateStr = currentDate.toISOString().split('T')[0];
        
        if (!holidayDates.has(dateStr)) {
            schedule.forEach(c => {
                if (c.day_of_week === dayOfWeek) {
                    subjects[c.subjects.id].held++;
                }
            });
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Calculate attended classes
    attendanceRecords.forEach(record => {
        const scheduleEntry = schedule.find(c => c.id === record.schedule_id);
        if (scheduleEntry && record.status === 'present') {
            subjects[scheduleEntry.subjects.id].attended++;
        }
    });
    
    // Render the summary
    if (Object.keys(subjects).length === 0) {
        attendanceSummary.innerHTML = '<ul><li>No subjects found in your schedule.</li></ul>';
        return;
    }
    attendanceSummary.innerHTML = '<ul>' + Object.values(subjects).map(s => {
        const percentage = s.held > 0 ? ((s.attended / s.held) * 100).toFixed(1) : 0;
        return `<li>${s.name}: <strong>${percentage}%</strong> (${s.attended} / ${s.held} classes)</li>`;
    }).join('') + '</ul>';
}


// --- EVENT HANDLERS ---
todaysClasses.addEventListener('click', async (e) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const todayStr = new Date().toISOString().split('T')[0];
    let scheduleId, status;

    if (e.target.matches('.present-btn')) {
        scheduleId = e.target.dataset.scheduleId;
        status = 'present';
    } else if (e.target.matches('.absent-btn')) {
        scheduleId = e.target.dataset.scheduleId;
        status = 'absent';
    } else if (e.target.matches('.edit-attendance-btn')) {
        const recordId = e.target.dataset.recordId;
        // Simple toggle logic: if it was present, mark absent, and vice-versa.
        const { data: currentRecord } = await supabase.from('attendance_records').select('status').eq('id', recordId).single();
        const newStatus = currentRecord.status === 'present' ? 'absent' : 'present';

        const { error } = await supabase.from('attendance_records').update({ status: newStatus, updated_at: new Date() }).eq('id', recordId);
        if (error) alert("Error updating status: " + error.message);

    } else {
        return; // Click was not on a button we care about
    }

    if (scheduleId && status) {
        const { error } = await supabase.from('attendance_records').insert({
            student_id: user.id,
            schedule_id: scheduleId,
            attendance_date: todayStr,
            status: status
        });
        if (error) alert("Error marking attendance: " + error.message);
    }
    
    // Refresh the dashboard to show the new status
    main();
});


// --- START THE APP ---
document.addEventListener('DOMContentLoaded', main);