# Phần Thiên Xạ Nhật

- **Skill ID:** `skill_phan_thien_xa_nhat`
- **Hệ:** hoa
- **Mô tả:** Bắn một mũi tên hỏa diễm cực mạnh, phát nổ gây sát thương diện rộng và Thiêu đốt.
- **Số frame:** 6
- **Frame chuẩn:** 512 x 512px
- **Nền:** Trong suốt (transparent)

## Quy ước file

- Frame: `frames_webp/skill_phan_thien_xa_nhat_01.webp` ... `frames_webp/skill_phan_thien_xa_nhat_06.webp`
- Segment gốc: `raw_segments_webp/skill_phan_thien_xa_nhat_segment_01.webp` ... `raw_segments_webp/skill_phan_thien_xa_nhat_segment_06.webp`
- Preview giãn cách: `previews/skill_phan_thien_xa_nhat_equal_spaced_preview.webp`
- Manifest: `skill_phan_thien_xa_nhat_manifest.json`

## Quy ước runtime

- Đây là FX-only, không chứa nhân vật hoặc quái.
- Canvas WebP RGBA trong suốt 512 x 512, pivot ở tâm.
- Chạy một lần ở 10 FPS, bay từ nhân vật tới mục tiêu rồi kết thúc bằng vùng nổ.
- Runtime áp dụng rotation cố định `30°`, tint lửa vàng-cam và scale lớn hơn nhẹ bằng Phaser.
