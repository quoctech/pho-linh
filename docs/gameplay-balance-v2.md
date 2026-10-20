# PHỐ LINH — ĐẶC TẢ LỐI CHƠI & CÂN BẰNG V2

> **Trạng thái:** Đã ghi nhận làm nguồn thiết kế cho đợt gameplay kế tiếp; **chưa triển khai trong code**.
> **Phạm vi:** Match-3 6×6, ngọc, Ngũ Hành, nội tại nghề và công thức combat.
> **Nguồn:** Đặc tả gameplay được chốt ngày 20/10/2026.

## 1. Bàn cờ và năm loại ngọc

Bàn cờ cố định 6×6, gồm đúng năm loại ngọc:

| ID | Nhận diện | Tác dụng khi match-3 |
|---|---|---|
| `attack` | Đỏ, kiếm | Gây sát thương vật lý trực tiếp lên quái |
| `poison` | Tím, đầu lâu/giọt độc | Gây độc theo lượt lên quái |
| `heal` | Xanh lá, tim/lá | Hồi HP cho nhân vật |
| `shield` | Xanh dương, khiên | Tạo shield chặn sát thương |
| `energy` | Vàng, sét | Cộng Nộ vào thanh 0–100 |

Màu không được là tín hiệu duy nhất; mỗi ngọc phải có silhouette/icon riêng.

## 2. Ngũ Hành

Vòng tương khắc:

```text
Kim → Mộc → Thổ → Thủy → Hỏa → Kim
```

So sánh hệ của nhân vật với hệ của quái để lấy `elementalModifier`:

| Quan hệ | Đỏ/Tím: damage | Xanh lá/Xanh dương: heal/shield | Vàng: energy |
|---|---:|---:|---:|
| Nhân vật khắc quái | 130% | 100% | 120% |
| Cùng hệ/hòa | 100% | 100% | 100% |
| Quái khắc nhân vật | 80% | 80% | 100% |

Modifier chỉ điều chỉnh hiệu quả ngọc, không thay đổi board, RNG, lượt hay event order.

## 3. Nội tại nghề theo hệ nhân vật

Nội tại được kích hoạt theo hệ nhân vật, không phụ thuộc vào UI hoặc animation:

| Hệ | Nội tại thiết kế |
|---|---|
| Kim — Sắc Bè & Nộ Cấp Tập | Khi match ngọc đỏ, 25% cơ hội phá thêm một ngọc vàng lân cận để tích Nộ. |
| Mộc — Trị Liệu & Độc Sinh Sôi | Match tím cộng thêm 1 lượt độc; heal vượt quá HP tối đa khi HP đầy chuyển thành shield. |
| Thủy — Kiểm Soát & Hoãn Lượt | Match-4/5 ngọc xanh dương cộng giáp và làm chậm bộ đếm lượt của quái thêm 1 lượt. |
| Hỏa — Cuồng Công & Thiêu Đốt | Match đỏ +20% damage và xuyên/thiêu đốt shield của quái. |
| Thổ — Kiên Cố & Chuyển Hóa | Match vàng nhận thêm shield bằng 50% số Nộ vừa tích. |

Các nội tại có proc phải dùng RNG deterministic của `game-core`, ghi event rõ ràng và không được kích hoạt lại từ animation.

## 4. Trọng số sinh ngọc

Trọng số mặc định khi tạo/refill:

| Ngọc | Tỷ lệ |
|---|---:|
| Đỏ / `attack` | 25% |
| Tím / `poison` | 20% |
| Vàng / `energy` | 20% |
| Xanh lá / `heal` | 18% |
| Xanh dương / `shield` | 17% |

Tổng bằng 100%. Trọng số chỉ dùng trong RNG của game-core; UI không tự sinh ngọc.

## 5. Công thức combat V2

Các công thức dưới đây thay thế công thức balance cũ khi V2 được triển khai. Cho đến lúc đó, code vẫn chạy balance hiện tại trong `GAMEPLAY.md`.

```ts
damage = (player.ATK * tileCount * 0.4) * elementalModifier;
poisonPerTurn = player.ATK * 0.25; // duy trì 3 lượt, cộng dồn tối đa 5 tầng
healAmount = player.maxHP * (0.05 * tileCount);
shieldAmount = player.DEF * 1.5 * tileCount;

function getEnergyGain(matchCount: number): number {
  if (matchCount === 3) return 15;
  if (matchCount === 4) return 25;
  if (matchCount >= 5) return 40;
  return 0;
}
```

Quy ước balance:

- `tileCount` là số ô duy nhất bị clear trong nhóm resolve, không double-count giao điểm.
- Damage, poison, heal và shield chịu cascade multiplier theo tầng resolve.
- Energy dùng mức thưởng theo độ dài match; elemental modifier có thể tăng lượng energy, nhưng cascade multiplier không nhân energy.
- Damage vẫn đi qua các lớp shield/defense theo rule combat tổng quát sau khi tính hiệu quả ngọc.
- Poison tối đa 5 tầng; mỗi lần áp dụng mới cập nhật duration theo rule độc của trận.
- Các giá trị gây số lẻ phải có quy tắc rounding thống nhất trong game-core và test snapshot.

## 6. Cascade và nhịp lượt

Cascade multiplier mặc định:

| Tầng cascade | Multiplier |
|---:|---:|
| 1 | 1.0× |
| 2 | 1.2× |
| 3 | 1.4× |
| 4 trở lên | 1.6× tối đa |

Một swap hợp lệ vẫn là một lượt; resolve toàn bộ cascade trước khi quái hành động. Swap sai không mất lượt. Không thay đổi event order hiện tại:

```text
GEMS_CLEARED → GEMS_FALLING → GEMS_REFILLED → cascade tiếp theo / monster turn
```

Một lượt phải kết thúc khi không còn match; mọi passive/proc phải nằm trong event log deterministic.

## 7. UX bàn cờ

- Thao tác chính là **vuốt từ một ô sang ô kề trực giao** để swap ngay.
- Tap đơn không tạo trạng thái “chọn ô”; nếu không vuốt, chỉ hiển thị hướng dẫn ngắn.
- Vuốt chéo hoặc sang ô không kề không được swap và không mất lượt.
- Khi đang resolve/cascade, khóa input; mở lại sau khi event log của lượt hoàn tất.
- Giữ `reducedMotion`: giảm flash/particle/shake nhưng không giảm phản hồi icon, text hoặc kết quả combat.

## 8. Kế hoạch triển khai sau khi chốt docs

1. Đưa weight, vòng Ngũ Hành, modifier và passive vào balance config versioned.
2. Mở rộng `game-core` để tính modifier/passive bằng RNG seed explicit.
3. Bổ sung payload/event cho proc nội tại, energy/heal/shield/poison và cascade tier.
4. Cập nhật UI telegraph/HUD để giải thích hệ, passive proc và số tầng độc.
5. Viết unit/integration test cho từng hệ, từng loại ngọc, match 3/4/5, cascade và giới hạn poison.
6. Chạy mô phỏng nhiều seed rồi playtest Android trước khi bật balance V2 mặc định.

## 9. Acceptance criteria V2

- Cùng seed và cùng action sequence cho cùng board, event và combat result.
- Modifier 130/100/80% áp đúng theo quan hệ hệ, không ảnh hưởng loại ngọc ngoài phạm vi.
- Mỗi passive chỉ proc một lần theo event gameplay tương ứng.
- Damage, heal, shield, energy và poison khớp công thức sau rounding.
- Poison không vượt 5 tầng; heal dư của Mộc chỉ chuyển shield khi HP đã đầy.
- Vuốt kề swap ngay; tap không để lại selection state.
- Không thay đổi phần thưởng, lượt hoặc board state do VFX/animation.
- Balance version được lưu cùng battle save/replay để không đổi luật giữa trận.
