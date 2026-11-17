/* QT-22 · Giới hạn tần suất đơn giản theo IP, lưu trong bộ nhớ */
'use strict';

function taoGioiHan(soLan, cuaSoMs) {
  const bang = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of bang) if (v.batDau + cuaSoMs < now) bang.delete(k);
  }, cuaSoMs).unref();

  /** Trả về true nếu còn được phép. */
  return function choPhep(khoa) {
    const now = Date.now();
    let v = bang.get(khoa);
    if (!v || v.batDau + cuaSoMs < now) { v = { batDau: now, dem: 0 }; bang.set(khoa, v); }
    v.dem++;
    return v.dem <= soLan;
  };
}

module.exports = { taoGioiHan };
