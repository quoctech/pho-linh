# Sơn Nhạc Trấn Địa

- **Skill ID:** `skill_son_nhac_tran_dia`
- **Hệ:** tho
- **Mô tả:** Đập đại đao xuống đất, gây sát thương Thổ diện rộng và có xác suất Choáng.
- **Số frame:** 6
- **Frame chuẩn:** 433 x 382px
- **Nền:** Trong suốt (transparent)

## Quy ước file

- Frame: `frames_webp/skill_son_nhac_tran_dia_01.webp` ... `frames_webp/skill_son_nhac_tran_dia_06.webp`
- Segment gốc: `raw_segments_webp/skill_son_nhac_tran_dia_segment_01.webp` ... `raw_segments_webp/skill_son_nhac_tran_dia_segment_06.webp`
- Preview giãn cách: `previews/skill_son_nhac_tran_dia_equal_spaced_preview.webp`
- Manifest: `skill_son_nhac_tran_dia_manifest.json`

## Rule xử lý

- Khử nền tối sang trong suốt.
- Frame trước không dính frame sau.
- Frame trên không dính frame dưới.
- Lấy frame có width / height lớn nhất của skill làm chuẩn cho toàn bộ frame còn lại.
