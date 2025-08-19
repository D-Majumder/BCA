import { customAlert } from './custom-modals.js';
import { supabase } from './supabase-client.js';
import { initializeTheme } from './theme.js';
import { initializeLiveInfo } from './live-info.js';

// Initialize the theme immediately
initializeTheme();
initializeLiveInfo();

// Get the form element
const loginForm = document.getElementById('student-login-form');

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = loginForm.querySelector('button');
    submitButton.disabled = true;
    submitButton.textContent = 'Logging In...';
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    // Sign in the user with Supabase Auth
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        customAlert('Login Failed: ' + error.message);
        submitButton.disabled = false; // Re-enable on error
        submitButton.textContent = 'Log In';
    } else {
        // On successful login, redirect to the attendance dashboard
        window.location.href = 'my-attendance.html';
    }
});
const forgotPasswordLink = document.getElementById('forgot-password-link');
forgotPasswordLink.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = prompt("Please enter your email address to reset your password:");

    if (email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin, // Link will redirect back to your main page
        });

        if (error) {
            customAlert("Error: " + error.message);
        } else {
            customAlert("Password reset link sent! Please check your email.");
        }
    }
});