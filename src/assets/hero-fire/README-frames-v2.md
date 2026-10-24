# PHỐ LINH — Hỏa — Frame tách rời WebP (V2)

Bộ frame runtime mới từ `hoa_1` và `hoa_2`, thay thế toàn bộ sprite Hỏa cũ.

- 24 logical rows giữ nguyên contract của battle và skin preview.
- 18 animation vật lý, tổng cộng 108 frame WebP mới.
- Các trạng thái trùng hoặc không có animation riêng dùng alias tới frame tương thích.
- `frames-manifest.json` là manifest canonical của runtime.

Bộ này được xử lý theo cùng rule chuẩn với nam hệ Kim:

- tách frame theo khoảng trắng / ranh giới thực tế trước
- sau đó crop alpha
- lấy frame lớn nhất của từng dòng làm chuẩn
- tạo strip mới với frame độc lập và khoảng cách rộng

- Tổng strip: **24**
- Tổng frame riêng: **144**
- Gap giữa frame trong strip mới: **80px**
