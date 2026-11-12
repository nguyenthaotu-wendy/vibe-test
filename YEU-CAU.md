# YÊU CẦU — Mini game "Đập Chim Cánh Cụt"

> Phiên bản: 2.1 · Ngày: 12/11/2026 · Trạng thái: Bản nháp, chưa viết code
>
> **Thay đổi ở 2.1:** thêm mục 5 "Thiết kế hình ảnh" (chủ đề, hình nền nhiều lớp, bảng màu, nhân vật, hiệu ứng) và trang xem mẫu giao diện `mau-giao-dien.html`.
>
> **Thay đổi ở 2.0 so với 1.0:** thêm 3 giai đoạn tăng tốc, chim cánh cụt vàng, hải cẩu (bấm nhầm bị trừ điểm), combo nhân điểm, đếm ngược 3-2-1, xếp hạng sao và bảng 5 điểm cao nhất.

## 1. Tổng quan

- **Thể loại:** game phản xạ, người chơi bấm vào chim cánh cụt khi nó trồi lên khỏi lỗ băng.
- **Nền tảng:** chạy trên trình duyệt (máy tính và điện thoại), không cần cài đặt.
- **Đối tượng:** mọi lứa tuổi, mỗi lượt ngắn (30 giây), dễ chơi lại nhiều lần.
- **Phạm vi:** 1 người chơi, chơi offline, không cần tài khoản hay server.
- **Điều làm game hấp dẫn:** nhịp chơi nhanh dần, phải phân biệt đúng con để bấm, phần thưởng khi bấm trúng liên tiếp, và mục tiêu sao để phá kỷ lục.

## 2. Luật chơi

### 2.1. Luật cơ bản
1. Sân chơi là **lưới 3×3 = 9 lỗ băng**.
2. Bấm **"Bắt đầu"** sẽ đếm ngược **3 – 2 – 1 – Đập!**, sau đó đồng hồ **30 giây** bắt đầu chạy.
3. Các con vật lần lượt trồi lên ở các lỗ ngẫu nhiên, ở trên mặt băng một lúc rồi lặn xuống.
4. Người chơi **bấm chuột hoặc chạm màn hình** vào con vật đang trồi lên.
5. Một con vật không trồi lên lại ngay ở lỗ nó vừa rời đi. Hai con vật không bao giờ ở cùng một lỗ.
6. Con vật bị bấm trúng lặn xuống ngay (kèm hiệu ứng) và không thể bấm trúng lần thứ hai.
7. Hết 30 giây thì lượt kết thúc: mọi con vật trên sân biến mất, các cú bấm sau đó không được tính.

### 2.2. Các loại con vật

| Con vật | Tỉ lệ xuất hiện | Thời gian trên sân | Khi bị bấm trúng |
|---|---|---|---|
| 🐧 **Chim cánh cụt thường** | ~80% | theo giai đoạn (mục 2.3) | **+1 điểm**, combo +1 |
| ✨ **Chim cánh cụt vàng** | ~8% | ngắn hơn: bằng 60% của chim thường | **+3 điểm**, combo +1 |
| 🦭 **Hải cẩu** (không được đập) | ~12%, chỉ từ giây thứ 10 trở đi | như chim thường | **−2 điểm**, combo về 0 |

- Hải cẩu phải trông **khác hẳn** chim cánh cụt (màu, dáng) để người chơi phân biệt được trong chưa tới 1 giây.
- Để hải cẩu tự lặn xuống thì không bị phạt gì.
- Điểm không bao giờ xuống dưới 0.

### 2.3. Ba giai đoạn tăng tốc

| Giai đoạn | Thời gian | Số con tối đa cùng lúc | Thời gian con vật trên sân | Nghỉ giữa hai lần trồi |
|---|---|---|---|---|
| 1 · Khởi động | giây 0–10 | 1 | 1,0–1,4 giây | 0,4–0,6 giây |
| 2 · Tăng tốc | giây 10–20 | 1 | 0,8–1,1 giây | 0,3–0,5 giây |
| 3 · Bão tuyết | giây 20–30 | **2** | 0,6–0,9 giây | 0,2–0,4 giây |

- Lúc chuyển giai đoạn, hiện một thông báo ngắn ở giữa màn hình (ví dụ "Tăng tốc!", "Bão tuyết!") trong khoảng 1 giây, không che lưới.
- Các thông số thời gian và tỉ lệ ở trên là đề xuất, có thể chỉnh sau khi chơi thử.

## 3. Cách tính điểm

### 3.1. Điểm cơ bản

| Hành động | Điểm |
|---|---|
| Bấm trúng chim cánh cụt thường | **+1** |
| Bấm trúng chim cánh cụt vàng | **+3** |
| Bấm trúng hải cẩu | **−2** (không xuống dưới 0) |
| Bấm vào lỗ trống / bấm trượt | 0 |
| Bấm lại con vật đã bị đập (đang lặn xuống) | 0 |
| Bấm sau khi hết giờ | 0 |

### 3.2. Combo
- **Combo** là số lần bấm trúng chim cánh cụt (thường hoặc vàng) liên tiếp.
- Combo **về 0** khi: một chim cánh cụt lặn xuống mà không bị đập, hoặc bấm trúng hải cẩu.
- Bấm vào lỗ trống **không** làm mất combo, để game không quá khắt khe với trẻ nhỏ.
- Khi combo **từ 5 trở lên**, điểm cộng của mỗi chim cánh cụt được **nhân 2** (thường +2, vàng +6). Điểm trừ của hải cẩu không bị nhân.
- Trên màn hình chơi luôn hiện combo hiện tại. Khi bắt đầu nhân 2 thì hiện nổi bật **"Combo ×2 🔥"**.

### 3.3. Xếp hạng sao cuối lượt

| Điểm | Xếp hạng |
|---|---|
| dưới 15 | 0 sao, kèm lời động viên "Thử lại nhé!" |
| 15–29 | ⭐ |
| 30–44 | ⭐⭐ |
| từ 45 | ⭐⭐⭐ |

Các mốc này là đề xuất, chỉnh lại sau khi chơi thử sao cho người mới đạt được 1 sao và chỉ người chơi giỏi mới đạt 3 sao.

### 3.4. Lưu điểm
- **Bảng 5 điểm cao nhất** được lưu trên trình duyệt (localStorage), vẫn còn khi tải lại trang. Mỗi dòng gồm điểm, số sao và ngày chơi.
- **Kỷ lục** là dòng đầu của bảng. Khi điểm lượt vừa chơi vượt kỷ lục thì báo **"Kỷ lục mới!"** kèm hiệu ứng pháo hoa tuyết.

## 4. Màn hình

### 4.1. Màn hình bắt đầu
- Tên game **Đập Chim Cánh Cụt**, có hình chim cánh cụt nhấp nhô làm động.
- Hướng dẫn ngắn gọn bằng hình: 🐧 = +1, ✨ = +3, 🦭 = đừng đập (−2), bấm trúng 5 lần liên tiếp thì điểm ×2.
- Kỷ lục hiện tại (hoặc "Chưa có kỷ lục").
- Nút **"Bắt đầu"** và nút **bật/tắt âm thanh**.

### 4.2. Màn hình chơi
- **Thanh trên cùng:** Điểm · Thời gian còn lại · Combo · Kỷ lục.
- **Thanh thời gian** chạy ngang, đổi màu theo giai đoạn. **5 giây cuối** đồng hồ chuyển đỏ và nhấp nháy, kèm tiếng tích tắc.
- **Giữa màn hình:** lưới 3×3 lỗ băng, các ô bằng nhau, vừa màn hình cả khi cầm dọc lẫn ngang.
- **Phản hồi khi bấm:**
  - Trúng chim cánh cụt: con vật bẹp xuống, chữ **"+1"** / **"+3"** (hoặc +2 / +6 khi có combo) bay lên, kèm âm thanh "bốp".
  - Trúng hải cẩu: màn hình rung nhẹ, chữ **"−2"** màu đỏ, kèm âm thanh báo sai.
  - Bấm lỗ trống: chỉ có hiệu ứng mảnh băng văng nhỏ, không có âm thanh báo lỗi.
- Trên điện thoại hỗ trợ rung nhẹ khi bấm trúng (nếu thiết bị cho phép).
- Nút **tạm dừng**. Khi tạm dừng, đồng hồ đứng yên và lưới bị che lại để không nhìn trước được.

### 4.3. Màn hình kết thúc
- Thông báo **"Hết giờ!"**, sau đó các ngôi sao lần lượt hiện ra.
- Điểm lượt vừa chơi và dòng **"Kỷ lục mới!"** nếu có.
- **Thống kê:** số chim thường / chim vàng đã đập, số lần đập nhầm hải cẩu, tỉ lệ trúng (%), combo dài nhất.
- Bảng 5 điểm cao nhất, làm nổi bật dòng vừa đạt (nếu lọt vào bảng).
- Nút **"Chơi lại"** (vào đếm ngược 3-2-1 ngay) và **"Trang chủ"** (về màn hình bắt đầu).

### 4.4. Yêu cầu chung về giao diện
- Hiển thị tốt trên màn hình từ **360px** (điện thoại) đến màn hình máy tính.
- Ô bấm đủ lớn cho ngón tay (tối thiểu ~64×64px).
- Phong cách hình ảnh theo mục 5. Hình ảnh và âm thanh là tài nguyên tự làm hoặc có giấy phép sử dụng.
- Âm thanh mặc định bật, lựa chọn bật/tắt được ghi nhớ cho lần sau.
- Toàn bộ chữ trong game bằng **tiếng Việt**.

## 5. Thiết kế hình ảnh

> Xem minh hoạ trực quan trong file **`mau-giao-dien.html`** (mở bằng trình duyệt). Đây là ảnh tĩnh, chưa chơi được.

### 5.1. Chủ đề: "Đêm cực quang Bắc Cực"
Bầu trời đêm xanh thẫm có dải cực quang xanh ngọc, tím và hồng uốn lượn. Phía dưới là dãy núi băng và một mặt băng trắng sáng có các lỗ nước. Không khí vui, lung linh, mát mẻ. Nền tối ở trên và mặt băng sáng ở dưới giúp các con vật và nút bấm nổi bật.

### 5.2. Hình nền nhiều lớp (từ xa đến gần)

| Lớp | Mô tả | Chuyển động |
|---|---|---|
| 1. Bầu trời | Chuyển màu từ xanh đêm (trên) sang xanh nhạt (gần chân trời) | đứng yên |
| 2. Sao | Các chấm sáng nhỏ rải rác ở nửa trên | nhấp nháy chậm |
| 3. Cực quang | Các dải sáng mờ xanh ngọc, tím, hồng | trôi qua lại chậm (khoảng 9 giây một nhịp) |
| 4. Núi băng | Hai lớp núi xanh nhạt, đỉnh phủ tuyết trắng | đứng yên |
| 5. Mặt băng | Mặt băng trắng xanh, mép trên cong, có vệt phản chiếu ánh sáng | đứng yên |
| 6. Tuyết rơi | Hạt tuyết trắng nhỏ rơi chéo nhẹ | rơi liên tục; ở giai đoạn Bão tuyết rơi nhanh và dày hơn |

### 5.3. Bảng màu

| Vai trò | Màu |
|---|---|
| Đêm Bắc Cực (trời, chữ đậm) | `#0B1E3F` |
| Xanh chạng vạng (trời, viền chữ) | `#1B3A6B` |
| Cực quang | `#4FF0C8` · `#8A7CFF` · `#FF8AD8` |
| Băng | `#F4FBFF` · `#BFE3FF` · `#7FB8E6` |
| Nước trong lỗ băng | `#0F3A5C` → `#062238` |
| Cam hành động (nút chính, combo) | `#FFB547` → `#FF8A3D` |
| Vàng thưởng (chim vàng, sao) | `#FFD447` |
| Đỏ cảnh báo (−2, 5 giây cuối) | `#FF4D6D` |

### 5.4. Chữ
- Phông chữ bo tròn, dày, hỗ trợ đầy đủ dấu tiếng Việt (đề xuất: **Baloo 2**; dự phòng: Nunito hoặc phông hệ thống).
- Tên game và các thông báo lớn (Hết giờ!, Bão tuyết!) có viền chữ đậm màu xanh đêm và bóng đổ để đọc rõ trên mọi nền.
- Số điểm, thời gian dùng cỡ chữ lớn, đậm.

### 5.5. Nhân vật (tự thiết kế, vẽ dạng vector)

| Nhân vật | Ngoại hình | Mục đích |
|---|---|---|
| 🐧 Chim cánh cụt | Thân xanh đen, bụng và mặt trắng hình trái tim, mắt to tròn long lanh, má hồng, mỏ cam | Dễ thương, người chơi muốn đập |
| ✨ Chim vàng | Giống chim thường nhưng thân vàng kim, đội vương miện nhỏ, có tia lấp lánh và **hào quang vàng** phía sau | Nổi bật ngay, gợi cảm giác "phần thưởng" |
| 🦭 Hải cẩu | Thân xám tròn, có đốm, mõm trắng, ria mép, **lông mày nhướn kiểu tinh quái** | Khác hẳn chim về màu và dáng, nhìn là biết "đừng đập" |

Con vật trồi lên từ lỗ nước. Phần thân dưới mặt nước bị che đi, và có một vòng gợn sóng trắng ở chỗ con vật nhô lên.

### 5.6. Giao diện từng màn hình
- **Các khung thông tin** (điểm, thời gian, kỷ lục, bảng luật, bảng kết quả) làm dạng **kính mờ**: nền trong suốt, mờ nhẹ, viền trắng mảnh, bo góc lớn.
- **Nút chính** ("Bắt đầu", "Chơi lại"): màu cam chuyển sắc, chữ in hoa trắng, có gờ dưới tạo cảm giác nổi khối. Nút "Bắt đầu" phập phồng nhẹ để mời bấm.
- **Nút phụ** ("Trang chủ", tạm dừng, âm thanh): nền kính mờ, viền trắng.
- **Thanh thời gian** đổi màu theo giai đoạn: xanh ngọc (Khởi động) → tím (Tăng tốc) → hồng đỏ (Bão tuyết). Dưới thanh có ghi tên 3 giai đoạn.
- **Huy hiệu combo** dạng viên thuốc màu cam, hơi nghiêng, có biểu tượng 🔥. Huy hiệu chỉ hiện khi combo từ 2 trở lên và nổi bật hơn khi đạt ×2.
- **Màn hình kết thúc** có lớp phủ tối lên hình nền, một thẻ lớn ở giữa, ruy băng "Kỷ lục mới!" màu hồng tím và mưa tuyết nhiều màu (vàng, xanh ngọc, hồng).

### 5.7. Hiệu ứng chuyển động

| Lúc nào | Hiệu ứng |
|---|---|
| Con vật trồi lên / lặn xuống | Trượt lên/xuống mượt, hơi nảy ở đỉnh (khoảng 0,15 giây) |
| Đập trúng chim | Chim bẹp xuống, tia sáng ✦ toé ra, chữ "+1"/"+2"/"+3"/"+6" màu cam bay lên rồi mờ dần |
| Đập trúng hải cẩu | Màn hình rung nhẹ, chữ "−2" màu đỏ bay lên |
| Bấm lỗ trống | Vài mảnh băng nhỏ văng ra |
| Chuyển giai đoạn | Chữ "Tăng tốc!" / "Bão tuyết!" phóng to rồi mờ đi, cực quang sáng hơn trong giây lát |
| 5 giây cuối | Đồng hồ đỏ, nhấp nháy theo nhịp tích tắc |
| Kết thúc lượt | Sao xuất hiện lần lượt từng ngôi, kèm tiếng "ting" |

- Nếu máy bật chế độ **giảm chuyển động** (prefers-reduced-motion), tắt các chuyển động nền (cực quang, tuyết, nhấp nháy). Vẫn giữ các phản hồi khi bấm nhưng làm ngắn gọn.

## 6. Tiêu chí hoàn thành

Game được coi là hoàn thành khi **đạt tất cả** các mục sau.

**Luồng chơi**
- [ ] Mở trang trên trình duyệt là chơi được, không cần cài thêm gì.
- [ ] Có đủ 3 màn hình (bắt đầu, chơi, kết thúc), chuyển giữa các màn hình đúng luồng.
- [ ] Có đếm ngược 3-2-1 trước mỗi lượt. Đồng hồ 30 giây chỉ chạy sau khi đếm ngược xong.
- [ ] Mỗi lượt kéo dài đúng 30 giây (sai lệch không quá ±0,5 giây).
- [ ] Hết giờ thì dừng hẳn: không con vật nào xuất hiện thêm, không bấm được nữa.
- [ ] Tạm dừng thì đồng hồ đứng yên, tiếp tục thì chạy tiếp từ đúng chỗ đã dừng.

**Lưới và con vật**
- [ ] Lưới hiển thị đúng 3×3 = 9 ô.
- [ ] Giai đoạn 1 và 2 có tối đa 1 con vật trên sân. Giai đoạn 3 có tối đa 2 con, không bao giờ trùng lỗ.
- [ ] Hải cẩu không xuất hiện trong 10 giây đầu.
- [ ] Chơi thử 10 lượt thấy đủ cả 3 loại con vật, và chim vàng hiếm hơn rõ rệt so với chim thường.
- [ ] Thời gian trên sân giảm dần qua 3 giai đoạn, có thông báo khi chuyển giai đoạn.

**Tính điểm**
- [ ] Chim thường +1, chim vàng +3, hải cẩu −2. Mỗi lần con vật xuất hiện chỉ được tính điểm tối đa 1 lần.
- [ ] Điểm không bao giờ âm.
- [ ] Bấm trượt, bấm lỗ trống, bấm sau khi hết giờ không làm thay đổi điểm.
- [ ] Combo tăng đúng khi bấm trúng chim cánh cụt, về 0 khi để chim lặn mất hoặc bấm trúng hải cẩu, và không đổi khi bấm lỗ trống.
- [ ] Từ combo 5 trở lên, điểm chim cánh cụt được nhân 2. Điểm trừ của hải cẩu không bị nhân.
- [ ] Số sao ở màn hình kết thúc khớp với bảng mốc điểm.
- [ ] Bảng 5 điểm cao nhất và kỷ lục vẫn đúng sau khi tải lại trang. "Kỷ lục mới!" chỉ hiện khi vượt kỷ lục cũ.
- [ ] Thống kê cuối lượt (số lần đập từng loại, tỉ lệ trúng, combo dài nhất) khớp với lượt vừa chơi.

**Hình ảnh**
- [ ] Giao diện khớp với mục 5 và trang mẫu `mau-giao-dien.html`: đủ 6 lớp nền, đúng bảng màu, đúng phông chữ.
- [ ] Người chơi thử lần đầu phân biệt được chim thường, chim vàng và hải cẩu mà không cần đọc hướng dẫn.
- [ ] Mọi chữ và số trên màn hình chơi đọc rõ trên nền (chữ sáng trên nền tối hoặc có viền chữ).
- [ ] Chuyển động mượt (khoảng 60 khung hình/giây) trên điện thoại tầm trung, không giật khi tuyết rơi dày ở giai đoạn Bão tuyết.
- [ ] Khi máy bật chế độ giảm chuyển động, các chuyển động nền được tắt.

**Tương thích và trải nghiệm**
- [ ] Chạy được trên Chrome, Edge, Firefox, Safari bản mới nhất.
- [ ] Chơi được bằng chuột (máy tính) và bằng chạm (điện thoại), không bị phóng to hay cuộn trang khi chạm nhanh.
- [ ] Hiển thị không vỡ bố cục từ màn hình 360px trở lên.
- [ ] Phản hồi hình ảnh và âm thanh xuất hiện ngay khi bấm (cảm nhận không có độ trễ).
- [ ] Tắt âm thanh thì không phát bất kỳ tiếng nào, và lựa chọn này được ghi nhớ.
- [ ] Không có lỗi trong Console của trình duyệt khi chơi trọn 3 lượt liên tiếp.

## 7. Ngoài phạm vi (phiên bản này)

- Chọn mức độ khó trước khi chơi (dễ / thường / khó).
- Vật phẩm đặc biệt (thêm giờ, đóng băng thời gian, búa lớn đập nhiều ô).
- Bảng xếp hạng online, đăng nhập, chơi nhiều người.

## 8. Ghi chú

- **Đã xác nhận:** chim cánh cụt là con vật để đập và ghi điểm. Hải cẩu là con vật gây nhiễu, không được đập.
- Mọi thông số thời gian, tỉ lệ xuất hiện và mốc sao là đề xuất, cần chỉnh lại sau khi chơi thử.
