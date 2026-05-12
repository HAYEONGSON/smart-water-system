const DATA = {
  user: { name: "포항공대생", xp: 750 },

  grades: [
    { name: "💧 물방울", minXp: 0 },
    { name: "🌊 시냇물", minXp: 500 },
    { name: "🏞️ 강물", minXp: 2000 },
    { name: "🌊 바다", minXp: 5000 },
  ],

  postech: { dailyAvg: 250 }, // L/day

  // 직접 비용 1,500원/톤 = 1.5원/L  |  사회적 비용 4,500원/톤 = 4.5원/L
  rates: { water: 1.5, social: 4.5, energy: 0.8 }, // 원/L

  // 이색 비교 지표 (사회적 비용 4,500원/톤 기준 — 0.9개·1.1잔·3.8개/톤)
  funComparisons: [
    { label: "햄버거 🍔",   unit: "개", rate: 0.0009 }, // 4,500원 ÷ 5,000원 = 0.9개/톤
    { label: "커피 ☕",     unit: "잔", rate: 0.0011 }, // 4,500원 ÷ 4,000원 = 1.1잔/톤
    { label: "초코송이 🍄‍🟫", unit: "개", rate: 0.0038 }, // 4,500원 ÷ 1,200원 = 3.8개/톤
  ],

  // April 2026 (30 days) — ws:세수 br:양치 sh:샤워 ot:기타(세탁·설거지 포함)
  april: [
    { d:1,  ws:12, br:6, sh:75, ot:12 },
    { d:2,  ws:12, br:6, sh:80, ot:12 },
    { d:3,  ws:13, br:7, sh:85, ot:80 },
    { d:4,  ws:15, br:8, sh:95, ot:27 },
    { d:5,  ws:12, br:7, sh:90, ot:81 },
    { d:6,  ws:10, br:6, sh:70, ot:7  },
    { d:7,  ws:12, br:6, sh:82, ot:16 },
    { d:8,  ws:12, br:7, sh:78, ot:78 },
    { d:9,  ws:12, br:6, sh:85, ot:12 },
    { d:10, ws:10, br:6, sh:72, ot:10 },
    { d:11, ws:13, br:7, sh:88, ot:87 },
    { d:12, ws:15, br:8, sh:100,ot:27 },
    { d:13, ws:12, br:7, sh:92, ot:84 },
    { d:14, ws:10, br:6, sh:68, ot:7  },
    { d:15, ws:12, br:6, sh:80, ot:14 },
    { d:16, ws:12, br:7, sh:85, ot:76 },
    { d:17, ws:10, br:6, sh:75, ot:9  },
    { d:18, ws:12, br:6, sh:82, ot:16 },
    { d:19, ws:12, br:7, sh:78, ot:83 },
    { d:20, ws:12, br:8, sh:90, ot:23 },
    { d:21, ws:13, br:8, sh:95, ot:29 },
    { d:22, ws:12, br:7, sh:88, ot:78 },
    { d:23, ws:10, br:6, sh:72, ot:7  },
    { d:24, ws:12, br:6, sh:80, ot:12 },
    { d:25, ws:12, br:7, sh:85, ot:86 },
    { d:26, ws:10, br:6, sh:75, ot:11 },
    { d:27, ws:10, br:6, sh:82, ot:10 },
    { d:28, ws:12, br:7, sh:78, ot:78 },
    { d:29, ws:12, br:8, sh:90, ot:20 },
    { d:30, ws:12, br:8, sh:88, ot:12 },
  ],

  // May 2026 (today = May 5, partial)
  may: [
    { d:1, ws:12, br:6, sh:80, ot:12 },
    { d:2, ws:12, br:7, sh:75, ot:76 },
    { d:3, ws:12, br:6, sh:82, ot:10 },
    { d:4, ws:12, br:6, sh:78, ot:14 }, // yesterday
    { d:5, ws:10, br:5, sh:65, ot:0  }, // today (partial — morning only)
  ],

  todayHistory: [
    { time: "07:00", cat: "세수",  amount: 10 },
    { time: "07:20", cat: "양치",  amount: 5  },
    { time: "07:35", cat: "샤워",  amount: 65 },
  ],
};

// Computed helpers
DATA.april.forEach(r => { r.total = r.ws + r.br + r.sh + r.ot; });
DATA.may.forEach(r => { r.total = r.ws + r.br + r.sh + r.ot; });

DATA.aprilTotal         = DATA.april.reduce((s, r) => s + r.total, 0); // ~4144L
DATA.mayTotal           = DATA.may.reduce((s, r) => s + r.total, 0);
DATA.posteachMonthlyAvg = DATA.postech.dailyAvg * 30; // 7500L
DATA.aprilSaved         = DATA.posteachMonthlyAvg - DATA.aprilTotal;
DATA.todayUsage         = DATA.may[4].total;   // May 5
DATA.yesterdayUsage     = DATA.may[3].total;   // May 4
