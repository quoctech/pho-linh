# Hàn Triều Phá Không

- **Skill ID:** `skill_han_trieu_pha_khong`
- **Hệ:** thuy
- **Mô tả:** Đâm thương tạo dòng nước băng xuyên mục tiêu, gây sát thương Thủy và giảm tốc.
- **Số frame:** 6
- **Frame chuẩn:** 512 x 512px
- **Nền:** Trong suốt (transparent)

## Quy ước file

- Frame: `frames_webp/skill_han_trieu_pha_khong_01.webp` ... `frames_webp/skill_han_trieu_pha_khong_06.webp`
- Segment gốc: `raw_segments_webp/skill_han_trieu_pha_khong_segment_01.webp` ... `raw_segments_webp/skill_han_trieu_pha_khong_segment_06.webp`
- Preview giãn cách: `previews/skill_han_trieu_pha_khong_equal_spaced_preview.webp`
- Manifest: `skill_han_trieu_pha_khong_manifest.json`

## Quy ước runtime

- Đây là FX-only, không chứa nhân vật hoặc quái.
- Canvas WebP RGBA trong suốt 512 x 512, pivot ở tâm.
- Chạy một lần với timing 115ms cho năm frame đầu và 165ms cho frame cuối.
- Bay từ nhân vật tới mục tiêu; rotation được cấu hình riêng trong runtime.
