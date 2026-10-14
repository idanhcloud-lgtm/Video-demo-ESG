# Kịch bản giọng đọc – Bản rút gọn, viết cho ElevenLabs v4

v4 bám thẻ cảm xúc mạnh hơn v3, nên dùng thẻ như v3 sẽ bị diễn quá tay. Bản này:
- Mỗi đoạn chỉ một thẻ giọng ở đầu (`[confident]`, `[engaging]`, `[steady]`...), tránh `[calm]`, `[slow]` vì làm giọng đọc lờ đờ, không dùng thẻ mạnh như `[excited]`, `[surprised]`, `[frustrated]`, `[sighs]`, `[dramatic]`.
- Nhấn nhịp bằng dấu câu: dấu phẩy, dấu chấm, "..." cho chỗ ngừng ngắn.
- Giữ `[long pause]` giữa các câu để tách file theo khoảng lặng.

Mỗi khung = 1 lần tạo = 1 file: `V1.mp3` … `V4.mp3`. Nếu vẫn còn diễn nhiều: xoá luôn thẻ giọng đầu đoạn, chỉ giữ `[long pause]`.

---

## V1 – Mở đầu và cuộc đua
```
[confident, upbeat] Tối ưu lộ trình xe reach truck bằng thuật toán.
[long pause]
[engaging] Để so sánh, chúng tôi mô phỏng cùng một phiếu tê-ô có hai mươi tám điểm hạ hàng. Bên trái, xe đi theo lộ trình do thuật toán sắp xếp. Bên phải, xe đi theo cách đang làm tại kho: lần lượt từ dãy A đến T.
[long pause]
[lively] Hai xe cùng xuất phát, cùng tốc độ. Xe theo lộ trình tối ưu đã về đích... trong khi xe đi theo dãy vẫn còn đang chạy.
[long pause]
[curious] Vì sao có chênh lệch này? Quy trình hiện tại có bốn hạn chế. Chúng ta xem lần lượt từng hạn chế trên bản đồ.
```

## V1b – So sánh quãng đường (chèn sau cuộc đua, trước "Vì sao có chênh lệch này?")
```
[calm, matter-of-fact] Cùng hai mươi tám điểm hạ hàng, lộ trình tối ưu chạy một nghìn một trăm sáu mươi sáu mét. Cách hiện tại chạy một nghìn năm trăm chín mươi sáu mét.
[long pause]
[calm] Ngắn hơn khoảng bốn trăm ba mươi mét, tức khoảng hai mươi bảy phần trăm, chỉ trong một phiếu tê-ô.
```
Số liệu tính theo bản đồ Kho C hiện tại (VT 1,4 m, tim lối 8,65 m): 1.166 m và 1.596 m, chênh 430 m (26,9%).

## V2 – Hạn chế 01, 02, 03 (bản cập nhật)
```
[confident] Một: các điểm gần nhau nhưng khác dãy không được hạ hàng liên tiếp. Các điểm này nằm sát nhau, nhưng vì phiếu in theo thứ tự dãy, điểm bên cạnh chưa tới lượt. Khi đi ngang qua, tài xế không biết ngay bên cạnh còn hàng cần hạ... nên xe phải quay lại khu vực này lần thứ hai.
[long pause]
[confident] Với thuật toán, các điểm này được sắp liền nhau trên phiếu. Xe chỉ vào một lần là hạ hàng xong.
[long pause]
[confident] Hai: lối đi ngang chưa được sử dụng tối ưu trong một số trường hợp. Sau khi hạ hàng ở sâu trong dãy, xe phải chạy ngược ra đầu dãy để hạ thêm một điểm, rồi mới đổi lối.
[long pause]
[confident] Với thuật toán, xe đổi lối ngay tại lối ngang gần nhất, không cần quay ra đầu dãy. Điểm gần đầu dãy được hạ hàng trên đường quay về.
[long pause]
[confident] Ba: hàng trong phiếu tê-ô nằm rải rác ở nhiều dãy, nên xe dễ chạy thừa đường. Để dễ so sánh, thử duỗi thẳng hai lộ trình ra.
[long pause]
[confident] Phần dây đỏ dài hơn chính là quãng đường xe hiện tại đang chạy thừa. Lộ trình tối ưu đã cắt bỏ phần chạy thừa này.
```

## V3 – Hạn chế 04 (bản cập nhật)
```
[confident] Bốn: ùn tắc đầu ca sáng. Sau khi nhận phiếu tê-ô, các xe nâng cùng lúc dồn về những dãy đầu, gây ùn tắc và tiềm ẩn nguy cơ va chạm. Vì phiếu in sẵn theo thứ tự dãy, tài xế nào cũng bắt đầu từ dãy A và Bê.
[long pause]
[steady] Chỉ ba xe hạ xong và rẽ ra lối ngang. Sáu xe còn lại vẫn còn điểm ở cuối dãy, phải đi tiếp... nên bị kẹt ở giữa dãy.
[long pause]
[confident] Với thuật toán, xe không phải đi hết từng dãy. Các điểm được sắp theo vùng, tới lối ngang là xe rẽ đi ngay, hạn chế cảnh dồn xe lúc đầu ca.
```

## V4 – Kết (tổng kết 4 hạn chế, nhịp chậm)
```
[steady] Nhìn lại bốn hạn chế của cách đi hiện tại.
[long pause]
[steady] Một: các điểm gần nhau không được hạ hàng liên tiếp.
[long pause]
[steady] Hai: hạ xong điểm ở sâu trong dãy, xe quay ra đầu dãy rồi lại vào sâu dãy bên cạnh... thay vì đổi lối ngay tại lối ngang gần đó.
[long pause]
[steady] Ba: hàng rải rác, xe chạy thừa nhiều.
[long pause]
[steady] Bốn: ùn tắc dãy A, Bê buổi sáng.
[long pause]
[confident] Thuật toán khắc phục các hạn chế này bằng việc sắp xếp lại thứ tự hạ hàng một cách tối ưu hơn.
[long pause]
[warm, upbeat] Quãng đường ngắn hơn, ít ùn tắc hơn, tiết kiệm điện năng cho mỗi chuyến xe nâng.
```

---

## V5 – Câu kết video (đã chốt hướng: nối sang phần kết quả 1 tháng)
```
[warm] Trên đây là phần mô phỏng giải pháp tối ưu lộ trình xe reach truck bằng thuật toán. Tiếp theo, chúng tôi xin trình bày kết quả chạy mô phỏng trên các phiếu tê-ô trong một tháng.
```
Màn hình cuối: tên dự án + "Tiếp theo: Kết quả mô phỏng 1 tháng · Next: 1-month simulation results".

## Câu nào đi với hình nào
| File | Câu | Sự kiện trên màn hình |
|---|---|---|
| V1 | 1 | Tiêu đề (bỏ 4 ô số liệu kho) |
| V1 | 2 | Hai bản đồ xanh / đỏ hiện lên, 28 điểm |
| V1 | 3 | Hai xe chạy, xe xanh về đích trước |
| V1 | 4 | Thanh 4 tab hạn chế hiện lên |
| V2 | 1–2 | Tab 01: vệt đỏ vào khu vực 2 lần → callout xanh |
| V2 | 3–4 | Tab 02: chạy về đầu dãy → callout xanh |
| V2 | 5–6 | Tab 03: duỗi thẳng 2 lộ trình → "quãng đường chạy thừa" |
| V3 | 1–3 | Tab 04: banner "Đầu ca sáng" → 6 xe kẹt → callout xanh |
| V4 | 1 | Camera thu về toàn kho |
| V4 | 2–5 | 4 vị trí hạn chế lần lượt chuyển đỏ → xanh |
| V4 | 6–7 | Dòng chốt: sắp xếp lại thứ tự hạ hàng tối ưu hơn; lợi ích |

## Lưu ý
- Thuật ngữ: **hạ hàng**, **liên tiếp**, **lối ngang**. Số mét, phần trăm chỉ nói ở đoạn V1b.
- V4 thay cho đoạn kết cũ "4 hạn chế – 1 nguyên nhân" (câu này không đúng hoàn toàn với hạn chế 03).
