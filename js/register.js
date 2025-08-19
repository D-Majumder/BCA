import { customAlert } from './custom-modals.js';
import { supabase } from './supabase-client.js';
import { initializeTheme } from './theme.js';
import { initializeLiveInfo } from './live-info.js';

// Initialize the theme
initializeTheme();
initializeLiveInfo();

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
    
    // 1. Grab the button and set it to the "loading" state
    const submitButton = registerForm.querySelector('button');
    submitButton.disabled = true;
    submitButton.textContent = 'Registering...';
    
    // Get form values
    const fullName = document.getElementById('full-name').value;
    const universityRoll = document.getElementById('university-roll').value;
    const batchId = document.getElementById('batch-select').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!batchId) {
        customAlert("Please select your batch.");
        // Reset button on error
        submitButton.disabled = false;
        submitButton.textContent = 'Register';
        return;
    }

    // 2. Sign up the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
    });

    if (authError) {
        customAlert('Registration failed: ' + authError.message);
        // Reset button on error
        submitButton.disabled = false;
        submitButton.textContent = 'Register';
        return;
    }

    if (authData.user) {
        // 3. If Auth signup is successful, insert into our 'profiles' table
        const { error: profileError } = await supabase
            .from('profiles')
            .insert({
                id: authData.user.id,
                full_name: fullName,
                university_roll: universityRoll,
                batch_id: batchId
            });
        
        if (profileError) {
            customAlert('Could not create student profile: ' + profileError.message);
            // Reset button on error
            submitButton.disabled = false;
            submitButton.textContent = 'Register';
        } else {
            customAlert('Registration successful! Please check your email to verify your account, then log in.');
            // On success, we redirect, so no need to reset the button text.
            window.location.href = 'student-login.html';
        }
    }
});

// Load the batches into the dropdown when the page loads
loadBatches();