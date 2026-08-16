// Step 23: Your Data
// Start with the raw data your app works with. In a real project, this data comes from a database via an API. For now it's hardcoded.
// Color palette for customer avatars — assigned by name
const avatarColors = ['#4af4b0', '#4a9ff4', '#f4a24a', '#a24af4', '#f44a9f', '#f4f44a'];

// All laundry orders
const ORDERS = [
  { id: '#LM-2041', customer: 'Clarence Lanaria', weight: 6.4, service: 'Wash & Dry', status: 'ready', time: '10:45 AM' },
  { id: '#LM-2042', customer: 'Justine Tenazas', weight: 3.2, service: 'Wash Only', status: 'washing', time: '10:12 AM' },
  { id: '#LM-2043', customer: 'Richard Luceno', weight: 8.7, service: 'Express Wash & Dry', status: 'pending', time: '09:58 AM' },
  { id: '#LM-2044', customer: 'Jeremy Landar', weight: 5.1, service: 'Fold & Fresh', status: 'picked', time: '09:38 AM' },
];

// Price per kilogram
const RATE = 65;

// IoT sensor weight readings history
const HISTORY = [
  { ts: '10:43:21', oid: '#LM-2041', cust: 'Maria Santos', raw: 6.41, tare: 0.00 },
  { ts: '10:10:05', oid: '#LM-2040', cust: 'Juan dela Cruz', raw: 3.23, tare: 0.00 },
  { ts: '09:55:44', oid: '#LM-2039', cust: 'Ana Reyes', raw: 8.72, tare: 0.00 },
  { ts: '09:28:12', oid: '#LM-2038', cust: 'Pedro Gomez', raw: 5.14, tare: 0.00 },
  { ts: '09:08:30', oid: '#LM-2037', cust: 'Rosa Lim', raw: 4.61, tare: 0.00 },
  { ts: '08:53:19', oid: '#LM-2036', cust: 'Carlo Bautista', raw: 2.92, tare: 0.00 },
  { ts: '08:38:55', oid: '#LM-2035', cust: 'Liza Mendoza', raw: 7.31, tare: 0.00 },
];

// Live reading log for the streaming panel
const READINGS = [
  { time: '10:45:01', w: 4.28, cust: 'Maria S.' },
  { time: '10:44:58', w: 4.27, cust: 'Maria S.' },
  { time: '10:44:55', w: 4.29, cust: 'Maria S.' },
  { time: '10:44:52', w: 4.26, cust: 'Maria S.' },
  { time: '10:44:49', w: 4.28, cust: 'Maria S.' },
  { time: '10:44:43', w: 0.00, cust: '—' },
];

// Chart data for each time view

// Step 24: Helper Functions
// Returns initials from a full name: "Maria Santos" → "MS"
function initials(name) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

// Picks a color from the palette based on the first letter of the name
// Same name always gets the same color
function avatarColor(name) {
  return avatarColors[name.charCodeAt(0) % avatarColors.length];
}

// Converts an ISO timestamp into "2 min ago" style text,
// matching the format the old sample notifications used
function formatRelativeTime(isoString) {
    if (!isoString) return '';
    const diffMs  = Date.now() - new Date(isoString).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1)  return 'just now';
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24)  return `${diffHr} hr${diffHr > 1 ? 's' : ''} ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
}

// Calculates the service cost
// Express gets +30%, minimum charge is ₱50
// Simplified after scoping the system to Wash & Dry only —
// no more service-type multiplier needed
function cost(w) {
    const r = w * RATE;
    return Math.max(r, 50);
}

// Builds the HTML string for a colored status badge
function statusBadge(s) {
  const map = {
    ready: ['status-ready', 'Ready'],
    washing: ['status-washing', 'Washing'],
    pending: ['status-pending', 'Pending'],
    picked: ['status-picked', 'Picked Up'],
    cancelled: ['status-cancelled', 'Cancelled'],
  };
  const [cls, label] = map[s] || ['status-pending', s];
  return `<span class="status-badge ${cls}">${label}</span>`;
}

// ── VALIDATION HELPERS ───────────────────────────────────────

// Philippine mobile format: 09XXXXXXXXX — exactly 11 digits, starts with 09
function isValidPHContact(number) {
    return /^09\d{9}$/.test(number);
}

// Strips everything except digits and caps length at 11 —
// call this on input so the field can't even contain letters/symbols
function sanitizeContactInput(value) {
    return value.replace(/\D/g, '').slice(0, 11);
}

// Clears all inline error states in the Register Walk-in modal
function clearRegisterErrors() {
    ['firstname', 'lastname', 'contact1', 'contact2', 'address'].forEach(field => {
        const errEl   = document.getElementById(`err-${field}`);
        const inputEl = document.getElementById(`cust-${field}`);
        if (errEl)   errEl.textContent = '';
        if (inputEl) inputEl.classList.remove('invalid');
    });
}

// Shows a red inline error under a specific field
function showFieldError(field, message) {
    const errEl   = document.getElementById(`err-${field}`);
    const inputEl = document.getElementById(`cust-${field}`);
    if (errEl)   errEl.textContent = message;
    if (inputEl) inputEl.classList.add('invalid');
}
// Step 25: Render Functions
// Fills a table tbody with order rows
// target = the id of the tbody element
// data   = the array of order objects to display
function renderOrders(target, data) {
    const el = document.getElementById(target);
    if (!el) return;

    el.innerHTML = data.map(o => `
    <tr onclick="viewOrderDetails('${o.orderId}')">
      <td><span class="order-id">${o.id}</span></td>
      <td>
        <div class="customer-cell">
          <div class="mini-avatar" style="background:${avatarColor(o.customer)}">
            ${initials(o.customer)}
          </div>
          ${o.customer}
        </div>
      </td>
      <td><span class="weight-cell">${o.weight.toFixed(1)} kg</span></td>
      <td><span style="font-size:0.8rem;color:var(--muted2)">${o.service}</span></td>
      <td><span class="cost-cell">₱${cost(o.weight).toFixed(0)}</span></td>
      <td>${statusBadge(o.status)}</td>
      <td><span style="font-family:var(--font-mono);font-size:0.72rem;color:var(--muted2)">${o.time}</span></td>
    </tr>
  `).join('');
}

// Fills the weight history table on the Weight Monitor page
function renderWeightHistory() {
  const el = document.getElementById('weight-history-body');
  if (!el) return;

  el.innerHTML = HISTORY.map(h => `
    <tr>
      <td><span class="order-id">${h.ts}</span></td>
      <td><span class="order-id">${h.oid}</span></td>
      <td>${h.cust}</td>
      <td><span class="weight-cell">${h.raw.toFixed(2)}</span></td>
      <td style="color:var(--muted2);font-family:var(--font-mono)">${h.tare.toFixed(2)}</td>
      <td><span class="weight-cell" style="color:var(--accent)">${(h.raw - h.tare).toFixed(2)}</span></td>
      <td><span class="cost-cell">₱${(h.raw * RATE).toFixed(0)}</span></td>
    </tr>
  `).join('');
}

// Fills the live readings log with mini bar rows
function renderReadings() {
  const el = document.getElementById('readings-log');
  if (!el) return;

  el.innerHTML = READINGS.map(r => `
    <div class="reading-row">
      <div class="reading-time">${r.time}</div>
      <div class="reading-bar-wrap">
        <div class="reading-bar" style="width:${Math.min(100, (r.w / 10) * 100)}%"></div>
      </div>
      <div class="reading-val">${r.w.toFixed(2)} kg</div>
      <div class="reading-customer">${r.cust}</div>
    </div>
  `).join('');
}

// Fills the transaction audit log on Records page
// Fills the transaction audit log on Records page — now driven by
// real orders from Firebase instead of a hardcoded sample array.
// One row per actual job order, using its current status —
// this matches what "Transaction Records" should mean anyway,
// since Firebase only stores current status, not a status-change
// history. No data invention needed: the current schema already
// has everything this panel requires.
function renderRecords(orders) {
    const el = document.getElementById('records-log');
    if (!el) return;

    if (!orders || orders.length === 0) {
        el.innerHTML = `<div style="text-align:center;color:var(--muted2);padding:24px;font-size:0.82rem">No job orders yet.</div>`;
        return;
    }

    const icons = {
        pending:   '⏳',
        washing:   '🌊',
        ready:     '✅',
        picked:    '📦',
        cancelled: '✕',
    };
    const titles = {
        pending:   'Order Received',
        washing:   'Washing In Progress',
        ready:     'Ready for Pickup',
        picked:    'Picked Up',
        cancelled: 'Cancelled',
    };
    const iconClass = {
        pending:   'wash',
        washing:   'wash',
        ready:     'ready',
        picked:    'pickup',
        cancelled: 'pickup',
    };

    // Cap at 25 — this is an audit log, not the full order history,
    // orders are already sorted newest-first by getAllOrders()
    el.innerHTML = orders.slice(0, 25).map(o => `
    <div class="record-item" onclick="viewOrderDetails('${o.id}')">
      <div class="record-icon ${iconClass[o.status] || 'wash'}">${icons[o.status] || '🧾'}</div>
      <div class="record-body">
        <div class="record-title">${o.transactionCode || 'Job Order'} — ${titles[o.status] || o.status}</div>
        <div class="record-meta">${o.customerName || 'Unknown'} · ${(o.kg || 0).toFixed(1)} kg · ${o.service || '—'}</div>
      </div>
      <div class="record-right">
        <div class="record-time">${o.timeIn || '—'}</div>
        <div class="record-weight">${(o.kg || 0).toFixed(2)} kg</div>
      </div>
    </div>
  `).join('');
}

// Fills the customer leaderboard on Records page
// Computes real top customers from actual Firebase orders
// Replaces the old hardcoded renderCustomerStats()
function renderTopCustomers(orders) {
    const el = document.getElementById('customer-stats');
    if (!el) return;

    const grouped = {};
    orders.forEach(o => {
        if (!o.userId) return;
        if (!grouped[o.userId]) {
            grouped[o.userId] = { name: o.customerName || 'Unknown', orders: 0, weight: 0 };
        }
        grouped[o.userId].orders += 1;
        grouped[o.userId].weight += (o.kg || 0);
    });

    const stats = Object.values(grouped)
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 5);

    if (stats.length === 0) {
        el.innerHTML = `<div style="text-align:center;color:var(--muted2);padding:20px;font-size:0.82rem">No job orders yet.</div>`;
        return;
    }

    const maxW = Math.max(...stats.map(s => s.weight));

    el.innerHTML = stats.map(s => `
    <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(34,39,58,0.4)">
      <div class="mini-avatar" style="background:${avatarColor(s.name)};width:30px;height:30px">
        ${initials(s.name)}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:0.82rem;font-weight:600;margin-bottom:4px">${s.name}</div>
        <div style="height:4px;background:var(--border);border-radius:2px;overflow:hidden">
          <div style="height:100%;width:${(s.weight / maxW) * 100}%;background:var(--accent);border-radius:2px"></div>
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-family:var(--font-mono);font-size:0.75rem;color:var(--accent)">${s.weight.toFixed(1)} kg</div>
        <div style="font-size:0.68rem;color:var(--muted)">${s.orders} orders</div>
      </div>
    </div>
  `).join('');
}

// Fills the notifications feed
// Fills the notifications feed with real Firebase data — one
// combined feed across every customer, newest first.
function renderNotifications(notifications) {
    const el = document.getElementById('notif-list');
    if (!el) return;

    if (!notifications || notifications.length === 0) {
        el.innerHTML = `<div style="text-align:center;color:var(--muted2);padding:24px;font-size:0.82rem">No notifications yet.</div>`;
        return;
    }

    el.innerHTML = notifications.map(n => {
        // Notifications don't store a customer name directly — look
        // it up from the already-cached orders list instead of an
        // extra Firebase read
        const relatedOrder = allOrdersCache.find(o => o.id === n.data?.orderId);
        const customerName = relatedOrder ? relatedOrder.customerName : 'A customer';

        const dotClass = n.data?.type === 'ready'    ? 'green'
            : n.data?.type === 'received' ? 'blue'
                : 'grey';

        let text;
        if (n.data?.type === 'ready') {
            text = `<strong>${customerName}</strong>'s laundry is ready for pickup.`;
        } else if (n.data?.type === 'received') {
            const kgText = relatedOrder ? ` (${relatedOrder.kg.toFixed(1)} kg)` : '';
            text = `<strong>${customerName}</strong>'s laundry was received${kgText}.`;
        } else {
            text = n.title || 'Notification';
        }

        return `
      <div class="notif-item ${!n.read ? 'unread' : ''}">
        <div class="notif-dot ${dotClass}"></div>
        <div>
          <div class="notif-text">${text}</div>
          <div class="notif-time">${formatRelativeTime(n.createdAt)}</div>
        </div>
      </div>
    `;
    }).join('');
}

// Builds the bar chart inside #chart-area
function renderChart(data, labels) {
  const el = document.getElementById('chart-area');
  if (!el) return;

  const max = Math.max(...data);
  const colors = ['var(--accent)', 'var(--accent2)', 'var(--accent3)'];

  el.innerHTML = data.map((v, i) => `
    <div class="bar-wrap">
      <div class="bar-tooltip">${v} orders</div>
      <div class="bar" style="height:${Math.max(4, (v / max) * 100)}%;background:${colors[i % colors.length]}"></div>
      <div class="bar-label">${labels[i]}</div>
    </div>
  `).join('');
}
// Step 26: Page Navigation
function showPage(page, el) {
  // 1. Hide ALL pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  // 2. Deactivate ALL nav items
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // 3. Show the selected page
  document.getElementById('page-' + page).classList.add('active');

  // 4. Highlight the clicked nav item
  if (el) el.classList.add('active');

  // 5. Update the topbar title
  const titles = {
    dashboard: 'Overview',
    orders: 'Job Orders',
    weight: 'Weight Monitor',
    records: 'Records',
      reports: 'Reports',
    customers: 'customers',
    notifications: 'Notifications',
    settings: 'Settings',
  };
  document.getElementById('page-title').textContent = titles[page] || page;

  // Load approved customers when navigating to the customers page
  if (page === 'customers') {
    loadApprovedCustomers();
    loadPendingCustomers();   // updates the pending badge count
  }

  if (page === 'reports') {
      loadReport();
  }
}
// Step 27: Chart Tab Switcher
// ── DASHBOARD CHART — REAL DATA ─────────────────────────────

// Cache of all orders — refreshed by loadOrders() and the realtime listener
// Chart functions read from this instead of any hardcoded data
let allOrdersCache  = [];
let currentChartView = 'today';
let allNotificationsCache = [];

// Groups real orders into hourly/daily buckets depending on the view
function computeOrderVolumeData(orders, view) {
    const now = new Date();

    if (view === 'today') {
        const labels = ['12A','1A','2A','3A','4A','5A','6A','7A','8A','9A','10A','11A',
            '12P','1P','2P','3P','4P','5P','6P','7P','8P','9P','10P','11P'];
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const data = labels.map((_, hour) =>
            orders.filter(o => {
                if (!o.createdAt) return false;
                const c = new Date(o.createdAt);
                return c >= todayStart && c.getHours() === hour;
            }).length
        );
        return { data, labels };
    }

    if (view === 'week') {
        const labels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
        const day = now.getDay();
        const diffToMonday = day === 0 ? -6 : 1 - day;
        const monday = new Date(now);
        monday.setDate(now.getDate() + diffToMonday);
        monday.setHours(0, 0, 0, 0);

        const data = labels.map((_, i) => {
            const dayStart = new Date(monday); dayStart.setDate(monday.getDate() + i);
            const dayEnd   = new Date(dayStart); dayEnd.setHours(23, 59, 59, 999);
            return orders.filter(o => {
                if (!o.createdAt) return false;
                const c = new Date(o.createdAt);
                return c >= dayStart && c <= dayEnd;
            }).length;
        });
        return { data, labels };
    }

    if (view === 'month') {
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const labels = Array.from({ length: daysInMonth }, (_, i) => i + 1);

        const data = labels.map(dayNum =>
            orders.filter(o => {
                if (!o.createdAt) return false;
                const c = new Date(o.createdAt);
                return c.getMonth()    === now.getMonth() &&
                    c.getFullYear() === now.getFullYear() &&
                    c.getDate()     === dayNum;
            }).length
        );
        return { data, labels };
    }

    return { data: [], labels: [] };
}

// Draws the dashboard's Job Order Volume chart using cached real orders
function renderDashboardChart(view) {
    const { data, labels } = computeOrderVolumeData(allOrdersCache, view);
    renderChart(data, labels);
}

// Called by the Today/Week/Month tab buttons on the dashboard
// Scoped to #page-dashboard so it never touches the Reports page tabs
function setChartView(view, el) {
    document.querySelectorAll('#page-dashboard .tab-pill').forEach(p => p.classList.remove('active'));
    if (el) el.classList.add('active');
    currentChartView = view;
    renderDashboardChart(view);
}

//Step 28: Live Weight Simulation
// Current live weight — updated by Firebase listener
let liveW = 0.00;

//stores the currently selected customer from the search dropdown
let selectedCustomer = null;

//stores current weight mode: 'live' or 'manual'
let weightMode = 'live';

// Holds the customer loaded from a profile QR scan
let scannedProfileCustomer = null;

let minWeightKg = 3; // overwritten by Firebase settings on load

async function loadSettingsIntoForm() {
    const settings = await getSettings();
    minWeightKg = settings.minWeightKg || 3;
    const input = document.getElementById('min-weight-input');
    if (input) input.value = minWeightKg;
}

// Connects to Firebase and listens for real Arduino readings
// Replaces the fake setInterval simulation
function startLiveWeight() {
    listenToLiveWeight((kg, updatedAt, active) => {
        liveW = kg;
        const display = kg.toFixed(2);

        // Topbar pill — always visible, on every page, no modal needed.
        // This is the fix: previously the only live-weight target left
        // in the DOM was inside the (hidden-until-opened) New Job Order
        // modal, so nothing visibly updated on the main dashboard.
        const topbarPill = document.getElementById('topbar-weight-pill');
        const topbarW     = document.getElementById('topbar-live-weight');
        if (topbarW)    topbarW.textContent = display;
        if (topbarPill) topbarPill.classList.toggle('active', !!active);

        // Modal's own live weight display — still works exactly as before
        const modalW = document.getElementById('modal-live-weight');
        if (modalW) {
            modalW.textContent = display;
            updateCost();
        }
    });
}
//Step 29: Modal Logic
// Opens the modal and auto-fills the weight from the live sensor

// Fills the customer chip UI from a customer object that already
// includes .id — pulled out so every "open modal with a known
// customer" caller uses one single, correct implementation
// instead of five slightly-different copies of the same block.
function populateSelectedCustomerChip(customer) {
    selectedCustomer = {
        id:        customer.id,
        firstName: customer.firstName,
        lastName:  customer.lastName,
        contact1:  customer.contact1 || '',
        contact2:  customer.contact2 || '',
    };

    document.getElementById('customer-clear').style.display = 'block';
    document.getElementById('selected-avatar').textContent =
        customer.firstName[0] + (customer.lastName[0] || '');
    document.getElementById('selected-name').textContent =
        `${customer.firstName} ${customer.lastName}`;
    document.getElementById('selected-contact').textContent =
        customer.contact1 + (customer.contact2 ? ' · ' + customer.contact2 : '');
    document.getElementById('selected-customer').style.display = 'flex';
}

// Opens the New Job Order modal.
// prefillCustomer (optional) — pass a customer object (with .id) to
// open the modal already pointed at that customer, e.g. straight
// from a QR scan. Pass nothing for a normal blank modal.
//
// This replaces the old "reset everything, then hope something
// re-populates it afterward" pattern. The customer state is now
// decided ONCE, synchronously, before the modal is ever shown —
// there's no window where a half-reset state can leak through,
// regardless of what future edits get added to this function.
function openModal(prefillCustomer = null) {
    weightMode = 'live';

    document.getElementById('form-weight-input').value = '';
    document.getElementById('form-weight-input').style.display = 'none';
    document.getElementById('form-notes').value = '';
    document.getElementById('weight-live-display').style.display = 'flex';
    document.getElementById('manual-checkbox').checked = false;
    document.getElementById('modal-live-weight').textContent = liveW.toFixed(2);

    if (prefillCustomer) {
        populateSelectedCustomerChip(prefillCustomer);
    } else {
        selectedCustomer = null;
        document.getElementById('customer-search').value = '';
        document.getElementById('customer-clear').style.display = 'none';
        document.getElementById('customer-dropdown').style.display = 'none';
        document.getElementById('selected-customer').style.display = 'none';
    }

    updateCost();
    document.getElementById('modal').classList.add('open');
}

// Closes the modal
function closeModal() {
  document.getElementById('modal').classList.remove('open');
}

// Computes real KPI numbers using the same date-range method as Reports —
// createdAt Date comparison instead of fragile string matching
function updateDashboardKPIs(orders) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const todayOrders = orders.filter(o => {
        if (!o.createdAt) return false;
        const c = new Date(o.createdAt);
        return c >= todayStart && c <= todayEnd;
    });

    const totalWeightToday = todayOrders.reduce((sum, o) => sum + (o.kg || 0), 0);
    const revenueToday     = todayOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
    const pendingPickup    = orders.filter(o => o.status === 'ready').length;

    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    set('kpi-orders',  todayOrders.length);
    set('kpi-weight',  totalWeightToday.toFixed(1));
    set('kpi-revenue', '₱' + Math.round(revenueToday).toLocaleString());
    set('kpi-pending', pendingPickup);
}

// Recalculates cost whenever weight or service changes
function updateCost() {
  const w = getActiveWeight();
  const s = document.getElementById('form-service').value;
  document.getElementById('form-cost').textContent = '₱' + cost(w).toFixed(0);
}

// Handles the Create Order button
// ── UPDATE submitOrder() ──────────────────────────────────────
// Replace your existing submitOrder() with this version

// Prevents duplicate job orders from a double Enter press, a
// double-click, or Enter and a click racing each other
let isSubmittingOrder = false;

async function submitOrder() {
    if (isSubmittingOrder) return; // already in flight — ignore this trigger

    if (!selectedCustomer) {
        showToast('⚠️', 'Please select a customer first.');
        return;
    }

    const w = getActiveWeight();
    if (!w || w <= 0) {
        showToast('⚠️', 'Please enter a valid weight.');
        return;
    }
    if (w < minWeightKg) {
        showToast('⚠️', `Minimum ${minWeightKg} kg required per transaction.`);
        return;
    }

    isSubmittingOrder = true;

    // Lock the button visually too — belt and suspenders against
    // a rapid double-click slipping through before the flag above
    // has fully taken effect
    const submitBtn = document.querySelector('#modal .modal-footer .btn-primary');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating...';
    }

    const s = document.getElementById('form-service').value;
    const notes = document.getElementById('form-notes').value.trim();

    try {
        const orderId = await createOrder(selectedCustomer.id, {
            customerName: `${selectedCustomer.firstName} ${selectedCustomer.lastName}`,
            kg: w,
            amount: cost(w),
            service: s,
            notes: notes,
        });

        const savedOrder = await db.ref(`orders/${orderId}`).once('value');
        const orderData = savedOrder.val();

        showToast('✅', `Order created for ${selectedCustomer.firstName}.`);
        closeModal();
        loadOrders();

        showReceiptModal(orderData, selectedCustomer);

    } catch (err) {
        showToast('⚠️', 'Error creating order.');
        console.error(err);
    } finally {
        isSubmittingOrder = false;
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Job Order';
        }
    }
}
//Step 30: Toast, Filter, and Other Actions
// Shows a brief notification at the bottom-right for 3 seconds
function showToast(icon, msg) {
  const t = document.getElementById('toast');
  document.getElementById('toast-icon').textContent = icon;
  document.getElementById('toast-msg').textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000); // auto-hide after 3s
}

// Filters table rows by the search query
function filterTable(q) {
  const rows = document.querySelectorAll('#orders-body tr, #orders-body-full tr');
  rows.forEach(r => {
    r.style.display = r.textContent.toLowerCase().includes(q.toLowerCase()) ? '' : 'none';
  });
}

// Simulates a sensor refresh
function refreshWeight() {
  showToast('⚖', 'Weight sensor refreshed.');
}

// Simulates taring the scale
function tare() {
  showToast('⊖', 'Scale tared. Offset set to ' + liveW.toFixed(2) + ' kg.');
}

// Marks all notifications as read
// Marks all currently-unread notifications as read in Firebase.
// No manual re-render needed afterward — the live listener will
// automatically fire again with the updated read states.
async function markAllRead() {
    const unread = allNotificationsCache.filter(n => !n.read);

    if (unread.length === 0) {
        showToast('🔔', 'No unread notifications.');
        return;
    }

    try {
        await Promise.all(
            unread.map(n => markNotificationRead(n.userId, n.notifId))
        );
        showToast('🔔', 'All notifications marked as read.');
    } catch (err) {
        showToast('⚠️', 'Error marking notifications as read.');
        console.error(err);
    }
}

// Advances an order through its status lifecycle
// ── UPDATE STATUS TO FIREBASE ─────────────────────────────────

async function updateStatus(orderId) {
  // orderId here is the transactionCode displayed in the table
  // We need to find the real Firebase orderId first
  const orders = await getAllOrders();
  const order = orders.find(o => o.transactionCode === orderId);
  if (!order) return;

  const cycle = {
    pending: 'washing',
    washing: 'ready',
    ready: 'picked',
    picked: 'picked',
    cancelled: 'cancelled',
  };

  const newStatus = cycle[order.status] || 'pending';
  await updateOrderStatus(order.id, newStatus);
  showToast('✅', `Order updated to ${newStatus}.`);
  loadOrders();
}

// Opens the Order Scan Modal manually — reused for both QR scanning
// and clicking a row in the table (replaces the old Update button)
async function viewOrderDetails(orderId) {
    try {
        const snap  = await db.ref(`orders/${orderId}`).once('value');
        const order = snap.val();

        if (!order) {
            showToast('⚠️', 'Job order not found.');
            return;
        }

        openOrderScanModal(orderId, order);

    } catch (err) {
        showToast('⚠️', 'Error loading job order.');
        console.error(err);
    }
}

// Simulates saving settings
async function saveSettings() {
    const minInput = document.getElementById('min-weight-input');
    const newMin   = parseFloat(minInput.value) || 3;

    try {
        await saveSettingsToFirebase({ minWeightKg: newMin });
        minWeightKg = newMin;
        showToast('💾', 'Settings saved successfully.');
    } catch (err) {
        showToast('⚠️', 'Error saving settings.');
        console.error(err);
    }
}


// ── ORDER SCAN MODAL ─────────────────────────────────────────

const STATUS_ICONS = {
  pending: '⏳',
  washing: '🌀',
  ready: '✅',
  picked: '📦',
  cancelled: '✕',
};

const STATUS_LABELS = {
  pending: 'Pending',
  washing: 'Washing',
  ready: 'Ready for Pickup',
  picked: 'Picked Up',
  cancelled: 'Cancelled',
};

// Holds the orderId currently shown in the scan modal
let scannedOrderId = null;

// ── HANDLE QR SCAN FROM TOPBAR ───────────────────────────────
// Called by the thermal scanner input via onkeydown="handleValidationScan(event)"
// BUT this one handles the TOPBAR scan input (scan-input), not the validation input

async function handleQRScan(value) {
    const qrValue = (value || '').trim();
    if (!qrValue) return;

    const input = document.getElementById('scan-input');
    if (input) input.value = '';

    // Instant feedback so the admin sees a response the moment they
    // scan, instead of a silent gap while Firebase round-trips happen
    showToast('🔎', 'Looking up scanned code...');

    try {
        // Order lookups and customer lookups hit completely separate
        // Firebase paths, so there's no need to wait for one before
        // starting the other. Running them together removes a full
        // network round-trip from every single scan.
        const [orderSnap, customer] = await Promise.all([
            db.ref(`orders/${qrValue}`).once('value'),
            getCustomer(qrValue),
        ]);

        const order = orderSnap.val();

        if (order) {
            openOrderScanModal(qrValue, order);
            return;
        }

        if (!customer) {
            showToast('⚠️', 'QR code not recognized.');
            return;
        }

        if (customer.status !== 'approved') {
            showToast('⚠️', `${customer.firstName} is not yet validated.`);
            return;
        }

        // This lookup genuinely depends on the customer being valid
        // first, so it can't be parallelized with the step above
        const allOrders   = await getOrdersByUser(qrValue);
        const readyOrders = allOrders.filter(o => o.status === 'ready');

        if (readyOrders.length > 0) {
            openPickupModal(qrValue, customer, readyOrders);
        } else {
            openNewOrderFromScan(qrValue, customer);
        }

    } catch (err) {
        showToast('⚠️', 'Error reading QR. Try again.');
        console.error(err);
    }
}

// ── OPEN ORDER SCAN MODAL ────────────────────────────────────

function openOrderScanModal(orderId, order) {
  scannedOrderId = orderId;
  const status = order.status || 'pending';

  // Status banner color
  const banner = document.getElementById('scan-status-banner');
  banner.className = `scan-status-banner ${status}`;
  document.getElementById('scan-status-icon').textContent =
    STATUS_ICONS[status] || '⏳';
  document.getElementById('scan-status-label').textContent =
    STATUS_LABELS[status] || status;

  // Fill detail cells
  document.getElementById('scan-txn-code').textContent =
    order.transactionCode || orderId.slice(0, 12) + '...';
  document.getElementById('scan-customer-name').textContent =
    order.customerName || '—';
  document.getElementById('scan-service').textContent =
    order.service || '—';
  document.getElementById('scan-weight').textContent =
    (order.kg || 0).toFixed(2) + ' kg';
  document.getElementById('scan-amount').textContent =
    '₱' + Math.round(order.amount || 0);
  document.getElementById('scan-date-in').textContent =
    order.dateIn || '—';

  // ETA row — hide if already picked up
  const etaRow = document.getElementById('scan-eta-row');
  if (order.estimatedFinishTime && status !== 'picked') {
    etaRow.style.display = 'flex';
    document.getElementById('scan-eta').textContent =
      `${order.estimatedFinishDate} · ${order.estimatedFinishTime}`;
  } else {
    etaRow.style.display = 'none';
  }

  // Action buttons based on current status
  const actionsDiv = document.getElementById('scan-actions');
  const terminalDiv = document.getElementById('scan-terminal-msg');
  actionsDiv.innerHTML = '';
  terminalDiv.style.display = 'none';

  if (status === 'pending' || status === 'washing') {
    const nextStatus = status === 'pending' ? 'washing' : 'ready';
    const nextLabel = status === 'pending'
      ? '🌀 Mark as Washing'
      : '✅ Mark as Ready';

    actionsDiv.innerHTML = `
      <button class="btn btn-ghost"
              onclick="closeOrderScanModal()">
        Cancel
      </button>
      <button class="btn btn-primary"
              onclick="scanMarkStatus('${orderId}', '${nextStatus}')">
        ${nextLabel}
      </button>
    `;

  } else if (status === 'ready') {
    actionsDiv.innerHTML = `
      <button class="btn btn-ghost"
              onclick="closeOrderScanModal()">
        Cancel
      </button>
      <button class="btn btn-primary"
              style="background:var(--accent)"
              onclick="scanMarkStatus('${orderId}', 'picked')">
        📦 Mark as Picked Up / Paid
      </button>
    `;

  } else {
    // Already terminal — picked or cancelled
    terminalDiv.style.display = 'block';
    terminalDiv.textContent = status === 'picked'
      ? '✅ This order has already been picked up.'
      : '✕ This order was cancelled.';
  }

  document.getElementById('order-scan-modal').classList.add('open');
}

function closeOrderScanModal() {
  document.getElementById('order-scan-modal').classList.remove('open');
  scannedOrderId = null;
}

// Marks the order with the new status
async function scanMarkStatus(orderId, newStatus) {
  try {
    await updateOrderStatus(orderId, newStatus);
    showToast('✅', `Order marked as ${STATUS_LABELS[newStatus]}.`);
    closeOrderScanModal();
    loadOrders();
  } catch (err) {
    showToast('⚠️', 'Error updating order status.');
    console.error(err);
  }
}

// ── OPEN PROFILE SCAN MODAL ──────────────────────────────────

async function openProfileScanModal(userId, customer) {
  scannedProfileCustomer = { id: userId, ...customer };

  // Fill customer info card
  document.getElementById('ps-avatar').textContent =
    customer.firstName[0] + customer.lastName[0];
  document.getElementById('ps-name').textContent =
    `${customer.firstName} ${customer.lastName}`;
  document.getElementById('ps-contact').textContent =
    customer.contact1 +
    (customer.contact2 ? ' · ' + customer.contact2 : '');
  document.getElementById('ps-address').textContent =
    customer.address || '—';
  document.getElementById('ps-fb').textContent =
    customer.fbAccount || '—';

  // Load orders for this customer
  const orders = await getOrdersByUser(userId);

  const readyOrders = orders.filter(o => o.status === 'ready');
  const activeOrders = orders.filter(
    o => o.status === 'pending' || o.status === 'washing'
  );
  const balance = orders
    .filter(o => o.status !== 'picked' && o.status !== 'cancelled')
    .reduce((sum, o) => sum + (o.amount || 0), 0);

  document.getElementById('ps-ready-count').textContent = readyOrders.length;
  document.getElementById('ps-active-count').textContent = activeOrders.length;
  document.getElementById('ps-balance').textContent = '₱' + Math.round(balance);

  // Fill orders table
  const tbody = document.getElementById('ps-orders-body');

  if (orders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6"
            style="text-align:center;
                   color:var(--muted2);padding:20px">
          No orders yet.
        </td>
      </tr>`;
  } else {
    tbody.innerHTML = orders.map(o => `
      <tr>
        <td>
          <span class="order-id">
            ${o.transactionCode || o.id.slice(0, 8)}
          </span>
        </td>
        <td style="font-size:0.8rem;color:var(--muted2)">
          ${o.service}
        </td>
        <td>
          <span class="weight-cell">
            ${(o.kg || 0).toFixed(1)} kg
          </span>
        </td>
        <td>
          <span class="cost-cell">
            ₱${Math.round(o.amount || 0)}
          </span>
        </td>
        <td>${statusBadge(o.status)}</td>
        <td>
          ${o.status === 'ready' ? `
            <button
              class="btn btn-primary"
              style="padding:3px 10px;font-size:0.72rem"
              onclick="quickMarkPickedUp('${o.id}')">
              📦 Picked Up
            </button>
          ` : `
            <span style="color:var(--muted);font-size:0.75rem">—</span>
          `}
        </td>
      </tr>
    `).join('');
  }

  document.getElementById('profile-scan-modal').classList.add('open');
}

function closeProfileScanModal() {
  document.getElementById('profile-scan-modal').classList.remove('open');
  scannedProfileCustomer = null;
}

// Marks one order as picked up from inside the profile modal
async function quickMarkPickedUp(orderId) {
  try {
    await updateOrderStatus(orderId, 'picked');
    showToast('✅', 'Order marked as Picked Up.');

    // Refresh the profile modal with updated order data
    const c = scannedProfileCustomer;
    if (c) await openProfileScanModal(c.id, c);

    loadOrders();
  } catch (err) {
    showToast('⚠️', 'Error updating order.');
    console.error(err);
  }
}

// ── ORDER CREATION FROM CUSTOMER ─────────────────────────────

// Opens the new order modal pre-filled with the customer
function createOrderForCustomer(userId, customerName) {
  // Open the modal first so all elements exist
  openModal();

  // Then pre-select the customer by simulating a selection
  // Split the full name back into first/last for the chip display
  const parts = customerName.split(' ');
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');

  selectedCustomer = { id: userId, firstName, lastName };

  // Hide the search input, show the selected chip
  document.getElementById('customer-clear').style.display = 'block';
  document.getElementById('selected-avatar').textContent = firstName[0] + (lastName[0] || '');
  document.getElementById('selected-name').textContent = customerName;
  document.getElementById('selected-contact').textContent = '';

  const chip = document.getElementById('selected-customer');
  chip.style.display = 'flex';

  updateCost();
}

// ── LOAD ORDERS FROM FIREBASE ────────────────────────────────

async function loadOrders() {
    const orders = await getAllOrders();
    allOrdersCache = orders;   // cache for the chart to read from

    const mapped = orders.map(o => ({
        id:       o.transactionCode,
        customer: o.customerName,
        weight:   o.kg,
        service:  o.service,
        status:   o.status,
        time:     o.timeIn,
        orderId:  o.id,
    }));

    renderOrders('orders-body',      mapped.slice(0, 10));
    renderOrders('orders-body-full', mapped);

    updateDashboardKPIs(orders);
    updateStatusOverview(orders);
    renderTopCustomers(orders);
    renderRecords(orders);
    renderDashboardChart(currentChartView);
}

// ── CUSTOMER SEARCH ──────────────────────────────────────────

// Called on every keystroke in the customer search field
async function searchCustomers(query) {
  const dropdown = document.getElementById('customer-dropdown');
  const selected = document.getElementById('selected-customer');

  // Hide the selected chip while searching
  selected.style.display = 'none';
  selectedCustomer = null;
  updateCost();

  // Don't search if field is empty
  if (!query.trim()) {
    dropdown.style.display = 'none';
    return;
  }

  // Get all customers from Firebase
  const customers = await getAllCustomers();

  // Filter by name or contact number — case insensitive
  const q = query.toLowerCase();
  const matches = customers.filter(c => {
    const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
    const contact1 = (c.contact1 || '').toLowerCase();
    const contact2 = (c.contact2 || '').toLowerCase();
    return fullName.includes(q) || contact1.includes(q) || contact2.includes(q);
  });

  // Build dropdown HTML
  if (matches.length === 0) {
    dropdown.innerHTML = `
      <div class="dropdown-empty">
        No customer found for "${query}"
      </div>
    `;
  } else {
    dropdown.innerHTML = matches.map(c => `
      <div class="dropdown-item" onclick="selectCustomer('${c.id}')">
        <div class="dropdown-avatar" style="background:${avatarColor(c.firstName)}">
          ${c.firstName[0]}${c.lastName[0]}
        </div>
        <div>
          <div class="dropdown-name">${c.firstName} ${c.lastName}</div>
          <div class="dropdown-contact">${c.contact1}${c.contact2 ? ' · ' + c.contact2 : ''}</div>
        </div>
      </div>
    `).join('');
  }

  dropdown.style.display = 'block';
}

// Called when a customer row is clicked in the dropdown
async function selectCustomer(customerId) {
  // Fetch fresh customer data from Firebase
  const customer = await getCustomer(customerId);
  if (!customer) return;

  // Store selected customer globally so submitOrder() can use it
  selectedCustomer = { id: customerId, ...customer };

  // Hide the dropdown and search input
  document.getElementById('customer-dropdown').style.display = 'none';
  document.getElementById('customer-search').value = '';
  document.getElementById('customer-clear').style.display = 'block';

  // Show the green selected chip
  const chip = document.getElementById('selected-customer');
  document.getElementById('selected-avatar').textContent =
    customer.firstName[0] + customer.lastName[0];
  document.getElementById('selected-name').textContent =
    `${customer.firstName} ${customer.lastName}`;
  document.getElementById('selected-contact').textContent =
    customer.contact1 + (customer.contact2 ? ' · ' + customer.contact2 : '');
  chip.style.display = 'flex';
}

// Called when X button is clicked — clears the selection
function clearCustomerSelection() {
  selectedCustomer = null;
  document.getElementById('customer-search').value = '';
  document.getElementById('customer-clear').style.display = 'none';
  document.getElementById('selected-customer').style.display = 'none';
  document.getElementById('customer-dropdown').style.display = 'none';
  updateCost();
}

// ── WEIGHT MODE TOGGLE ───────────────────────────────────────

// Switches between live sensor mode and manual typing mode
function setWeightMode(mode) {
  weightMode = mode;

  const liveDisplay = document.getElementById('weight-live-display');
  const manualInput = document.getElementById('form-weight-input');
  const checkbox = document.getElementById('manual-checkbox');

  if (mode === 'live') {
    liveDisplay.style.display = 'flex';
    manualInput.style.display = 'none';
    if (checkbox) checkbox.checked = false;
  } else {
    liveDisplay.style.display = 'none';
    manualInput.style.display = 'block';
    manualInput.focus();
    if (checkbox) checkbox.checked = true;
  }

  updateCost();
}

// Returns the current weight based on the active mode
function getActiveWeight() {
  if (weightMode === 'live') {
    return liveW;
  } else {
    // Changed from form-weight to form-weight-input
    return parseFloat(document.getElementById('form-weight-input').value) || 0;
  }
}

// ── CUSTOMER TAB SWITCHER ────────────────────────────────────

function switchCustomerTab(tab, el) {
  // Update tab button styles
  document.getElementById('tab-btn-pending')
    .classList.toggle('active', tab === 'pending');
  document.getElementById('tab-btn-approved')
    .classList.toggle('active', tab === 'approved');

  // Show/hide tab panels
  document.getElementById('tab-pending').style.display =
    tab === 'pending' ? 'block' : 'none';
  document.getElementById('tab-approved').style.display =
    tab === 'approved' ? 'block' : 'none';

  // Load the right data
  if (tab === 'pending') loadPendingCustomers();
  if (tab === 'approved') loadApprovedCustomers();
}

// ── LOAD PENDING CUSTOMERS ───────────────────────────────────

async function loadPendingCustomers() {
  const customers = await getPendingCustomers();
  const el = document.getElementById('pending-customers-body');
  const badge = document.getElementById('pending-badge');

  if (badge) badge.textContent = customers.length;
  if (!el) return;

  if (customers.length === 0) {
    el.innerHTML = `
      <tr>
        <td colspan="7"
            style="text-align:center;
                   color:var(--muted2);padding:28px">
          No pending customers.
          All mobile registrations appear here.
        </td>
      </tr>`;
    return;
  }

  el.innerHTML = customers.map(c => `
    <tr>
      <td>
        <div class="customer-cell">
          <div class="mini-avatar"
               style="background:${avatarColor(c.firstName)}">
            ${c.firstName[0]}${c.lastName[0]}
          </div>
          ${c.firstName} ${c.lastName}
        </div>
      </td>
      <td style="font-family:var(--font-mono);font-size:0.8rem">
        ${c.contact1}
      </td>
      <td style="font-family:var(--font-mono);font-size:0.8rem">
        ${c.contact2 || '—'}
      </td>
      <td style="font-size:0.8rem;color:var(--muted2)">
        ${c.address}
      </td>
      <td style="font-size:0.8rem;color:var(--muted2)">
        ${c.fbAccount || '—'}
      </td>
      <td style="font-family:var(--font-mono);
                 font-size:0.72rem;color:var(--muted2)">
        ${new Date(c.createdAt).toLocaleDateString('en-PH')}
      </td>
      <td>
        <button
          class="btn btn-primary"
          style="padding:4px 14px;font-size:0.75rem"
          onclick="validateCustomer('${c.id}')"
        >
          ✓ Validate
        </button>
      </td>
    </tr>
  `).join('');
}

// ── LOAD APPROVED CUSTOMERS ──────────────────────────────────

async function loadApprovedCustomers() {
  const customers = await getApprovedCustomers();
  const el = document.getElementById('customers-body');
  if (!el) return;

  if (customers.length === 0) {
    el.innerHTML = `
      <tr>
        <td colspan="5"
            style="text-align:center;
                   color:var(--muted2);padding:28px">
          No approved customers yet.
          Register a walk-in or validate a pending customer.
        </td>
      </tr>`;
    return;
  }

  el.innerHTML = customers.map(c => `
    <tr style="cursor:pointer"
        onclick="openCustomerProfileModal('${c.id}')">
      <td>
        <div class="customer-cell">
          <div class="mini-avatar"
               style="background:${avatarColor(c.firstName)}">
            ${c.firstName[0]}${c.lastName[0]}
          </div>
          <span style="color:var(--accent2);font-weight:600">
            ${c.firstName} ${c.lastName}
          </span>
        </div>
      </td>
      <td style="font-family:var(--font-mono);font-size:0.8rem">
        ${c.contact1}
      </td>
      <td style="font-family:var(--font-mono);font-size:0.8rem">
        ${c.contact2 || '—'}
      </td>
      <td style="font-size:0.8rem;color:var(--muted2)">
        ${c.address}
      </td>
      <td>
        <div style="display:flex;gap:6px"
             onclick="event.stopPropagation()">
          <button class="action-btn"
                  onclick="showCustomerQRFromId(
                    '${c.id}','${c.firstName}',
                    '${c.lastName}','${c.contact1}')">
            QR
          </button>
          <button class="action-btn"
                  onclick="createOrderForCustomer(
                    '${c.id}',
                    '${c.firstName} ${c.lastName}')">
            New Order
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// QR button in the table (not from profile modal)
function showCustomerQRFromId(userId, firstName, lastName, contact1) {
  showAndOpenQRResult(userId, firstName, lastName, contact1);
}

// ── THERMAL SCANNER VALIDATION ───────────────────────────────
// The thermal scanner types the QR value + Enter into the input
// onkeydown fires on Enter — we then validate that customer

async function handleValidationScan(event) {
  // Only process when Enter is pressed (scanner auto-presses Enter)
  if (event.key !== 'Enter') return;

  const input = document.getElementById('validation-scan-input');
  const qrValue = input.value.trim();
  input.value = '';

  if (!qrValue) return;

  try {
    // Look up this userId in Firebase
    const customer = await getCustomer(qrValue);

    if (!customer) {
      showToast('⚠️', 'QR code not found. Not a registered customer.');
      return;
    }

    if (customer.status === 'approved') {
      showToast('ℹ️',
        `${customer.firstName} ${customer.lastName} ` +
        `is already validated.`);
      return;
    }

    // Validate the customer
    await validateCustomer(qrValue);

  } catch (err) {
    showToast('⚠️', 'Error reading QR. Try again.');
    console.error(err);
  }
}

// ── VALIDATE CUSTOMER ────────────────────────────────────────

async function validateCustomer(userId) {
  try {
    await approveCustomer(userId);
    await loadPendingCustomers();

    const customer = await getCustomer(userId);
    if (!customer) return;

      // Warn (don't block) if this contact matches another existing profile
      const duplicate = await findCustomerByContact(customer.contact1);
      if (duplicate && duplicate.id !== userId) {
          showToast('⚠️',
              `Note: this contact also exists under ${duplicate.firstName} ${duplicate.lastName}.`);
      }

    showToast('✅',
      `${customer.firstName} ${customer.lastName} validated!`);

    // Close pending modal and show QR result
    closePendingModal();
    showAndOpenQRResult(
      userId,
      customer.firstName,
      customer.lastName,
      customer.contact1
    );

    await loadApprovedCustomers();

  } catch (err) {
    showToast('⚠️', 'Error validating customer.');
    console.error(err);
  }
}

// ── SHOW QR + PRINT ──────────────────────────────────────────


function printQR() {
  // QR is now inside the QR Result Modal (#qr-result-code)
  // instead of the old inline #profile-qr-code on the page
  const qrImg = document.querySelector('#qr-result-code img');
  const nameEl = document.getElementById('qr-result-name');

  if (!qrImg) {
    showToast('⚠️', 'No QR to print. Open a customer QR first.');
    return;
  }

  const printArea = document.getElementById('print-qr-area');
  const printQRCode = document.getElementById('print-qr-code');
  const printName = document.getElementById('print-name');
  const printContact = document.getElementById('print-contact');

  const parts = (nameEl.textContent || '').split(' · ');
  printName.textContent = parts[0] || '';
  printContact.textContent = parts[1] || '';
  printQRCode.innerHTML =
    `<img src="${qrImg.src}" style="width:220px;height:220px">`;

  window.print();
}

// ── STAFF REGISTERS A WALK-IN CUSTOMER ──────────────────────
// Status is set to 'approved' immediately since staff registers in person
// Validates contact number format and checks for duplicates before saving

async function registerCustomer() {
    clearRegisterErrors();

    const firstName = document.getElementById('cust-firstname').value.trim();
    const lastName  = document.getElementById('cust-lastname').value.trim();
    const contact1  = document.getElementById('cust-contact1').value.trim();
    const contact2  = document.getElementById('cust-contact2').value.trim();
    const address   = document.getElementById('cust-address').value.trim();
    const fb        = document.getElementById('cust-fb').value.trim();

    let hasError = false;

    if (!firstName) { showFieldError('firstname', 'First name is required.'); hasError = true; }
    if (!lastName)  { showFieldError('lastname',  'Last name is required.');  hasError = true; }
    if (!address)   { showFieldError('address',   'Address is required.');    hasError = true; }

    if (!contact1) {
        showFieldError('contact1', 'Contact number is required.');
        hasError = true;
    } else if (!isValidPHContact(contact1)) {
        showFieldError('contact1', 'Must be 11 digits starting with 09 (e.g. 09171234567).');
        hasError = true;
    }

    if (contact2) {
        if (!isValidPHContact(contact2)) {
            showFieldError('contact2', 'Must be 11 digits starting with 09.');
            hasError = true;
        } else if (contact2 === contact1) {
            showFieldError('contact2', 'Cannot be the same as Contact 1.');
            hasError = true;
        }
    }

    if (hasError) {
        showToast('⚠️', 'Please fix the highlighted fields.');
        return;
    }

    try {
        const existing = await findCustomerByContact(contact1);
        if (existing) {
            showFieldError('contact1',
                `Already registered to ${existing.firstName} ${existing.lastName}.`);
            showToast('⚠️', 'This contact number is already registered.');
            return;
        }

        const userId = await saveCustomer({
            firstName, lastName, contact1, contact2,
            address, fbAccount: fb,
            status: 'approved',
        });

        closeRegisterModal();
        showAndOpenQRResult(userId, firstName, lastName, contact1);

        clearRegisterErrors();
        ['cust-firstname','cust-lastname','cust-contact1','cust-contact2',
            'cust-address','cust-fb'].forEach(id => {
            document.getElementById(id).value = '';
        });

        showToast('✅', `${firstName} registered and approved.`);
        await loadApprovedCustomers();

    } catch (err) {
        showToast('⚠️', 'Error saving customer.');
        console.error(err);
    }
}

// ── RECEIPT ──────────────────────────────────────────────────

// Holds the current receipt data so printReceipt() can access it
let currentReceipt = null;

/**
 * Shows the receipt modal after an order is created.
 * Called by submitOrder() with the full order object.
 *
 * @param {object} order  — the full order object returned from Firebase
 * @param {object} customer — the selectedCustomer object
 */
function showReceiptModal(order, customer) {
  currentReceipt = { order, customer };

  // ── Fill text fields ──────────────────────────────────────

  document.getElementById('r-txn-code').textContent =
    order.transactionCode || '—';

  document.getElementById('r-date').textContent =
    order.dateIn || new Date().toLocaleDateString('en-PH');

  document.getElementById('r-time').textContent =
    order.timeIn || new Date().toLocaleTimeString('en-PH', {
      hour: '2-digit', minute: '2-digit'
    });

  document.getElementById('r-customer').textContent =
    order.customerName || '—';

  document.getElementById('r-contact').textContent =
    customer.contact1 +
    (customer.contact2 ? ' / ' + customer.contact2 : '');

  document.getElementById('r-service').textContent =
    order.service || '—';

  document.getElementById('r-weight').textContent =
    (order.kg || 0).toFixed(2) + ' kg';

  document.getElementById('r-amount').textContent =
    '₱' + Math.round(order.amount || 0);

  document.getElementById('r-finish-time').textContent =
    order.estimatedFinishTime || '—';

  document.getElementById('r-finish-date').textContent =
    order.estimatedFinishDate || '—';

  document.getElementById('r-duration').textContent =
    order.estimatedHours
      ? order.estimatedHours + ' hours'
      : '—';

  // ── Generate Order QR (specific order) ───────────────────

    // ── Generate Job Order QR ─────────────────────────────────
// Larger now that it's the only QR on the receipt —
// full width means it can afford more modules-per-inch clarity

    const orderQRBox = document.getElementById('r-order-qr');
    orderQRBox.innerHTML = '';

    new QRCode(orderQRBox, {
        text:         order.orderId,
        width:        160,
        height:       160,
        colorDark:    '#000000',
        colorLight:   '#ffffff',
        correctLevel: QRCode.CorrectLevel.H,
    });

  // ── Open the modal ────────────────────────────────────────
  document.getElementById('receipt-modal').classList.add('open');
}

function closeReceiptModal() {
  document.getElementById('receipt-modal').classList.remove('open');
  currentReceipt = null;
}

/**
 * Prints the receipt by copying the receipt card
 * into the print-only area and triggering window.print().
 */
function printReceipt() {
  const receiptCard = document.getElementById('receipt-card');
  const printArea = document.getElementById('print-receipt-area');

  // Copy the receipt card HTML into the print area
  printArea.innerHTML = receiptCard.outerHTML;

  // Small delay so QR images finish rendering before print dialog opens
  setTimeout(() => {
    window.print();
  }, 300);
}


// ── CREATE ORDER FROM PROFILE SCAN MODAL ─────────────────────
// Called by the "+ New Order for this Customer" button
// inside the Customer Profile Scan Modal

function createOrderFromProfileScan() {
  const customer = scannedProfileCustomer;
  if (!customer) return;

  // Close the profile modal first
  closeProfileScanModal();

  // Open New Order modal pre-filled with this customer
  openModal();

  // Pre-select the customer in the chip
  selectedCustomer = {
    id: customer.id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    contact1: customer.contact1 || '',
    contact2: customer.contact2 || '',
  };

  document.getElementById('customer-clear').style.display = 'block';
  document.getElementById('selected-avatar').textContent =
    customer.firstName[0] + (customer.lastName[0] || '');
  document.getElementById('selected-name').textContent =
    `${customer.firstName} ${customer.lastName}`;
  document.getElementById('selected-contact').textContent =
    customer.contact1 +
    (customer.contact2 ? ' · ' + customer.contact2 : '');
  document.getElementById('selected-customer').style.display = 'flex';

  updateCost();
}

// ── REGISTER MODAL ───────────────────────────────────────────

function openRegisterModal() {
  // Clear the form first
  ['cust-firstname', 'cust-lastname', 'cust-contact1',
    'cust-contact2', 'cust-address', 'cust-fb']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  document.getElementById('register-modal').classList.add('open');
}

function closeRegisterModal() {
  document.getElementById('register-modal').classList.remove('open');
}

// ── PENDING MODAL ────────────────────────────────────────────

function openPendingModal() {
  loadPendingCustomers();
  document.getElementById('pending-modal').classList.add('open');
  // Auto-focus the scan input
  setTimeout(() => {
    const input = document.getElementById('validation-scan-input');
    if (input) input.focus();
  }, 200);
}

function closePendingModal() {
  document.getElementById('pending-modal').classList.remove('open');
}

// ── CUSTOMER PROFILE MODAL ───────────────────────────────────
// Opened by clicking a customer row in the approved table

// Holds the customer currently shown in the profile modal
let viewedCustomer = null;

async function openCustomerProfileModal(userId) {
  try {
    const customer = await getCustomer(userId);
    if (!customer) return;

    viewedCustomer = { id: userId, ...customer };

    // Fill info card
    document.getElementById('cp-avatar').textContent =
      customer.firstName[0] + customer.lastName[0];
    document.getElementById('cp-name').textContent =
      `${customer.firstName} ${customer.lastName}`;
    document.getElementById('cp-contact').textContent =
      customer.contact1 +
      (customer.contact2 ? ' · ' + customer.contact2 : '');
    document.getElementById('cp-address').textContent =
      customer.address || '—';
    document.getElementById('cp-fb').textContent =
      customer.fbAccount || '—';

    // Load this customer's orders
    const orders = await getOrdersByUser(userId);

    const readyOrders = orders.filter(o => o.status === 'ready');
    const activeOrders = orders.filter(
      o => o.status === 'pending' || o.status === 'washing'
    );
    const balance = orders
      .filter(o => o.status !== 'picked' && o.status !== 'cancelled')
      .reduce((sum, o) => sum + (o.amount || 0), 0);

    document.getElementById('cp-ready-count').textContent =
      readyOrders.length;
    document.getElementById('cp-active-count').textContent =
      activeOrders.length;
    document.getElementById('cp-balance').textContent =
      '₱' + Math.round(balance);

    // Fill orders table
    const tbody = document.getElementById('cp-orders-body');

    if (orders.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6"
              style="text-align:center;
                     color:var(--muted2);padding:20px">
            No orders yet.
          </td>
        </tr>`;
    } else {
      tbody.innerHTML = orders.map(o => `
        <tr>
          <td>
            <span class="order-id">
              ${o.transactionCode || o.id.slice(0, 8)}
            </span>
          </td>
          <td style="font-size:0.8rem;color:var(--muted2)">
            ${o.service}
          </td>
          <td>
            <span class="weight-cell">
              ${(o.kg || 0).toFixed(1)} kg
            </span>
          </td>
          <td>
            <span class="cost-cell">
              ₱${Math.round(o.amount || 0)}
            </span>
          </td>
          <td>${statusBadge(o.status)}</td>
          <td>
            ${o.status === 'ready' ? `
              <button
                class="btn btn-primary"
                style="padding:3px 10px;font-size:0.72rem"
                onclick="cpMarkPickedUp('${o.id}')">
                📦 Picked Up
              </button>
            ` : `
              <span style="color:var(--muted);font-size:0.75rem">
                —
              </span>
            `}
          </td>
        </tr>
      `).join('');
    }

    document.getElementById('customer-profile-modal')
      .classList.add('open');

  } catch (err) {
    showToast('⚠️', 'Error loading customer profile.');
    console.error(err);
  }
}

function closeCustomerProfileModal() {
  document.getElementById('customer-profile-modal')
    .classList.remove('open');
  viewedCustomer = null;
}

// Mark order as picked up from inside the profile modal
async function cpMarkPickedUp(orderId) {
  try {
    await updateOrderStatus(orderId, 'picked');
    showToast('✅', 'Order marked as Picked Up.');

    // Refresh the modal
    if (viewedCustomer) {
      await openCustomerProfileModal(viewedCustomer.id);
    }
    loadOrders();
  } catch (err) {
    showToast('⚠️', 'Error updating order.');
    console.error(err);
  }
}

// Create new order directly from profile modal
function createOrderFromProfile() {
  const c = viewedCustomer;
  if (!c) return;
  closeCustomerProfileModal();
  openModal();

  selectedCustomer = {
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    contact1: c.contact1 || '',
    contact2: c.contact2 || '',
  };

  document.getElementById('customer-clear').style.display = 'block';
  document.getElementById('selected-avatar').textContent =
    c.firstName[0] + (c.lastName[0] || '');
  document.getElementById('selected-name').textContent =
    `${c.firstName} ${c.lastName}`;
  document.getElementById('selected-contact').textContent =
    c.contact1 + (c.contact2 ? ' · ' + c.contact2 : '');
  document.getElementById('selected-customer').style.display = 'flex';

  updateCost();
}

// Show and print QR from profile modal
function showCustomerQRFromProfile() {
  const c = viewedCustomer;
  if (!c) return;
  closeCustomerProfileModal();
  showAndOpenQRResult(c.id, c.firstName, c.lastName, c.contact1);
}

// ── QR RESULT MODAL ──────────────────────────────────────────

function showAndOpenQRResult(userId, firstName, lastName, contact1) {
  const qrDiv = document.getElementById('qr-result-code');
  const nameEl = document.getElementById('qr-result-name');

  qrDiv.innerHTML = '';

  new QRCode(qrDiv, {
    text: userId,
    width: 180,
    height: 180,
    colorDark: '#000000',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.H,
  });

  nameEl.textContent = `${firstName} ${lastName} · ${contact1}`;
  document.getElementById('qr-result-modal').classList.add('open');
}

function closeQRResultModal() {
  document.getElementById('qr-result-modal').classList.remove('open');
}

// ── CUSTOMER TABLE SEARCH ────────────────────────────────────

function filterCustomerTable(q) {
  const rows = document.querySelectorAll('#customers-body tr');
  rows.forEach(r => {
    r.style.display =
      r.textContent.toLowerCase().includes(q.toLowerCase())
        ? '' : 'none';
  });
}

// Called when admin scans a profile QR and customer has no ready orders
// Skips the profile modal and goes straight to New Order
// Flip this to true for fully automatic submission the instant a
// customer QR is scanned — no Enter, no click, nothing. Understand
// the tradeoff: there is no human checkpoint left. A mis-scan or an
// unsettled scale reading becomes uncatchable before money changes
// hands. Off by default for that reason.
const AUTO_SUBMIT_ON_SCAN = true;

function openNewOrderFromScan(userId, customer) {
    openModal({ id: userId, ...customer });
    showToast('✅', `Customer loaded: ${customer.firstName} ${customer.lastName}`);

    if (AUTO_SUBMIT_ON_SCAN) {
        // Small delay lets the live weight reading settle before
        // it gets locked into the order
        setTimeout(() => {
            if (selectedCustomer && !isSubmittingOrder) submitOrder();
        }, 600);
    }
}

// ── PICKUP MODAL ─────────────────────────────────────────────

function closePickupModal() {
  document.getElementById('pickup-modal').classList.remove('open');
}

// Opens when customer shows their profile QR and has ready orders
function openPickupModal(userId, customer, readyOrders) {

  // Fill customer strip
  document.getElementById('pu-avatar').textContent =
    customer.firstName[0] + customer.lastName[0];
  document.getElementById('pu-name').textContent =
    `${customer.firstName} ${customer.lastName}`;
  document.getElementById('pu-contact').textContent =
    customer.contact1 +
    (customer.contact2 ? ' · ' + customer.contact2 : '');

  // Build ready orders list
  const listDiv = document.getElementById('pu-orders-list');

  listDiv.innerHTML = readyOrders.map(o => `
    <div class="pu-order-item" id="pu-item-${o.id}">

      <div class="pu-order-details">
        <div class="pu-order-code">
          ${o.transactionCode || o.id.slice(0, 12)}
        </div>
        <div class="pu-order-meta">
          ${o.service} · ${(o.kg || 0).toFixed(1)} kg ·
          <span style="color:var(--accent)">
            ₱${Math.round(o.amount || 0)}
          </span>
        </div>
        <div class="pu-order-time">
          Dropped off: ${o.dateIn || '—'} ${o.timeIn || ''}
        </div>
      </div>

      <button
        class="btn btn-primary pu-pickup-btn"
        id="pu-btn-${o.id}"
        onclick="markPickedUpFromModal('${o.id}', '${userId}', '${customer.firstName}', '${customer.lastName}')"
      >
        📦 Picked Up
      </button>

    </div>
  `).join('');

  document.getElementById('pickup-modal').classList.add('open');

  showToast('✅',
    `${customer.firstName} has ${readyOrders.length} order` +
    `${readyOrders.length > 1 ? 's' : ''} ready for pickup.`);
}

// Marks one order as picked up from the pickup modal
async function markPickedUpFromModal(orderId, userId, firstName, lastName) {
  // Disable the button immediately to prevent double-tap
  const btn = document.getElementById(`pu-btn-${orderId}`);
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Updating...';
  }

  try {
    await updateOrderStatus(orderId, 'picked');

    // Show the item as done instead of removing it abruptly
    const item = document.getElementById(`pu-item-${orderId}`);
    if (item) {
      item.style.opacity = '0.5';
      item.style.pointerEvents = 'none';
      if (btn) {
        btn.textContent = '✅ Done';
        btn.style.background = 'var(--surface2)';
        btn.style.color = 'var(--accent)';
        btn.style.border = '1px solid var(--accent)';
      }
    }

    showToast('✅', `Order marked as Picked Up.`);
    loadOrders();

    // Check if all orders in this modal are now done
    // If yes, close and offer to create a new order
    const allBtns = document.querySelectorAll('.pu-pickup-btn');
    const allDone = [...allBtns].every(b => b.disabled);

    if (allDone) {
      setTimeout(() => {
        closePickupModal();
        showToast('🎉',
          `All orders picked up for ${firstName}.`);
      }, 1200);
    }

  } catch (err) {
    showToast('⚠️', 'Error updating order.');
    console.error(err);
    // Re-enable button if it failed
    if (btn) {
      btn.disabled = false;
      btn.textContent = '📦 Picked Up';
    }
  }
}

// Computes On-going / Ready / Picked Up / All counts for the legend widget
function updateStatusOverview(orders) {
    const ongoing = orders.filter(o => o.status === 'pending' || o.status === 'washing').length;
    const ready   = orders.filter(o => o.status === 'ready').length;
    const picked  = orders.filter(o => o.status === 'picked').length;
    const all     = orders.length;

    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    set('count-ongoing', ongoing);
    set('count-ready',   ready);
    set('count-picked',  picked);
    set('count-all',     all);
}

// ── REPORTS ──────────────────────────────────────────────────

let currentReportPeriod = 'daily';

// Computes start/end Date objects for the selected period type
function getDateRangeForPeriod(period) {
    const now = new Date();
    let start, end;

    if (period === 'daily') {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    } else if (period === 'weekly') {
        const day = now.getDay();
        const diffToMonday = day === 0 ? -6 : 1 - day;
        start = new Date(now);
        start.setDate(now.getDate() + diffToMonday);
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);

    } else if (period === 'monthly') {
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    } else if (period === 'yearly') {
        start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
        end   = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

    } else if (period === 'custom') {
        const startInput = document.getElementById('report-start-date').value;
        const endInput   = document.getElementById('report-end-date').value;
        start = startInput ? new Date(startInput + 'T00:00:00') : new Date(0);
        end   = endInput   ? new Date(endInput   + 'T23:59:59') : new Date();
    }

    return { start, end };
}

// Builds the readable label shown above the KPI cards
function getReportPeriodLabel(period, start, end) {
    const fmt = d => d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });

    if (period === 'daily')   return `Today · ${fmt(start)}`;
    if (period === 'weekly')  return `This Week · ${fmt(start)} – ${fmt(end)}`;
    if (period === 'monthly') return `This Month · ${start.toLocaleDateString('en-PH', { year: 'numeric', month: 'long' })}`;
    if (period === 'yearly')  return `This Year · ${start.getFullYear()}`;
    if (period === 'custom')  return `Custom Range · ${fmt(start)} – ${fmt(end)}`;
    return '';
}

// Switches the active tab and reloads report data
function setReportPeriod(period, el) {
    currentReportPeriod = period;

    document.querySelectorAll('#page-reports .tab-pill').forEach(p => p.classList.remove('active'));
    if (el) el.classList.add('active');

    document.getElementById('report-custom-range').style.display =
        period === 'custom' ? 'block' : 'none';

    if (period !== 'custom') loadReport();
    // For 'custom', wait for the admin to pick dates and click Apply
}

// Fetches all orders, filters by active period, renders everything
async function loadReport() {
    const { start, end } = getDateRangeForPeriod(currentReportPeriod);

    const allOrders = await getAllOrders();

    const filtered = allOrders.filter(o => {
        if (!o.createdAt) return false;
        const created = new Date(o.createdAt);
        return created >= start && created <= end;
    });

    document.getElementById('report-period-label').textContent =
        getReportPeriodLabel(currentReportPeriod, start, end);

    renderReportSummary(filtered);
    renderReportChart(filtered, currentReportPeriod, start, end);
}

// Fills the 4 KPI cards
function renderReportSummary(orders) {
    const totalOrders  = orders.length;
    const totalWeight  = orders.reduce((sum, o) => sum + (o.kg || 0), 0);
    const totalRevenue = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
    const avgOrder     = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    document.getElementById('report-total-orders').textContent  = totalOrders;
    document.getElementById('report-total-weight').textContent  = totalWeight.toFixed(1);
    document.getElementById('report-total-revenue').textContent = '₱' + Math.round(totalRevenue).toLocaleString();
    document.getElementById('report-avg-order').textContent     = '₱' + Math.round(avgOrder).toLocaleString();
}

// Builds the revenue trend bar chart — separate from the dashboard's
// order-volume chart since this one shows peso amounts, not counts
function renderReportRevenueChart(data, labels) {
    const el = document.getElementById('report-chart-area');
    if (!el) return;

    const max = Math.max(...data, 1);

    el.innerHTML = data.map((v, i) => `
    <div class="bar-wrap">
      <div class="bar-tooltip">₱${Math.round(v).toLocaleString()}</div>
      <div class="bar" style="height:${Math.max(4, (v / max) * 100)}%;background:var(--accent)"></div>
      <div class="bar-label">${labels[i]}</div>
    </div>
  `).join('');
}

// Groups orders correctly depending on the period, then draws the chart
function renderReportChart(orders, period, start, end) {
    const subtitle = document.getElementById('report-chart-subtitle');
    let labels = [];
    let data   = [];

    if (period === 'daily') {
        subtitle.textContent = 'Revenue per hour today';
        const hours = Array.from({ length: 24 }, (_, i) => i);
        data = hours.map(hour =>
            orders.filter(o => new Date(o.createdAt).getHours() === hour)
                .reduce((sum, o) => sum + (o.amount || 0), 0)
        );
        labels = hours.map(h => h === 0 ? '12A' : h < 12 ? h + 'A' : h === 12 ? '12P' : (h - 12) + 'P');

    } else if (period === 'weekly') {
        subtitle.textContent = 'Revenue per day this week';
        labels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
        data = labels.map((_, i) => {
            const dayStart = new Date(start); dayStart.setDate(start.getDate() + i);
            const dayEnd   = new Date(dayStart); dayEnd.setHours(23, 59, 59, 999);
            return orders.filter(o => {
                const c = new Date(o.createdAt);
                return c >= dayStart && c <= dayEnd;
            }).reduce((sum, o) => sum + (o.amount || 0), 0);
        });

    } else if (period === 'monthly') {
        subtitle.textContent = 'Revenue per day this month';
        const daysInMonth = end.getDate();
        labels = Array.from({ length: daysInMonth }, (_, i) => i + 1);
        data = labels.map(day =>
            orders.filter(o => new Date(o.createdAt).getDate() === day)
                .reduce((sum, o) => sum + (o.amount || 0), 0)
        );

    } else if (period === 'yearly') {
        subtitle.textContent = 'Revenue per month this year';
        labels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        data = labels.map((_, i) =>
            orders.filter(o => new Date(o.createdAt).getMonth() === i)
                .reduce((sum, o) => sum + (o.amount || 0), 0)
        );

    } else {
        subtitle.textContent = 'Revenue per day in selected range';
        const days = [];
        let cursor = new Date(start);
        while (cursor <= end) {
            days.push(new Date(cursor));
            cursor.setDate(cursor.getDate() + 1);
        }
        const showEvery = days.length > 20 ? Math.ceil(days.length / 15) : 1;
        labels = days.map((d, i) =>
            i % showEvery === 0 ? d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : ''
        );
        data = days.map(d => {
            const dayStart = new Date(d); dayStart.setHours(0, 0, 0, 0);
            const dayEnd   = new Date(d); dayEnd.setHours(23, 59, 59, 999);
            return orders.filter(o => {
                const c = new Date(o.createdAt);
                return c >= dayStart && c <= dayEnd;
            }).reduce((sum, o) => sum + (o.amount || 0), 0);
        });
    }

    renderReportRevenueChart(data, labels);
}


// Builds a printable version of the current report and opens print dialog
function printReport() {
    const periodLabel  = document.getElementById('report-period-label').textContent;
    const totalOrders  = document.getElementById('report-total-orders').textContent;
    const totalWeight  = document.getElementById('report-total-weight').textContent;
    const totalRevenue = document.getElementById('report-total-revenue').textContent;
    const avgOrder     = document.getElementById('report-avg-order').textContent;

    const printArea = document.getElementById('print-report-area');

    printArea.innerHTML = `
    <div style="text-align:center;margin-bottom:24px">
      <div style="font-size:1.6rem;font-weight:800">🧺 LaundryMatic</div>
      <div style="font-size:0.85rem;color:#555">Smart Weighing & Recording System</div>
      <div style="font-size:0.8rem;color:#777">Calinog, Iloilo</div>
    </div>
    <div style="font-size:1.1rem;font-weight:700;margin-bottom:16px">Sales Report — ${periodLabel}</div>
    <table style="margin-bottom:24px">
      <tr><td style="font-weight:600">Total Job Orders</td><td>${totalOrders}</td></tr>
      <tr><td style="font-weight:600">Total Weight</td><td>${totalWeight} kg</td></tr>
      <tr><td style="font-weight:600">Total Revenue</td><td>${totalRevenue}</td></tr>
      <tr><td style="font-weight:600">Average per Order</td><td>${avgOrder}</td></tr>
    </table>
    <div style="margin-top:24px;font-size:0.75rem;color:#888;text-align:center">
      Generated on ${new Date().toLocaleString('en-PH')}
    </div>
  `;

    setTimeout(() => window.print(), 200);
}

//Step 31: Initialisation — Tie Everything Together
window.addEventListener('DOMContentLoaded', async () => {

  // Auth guard — same as before
  const username = localStorage.getItem('lm_current_user');
  if (!username) {
    window.location.href = 'index.html';
    return;
  }

  // Fill sidebar name — same as before
  const users = JSON.parse(localStorage.getItem('lm_users') || '[]');
  const user = users.find(u => u.username === username);
  if (user) {
    const nameEl = document.getElementById('sidebar-name');
    const avatarEl = document.getElementById('sidebar-avatar');
    if (nameEl) nameEl.textContent = user.firstName + ' ' + user.lastName;
    if (avatarEl) avatarEl.textContent = user.firstName[0] + user.lastName[0];
  }

  // Load data from Firebase instead of hardcoded arrays
  await loadOrders();
  await loadSettingsIntoForm();
  await loadPendingCustomers();
  renderWeightHistory();
  renderReadings();

  startLiveWeight();

  // Listen for realtime order updates
  // This updates your table automatically when any order changes
    listenToOrders(orders => {
        allOrdersCache = orders;

        const mapped = orders.map(o => ({
            id:       o.transactionCode,
            customer: o.customerName,
            weight:   o.kg,
            service:  o.service,
            status:   o.status,
            time:     o.timeIn,
            orderId:  o.id,
        }));

        renderOrders('orders-body',      mapped.slice(0, 10));
        renderOrders('orders-body-full', mapped);

        updateDashboardKPIs(orders);
        updateStatusOverview(orders);
        renderTopCustomers(orders);
        renderRecords(orders);
        renderDashboardChart(currentChartView);
    });

    // Live notifications feed — attached once, here, alongside the
    // orders listener. Fires immediately with current data on
    // attach, then again on every future change — same pattern as
    // listenToOrders, so there's no separate "initial load" call
    // needed and no risk of a duplicate listener being attached.
    listenToAllNotifications(notifications => {
        allNotificationsCache = notifications;
        renderNotifications(notifications);

        const unreadCount = notifications.filter(n => !n.read).length;
        const badge = document.getElementById('notif-badge');
        if (badge) badge.textContent = unreadCount;
    });

  // Modal events — same as before
  document.getElementById('form-weight-input').addEventListener('input', updateCost);
  document.getElementById('form-service').addEventListener('change', updateCost);
  document.getElementById('modal').addEventListener('click', function (e) {
    if (e.target === this) closeModal();
  });

  //close the customer dropdown when clicking anywhere outside it
  document.addEventListener('click', function (e) {
    const dropdown = document.getElementById('customer-dropdown');
    const searchInput = document.getElementById('customer-search');
    if (dropdown && !dropdown.contains(e.target) && e.target !== searchInput) {
      dropdown.style.display = "none";
    }
  });

    // ── GLOBAL AUTO-CAPTURE — Customer/Job Order Scanning ────────
// The admin can pick up the scanner and scan from ANY screen in
// the app, with zero clicks. The instant a keystroke arrives and
// nothing else is actively being typed into, we silently redirect
// it into the scan input. If the admin IS typing in any other
// field anywhere (a form, a search box, a modal) we back off
// completely and leave that field alone.
    document.addEventListener('keydown', function (e) {
        const scanInput = document.getElementById('scan-input');
        if (!scanInput) return;

        const active = document.activeElement;
        const tag    = active ? active.tagName : '';
        const isEditableFocused = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

        if (isEditableFocused) return;

        if (e.key.length === 1) {
            scanInput.focus();
        }
    });

    // ── AUTO-CAPTURE SCANNER INPUT — Pending Validation Modal ────
// Removes the requirement to manually click into the scan field.
// The instant a keystroke arrives while this modal is open, we
// redirect focus into the scan input first — so it doesn't matter
// what (or nothing) had focus when the admin started scanning.
    document.addEventListener('keydown', function (e) {
        const modal = document.getElementById('pending-modal');
        if (!modal || !modal.classList.contains('open')) return;

        const input = document.getElementById('validation-scan-input');
        if (!input || document.activeElement === input) return;

        // Only redirect on printable characters — leaves Tab, Escape,
        // and button-activation keys (Space/Enter) completely alone
        if (e.key.length === 1) {
            input.focus();
        }
    });

    // ── SCANNER-FRIENDLY WORKFLOW — Enter submits, Escape cancels ──
// While the New Job Order modal is open AND a customer is already
// selected, Enter submits immediately — no mouse required. The
// selectedCustomer check is a safety net: it stops a stray Enter
// from submitting a blank order if the modal was opened manually
// and no customer has been chosen yet.
    document.addEventListener('keydown', function (e) {
        const modal = document.getElementById('modal');
        if (!modal || !modal.classList.contains('open')) return;

        if (e.key === 'Enter' && selectedCustomer && !isSubmittingOrder) {
            e.preventDefault();
            submitOrder();
        }

        if (e.key === 'Escape') {
            closeModal();
        }
    });
});