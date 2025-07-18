// --- Custom Alert Modal ---
const alertModal = document.getElementById('alert-modal');
const alertMessage = document.getElementById('alert-message');
const alertOkBtn = document.getElementById('alert-ok-btn');

export function customAlert(message) {
    alertMessage.textContent = message;
    alertModal.style.display = 'flex';
    setTimeout(() => alertModal.classList.add('active'), 10);
}

function closeAlert() {
    alertModal.classList.remove('active');
    setTimeout(() => alertModal.style.display = 'none', 300);
}

alertOkBtn.addEventListener('click', closeAlert);

// --- Custom Confirm Modal ---
const confirmModal = document.getElementById('confirm-modal');
const confirmMessage = document.getElementById('confirm-message');
const confirmYesBtn = document.getElementById('confirm-yes-btn');
const confirmNoBtn = document.getElementById('confirm-no-btn');

let confirmResolve;

export function customConfirm(message) {
    return new Promise((resolve) => {
        confirmResolve = resolve;
        confirmMessage.textContent = message;
        confirmModal.style.display = 'flex';
        setTimeout(() => confirmModal.classList.add('active'), 10);
    });
}

function closeConfirm(value) {
    confirmModal.classList.remove('active');
    setTimeout(() => confirmModal.style.display = 'none', 300);
    if (confirmResolve) {
        confirmResolve(value);
    }
}

confirmYesBtn.addEventListener('click', () => closeConfirm(true));
confirmNoBtn.addEventListener('click', () => closeConfirm(false));

// Close modals if clicking on the overlay
alertModal.addEventListener('click', (e) => {
    if (e.target === alertModal) {
        closeAlert();
    }
});
confirmModal.addEventListener('click', (e) => {
    if (e.target === confirmModal) {
        closeConfirm(false);
    }
});
