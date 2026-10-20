# PHỐ LINH — Skill Effects Hệ Thủy, Hỏa, Thổ

Package này chứa 6 skill đã được xử lý nền trong suốt, cắt frame WebP và chuẩn hóa kích thước theo frame lớn nhất của từng skill.

## Danh sách skill

- **Hàn Triều Phá Không** (`skill_han_trieu_pha_khong`) — Đâm thương tạo dòng nước băng xuyên mục tiêu, gây sát thương Thủy và giảm tốc.
- **Băng Phong Thiên Lý** (`skill_bang_phong_thien_ly`) — Triệu hồi hàn khí diện rộng, gây sát thương Thủy và có xác suất Đóng băng.
- **Hỏa Vũ Liên Châu** (`skill_hoa_vu_lien_chau`) — Bắn liên tiếp nhiều hỏa tiễn, gây sát thương Hỏa nhiều lần lên mục tiêu.
- **Phần Thiên Xạ Nhật** (`skill_phan_thien_xa_nhat`) — Bắn một mũi tên hỏa diễm cực mạnh, phát nổ gây sát thương diện rộng và Thiêu đốt.
- **Sơn Nhạc Trấn Địa** (`skill_son_nhac_tran_dia`) — Đập đại đao xuống đất, gây sát thương Thổ diện rộng và có xác suất Choáng.
- **Huyền Nham Hộ Thể** (`skill_huyen_nham_ho_the`) — Triệu hồi lớp giáp đá tạo Khiên, giảm sát thương nhận vào và bảo vệ đồng đội.

## Rule xử lý

- Transparent background.
- Frame trước không dính frame sau.
- Frame trên không dính frame dưới.
- Mỗi skill có frame chuẩn riêng dựa trên frame lớn nhất.
- Có manifest root, manifest riêng từng skill và README riêng từng skill.

- V3: `skill_bang_phong_thien_ly` đã được lọc nền mạnh hơn để trong suốt sạch hơn.
