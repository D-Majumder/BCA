import { supabase } from './supabase-client.js';
import { initializeTheme } from './theme.js';

// Initialize the theme
initializeTheme();

// Get DOM elements
const registerForm = document.getElementById('student-register-form');
const batchSelect = document.getElementById('batch-select');

// Function to fetch and populate batches
async function loadBatches() {
    const { data: batches, error } = await supabase
        .from('batches')
        .select('id, year_level, batch_name')
        .order('year_level');

    if (error) {
        console.error("Error loading batches:", error);
        batchSelect.innerHTML = '<option value="">Could not load batches</option>';
        return;
    }

    batchSelect.innerHTML = '<option value="">-- Select Your Batch --</option>' + 
        batches.map(b => `<option value="${b.id}">Year ${b.year_level} - ${b.batch_name}</option>`).join('');
}

// Event listener for the registration form
registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    
    // Get form values
    const fullName = document.getElementById('full-name').value;
    const universityRoll = document.getElementById('university-roll').value;
    const batchId = document.getElementById('batch-select').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!batchId) {
        alert("Please select your batch.");
        return;
    }

    // 1. Sign up the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
    });

    if (authError) {
        alert('Registration failed: ' + authError.message);
        return;
    }

    if (authData.user) {
        // 2. If Auth signup is successful, insert into our 'profiles' table
        const { error: profileError } = await supabase
            .from('profiles')
            .insert({
                id: authData.user.id, // The user's auth ID
                full_name: fullName,
                university_roll: universityRoll,
                batch_id: batchId
            });
        
        if (profileError) {
            alert('Could not create student profile: ' + profileError.message);
        } else {
            alert('Registration successful! Please check your email to verify your account, then log in.');
            window.location.href = 'student-login.html';
        }
    }
});

// Load the batches into the dropdown when the page loads
loadBatches();