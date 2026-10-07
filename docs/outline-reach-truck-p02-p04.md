# Dàn ý video Reach Truck – Vấn đề 02, 03, 04 và phần kết

Nguồn: video phần 1 (vấn đề 01) và `Slide_ESG_Project_V3.pptx` (slide 4–9, 12, 16, 24–30).

## Khung chung cho mỗi vấn đề (giữ đúng nhịp của vấn đề 01, ~25 giây)

| Nhịp | Thời lượng | Nội dung |
|---|---|---|
| a. Thẻ vấn đề | 4s | "PROBLEM 0x · VẤN ĐỀ 0x" + tên song ngữ + 1 câu mô tả |
| b. Phóng to bản đồ | 3s | Hai panel xanh/đỏ, zoom vào khu vực minh họa |
| c. Minh họa | 12s | Callout "CURRENT · HIỆN TẠI" (đỏ) và "ALGORITHM · THUẬT TOÁN" (xanh), có số liệu |
| d. Kết luận | 4s | Tick vào thanh tiêu đề, dòng chú thích "→ problem 0x solved" |

## Vấn đề 02 – Cross aisles not optimally utilized / Lối đi ngang chưa được sử dụng tối ưu (~30s) – ĐÃ DỰNG

Composition `Problem02` (`src/scenes/Problem02.tsx`), dữ liệu `src/data/problem02.ts`.

- Bản đồ Kho C thật (`src/map/khoC.ts`), ô BIN 1,4 m, tim lối 8,65 m. Quãng đường tính đúng công thức app.
- Phiếu mẫu: 14 điểm trên dãy CDT, CET, CFT, CGT, CHT (lối 4–8), xuất phát cửa D06.
- Hiện tại (A→T, mỗi dãy VT tăng dần): 469,6 m. Thuật toán (S-shape + 2-opt): 335,2 m. Chênh −134,4 m (−28,6%).
- Hai lộ trình qua cùng các hầm. Chênh lệch nằm ở lúc sang lối 6→7 và 7→8:
  - Hiện tại: qua hầm 2 rồi chạy ngược về VT 36 (84,3 m), sau đó qua hầm 1 rồi chạy ngược về VT 12 (89,8 m).
  - Thuật toán: qua hầm 2 rồi đi tiếp cùng chiều (36,7 m), sau đó qua hầm 1 (22,6 m).
- Nhịp: thẻ vấn đề (0–4,5s) → bản đồ zoom và nháy 3 điểm sang lối (5–7s) → hai xe chạy cùng tốc độ (7–21s) → callout và tô sáng đoạn chênh lệch (21,5–26,5s) → tick "solved" (26,5–30s).

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
