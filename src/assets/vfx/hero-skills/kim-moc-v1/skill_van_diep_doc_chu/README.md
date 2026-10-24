# Vạn Diệp Độc Chú — WebP 512 clean

- **Skill ID:** `skill_van_diep_doc_chu`
- **Hệ:** moc
- **Mô tả:** Phát tán lá độc trên diện rộng, gây sát thương Mộc và áp dụng trạng thái Dính độc.
- **Số frame:** 6
- **Kích thước frame chuẩn:** 512 x 512px
- **Thời lượng:** 110ms/frame, phát một lần
- **Nguồn:** VAN_DIEP_DOC_CHU_6_FRAME_WEBP512_CLEAN

## Quy ước file

- Frame: `frames_webp/skill_van_diep_doc_chu_01.webp` ... `frames_webp/skill_van_diep_doc_chu_06.webp`
- Segment gốc: `raw_segments_webp/skill_van_diep_doc_chu_segment_01.webp` ... `raw_segments_webp/skill_van_diep_doc_chu_segment_06.webp`
- Preview: `previews/skill_van_diep_doc_chu_equal_spaced_preview.webp`
- Manifest: `skill_van_diep_doc_chu_manifest.json`

## Rule xử lý

- Tách frame theo khoảng trống / ranh giới pixel thực tế.
- Frame trước không dính frame sau.
- Khử nền tối để thuận tiện dùng trong game.
- Các frame còn lại được đặt vào canvas chuẩn theo frame lớn nhất của skill.
