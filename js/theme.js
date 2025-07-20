const themeToggle = document.getElementById('theme-toggle');

function applyTheme() {
    if (!themeToggle) return;
    const isNight = document.body.classList.contains('night-theme');
    themeToggle.textContent = isNight ? '🌙' : '☀️';
}

function updateTheme() {
    const savedTheme = localStorage.getItem('theme');

    if (savedTheme) {
        document.body.classList.toggle('night-theme', savedTheme === 'night');
        document.body.classList.toggle('day-theme', savedTheme === 'day');
    } else {
        const istHour = parseInt(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false }));
        const isNight = !(istHour >= 6 && istHour < 18);
        document.body.classList.toggle('night-theme', isNight);
        document.body.classList.toggle('day-theme', !isNight);
    }
    applyTheme();
}


function toggleThemeManual() {
    const isNight = document.body.classList.toggle('night-theme');
    document.body.classList.toggle('day-theme', !isNight);

    if (isNight) {
        localStorage.setItem('theme', 'night');
    } else {
        localStorage.setItem('theme', 'day');
    }
    applyTheme();
}


export function initializeTheme() {
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleThemeManual);
    }
    updateTheme();
    setInterval(updateTheme, 60000);
}