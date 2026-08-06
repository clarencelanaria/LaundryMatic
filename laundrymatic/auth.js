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

// Returns the users array from storage, or an empty array
function getUsers() {
    const data = localStorage.getItem('lm_users');
    return data ? JSON.parse(data) : [];
}

// Saves the users array back to storage
function saveUsers(users) {
    localStorage.setItem('lm_users', JSON.stringify(users));
}

// Finds one user by username (case-insensitive)
function findUser(username) {
    return getUsers().find(u => u.username.toLowerCase() === username.toLowerCase());
}

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
    if (input.type === 'password') {
        input.type = 'text';
        btnEl.textContent = '🙈';  // closed eye = now visible
    } else {
        input.type = 'password';
        btnEl.textContent = '👁';   // open eye = now hidden
    }
}

/* ─── PAGE GUARD ─────────────────────────────────────────────
   Runs on every page load.
   On login/register pages: if user is already logged in,
   skip straight to the dashboard.
   On the dashboard: if nobody is logged in, redirect to login.
   ─────────────────────────────────────────────────────────── */

function checkAuthState() {
    const currentUser = localStorage.getItem('lm_current_user');
    const onAuthPage = window.location.pathname.includes('index')
        || window.location.pathname.includes('register');

    if (currentUser && onAuthPage) {
        // Already logged in — no need to be on login/register
        window.location.href = 'dashboard.html';
    }

    if (!currentUser && !onAuthPage) {
        // Not logged in — send to login
        window.location.href = 'index.html';
    }
}

// Run the guard immediately when the script loads
checkAuthState();

/* ─── SEED DATA ──────────────────────────────────────────────
   Creates a default admin account the first time the app runs,
   so there's always something to log in with.
   ─────────────────────────────────────────────────────────── */

(function seedDefaultUser() {
    if (getUsers().length === 0) {
        saveUsers([{
            username: 'admin',
            password: 'admin123',
            firstName: 'Admin',
            lastName: 'User',
            question: 'What is your favorite food?',
            answer: 'laundry',
        }]);
    }
})();

/* ─── LOGIN ──────────────────────────────────────────────────*/

function handleLogin() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const remember = document.getElementById('remember-me').checked;

    // Clear any previous error
    hideError('login-error');

    // Validate fields are not empty
    if (!username || !password) {
        showError('login-error', 'login-error-msg', 'Please enter your username and password.');
        return;
    }

    // Look up the user
    const user = findUser(username);

    // Wrong username or password — same message for both (security best practice)
    if (!user || user.password !== password) {
        showError('login-error', 'login-error-msg', 'Invalid username or password.');
        return;
    }

    // Success — save session
    localStorage.setItem('lm_current_user', user.username);

    // If "Remember me" is checked, also save to a separate key so
    // the login page can pre-fill username next time
    if (remember) {
        localStorage.setItem('lm_remembered', user.username);
    } else {
        localStorage.removeItem('lm_remembered');
    }

    // Go to dashboard
    window.location.href = 'dashboard.html';
}

/* ─── REGISTER ───────────────────────────────────────────────*/

function handleRegister() {
    const firstName = document.getElementById('reg-firstname').value.trim();
    const lastName = document.getElementById('reg-lastname').value.trim();
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-confirm').value;
    const question = document.getElementById('reg-question').value;
    const answer = document.getElementById('reg-answer').value.trim();

    hideError('register-error');

    // Validate all fields are filled
    if (!firstName || !lastName || !username || !password || !confirm || !question || !answer) {
        showError('register-error', 'register-error-msg', 'Please fill in all fields.');
        return;
    }

    // Password length check
    if (password.length < 6) {
        showError('register-error', 'register-error-msg', 'Password must be at least 6 characters.');
        return;
    }

    // Passwords must match
    if (password !== confirm) {
        showError('register-error', 'register-error-msg', 'Passwords do not match.');
        return;
    }

    // Username must not already exist
    if (findUser(username)) {
        showError('register-error', 'register-error-msg', 'That username is already taken.');
        return;
    }

    // All good — create the new user
    const users = getUsers();
    users.push({ username, password, firstName, lastName, question, answer });
    saveUsers(users);

    // Log them in immediately after registering
    localStorage.setItem('lm_current_user', username);
    window.location.href = 'dashboard.html';
}

/* ─── FORGOT PASSWORD MODAL ──────────────────────────────────
   Two-step flow:
   Step 1 — user enters username → we show their security question
   Step 2 — user answers + enters new password → we update it
   ─────────────────────────────────────────────────────────── */

let resetStep = 1;   // tracks which step the modal is on
let resetUser = null; // holds the found user object

function showForgotPassword() {
    resetStep = 1;
    resetUser = null;
    hideError('reset-error');
    document.getElementById('reset-username').value = '';
    document.getElementById('security-question-wrap').style.display = 'none';
    document.getElementById('reset-btn').textContent = 'Find Account';
    document.getElementById('forgot-modal').classList.add('open');
}

function closeForgotPassword() {
    document.getElementById('forgot-modal').classList.remove('open');
}

function handleReset() {
    hideError('reset-error');

    if (resetStep === 1) {
        // Step 1: find the user by username
        const username = document.getElementById('reset-username').value.trim();

        if (!username) {
            showError('reset-error', 'reset-error-msg', 'Please enter your username.');
            return;
        }

        const user = findUser(username);

        if (!user) {
            showError('reset-error', 'reset-error-msg', 'No account found with that username.');
            return;
        }

        // Found — show their security question
        resetUser = user;
        document.getElementById('security-question-text').textContent = user.question;
        document.getElementById('security-question-wrap').style.display = 'block';
        document.getElementById('reset-btn').textContent = 'Reset Password';
        resetStep = 2;

    } else {
        // Step 2: verify answer and set new password
        const answer = document.getElementById('security-answer').value.trim();
        const newPass = document.getElementById('new-password').value;

        if (!answer || !newPass) {
            showError('reset-error', 'reset-error-msg', 'Please fill in all fields.');
            return;
        }

        if (answer !== resetUser.answer) {
            showError('reset-error', 'reset-error-msg', 'Incorrect answer. Try again.');
            return;
        }

        if (newPass.length < 6) {
            showError('reset-error', 'reset-error-msg', 'New password must be at least 6 characters.');
            return;
        }

        // Update the password in storage
        const users = getUsers();
        const index = users.findIndex(u => u.username === resetUser.username);
        users[index].password = newPass;
        saveUsers(users);

        closeForgotPassword();

        // Show a quick confirmation on the login page
        // We reuse the error box but style it green inline
        const box = document.getElementById('login-error');
        const msg = document.getElementById('login-error-msg');
        if (box && msg) {
            msg.textContent = 'Password reset successful. You can now log in.';
            box.style.display = 'flex';
            box.style.background = 'rgba(74, 244, 176, 0.08)';
            box.style.borderColor = 'rgba(74, 244, 176, 0.25)';
            box.style.color = 'var(--accent)';
        }
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