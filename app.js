// ─── Firebase ─────────────────────────────────────────────
firebase.initializeApp({
  apiKey: "AIzaSyBSzuYeD6YxVuGZT4eJc3C6V5gfQji0_Ho",
  databaseURL: "https://watersaving-341c6-default-rtdb.firebaseio.com",
  projectId: "watersaving-341c6",
  appId: "1:46834378695:web:91dc3086d439b11b9b9be2"
});
const db = firebase.database();

function getUserId() {
  let uid = localStorage.getItem('bangul_uid');
  if (!uid) {
    uid = 'u' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    localStorage.setItem('bangul_uid', uid);
  }
  return uid;
}

const recordsRef = db.ref(`users/${getUserId()}/records`);

function persistRecords(records) {
  recordsRef.set(records.length ? records : null);
}

// ─── State ───────────────────────────────────────────────
const state = {
  currentPage: 'home',
  numInput: '',
  selectedCat: '세수',
  sessionHistory: [],
  chartsInit: false,
};

// Firebase 실시간 동기화
const todayDate = new Date().toISOString().slice(0, 10);

recordsRef.on('value', snapshot => {
  const val = snapshot.val();
  const all = val ? (Array.isArray(val) ? val : Object.values(val)) : [];
  state.sessionHistory = all.filter(r => !r.date || r.date === todayDate);
  DATA.todayUsage = state.sessionHistory.reduce((sum, r) => sum + r.amount, 0);
  DATA.mayTotal   = DATA.may.slice(0, 4).reduce((s, r) => s + r.total, 0) + DATA.todayUsage;
  renderHistory();
  updateHome();
  if (state.chartsInit) updateStats();
});

// ─── Utility ─────────────────────────────────────────────
const $ = id => document.getElementById(id);
const fmt = n => n.toLocaleString('ko-KR');

function showToast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

// ─── Navigation ──────────────────────────────────────────
function goPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.page === name);
  });
  $(`page-${name}`).classList.add('active');
  state.currentPage = name;
  if (name === 'stats') {
    if (!state.chartsInit) initCharts();
    else updateStats();
  }
}

// ─── Home Page ───────────────────────────────────────────
function updateHome() {
  const usage = DATA.mayTotal; // current month so far
  const maxUsage = DATA.postech.dailyAvg * 31;
  const pct = Math.min(usage / maxUsage, 1);

  // Character
  const isSaving = pct < 0.6;
  $('char-status').textContent = isSaving ? '절약 중 🌿' : pct < 0.8 ? '보통 😐' : '낭비 주의 ⚠️';
  $('char-status').style.background = isSaving ? '#e8f5e9' : pct < 0.8 ? '#fff3e0' : '#ffebee';
  $('char-status').style.color = isSaving ? '#2e7d32' : pct < 0.8 ? '#e65100' : '#c62828';

  // Mouth expression
  const mouth = $('mouth');
  if (isSaving) {
    mouth.setAttribute('d', 'M38 84 Q50 95 62 84'); // smile
  } else if (pct < 0.8) {
    mouth.setAttribute('d', 'M40 88 Q50 88 60 88'); // straight
  } else {
    mouth.setAttribute('d', 'M38 91 Q50 83 62 91'); // frown
  }

  // Today's message
  const saved = DATA.aprilTotal < DATA.posteachMonthlyAvg;
  const savedL = Math.max(0, DATA.posteachMonthlyAvg - DATA.aprilTotal);
  const messages = [
    `지난달 포스텍 평균보다 <strong>${fmt(savedL)}L</strong> 적게 쓰셨어요! 환경 보호의 리더입니다! 🌍`,
    `지난달 절약으로 <strong>₩${fmt(Math.round(savedL * DATA.rates.social))}</strong> 의 사회적 가치를 창출했어요!`,
    `이번 달도 꾸준히 절약 중이에요. 지금까지 <strong>${fmt(usage)}L</strong> 사용했어요.`,
  ];
  $('today-message').innerHTML = messages[Math.floor(Date.now() / 10000) % messages.length];
}

// ─── Record Page ─────────────────────────────────────────
function setupNumpad() {
  // Category buttons
  $('cat-row').addEventListener('click', e => {
    const btn = e.target.closest('.cat-btn');
    if (!btn) return;
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.selectedCat = btn.dataset.cat;
  });

  // Numpad
  $('numpad').addEventListener('click', e => {
    const btn = e.target.closest('.num-btn');
    if (!btn) return;
    const n = btn.dataset.n;

    if (n === 'del') {
      state.numInput = state.numInput.slice(0, -1);
    } else if (n === 'save') {
      saveRecord();
      return;
    } else {
      if (state.numInput.length >= 4) return;
      state.numInput += n;
    }
    updateNumpadDisplay();
  });
}

function updateNumpadDisplay() {
  const val = parseInt(state.numInput || '0', 10);
  $('numpad-display').innerHTML = `${fmt(val)} <span>L</span>`;
  $('ton-display').textContent  = `= ${(val / 1000).toFixed(3)} 톤 (m³)`;

  const water  = Math.round(val * DATA.rates.water);
  const social = Math.round(val * DATA.rates.social);
  const energy = Math.round(val * DATA.rates.energy);

  $('rt-water').textContent  = val ? `${fmt(water)}원` : '0원';
  $('rt-social').textContent = val ? `${fmt(social)}원` : '0원';
  $('rt-energy').textContent = val ? `${fmt(energy)}원` : '0원';

  // 이색 비교 (DATA.funComparisons 순환)
  if (val > 0) {
    const fc = DATA.funComparisons;
    const idx = val % fc.length;
    const item = fc[idx];
    const amount = (val * item.rate).toFixed(1);
    $('fun-comparison').innerHTML =
      `${item.label} <strong>${amount}${item.unit}</strong> 에 해당하는 사회적 비용이에요!`;
  } else {
    $('fun-comparison').textContent = '입력 후 이색 비교를 보여드려요 🎉';
  }
}

function saveRecord() {
  const val = parseInt(state.numInput || '0', 10);
  if (val <= 0) { showToast('사용량을 입력해주세요'); return; }

  const now = new Date();
  const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

  state.sessionHistory.unshift({ time, date: todayDate, cat: state.selectedCat, amount: val });
  DATA.mayTotal += val;
  DATA.todayUsage += val;
  persistRecords(state.sessionHistory);

  state.numInput = '';
  updateNumpadDisplay();
  renderHistory();
  updateHome();
  showToast(`✅ ${state.selectedCat} ${fmt(val)}L 기록 완료!`);
}

const catEmoji = { '세수': '🧖', '양치': '🪥', '샤워': '🚿', '기타': '📝' };

function renderHistory() {
  const list = $('history-list');
  if (!state.sessionHistory.length) {
    list.innerHTML = '<div style="text-align:center;color:#aac;padding:20px;font-size:0.85rem">아직 기록이 없어요</div>';
    return;
  }
  list.innerHTML = state.sessionHistory.map((r, i) => `
    <div class="history-item">
      <div class="history-time">${r.time}</div>
      <div class="history-cat-icon">${catEmoji[r.cat] || '📝'}</div>
      <div class="history-cat">${r.cat}</div>
      <div class="history-amount">${fmt(r.amount)} L</div>
      <button class="history-del" onclick="deleteRecord(${i})">✕</button>
    </div>
  `).join('');
}

function deleteRecord(i) {
  const rec = state.sessionHistory[i];
  DATA.mayTotal = Math.max(0, DATA.mayTotal - rec.amount);
  DATA.todayUsage = Math.max(0, DATA.todayUsage - rec.amount);
  state.sessionHistory.splice(i, 1);
  persistRecords(state.sessionHistory);
  renderHistory();
  updateHome();
  showToast('기록을 삭제했어요');
}

function renderLastMonthSummary() {
  const el = $('lastmonth-summary');
  const totalByCat = DATA.april.reduce((acc, r) => {
    acc.ws = (acc.ws || 0) + r.ws;
    acc.br = (acc.br || 0) + r.br;
    acc.sh = (acc.sh || 0) + r.sh;
    acc.ot = (acc.ot || 0) + r.ot;
    return acc;
  }, {});

  const days = DATA.april.length;
  const rows = [
    { cat: '세수', val: Math.round(totalByCat.ws / days) },
    { cat: '양치', val: Math.round(totalByCat.br / days) },
    { cat: '샤워', val: Math.round(totalByCat.sh / days) },
    { cat: '기타', val: Math.round(totalByCat.ot / days) },
  ];
  el.innerHTML = rows.map(r => `
    <div class="history-item">
      <div class="history-cat-icon">${catEmoji[r.cat]}</div>
      <div class="history-cat">${r.cat}</div>
      <div class="history-amount">${fmt(r.val)} L <span style="font-size:0.75rem;color:#aaa">/일</span></div>
    </div>
  `).join('') + `
    <div class="history-item" style="background:#e1f5fe">
      <div class="history-cat-icon">📊</div>
      <div class="history-cat" style="font-weight:700">4월 합계</div>
      <div class="history-amount">${fmt(DATA.aprilTotal)} L</div>
    </div>`;
}

// ─── Stats Page ──────────────────────────────────────────
function updateStats() {
  // Today vs daily average reward
  const todaySaved = Math.max(0, DATA.postech.dailyAvg - DATA.todayUsage);
  const todayOver  = Math.max(0, DATA.todayUsage - DATA.postech.dailyAvg);
  if (DATA.todayUsage === 0) {
    $('trc-saved-l').textContent   = '—';
    $('trc-saved-won').textContent = '—';
    $('trc-xp').textContent        = '—';
    $('trc-msg').textContent       = '오늘 사용 기록이 없어요';
    $('trc-msg').style.display     = 'block';
  } else if (todaySaved > 0) {
    $('trc-saved-l').textContent   = `${fmt(todaySaved)}L`;
    $('trc-saved-won').textContent = `${fmt(Math.round(todaySaved * DATA.rates.water))}원`;
    $('trc-xp').textContent        = `+${Math.round(todaySaved * 0.5)} XP`;
    $('trc-msg').textContent       = '';
    $('trc-msg').style.display     = 'none';
  } else {
    $('trc-saved-l').textContent   = '0L';
    $('trc-saved-won').textContent = '0원';
    $('trc-xp').textContent        = '+0 XP';
    $('trc-msg').textContent       = `평균보다 ${fmt(todayOver)}L 더 사용했어요 ⚠️`;
    $('trc-msg').style.display     = 'block';
  }

  const saved = Math.max(0, DATA.aprilSaved);
  const heroAmt = Math.round(saved * DATA.rates.water);
  $('hero-amount').textContent = `₩${fmt(heroAmt)}`;
  $('hero-sub').textContent = `${fmt(saved)}L (${(saved/1000).toFixed(1)}톤)를 절약하셨어요!`;

  // Grade
  const xp = DATA.user.xp;
  const grades = DATA.grades;
  let curGrade = grades[0], nextGrade = grades[1];
  for (let i = grades.length - 1; i >= 0; i--) {
    if (xp >= grades[i].minXp) { curGrade = grades[i]; nextGrade = grades[i+1]; break; }
  }
  const [badge] = curGrade.name.split(' ');
  $('grade-badge').textContent = badge;
  $('grade-name').textContent = curGrade.name;
  const nextXp = nextGrade ? nextGrade.minXp : xp;
  $('grade-xp').textContent = `XP ${fmt(xp)} / ${fmt(nextXp)}`;
  $('xp-cur').textContent = `${fmt(xp)} XP`;
  $('xp-next').textContent = nextGrade ? `다음 등급까지 ${fmt(nextXp - xp)} XP` : '최고 등급!';
  const xpPct = nextGrade ? Math.round(((xp - curGrade.minXp) / (nextXp - curGrade.minXp)) * 100) : 100;
  $('xp-fill').style.width = `${xpPct}%`;

  // Compare cards
  $('cmp-today').textContent     = `${fmt(DATA.todayUsage)}L`;
  $('cmp-yesterday').textContent = `${fmt(DATA.yesterdayUsage)}L`;
  $('cmp-postech').textContent   = `${fmt(DATA.postech.dailyAvg)}L`;

  // 일간 차트 데이터 갱신
  if (dailyChart) {
    dailyChart.data.datasets[0].data[0] = DATA.todayUsage;
    dailyChart.update();
  }

  // Incentive
  $('inc-saved-l').textContent    = `${fmt(saved)} L`;
  $('inc-water-save').textContent = `${fmt(Math.round(saved * DATA.rates.water))} 원`;
  $('inc-social-save').textContent= `${fmt(Math.round(saved * DATA.rates.social))} 원`;
  $('inc-xp').textContent         = `+${fmt(DATA.user.xp)} XP`;
}

let dailyChart, catChart, monthlyChart;

function initCharts() {
  state.chartsInit = true;
  updateStats();

  Chart.defaults.font.family = "'Noto Sans KR', sans-serif";

  // ── 일간 비교: 오늘 vs 어제 vs 포스텍 평균 ──
  dailyChart = new Chart($('chart-daily'), {
    type: 'bar',
    data: {
      labels: ['오늘 (5/5)', '어제 (5/4)', '포스텍 일평균'],
      datasets: [{
        label: '사용량 (L)',
        data: [DATA.todayUsage, DATA.yesterdayUsage, DATA.postech.dailyAvg],
        backgroundColor: [
          'rgba(41,182,246,0.85)',
          'rgba(102,187,106,0.85)',
          'rgba(229,57,53,0.65)',
        ],
        borderRadius: 10,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${fmt(ctx.raw)}L`,
          },
        },
      },
      scales: {
        y: {
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: { font: { size: 10 }, callback: v => `${v}L` },
          beginAtZero: true,
        },
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
      },
    },
  });

  // ── Category donut chart ──
  const totalByCat = DATA.april.reduce(
    (acc, r) => { acc[0]+=r.ws; acc[1]+=r.br; acc[2]+=r.sh; acc[3]+=r.ot; return acc; },
    [0,0,0,0]
  );
  catChart = new Chart($('chart-cat'), {
    type: 'doughnut',
    data: {
      labels: ['🧖 세수', '🪥 양치', '🚿 샤워', '📝 기타'],
      datasets: [{
        data: totalByCat,
        backgroundColor: ['#29b6f6','#66bb6a','#ffa726','#ab47bc'],
        borderWidth: 2,
        borderColor: '#fff',
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } },
      },
    },
  });

  // ── Monthly trend (Feb–May) ──
  const monthTotals = [
    { label: '2월', val: 4620 },
    { label: '3월', val: 4810 },
    { label: '4월', val: DATA.aprilTotal },
  ];
  const posteachMonthly = [7000, 7250, DATA.posteachMonthlyAvg];

  monthlyChart = new Chart($('chart-monthly'), {
    type: 'line',
    data: {
      labels: monthTotals.map(m => m.label),
      datasets: [
        {
          label: '내 사용량',
          data: monthTotals.map(m => m.val),
          borderColor: '#29b6f6',
          backgroundColor: 'rgba(41,182,246,0.15)',
          borderWidth: 3,
          pointBackgroundColor: '#29b6f6',
          pointRadius: 5,
          fill: true,
          tension: 0.4,
        },
        {
          label: '포스텍 평균',
          data: posteachMonthly,
          borderColor: '#e53935',
          borderWidth: 2,
          borderDash: [5,5],
          pointRadius: 0,
          fill: false,
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 10 }, callback: v => `${(v/1000).toFixed(1)}톤` } },
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
      },
    },
  });
}

// ─── Init ─────────────────────────────────────────────────
setupNumpad();
renderLastMonthSummary();
updateNumpadDisplay();
