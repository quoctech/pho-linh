# PHỐ LINH — Nam hệ Thổ — Frame tách rời WebP (V3)

Bộ frame runtime mới cho nhân vật nam hệ Thổ, thay thế bộ sprite V2 cũ.

- Nguồn runtime: tho_1 và tho_2.
- 24 logical strips để giữ nguyên contract của battle/skin preview.
- 108 frame vật lý WebP RGBA 512×512; mỗi animation có 6 frame.
- Một số logical row dùng alias tới cùng frame mới để tránh nhân bản asset.
- `frames-manifest.json` là manifest canonical của runtime.
- Source sheet, ZIP và preview QA không được đưa vào bundle.
