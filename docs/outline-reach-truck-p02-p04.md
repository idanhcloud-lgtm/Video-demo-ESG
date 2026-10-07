# Dàn ý video Reach Truck – Vấn đề 02, 03, 04 và phần kết

Nguồn: video phần 1 (vấn đề 01) và `Slide_ESG_Project_V3.pptx` (slide 4–9, 12, 16, 24–30).

## Khung chung cho mỗi vấn đề (giữ đúng nhịp của vấn đề 01, ~25 giây)

| Nhịp | Thời lượng | Nội dung |
|---|---|---|
| a. Thẻ vấn đề | 4s | "PROBLEM 0x · VẤN ĐỀ 0x" + tên song ngữ + 1 câu mô tả |
| b. Phóng to bản đồ | 3s | Hai panel xanh/đỏ, zoom vào khu vực minh họa |
| c. Minh họa | 12s | Callout "CURRENT · HIỆN TẠI" (đỏ) và "ALGORITHM · THUẬT TOÁN" (xanh), có số liệu |
| d. Kết luận | 4s | Tick vào thanh tiêu đề, dòng chú thích "→ problem 0x solved" |

## Vấn đề 02 – Cross aisles not optimally utilized / Lối đi ngang chưa được sử dụng tối ưu (~21,7s) – ĐÃ DỰNG

Composition `Problem02` (`src/scenes/Problem02.tsx`).

- Sơ đồ: Kho C (`src/map/khoC.ts`), ô BIN 1,4 m, tim lối 8,65 m, quãng đường theo công thức app.
- Vị trí hàng: phiếu 28 điểm của video phần 1 (`src/data/to28.ts`), đọc từ khung hình. Kiểm chứng: với hằng số cũ 1,35 / 5,4 hai tuyến ra 1.439,6 m và 1.007,6 m, khớp 1.440 / 1.008 m trong video.
- Tuyến xanh giữ đúng thứ tự trong video phần 1. Với hằng số mới: hiện tại 1.596 m, thuật toán 1.166 m (−430 m, −26,9%).
- Phóng to lối 1–12, tô sáng lối 3–5:
  - Hiện tại: dãy 3 VT 70 → VT 20 → ra đầu dãy → dãy 4 VT 12 → VT 62 → hầm 1 → dãy 5 VT 38 → VT 98 (vào sâu, ra đầu, lại vào sâu).
  - Thuật toán: dãy 3 VT 70 → hầm 2 → dãy 5 VT 98; các điểm gần cửa (VT 62, 38, 20, 12) lấy trên đường về.
- Nhịp: thẻ vấn đề (0–4,5s) → hai tuyến đầy đủ (4,5–6,3s) → nháy 4 chỗ sang lối (6,3–9,3s) → zoom (9,3–11s) → tô sáng + callout (11–18,7s) → tick "solved" (18,7–21,7s).

## Vấn đề 03 – Scattered items / Hàng rải rác nhiều dãy (~25s)

- Thẻ vấn đề: "One B2C TO touches many aisles – A→T order creates crossing detours".
  Một phiếu B2C rải nhiều dãy, đi theo A→T tạo các đoạn cắt chéo, đi vòng.
- Minh họa: dùng ví dụ 2-opt slide 26–30 (Start → A–E).
  - Tuyến rắn bò ban đầu: 253 m, có đoạn A–B cắt C–D.
  - Cắt 2 đoạn, đảo khúc B→C: 207 m, giữ lại (xanh).
  - Thử cặp khác: 263 m, loại (đỏ, gạch ngang).
  - Bộ đếm: 253 → 207 m (−46 m).
- Câu chốt nên dùng: "Items stay scattered – the algorithm visits them in the shortest order".
  Không làm hàng bớt rải rác, mà chọn thứ tự đi ngắn nhất.
- Kết luận: "Detours removed → problem 03 solved".

## Vấn đề 04 – Morning congestion / Ùn tắc đầu buổi sáng (~25s)

- Thẻ vấn đề: "9:00 AM – every printed TO starts at aisle A".
  Giờ cao điểm, mọi phiếu in theo A→T nên xe dồn về dãy A.
- Minh họa: bản đồ toàn kho, 5–6 xe xuất phát từ các cửa D khác nhau.
  - Hiện tại (đỏ): tất cả kéo về dãy A. Dãy A nhấp nháy cảnh báo, có biểu tượng đếm số xe trong dãy.
  - Thuật toán (xanh): mỗi phiếu có điểm đầu riêng theo vị trí hàng, nên xe tỏa ra nhiều dãy.
  - Callout: "Each TO gets its own start point → trucks spread out".
- Kết luận: "Trucks spread across aisles → problem 04 solved".

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
