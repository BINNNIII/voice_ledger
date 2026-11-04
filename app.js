/* =========================================================
   음성 가계부 - 모든 데이터는 이 휴대폰(localStorage)에만 저장됩니다.
   ========================================================= */
'use strict';

/* ---------- 0. 공통 도구 ---------- */
const $ = (sel) => document.querySelector(sel);
const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

function won(n) {
  return (Math.round(Number(n) || 0)).toLocaleString('ko-KR') + '원';
}
function pad(n) { return String(n).padStart(2, '0'); }
function ymd(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function todayStr(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return ymd(d);
}
function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return ymd(new Date(y, m - 1, d + n));
}
function monthOf(dateStr) { return dateStr.slice(0, 7); }
function shiftMonth(m, delta) {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(y, mo - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
function monthLabel(m) {
  const [y, mo] = m.split('-').map(Number);
  return `${y}년 ${mo}월`;
}
function dateLabel(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const w = new Date(y, m - 1, d).getDay();
  return `${m}월 ${d}일 (${DAYS[w]})`;
}
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function norm(s) { return String(s || '').replace(/\s+/g, '').toLowerCase(); }

/* ---------- 1. 저장소 ---------- */
const DEFAULT_CATEGORIES = [
  { name: '식비', color: 'food', kw: ['점심', '저녁', '아침', '식사', '밥', '김밥', '라면', '국밥', '치킨', '피자', '햄버거', '버거', '맥도날드', '롯데리아', '버거킹', '족발', '보쌈', '삼겹살', '고기', '초밥', '스시', '짜장', '짬뽕', '중국집', '분식', '떡볶이', '도시락', '배달', '배민', '쿠팡이츠', '요기요', '식당', '한식', '일식', '중식', '양식', '찌개', '국수', '냉면', '돈까스', '반찬', '장보기', '식료품', '술', '맥주', '소주', '회식', '야식', '샐러드', '쌀국수', '파스타', '마라탕', '만두', '김치찌개', '덮밥', '뷔페'] },
  { name: '카페/간식', color: 'cafe', kw: ['커피', '카페', '스타벅스', '스벅', '이디야', '투썸', '메가커피', '메가', '빽다방', '컴포즈', '폴바셋', '라떼', '아메리카노', '음료', '디저트', '케이크', '케익', '빵', '베이커리', '파리바게뜨', '뚜레쥬르', '아이스크림', '배스킨', '간식', '과자', '편의점', 'gs25', 'cu', '세븐일레븐', '도넛', '쿠키', '버블티', '공차', '주스', '쥬스', '스무디', '마카롱'] },
  { name: '교통', color: 'trans', kw: ['택시', '버스', '지하철', '전철', '기차', 'ktx', 'srt', '교통', '주유', '기름', '주차', '톨비', '통행료', '하이패스', '카카오t', '따릉이', '킥보드', '항공', '비행기', '고속버스', '대리'] },
  { name: '쇼핑', color: 'shop', kw: ['쇼핑', '옷', '신발', '가방', '쿠팡', '무신사', '올리브영', '화장품', '백화점', '아울렛', '지마켓', '11번가', '에이블리', '지그재그', '선물', '악세사리', '액세서리', '의류', '바지', '티셔츠', '자라', '유니클로'] },
  { name: '생활', color: 'home', kw: ['마트', '이마트', '홈플러스', '롯데마트', '코스트코', '다이소', '생활', '휴지', '세제', '관리비', '전기', '가스', '수도', '통신', '핸드폰', '휴대폰', '인터넷', '월세', '세탁', '미용실', '헤어', '이발', '보험', '생필품', '샴푸', '청소'] },
  { name: '문화/여가', color: 'fun', kw: ['영화', 'cgv', '메가박스', '롯데시네마', '넷플릭스', '유튜브', '티빙', '웨이브', '디즈니', '구독', '공연', '콘서트', '뮤지컬', '전시', '책', '도서', '서점', '교보', '게임', '노래방', 'pc방', '피시방', '여행', '숙소', '호텔', '펜션', '운동', '헬스', '필라테스', '요가', '볼링', '골프', '수영', '취미'] },
  { name: '의료', color: 'health', kw: ['병원', '약국', '약값', '의원', '치과', '한의원', '진료', '검진', '안과', '피부과', '내과', '정형외과', '이비인후과', '감기약', '영양제'] },
  { name: '기타', color: 'etc', kw: [] },
];
const OTHER = '기타';

const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem('vl_' + key);
      return v ? JSON.parse(v) : fallback;
    } catch (e) { return fallback; }
  },
  set(key, val) {
    try { localStorage.setItem('vl_' + key, JSON.stringify(val)); }
    catch (e) { toast('저장 공간에 문제가 있어요. CSV로 백업해주세요.'); }
  },
};

let entries = store.get('entries', []);          // [{id, date, item, amount, category}]
let categories = store.get('categories', null) || JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
let learned = store.get('learned', {});          // 직접 고친 항목 → 카테고리 기억

// 카테고리 색 (style.css의 --c-xxx). 직접 추가한 카테고리는 mart → gift 순서로, 그 뒤는 회색
const DEFAULT_COLOR = { '식비': 'food', '카페/간식': 'cafe', '교통': 'trans', '쇼핑': 'shop',
  '생활': 'home', '문화/여가': 'fun', '의료': 'health', '기타': 'etc' };
const SPARE_COLORS = ['mart', 'gift'];
function nextSpareColor() {
  const used = new Set(categories.map((c) => c.color));
  return SPARE_COLORS.find((k) => !used.has(k)) || 'etc';
}
categories.forEach((c) => { if (!c.color) c.color = DEFAULT_COLOR[c.name] || nextSpareColor(); });

function saveEntries() { store.set('entries', entries); }
function saveCategories() { store.set('categories', categories); store.set('learned', learned); }
function catNames() { return categories.map((c) => c.name); }

// 휴대폰이 데이터를 함부로 지우지 않도록 요청
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

/* ---------- 2. 카테고리 자동 분류 ---------- */
function guessByKeyword(item) {
  const t = norm(item);
  let best = OTHER, bestLen = 0;
  for (const c of categories) {
    for (const k of c.kw || []) {
      const kk = norm(k);
      if (kk && t.includes(kk) && kk.length > bestLen) { best = c.name; bestLen = kk.length; }
    }
  }
  return best;
}
function guessCategory(item) {
  const l = learned[norm(item)];
  if (l && catNames().includes(l)) return l;
  return guessByKeyword(item);
}
function learn(item, category) {
  const key = norm(item);
  if (!key) return;
  if (category === guessByKeyword(item)) delete learned[key];
  else learned[key] = category;
  store.set('learned', learned);
}

/* ---------- 3. 한국어 숫자 → 숫자 ---------- */
const KDIGIT = { 영: 0, 공: 0, 일: 1, 이: 2, 삼: 3, 사: 4, 오: 5, 육: 6, 칠: 7, 팔: 8, 구: 9 };
const KSMALL = { 십: 10, 백: 100, 천: 1000 };
const KBIG = { 만: 10000, 억: 100000000 };

// "4500", "8천", "만이천오백", "1.5만", "12만 3000" → 숫자 (모르면 NaN)
function parseKoreanNumber(str) {
  const s = String(str).replace(/[\s,원₩]/g, '');
  if (!s) return NaN;
  if (/^\d+(\.\d+)?$/.test(s)) return Math.round(parseFloat(s));
  const re = /(\d+(?:\.\d+)?)|([영공일이삼사오육칠팔구])|([십백천])|([만억])/g;
  let total = 0, section = 0, num = 0, pos = 0, m;
  while ((m = re.exec(s))) {
    if (m.index !== pos) return NaN;
    pos = re.lastIndex;
    if (m[1]) num = parseFloat(m[1]);
    else if (m[2]) num = KDIGIT[m[2]];
    else if (m[3]) { section += (num || 1) * KSMALL[m[3]]; num = 0; }
    else { section += num; total += (section || 1) * KBIG[m[4]]; section = 0; num = 0; }
  }
  if (pos !== s.length) return NaN;
  return Math.round(total + section + num);
}
function isAmountToken(t) {
  return /^[0-9.영일이삼사오육칠팔구십백천만억]+$/.test(t) &&
    /[0-9십백천만억]/.test(t) &&
    !isNaN(parseKoreanNumber(t));
}

/* ---------- 4. 말 → 여러 건의 지출로 나누기 ---------- */
const DATE_WORDS = { 오늘: 0, 어제: -1, 그제: -2, 그저께: -2 };
const FILLERS = new Set(['썼어', '썼어요', '썼음', '씀', '결제', '결제했어', '결제했어요', '샀어', '샀어요',
  '먹었어', '먹었어요', '냈어', '냈어요', '지출', '사용', '했어', '했어요', '원어치', '정도', '쯤']);

function parseSpeech(text) {
  let s = String(text || '').replace(/₩/g, ' ').replace(/[，、]/g, ',');
  // 4,500 처럼 천 단위 쉼표는 숫자로 붙이기
  while (/(\d),(\d{3})/.test(s)) s = s.replace(/(\d),(\d{3})/g, '$1$2');
  s = s.replace(/[,\n;]/g, ' , ')                     // 쉼표 = 구분
    .replace(/([^\s\d.])(?=\d)/g, '$1 ')               // "커피4500" → "커피 4500"
    .replace(/([\d십백천만억])원(?=\S)/g, '$1원 ')      // "4500원택시" → "4500원 택시"
    .replace(/[.!?~]+(?=\s|$)/g, ' ');

  const results = [];
  let dayOffset = 0, cur = [], amt = [];
  const flush = () => {
    if (cur.length || amt.length) {
      results.push({
        item: cur.join(' ').trim(),
        amount: amt.length ? parseKoreanNumber(amt.join('')) || 0 : 0,
        date: addDays(entryDate, dayOffset),   // 위에서 고른 날짜 기준 ("어제" = 고른 날의 전날)
      });
    }
    cur = []; amt = [];
  };

  for (let t of s.split(/\s+/).filter(Boolean)) {
    if (t === ',' || t === '그리고') { flush(); continue; }
    const dw = t.replace(/(에|은|는)$/, '');
    if (dw in DATE_WORDS) { dayOffset = DATE_WORDS[dw]; continue; }
    if (t === '원') { if (amt.length) flush(); continue; }
    if (t.endsWith('원') && isAmountToken(t.slice(0, -1))) { amt.push(t.slice(0, -1)); flush(); continue; }
    if (isAmountToken(t)) { amt.push(t); continue; }
    if (FILLERS.has(t)) continue;
    if (amt.length) flush();                           // 숫자 뒤에 새 단어 → 다음 건
    if (t.length > 2) t = t.replace(/에서(는)?$/, '');
    cur.push(t);
  }
  flush();

  // "4500원 커피"처럼 금액이 먼저 나온 경우 합치기
  for (let i = 0; i < results.length - 1; i++) {
    if (!results[i].item && results[i].amount && results[i + 1].item && !results[i + 1].amount) {
      results[i].item = results[i + 1].item;
      results.splice(i + 1, 1);
    }
  }
  return results
    .filter((r) => r.item || r.amount)
    .map((r) => {
      const item = r.item || '지출';
      return { ...r, item, category: guessCategory(item) };
    });
}

/* ---------- 5. 알림 / 확인 창 ---------- */
let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2200);
}

// buttons: [{label, value, style: 'primary'|'secondary'|'danger'}]
function showDialog(title, message, buttons) {
  return new Promise((resolve) => {
    const box = $('#dialog');
    $('#dialog-title').textContent = title;
    $('#dialog-msg').textContent = message || '';
    const btns = $('#dialog-btns');
    btns.innerHTML = '';
    const close = (v) => { box.classList.add('hidden'); box.onclick = null; resolve(v); };
    buttons.forEach((b) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'btn ' + (b.style || 'secondary');
      el.textContent = b.label;
      el.onclick = (e) => { e.stopPropagation(); close(b.value); };
      btns.appendChild(el);
    });
    box.onclick = (e) => { if (e.target === box) close(null); };
    box.classList.remove('hidden');
  });
}
function confirmDelete(title, message) {
  return showDialog(title, message, [
    { label: '삭제', value: true, style: 'danger' },
    { label: '취소', value: false, style: 'secondary' },
  ]);
}

/* ---------- 6. 하단 탭 ---------- */
const renderers = {
  'view-input': () => renderToday(),
  'view-report': () => renderReport(),
  'view-data': () => { renderSheet(); renderCatManage(); },
  'view-goal': () => renderGoalScreen(),
};
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    const id = tab.dataset.view;
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === tab));
    document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === id));
    if (id !== 'view-input') stopListening();
    renderers[id]();
    window.scrollTo(0, 0);
  });
});

function catOptions(selected) {
  const names = catNames();
  if (selected && !names.includes(selected)) names.push(selected);
  return names.map((n) => `<option ${n === selected ? 'selected' : ''}>${esc(n)}</option>`).join('');
}

/* =========================================================
   화면 1. 음성 입력
   ========================================================= */
const textInput = $('#text-input');
const micBtn = $('#mic-btn');
const micStatus = $('#mic-status');
let pending = [];      // 저장 전 미리보기
let editing = false;
let recognition = null;
let listening = false;

/* ----- 입력 날짜 선택 (기본: 접속한 오늘) ----- */
let entryDate = todayStr();
let dateTouched = false;   // 직접 날짜를 바꿨는지
const dateInput = $('#entry-date');

function setEntryDate(d, touched = true) {
  const t = todayStr();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) d = t;
  if (d > t) d = t;                       // 미래 날짜는 고를 수 없어요
  entryDate = d;
  dateTouched = touched && d !== t;
  // 미리보기 중이었다면 미리보기 날짜도 같이 바꾸기
  pending.forEach((p) => { p.date = d; });
  renderPreview();
  renderToday();
}
$('#date-prev').addEventListener('click', () => setEntryDate(addDays(entryDate, -1)));
$('#date-next').addEventListener('click', () => setEntryDate(addDays(entryDate, 1)));
$('#date-today').addEventListener('click', () => setEntryDate(todayStr(), false));
dateInput.addEventListener('change', () => setEntryDate(dateInput.value));
// 컴퓨터 크롬에서도 어디를 눌러도 달력이 열리게
$('#date-pill').addEventListener('click', () => {
  if (dateInput.showPicker) { try { dateInput.showPicker(); } catch (e) { /* 무시 */ } }
});
// 앱을 켜둔 채 날짜가 바뀌면(자정 지남) 직접 고른 날이 아닐 때 오늘로 맞추기
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && !dateTouched && entryDate !== todayStr()) {
    setEntryDate(todayStr(), false);
  }
});

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

micBtn.addEventListener('click', () => {
  if (listening) { stopListening(); return; }
  if (!SR) {
    showDialog('음성인식을 쓸 수 없어요',
      '이 브라우저는 음성인식을 지원하지 않아요.\n아래 입력창을 누른 뒤, 키보드의 🎤 버튼(받아쓰기)으로 말해보세요.',
      [{ label: '알겠어요', value: true, style: 'primary' }]
    ).then(() => textInput.focus());
    return;
  }
  startListening();
});

function startListening() {
  try {
    recognition = new SR();
  } catch (e) {
    micStatus.textContent = '음성인식을 시작하지 못했어요. 입력창의 🎤 받아쓰기를 써주세요.';
    return;
  }
  recognition.lang = 'ko-KR';
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;

  const base = textInput.value.trim();
  let finalText = '';

  recognition.onstart = () => {
    listening = true;
    micBtn.classList.add('listening');
    micStatus.textContent = '듣고 있어요… 말이 끝나면 잠시 기다려주세요';
  };
  recognition.onresult = (ev) => {
    let interim = '';
    finalText = '';
    for (let i = 0; i < ev.results.length; i++) {
      const r = ev.results[i];
      if (r.isFinal) finalText += r[0].transcript;
      else interim += r[0].transcript;
    }
    textInput.value = [base, (finalText + interim).trim()].filter(Boolean).join(', ');
  };
  recognition.onerror = (ev) => {
    const msgs = {
      'not-allowed': '마이크 권한이 꺼져 있어요. 설정 > Safari > 마이크에서 허용해주세요.',
      'service-not-allowed': '이 화면에서는 음성인식이 막혀 있어요. 입력창의 🎤 받아쓰기를 써주세요.',
      'no-speech': '말소리가 들리지 않았어요. 다시 눌러주세요.',
      'audio-capture': '마이크를 찾을 수 없어요.',
      'network': '인터넷 연결을 확인해주세요.',
      'aborted': '음성인식을 멈췄어요.',
    };
    micStatus.textContent = msgs[ev.error] || `음성인식 오류 (${ev.error}). 입력창의 🎤 받아쓰기를 써주세요.`;
  };
  recognition.onend = () => {
    const had = listening;
    listening = false;
    micBtn.classList.remove('listening');
    if (had && textInput.value.trim() && textInput.value.trim() !== base) {
      micStatus.textContent = '버튼을 누르고 말해보세요';
      analyze();
    } else if (micStatus.textContent.startsWith('듣고')) {
      micStatus.textContent = '버튼을 누르고 말해보세요';
    }
  };
  try { recognition.start(); }
  catch (e) { micStatus.textContent = '음성인식을 시작하지 못했어요. 다시 눌러주세요.'; }
}
function stopListening() {
  if (recognition && listening) recognition.stop();
}

$('#analyze-btn').addEventListener('click', analyze);
textInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); analyze(); }
});

function analyze() {
  const text = textInput.value.trim();
  if (!text) { toast('먼저 말하거나 입력해주세요'); return; }
  pending = parseSpeech(text);
  if (!pending.length) { toast('금액을 찾지 못했어요. 예) 커피 4500원'); return; }
  editing = pending.some((p) => !p.amount);   // 금액을 못 찾으면 바로 수정 화면
  renderPreview();
  $('#preview').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function renderPreview() {
  const box = $('#preview');
  const list = $('#preview-list');
  if (!pending.length) { box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  $('#edit-btn').textContent = editing ? '수정 완료' : '수정';

  list.innerHTML = pending.map((p, i) => editing ? `
    <div class="p-edit" data-i="${i}">
      <input class="full" data-f="item" type="text" value="${esc(p.item)}" placeholder="항목" aria-label="항목">
      <input data-f="amount" type="text" inputmode="numeric" value="${p.amount ? p.amount.toLocaleString('ko-KR') : ''}" placeholder="금액" aria-label="금액">
      <select data-f="category" aria-label="카테고리">${catOptions(p.category)}</select>
      <input class="full" data-f="date" type="date" value="${p.date}" aria-label="날짜">
    </div>` : `
    <div class="p-item">
      <div class="p-main">
        <div class="p-name">${esc(p.item)}</div>
        <div class="p-meta">${catChip(p.category)} ${p.date === todayStr() ? '오늘' : dateLabel(p.date)}</div>
      </div>
      <div class="p-amount ${p.amount ? '' : 'zero'}">${p.amount ? won(p.amount) : '금액 없음'}</div>
      <button class="p-remove" data-remove="${i}" type="button" aria-label="이 항목 빼기">×</button>
    </div>`).join('');
}

// 미리보기 수정 칸 입력 반영
$('#preview-list').addEventListener('input', (e) => {
  const row = e.target.closest('.p-edit');
  if (!row) return;
  const p = pending[Number(row.dataset.i)];
  const f = e.target.dataset.f;
  if (f === 'amount') {
    const n = parseKoreanNumber(e.target.value);
    p.amount = isNaN(n) ? 0 : n;
    if (/^[\d,]+$/.test(e.target.value) && p.amount) e.target.value = p.amount.toLocaleString('ko-KR');
  } else if (f === 'item') {
    p.item = e.target.value;
  } else {
    p[f] = e.target.value;
  }
});
$('#preview-list').addEventListener('change', (e) => {
  if (e.target.dataset.f === 'item') {
    // 항목 이름이 바뀌면 카테고리도 다시 추천
    const row = e.target.closest('.p-edit');
    const p = pending[Number(row.dataset.i)];
    p.category = guessCategory(p.item);
    row.querySelector('[data-f=category]').value = p.category;
  }
});
$('#preview-list').addEventListener('click', (e) => {
  const r = e.target.closest('[data-remove]');
  if (!r) return;
  pending.splice(Number(r.dataset.remove), 1);
  renderPreview();
});

$('#edit-btn').addEventListener('click', () => {
  editing = !editing;
  renderPreview();
});

$('#save-btn').addEventListener('click', () => {
  const bad = pending.find((p) => !p.amount || !p.item.trim() || !p.date);
  if (bad) {
    editing = true;
    renderPreview();
    toast('항목·금액·날짜를 모두 채워주세요');
    return;
  }
  pending.forEach((p) => {
    learn(p.item, p.category);
    entries.push({ id: newId(), date: p.date, item: p.item.trim(), amount: p.amount, category: p.category });
  });
  saveEntries();
  const savedDate = pending[0].date;
  const sameDay = pending.every((p) => p.date === savedDate);
  toast(sameDay && savedDate !== todayStr()
    ? `${dateLabel(savedDate)}에 ${pending.length}건 저장했어요`
    : `${pending.length}건 저장했어요`);
  pending = [];
  editing = false;
  textInput.value = '';
  renderPreview();
  renderToday();
});

function renderToday() {
  const t = todayStr();
  if (entryDate > t) entryDate = t;
  const isToday = entryDate === t;
  // 위쪽 날짜 표시
  $('#date-label').textContent = (isToday ? '오늘 · ' : '') + dateLabel(entryDate);
  $('#date-pill').classList.toggle('past', !isToday);
  dateInput.value = entryDate;
  dateInput.max = t;
  $('#date-next').disabled = isToday;
  $('#date-today').classList.toggle('hidden', isToday);
  $('#day-title').textContent = isToday ? '오늘 입력한 내역' : `${dateLabel(entryDate)} 내역`;

  // 고른 날짜의 내역과 합계
  const list = entries.filter((e) => e.date === entryDate).reverse();
  $('#today-total').textContent = won(list.reduce((s, e) => s + e.amount, 0));
  $('#today-list').innerHTML = list.length ? list.map((e) => `
    <li>
      <span class="e-name">${esc(e.item)} ${catChip(e.category)}</span>
      <span class="e-amount">${won(e.amount)}</span>
      <button class="p-remove" data-del="${e.id}" type="button" aria-label="삭제">×</button>
    </li>`).join('') : `<p class="empty">아직 ${isToday ? '오늘' : '이 날'} 입력한 내역이 없어요</p>`;
}
$('#today-list').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-del]');
  if (!b) return;
  const en = entries.find((x) => x.id === b.dataset.del);
  if (!en) return;
  if (await confirmDelete('삭제할까요?', `${en.item} ${won(en.amount)}`)) {
    entries = entries.filter((x) => x.id !== en.id);
    saveEntries();
    renderToday();
  }
});

/* =========================================================
   화면 2. 리포트
   ========================================================= */
function catKey(name) {
  const c = categories.find((x) => x.name === name);
  return c ? c.color : 'etc';
}
function catColor(name) { return `var(--c-${catKey(name)})`; }
function catChip(name) {
  const k = catKey(name);
  return `<span class="chip" style="background:var(--c-${k}-bg);color:var(--c-${k}-tx)">${esc(name)}</span>`;
}

let reportMonth = monthOf(todayStr());
$('#prev-month').addEventListener('click', () => { reportMonth = shiftMonth(reportMonth, -1); renderReport(); });
$('#next-month').addEventListener('click', () => { reportMonth = shiftMonth(reportMonth, 1); renderReport(); });

function sumBy(list) {
  const map = {};
  list.forEach((e) => { map[e.category] = (map[e.category] || 0) + e.amount; });
  return map;
}

function renderReport() {
  const cur = entries.filter((e) => monthOf(e.date) === reportMonth);
  const prev = entries.filter((e) => monthOf(e.date) === shiftMonth(reportMonth, -1));
  const total = cur.reduce((s, e) => s + e.amount, 0);
  const prevTotal = prev.reduce((s, e) => s + e.amount, 0);

  $('#report-month').textContent = monthLabel(reportMonth);
  $('#next-month').disabled = reportMonth >= monthOf(todayStr());
  $('#next-month').style.opacity = $('#next-month').disabled ? 0.35 : 1;
  $('#report-total').textContent = won(total);
  renderGoalCards(total);

  // 지난달과 비교
  const cmp = $('#report-compare');
  cmp.className = 'compare';
  const diff = total - prevTotal;
  if (!prevTotal && !total) cmp.textContent = '이 달에는 기록이 없어요';
  else if (!prevTotal) cmp.textContent = '지난달 기록이 없어 비교할 수 없어요';
  else if (diff === 0) cmp.textContent = '지난달과 똑같이 썼어요';
  else {
    const pct = Math.round(Math.abs(diff) / prevTotal * 100);
    if (diff > 0) { cmp.textContent = `지난달보다 ${won(diff)} 더 썼어요 (▲${pct}%)`; cmp.classList.add('up'); }
    else { cmp.textContent = `지난달보다 ${won(-diff)} 덜 썼어요 (▼${pct}%)`; cmp.classList.add('down'); }
  }

  // 카테고리별 합계
  const curMap = sumBy(cur), prevMap = sumBy(prev);
  const names = [...new Set([...catNames(), ...Object.keys(curMap), ...Object.keys(prevMap)])];
  const rows = names
    .map((n) => ({ name: n, amt: curMap[n] || 0, prev: prevMap[n] || 0, color: catColor(n), key: catKey(n) }))
    .filter((r) => r.amt || r.prev)
    .sort((a, b) => b.amt - a.amt || b.prev - a.prev);

  renderDonut(rows.filter((r) => r.amt), total);

  $('#cat-list').innerHTML = rows.length ? rows.map((r) => {
    const pct = total ? Math.round(r.amt / total * 100) : 0;
    const d = r.amt - r.prev;
    const delta = d > 0 ? `<span class="delta up">▲ ${won(d)}</span>`
      : d < 0 ? `<span class="delta down">▼ ${won(-d)}</span>`
      : '<span class="delta">변화 없음</span>';
    return `
      <li>
        <div class="cat-row">
          <span class="dot" style="background:${r.color}"></span>
          <span class="cat-name">${esc(r.name)}</span>
          <span class="cat-pct">${pct}%</span>
          <span class="cat-amt">${won(r.amt)}</span>
        </div>
        <div class="cat-sub">
          <div class="bar"><i style="width:${pct}%;background:${r.color}"></i></div>
          ${delta}
        </div>
      </li>`;
  }).join('') : '<p class="empty">내역이 없어요</p>';

  // 날짜별 내역 (최신순)
  const byDate = {};
  cur.forEach((e) => { (byDate[e.date] = byDate[e.date] || []).push(e); });
  const dates = Object.keys(byDate).sort().reverse();
  $('#daily-list').innerHTML = dates.length ? dates.map((d) => {
    const list = byDate[d].slice().reverse();
    const sum = list.reduce((s, e) => s + e.amount, 0);
    return `
      <div class="day-group">
        <div class="day-head"><span>${dateLabel(d)}</span><span>${won(sum)}</span></div>
        <ul class="entry-list">
          ${list.map((e) => `
            <li>
              <span class="dot" style="background:${catColor(e.category)}"></span>
              <span class="e-name">${esc(e.item)} ${catChip(e.category)}</span>
              <span class="e-amount">${won(e.amount)}</span>
            </li>`).join('')}
        </ul>
      </div>`;
  }).join('') : '<p class="empty">내역이 없어요</p>';
}

function renderDonut(rows, total) {
  const svg = $('#donut');
  const tip = $('#donut-tip');
  tip.classList.add('hidden');
  svg.classList.remove('has-focus');
  const R = 80, W = 26, C = 2 * Math.PI * R;

  // 회색(기타 + 색이 모자란 카테고리)은 하나로 묶기
  const segs = [];
  let overflow = 0;
  rows.forEach((r) => {
    if (r.key === 'etc') overflow += r.amt;
    else segs.push(r);
  });
  if (overflow) {
    const onlyOther = rows.filter((r) => r.key === 'etc');
    segs.push({ name: onlyOther.length === 1 ? onlyOther[0].name : '기타·그 외', amt: overflow, color: 'var(--c-etc)' });
  }

  let html = `<circle cx="100" cy="100" r="${R}" fill="none" style="stroke:var(--surface)" stroke-width="${W}"/>`;
  if (total > 0) {
    const gap = segs.length > 1 ? 2 : 0;   // 조각 사이 2px 간격
    let offset = 0;
    segs.forEach((s, i) => {
      const len = s.amt / total * C;
      const pct = Math.round(s.amt / total * 100);
      html += `<circle class="seg" data-i="${i}" cx="100" cy="100" r="${R}" fill="none"
        style="stroke:${s.color}" stroke-width="${W}"
        stroke-dasharray="${Math.max(len - gap, 0.01)} ${C}"
        stroke-dashoffset="${-offset}" transform="rotate(-90 100 100)">
        <title>${esc(s.name)} ${pct}% · ${won(s.amt)}</title></circle>`;
      offset += len;
    });
  }
  html += `<text x="100" y="94" text-anchor="middle" class="donut-center-label">${total ? '합계' : '내역 없음'}</text>
    <text x="100" y="118" text-anchor="middle" class="donut-center-value">${total ? won(total) : ''}</text>`;
  svg.innerHTML = html;

  const focus = (i) => {
    const s = segs[i];
    svg.classList.add('has-focus');
    svg.querySelectorAll('.seg').forEach((el) => el.classList.toggle('focus', Number(el.dataset.i) === i));
    tip.textContent = `${s.name} ${Math.round(s.amt / total * 100)}% · ${won(s.amt)}`;
    tip.classList.remove('hidden');
  };
  const clear = () => { svg.classList.remove('has-focus'); tip.classList.add('hidden'); };
  svg.onclick = (e) => {
    const el = e.target.closest('.seg');
    if (!el) return clear();
    if (el.classList.contains('focus') && svg.classList.contains('has-focus')) clear();
    else focus(Number(el.dataset.i));
  };
  svg.onmouseover = (e) => { const el = e.target.closest('.seg'); if (el) focus(Number(el.dataset.i)); };
  svg.onmouseleave = clear;
}

/* =========================================================
   화면 3. 데이터 시트
   ========================================================= */
const filterMonth = $('#filter-month');
const searchInput = $('#search');
const sheetBody = $('#sheet-body');
let sheetMonth = monthOf(todayStr());

filterMonth.addEventListener('change', () => { sheetMonth = filterMonth.value; renderSheet(); });
searchInput.addEventListener('input', () => renderSheet());

function sheetRows() {
  const q = norm(searchInput.value);
  return entries
    .filter((e) => sheetMonth === 'all' || monthOf(e.date) === sheetMonth)
    .filter((e) => !q || norm(e.item).includes(q))
    .map((e, i) => ({ e, i: entries.indexOf(e) }))
    .sort((a, b) => (b.e.date.localeCompare(a.e.date)) || (b.i - a.i))
    .map((x) => x.e);
}

function renderMonthOptions() {
  const months = new Set(entries.map((e) => monthOf(e.date)));
  months.add(monthOf(todayStr()));
  if (sheetMonth !== 'all') months.add(sheetMonth);
  const sorted = [...months].sort().reverse();
  filterMonth.innerHTML = `<option value="all">전체 기간</option>` +
    sorted.map((m) => `<option value="${m}">${monthLabel(m)}</option>`).join('');
  filterMonth.value = sheetMonth;
}

function renderSheet(flashId) {
  renderMonthOptions();
  const rows = sheetRows();
  sheetBody.innerHTML = rows.map((e) => `
    <tr data-id="${e.id}" class="${e.id === flashId ? 'flash' : ''}">
      <td><input data-f="date" type="date" value="${e.date}" aria-label="날짜"></td>
      <td><input data-f="item" type="text" value="${esc(e.item)}" placeholder="항목" aria-label="항목"></td>
      <td><input data-f="amount" class="amt-cell" type="text" inputmode="numeric" value="${e.amount.toLocaleString('ko-KR')}" aria-label="금액"></td>
      <td><select data-f="category" aria-label="카테고리">${catOptions(e.category)}</select></td>
      <td><button class="row-del" data-del="${e.id}" type="button" aria-label="행 삭제">🗑</button></td>
    </tr>`).join('');
  $('#sheet-empty').classList.toggle('hidden', rows.length > 0);
  updateSheetSummary(rows);
}
function updateSheetSummary(rows = sheetRows()) {
  $('#sheet-count').textContent = `${rows.length}건`;
  $('#sheet-sum').textContent = won(rows.reduce((s, e) => s + e.amount, 0));
}

// 칸을 고치면 바로 저장 (표를 다시 그리지 않아 다음 칸으로 자연스럽게 이동)
sheetBody.addEventListener('change', (ev) => {
  const tr = ev.target.closest('tr');
  const e = entries.find((x) => x.id === tr?.dataset.id);
  if (!e) return;
  const f = ev.target.dataset.f;
  const v = ev.target.value;
  if (f === 'date') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) { ev.target.value = e.date; return; }
    e.date = v;
  } else if (f === 'amount') {
    const n = parseKoreanNumber(v);
    if (isNaN(n)) { toast('금액은 숫자로 입력해주세요'); ev.target.value = e.amount.toLocaleString('ko-KR'); return; }
    e.amount = n;
    ev.target.value = n.toLocaleString('ko-KR');
  } else if (f === 'item') {
    e.item = v.trim();
  } else if (f === 'category') {
    e.category = v;
    learn(e.item, v);
  }
  saveEntries();
  updateSheetSummary();
});
// 금액 칸: 누르면 쉼표 없이, 다 쓰면 쉼표 넣기
sheetBody.addEventListener('focusin', (ev) => {
  if (ev.target.dataset.f === 'amount') {
    ev.target.value = ev.target.value.replace(/,/g, '');
    setTimeout(() => ev.target.select && ev.target.select(), 0);
  }
});
sheetBody.addEventListener('focusout', (ev) => {
  if (ev.target.dataset.f === 'amount') {
    const n = parseKoreanNumber(ev.target.value);
    if (!isNaN(n)) ev.target.value = n.toLocaleString('ko-KR');
  }
});
sheetBody.addEventListener('click', async (ev) => {
  const b = ev.target.closest('[data-del]');
  if (!b) return;
  const e = entries.find((x) => x.id === b.dataset.del);
  if (!e) return;
  const ok = await confirmDelete('이 행을 삭제할까요?',
    `${dateLabel(e.date)}\n${e.item || '(항목 없음)'} · ${won(e.amount)}\n삭제하면 되돌릴 수 없어요.`);
  if (!ok) return;
  entries = entries.filter((x) => x.id !== e.id);
  saveEntries();
  renderSheet();
  toast('삭제했어요');
});

$('#add-row').addEventListener('click', () => {
  const t = todayStr();
  const date = sheetMonth === 'all' || sheetMonth === monthOf(t) ? t : sheetMonth + '-01';
  const e = { id: newId(), date, item: '', amount: 0, category: OTHER };
  entries.push(e);
  saveEntries();
  searchInput.value = '';
  renderSheet(e.id);
  const input = sheetBody.querySelector(`tr[data-id="${e.id}"] [data-f=item]`);
  if (input) { input.scrollIntoView({ block: 'center' }); input.focus(); }
});

/* ----- 카테고리 관리 ----- */
function renderCatManage() {
  $('#cat-manage').innerHTML = categories.map((c, i) => `
    <li>
      <span class="dot" style="background:${catColor(c.name)}"></span>
      ${c.name === OTHER
        ? `<span class="fixed">${OTHER} (기본, 삭제 불가)</span>`
        : `<input type="text" data-i="${i}" value="${esc(c.name)}" maxlength="12" aria-label="카테고리 이름">
           <button class="row-del" data-cat-del="${i}" type="button" aria-label="카테고리 삭제">🗑</button>`}
    </li>`).join('');
}

$('#cat-manage').addEventListener('change', (ev) => {
  const i = Number(ev.target.dataset.i);
  const c = categories[i];
  if (!c) return;
  const oldName = c.name;
  const newName = ev.target.value.trim();
  if (!newName || newName === oldName) { ev.target.value = oldName; return; }
  if (catNames().includes(newName)) { toast('이미 있는 이름이에요'); ev.target.value = oldName; return; }
  c.name = newName;
  entries.forEach((e) => { if (e.category === oldName) e.category = newName; });
  Object.keys(learned).forEach((k) => { if (learned[k] === oldName) learned[k] = newName; });
  saveCategories(); saveEntries();
  renderSheet(); renderCatManage();
  toast(`'${oldName}' → '${newName}'(으)로 바꿨어요`);
});

$('#cat-manage').addEventListener('click', async (ev) => {
  const b = ev.target.closest('[data-cat-del]');
  if (!b) return;
  const c = categories[Number(b.dataset.catDel)];
  const count = entries.filter((e) => e.category === c.name).length;
  const ok = await confirmDelete(`'${c.name}' 카테고리를 삭제할까요?`,
    count ? `이 카테고리의 내역 ${count}건은 '${OTHER}'(으)로 옮겨져요.` : '');
  if (!ok) return;
  entries.forEach((e) => { if (e.category === c.name) e.category = OTHER; });
  Object.keys(learned).forEach((k) => { if (learned[k] === c.name) delete learned[k]; });
  categories = categories.filter((x) => x !== c);
  saveCategories(); saveEntries();
  renderSheet(); renderCatManage();
});

function addCategory(name) {
  name = name.trim();
  if (!name) return false;
  if (catNames().includes(name)) return false;
  // '기타'는 항상 맨 뒤에 두기
  const otherIdx = categories.findIndex((c) => c.name === OTHER);
  const cat = { name, color: nextSpareColor(), kw: [name] };
  if (otherIdx >= 0) categories.splice(otherIdx, 0, cat); else categories.push(cat);
  return true;
}
$('#add-cat-btn').addEventListener('click', () => {
  const input = $('#new-cat');
  const name = input.value.trim();
  if (!name) { toast('이름을 입력해주세요'); return; }
  if (!addCategory(name)) { toast('이미 있는 이름이에요'); return; }
  saveCategories();
  input.value = '';
  renderSheet(); renderCatManage();
  toast(`'${name}' 카테고리를 추가했어요`);
});

/* ----- CSV 내보내기 / 불러오기 ----- */
function csvCell(v) {
  const s = String(v ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

$('#export-btn').addEventListener('click', async () => {
  const hasGoal = !!(goals.month || goals.week);
  if (!entries.length && !hasGoal) { toast('내보낼 내역이 없어요'); return; }
  const rows = entries.slice().sort((a, b) => a.date.localeCompare(b.date));
  // 목표는 표 오른쪽 별도 열(한 칸 띄우고)에 첫 줄에만 적어요 → 엑셀에서 금액 합계가 틀어지지 않게
  const table = [['날짜', '항목', '금액', '카테고리', '', '월 목표', '주 목표'],
    ...rows.map((e) => [e.date, e.item, e.amount, e.category])];
  if (!rows.length) table.push(['', '', '', '']);
  table[1].push('', goals.month || '', goals.week || '');
  const csv = '﻿' + table.map((r) => r.map(csvCell).join(',')).join('\r\n');
  const fileName = `가계부_${todayStr().replace(/-/g, '')}.csv`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });

  // 아이폰: 공유 창 → '파일에 저장'
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS && navigator.canShare) {
    const file = new File([blob], fileName, { type: 'text/csv' });
    if (navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: fileName }); }
      catch (e) { /* 사용자가 취소 */ }
      return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = fileName;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast(`${fileName} 파일을 저장했어요`);
});

$('#import-btn').addEventListener('click', () => $('#import-file').click());

function parseCSV(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}
function normDate(s) {
  s = String(s || '').trim();
  let m = s.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/) || s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!m) return null;
  const d = `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  return isNaN(new Date(d).getTime()) ? null : d;
}

$('#import-file').addEventListener('change', async (ev) => {
  const file = ev.target.files[0];
  ev.target.value = '';
  if (!file) return;
  const buf = await file.arrayBuffer();
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(buf); }
  catch (e) { text = new TextDecoder('euc-kr').decode(buf); }   // 엑셀 한글 CSV
  text = text.replace(/^﻿/, '');

  const rows = parseCSV(text);
  if (!rows.length) { toast('파일이 비어 있어요'); return; }
  let col = { date: 0, item: 1, amount: 2, category: 3 };
  const head = rows[0].map((c) => c.trim().toLowerCase());
  if (head.some((h) => /날짜|일자|date/.test(h))) {
    const find = (re, d) => { const i = head.findIndex((h) => re.test(h)); return i >= 0 ? i : d; };
    col = {
      date: find(/날짜|일자|date/, 0), item: find(/항목|내용|내역|item/, 1),
      amount: find(/금액|amount|가격/, 2), category: find(/카테고리|분류|category/, 3),
      goalMonth: find(/월\s*목표/, -1), goalWeek: find(/주\s*목표/, -1),
    };
    rows.shift();
  }

  // 목표 (있으면 첫 번째 값 사용)
  const goalFrom = (i) => {
    if (i < 0) return 0;
    for (const r of rows) {
      const n = parseKoreanNumber(String(r[i] || '').replace(/[^\d.,만천백십억]/g, ''));
      if (!isNaN(n) && n > 0) return n;
    }
    return 0;
  };
  const fileGoals = { month: goalFrom(col.goalMonth ?? -1), week: goalFrom(col.goalWeek ?? -1) };
  const hasFileGoals = !!(fileGoals.month || fileGoals.week);

  const imported = [];
  let skipped = 0;
  const newCats = new Set();
  rows.forEach((r) => {
    // 목표만 있고 내역 칸이 빈 줄은 건너뛰기 (오류로 세지 않음)
    if (![col.date, col.item, col.amount, col.category].some((i) => String(r[i] || '').trim())) return;
    const date = normDate(r[col.date]);
    const amount = parseKoreanNumber(String(r[col.amount] || '').replace(/[^\d.,만천백십억]/g, ''));
    const item = String(r[col.item] || '').trim();
    if (!date || isNaN(amount)) { skipped++; return; }
    let category = String(r[col.category] || '').trim();
    if (!category) category = guessCategory(item);
    if (!catNames().includes(category)) newCats.add(category);
    imported.push({ id: newId(), date, item, amount, category });
  });
  if (!imported.length && !hasFileGoals) { toast('불러올 수 있는 내역이 없어요. 날짜·항목·금액·카테고리 순서인지 확인해주세요.'); return; }

  const goalText = hasFileGoals
    ? `목표도 함께 불러와요 (${[fileGoals.month && `월 ${won(fileGoals.month)}`, fileGoals.week && `주 ${won(fileGoals.week)}`].filter(Boolean).join(' · ')})\n`
    : '';
  const choice = await showDialog(
    imported.length ? `${imported.length.toLocaleString()}건을 찾았어요` : '목표를 찾았어요',
    goalText + (skipped ? `읽을 수 없는 ${skipped}줄은 건너뛰어요.\n` : '') + '어떻게 불러올까요?', [
      { label: '기존 데이터에 추가하기', value: 'add', style: 'primary' },
      { label: '기존 데이터 지우고 바꾸기', value: 'replace', style: 'danger' },
      { label: '취소', value: null, style: 'secondary' },
    ]);
  if (!choice) return;
  newCats.forEach((c) => addCategory(c));
  entries = choice === 'replace' ? imported : entries.concat(imported);
  if (hasFileGoals) {
    goals = {
      month: fileGoals.month || (choice === 'replace' ? 0 : goals.month),
      week: fileGoals.week || (choice === 'replace' ? 0 : goals.week),
    };
    store.set('goals', goals);
  }
  saveEntries(); saveCategories();
  sheetMonth = 'all';
  renderSheet(); renderCatManage();
  toast(hasFileGoals
    ? `${imported.length.toLocaleString()}건과 목표를 불러왔어요`
    : `${imported.length.toLocaleString()}건을 불러왔어요`);
});

/* =========================================================
   화면 4. 지출 목표 (+ 리포트 위 '남은 금액' 카드)
   ========================================================= */
let goals = store.get('goals', { month: 0, week: 0 });

// 이번 주 = 월요일 ~ 일요일
function weekStart(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const w = new Date(y, m - 1, d).getDay();
  return addDays(dateStr, -((w + 6) % 7));
}
function shortDate(dateStr) {
  const [, m, d] = dateStr.split('-').map(Number);
  return `${m}/${d}`;
}
function daysInMonth(m) {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo, 0).getDate();
}
function sumBetween(from, to) {
  return entries.filter((e) => e.date >= from && e.date <= to).reduce((s, e) => s + e.amount, 0);
}
function floorTo100(n) { return Math.floor(n / 100) * 100; }

// 카드 하나: 남은 금액을 크게, 퍼센트는 작게
function goalCardHTML({ title, range, goal, spent, daysLeft, ended }) {
  const remain = goal - spent;
  const over = remain < 0;
  const pct = Math.round(spent / goal * 100);
  let headline, foot;
  if (ended) {
    headline = over ? `${won(-remain)} <small>초과했어요</small>` : `${won(remain)} <small>아꼈어요</small>`;
    foot = `<span>목표 ${won(goal)}의 <b>${pct}%</b> 썼어요</span>`;
  } else if (over) {
    headline = `${won(-remain)} <small>더 썼어요</small>`;
    foot = `<span>목표 ${won(goal)}을 넘었어요 (${pct}%)</span>`;
  } else {
    headline = `${won(remain)} <small>더 쓸 수 있어요</small>`;
    const perDay = daysLeft > 1 ? `<span>하루 <b>${won(floorTo100(remain / daysLeft))}</b>씩 · ${daysLeft}일</span>` : '<span>오늘이 마지막 날</span>';
    foot = `<span>목표의 <b>${pct}%</b> 썼어요</span>${perDay}`;
  }
  return `
    <div class="card goal-card ${over ? 'over' : ''}">
      <div class="goal-head"><span>${title}</span><span class="goal-range">${range}</span></div>
      <div class="goal-remain">${headline}</div>
      <div class="goal-meter"><i style="width:${Math.min(pct, 100)}%"></i></div>
      <div class="goal-foot">${foot}</div>
    </div>`;
}

function renderGoalCards(monthTotal) {
  const box = $('#goal-cards');
  const t = todayStr();
  const isCur = reportMonth === monthOf(t);
  const cards = [];

  if (goals.month) {
    const dim = daysInMonth(reportMonth);
    const today = Number(t.slice(8, 10));
    cards.push(goalCardHTML({
      title: isCur ? '이번 달 목표' : '이 달 목표',
      range: `목표 ${won(goals.month)}`,
      goal: goals.month,
      spent: monthTotal,
      daysLeft: dim - today + 1,
      ended: reportMonth < monthOf(t),
    }));
  }
  if (goals.week && isCur) {
    const ws = weekStart(t), we = addDays(ws, 6);
    const dayIdx = (new Date().getDay() + 6) % 7;   // 월=0 … 일=6
    cards.push(goalCardHTML({
      title: '이번 주 목표',
      range: `${shortDate(ws)}(월)~${shortDate(we)}(일)`,
      goal: goals.week,
      spent: sumBetween(ws, we),
      daysLeft: 7 - dayIdx,
      ended: false,
    }));
  }
  if (!cards.length && isCur) {
    box.innerHTML = `
      <div class="card goal-empty">
        <p>목표를 정하면 앞으로 쓸 수 있는 돈을 알려드려요</p>
        <button class="btn primary" type="button" data-goto="view-goal">목표 정하기</button>
      </div>`;
    return;
  }
  box.innerHTML = cards.join('');
}
$('#goal-cards').addEventListener('click', (e) => {
  const b = e.target.closest('[data-goto]');
  if (b) document.querySelector(`.tab[data-view="${b.dataset.goto}"]`).click();
});

/* ----- 목표 정하기 화면 ----- */
const goalMonthInput = $('#goal-month');
const goalWeekInput = $('#goal-week');

function readMoney(input) {
  const n = parseKoreanNumber(input.value);
  return isNaN(n) ? 0 : n;
}
function writeMoney(input, n) { input.value = n ? n.toLocaleString('ko-KR') : ''; }

function renderGoalScreen() {
  const t = todayStr();
  const m = monthOf(t);
  const ws = weekStart(t), we = addDays(ws, 6);
  $('#goal-month-range').textContent = `${monthLabel(m)} 1일 ~ ${daysInMonth(m)}일`;
  $('#goal-week-range').textContent = `${dateLabel(ws)} ~ ${dateLabel(we)}`;
  writeMoney(goalMonthInput, goals.month);
  writeMoney(goalWeekInput, goals.week);
  updateGoalNow();
}
function updateGoalNow() {
  const t = todayStr();
  const ws = weekStart(t);
  const mSpent = sumBetween(monthOf(t) + '-01', monthOf(t) + '-31');
  const wSpent = sumBetween(ws, addDays(ws, 6));
  const line = (spent, goal) => {
    if (!goal) return `지금까지 ${won(spent)} 썼어요`;
    const r = goal - spent;
    return r >= 0 ? `지금까지 ${won(spent)} 썼어요 → ${won(r)} 더 쓸 수 있어요`
      : `지금까지 ${won(spent)} 썼어요 → 목표보다 ${won(-r)} 더 썼어요`;
  };
  $('#goal-month-now').textContent = line(mSpent, readMoney(goalMonthInput));
  $('#goal-week-now').textContent = line(wSpent, readMoney(goalWeekInput));
}

// 입력하면서 쉼표 넣기
[goalMonthInput, goalWeekInput].forEach((input) => {
  input.addEventListener('input', () => {
    const digits = input.value.replace(/[^\d]/g, '');
    if (/^[\d,]*$/.test(input.value)) writeMoney(input, Number(digits));
    updateGoalNow();
  });
  input.addEventListener('blur', () => { writeMoney(input, readMoney(input)); updateGoalNow(); });
});

// +1만 / +5만 / 지우기 버튼
document.querySelectorAll('#view-goal .chips').forEach((box) => {
  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-add]');
    if (!b) return;
    const input = $('#' + box.dataset.target);
    const add = Number(b.dataset.add);
    writeMoney(input, add ? readMoney(input) + add : 0);
    updateGoalNow();
  });
});

// 월 목표를 일주일치로 나눠 주 목표 계산 (천 원 단위)
$('#week-auto').addEventListener('click', () => {
  const mg = readMoney(goalMonthInput);
  if (!mg) { toast('먼저 이번 달 목표를 입력해주세요'); goalMonthInput.focus(); return; }
  const wk = Math.round(mg * 7 / daysInMonth(monthOf(todayStr())) / 1000) * 1000;
  writeMoney(goalWeekInput, wk);
  updateGoalNow();
  toast(`월 목표 기준 주 ${won(wk)}로 계산했어요`);
});

$('#goal-save').addEventListener('click', () => {
  goals = { month: readMoney(goalMonthInput), week: readMoney(goalWeekInput) };
  store.set('goals', goals);
  toast(goals.month || goals.week ? '목표를 저장했어요. 리포트에서 확인해보세요' : '목표를 지웠어요');
});

/* ---------- 7. 시작 ---------- */
// 화면 확대 막기: 두 손가락 벌리기(아이폰 Safari 전용 gesture 이벤트 + 멀티터치)
['gesturestart', 'gesturechange', 'gestureend'].forEach((t) =>
  document.addEventListener(t, (e) => e.preventDefault(), { passive: false }));
document.addEventListener('touchmove', (e) => {
  if (e.touches.length > 1) e.preventDefault();
}, { passive: false });

renderToday();

// 오프라인에서도 열리도록 (인터넷 주소로 열었을 때만 동작)
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
