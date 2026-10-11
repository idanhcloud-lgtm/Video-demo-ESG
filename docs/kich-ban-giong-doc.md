# Kịch bản giọng đọc – Video tối ưu lộ trình Reach Truck

## Quy ước
- Giọng đọc tiếng Việt, tốc độ vừa (khoảng 4,5 âm tiết/giây). Thời lượng ước tính đã tính theo tốc độ này.
- Cột **Hình trên màn hình** là popup/sự kiện đang có trong video. Câu đọc bắt đầu khi popup đó xuất hiện.
- Cột **Giữ thêm** là số giây cần kéo dài cảnh để đọc hết câu. Khi xuất video bản có giọng đọc, cảnh sẽ được dừng lại đúng chỗ đó.
- Phát âm cho TTS: "TO" đọc là "tê-ô"; "A, B" đọc là "A, Bê"; số đọc thành chữ như đã viết.

---

## Phần 01 – Mở đầu và hạn chế 01 (video gốc, 70 giây)

| Mốc | Hình trên màn hình | Lời đọc | Ước tính | Giữ thêm |
|---|---|---|---|---|
| 0–6s | Tiêu đề + 4 ô chỉ số kho | Tối ưu lộ trình xe reach truck bằng thuật toán. Kho B2C rộng ba mươi nghìn chín trăm mét vuông, có ba mươi lăm dãy kệ, gần ba mươi bảy nghìn vị trí lưu kho và hai mươi sáu xe nâng. | 10s | +4s |
| 6–12s | Giới thiệu 2 lộ trình xanh / đỏ | Cùng một phiếu tê-ô, chúng tôi so sánh hai cách đi. Bên trái là lộ trình tối ưu bằng thuật toán. Bên phải là cách hiện tại, lấy hàng theo thứ tự dãy A đến T. | 9s | +3s |
| 12–33s | Hai xe chạy, về đích 1.008 m và 1.440 m | Hai xe cùng xuất phát, cùng tốc độ, cùng hai mươi tám điểm hạ hàng. Xe theo lộ trình tối ưu về đích sau một nghìn không trăm lẻ tám mét. Xe đi theo dãy phải chạy tới một nghìn bốn trăm bốn mươi mét, nhiều hơn bốn trăm ba mươi hai mét, tương đương ba mươi phần trăm. | 17s | – |
| 33–45s | Danh sách 4 hạn chế | Vì sao có chênh lệch này? Quy trình hiện tại có bốn hạn chế. Chúng ta lần lượt xem thuật toán giải quyết từng hạn chế. | 7s | – |
| 45–55s | Thẻ hạn chế 01, phóng to cụm điểm | Hạn chế thứ nhất: không gom các vị trí gần nhau. Các điểm nằm sát nhau nhưng thuộc các dãy khác nhau, nên trên phiếu in chúng bị tách xa. | 9s | – |
| 55–70s | "Same area – but the current truck comes in twice" → "problem 01 solved" | Cùng một khu vực, nhưng xe hiện tại phải vào tới hai lần. Thuật toán gom các điểm gần nhau vào cùng một lượt, xe chỉ cần đi qua một lần. Hạn chế thứ nhất đã được giải quyết. | 11s | – |

Phần 01 là video gốc nên chỉ giữ hình được bằng cách dừng khung hình (freeze frame) tại 6s và 12s. Nếu dựng lại phần 01 thì chỉnh trực tiếp nhịp cảnh.

---

## Phần 02 – Lối đi ngang chưa được sử dụng tối ưu (21 giây)

| Mốc | Hình trên màn hình | Lời đọc | Ước tính | Giữ thêm |
|---|---|---|---|---|
| 0–5s | Thẻ "PROBLEM 02" | Hạn chế thứ hai: lối đi ngang chưa được sử dụng tối ưu. Thứ tự in trên phiếu quyết định chỗ đổi lối, chứ không phải lối ngang gần nhất. | 8,5s | +3,5s |
| 5,8–11s | Hai lộ trình, phóng to dãy 3–5, vệt trắng chạy | Hãy nhìn vào khu vực dãy ba đến dãy năm. | 2,5s | – |
| 11–16,7s | Callout đỏ / xanh | Xe hiện tại lấy xong điểm số năm ở sâu trong dãy, phải chạy ngược về đầu dãy để đổi lối, rồi lại vào sâu tới điểm số tám. Thuật toán đổi lối ngay tại hầm hai trên đường đi, các điểm gần đầu dãy được lấy trên đường về. | 13s | +7s |
| 18–21s | SOLVED 02 | Đổi lối ngay tại lối ngang trên đường đi. Hạn chế thứ hai đã được giải quyết. | 4,5s | +1,5s |

---

## Phần 03 – Hàng rải rác nhiều dãy (33 giây)

| Mốc | Hình trên màn hình | Lời đọc | Ước tính | Giữ thêm |
|---|---|---|---|---|
| 0–5s | Thẻ "PROBLEM 03" | Hạn chế thứ ba: hàng nằm rải rác nhiều dãy. Nếu không có lộ trình tối ưu, xe phải chạy thừa rất nhiều. | 6s | +1s |
| 6,3–10,7s | 28 chấm vàng hiện khắp kho | Một phiếu tê-ô có hai mươi tám điểm, nằm rải rác trên mười lăm trong mười tám dãy, từ đầu kho tới cuối kho. | 6s | +1,5s |
| 10,7–22,7s | Hai xe chạy cùng tốc độ | Cùng các điểm, cùng tốc độ. Xe đi theo lộ trình tối ưu đã về đích, trong khi xe đi theo dãy vẫn còn đang chạy. | 6s | – |
| 23,3–26,3s | Duỗi thẳng thành 2 sợi dây | Duỗi thẳng hai lộ trình ra để so sánh độ dài. | 2,5s | – |
| 26,3–30s | "QUÃNG ĐƯỜNG LÃNG PHÍ" chớp đỏ | Phần dây đỏ dài hơn chính là quãng đường lãng phí. Hàng càng rải rác, đi theo thứ tự dãy càng lãng phí. | 6s | +2,5s |
| 30–33s | SOLVED 03 | Lộ trình tối ưu cắt bỏ phần lãng phí này. Hạn chế thứ ba đã được giải quyết. | 4,5s | +1,5s |

---

## Phần 04 – Ùn tắc dãy đầu buổi sáng (27,3 giây)

| Mốc | Hình trên màn hình | Lời đọc | Ước tính | Giữ thêm |
|---|---|---|---|---|
| 0–5s | Thẻ "PROBLEM 04" | Hạn chế thứ tư: ùn tắc đầu buổi sáng. Các phiếu tê-ô đều bắt đầu từ dãy A và Bê. | 5s | – |
| 6,3–8,7s | Banner "9:00 AM" | Chín giờ sáng, giờ cao điểm. Các xe cùng rời cửa. | 3s | +0,5s |
| 8,7–15,7s | 9 xe chạy vào dãy A, B | Với cách hiện tại, xe nào cũng chạy vào dãy A và Bê trước. Chỉ ba xe kịp rẽ sang lối ngang, sáu xe còn lại kẹt ở giữa dãy. | 7s | – |
| 16,8–23s | Phóng to chỗ kẹt, nhãn "6 XE KẸT", callout | Ùn tắc xảy ra vì các phiếu đều bắt đầu từ dãy A, Bê. Với lộ trình tối ưu, xe vẫn đi vào từ dãy A, Bê nhưng tới lối ngang thì rẽ ra khắp kho, nên không còn xe đứng kẹt. | 11s | +5s |
| 24,3–27,3s | SOLVED 04 | Giảm ùn tắc ở dãy A, Bê. Hạn chế thứ tư đã được giải quyết. | 4s | +1s |

---

## Phần kết – Tổng kết 4 hạn chế (33 giây)

| Mốc | Hình trên màn hình | Lời đọc | Ước tính | Giữ thêm |
|---|---|---|---|---|
| 0,7–3,3s | Tiêu đề "TỔNG KẾT" | Tổng kết lại bốn hạn chế của quy trình hiện tại. | 2,5s | – |
| 3,3–8,3s | Dòng 01 | Một: các điểm gần nhau nhưng khác dãy bị tách xa trên phiếu. Thuật toán gom chúng vào cùng một lượt. | 6s | +1s |
| 8,3–13,3s | Dòng 02 | Hai: xe phải chạy về đầu dãy để đổi lối. Thuật toán đổi lối ngay ở lối ngang trên đường đi. | 5,5s | +0,5s |
| 13,3–18,3s | Dòng 03 | Ba: hàng rải nhiều dãy khiến xe chạy thừa. Lộ trình tối ưu cắt bỏ quãng đường lãng phí. | 5s | – |
| 18,3–24s | Dòng 04 | Bốn: các phiếu đều bắt đầu từ dãy A, Bê gây ùn tắc. Xe được rẽ qua lối ngang, giảm ùn tắc. | 5,5s | – |
| 24–33s | Khung chốt "4 hạn chế – 1 nguyên nhân" | Bốn hạn chế, chung một nguyên nhân: phiếu in theo thứ tự A đến T cố định. Giải pháp của chúng tôi là sắp xếp lại lộ trình theo vị trí hàng. | 8s | – |

---

## Tổng thời lượng
| Phần | Hiện tại | Giữ thêm | Sau khi khớp giọng đọc |
|---|---|---|---|
| 01 | 70s | +7s | ~77s |
| 02 | 21s | +12s | ~33s |
| 03 | 33s | +6,5s | ~39,5s |
| 04 | 27,3s | +6,5s | ~34s |
| Kết | 33s | +1,5s | ~34,5s |
| **Tổng** | **~3 phút 4 giây** | **+33,5s** | **~3 phút 38 giây** |
