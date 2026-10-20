# PHỐ LINH — Skill Effects Hệ Kim & Mộc

Package này chứa frame WebP đã cắt chuẩn cho 4 skill hệ Kim và Mộc.

## Danh sách skill

- **Vạn Kiếm Quy Tông** (`skill_van_kiem_quy_tong`) — Triệu hồi hàng loạt kiếm khí tấn công liên tiếp, gây sát thương Kim nhiều lần.
- **Kim Quang Phá Giáp** (`skill_kim_quang_pha_giap`) — Đâm xuyên mục tiêu bằng kiếm khí, gây sát thương Kim lớn và giảm phòng thủ.
- **Thanh Đằng Trói Hồn** (`skill_thanh_dang_troi_hon`) — Triệu hồi dây leo trói mục tiêu, gây sát thương Mộc và giảm tốc độ hành động.
- **Vạn Diệp Độc Chú** (`skill_van_diep_doc_chu`) — Phát tán lá độc trên diện rộng, gây sát thương Mộc và áp dụng trạng thái Dính độc.

## Rule xử lý

- Tìm frame có width / height lớn nhất của từng skill để làm chuẩn.
- Frame trước không dính frame sau, frame dưới không dính frame trên.
- Xuất WebP nền trong suốt.
- Mỗi skill có manifest và README riêng.
