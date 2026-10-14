# Kịch bản cuối cùng – Video mô phỏng tối ưu lộ trình reach truck

Bản dựng: composition `CondensedVoiceEN` (phụ đề tiếng Anh chính). Thời lượng 2:58. Lời đọc theo đúng file giọng đã chốt (`audio/v4/V1, V1b, V2, V3, V4, V5`).

| Mốc | Lời đọc (tiếng Việt) | Phụ đề tiếng Anh |
|---|---|---|
| | **1. Mở đầu** | |
| 0:00 | Tối ưu lộ trình xe reach truck bằng thuật toán. | Algorithm-based route optimization for reach trucks. |
| | **2. Mô phỏng hai lộ trình** | |
| 0:04 | Để so sánh, chúng tôi mô phỏng cùng một phiếu TO có 28 điểm hạ hàng. | To compare, we simulate one TO with 28 put-away stops. |
| 0:09 | Bên trái, xe đi theo lộ trình do thuật toán sắp xếp. | On the left, the truck follows the route sequenced by the algorithm. |
| 0:12 | Bên phải, xe đi theo cách đang làm tại kho: lần lượt từ dãy A đến T. | On the right, it follows today's practice: aisle by aisle from A to T. |
| 0:17 | Hai xe cùng xuất phát, cùng tốc độ. | Both trucks start together, at the same speed. |
| 0:24 | Xe theo lộ trình tối ưu đã về đích, trong khi xe đi theo dãy vẫn còn đang chạy. | The optimized truck has finished, while the aisle-order truck is still driving. |
| | **3. So sánh quãng đường** | |
| 0:30 | Cùng 28 điểm hạ hàng, lộ trình tối ưu chạy 1.166 m. Cách hiện tại chạy 1.596 m. | Same 28 stops: the optimized route drives 1,166 m, today's order 1,596 m. |
| 0:39 | Ngắn hơn khoảng 430 m, tức khoảng 27%, chỉ trong một phiếu TO. | About 430 m shorter – roughly 27% – on a single TO. |
| | **4. Chuyển sang hạn chế** | |
| 0:45 | Vì sao có chênh lệch này? Quy trình hiện tại có 4 hạn chế. | Why the difference? The current process has 4 limitations. |
| 0:48 | Chúng ta xem lần lượt từng hạn chế trên bản đồ. | Let's look at each one on the map. |
| | **5. Hạn chế 01 – Điểm gần nhau không hạ liên tiếp** | |
| 0:51 | Một: các điểm gần nhau không được hạ hàng liên tiếp. | One: nearby stops are not handled in sequence. |
| 0:55 | Các điểm nằm sát nhau nhưng khác dãy, nên xe hiện tại phải vào khu vực này 2 lần. | They sit close together but in different aisles, so today the truck enters this area twice. |
| 1:00 | Thuật toán sắp các điểm này liên tiếp. Xe chỉ vào khu vực 1 lần là hạ hàng xong. | The algorithm puts them in sequence – one visit to the area is enough. |
| | **6. Hạn chế 02 – Lối ngang chưa được sử dụng tối ưu** | |
| 1:06 | Hai: lối đi ngang chưa được sử dụng tối ưu. | Two: cross aisles are not used optimally. |
| 1:09 | Xe hiện tại hạ xong điểm ở sâu trong dãy, quay ra đầu dãy để đổi lối, rồi lại vào sâu dãy bên cạnh. | After a stop deep in the aisle, the truck goes back to the front to change aisle, then deep again. |
| 1:16 | Thuật toán cho xe đổi lối ngay tại lối ngang gần đó, không phải quay ra đầu dãy. | The algorithm changes aisle at the nearby cross aisle – no trip back to the front. |
| 1:20 | Các điểm gần đầu dãy được hạ hàng trên đường quay về. | Stops near the front are handled on the way back. |
| | **7. Hạn chế 03 – Hàng rải rác nhiều dãy** | |
| 1:25 | Ba: hàng nằm rải rác nhiều dãy. | Three: stops are scattered over many aisles. |
| 1:28 | Thử duỗi thẳng 2 lộ trình ra để so độ dài. | Let's straighten both routes and compare their length. |
| 1:31 | Phần dây đỏ dài hơn chính là quãng đường chạy thừa. | The extra red length is the wasted travel. |
| 1:34 | Lộ trình tối ưu giảm phần chạy thừa này. | The optimized route cuts this waste. |
| | **8. Hạn chế 04 – Ùn tắc dãy A, B buổi sáng** | |
| 1:40 | Bốn: ùn tắc dãy A, B buổi sáng. | Four: morning congestion in aisles A, B. |
| 1:43 | Đầu ca sáng, sau khi nhân viên xe nâng nhận phiếu TO, ai cũng bắt đầu hạ hàng từ dãy A và B, vì phiếu đã in sẵn theo thứ tự dãy. | At the start of the morning shift, every driver begins in aisles A and B – the TOs are printed in aisle order. |
| 1:51 | Các xe cùng dồn vào dãy A, B. | All trucks crowd into aisles A, B. |
| 1:53 | Chỉ 3 xe rẽ ra lối ngang, vì đã hạ xong các điểm trong 2 dãy này. | Only 3 turn off at the cross aisle – they are done with these two aisles. |
| 1:57 | 6 xe còn điểm ở cuối dãy, phải đi tiếp, nên kẹt ở giữa dãy. | The other 6 still have stops further down, so they get stuck mid-aisle. |
| 2:02 | Với lộ trình tối ưu, xe không phải đi hết từng dãy. | With the optimized route, trucks don't run each aisle to the end. |
| 2:05 | Thuật toán sắp các điểm theo vùng, tới lối ngang là xe rẽ sang vùng của mình, hạn chế việc dồn vào cùng một chỗ lúc đầu ca. | Stops are grouped by zone; at the cross aisle each truck turns to its own zone – less crowding at shift start. |
| | **9. Tổng kết** | |
| 2:16 | Nhìn lại 4 hạn chế của cách đi hiện tại. | Looking back at the 4 limitations of today's routing. |
| 2:20 | Một: các điểm gần nhau không được hạ hàng liên tiếp. | One: nearby stops are not handled in sequence. |
| 2:24 | Hai: lối đi ngang chưa được sử dụng tối ưu. | Two: cross aisles are not used optimally. |
| 2:27 | Ba: hàng rải rác, xe chạy thừa nhiều. | Three: scattered stops, a lot of extra travel. |
| 2:31 | Bốn: ùn tắc dãy A, B buổi sáng. | Four: morning congestion in aisles A, B. |
| 2:35 | Thuật toán khắc phục các hạn chế này bằng việc sắp xếp lại thứ tự hạ hàng một cách tối ưu hơn. | The algorithm addresses them by re-sequencing the put-away stops more efficiently. |
| 2:40 | Quãng đường ngắn hơn, ít ùn tắc hơn, tiết kiệm điện năng cho mỗi chuyến xe nâng. | Shorter travel, less congestion, energy saved on every forklift trip. |
| | **10. Câu kết** | |
| 2:47 | Trên đây là phần mô phỏng giải pháp tối ưu lộ trình xe reach truck bằng thuật toán. | That was the simulation of our algorithm-based reach truck route optimization. |
| 2:51 | Tiếp theo, chúng tôi xin trình bày kết quả chạy mô phỏng trên các phiếu TO trong một tháng. | Next, we present the results of simulating one month of TOs. |

## Ghi chú
- Số liệu: 1.166 m / 1.596 m, chênh 430 m (≈27%) – tính theo bản đồ Kho C hiện tại (VT 1,4 m, tim lối 8,65 m), cùng công thức với app.
- Thuật ngữ: hạ hàng, liên tiếp, lối ngang.
- Đoạn so sánh quãng đường (V1b) đang chờ tạo lại giọng thấp hơn: thẻ `[calm, matter-of-fact]` / `[calm]` (xem `docs/kich-ban-giong-doc-v4.md`). Lời giữ nguyên.
