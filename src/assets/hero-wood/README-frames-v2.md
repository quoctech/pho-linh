# PHỐ LINH — Nam hệ Mộc — Frame tách rời WebP (V3)

Bộ frame runtime mới cho nhân vật nam hệ Mộc, thay thế bộ sprite V2 cũ.

- Nguồn runtime: moc_1 và moc_2.
- 24 logical strips để giữ nguyên contract của battle/skin preview.
- 108 frame vật lý WebP RGBA 512×512; mỗi animation có 6 frame.
- Một số logical row dùng alias tới cùng frame mới để tránh nhân bản asset.
- `frames-manifest.json` là manifest canonical của runtime.
- Source sheet, ZIP và preview QA không được đưa vào bundle.
