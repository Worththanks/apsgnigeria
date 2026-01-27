// dashboard.js — CLEAN & SAFE (2026)

document.addEventListener('DOMContentLoaded', async () => {
  if (!window.supabaseClient) {
    console.error('Supabase client not loaded');
    window.location.href = 'login.html';
    return;
  }

  await checkAuth();
  attachLogoutHandlers();
  loadDashboard();
});

/* =========================
   AUTH CHECK
========================= */
async function checkAuth() {
  const { data, error } = await supabaseClient.auth.getSession();

  if (error || !data.session) {
    window.location.href = 'login.html';
  }
}

/* =========================
   LOGOUT
========================= */
async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = 'login.html';
}

function attachLogoutHandlers() {
  document
    .querySelectorAll('.mobile-logout-btn, .btn-logout')
    .forEach(btn => btn.addEventListener('click', logout));
}

/* =========================
   DASHBOARD DATA
========================= */
async function loadDashboard() {
  const { data: members, error } = await supabaseClient
    .from('members')
    .select('*');

  if (error) {
    console.error('Error loading data:', error);
    showNoData('Error loading data. Check console.');
    return;
  }

  if (!members || members.length === 0) {
    showNoData('No data available.');
    return;
  }

  updateStats(members);
  renderStateDonut(members);
  renderLast7Days(members);
}

/* =========================
   HELPERS
========================= */
function showNoData(message) {
  const el = document.getElementById('noDataMessage');
  if (!el) return;
  el.textContent = message;
  el.style.display = 'block';
}

function updateStats(members) {
  const total = members.length;
  const today = new Date().toISOString().slice(0, 10);
  const todaysCount = members.filter(
    m => m.created_at?.slice(0, 10) === today
  ).length;

  const stats = document.querySelectorAll('.stat-value');
  if (stats[0]) stats[0].textContent = total.toLocaleString();
  if (stats[1]) stats[1].textContent = todaysCount;
}

function renderStateDonut(members) {
  const total = members.length;
  const stateCounts = {};

  members.forEach(m => {
    if (!m.state) return;
    stateCounts[m.state] = (stateCounts[m.state] || 0) + 1;
  });

  const topStates = Object.entries(stateCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const others =
    total - topStates.reduce((sum, [, count]) => sum + count, 0);

  if (others > 0) topStates.push(['Others', others]);

  const segments = document.querySelectorAll('.donut-segment');
  const colors = [
    'var(--accent)',
    'var(--success)',
    'var(--warning)',
    '#A855F7',
    '#EC4899',
    '#94A3B8'
  ];

  let offset = 0;
  segments.forEach(seg => {
    seg.style.strokeDasharray = '0 100';
    seg.style.strokeDashoffset = '0';
  });

  topStates.forEach(([_, count], i) => {
    if (!segments[i]) return;
    const percent = (count / total) * 100;
    segments[i].style.strokeDasharray = `${percent} 100`;
    segments[i].style.strokeDashoffset = -offset;
    segments[i].style.stroke = colors[i % colors.length];
    offset += percent;
  });

  const value = document.querySelector('.donut-value');
  if (value) value.textContent = total;
}

function renderLast7Days(members) {
  const days = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  const counts = days.map(date =>
    members.filter(m => m.created_at?.slice(0, 10) === date).length
  );

  const bars = document.querySelectorAll('.bar');
  bars.forEach((bar, i) => {
    const count = counts[i] || 0;
    bar.style.height = Math.max(20, count * 15) + 'px';
  });
}
