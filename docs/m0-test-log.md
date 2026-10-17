# M0 — Test Log

**Milestone:** Match-3 Prototype  
**Date:** 17/10/2026  
**Scope:** board 6×6, năm loại ngọc, deterministic RNG, swap, match, gravity, refill, cascade và reshuffle.

## Automated checks

| Check | Result |
|---|---|
| `npm test -- --watch=false` | Pass — 5 test files, 13 tests |
| `npm run build` | Pass — output tại `www/` |
| `npm run lint` | Pass |
| `git diff --check` | Pass |

Các test logic bao phủ board ổn định, legal move, match giao nhau không double-count, swap sai, cascade, deterministic replay, reshuffle và khóa action trong lúc event animation chạy.

## Manual acceptance checklist

Chạy `npm start`, mở `/home` rồi bấm **Chơi thử Match-3** để kiểm tra trên browser hoặc thiết bị mobile:

- [ ] Tap chọn hai ô kề nhau.
- [ ] Drag swap theo bốn hướng.
- [ ] Swap chéo/xa bị từ chối; swap không tạo nhóm được hoàn tác.
- [ ] Gem có icon/shape riêng, không phụ thuộc chỉ vào màu.
- [ ] Match, gem rơi, refill và cascade hiển thị đúng.
- [ ] Vào/ra Battle nhiều lần không tạo duplicate canvas/listener.
- [ ] Chơi liên tục tối thiểu 10 phút không treo hoặc xuất hiện dead board.
- [ ] Kiểm tra layout trên màn hình hẹp và Android device mục tiêu.

Checklist trên cần xác nhận bằng browser/device thật; automated test không thay thế visual và touch playtest.
