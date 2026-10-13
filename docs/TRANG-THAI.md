# Trạng thái dự án video

## Bản rút gọn có giọng v4 (đã dựng)
- Giọng chốt: `audio/v4/V1..V4.mp3`. Lập lịch: `python3 tools/voice_v4_plan.py` → `public/audio/v4/*.wav` + `src/data/voiceV4.json`.
- Composition `CondensedVoice`: Title (không ô thông số) → `MainRace clean` → `Problem04 clean shiftStart` → `ClosingRecap`, phụ đề song ngữ ở dải dưới.
- Render: `npx remotion render CondensedVoice out/ToiUuLoTrinh_BanRutGon_GiongDoc_1080p60.mp4 --crf=18`.

## Đang chờ (cập nhật)
- `audio/v4/V1b.mp3`: giọng đoạn so sánh quãng đường (kịch bản V1b trong `docs/kich-ban-giong-doc-v4.md`). Hình đã duyệt: 2 ô số mét chuyển nền trắng, bay ra giữa, rồi hiện −430 m · −27%. Có file thì chạy lại `tools/voice_v4_plan.py` (tự nhận V1b).
- `V5`: câu kết video (3 phương án đã gửi, chờ chọn) + màn hình cảm ơn ~5–6 s (chưa dựng).
- Xuất lại 2 bản: `CondensedVoice` (phụ đề Việt chính) và `CondensedVoiceEN` (Anh chính), nén < 30 MB để gửi chat.

## Slide "Hạn chế"
- Mục 1 xong: `tools/build_hanche_muc1.py` (slide 3, 4) + `tools/build_hanche_so_sanh.py` (slide 5 so sánh). Mục 2–5 chưa làm; mục 04 còn ghi "dãy A" cần sửa "dãy A, B".

## Ghi chú cũ (trước khi có giọng v4)

## Đang chờ
- Người dùng tạo giọng đọc ElevenLabs v3 theo `docs/kich-ban-giong-doc-v4.md` (viết cho ElevenLabs v4, thẻ cảm xúc nhẹ; V4 là đoạn kết mới tổng kết 4 hạn chế) → 4 file `V1.mp3`–`V4.mp3`.
- Khi nhận file: cắt câu theo khoảng lặng (như `tools/voiceover_plan.py`), giữ hình cho khớp, dựng phụ đề song ngữ ở dải dưới.

## Bản rút gọn (đang làm)
- Composition `Condensed` = Title → `MainRace` (cuộc đua + 01–03 trên cùng bản đồ) → `Problem04` → `ClosingShort`.
- Bố cục đã duyệt thử: `MainRace` với `clean` (bỏ thanh chữ dưới, dải dưới để phụ đề, thẻ hạn chế chớp xanh khi giải quyết). Bản thử: composition `MainRaceClean`.
- Chưa chốt: callout chỉ tiếng Việt (A) hay song ngữ (B). Chưa áp `clean` cho `Problem04` và `ClosingShort`.

- Hạn chế 04: đổi banner "9:00 AM" thành "Đầu ca sáng" cho khớp giọng đọc mới.
- Bỏ 4 ô thông số kho ở cảnh tiêu đề (giọng đọc V1 không còn câu thông số).

## Thuật ngữ đã chốt
- "hạ hàng" (không dùng "lấy", "gom"), "liên tiếp", "lối ngang" (không dùng "hầm").
- Không hiện số mét ở bản rút gọn. Video 1080p 60fps.

## Bản đầy đủ có giọng (đã xong)
- `tools/build_full.sh`, file giọng gốc `audio/raw/`, kế hoạch giữ hình `src/data/voiceover.json`.
