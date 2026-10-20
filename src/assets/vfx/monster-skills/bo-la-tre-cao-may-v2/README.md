# PHỐ LINH — Skill effect frames WebP (Bọ Lá Tre & Cáo Mây)

Bộ này gồm 5 skill effect đã được cắt thành frame WebP riêng:

- **Lục Diệp Độc Châm** (`skill_luc_diep_doc_cham`): Phóng lá tre sắc nhọn như kim độc, gây sát thương Mộc và áp dụng Dính độc.
- **Lục Diệp Ẩn Tung** (`skill_luc_diep_an_tung`): Ngụy trang giữa những chiếc lá tre, tăng tỷ lệ Né tránh và hồi phục một phần HP.
- **Vân Sương Ảo Ảo** (`skill_van_suong_ao_ao`): Tạo ảo ảnh sương mù, tăng tỷ lệ Né tránh và gây trạng thái Mù cho đối thủ.
- **Vụ Lưu Thuẫn** (`skill_vu_luu_thuan`): Triệu hồi khiên sương bảo vệ bản thân, hồi phục HP và giảm hiệu quả hồi máu của đối thủ.
- **Bích Vân Băng Băng** (`skill_bich_van_bang_bang`): Phóng băng khí tấn công, gây sát thương Thủy và có xác suất gây Đóng băng.

## Rule xử lý

- Frame trước không dính frame sau.
- Tính chiều rộng / chiều cao chuẩn theo frame to nhất của từng skill.
- Toàn bộ frame của skill được chuẩn hóa theo size đó.
- Xuất WebP để nhẹ dung lượng.

## Bản sửa V2

- `skill_bich_van_bang_bang` đã được cắt lại bằng **manual safe bounds** để tránh dính frame lân cận.
