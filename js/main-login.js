import { supabase } from './supabase-client.js';
import { initializeTheme } from './theme.js';

// --- DOM ELEMENTS ---
const dateTimeElement = document.getElementById('datetime-display');
const weatherElement = document.getElementById('weather-display');
const loginForm = document.getElementById('login-form');

// --- LIVE INFO DISPLAY FUNCTIONS ---
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

// --- LOGIN FORM LOGIC ---
loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        alert('Login Failed: ' + error.message);
    } else {
        window.location.href = 'dashboard.html';
    }
});

// --- PAGE INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    updateDateTime();
    fetchWeather();
    setInterval(updateDateTime, 1000);
    setInterval(fetchWeather, 900000);
});