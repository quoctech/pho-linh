# M1 — Test Log

**Milestone:** Vertical slice săn quái
**Scope:** Home → Hunt → Battle → Result → Retry, Sương Hồn, combat gem effects, skill, terminal state và checkpoint offline.

## Automated checks

| Check | Result |
|---|---|
| `npm test -- --watch=false` | Pass — 6 test files, 21 tests |
| `npm run build` | Pass — output tại `www/` |
| `npm run lint` | Pass |
| `git diff --check` | Pass |

## Manual acceptance checklist

- [ ] Mở `/home`, vào `/hunt`, chọn **Sương Hồn**.
- [ ] Swap hợp lệ gây damage; gem hồi HP, tạo khiên, nạp energy và gây độc có feedback.
- [ ] Quái phản công sau mỗi lượt; telegraph và thanh HP cập nhật rõ.
- [ ] Đủ energy dùng **Đèn Phá Mây**; skill có thể kết liễu trước đòn phản công.
- [ ] Thắng, thua và bỏ trận đều tới `/result/:battleId`; nút **Thử lại** tạo phiên mới.
- [ ] Rời app/trang trong lúc chơi rồi quay lại không làm mất checkpoint ở ranh giới action.
- [ ] Kiểm tra touch và layout trên màn hình rộng 320–420 CSS px và Android device mục tiêu.

Automated test không thay thế browser/device playtest. Chỉ đánh dấu gate M1 → M2 sau khi checklist này được xác nhận.
