# PHỐ LINH — HERO DUO V2.1 EDGE FIX · Full HD WebP + SFX

Đây là thư mục asset nền của pack V2.1. Toàn bộ hình ảnh và SFX nhân vật nam đã được gỡ để chờ bộ assets 2.5D mới.

## Đã sửa
- Loại bỏ các mảnh rời rạc lọt vào ô sprite từ frame bên cạnh (đặc biệt ở `idle`, `high_hp`, `poisoned`).
- Làm mượt alpha ở đường cắt thẳng sát biên ô của ảnh AI nguồn, tránh đường cụt gắt.
- Chuẩn hóa lại các frame trong khung 512×512 RGBA; có 44px padding trước khi ghép sprite sheet 4 cột.
- Dựng lại sprite sheet WebP từ PNG gốc, không nén chồng lên WebP V2.
- Giữ nguyên phần asset nữ, quái, VFX và audio dùng chung của game.
- `BEFORE_AFTER.webp` cho ví dụ trước/sau; `QA_REPAIR_REPORT.json` ghi phạm vi xử lý và kiểm tra padding.

## Lưu ý quan trọng
Không thể phục hồi chính xác nội dung không tồn tại trong ảnh gốc AI (đầu tóc, mép vạt áo hoặc đuôi tia sáng đã nằm ngoài ô nguồn). Với những mép đó, bản V2.1 *làm mềm đường cắt và loại nhiễu*, không khẳng định đã vẽ lại phần bị mất. Một số VFX mạnh vẫn có thể cần họa sĩ inpaint từ nguồn master tách lớp.

## Cấu trúc
`female/`: assets nhân vật nữ còn lại của pack.
`manifest.json`: metadata trạng thái asset; male hiện unavailable cho đến khi tích hợp pack 2.5D.

Loader hiện bỏ qua toàn bộ asset nam và ẩn nhân vật nam trong thời gian chờ bộ 2.5D. Các animation/SFX interface vẫn được giữ để gắn pack mới sau này.

Kích thước hiển thị hero được khóa theo đúng `displayWidth/displayHeight` của quái đang xuất hiện (`84×84` với Bụi Sương, `92×92` với Miêu Đèn); hiệu ứng chỉ đổi frame, không được scale hero. Sheet runtime hit/dodge đã được chuẩn hóa về ô `480×540` để không méo hoặc làm nhân vật thu/phình khi chuyển trạng thái.
