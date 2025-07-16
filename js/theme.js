let manualThemeOverride = false;
const themeToggle = document.getElementById('theme-toggle');

function applyTheme() {
    if (!themeToggle) return;
    const isNight = document.body.classList.contains('night-theme');
    themeToggle.textContent = isNight ? '🌙' : '☀️';
}

function updateTheme() {
    if (manualThemeOverride) return;
    const istHour = parseInt(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false }));
    if (istHour >= 6 && istHour < 18) {
        document.body.classList.add("day-theme");
        document.body.classList.remove("night-theme");
    } else {
        document.body.classList.add("night-theme");
        document.body.classList.remove("day-theme");
    }
    applyTheme();
}

function toggleThemeManual() {
    manualThemeOverride = true;
    document.body.classList.toggle("day-theme");
    document.body.classList.toggle("night-theme");
    applyTheme();
}

export function initializeTheme() {
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleThemeManual);
    }
    updateTheme();
    setInterval(updateTheme, 60000);
}