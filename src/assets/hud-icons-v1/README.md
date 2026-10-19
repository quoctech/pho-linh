# PHỐ LINH — HUD & Skill Icons WebP

Bao gồm HUD máu, năng lượng và trạng thái; icon kỹ năng nhân vật và quái. Ảnh WebP có alpha.

## Quy trình

Tách từng ô theo lưới nguồn trước → trim alpha bên trong ô → chuẩn hóa frame theo kích thước lớn nhất cùng dòng → xuất frame riêng và strip ngang 6 frame (gap 50px).

## Nội dung

- `hud_status`: HUD tổng và 6 panel độc lập
- `skill_icons_fantasy`: 8 strips, 48 frames
- `skill_icons_elemental`: 12 strips, 72 frames
- `skill_icons_monsters`: 4 strips, 24 frames

JSON `manifest.json` chứa toạ độ nguồn, canvas và atlas rect để tích hợp Phaser.

**Lưu ý:** Đây là bộ ảnh tĩnh / các trạng thái mẫu lấy từ artwork đã duyệt; FPS, loop và transition cần cấu hình thêm trong game. Với vùng vẽ chạm biên ô ảnh nguồn, phải chỉnh nguồn nếu muốn không mất nét hiệu ứng.
