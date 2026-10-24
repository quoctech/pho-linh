# Thanh Đằng Trói Hồn — WebP 512 clean

- **Skill ID:** `skill_thanh_dang_troi_hon`
- **Hệ:** moc
- **Mô tả:** Triệu hồi dây leo trói mục tiêu, gây sát thương Mộc và giảm tốc độ hành động.
- **Số frame:** 6
- **Kích thước frame chuẩn:** 512 x 512px
- **Thời lượng:** 110ms/frame, phát một lần
- **Nguồn:** THANH_DANG_TROI_HON_FX_6_FRAME_WEBP512_CLEAN

## Quy ước file

- Frame: `frames_webp/skill_thanh_dang_troi_hon_01.webp` ... `frames_webp/skill_thanh_dang_troi_hon_06.webp`
- Segment gốc: `raw_segments_webp/skill_thanh_dang_troi_hon_segment_01.webp` ... `raw_segments_webp/skill_thanh_dang_troi_hon_segment_06.webp`
- Preview: `previews/skill_thanh_dang_troi_hon_equal_spaced_preview.webp`
- Manifest: `skill_thanh_dang_troi_hon_manifest.json`

## Rule xử lý

- Tách frame theo khoảng trống / ranh giới pixel thực tế.
- Frame trước không dính frame sau.
- Khử nền tối để thuận tiện dùng trong game.
- Các frame còn lại được đặt vào canvas chuẩn theo frame lớn nhất của skill.
