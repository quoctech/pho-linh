# PHỐ LINH — Hỏa — Frame tách rời WebP (V2)

Bộ này được xử lý theo cùng rule chuẩn với nam hệ Kim:

- tách frame theo khoảng trắng / ranh giới thực tế trước
- sau đó crop alpha
- lấy frame lớn nhất của từng dòng làm chuẩn
- tạo strip mới với frame độc lập và khoảng cách rộng

- Tổng strip: **24**
- Tổng frame riêng: **144**
- Gap giữa frame trong strip mới: **80px**
