# Dàn ý video Reach Truck – Vấn đề 02, 03, 04 và phần kết

Nguồn: video phần 1 (vấn đề 01) và `Slide_ESG_Project_V3.pptx` (slide 4–9, 12, 16, 24–30).

## Khung chung cho mỗi vấn đề (giữ đúng nhịp của vấn đề 01, ~25 giây)

| Nhịp | Thời lượng | Nội dung |
|---|---|---|
| a. Thẻ vấn đề | 4s | "PROBLEM 0x · VẤN ĐỀ 0x" + tên song ngữ + 1 câu mô tả |
| b. Phóng to bản đồ | 3s | Hai panel xanh/đỏ, zoom vào khu vực minh họa |
| c. Minh họa | 12s | Callout "CURRENT · HIỆN TẠI" (đỏ) và "ALGORITHM · THUẬT TOÁN" (xanh), có số liệu |
| d. Kết luận | 4s | Tick vào thanh tiêu đề, dòng chú thích "→ problem 0x solved" |

## Vấn đề 02 – Cross aisles not optimally used / Lối đi ngang chưa được sử dụng tối ưu (~21s) – ĐÃ DỰNG

Composition `Problem02` (`src/scenes/Problem02.tsx`).

- Sơ đồ: Kho C (`src/map/khoC.ts`), ô BIN 1,4 m, tim lối 8,65 m, quãng đường theo công thức app.
- Vị trí hàng: phiếu 28 điểm của video phần 1 (`src/data/to28.ts`), đọc từ khung hình. Kiểm chứng: với hằng số cũ 1,35 / 5,4 hai tuyến ra 1.439,6 m và 1.007,6 m, khớp 1.440 / 1.008 m trong video.
- Tuyến xanh giữ đúng thứ tự trong video phần 1. Với hằng số mới: hiện tại 1.596 m, thuật toán 1.166 m (−430 m, −26,9%).
- Phóng to lối 1–12, tô sáng lối 3–5:
  - Hiện tại: dãy 3 VT 70 → VT 20 → ra đầu dãy → dãy 4 VT 12 → VT 62 → hầm 1 → dãy 5 VT 38 → VT 98 (vào sâu, ra đầu, lại vào sâu).
  - Thuật toán: dãy 3 VT 70 → hầm 2 → dãy 5 VT 98; các điểm gần cửa (VT 62, 38, 20, 12) lấy trên đường về.
- Đồ họa giữ đúng video phần 1 (`src/layout.ts`, `src/components/`): bố cục panel, thanh vấn đề SOLVING/SOLVED, ô kệ màu, cột cửa D1–D25, nhãn CROSS AISLE, callout, thanh chú thích, font Lexend.
- Nhịp: tab 02 sáng (0,7s) → thẻ vấn đề (1,5–5s) → thẻ thu vào tab → hai tuyến đầy đủ (5,8s) → zoom lối 2–6 (7,2s) → vệt trắng chạy trên đoạn so sánh (8,5–11s) → callout (11–16,7s) → thu zoom, ẩn điểm khác (16,7s) → SOLVED (18s) → hết (21s).

## Vấn đề 03 – Scattered items / Hàng rải rác nhiều dãy (24s) – ĐÃ DỰNG (bản 2)

Composition `Problem03` (`src/scenes/Problem03.tsx`). Cùng phiếu 28 điểm, hằng số mới.

### Chứng minh: tách 100% quãng đường theo loại di chuyển
Bản 1 so riêng đoạn về cửa (283 m vs 50 m) dễ bị xem là chọn số có lợi và không bám đề bài, nên đã thay.

| Loại di chuyển | Hiện tại (A→T) | Thuật toán | Chênh |
|---|---|---|---|
| Đổi lối (giữa các dãy) | 776 m (14 lần) | 925 m (19 lần) | +149 m |
| Chạy dọc trong cùng dãy | 505 m | 159 m | −346 m |
| Cửa ↔ điểm đầu/cuối | 315 m | 82 m | −233 m |
| Tổng | 1.596 m | 1.166 m | −430 m |

Làm tròn theo phần dư lớn nhất để ba phần luôn cộng đúng bằng tổng. Số tính tự động bằng `routeBreakdown()` (`src/map/route.ts`).

Lập luận: hàng rải theo hai chiều (15/18 lối, hai điểm cùng dãy cách xa nhau). A→T bắt xe chạy hết từng dãy giữa hai điểm và kết thúc ở góc xa. Thuật toán chấp nhận đổi lối nhiều hơn 5 lần nhưng mỗi lần vào dãy chỉ chạy tới điểm cần lấy.

### Nhịp cảnh
| Thời điểm | Nội dung |
|---|---|
| 0–5s | Tab 03 sáng, thẻ "Scattered items" – "phiếu in bắt xe chạy hết từng dãy" |
| 5,8–10s | Hai tuyến đầy đủ, vạch vàng nối hai điểm cùng dãy (thấy hàng cách xa nhau trong dãy) |
| 10–14s | Làm mờ tuyến, vệt trắng chạy trên các đoạn "chạy trong cùng dãy": 505 m vs 159 m |
| 14–21s | Thẻ trắng "Where do the metres go?": hai thanh cột chồng 3 màu mọc lên, rồi 3 ô chênh lệch +149 / −346 / −233 |
| 21–24s | Tab 03 SOLVED – "Vào dãy vừa đủ tới điểm cần lấy" |

## Vấn đề 04 – Morning congestion / Ùn tắc dãy đầu buổi sáng (25,7s) – ĐÃ DỰNG

Composition `Problem04` (`src/scenes/Problem04.tsx`). Theo slide 8: 9:00 sáng, xe dồn vào dãy A.

- **Minh họa, không phải số đo**: góc mỗi bản đồ có nhãn "ILLUSTRATION · MINH HỌA".
- 6 xe rời cửa D01–D04, D13, D19 cùng lúc, cùng tốc độ.
  - Hiện tại: phiếu in luôn bắt đầu từ dãy A → 4 xe (D01–D04) vào lối 1 (dãy CAT/CBP), xếp hàng ở VT 24/17/10/3 và đứng chờ (vòng đỏ nhấp nháy).
  - Thuật toán: cùng 4 xe đi tới lối 1, 3, 5, 7 (điểm đầu riêng của mỗi phiếu) và tiếp tục chạy.
  - 2 xe ở khu khác (lối 10, 13) giống nhau ở hai bên, cho cảnh sinh động.
- Đầu panel đếm số xe trong dãy A theo thời gian thực: 4 vs 1.
- Nhịp: thẻ vấn đề (0–5s) → banner đỏ "9:00 AM" (6,3–8,7s) → xe chạy, nhìn toàn kho (8,7–14,2s) → zoom 1,9× vào khu dãy A, lối 1–7 (14,2–15,3s) → nhấp nháy dãy A + nhãn "4 TRUCKS · 1 AISLE" / "1 TRUCK PER AISLE" (15,5s) → callout (16,5–21,3s) → thu về toàn kho (21,3–22,5s) → SOLVED (22,7–25,7s).
- Lưu ý: thuật toán tối ưu từng phiếu, không điều phối nhiều xe. Việc xe tỏa ra là hệ quả của việc mỗi phiếu bắt đầu ở điểm hàng của nó.

## Phần kết (~25s)

1. **Recap (5s):** thanh 4 vấn đề, tick lần lượt 01→04. Ghi chú nhỏ: "Problem 05 – slotting: Function B".
2. **Từ 1 phiếu → 1 tháng (10s):**
   - Phiếu mẫu: −30%.
   - Toàn bộ TO tháng 07 của reach truck: 1.065 → 876 km (−189 km, −17,7%).
   - Câu nối: "Savings vary by TO; monthly average 17.7%".
3. **ESG (6s):** E: giảm điện/pin. S: ít xe dồn lối, giảm va chạm. G: lộ trình đo lường được.
4. **End card (4s):** DTLA Warehouse Team · Innovation Project.

Tổng thời lượng dự kiến: phần 1 (70s) + phần mới (~100s) ≈ 2 phút 50 giây.

## Dữ liệu cần xác nhận trước khi dựng

- Vấn đề 04: có số liệu thực từ tuần chạy thử không (số xe trong dãy A lúc 9:00 trước/sau)?
  Nếu không có, chỉ minh họa định tính, không ghi số.
- Tỷ lệ reach truck: slide 16 ghi ↓17% / còn 83%, nhưng 189/1.065 = 17,7%. Cần thống nhất một con số.
- Tỷ lệ pallet mover: 144/2.381 = 6,0%, slide ghi 5,9% / còn 94,1%.
- Tổng quãng đường: slide 2 ghi ~3.477 km/tháng, nhưng 1.065 + 2.381 = 3.446 km.
