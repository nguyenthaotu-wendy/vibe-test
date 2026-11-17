/* MH-09, MH-10 · Danh sách người chơi, tìm kiếm, sắp xếp, phân trang, xoá, xuất CSV */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var el = {
    q: $('q'), rows: $('rows'), summary: $('summary'), range: $('range'), prev: $('btn-prev'), next: $('btn-next'),
    csv: $('btn-csv'), empty: $('empty'), emptyText: $('empty-text'), clear: $('btn-clear'), logout: $('btn-logout'),
    dlg: $('dlg-xoa'), dlgDesc: $('xoa-desc'), dlgErr: $('xoa-error'), huy: $('btn-huy'), xoa: $('btn-xoa'), toast: $('toast')
  };
  var sortBtns = Array.prototype.slice.call(document.querySelectorAll('button.sort'));

  var url = new URL(location.href);
  var S = {
    q: url.searchParams.get('q') || '',
    trang: parseInt(url.searchParams.get('trang'), 10) || 1,
    sap_xep: url.searchParams.get('sap_xep') || 'moi_nhat'
  };
  el.q.value = S.q;

  var fmt = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  function ngay(d) {
    if (!d) return '—';
    var p = {}; fmt.formatToParts(new Date(d)).forEach(function (x) { p[x.type] = x.value; });
    return p.day + '/' + p.month + ' ' + p.hour + ':' + p.minute;
  }
  function sdt(s) { return s && s.length === 10 ? s.slice(0, 4) + ' ' + s.slice(4, 7) + ' ' + s.slice(7) : (s || ''); }

  function veUrl() {
    var u = new URL(location.pathname, location.origin);
    if (S.q) u.searchParams.set('q', S.q);
    if (S.trang > 1) u.searchParams.set('trang', S.trang);
    if (S.sap_xep !== 'moi_nhat') u.searchParams.set('sap_xep', S.sap_xep);
    history.replaceState(null, '', u.pathname + u.search);
  }
  function thamSo(coTrang) {
    var p = new URLSearchParams();
    if (S.q) p.set('q', S.q);
    p.set('sap_xep', S.sap_xep);
    if (coTrang) p.set('trang', S.trang);
    return p.toString();
  }

  function goi(path, opt) {
    return fetch(path, Object.assign({ credentials: 'same-origin', cache: 'no-store' }, opt || {})).then(function (r) {
      if (r.status === 401) { location.replace('/admin/dang-nhap?het_phien=1'); throw new Error('401'); }
      return r;
    });
  }

  var dangTai = 0;
  function tai() {
    var lan = ++dangTai;
    veUrl();
    goi('/api/admin/nguoi-choi?' + thamSo(true)).then(function (r) { return r.json(); }).then(function (d) {
      if (lan !== dangTai) return;
      S.trang = d.trang;
      ve(d);
    }).catch(function (e) {
      if (e.message !== '401') thongBao('Không tải được danh sách, vui lòng thử lại.');
    });
  }

  function o(text, cls) {
    var td = document.createElement('td');
    if (cls) td.className = cls;
    td.textContent = text;
    return td;
  }

  function ve(d) {
    el.summary.textContent = d.tong + ' người · ' + d.tong_luot + ' lượt' + (S.q ? ' (theo bộ lọc)' : '');
    el.rows.textContent = '';
    d.ds.forEach(function (n) {
      var tr = document.createElement('tr');
      tr.appendChild(o(n.ho_ten, 'name'));
      tr.appendChild(o(n.email));
      tr.appendChild(o(sdt(n.so_dien_thoai), 'nowrap'));
      tr.appendChild(o(ngay(n.tao_luc), 'nowrap'));
      tr.appendChild(o(String(n.so_luot), 'num'));
      tr.appendChild(o(n.diem_cao == null ? '—' : n.diem_cao + (n.sao_cao ? ' ' + '★★★'.slice(0, n.sao_cao) : ''), 'num nowrap'));
      tr.appendChild(o(ngay(n.luot_gan_nhat), 'nowrap'));
      var td = document.createElement('td');
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'btn btn-danger btn-xs'; b.textContent = 'Xoá';
      b.setAttribute('aria-label', 'Xoá ' + n.ho_ten);
      b.addEventListener('click', function () { moXoa(n); });
      td.appendChild(b); tr.appendChild(td);
      el.rows.appendChild(tr);
    });

    var coDong = d.ds.length > 0;
    el.empty.hidden = coDong;
    if (!coDong) {
      el.emptyText.textContent = S.q ? 'Không tìm thấy người chơi phù hợp' : 'Chưa có người chơi nào đăng ký';
      el.clear.hidden = !S.q;
    }
    var tu = d.tong ? (d.trang - 1) * d.moi_trang + 1 : 0;
    var den = (d.trang - 1) * d.moi_trang + d.ds.length;
    el.range.textContent = 'Hiển thị ' + tu + '–' + den + ' / ' + d.tong;
    el.prev.disabled = d.trang <= 1;
    el.next.disabled = d.trang >= d.so_trang;

    el.csv.href = '/api/admin/nguoi-choi.csv?' + thamSo(false);
    el.csv.textContent = '⬇ Xuất CSV (' + d.tong + ')';
    el.csv.classList.toggle('disabled', d.tong === 0);
    el.csv.setAttribute('aria-disabled', String(d.tong === 0));

    sortBtns.forEach(function (b) {
      var dangChon = b.dataset.sort === S.sap_xep || b.dataset.sortAlt === S.sap_xep;
      b.classList.toggle('on', dangChon);
      b.setAttribute('aria-sort', dangChon ? (S.sap_xep === 'cu_nhat' ? 'ascending' : 'descending') : 'none');
      b.closest('th').setAttribute('aria-sort', b.getAttribute('aria-sort'));
    });
  }

  /* ----- Tìm kiếm: chờ ngừng gõ 300 ms hoặc nhấn Enter ----- */
  var hen = null;
  function apDungTim() { clearTimeout(hen); S.q = el.q.value.trim(); S.trang = 1; tai(); }
  el.q.addEventListener('input', function () { clearTimeout(hen); hen = setTimeout(apDungTim, 300); });
  el.q.addEventListener('keydown', function (e) { if (e.key === 'Enter') apDungTim(); });
  el.clear.addEventListener('click', function () { el.q.value = ''; apDungTim(); el.q.focus(); });

  sortBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      if (b.dataset.sortAlt) S.sap_xep = S.sap_xep === b.dataset.sort ? b.dataset.sortAlt : b.dataset.sort;
      else S.sap_xep = b.dataset.sort;
      S.trang = 1; tai();
    });
  });
  el.prev.addEventListener('click', function () { if (S.trang > 1) { S.trang--; tai(); } });
  el.next.addEventListener('click', function () { S.trang++; tai(); });
  el.csv.addEventListener('click', function (e) { if (el.csv.classList.contains('disabled')) e.preventDefault(); });

  /* ----- MH-10 Xoá ----- */
  var dangXoa = null;
  function moXoa(n) {
    dangXoa = n;
    el.dlgDesc.textContent = '';
    el.dlgDesc.append('Xoá ');
    var b1 = document.createElement('b'); b1.textContent = n.ho_ten; el.dlgDesc.append(b1);
    el.dlgDesc.append(' (' + sdt(n.so_dien_thoai) + ') và ');
    var b2 = document.createElement('b'); b2.textContent = n.so_luot + ' lượt chơi'; el.dlgDesc.append(b2);
    el.dlgDesc.append('. Không thể khôi phục.');
    el.dlgErr.textContent = '';
    el.xoa.disabled = false; el.xoa.textContent = 'Xoá vĩnh viễn';
    el.dlg.showModal();
    el.huy.focus();
  }
  el.huy.addEventListener('click', function () { el.dlg.close(); });
  el.xoa.addEventListener('click', function () {
    if (!dangXoa) return;
    var n = dangXoa;
    el.xoa.disabled = true; el.xoa.textContent = 'Đang xoá…';
    goi('/api/admin/nguoi-choi/' + encodeURIComponent(n.id), { method: 'DELETE' }).then(function (r) {
      if (r.status === 204) { el.dlg.close(); thongBao('Đã xoá ' + n.ho_ten); tai(); return; }
      if (r.status === 404) { el.dlg.close(); thongBao('Người chơi này đã bị xoá trước đó'); tai(); return; }
      throw new Error('loi');
    }).catch(function (e) {
      if (e.message === '401') return;
      el.dlgErr.textContent = 'Chưa xoá được, vui lòng thử lại.';
      el.xoa.disabled = false; el.xoa.textContent = 'Xoá vĩnh viễn';
    });
  });
  el.dlg.addEventListener('close', function () { dangXoa = null; });

  /* ----- Đăng xuất ----- */
  el.logout.addEventListener('click', function () {
    fetch('/admin/dang-xuat', { method: 'POST', credentials: 'same-origin' }).finally(function () { location.replace('/admin/dang-nhap'); });
  });

  var henToast = null;
  function thongBao(s) {
    el.toast.textContent = s; el.toast.hidden = false;
    clearTimeout(henToast); henToast = setTimeout(function () { el.toast.hidden = true; }, 4000);
  }

  tai();
})();
