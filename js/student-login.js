import { supabase } from './supabase-client.js';
import { initializeTheme } from './theme.js';

// Initialize the theme immediately
initializeTheme();

// Get the form element
const loginForm = document.getElementById('student-login-form');

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    // Sign in the user with Supabase Auth
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        alert('Login Failed: ' + error.message);
    } else {
        // On successful login, redirect to the attendance dashboard
        window.location.href = 'my-attendance.html';
    }
});