/* MH-08 · Đăng nhập admin */
(function () {
  'use strict';
  var form = document.getElementById('form-login');
  var ten = document.getElementById('ten');
  var mk = document.getElementById('mat-khau');
  var loi = document.getElementById('error');
  var nut = document.getElementById('btn-login');
  var toggle = document.getElementById('pw-toggle');

  if (/[?&]het_phien=1/.test(location.search)) {
    document.getElementById('notice').textContent = 'Phiên đăng nhập đã hết, vui lòng đăng nhập lại.';
  }

  toggle.addEventListener('click', function () {
    var hien = mk.type === 'password';
    mk.type = hien ? 'text' : 'password';
    toggle.setAttribute('aria-pressed', String(hien));
    toggle.setAttribute('aria-label', hien ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    loi.textContent = '';
    if (!ten.value || !mk.value) { loi.textContent = 'Vui lòng nhập tên đăng nhập và mật khẩu'; return; }
    nut.disabled = true; nut.textContent = 'Đang đăng nhập…';
    fetch('/admin/dang-nhap', {
      method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ten: ten.value, mat_khau: mk.value })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (b) { return { s: r.status, b: b }; });
    }).then(function (kq) {
      if (kq.s === 200) { location.replace('/admin'); return; }
      loi.textContent = kq.b.thong_bao || 'Đăng nhập không thành công';
      mk.value = ''; mk.focus();
    }).catch(function () {
      loi.textContent = 'Không kết nối được máy chủ, vui lòng thử lại.';
    }).finally(function () {
      nut.disabled = false; nut.textContent = 'Đăng nhập';
    });
  });
})();
