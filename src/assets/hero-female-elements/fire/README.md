# PHỐ LINH — Nữ hệ Hỏa — Frame độc lập WebP (V2)

Đã xử lý theo rule chuẩn:

- frame trước không đè frame sau
- frame trên không đè frame dưới
- tách theo khoảng trắng / ranh giới thực tế trước
- sau đó crop alpha
- chuẩn hóa theo frame lớn nhất của từng dòng
- xuất WebP, manifest và strip giãn cách

- Tổng strip: **24**
- Tổng frame riêng: **144**
- Gap giữa frame trong strip mới: **80px**
