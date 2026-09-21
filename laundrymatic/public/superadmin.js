/* ============================================================
   superadmin.js — Super Admin dashboard: list + approve/reject
   admin requests. Nothing here touches shop operations, orders,
   customers, or any of the existing dashboard.html/app.js code.
   ============================================================ */

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}

function renderRow(uid, admin) {
    const name = `${admin.firstName || ''} ${admin.lastName || ''}`.trim() || '—';
    const status = admin.status || 'approved'; // matches getAdminAccess's default in auth.js

    return `
        <tr data-uid="${uid}">
            <td>${escapeHtml(name)}</td>
            <td>${escapeHtml(admin.email)}</td>
            <td>${escapeHtml(admin.shopName)}</td>
            <td><span class="sa-status ${status}">${status}</span></td>
            <td class="sa-actions">
                <button class="sa-approve" ${status === 'approved' ? 'disabled' : ''} onclick="setAdminStatus('${uid}', 'approved')">Approve</button>
                <button class="sa-reject" ${status === 'rejected' ? 'disabled' : ''} onclick="setAdminStatus('${uid}', 'rejected')">Reject</button>
            </td>
        </tr>
    `;
}

async function loadAdminRequests() {
    const tbody = document.getElementById('sa-table-body');
    const empty = document.getElementById('sa-empty');

    const snap = await db.ref('admins').once('value');
    const all = snap.val() || {};

    // Only show real shop admins — not the Super Admin's own record
    const rows = Object.entries(all)
        .filter(([uid, admin]) => admin.role !== 'superAdmin')
        .sort(([, a], [, b]) => (a.status === 'pending' ? -1 : 1) - (b.status === 'pending' ? -1 : 1))
        .map(([uid, admin]) => renderRow(uid, admin))
        .join('');

    tbody.innerHTML = rows;
    empty.style.display = rows ? 'none' : 'block';
}

async function setAdminStatus(uid, newStatus) {
    try {
        await db.ref('admins/' + uid).update({ status: newStatus });
        await loadAdminRequests();
    } catch (err) {
        alert('Could not update this admin: ' + err.message);
    }
}

// auth.js's checkAuthState() already confirms this user is signed in
// and has role === 'superAdmin' before this page is allowed to stay
// loaded — this listener just refreshes the table once that's settled.
auth.onAuthStateChanged(user => {
    if (user) loadAdminRequests();
});