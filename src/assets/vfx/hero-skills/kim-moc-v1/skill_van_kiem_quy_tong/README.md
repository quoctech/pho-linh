# Vạn Kiếm Quy Tông

- **Skill ID:** `skill_van_kiem_quy_tong`
- **Hệ:** kim
- **Mô tả:** Triệu hồi hàng loạt kiếm khí tấn công liên tiếp, gây sát thương Kim nhiều lần.
- **Số frame:** 6
- **Kích thước frame chuẩn:** 512 x 512px

## Quy ước file

- Frame: `frames_webp/skill_van_kiem_quy_tong_01.webp` ... `frames_webp/skill_van_kiem_quy_tong_06.webp`
- Segment gốc: `raw_segments_webp/skill_van_kiem_quy_tong_segment_01.webp` ... `raw_segments_webp/skill_van_kiem_quy_tong_segment_06.webp`
- Preview: `previews/skill_van_kiem_quy_tong_equal_spaced_preview.webp`
- Manifest: `skill_van_kiem_quy_tong_manifest.json`

## Quy ước runtime

- Đây là FX-only, không chứa nhân vật hoặc quái.
- Canvas WebP RGBA lossless 512 x 512, pivot ở tâm.
- Chạy một lần ở khoảng 8 FPS, theo timing frame trong manifest.
- Di chuyển toàn bộ FX object giữa nhân vật và mục tiêu; không reposition từng frame.
