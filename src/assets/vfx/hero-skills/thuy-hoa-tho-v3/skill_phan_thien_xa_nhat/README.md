# Phần Thiên Xạ Nhật

- **Skill ID:** `skill_phan_thien_xa_nhat`
- **Hệ:** hoa
- **Mô tả:** Bắn một mũi tên hỏa diễm cực mạnh, phát nổ gây sát thương diện rộng và Thiêu đốt.
- **Số frame:** 6
- **Frame chuẩn:** 452 x 420px
- **Nền:** Trong suốt (transparent)

## Quy ước file

- Frame: `frames_webp/skill_phan_thien_xa_nhat_01.webp` ... `frames_webp/skill_phan_thien_xa_nhat_06.webp`
- Segment gốc: `raw_segments_webp/skill_phan_thien_xa_nhat_segment_01.webp` ... `raw_segments_webp/skill_phan_thien_xa_nhat_segment_06.webp`
- Preview giãn cách: `previews/skill_phan_thien_xa_nhat_equal_spaced_preview.webp`
- Manifest: `skill_phan_thien_xa_nhat_manifest.json`

## Rule xử lý

- Khử nền tối sang trong suốt.
- Frame trước không dính frame sau.
- Frame trên không dính frame dưới.
- Lấy frame có width / height lớn nhất của skill làm chuẩn cho toàn bộ frame còn lại.
