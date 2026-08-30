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
async function checkAuthState() {
    const onIndexPage = window.location.pathname.includes('index');
    const onAuthPage = onIndexPage || window.location.pathname.includes('register');

    auth.onAuthStateChanged(async user => {
        if (!user) {
            hideTermsGate();
            if (!onAuthPage) window.location.href = 'index.html';
            return;
        }

        const completed = await hasCompletedAllAgreements(user.uid);

        if (!completed) {
            // The login page owns the gate UI — anywhere else, bounce
            // there so it can show it (this also blocks direct
            // dashboard.html access for anyone with outdated terms
            // and/or privacy acknowledgment)
            if (onIndexPage) {
                showTermsGate(user.uid);
            } else {
                window.location.href = 'index.html';
            }
            return;
        }

        // Both documents are current — normal existing behavior
        if (onAuthPage) {
            window.location.href = 'dashboard.html';
        }
    });
}
checkAuthState();

// ── TERMS AND CONDITIONS + PRIVACY NOTICE ─────────────────────
// Bump either string whenever that document's text changes —
// anyone who accepted/acknowledged an older version gets re-gated
// automatically, independently of the other document.
const CURRENT_TERMS_VERSION = '1.0';
const CURRENT_PRIVACY_VERSION = '1.0';

// Holds the uid of whoever is currently stuck at the gate, so the
// Accept button (which has no arguments in its onclick) knows who to update
let gateUid = null;

// Checks Firebase directly — never trusts a cached/local flag
async function hasAcceptedCurrentTerms(uid) {
    const snap = await db.ref('admins/' + uid).once('value');
    const admin = snap.val();
    return !!(admin && admin.termsAccepted === true && admin.termsVersion === CURRENT_TERMS_VERSION);
}

async function hasAcknowledgedCurrentPrivacy(uid) {
    const snap = await db.ref('admins/' + uid).once('value');
    const admin = snap.val();
    return !!(admin && admin.privacyAcknowledged === true && admin.privacyVersion === CURRENT_PRIVACY_VERSION);
}

// Both must be current — used everywhere a single pass/fail decision is needed
async function hasCompletedAllAgreements(uid) {
    const [terms, privacy] = await Promise.all([
        hasAcceptedCurrentTerms(uid),
        hasAcknowledgedCurrentPrivacy(uid),
    ]);
    return terms && privacy;
}

// ── Login-page gate (index.html only) ────────────────────────
// Shows only whichever tab is actually outdated for this user —
// a Terms-only version bump doesn't force re-reading a still-current
// Privacy Notice, and vice versa.
async function showTermsGate(uid) {
    gateUid = uid;

    const termsOk = await hasAcceptedCurrentTerms(uid);
    const privacyOk = await hasAcknowledgedCurrentPrivacy(uid);

    document.getElementById('gate-terms-checkbox').checked = termsOk;
    document.getElementById('gate-privacy-checkbox').checked = privacyOk;
    document.getElementById('gate-terms-checkbox').disabled = termsOk;
    document.getElementById('gate-privacy-checkbox').disabled = privacyOk;

    switchGateTab(termsOk ? 'privacy' : 'terms');
    toggleTermsGateAccept();
    document.getElementById('terms-gate-modal').classList.add('open');
}

function hideTermsGate() {
    const modal = document.getElementById('terms-gate-modal');
    if (modal) modal.classList.remove('open'); // no-op on pages without this modal
}

// Switches between the Terms tab and Privacy tab inside the gate modal
function switchGateTab(tab) {
    document.getElementById('gate-tab-terms').classList.toggle('active', tab === 'terms');
    document.getElementById('gate-tab-privacy').classList.toggle('active', tab === 'privacy');
    document.getElementById('gate-content-terms').style.display = tab === 'terms' ? 'block' : 'none';
    document.getElementById('gate-content-privacy').style.display = tab === 'privacy' ? 'block' : 'none';
}

// Accept button only enables once both checkboxes are checked —
// including ones pre-checked/disabled because that document was
// already current for this user
function toggleTermsGateAccept() {
    const termsChecked = document.getElementById('gate-terms-checkbox').checked;
    const privacyChecked = document.getElementById('gate-privacy-checkbox').checked;
    document.getElementById('terms-gate-accept-btn').disabled = !(termsChecked && privacyChecked);
}

async function handleAcceptTermsGate() {
    if (!gateUid) return;

    const updates = {};
    if (document.getElementById('gate-terms-checkbox').checked) {
        updates.termsAccepted = true;
        updates.termsAcceptedAt = new Date().toISOString();
        updates.termsVersion = CURRENT_TERMS_VERSION;
    }
    if (document.getElementById('gate-privacy-checkbox').checked) {
        updates.privacyAcknowledged = true;
        updates.privacyAcknowledgedAt = new Date().toISOString();
        updates.privacyVersion = CURRENT_PRIVACY_VERSION;
    }

    await db.ref('admins/' + gateUid).update(updates);
    window.location.href = 'dashboard.html';
}

// ── register.html: read-only Terms/Privacy viewers + button gating ────
// Button only enables once BOTH checkboxes are checked
function toggleRegisterButton() {
    const termsChecked = document.getElementById('terms-checkbox').checked;
    const privacyChecked = document.getElementById('privacy-checkbox').checked;
    document.getElementById('register-btn').disabled = !(termsChecked && privacyChecked);
}

function openTermsModal(e) {
    e.preventDefault();
    document.getElementById('terms-modal').classList.add('open');
}

function closeTermsModal() {
    document.getElementById('terms-modal').classList.remove('open');
}

function openPrivacyModal(e) {
    e.preventDefault();
    document.getElementById('privacy-modal').classList.add('open');
}

function closePrivacyModal() {
    document.getElementById('privacy-modal').classList.remove('open');
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

        if (remember) {
            localStorage.setItem('lm_remembered', email);
        } else {
            localStorage.removeItem('lm_remembered');
        }

        // No redirect here — checkAuthState()'s onAuthStateChanged
        // listener decides whether to go to the dashboard or show
        // the Terms gate, since it just fired for this same sign-in.
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
    const email = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-confirm').value;
    const termsChecked = document.getElementById('terms-checkbox').checked;
    const privacyChecked = document.getElementById('privacy-checkbox').checked;

    hideError('register-error');

    if (!firstName || !lastName || !email || !password || !confirm) {
        showError('register-error', 'register-error-msg', 'Please fill in all fields.');
        return;
    }

    // Both agreements are independent and both required before an
    // account is created — accepting one is never treated as
    // accepting the other
    if (!termsChecked) {
        showError('register-error', 'register-error-msg', 'You must agree to the Terms & Conditions before creating an account.');
        return;
    }
    if (!privacyChecked) {
        showError('register-error', 'register-error-msg', 'You must acknowledge the Privacy Notice before creating an account.');
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
        await db.ref('admins/' + cred.user.uid).set({
            firstName, lastName, email,
            // Terms & Conditions acceptance
            termsAccepted: true,
            termsAcceptedAt: new Date().toISOString(),
            termsVersion: CURRENT_TERMS_VERSION,
            // Privacy Notice acknowledgment — recorded separately,
            // never inferred from Terms acceptance
            privacyAcknowledged: true,
            privacyAcknowledgedAt: new Date().toISOString(),
            privacyVersion: CURRENT_PRIVACY_VERSION,
        });
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