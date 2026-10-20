# PHỐ LINH — Target Select Map Package

## Thành phần
- `pho_linh_target_map.webp`: map nền đã convert sang WebP
- `pho_linh_target_map_coords.json`: tọa độ node để Phaser 4 đọc và gắn icon

## Thông tin ảnh
- Kích thước: **941 x 1672 px**
- Định dạng: **WebP**

## Node đề xuất
Map hiện có **6 bệ tròn** phù hợp để đính icon quái / boss:

1. `stage_01` — Thiên Nguyệt Đài
2. `stage_02` — U Minh Đài
3. `stage_03` — Xích Viêm Đài
4. `stage_04` — Thanh Trúc Đài
5. `stage_05` — Băng Tinh Đài
6. `stage_06` — Tử Cấm Đài

## Gợi ý dùng trong Phaser 4
```ts
const map = this.add.image(0, 0, 'pho-linh-target-map')
  .setOrigin(0, 0);

const data = this.cache.json.get('pho-linh-target-map-coords');

for (const node of data.nodes) {
  const icon = this.add.image(node.x, node.y, 'monster-icon')
    .setOrigin(0.5, 0.5)
    .setDisplaySize(node.recommendedIconSize.w, node.recommendedIconSize.h);

  const label = this.add.text(
    node.x + node.labelOffset.x,
    node.y + node.labelOffset.y,
    node.name,
    { fontSize: '24px', color: '#ffffff' }
  ).setOrigin(0.5, 0.5);
}
```

## Gợi ý preload
```ts
this.load.image('pho-linh-target-map', 'assets/map/pho_linh_target_map.webp');
this.load.json('pho-linh-target-map-coords', 'assets/map/pho_linh_target_map_coords.json');
```

## Lưu ý
- `x`, `y` là tọa độ pixel gốc theo ảnh 941x1672.
- `normalizedX`, `normalizedY` hỗ trợ nội suy nếu canvas resize.
- `platformRadius` là bán kính ước lượng vùng click / vùng an toàn để đặt icon.
