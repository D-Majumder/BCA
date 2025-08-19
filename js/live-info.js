const dateTimeElement = document.getElementById('datetime-display');
const weatherElement = document.getElementById('weather-display');

function updateDateTime() {
    if (!dateTimeElement) return;
    const now = new Date();
    const options = { timeZone: 'Asia/Kolkata', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    dateTimeElement.textContent = now.toLocaleString('en-IN', options);
}

async function fetchWeather() {
    if (!weatherElement) return;
    // Coordinates for Krishnanagar
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
        weatherElement.textContent = "| Weather data unavailable";
    }
}

// This is the function we will call from our other scripts
export function initializeLiveInfo() {
    updateDateTime();
    fetchWeather();
    setInterval(updateDateTime, 1000); // Update time every second
    setInterval(fetchWeather, 900000); // Update weather every 15 minutes
}