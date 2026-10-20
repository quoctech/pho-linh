# Hỏa Vũ Liên Châu

- **Skill ID:** `skill_hoa_vu_lien_chau`
- **Hệ:** hoa
- **Mô tả:** Bắn liên tiếp nhiều hỏa tiễn, gây sát thương Hỏa nhiều lần lên mục tiêu.
- **Số frame:** 6
- **Frame chuẩn:** 408 x 377px
- **Nền:** Trong suốt (transparent)

## Quy ước file

- Frame: `frames_webp/skill_hoa_vu_lien_chau_01.webp` ... `frames_webp/skill_hoa_vu_lien_chau_06.webp`
- Segment gốc: `raw_segments_webp/skill_hoa_vu_lien_chau_segment_01.webp` ... `raw_segments_webp/skill_hoa_vu_lien_chau_segment_06.webp`
- Preview giãn cách: `previews/skill_hoa_vu_lien_chau_equal_spaced_preview.webp`
- Manifest: `skill_hoa_vu_lien_chau_manifest.json`

## Rule xử lý

- Khử nền tối sang trong suốt.
- Frame trước không dính frame sau.
- Frame trên không dính frame dưới.
- Lấy frame có width / height lớn nhất của skill làm chuẩn cho toàn bộ frame còn lại.
