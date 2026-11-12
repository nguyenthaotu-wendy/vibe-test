# YÊU CẦU — Mini game "Đập Chim Cánh Cụt"

> Phiên bản: 1.0 · Ngày: 12/11/2026 · Trạng thái: Bản nháp, chưa viết code

## 1. Tổng quan

- **Thể loại:** game phản xạ, người chơi bấm vào con vật khi nó trồi lên khỏi lỗ.
- **Nền tảng:** chạy trên trình duyệt (máy tính và điện thoại), không cần cài đặt.
- **Đối tượng:** mọi lứa tuổi, mỗi lượt chơi ngắn (30 giây).
- **Phạm vi:** 1 người chơi, chơi offline trên máy, không cần tài khoản hay server.

## 2. Luật chơi

1. Sân chơi là **lưới 3×3 = 9 ô (lỗ băng)**.
2. Khi bắt đầu lượt, đồng hồ đếm ngược **30 giây**.
3. Trong suốt lượt, **chim cánh cụt** lần lượt trồi lên ở một ô ngẫu nhiên, ở lại một khoảng ngắn rồi lặn xuống.
4. Người chơi **bấm (click chuột hoặc chạm màn hình)** vào chim cánh cụt khi nó đang trồi lên.
5. Mỗi thời điểm có **tối đa 1 chim cánh cụt** trên sân.
6. Chim cánh cụt **không trồi lên lại ngay ô vừa xuất hiện** ở lần trước.
7. Thời gian chim ở trên mặt băng: **khoảng 0,8–1,2 giây** (ngẫu nhiên trong khoảng này). Khoảng nghỉ giữa hai lần trồi: **0,2–0,5 giây**.
8. Khi bị bấm trúng, chim lập tức lặn xuống (kèm hiệu ứng "bị đập") và không thể bấm trúng lần thứ hai.
9. Bấm vào ô trống hoặc bấm trượt **không bị trừ điểm**.
10. Hết 30 giây: lượt kết thúc, chim đang trên sân biến mất, mọi cú bấm sau đó không được tính.

## 3. Cách tính điểm

| Hành động | Điểm |
|---|---|
| Bấm trúng chim cánh cụt đang trồi lên | **+1** |
| Bấm vào ô trống / bấm trượt | 0 |
| Bấm lại chim đã bị đập (đang lặn xuống) | 0 |
| Bấm sau khi hết giờ | 0 |

- Điểm bắt đầu mỗi lượt là **0**.
- **Điểm cao nhất (kỷ lục)** được lưu trên trình duyệt (localStorage), vẫn còn khi tải lại trang.
- Cuối lượt, nếu điểm lượt này lớn hơn kỷ lục thì cập nhật kỷ lục và báo **"Kỷ lục mới!"**.
- Hiển thị thêm thống kê cuối lượt: số lần trúng, tổng số lần chim xuất hiện, tỉ lệ trúng (%).

## 4. Màn hình

### 4.1. Màn hình bắt đầu
- Tên game: **Đập Chim Cánh Cụt**.
- Luật chơi tóm tắt 1–2 dòng (ví dụ: "Bấm trúng chim cánh cụt để ghi điểm. Bạn có 30 giây!").
- Hiển thị **kỷ lục hiện tại** (hoặc "Chưa có kỷ lục").
- Nút **"Bắt đầu"**.

### 4.2. Màn hình chơi
- **Thanh trên cùng:** Điểm hiện tại · Thời gian còn lại (giây) · Kỷ lục.
- **Giữa màn hình:** lưới 3×3 các lỗ băng, các ô bằng nhau, vừa màn hình (cả dọc lẫn ngang).
- Chim cánh cụt có hiệu ứng **trồi lên / lặn xuống**; khi bị đập có hiệu ứng riêng (rung, sao bay, hoặc chữ "+1").
- **10 giây cuối:** đồng hồ đổi màu (ví dụ đỏ) để báo sắp hết giờ.
- (Tuỳ chọn) Nút tạm dừng / bật-tắt âm thanh.

### 4.3. Màn hình kết thúc
- Thông báo **"Hết giờ!"**.
- Điểm của lượt vừa chơi, thống kê (trúng / xuất hiện / tỉ lệ %).
- Kỷ lục, kèm dòng **"Kỷ lục mới!"** nếu có.
- Nút **"Chơi lại"** (vào lượt mới ngay) và **"Về màn hình chính"**.

### 4.4. Yêu cầu chung về giao diện
- Hiển thị tốt trên màn hình từ **360px** (điện thoại) đến màn hình máy tính.
- Ô bấm đủ lớn cho ngón tay (tối thiểu ~64×64px).
- Phong cách vui nhộn, chủ đề băng tuyết; hình ảnh và âm thanh là tài nguyên tự làm hoặc có giấy phép sử dụng.
- Toàn bộ chữ trong game bằng **tiếng Việt**.

## 5. Tiêu chí hoàn thành

Game được coi là hoàn thành khi **đạt tất cả** các mục sau:

**Chức năng**
- [ ] Mở file/trang trên trình duyệt là chơi được, không cần cài thêm gì.
- [ ] Có đủ 3 màn hình: bắt đầu, chơi, kết thúc; chuyển giữa các màn hình đúng luồng.
- [ ] Lưới hiển thị đúng 3×3 = 9 ô.
- [ ] Mỗi lượt kéo dài đúng 30 giây (sai lệch không quá ±0,5 giây); đồng hồ đếm ngược hiển thị đúng.
- [ ] Mỗi thời điểm có tối đa 1 chim cánh cụt; không trồi lại ngay ô cũ.
- [ ] Bấm trúng chim được +1 điểm; mỗi lần xuất hiện chỉ tính điểm tối đa 1 lần.
- [ ] Bấm trượt, bấm ô trống, bấm sau khi hết giờ không làm thay đổi điểm.
- [ ] Hết giờ thì dừng hẳn: chim không xuất hiện thêm, không bấm được nữa.
- [ ] Kỷ lục được lưu và vẫn đúng sau khi tải lại trang; "Kỷ lục mới!" chỉ hiện khi vượt kỷ lục cũ.
- [ ] "Chơi lại" đưa điểm về 0 và thời gian về 30 giây.

**Tương thích & trải nghiệm**
- [ ] Chạy được trên Chrome, Edge, Firefox, Safari bản mới nhất.
- [ ] Chơi được bằng chuột (máy tính) và bằng chạm (điện thoại), không bị phóng to/cuộn trang khi chạm nhanh.
- [ ] Hiển thị không vỡ bố cục từ màn hình 360px trở lên.
- [ ] Không có lỗi trong Console của trình duyệt khi chơi trọn 3 lượt liên tiếp.
- [ ] Phản hồi khi bấm trúng hiện ra ngay (cảm nhận không có độ trễ).

## 6. Ngoài phạm vi (phiên bản này)

- Nhiều cấp độ khó, tăng tốc theo thời gian.
- Vật cản trừ điểm (ví dụ bấm nhầm hải cẩu bị -1).
- Bảng xếp hạng online, đăng nhập, chơi nhiều người.

## 7. Ghi chú

- **Đã xác nhận:** đối tượng để bấm và ghi điểm duy nhất là **chim cánh cụt** (bấm bằng chuột hoặc chạm màn hình).
- Các thông số thời gian ở mục 2 (0,8–1,2 giây trên sân, 0,2–0,5 giây nghỉ) là đề xuất, có thể chỉnh sau khi chơi thử.
