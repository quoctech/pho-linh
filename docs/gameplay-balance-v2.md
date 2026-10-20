# PHỐ LINH — ĐẶC TẢ LỐI CHƠI & CÂN BẰNG V3

> **Trạng thái:** **Đã triển khai trong runtime** (`combat.json.balanceVersion = 3`); còn cần mô phỏng nhiều seed và playtest Android để tinh chỉnh số liệu.
> **Phạm vi:** Match-3 6×6, ngọc, Ngũ Hành, nội tại nghề và công thức combat.
> **Nguồn:** Đặc tả gameplay được chốt ngày 20/10/2026; cập nhật cơ chế nội tại bàn cờ ngày 20/10/2026.
> **Dữ liệu:** mọi con số nằm trong `src/assets/game-data/combat.json` và `character.json`; logic ở `src/game-core` (xem `elements.ts`, `battle.ts`).

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

### Hệ của quái (M2)

| Quái | Hệ | Quan hệ gợi ý |
|---|---|---|
| `mist_blob` — Sương Hồn | Thủy (`water`) | — |
| `lantern_cat` — Miêu Đèn | Hỏa (`fire`) | — |
| `bamboo_mantis` — Bọ Lá Tre | Mộc (`wood`) | — |
| `cloud_fox_boss` — Cáo Mây | Thủy (`water`) | — |

Hệ lưu ở `monsters.json` theo field `element`; thiếu field thì core coi là hòa/neutral.

## 3. Nội tại nghề theo hệ nhân vật

Nội tại là **cơ chế bàn cờ** kích hoạt theo hệ nhân vật, không phụ thuộc UI/animation.
Tham số nằm trong `character.json → passives`; mọi proc dùng RNG deterministic của `game-core`,
phát event `PASSIVE_TRIGGERED` (hoặc `MONSTER_ACTION_DELAYED`) và **không** được kích hoạt lại từ lớp Phaser.

| Hệ | Nội tại | Cơ chế (đã triển khai) | Tham số |
|---|---|---|---|
| Kim — Kiếm Tâm Bất Diệt | Chí mạng liên kích | Từ đòn đánh trực tiếp thứ hai liên tiếp vào cùng mục tiêu, có **40%** cơ hội chí mạng; chí mạng tăng damage **40%**. | `criticalChanceBonus: 0.4`, `criticalDamageBonus: 0.4` |
| Mộc — Sinh Cơ Bất Tận | Hồi phục cộng hưởng | Khi quái đang dính độc, mọi hồi HP của player tăng **40%**. | `healMultiplierWhenPoisoned: 1.4` |
| Thủy — Hàn Tức Ngưng Kết | Giảm damage liên hoàn | Từ lần nhận damage thứ ba liên tiếp, incoming damage giảm **25%** trước khi trừ khiên. | `damageStreakMin: 3`, `damageReduction: 0.25` |
| Hỏa — Liệt Diễm Chi Tâm | Thiêu đốt bùng nổ | Đòn đỏ áp Thiêu đốt 3 lượt; khi đánh mục tiêu đang Thiêu đốt, direct damage cộng **20**. Burning tick bằng 10% ATK mỗi lượt quái. | `burnDamageBonus: 20`, `burningTurns: 3`, `burningAtkFactor: 0.1` |
| Thổ — Bất Động Như Sơn | Sơn giáp | Khi player đang có Khiên, mọi incoming damage giảm **10%** trước khi khiên hấp thụ. | `shieldDamageReduction: 0.1` |

Chuỗi Kim reset khi không có attack trực tiếp hoặc đổi mục tiêu. Chuỗi Thủy reset khi lượt quái không gây damage.
Critical và burning dùng RNG/state deterministic; UI chỉ đọc event từ `game-core`.

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
damage      = round(player.ATK * tileCount * 0.4 * elementalModifier('damage') * comboMult * agiMult * criticalMult + burningBonus) - monsterDEF; // min 1
perStack    = round(player.ATK * 0.25 * elementalModifier('damage') * comboMult);           // độc mỗi tầng/lượt
poisonTotal = stacks * perStack;                                                            // stacks ≤ 5, duration 3 (+1 nếu Mộc)
healAmount  = round(player.maxHP * 0.05 * tileCount * elementalModifier('support') * comboMult);
shieldAmount = round(player.DEF * 1.5 * tileCount * elementalModifier('support') * comboMult);

function getEnergyGain(matchLength: number): number {   // KHÔNG nhân comboMult
  if (matchLength === 3) return 15;
  if (matchLength === 4) return 25;
  if (matchLength === 5) return 40;
  if (matchLength >= 6) return 50;
  return 0;
}                                                        // rồi × elementalModifier('energy')
```

Trong đó `criticalMult = 1.4` khi Kim proc, nếu không là `1`; `burningBonus = 20`
chỉ dành cho hero Hỏa đánh mục tiêu đang burning. Burning tick là damage-over-time,
không crit. Damage nhận vào áp dụng `waterReduction` từ hit thứ 3 liên tiếp và
`earthReduction` khi player đang có khiên trước bước hấp thụ khiên.

Kỹ năng hệ Kim dùng công thức riêng trong `character.json`: `Vạn Kiếm Quy Tông`
tiêu 60 năng lượng, gây `120% ATK` và bị khiên hấp thụ trước HP; `Kim Quang Phá
Giáp` tiêu 100 năng lượng, gây `180% ATK` xuyên khiên và giảm 30% DEF của quái
trong 2 lượt tiếp theo. Cả hai vẫn đi qua common player-skill resolver.

Các hệ còn lại cũng dùng chung resolver và cost riêng: Mộc 50/90 (80% ATK + hút
15 năng lượng; 90% ATK + độc 20% ATK trong 3 lượt), Thủy 50/100 (trừ 22 khiên/HP;
110% ATK + đóng băng 1 lượt), Hỏa 60/100 (3 × 40% ATK; 150% ATK + tăng sát
thương nhận 15% trong 2 lượt), Thổ 65/80 (70% ATK + 40% choáng; khiên 200% DEF,
giảm 25%, miễn khống chế và phản 35%). Tooltip đọc trực tiếp config để hiển thị
cost, hệ số và hiệu ứng; đủ cost thì skill sáng và bấm được với mọi monster.

Quy ước balance:

- `tileCount` là số ô duy nhất bị clear trong nhóm resolve, không double-count giao điểm.
- Damage, poison (potency mỗi tầng), heal và shield chịu cascade multiplier theo tầng resolve.
- Energy dùng mức thưởng theo độ dài match (3/4/5/6 → 15/25/40/50); elemental modifier có thể tăng energy, nhưng **cascade multiplier không nhân energy**.
- `agiMult = 1 + agiBonus` chỉ áp cho sát thương ngọc đỏ ở cascade ≥ 2 (giữ ý nghĩa của AGI từ công thức baseline).
- Damage vẫn đi qua lớp shield rồi trừ defense (min 1) sau khi tính hiệu quả ngọc.
- **Độc theo tầng:** mỗi nhóm ngọc tím cộng **1 tầng** (tối đa `poisonMaxStacks = 5`), mỗi tầng gây `perStack` sát thương/lượt; mỗi lần áp dụng mới reset duration về `poison.turns` (Mộc → +1).
- Các giá trị gây số lẻ dùng `Math.round` thống nhất trong game-core và có test snapshot.

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

## 8. Trạng thái triển khai

- [x] Đưa weight, vòng Ngũ Hành, modifier và passive vào balance config versioned (`combat.json`/`character.json`, `balanceVersion = 3`).
- [x] Mở rộng `game-core` để tính modifier/passive bằng RNG seed explicit (`elements.ts`, `battle.ts`).
- [x] Bổ sung payload/event cho proc nội tại (`PASSIVE_TRIGGERED`), critical, burning, energy/heal/shield/poison và cascade tier.
- [x] Viết unit/integration test cho từng hệ, từng loại ngọc, match 3/4/5/6, độc theo tầng và nội tại (`elements.spec.ts`, `battle-v2.spec.ts`).
- [x] Cập nhật UI feedback cho critical damage màu vàng và burning.
- [ ] Chạy mô phỏng nhiều seed rồi playtest Android để tinh chỉnh số liệu cân bằng.

## 9. Acceptance criteria V2

- Cùng seed và cùng action sequence cho cùng board, event và combat result.
- Modifier 130/100/80% áp đúng theo quan hệ hệ, không ảnh hưởng loại ngọc ngoài phạm vi.
- Mỗi passive chỉ proc một lần theo event gameplay tương ứng.
- Damage, heal, shield, energy, poison, critical và burning khớp công thức sau rounding.
- Hiệu lực của năm nội tại được áp dụng đúng theo mô tả thiết kế và không bị kích hoạt lại từ UI/VFX.
- Vuốt kề swap ngay; tap không để lại selection state.
- Không thay đổi phần thưởng, lượt hoặc board state do VFX/animation.
- Balance version được lưu cùng battle save/replay để không đổi luật giữa trận.
