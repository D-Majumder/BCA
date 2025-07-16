import { supabase } from './supabase-client.js';
const userEmailElement = document.getElementById('user-email');
const logoutButton = document.getElementById('logout-button');
export async function protectPage() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
    } else {
        if (userEmailElement) {
            userEmailElement.textContent = session.user.email;
        }
    }
}
export function handleLogout() {
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.href = 'login.html';
        });
    }
}