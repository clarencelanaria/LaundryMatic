/* ============================================================
   auth.js — Handles login, register, forgot password
   ============================================================ */

/* ─── HOW STORAGE WORKS ──────────────────────────────────────
   localStorage stores data in the browser that survives page
   reloads and tab closes. We use it as a simple "database".

   Key we use:
   'lm_users'        → array of registered user objects
   'lm_current_user' → the username of whoever is logged in
   ─────────────────────────────────────────────────────────── */

/* ─── HELPERS ────────────────────────────────────────────────*/
function checkAuthState() {
    const onAuthPage = window.location.pathname.includes('index')
        || window.location.pathname.includes('register');

    auth.onAuthStateChanged(user => {
        if (user && onAuthPage) {
            window.location.href = 'dashboard.html';
        }
        if (!user && !onAuthPage) {
            window.location.href = 'index.html';
        }
    });
}
checkAuthState();

// Shows an error box with a message
// boxId = the id of the .auth-error div
// msgId = the id of the span inside it
function showError(boxId, msgId, message) {
    const box = document.getElementById(boxId);
    const msg = document.getElementById(msgId);
    if (!box || !msg) return;
    msg.textContent = message;
    box.style.display = 'flex';
}

// Hides an error box
function hideError(boxId) {
    const box = document.getElementById(boxId);
    if (box) box.style.display = 'none';
}

// Toggles password field between text and password type
// btnEl = the eye button element
function togglePassword(inputId, btnEl) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const nowShowing = input.type === 'password'; // about to reveal it
    input.type = nowShowing ? 'text' : 'password';

    // Swap the icon: 'eye' when hidden (click to reveal),
    // 'eye-off' when visible (click to hide again)
    const iconName = nowShowing ? 'eye-off' : 'eye';
    btnEl.innerHTML = `<i data-lucide="${iconName}"></i>`;

    // Lucide only turns <i data-lucide="..."> tags into real icons
    // once — this re-scans the page so the new tag we just inserted
    // actually gets drawn
    lucide.createIcons();
}

/* ─── PAGE GUARD ─────────────────────────────────────────────
   Runs on every page load.
   On login/register pages: if user is already logged in,
   skip straight to the dashboard.
   On the dashboard: if nobody is logged in, redirect to login.
   ─────────────────────────────────────────────────────────── */



/* ─── SEED DATA ──────────────────────────────────────────────
   Creates a default admin account the first time the app runs,
   so there's always something to log in with.
   ─────────────────────────────────────────────────────────── */


/* ─── LOGIN ──────────────────────────────────────────────────*/

async function handleLogin() {
    const email = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const remember = document.getElementById('remember-me').checked;

    hideError('login-error');

    if (!email || !password) {
        showError('login-error', 'login-error-msg', 'Please enter your email and password.');
        return;
    }

    try {
        // Checked = stay logged in after closing the browser.
        // Unchecked = logged out once the browser/tab is closed.
        const persistence = remember
            ? firebase.auth.Auth.Persistence.LOCAL
            : firebase.auth.Auth.Persistence.SESSION;
        await auth.setPersistence(persistence);

        await auth.signInWithEmailAndPassword(email, password);

        // Pre-fill the email field next time, only if "remember me" was checked
        if (remember) {
            localStorage.setItem('lm_remembered', email);
        } else {
            localStorage.removeItem('lm_remembered');
        }

        window.location.href = 'dashboard.html';
    } catch (err) {
        showError('login-error', 'login-error-msg', 'Invalid email or password.');
    }
}

/* ─── LOGOUT ─────────────────────────────────────────────────*/

function handleLogout() {
    auth.signOut().then(() => {
        window.location.href = 'index.html';
    });
}

/* ─── REGISTER ───────────────────────────────────────────────*/

async function handleRegister() {
    const firstName = document.getElementById('reg-firstname').value.trim();
    const lastName = document.getElementById('reg-lastname').value.trim();
    const email = document.getElementById('reg-username').value.trim(); // now expects an email
    const password = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-confirm').value;
    const question = document.getElementById('reg-question').value;
    const answer = document.getElementById('reg-answer').value.trim();

    hideError('register-error');

    if (!firstName || !lastName || !email || !password || !confirm || !question || !answer) {
        showError('register-error', 'register-error-msg', 'Please fill in all fields.');
        return;
    }

    if (password.length < 6) {
        showError('register-error', 'register-error-msg', 'Password must be at least 6 characters.');
        return;
    }

    if (password !== confirm) {
        showError('register-error', 'register-error-msg', 'Passwords do not match.');
        return;
    }

    try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await db.ref('admins/' + cred.user.uid).set({ firstName, lastName, email });
        window.location.href = 'dashboard.html';
    } catch (err) {
        showError('register-error', 'register-error-msg', err.message);
    }
}

/* ─── FORGOT PASSWORD MODAL ──────────────────────────────────
   Single step: user enters their email, Firebase sends them
   a reset link. Firebase handles verifying identity and
   actually changing the password on its own hosted page —
   we never see or touch the new password.
   ─────────────────────────────────────────────────────────── */

function showForgotPassword() {
    hideError('reset-error');
    document.getElementById('reset-email').value = '';
    document.getElementById('forgot-modal').classList.add('open');
}

function closeForgotPassword() {
    document.getElementById('forgot-modal').classList.remove('open');
}

async function handleReset() {
    hideError('reset-error');

    const email = document.getElementById('reset-email').value.trim();

    if (!email) {
        showError('reset-error', 'reset-error-msg', 'Please enter your email.');
        return;
    }

    try {
        await auth.sendPasswordResetEmail(email);
        closeForgotPassword();

        // Reuse the login error box, styled green, as a confirmation
        const box = document.getElementById('login-error');
        const msg = document.getElementById('login-error-msg');
        if (box && msg) {
            msg.textContent = 'Password reset email sent. Check your inbox.';
            box.style.display = 'flex';
            box.style.background = 'rgba(74, 244, 176, 0.08)';
            box.style.borderColor = 'rgba(74, 244, 176, 0.25)';
            box.style.color = 'var(--accent)';
        }
    } catch (err) {
        showError('reset-error', 'reset-error-msg', 'Could not send reset email. Check the address and try again.');
    }
}

/* ─── REGISTER PAGE: LIVE FEEDBACK ──────────────────────────
   These functions run while the user types on the register page.
   ─────────────────────────────────────────────────────────── */

// Shows password strength as a colored bar
function checkPasswordStrength(value) {
    const bar = document.getElementById('strength-bar');
    const label = document.getElementById('strength-label');
    if (!bar || !label) return;

    let strength = 0;
    if (value.length >= 6) strength++;  // long enough
    if (/[A-Z]/.test(value)) strength++;  // has uppercase
    if (/[0-9]/.test(value)) strength++;  // has number
    if (/[^A-Za-z0-9]/.test(value)) strength++;  // has symbol

    const levels = [
        { width: '0%', color: 'transparent', text: '' },
        { width: '25%', color: 'var(--danger)', text: 'Weak' },
        { width: '50%', color: 'var(--accent3)', text: 'Fair' },
        { width: '75%', color: 'var(--accent2)', text: 'Good' },
        { width: '100%', color: 'var(--accent)', text: 'Strong' },
    ];

    const level = value.length === 0 ? levels[0] : levels[strength];
    bar.style.width = level.width;
    bar.style.background = level.color;
    label.textContent = level.text;
    label.className = 'field-hint' + (strength >= 3 ? ' success' : '');
}

/* ─── PRE-FILL REMEMBERED USERNAME ──────────────────────────
   On the login page, if the user had "Remember me" checked
   last time, fill in their username automatically.
   ─────────────────────────────────────────────────────────── */

window.addEventListener('DOMContentLoaded', () => {
    const remembered = localStorage.getItem('lm_remembered');
    const usernameField = document.getElementById('login-username');
    if (remembered && usernameField) {
        usernameField.value = remembered;
        document.getElementById('remember-me').checked = true;
    }
});