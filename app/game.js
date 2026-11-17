/* =====================================================================
   Đập Chim Cánh Cụt — logic game
   Theo docs/02-chuc-nang.html (CN-xx), docs/04-quy-tac-du-lieu.html (QT-xx).
   ===================================================================== */
(function () {
  'use strict';

  /* ---------------- QT-01 · Bảng cấu hình (chỉnh được) ---------------- */
  var CAU_HINH = {
    thoiGianLuot: 30,
    demNguoc: ['3', '2', '1', 'Đập!'], buocDemNguoc: 0.8,
    giaiDoan: [
      { ten: 'Khởi động', tu: 0,  kenh: 1, trenSan: [1.0, 1.4], nghi: [0.4, 0.6] },
      { ten: 'Tăng tốc',  tu: 10, kenh: 1, trenSan: [0.8, 1.1], nghi: [0.3, 0.5] },
      { ten: 'Bão tuyết', tu: 20, kenh: 2, trenSan: [0.6, 0.9], nghi: [0.2, 0.4] }
    ],
    heSoChimVang: 0.6,
    tiLe: { truoc10s: { thuong: 0.92, vang: 0.08 }, tu10s: { thuong: 0.80, vang: 0.08, haiCau: 0.12 } },
    haiCauTuGiay: 10,
    haiCauLienTiepToiDa: 2,
    diem: { thuong: 1, vang: 3, haiCau: -2 },
    comboNhan: 5, heSoCombo: 2,
    mocSao: [15, 30, 45],
    loiNhanSao: ['Thử lại nhé!', 'Khá lắm!', 'Tuyệt vời!', 'Vua đập chim!'],
    tuVeTrangChu: 60, nhacTuVe: 10,
    khongSinhKhiConDuoi: 0.4,
    lanSinhDau: 0.3,
    thoiGianTroi: 0.15, thoiGianLan: 0.15, thoiGianBiDap: 0.2
  };

  var KHOA_BANG = 'dapChimCanhCut.bangDiem.v1';
  var KHOA_AM = 'dapChimCanhCut.amThanh.v1';

  /* ---------------- QT-11 · Tham số kiểm thử ---------------- */
  var params = new URLSearchParams(location.search);
  var DEBUG = params.get('debug') === '1';
  var SEED = params.has('seed') ? (parseInt(params.get('seed'), 10) >>> 0) : null;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var rand = Math.random;
  function between(r) { return r[0] + rand() * (r[1] - r[0]); }

  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var reduceMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  /* ---------------- QT-10 · Lưu trữ ---------------- */
  var store = {
    get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  };

  function dongHopLe(d) {
    return d && typeof d === 'object' &&
      Number.isInteger(d.diem) && d.diem >= 1 && d.diem <= 999 &&
      Number.isInteger(d.sao) && d.sao >= 0 && d.sao <= 3 &&
      typeof d.ngay === 'string' && !isNaN(Date.parse(d.ngay));
  }
  function sapXep(ds) {
    // Điểm giảm dần; bằng điểm thì lượt cũ đứng trên.
    return ds.slice().sort(function (a, b) { return (b.diem - a.diem) || (Date.parse(a.ngay) - Date.parse(b.ngay)); });
  }
  function docBang() {
    var raw = store.get(KHOA_BANG);
    if (!raw) return [];
    try {
      var o = JSON.parse(raw);
      if (!o || o.phienBan !== 1 || !Array.isArray(o.ds)) return [];
      return sapXep(o.ds.filter(dongHopLe)).slice(0, 5);
    } catch (e) { return []; }
  }
  function ghiBang(ds) { store.set(KHOA_BANG, JSON.stringify({ phienBan: 1, ds: ds })); }

  /** Chèn lượt mới, giữ 5 dòng. Trả về { ds, viTri } (viTri = -1 nếu không lọt bảng). */
  function xepBang(ds, moi) {
    var all = sapXep(ds.concat([moi]));     // sort ổn định: lượt mới (ngày mới nhất) đứng sau khi bằng điểm
    var top = all.slice(0, 5);
    return { ds: top, viTri: top.indexOf(moi) };
  }
  function tinhSao(diem) {
    var m = CAU_HINH.mocSao;
    return diem >= m[2] ? 3 : diem >= m[1] ? 2 : diem >= m[0] ? 1 : 0;
  }

  var bang = docBang();

  /* ---------------- CN-12 · Âm thanh (Web Audio) ---------------- */
  var amThanh = store.get(KHOA_AM) !== 'tat';
  var ac = null, master = null;

  function initAudio() {
    if (ac) { if (ac.state === 'suspended' && G.state !== 'paused') ac.resume(); return; }
    var C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    try {
      ac = new C();
      master = ac.createGain(); master.gain.value = 0.4; master.connect(ac.destination);
      if (ac.state === 'suspended') ac.resume();
    } catch (e) { ac = null; }
  }
  function tone(f0, f1, dur, type, vol, delay) {
    if (!amThanh || !ac) return;
    var t = ac.currentTime + (delay || 0);
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.8, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.03);
  }
  function noise(dur, delay, freq) {
    if (!amThanh || !ac) return;
    var len = Math.floor(ac.sampleRate * dur);
    var buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    var s = ac.createBufferSource(); s.buffer = buf;
    var bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 0.9;
    var g = ac.createGain(); g.gain.value = 0.9;
    s.connect(bp); bp.connect(g); g.connect(master);
    s.start(ac.currentTime + delay);
  }
  var am = {
    bop: function () { tone(600, 180, 0.08, 'sine', 0.9); },
    bopVang: function () { tone(600, 180, 0.08, 'sine', 0.9); tone(1320, 1320, 0.08, 'triangle', 0.45, 0.05); tone(1760, 1760, 0.12, 'triangle', 0.45, 0.11); },
    sai: function () { tone(220, 110, 0.22, 'square', 0.3); },
    tich: function (cao) { var f = cao ? 1500 : 1000; tone(f, f, 0.03, 'square', 0.35); },
    ting: function (i) { var f = 1320 * [1, 1.335, 1.782][i]; tone(f, f, 0.3, 'sine', 0.6); },
    phaoHoa: function () { noise(0.35, 0, 900); noise(0.35, 0.22, 1400); noise(0.4, 0.45, 700); }
  };
  function rung(ms) {
    if (!amThanh || !navigator.vibrate) return;
    // Trình duyệt chặn rung khi chưa có thao tác thật của người dùng và ghi lỗi vào Console.
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    try { navigator.vibrate(ms); } catch (e) { /* bỏ qua */ }
  }
  function capNhatNutAm() {
    store.set(KHOA_AM, amThanh ? 'bat' : 'tat');
    $$('.js-sound').forEach(function (b) {
      b.setAttribute('aria-pressed', String(amThanh));
      if (b.classList.contains('btn-sound')) b.textContent = amThanh ? '🔊 Âm thanh: Bật' : '🔇 Âm thanh: Tắt';
      else { b.textContent = amThanh ? '🔊' : '🔇'; b.setAttribute('aria-label', amThanh ? 'Tắt âm thanh' : 'Bật âm thanh'); }
    });
  }

  /* ---------------- DOM ---------------- */
  var el = {
    start: $('#scr-start'), play: $('#scr-play'), end: $('#scr-end'), endDim: $('#end-dim'),
    btnStart: $('#btn-start'), startRecord: $('#start-record'),
    score: $('#v-score'), time: $('#v-time'), pillTime: $('#pill-time'), comboVal: $('#v-combo'), record: $('#v-record'),
    timebar: $('#timebar'), bar: $('#v-bar'), phases: $$('#phases span'),
    slot: $('.slot'), combo: $('#combo'), toast: $('#phase-toast'),
    board: $('#board'), grid: $('#grid'), ovCount: $('#ov-count'), countNum: $('#count-num'),
    ovPause: $('#ov-pause'), btnPause: $('#btn-pause'), btnResume: $('#btn-resume'), btnPauseHome: $('#btn-pause-home'),
    timeup: $('#timeup'), aurora: $('#aurora'),
    stars: $$('#stars .star'), starMsg: $('#star-msg'), endScore: $('#end-score'), ribbon: $('#ribbon'),
    stThuong: $('#st-thuong'), stVang: $('#st-vang'), stHaiCau: $('#st-haicau'), stTile: $('#st-tile'), stCombo: $('#st-combo'),
    top5: $('#top5'), btnReplay: $('#btn-replay'), btnHome: $('#btn-home'),
    idleHints: $$('.js-idle'), debug: $('#debug'),
    reg: $('#scr-reg'), regForm: $('#reg-form'), regMsg: $('#reg-msg'), btnReg: $('#btn-reg'), btnRegBack: $('#btn-reg-back'),
    fTen: $('#f-ten'), fEmail: $('#f-email'), fSdt: $('#f-sdt'), fDongY: $('#f-dongy'),
    eTen: $('#e-ten'), eEmail: $('#e-email'), eSdt: $('#e-sdt'), eDongY: $('#e-dongy'),
    dlgDk: $('#dlg-dieukhoan'), btnDk: $('#btn-dieukhoan'), dkNoiDung: $('#dk-noidung'), dkPhienBan: $('#dk-phienban')
  };

  // Lưới 3×3
  var cells = [];
  for (var i = 0; i < 9; i++) {
    var c = document.createElement('div');
    c.className = 'cell';
    c.dataset.i = String(i);
    c.innerHTML = '<div class="halo"></div><div class="hole"></div>' +
      '<div class="pop"><div class="inner" style="position:absolute;inset:0"><svg viewBox="0 0 100 120" aria-hidden="true"><use href="#thuong"/></svg></div></div>' +
      '<div class="ripple"></div>';
    el.grid.appendChild(c);
    cells.push({ el: c, use: c.querySelector('use') });
  }

  /* ---------------- Trạng thái game ---------------- */
  // BAT_DAU | DEM_NGUOC | DANG_CHOI | TAM_DUNG | KET_THUC
  var G = {
    state: 'start', resumeTo: null,
    segPerf: 0, segPlayed: 0, running: false,
    cdStart: 0, cdStep: -1,
    idleUntil: 0, timers: [], storm: false, party: false
  };

  function resetRound() {
    if (SEED !== null) rand = mulberry32(SEED);
    G.score = 0; G.combo = 0; G.comboMax = 0;
    G.stats = { thuong: 0, vang: 0, haiCau: 0, bam: 0 };
    G.animals = []; G.nextId = 1;
    G.kenh = [{ next: CAU_HINH.lanSinhDau, busy: null }, { next: null, busy: null }];
    G.lastVacated = -1; G.sealStreak = 0;
    G.toast10 = false; G.toast20 = false; G.storm = false;
    G.lastSec = CAU_HINH.thoiGianLuot;
    G.segPlayed = 0; G.running = false;
    G.kyLucCu = bang.length ? bang[0].diem : 0;
    cells.forEach(function (c) {
      c.el.className = 'cell instant';
      c.el.querySelectorAll('.float,.burst,.shard').forEach(function (n) { n.remove(); });
    });
    requestAnimationFrame(function () { cells.forEach(function (c) { c.el.classList.remove('instant'); }); });
    el.timeup.hidden = true;
    el.board.classList.remove('covered', 'paused', 'shake');
    el.slot.classList.remove('toasting');
    el.aurora.classList.remove('flash');
    el.toast.className = 'phase-toast';
    el.btnPause.textContent = '⏸';
    el.btnPause.setAttribute('aria-label', 'Tạm dừng');
    veCombo();
    el.record.textContent = bang.length ? String(G.kyLucCu) : '—';
    veHud(0);
  }

  function playedNow(perf) {
    return G.running ? G.segPlayed + (perf - G.segPerf) / 1000 : G.segPlayed;
  }
  function phaseIdx(t) { return t >= CAU_HINH.giaiDoan[2].tu ? 2 : t >= CAU_HINH.giaiDoan[1].tu ? 1 : 0; }

  function clearTimers() { G.timers.forEach(clearTimeout); G.timers = []; }
  function later(fn, ms) { G.timers.push(setTimeout(fn, ms)); }

  function show(screen) {
    el.start.hidden = screen !== 'start';
    el.reg.hidden = screen !== 'reg';
    el.play.hidden = screen === 'start' || screen === 'reg';
    el.end.hidden = screen !== 'end';
    el.endDim.hidden = screen !== 'end';
    el.play.classList.toggle('ending', screen === 'end');
  }

  /* ---------------- CN-01 · Màn hình bắt đầu ---------------- */
  function goHome() {
    clearTimers();
    G.state = 'start'; G.running = false; G.party = false; G.storm = false;
    resetRound();
    el.ovPause.hidden = true; el.ovCount.hidden = true;
    el.startRecord.textContent = bang.length ? '🏆 Kỷ lục: ' + bang[0].diem : 'Chưa có kỷ lục';
    // CN-19: về trang chủ là kết thúc phiên người chơi, form trống cho người kế tiếp
    DK.phien = null;
    xoaForm();
    show('start');
    setIdleHint('');
    el.btnStart.focus({ preventScroll: true });
  }

  /* ---------------- CN-02 · Đếm ngược ---------------- */
  function startCountdown() {
    G.state = 'countdown';
    G.cdStart = performance.now(); G.cdStep = -1;
    el.ovCount.hidden = false;
    el.ovPause.hidden = true;
    el.board.classList.remove('covered', 'paused');
  }
  function tickCountdown(now) {
    var step = Math.floor((now - G.cdStart) / 1000 / CAU_HINH.buocDemNguoc);
    if (step !== G.cdStep) {
      G.cdStep = step;
      if (step < CAU_HINH.demNguoc.length) {
        var n = el.countNum;
        n.textContent = CAU_HINH.demNguoc[step];
        n.className = '';
        void n.offsetWidth;
        n.className = 'tick' + (step === CAU_HINH.demNguoc.length - 1 ? ' go' : '');
        am.tich(step === CAU_HINH.demNguoc.length - 1);
      }
    }
    if (step >= CAU_HINH.demNguoc.length) {
      el.ovCount.hidden = true;
      G.state = 'playing';
      G.segPerf = now; G.segPlayed = 0; G.running = true;
    }
  }

  function batDauLuot() {
    initAudio();
    clearTimers();
    resetRound();
    G.maLuot = taoMaLuot();
    show('play');
    startCountdown();
  }

  /* ---------------- v1.1 · CN-17…CN-20 Đăng ký người chơi ---------------- */
  // Chỉ bật khi có server trả lời /api/cau-hinh (bản Docker). Bản GitHub Pages giữ nguyên v1.
  var DK = { bat: false, phien: null, dangGui: false };
  var KHOA_HANG_DOI = 'dapChimCanhCut.luotChoGui.v1';

  function taoMaLuot() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var b = new Uint8Array(16); crypto.getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
    var h = Array.prototype.map.call(b, function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }

  function fetchHetGio(url, opt, ms) {
    var ctrl = window.AbortController ? new AbortController() : null;
    var t = ctrl ? setTimeout(function () { ctrl.abort(); }, ms || 8000) : null;
    return fetch(url, Object.assign({ cache: 'no-store', credentials: 'same-origin' }, opt || {}, ctrl ? { signal: ctrl.signal } : {}))
      .finally(function () { if (t) clearTimeout(t); });
  }

  function kiemTraServer() {
    fetchHetGio('/api/cau-hinh', {}, 4000).then(function (r) { return r.ok ? r.json() : null; }).then(function (c) {
      if (!c || !c.dang_ky) return;
      DK.bat = true;
      el.dkNoiDung.textContent = c.noi_dung_dieu_khoan || '';
      el.dkPhienBan.textContent = 'Phiên bản điều khoản: ' + (c.phien_ban_dieu_khoan || '');
      guiHangDoi();
    }).catch(function () { /* không có server → chơi như v1 */ });
  }

  // QT-12 phía trình duyệt (server kiểm tra lại)
  function chuanSdt(s) {
    var d = String(s || '').replace(/[\s.\-()]/g, '');
    if (d.indexOf('+84') === 0) d = '0' + d.slice(3);
    else if (/^84\d{9}$/.test(d)) d = '0' + d.slice(2);
    return d;
  }
  function kiemTruong(ten) {
    var v;
    if (ten === 'ho_ten') {
      v = el.fTen.value.normalize('NFC').trim().replace(/\s+/g, ' ');
      if (!v) return 'Vui lòng nhập họ tên';
      if (Array.from(v).length < 2 || Array.from(v).length > 60) return 'Họ tên cần từ 2 đến 60 ký tự';
      try { if (!/^[\p{L}\p{M}' -]+$/u.test(v)) return 'Họ tên chỉ gồm chữ cái'; } catch (e) { /* trình duyệt cũ: để server kiểm tra */ }
      return '';
    }
    if (ten === 'email') {
      v = el.fEmail.value.replace(/\s+/g, '').toLowerCase();
      if (!v) return 'Vui lòng nhập email';
      if (v.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@.]+$/.test(v)) return 'Email chưa đúng định dạng';
      return '';
    }
    if (ten === 'so_dien_thoai') {
      v = chuanSdt(el.fSdt.value);
      if (!v) return 'Vui lòng nhập số điện thoại';
      if (!/^\d+$/.test(v) || v.length !== 10) return 'Số điện thoại cần đủ 10 chữ số';
      if (!/^0(3|5|7|8|9)\d{8}$/.test(v)) return 'Số điện thoại di động không hợp lệ';
      return '';
    }
    return '';
  }
  var O_FORM = { ho_ten: ['fTen', 'eTen'], email: ['fEmail', 'eEmail'], so_dien_thoai: ['fSdt', 'eSdt'], dong_y: ['fDongY', 'eDongY'] };
  function datLoi(ten, msg) {
    var o = O_FORM[ten]; if (!o) return;
    el[o[1]].textContent = msg || '';
    el[o[0]].setAttribute('aria-invalid', msg ? 'true' : 'false');
  }
  function xoaForm() {
    if (!el.regForm) return;
    el.regForm.reset();
    Object.keys(O_FORM).forEach(function (k) { datLoi(k, ''); });
    el.regMsg.textContent = '';
    el.btnReg.disabled = true;
    el.btnReg.textContent = 'Bắt đầu chơi';
    DK.dangGui = false;
  }
  function moForm() {
    G.state = 'reg';
    xoaForm();
    show('reg');
    datIdle();
    setIdleHint('');
    el.fTen.focus({ preventScroll: true });
  }
  function dinhDangSdt() {
    // Tự chèn khoảng trắng dạng 0912 345 678 khi gõ số bắt đầu bằng 0
    var v = el.fSdt.value;
    if (!/^0[\d ]*$/.test(v)) return;
    var d = v.replace(/\s/g, '').slice(0, 10);
    var f = d.length > 7 ? d.slice(0, 4) + ' ' + d.slice(4, 7) + ' ' + d.slice(7) : d.length > 4 ? d.slice(0, 4) + ' ' + d.slice(4) : d;
    if (f !== v) el.fSdt.value = f;
  }

  function guiDangKy(e) {
    e.preventDefault();
    if (DK.dangGui) return;
    initAudio();   // cú bấm thật của người dùng → mở âm thanh (iOS)
    var dau = null;
    ['ho_ten', 'email', 'so_dien_thoai'].forEach(function (k) {
      var m = kiemTruong(k); datLoi(k, m);
      if (m && !dau) dau = el[O_FORM[k][0]];
    });
    if (!el.fDongY.checked) { datLoi('dong_y', 'Vui lòng đồng ý với điều khoản để tham gia'); dau = dau || el.fDongY; }
    if (dau) { dau.focus(); return; }

    DK.dangGui = true;
    el.btnReg.disabled = true;
    el.btnReg.textContent = 'Đang gửi…';
    el.regMsg.textContent = '';
    fetchHetGio('/api/dang-ky', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ho_ten: el.fTen.value, email: el.fEmail.value, so_dien_thoai: el.fSdt.value, dong_y: el.fDongY.checked })
    }, 8000).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (b) { return { s: r.status, b: b }; });
    }).then(function (kq) {
      if (G.state !== 'reg') return;
      if (kq.s === 201 && kq.b.phien) {
        DK.phien = kq.b.phien;
        DK.dangGui = false;
        el.btnReg.textContent = 'Bắt đầu chơi';
        batDauLuot();
        return;
      }
      if (kq.s === 422 && kq.b.loi) {
        Object.keys(kq.b.loi).forEach(function (k) { datLoi(k, kq.b.loi[k]); });
        var k0 = Object.keys(kq.b.loi)[0];
        if (O_FORM[k0]) el[O_FORM[k0][0]].focus();
      } else if (kq.s === 409 || kq.s === 429) {
        el.regMsg.textContent = kq.b.thong_bao || 'Không đăng ký được, vui lòng thử lại.';
      } else {
        el.regMsg.textContent = 'Chưa lưu được đăng ký, vui lòng thử lại.';
      }
      ketThucGui();
    }).catch(function () {
      if (G.state !== 'reg') return;
      el.regMsg.textContent = 'Chưa lưu được đăng ký, vui lòng thử lại.';
      ketThucGui();
    });
  }
  function ketThucGui() {
    DK.dangGui = false;
    el.btnReg.textContent = 'Bắt đầu chơi';
    el.btnReg.disabled = !el.fDongY.checked;
  }

  /* CN-20 · Gửi kết quả lượt. Lỗi mạng → thử lại, rồi lưu tạm (không có thông tin cá nhân). */
  function docHangDoi() {
    try { var a = JSON.parse(store.get(KHOA_HANG_DOI) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  }
  function ghiHangDoi(a) { store.set(KHOA_HANG_DOI, JSON.stringify(a.slice(-50))); }
  function guiMotLuot(muc) {
    return fetchHetGio('/api/luot-choi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + muc.phien },
      body: JSON.stringify(muc.luot)
    }, 8000).then(function (r) { return r.status; });
  }
  function guiLuot(phien, luot) {
    var muc = { phien: phien, luot: luot, luc: Date.now() };
    var lan = 0, cho = [2000, 5000];
    (function thu() {
      guiMotLuot(muc).then(function (s) {
        if (s >= 500 || s === 429) throw new Error('thử lại');
        // 2xx: xong. 401/422: bỏ lượt, không thử lại (QT-23)
      }).catch(function () {
        if (lan < cho.length) { setTimeout(thu, cho[lan++]); return; }
        var a = docHangDoi(); a.push(muc); ghiHangDoi(a);
      });
    })();
  }
  function guiHangDoi() {
    var a = docHangDoi().filter(function (m) { return Date.now() - m.luc < 24 * 3600 * 1000; });
    if (!a.length) { ghiHangDoi([]); return; }
    var conLai = [];
    a.reduce(function (p, m) {
      return p.then(function () {
        return guiMotLuot(m).then(function (s) { if (s >= 500 || s === 429) conLai.push(m); }, function () { conLai.push(m); });
      });
    }, Promise.resolve()).then(function () { ghiHangDoi(conLai); });
  }
  window.addEventListener('online', function () { if (DK.bat) guiHangDoi(); });

  /* ---------------- QT-02, QT-03 · Sinh con vật ---------------- */
  function chonLoai(t) {
    var r = rand(), loai;
    if (t < CAU_HINH.haiCauTuGiay) {
      loai = r < CAU_HINH.tiLe.truoc10s.vang ? 'vang' : 'thuong';
    } else {
      var p = CAU_HINH.tiLe.tu10s;
      loai = r < p.haiCau ? 'haiCau' : r < p.haiCau + p.vang ? 'vang' : 'thuong';
    }
    if (loai === 'haiCau') {
      var coHaiCau = G.animals.some(function (a) { return a.loai === 'haiCau' && a.state === 'alive'; });
      if (G.sealStreak >= CAU_HINH.haiCauLienTiepToiDa) loai = 'thuong';
      else if (coHaiCau) loai = rand() < p.vang / (p.vang + p.thuong) ? 'vang' : 'thuong';
    }
    G.sealStreak = loai === 'haiCau' ? G.sealStreak + 1 : 0;
    return loai;
  }
  function chonLo() {
    var occupied = {};
    G.animals.forEach(function (a) { occupied[a.lo] = true; });
    var ok = [];
    for (var i = 0; i < 9; i++) if (!occupied[i] && i !== G.lastVacated) ok.push(i);
    if (!ok.length) for (var j = 0; j < 9; j++) if (!occupied[j]) ok.push(j);
    return ok[Math.floor(rand() * ok.length)];
  }
  function sinh(k, t) {
    var gd = CAU_HINH.giaiDoan[phaseIdx(t)];
    var loai = chonLoai(t);
    var a = {
      id: G.nextId++, loai: loai, lo: chonLo(), kenh: k, batDau: t,
      trenSan: between(gd.trenSan) * (loai === 'vang' ? CAU_HINH.heSoChimVang : 1),
      state: 'alive', freeAt: 0
    };
    G.animals.push(a);
    G.kenh[k].busy = a;
    var c = cells[a.lo];
    c.use.setAttribute('href', '#' + loai);
    c.el.className = 'cell up ' + loai;
  }
  function giaiPhongKenh(a, t) {
    var ch = G.kenh[a.kenh];
    if (ch.busy === a) {
      ch.busy = null;
      ch.next = t + between(CAU_HINH.giaiDoan[phaseIdx(t)].nghi);
    }
  }

  /* ---------------- QT-04, QT-05, QT-06 · Bấm và tính điểm ---------------- */
  function onCellDown(i, e) {
    e.preventDefault();
    if (G.state !== 'playing') return;
    var now = performance.now();
    var ts = (e.timeStamp && e.timeStamp <= now && e.timeStamp > now - 1000) ? e.timeStamp : now;
    var t = playedNow(ts);
    if (t >= CAU_HINH.thoiGianLuot) return;
    G.stats.bam++;
    var a = null;
    for (var n = 0; n < G.animals.length; n++) {
      var x = G.animals[n];
      if (x.lo === i && x.state === 'alive' && t >= x.batDau && t < x.batDau + x.trenSan) { a = x; break; }
    }
    if (!a) { manhBang(i, e); return; }
    danhTrung(a, t);
  }

  function danhTrung(a, t) {
    a.state = 'leaving';
    a.freeAt = t + CAU_HINH.thoiGianBiDap;
    giaiPhongKenh(a, t);
    var c = cells[a.lo].el;
    c.classList.add('hit');
    var id = a.id;
    later(function () { if (G.animals.indexOf(a) >= 0 && a.id === id) c.classList.remove('up', 'hit'); }, 110);

    if (a.loai === 'haiCau') {
      G.combo = 0;
      G.score = Math.max(0, G.score + CAU_HINH.diem.haiCau);
      G.stats.haiCau++;
      chuBay(a.lo, '−2', true);
      am.sai(); rung(60);
      if (!reduceMotion.matches) { el.board.classList.remove('shake'); void el.board.offsetWidth; el.board.classList.add('shake'); }
    } else {
      G.combo++;
      if (G.combo > G.comboMax) G.comboMax = G.combo;
      var heSo = G.combo >= CAU_HINH.comboNhan ? CAU_HINH.heSoCombo : 1;
      var cong = CAU_HINH.diem[a.loai] * heSo;
      G.score += cong;
      G.stats[a.loai]++;
      chuBay(a.lo, '+' + cong, false);
      var b = document.createElement('span'); b.className = 'burst'; b.textContent = '✦✧✦';
      c.appendChild(b); later(function () { b.remove(); }, 400);
      if (a.loai === 'vang') am.bopVang(); else am.bop();
      rung(20);
    }
    veCombo();
  }

  function chuBay(lo, text, bad) {
    var f = document.createElement('span');
    f.className = 'float' + (bad ? ' bad' : '');
    f.textContent = text;
    cells[lo].el.appendChild(f);
    later(function () { f.remove(); }, 650);
  }
  function manhBang(i, e) {
    var c = cells[i].el, r = c.getBoundingClientRect();
    var x = e.clientX - r.left, y = e.clientY - r.top;
    var n = 3 + Math.floor(Math.random() * 3);
    for (var k = 0; k < n; k++) {
      var s = document.createElement('span');
      var ang = Math.random() * Math.PI * 2, dist = 18 + Math.random() * 22;
      s.className = 'shard';
      s.style.cssText = '--x:' + (x - 4) + 'px;--y:' + (y - 4) + 'px;--dx:' + Math.cos(ang) * dist + 'px;--dy:' + Math.sin(ang) * dist + 'px';
      c.appendChild(s);
      (function (node) { later(function () { node.remove(); }, 450); })(s);
    }
  }

  /* ---------------- Vòng lặp lượt chơi ---------------- */
  function capNhatLuot(t) {
    var T = CAU_HINH.thoiGianLuot;

    // Con vật hết thời gian trên sân → lặn xuống (QT-04)
    for (var n = 0; n < G.animals.length; n++) {
      var a = G.animals[n];
      var het = a.batDau + a.trenSan;
      if (a.state === 'alive' && t >= het) {
        a.state = 'leaving';
        a.freeAt = het + CAU_HINH.thoiGianLan;
        giaiPhongKenh(a, het);
        cells[a.lo].el.classList.remove('up');
        if (a.loai !== 'haiCau') { G.combo = 0; veCombo(); }
      }
    }
    // Lặn xong → lỗ trống
    G.animals = G.animals.filter(function (a) {
      if (a.state === 'leaving' && t >= a.freeAt) {
        G.lastVacated = a.lo;
        cells[a.lo].el.className = 'cell';
        return false;
      }
      return true;
    });

    // Thông báo giai đoạn (CN-08)
    if (!G.toast10 && t >= CAU_HINH.giaiDoan[1].tu) { G.toast10 = true; thongBao(CAU_HINH.giaiDoan[1].ten + '!', 'violet'); }
    if (!G.toast20 && t >= CAU_HINH.giaiDoan[2].tu) { G.toast20 = true; G.storm = true; thongBao(CAU_HINH.giaiDoan[2].ten + '!', 'pink'); }

    // Sinh con vật theo kênh (QT-03)
    var p = phaseIdx(t);
    for (var k = 0; k < 2; k++) {
      var ch = G.kenh[k];
      if (k === 1) {
        if (p < 2) continue;
        if (ch.next === null) ch.next = CAU_HINH.giaiDoan[2].tu + between(CAU_HINH.giaiDoan[2].nghi);
      }
      if (!ch.busy && t >= ch.next && T - t >= CAU_HINH.khongSinhKhiConDuoi) sinh(k, t);
    }

    // Tích tắc 5 giây cuối (CN-03)
    var disp = Math.max(0, Math.ceil(T - t - 1e-9));
    if (disp !== G.lastSec) {
      G.lastSec = disp;
      if (disp >= 1 && disp <= 5) am.tich(disp === 1);
    }

    if (t >= T) { ketThucLuot(); return; }
    veHud(t);
  }

  function thongBao(text, color) {
    var n = el.toast;
    n.textContent = text;
    n.className = 'phase-toast';
    void n.offsetWidth;
    n.className = 'phase-toast show ' + color;
    el.slot.classList.add('toasting');
    el.aurora.classList.add('flash');
    later(function () { el.slot.classList.remove('toasting'); el.aurora.classList.remove('flash'); n.className = 'phase-toast'; }, 1000);
  }

  function veHud(t) {
    var T = CAU_HINH.thoiGianLuot;
    var con = Math.max(0, T - t);
    var disp = Math.max(0, Math.ceil(con - 1e-9));
    el.score.textContent = String(G.score);
    el.time.textContent = String(disp);
    el.comboVal.textContent = String(G.combo);
    el.bar.style.transform = 'scaleX(' + (con / T) + ')';
    var p = phaseIdx(t);
    el.timebar.className = 'timebar p' + p;
    el.phases.forEach(function (s, i) { s.classList.toggle('on', i === p); });
    var cuoi = con <= 5 && con > 0;
    el.pillTime.classList.toggle('danger', cuoi);
    el.pillTime.classList.toggle('blink', cuoi && G.state === 'playing');
  }
  function veCombo() {
    var c = G.combo;
    if (c < 2) { el.combo.hidden = true; el.combo.className = 'combo'; return; }
    el.combo.hidden = false;
    if (c >= CAU_HINH.comboNhan) {
      el.combo.innerHTML = 'Combo ×' + CAU_HINH.heSoCombo + ' 🔥<em>' + c + ' liên tiếp</em>';
      if (!el.combo.classList.contains('x2')) el.combo.className = 'combo x2';
    } else {
      el.combo.textContent = 'Combo ' + c;
      el.combo.className = 'combo';
    }
  }

  /* ---------------- CN-13 · Tạm dừng ---------------- */
  function pause() {
    if (G.state === 'playing') {
      G.segPlayed = playedNow(performance.now());
      G.running = false;
      G.resumeTo = 'playing';
    } else if (G.state === 'countdown') {
      G.resumeTo = 'countdown';
      el.ovCount.hidden = true;
    } else return;
    G.state = 'paused';
    el.board.classList.add('covered', 'paused');
    el.pillTime.classList.remove('blink');
    el.ovPause.hidden = false;
    el.btnPause.textContent = '▶';
    el.btnPause.setAttribute('aria-label', 'Tiếp tục');
    if (ac && ac.state === 'running') ac.suspend();
    datIdle();
    el.btnResume.focus({ preventScroll: true });
  }
  function resume() {
    if (G.state !== 'paused') return;
    if (ac) ac.resume();
    el.ovPause.hidden = true;
    el.btnPause.textContent = '⏸';
    el.btnPause.setAttribute('aria-label', 'Tạm dừng');
    el.board.classList.remove('covered', 'paused');
    setIdleHint('');
    if (G.resumeTo === 'countdown') { startCountdown(); return; }
    G.state = 'playing';
    G.segPerf = performance.now();
    G.running = true;
  }

  /* ---------------- CN-14 · Tự về trang chủ ---------------- */
  function datIdle() { G.idleUntil = Date.now() + CAU_HINH.tuVeTrangChu * 1000; }
  function setIdleHint(s) { el.idleHints.forEach(function (h) { h.textContent = s; }); }
  function kiemTraIdle() {
    if (G.state !== 'paused' && G.state !== 'end' && G.state !== 'reg') return;
    var con = G.idleUntil - Date.now();
    if (con <= 0) { goHome(); return; }
    setIdleHint(con <= CAU_HINH.nhacTuVe * 1000 ? 'Tự về trang chủ sau ' + Math.ceil(con / 1000) + ' giây' : '');
  }
  setInterval(kiemTraIdle, 250);

  /* ---------------- CN-10, CN-11 · Kết thúc lượt ---------------- */
  function ketThucLuot() {
    var T = CAU_HINH.thoiGianLuot;
    G.running = false; G.segPlayed = T;
    G.state = 'end';
    G.storm = false;
    // Mọi con vật biến mất ngay
    G.animals = [];
    cells.forEach(function (c) { c.el.className = 'cell instant'; });
    veHud(T);
    el.pillTime.classList.remove('blink');
    datIdle();

    // QT-10: ghi điểm một lần, ngay khi vào KET_THUC
    var sao = tinhSao(G.score);
    var kyLucMoi = G.score > G.kyLucCu;
    var viTri = -1;
    if (G.score > 0) {
      var kq = xepBang(bang, { diem: G.score, sao: sao, ngay: new Date().toISOString() });
      bang = kq.ds; viTri = kq.viTri;
      ghiBang(bang);
    }

    // v1.1 · CN-20: gửi kết quả lượt về server (không chờ, màn hình kết thúc hiện ngay)
    if (DK.bat && DK.phien && G.maLuot) {
      guiLuot(DK.phien, {
        ma_luot: G.maLuot, diem: G.score,
        so_thuong: G.stats.thuong, so_vang: G.stats.vang, so_hai_cau: G.stats.haiCau,
        so_lan_bam: G.stats.bam, combo_dai_nhat: G.comboMax
      });
      G.maLuot = null;
    }

    el.timeup.hidden = false;
    later(function () { hienKetQua(sao, kyLucMoi, viTri); }, 1000);
  }

  function hienKetQua(sao, kyLucMoi, viTri) {
    el.timeup.hidden = true;
    el.stars.forEach(function (s) { s.classList.remove('on'); });
    el.starMsg.textContent = '';
    el.ribbon.hidden = true;
    el.endScore.textContent = '0';
    el.btnReplay.disabled = true; el.btnHome.disabled = true;
    var st = G.stats;
    el.stThuong.textContent = st.thuong;
    el.stVang.textContent = st.vang;
    el.stHaiCau.textContent = st.haiCau;
    el.stTile.textContent = st.bam ? Math.round((st.thuong + st.vang) / st.bam * 100) + '%' : '—';
    el.stCombo.textContent = G.comboMax;
    veTop5(viTri);
    G.party = true;
    show('end');

    // Sao hiện lần lượt kèm "ting" (thứ tự trái → giữa → phải)
    for (var i = 0; i < sao; i++) {
      (function (k) {
        later(function () { el.stars[k].classList.add('on'); am.ting(k); }, 300 + k * 350);
      })(i);
    }
    later(function () { el.starMsg.textContent = CAU_HINH.loiNhanSao[sao]; }, 300 + sao * 350);

    // Điểm đếm nhanh lên
    var start = performance.now(), dich = G.score;
    (function dem() {
      var k = Math.min(1, (performance.now() - start) / 600);
      el.endScore.textContent = String(Math.round(dich * (reduceMotion.matches ? 1 : k)));
      if (k < 1 && G.state === 'end') requestAnimationFrame(dem);
    })();

    if (kyLucMoi) {
      later(function () { el.ribbon.hidden = false; phaoHoa(); am.phaoHoa(); }, 300 + sao * 350 + 100);
    }
    later(function () {
      el.btnReplay.disabled = false; el.btnHome.disabled = false;
      el.btnReplay.focus({ preventScroll: true });
    }, Math.max(1500, 300 + sao * 350 + 300));
  }

  function veTop5(viTri) {
    el.top5.innerHTML = '';
    if (!bang.length) {
      var li0 = document.createElement('li'); li0.className = 'empty'; li0.textContent = 'Chưa có lượt nào';
      el.top5.appendChild(li0); return;
    }
    bang.forEach(function (d, i) {
      var li = document.createElement('li');
      if (i === viTri) li.className = 'new';
      var nd = new Date(d.ngay);
      var ngay = ('0' + nd.getDate()).slice(-2) + '/' + ('0' + (nd.getMonth() + 1)).slice(-2);
      li.innerHTML = '<span>' + (i + 1) + '.</span><span>' + d.diem + (i === viTri ? ' · Mới!' : '') + '</span>' +
        '<span class="s" aria-label="' + d.sao + ' sao">' + '★★★'.slice(0, d.sao) + '</span><span class="d">' + ngay + '</span>';
      el.top5.appendChild(li);
    });
  }

  /* ---------------- Lớp 6: tuyết rơi + pháo hoa (canvas) ---------------- */
  var cv = $('#snow'), cx = cv.getContext('2d'), W = 0, H = 0, dpr = 1;
  var flakes = [], sparks = [];
  var MAU_TIEC = ['#FFD447', '#4FF0C8', '#FF8AD8', '#8A7CFF', '#FFFFFF'];
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function newFlake(anywhere) {
    return { x: Math.random() * (W + 60) - 30, y: anywhere ? Math.random() * H : -10,
      r: 1.2 + Math.random() * 2.4, v: 30 + Math.random() * 40, drift: 10 + Math.random() * 18,
      ph: Math.random() * 6.28, color: G.party ? MAU_TIEC[Math.floor(Math.random() * MAU_TIEC.length)] : '#FFFFFF' };
  }
  function phaoHoa() {
    if (reduceMotion.matches) return;
    var tam = [[0.25, 0.25], [0.75, 0.2], [0.5, 0.35]];
    tam.forEach(function (p, i) {
      setTimeout(function () {
        for (var k = 0; k < 46; k++) {
          var ang = Math.random() * Math.PI * 2, sp = 80 + Math.random() * 160;
          sparks.push({ x: p[0] * W, y: p[1] * H, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 1.2 + Math.random() * 0.5,
            r: 2 + Math.random() * 2, color: MAU_TIEC[Math.floor(Math.random() * 4)] });
        }
      }, i * 220);
    });
  }
  function veTuyet(dt) {
    cx.clearRect(0, 0, W, H);
    if (reduceMotion.matches) { flakes.length = 0; sparks.length = 0; return; }
    var target = G.storm ? 150 : G.party ? 90 : 55;
    var speed = G.storm ? 2.3 : 1;
    var dauTien = flakes.length === 0;
    while (flakes.length < target) flakes.push(newFlake(dauTien));
    for (var i = flakes.length - 1; i >= 0; i--) {
      var f = flakes[i];
      f.y += f.v * speed * dt;
      f.ph += dt;
      f.x += (f.drift * speed + Math.sin(f.ph) * 8) * dt;
      if (f.y > H + 10 || f.x > W + 40) {
        if (flakes.length > target) flakes.splice(i, 1); else flakes[i] = newFlake(false);
        continue;
      }
      cx.globalAlpha = 0.85;
      cx.fillStyle = f.color;
      cx.beginPath(); cx.arc(f.x, f.y, f.r, 0, 6.283); cx.fill();
    }
    for (var j = sparks.length - 1; j >= 0; j--) {
      var s = sparks[j];
      s.life -= dt;
      if (s.life <= 0) { sparks.splice(j, 1); continue; }
      s.vy += 140 * dt; s.vx *= 0.985; s.vy *= 0.985;
      s.x += s.vx * dt; s.y += s.vy * dt;
      cx.globalAlpha = Math.min(1, s.life);
      cx.fillStyle = s.color;
      cx.beginPath(); cx.arc(s.x, s.y, s.r, 0, 6.283); cx.fill();
    }
    cx.globalAlpha = 1;
  }
  window.addEventListener('resize', resize);
  resize();

  /* ---------------- Vòng lặp chính ---------------- */
  var lastFrame = 0, fps = 60;
  function frame(now) {
    var dt = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 0;
    lastFrame = now;
    if (dt > 0) fps = fps * 0.92 + (1 / dt) * 0.08;
    if (G.state === 'countdown') tickCountdown(now);
    if (G.state === 'playing') capNhatLuot(playedNow(now));
    if (G.state !== 'end' && G.party) G.party = false;
    veTuyet(dt);
    if (DEBUG) veDebug(now);
    requestAnimationFrame(frame);
  }

  function veDebug(now) {
    var t = (G.state === 'playing' || G.state === 'paused') ? playedNow(now) : (G.state === 'end' ? CAU_HINH.thoiGianLuot : 0);
    var song = G.animals ? G.animals.filter(function (a) { return a.state === 'alive'; }) : [];
    el.debug.textContent =
      'trạng thái: ' + G.state + '\n' +
      'đã chơi:    ' + t.toFixed(2) + 's\n' +
      'giai đoạn:  ' + (phaseIdx(t) + 1) + ' · ' + CAU_HINH.giaiDoan[phaseIdx(t)].ten + '\n' +
      'trên sân:   ' + song.length + ' ' + song.map(function (a) { return a.loai + '@' + a.lo + '(' + a.trenSan.toFixed(2) + 's)'; }).join(' ') + '\n' +
      'lỗ vừa trống: ' + G.lastVacated + '\n' +
      'FPS:        ' + Math.round(fps) + '\n' +
      'seed:       ' + (SEED === null ? '—' : SEED);
  }

  /* ---------------- Sự kiện ---------------- */
  cells.forEach(function (c, i) {
    c.el.addEventListener('pointerdown', function (e) { onCellDown(i, e); });
  });
  el.grid.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  el.play.addEventListener('touchstart', function (e) { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  document.addEventListener('dblclick', function (e) { e.preventDefault(); });

  // v1.1: có server và chưa có phiên → mở form đăng ký trước (CN-17)
  el.btnStart.addEventListener('click', function () {
    if (DK.bat && !DK.phien) { initAudio(); moForm(); } else batDauLuot();
  });
  el.regForm.addEventListener('submit', guiDangKy);
  el.btnRegBack.addEventListener('click', goHome);
  el.fDongY.addEventListener('change', function () {
    if (!DK.dangGui) el.btnReg.disabled = !el.fDongY.checked;
    if (el.fDongY.checked) datLoi('dong_y', '');
  });
  [['ho_ten', 'fTen'], ['email', 'fEmail'], ['so_dien_thoai', 'fSdt']].forEach(function (p) {
    el[p[1]].addEventListener('blur', function () { if (el[p[1]].value) datLoi(p[0], kiemTruong(p[0])); });
    el[p[1]].addEventListener('input', function () { if (el[p[1]].getAttribute('aria-invalid') === 'true') datLoi(p[0], kiemTruong(p[0])); });
  });
  el.fSdt.addEventListener('input', dinhDangSdt);
  el.btnDk.addEventListener('click', function () {
    if (el.dlgDk.showModal) el.dlgDk.showModal(); else window.alert(el.dkNoiDung.textContent);
  });
  el.btnPause.addEventListener('click', function () { if (G.state === 'paused') resume(); else pause(); });
  el.btnResume.addEventListener('click', resume);
  el.btnPauseHome.addEventListener('click', goHome);       // lượt bị huỷ, không lưu
  el.btnReplay.addEventListener('click', function () { G.party = false; batDauLuot(); });
  el.btnHome.addEventListener('click', goHome);
  $$('.js-sound').forEach(function (b) {
    b.addEventListener('click', function () {
      amThanh = !amThanh;
      capNhatNutAm();
      if (amThanh) initAudio();
    });
  });

  document.addEventListener('keydown', function (e) {
    if (G.state === 'paused' || G.state === 'end' || G.state === 'reg') datIdle();
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
      if (G.state === 'playing' || G.state === 'countdown') { e.preventDefault(); pause(); }
      else if (G.state === 'paused') { e.preventDefault(); resume(); }
    }
  });
  document.addEventListener('pointerdown', function () {
    if (G.state === 'paused' || G.state === 'end' || G.state === 'reg') datIdle();
  }, true);

  // QT-08: ẩn tab / khoá máy / rời trang → tự tạm dừng
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pause();
    else { kiemTraIdle(); lastFrame = 0; }
  });
  window.addEventListener('pagehide', pause);

  /* ---------------- QT-11 · Công cụ debug ---------------- */
  if (DEBUG) {
    el.debug.hidden = false;
    window.dcc = {
      cauHinh: CAU_HINH,
      tinhSao: tinhSao,
      xepBang: xepBang,
      bangDiem: function () { return bang.slice(); },
      /** Bốc thử n lần loại con vật tại thời điểm t (giây), để kiểm tra tỉ lệ (TC-13). */
      thuLoai: function (n, t) {
        var luu = [G.sealStreak, G.animals], m = { thuong: 0, vang: 0, haiCau: 0 };
        G.animals = [];
        for (var k = 0; k < n; k++) m[chonLoai(t)]++;
        G.sealStreak = luu[0]; G.animals = luu[1];
        return m;
      },
      trangThai: function () { return G; }
    };
  }

  /* ---------------- Khởi động ---------------- */
  capNhatNutAm();
  resetRound();
  goHome();
  kiemTraServer();
  requestAnimationFrame(frame);
})();
