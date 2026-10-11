# Kịch bản giọng đọc – Bản rút gọn, viết cho ElevenLabs v4

v4 bám thẻ cảm xúc mạnh hơn v3, nên dùng thẻ như v3 sẽ bị diễn quá tay. Bản này:
- Mỗi đoạn chỉ một thẻ giọng ở đầu (`[confident]`, `[engaging]`, `[clear]`...), tránh `[calm]`, `[slow]` vì làm giọng đọc lờ đờ, không dùng thẻ mạnh như `[excited]`, `[surprised]`, `[frustrated]`, `[sighs]`, `[dramatic]`.
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

## V2 – Hạn chế 01, 02, 03
```
[clear, confident] Một: các điểm gần nhau không được hạ hàng liên tiếp. Các điểm nằm sát nhau nhưng khác dãy, nên xe hiện tại phải vào khu vực này hai lần.
[long pause]
[confident] Thuật toán sắp các điểm này liên tiếp. Xe chỉ vào khu vực một lần là hạ hàng xong.
[long pause]
[clear, confident] Hai: lối đi ngang chưa được sử dụng tối ưu. Xe hiện tại hạ xong điểm ở sâu trong dãy, quay ra đầu dãy để đổi lối... rồi lại vào sâu dãy bên cạnh.
[long pause]
[confident] Thuật toán cho xe đổi lối ngay tại lối ngang gần đó, không phải quay ra đầu dãy. Các điểm gần cửa được hạ hàng trên đường quay về.
[long pause]
[clear, confident] Ba: hàng nằm rải rác nhiều dãy. Thử duỗi thẳng hai lộ trình ra để so độ dài.
[long pause]
[confident] Phần dây đỏ dài hơn chính là quãng đường chạy thừa. Lộ trình tối ưu giảm phần chạy thừa này.
```

## V3 – Hạn chế 04
```
[clear, confident] Bốn: ùn tắc dãy A, Bê buổi sáng. Đầu ca sáng, sau khi nhân viên xe nâng nhận phiếu tê-ô, ai cũng bắt đầu hạ hàng từ dãy A và Bê... vì phiếu đã in sẵn theo thứ tự dãy.
[long pause]
[clear] Các xe cùng dồn vào dãy A, Bê. Chỉ ba xe rẽ ra lối ngang, vì đã hạ xong các điểm trong hai dãy này. Sáu xe còn điểm ở cuối dãy, phải đi tiếp... nên kẹt ở giữa dãy.
[long pause]
[confident] Với lộ trình tối ưu, xe không phải đi hết từng dãy. Thuật toán sắp các điểm theo vùng, tới lối ngang là xe rẽ sang vùng của mình... hạn chế việc dồn vào cùng một chỗ lúc đầu ca.
```

## V4 – Kết (tổng kết 4 hạn chế, nhịp chậm)
```
[clear, steady] Nhìn lại bốn hạn chế của cách đi hiện tại.
[long pause]
[clear, steady] Một: các điểm gần nhau không được hạ hàng liên tiếp.
[long pause]
[clear, steady] Hai: hạ xong điểm ở sâu trong dãy, xe quay ra đầu dãy rồi lại vào sâu dãy bên cạnh... thay vì đổi lối ngay tại lối ngang gần đó.
[long pause]
[clear, steady] Ba: hàng rải rác, xe chạy thừa nhiều.
[long pause]
[clear, steady] Bốn: ùn tắc dãy A, Bê buổi sáng.
[long pause]
[confident] Thuật toán khắc phục các hạn chế này bằng việc sắp xếp lại thứ tự hạ hàng một cách tối ưu hơn.
[long pause]
[warm, upbeat] Quãng đường ngắn hơn, ít ùn tắc hơn, tiết kiệm điện năng cho mỗi chuyến xe nâng.
```

---

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
- Thuật ngữ: **hạ hàng**, **liên tiếp**, **lối ngang**. Không nói số mét, phần trăm.
- V4 thay cho đoạn kết cũ "4 hạn chế – 1 nguyên nhân" (câu này không đúng hoàn toàn với hạn chế 03).
