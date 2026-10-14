# Kịch bản cuối cùng – Video mô phỏng tối ưu lộ trình reach truck

Bản dựng: composition `CondensedVoiceEN` (phụ đề tiếng Anh chính). Thời lượng 3:07. Lời đọc đúng theo file giọng đã thu (`audio/v4/`).

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
| | **5. Hạn chế 01 – Điểm gần nhau khác dãy không hạ liên tiếp** | |
| 0:51 | Một: các điểm gần nhau nhưng khác dãy không được hạ hàng liên tiếp. | One: nearby stops in different aisles are not handled in sequence. |
| 0:56 | Các điểm này nằm sát nhau, nhưng vì phiếu in theo thứ tự dãy, điểm bên cạnh chưa tới lượt. | They sit side by side, but the TO is printed in aisle order, so the neighbour is not next on the list. |
| 1:01 | Khi đi ngang qua, tài xế không biết ngay bên cạnh còn hàng cần hạ, nên xe phải quay lại khu vực này lần thứ hai. | Passing by, the driver does not know there is a stop right next door – so the truck has to come back a second time. |
| 1:07 | Với thuật toán, các điểm này được sắp liền nhau trên phiếu. Xe chỉ vào một lần là hạ hàng xong. | With the algorithm they are listed back to back – one visit is enough. |
| | **6. Hạn chế 02 – Lối ngang chưa được sử dụng tối ưu** | |
| 1:14 | Hai: lối đi ngang chưa được sử dụng tối ưu trong một số trường hợp. | Two: in some cases, cross aisles are not used optimally. |
| 1:18 | Sau khi hạ hàng ở sâu trong dãy, xe phải chạy ngược ra đầu dãy để hạ thêm một điểm, rồi mới đổi lối. | After a stop deep in the aisle, the truck runs back to the front for one more stop before changing aisle. |
| 1:24 | Với thuật toán, xe đổi lối ngay tại lối ngang gần nhất, không cần quay ra đầu dãy. | With the algorithm, the truck changes aisle at the nearest cross aisle – no trip back to the front. |
| 1:29 | Điểm gần đầu dãy được hạ hàng trên đường quay về. | The stop near the front is handled on the way back. |
| | **7. Hạn chế 03 – Hàng rải rác nhiều dãy** | |
| 1:33 | Ba: hàng trong phiếu TO nằm rải rác ở nhiều dãy, nên xe dễ chạy thừa đường. | Three: the stops of a TO are scattered over many aisles, so the truck easily drives extra distance. |
| 1:38 | Để dễ so sánh, thử duỗi thẳng hai lộ trình ra. | To compare, let's straighten both routes. |
| 1:41 | Phần dây đỏ dài hơn chính là quãng đường xe hiện tại đang chạy thừa. | The extra red length is the distance the truck drives for nothing today. |
| 1:45 | Lộ trình tối ưu đã cắt bỏ phần chạy thừa này. | The optimized route cuts this waste. |
| | **8. Hạn chế 04 – Ùn tắc đầu ca sáng** | |
| 1:51 | Bốn: ùn tắc đầu ca sáng. | Four: congestion at the start of the morning shift. |
| 1:54 | Sau khi nhận phiếu TO, các xe nâng cùng lúc dồn về những dãy đầu, gây ùn tắc và tiềm ẩn nguy cơ va chạm. | After picking up their TOs, the forklifts all head for the first aisles at once – congestion and a risk of collisions. |
| 2:00 | Vì phiếu in sẵn theo thứ tự dãy, tài xế nào cũng bắt đầu từ dãy A và B. | Because TOs are printed in aisle order, every driver starts in aisles A and B. |
| 2:05 | Chỉ 3 xe hạ xong và rẽ ra lối ngang. | Only 3 trucks finish there and turn off at the cross aisle. |
| 2:08 | 6 xe còn lại vẫn còn điểm ở cuối dãy, phải đi tiếp, nên bị kẹt ở giữa dãy. | The other 6 still have stops further down, so they get stuck mid-aisle. |
| 2:13 | Với thuật toán, xe không phải đi hết từng dãy. | With the algorithm, trucks don't run each aisle to the end. |
| 2:16 | Các điểm được sắp theo vùng, tới lối ngang là xe rẽ đi ngay, hạn chế cảnh dồn xe lúc đầu ca. | Stops are grouped by zone; at the cross aisle each truck turns off right away – less crowding at shift start. |
| | **9. Tổng kết** | |
| 2:25 | Nhìn lại 4 hạn chế của cách đi hiện tại. | Looking back at the 4 limitations of today's routing. |
| 2:29 | Một: các điểm gần nhau không được hạ hàng liên tiếp. | One: nearby stops are not handled in sequence. |
| 2:33 | Hai: lối đi ngang chưa được sử dụng tối ưu. | Two: cross aisles are not used optimally. |
| 2:37 | Ba: hàng rải rác, xe chạy thừa nhiều. | Three: scattered stops, a lot of extra travel. |
| 2:40 | Bốn: ùn tắc dãy A, B buổi sáng. | Four: morning congestion in aisles A, B. |
| 2:44 | Thuật toán khắc phục các hạn chế này bằng việc sắp xếp lại thứ tự hạ hàng một cách tối ưu hơn. | The algorithm addresses them by re-sequencing the put-away stops more efficiently. |
| 2:49 | Quãng đường ngắn hơn, ít ùn tắc hơn, tiết kiệm điện năng cho mỗi chuyến xe nâng. | Shorter travel, less congestion, energy saved on every forklift trip. |
| | **10. Câu kết** | |
| 2:56 | Trên đây là phần mô phỏng giải pháp tối ưu lộ trình xe reach truck bằng thuật toán. | That was the simulation of our algorithm-based reach truck route optimization. |
| 3:00 | Tiếp theo, chúng tôi xin trình bày kết quả chạy mô phỏng trên các phiếu TO trong một tháng. | Next, we present the results of simulating one month of TOs. |

## Ghi chú
- Số liệu: 1.166 m / 1.596 m, chênh 430 m (≈27%) – theo bản đồ Kho C hiện tại (VT 1,4 m, tim lối 8,65 m), cùng công thức với app.
- Thuật ngữ: hạ hàng, liên tiếp, lối ngang.
