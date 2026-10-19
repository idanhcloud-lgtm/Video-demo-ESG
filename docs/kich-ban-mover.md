# Kịch bản giọng đọc – Thuật toán xe mover (khoảng 75 giây)

Viết cho ElevenLabs v4: mỗi đoạn một thẻ giọng ở đầu, không dùng `[clear]`, tách câu bằng `[long pause]`. Số đọc bằng chữ. Mỗi khung = 1 lần tạo = 1 file.

Ví dụ minh họa: 8 dòng hàng, 4 pallet nguyên và 4 dòng hàng lẻ nửa pallet (cùng dữ liệu với `MoverExplain` / `MoverRace`).

---

## M1 – Đặt vấn đề (≈ 12 s)
```
[confident] Xe mover mỗi chuyến chở được hai pallet. Trên phiếu tê-ô có pallet nguyên, và có hàng lẻ chưa đủ một pallet.
[long pause]
[steady] Hàng lẻ được xếp chung lên một pallet lồng, cho đến khi đầy. Đủ hai pallet thì xe quay về cửa.
```
| Hình | |
|---|---|
| Xe mover với 2 chỗ trống. Pallet nguyên trượt vào chỗ 1. Hai mẩu nửa pallet xếp chồng vào chỗ 2 thành lồng đầy. Xe về cửa. |

## M2 – Cách làm hiện tại (≈ 15 s)
```
[steady] Hiện tại, tài xế lấy hàng theo thứ tự in trên phiếu, từ dãy A đến dãy D, gom đầy hai pallet rồi mới về.
[long pause]
[confident] Vấn đề là các món nằm liền nhau trên phiếu chưa chắc nằm gần nhau trong kho. Một chuyến có thể vừa lấy hàng ở đầu dãy này, vừa phải chạy vào tận cuối dãy khác.
```
| Hình | |
|---|---|
| Bản đồ 4 dãy, số trên pallet = thứ tự in. Lần lượt tô 3 nhóm theo thứ tự in (1+2+4, 3+5+6, 7+8). Nhóm 2 nhấp nháy: một điểm đầu dãy C, một điểm cuối dãy B, một điểm cuối dãy C. |

## M3 – Thuật toán, bước gom (≈ 12 s)
```
[confident] Thuật toán làm khác. Đầu tiên, nó quy đổi từng dòng hàng ra pallet, theo quy cách trên SAP.
[long pause]
[steady] Các phần hàng lẻ được gom lên pallet lồng cho đầy. Tám dòng hàng trở thành sáu pallet cần chở, tức là ba chuyến.
```
| Hình | |
|---|---|
| Bảng 8 dòng: số lượng / quy cách → "1 pallet" hoặc "½ pallet". Bốn mẩu ½ bay vào 2 lồng. Hiện 6 ô: 4 pallet nguyên + 2 lồng. Dòng chốt "6 pallet → 3 chuyến". |

## M4 – Thuật toán, bước ghép cặp (≈ 22 s)
```
[confident] Tiếp theo là câu hỏi quan trọng: pallet nào nên đi chung chuyến với pallet nào?
[long pause]
[steady] Thuật toán thử từng cặp, và tính xem nếu hai pallet đi chung thì bớt được bao nhiêu mét so với đi riêng hai chuyến.
[long pause]
[steady] Ví dụ, pallet bảy và lồng năm, sáu đều nằm ở cuối dãy C và D. Đi riêng mất hai trăm bảy mươi tám mét. Đi chung chỉ còn một trăm sáu mươi mét, bớt được một trăm mười tám mét.
[long pause]
[confident] Cặp nào bớt nhiều nhất thì được chọn trước. Rồi thuật toán chọn tiếp cặp tốt nhất trong số pallet còn lại, cho đến khi xếp xong.
```
| Hình | |
|---|---|
| Hai ô đi riêng: 2 vòng đi-về vẽ riêng (278 m). Rồi gộp thành 1 vòng (160 m), nhãn "−118 m". Bảng xếp hạng các cặp theo mét bớt được; cặp đầu tick "Chuyến 1", các cặp có pallet đã chọn bị gạch. Lặp cho chuyến 2, 3. |

## M5 – Kết quả và chốt (≈ 14 s)
```
[confident] Cùng một phiếu, cùng ba chuyến, pallet nào cũng đầy. Cách theo thứ tự in chạy bốn trăm năm mươi tám mét. Thuật toán chỉ chạy ba trăm bảy mươi mét.
[long pause]
[warm] Thuật toán không bắt xe chở nhiều hơn. Nó chỉ chọn lại những món hàng gần nhau để đi chung một chuyến.
```
| Hình | |
|---|---|
| Hai bản đồ cạnh nhau, mỗi chuyến một màu: trái theo thứ tự in 458 m, phải thuật toán 370 m. Dòng nhỏ "Sơ đồ minh họa". |

---

## Ghi chú
- Số liệu tính đúng theo quy tắc của app (`planMover`): đi riêng P7 = 148 m, lồng 5+6 = 130 m, đi chung = 160 m → bớt 118 m.
- Cách "hiện tại" giả định: lấy theo thứ tự in, gom đầy 2 pallet; pallet nguyên không còn chỗ thì để chuyến sau. Cần xác nhận với kho.
- Không đọc phần trăm trong video minh họa (ví dụ cho −19%, số thật tháng 07 là −6%). Nếu muốn có câu số thật, thêm sau M5:
  `[steady] Trên toàn bộ phiếu tháng bảy, xe mover giảm được một trăm bốn mươi bốn ki-lô-mét.`
