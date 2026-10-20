# PHỐ LINH — ĐẶC TẢ LỐI CHƠI, CHỈ SỐ & CÂN BẰNG V6

> **Trạng thái:** **Đã triển khai trong runtime** (`combat.json.balanceVersion = 6`); còn cần mô phỏng nhiều seed và playtest Android để tinh chỉnh số liệu.
>
> **V6 (20/10/2026):** thang chỉ số hàng nghìn, chỉ số Lv1 theo hệ, né theo AGI `AGI / (AGI + 1900)` cho nhân vật và quái, DEF giảm sát thương theo % `DEF / (DEF + 1900)`, nội tại bàn cờ theo hệ (mục 3.1), năng lượng match ≥5 = 40. Các số cố định cũ quy đổi ×30 hoặc sang % (mục 8).
>
> **V5:** skill quái data-driven trong `monsters.json → skills` (xem `GAMEPLAY.md §11.9`). **V4:** quy tắc resolver skill nhân vật (xem `GAME_DATA_CENTER.md → Quy tắc resolver skill`).
>
> **Dữ liệu:** mọi con số nằm trong `src/assets/game-data/{character,monsters,combat}.json`; logic ở `src/game-core` (`battle.ts`, `combat-formulas.ts`, `resolve.ts`, `monsters/*`).

## 1. Bàn cờ và năm loại ngọc

Bàn cờ cố định 6×6, gồm đúng năm loại ngọc:

| ID | Nhận diện | Tác dụng khi match-3 |
|---|---|---|
| `attack` | Đỏ, kiếm | Sát thương vật lý trực tiếp lên quái |
| `poison` | Tím, đầu lâu | Độc DoT theo lượt lên quái (tối đa 5 tầng) |
| `heal` | Xanh lá, tim/lá | Hồi HP cho nhân vật |
| `shield` | Xanh dương, khiên | Tạo Khiên chặn sát thương |
| `energy` | Vàng, sét | Cộng Nộ vào thanh 0–100 để dùng skill |

Trọng số sinh ngọc (`combat.json → match3.gemWeights`): Đỏ 25% · Tím 20% · Vàng 20% · Xanh lá 18% · Xanh dương 17%.

## 2. Ngũ Hành

Vòng tương khắc: `Kim → Mộc → Thổ → Thủy → Hỏa → Kim` (mỗi hệ khắc hệ kế tiếp).

| Quan hệ | Đỏ/Tím (damage) | Xanh lá/Xanh dương (support) | Vàng (energy) |
|---|---:|---:|---:|
| Nhân vật khắc quái | 130% | 100% | 120% (match-3 = 18 nộ) |
| Cùng hệ / hòa | 100% | 100% | 100% |
| Quái khắc nhân vật | 80% | 80% | 100% |

Hệ quái: Sương Hồn & Cáo Mây — Thủy, Miêu Đèn — Hỏa, Bọ Lá Tre — Mộc.

## 3. Nội tại theo hệ

Hai lớp nội tại chạy song song; tham số trong `character.json → passives`, mọi proc dùng RNG deterministic của `game-core` và phát `PASSIVE_TRIGGERED`.

### 3.1. Nội tại bàn cờ (mới ở V6)

| Hệ | Cơ chế | Tham số |
|---|---|---|
| Kim — Kiếm Tông | Mỗi cascade có ngọc Đỏ: 25% phá thêm 1 ngọc Vàng kề trực giao (ô đầu tiên theo hàng/cột), viên đó cho **+15 nộ** (× modifier năng lượng); ô trống rơi/refill như thường. | `yellowBreakChance 0.25`, `yellowBreakEnergy 15` |
| Mộc — Linh Mộc Sư | Ngọc Tím duy trì độc **+1 lượt** (3 → 4). Hồi máu dư từ ngọc Xanh lá khi đầy HP chuyển thành **Khiên**. | `poisonExtraTurns 1`, `overhealToShield` |
| Thủy — Hàn Thủy Thương | Match ngọc Xanh dương có dòng ≥4: khiên **×1.5** và **hoãn đòn đánh** của quái lượt kế (quái vẫn đi ngọc, DoT vẫn tick, không dùng skill). Quái vừa bị hoãn bị **Làm chậm** 2 hành động. | `shieldMatchMin 4`, `shieldBonusRatio 0.5`, `delayMonsterAttackTurns 1`, `slowedTurnsAfterDelay 2` |
| Hỏa — Viêm Vũ Cung | Ngọc Đỏ **+20%** sát thương và **xuyên khiên** quái (vào thẳng HP); vẫn gây Thiêu đốt DoT 10% ATK × 3 lượt. | `redDamageBonus 0.2`, `redPierceShield`, `burningTurns 3`, `burningAtkFactor 0.1` |
| Thổ — Huyền Thổ Vệ | Ngọc Vàng: nhận Khiên = **50% nộ vừa tích × 30** (15 nộ → 225 khiên). | `energyToShieldRatio 0.5`, `energyToShieldScale 30` |

### 3.2. Nội tại nghề

| Hệ | Nội tại | Cơ chế |
|---|---|---|
| Kim | Kiếm Tâm Bất Diệt | Từ đòn trực tiếp thứ 2 liên tiếp vào cùng mục tiêu: 40% chí mạng, chí mạng +40% sát thương. |
| Mộc | Sinh Cơ Bất Tận | Quái đang dính độc → hồi máu của nhân vật ×1.4. |
| Thủy | Hàn Tức Ngưng Kết | Quái đang bị **Làm chậm** (vừa bị hoãn đòn) → Băng Phong Thiên Lý đóng băng **+1 lượt**. (Bỏ cơ chế giảm 25% từ đòn thứ 3 của V3.) |
| Hỏa | Liệt Diễm Chi Tâm | Mục tiêu đang Thiêu đốt nhận thêm **+20%** sát thương (ngọc + skill; thay +20 cố định). |
| Thổ | Bất Động Như Sơn | Đang có Khiên → sát thương nhận giảm 10% trước khi khiên hấp thụ. |

## 4. Chỉ số

### 4.1. Công thức chung (`combat-formulas.ts`)

```ts
dodgeChance = AGI / (AGI + 1900)              // tối đa 90%
mitigation  = DEF / (DEF + 1900)              // sát thương × (1 − mitigation), mọi đòn
```

- Nhân vật chỉ né **đòn thường/nặng** của quái (`PLAYER_DODGED`); skill quái luôn trúng.
- Quái chỉ né **ngọc Đỏ**; né = AGI + buff né từ skill quái (V5). Skill nhân vật luôn trúng.

### 4.2. Nhân vật Lv1 (`character.json → elementBaseStats`)

| Chỉ số | Kim | Mộc | Thủy | Hỏa | Thổ |
|---|---:|---:|---:|---:|---:|
| HP | 9.000 | 11.000 | 10.000 | 8.500 | 13.000 |
| Năng lượng | 100 | 100 | 100 | 100 | 100 |
| ATK | 1.250 | 950 | 1.000 | 1.300 | 750 |
| DEF | 400 | 500 | 550 | 350 | 800 |
| AGI (né) | 180 (8,7%) | 120 (5,9%) | 150 (7,3%) | 220 (10,4%) | 60 (3,1%) |

Điểm thuộc tính vượt mốc khởi đầu (5/5/5/5): +1 STR = +25 ATK, +1 VIT = +200 HP & +10 DEF, +1 AGI = +5 AGI. Trang bị (`items.ts`) nhân `equipmentScale = 25`.

### 4.3. Quái (`monsters.json → definitions`)

| Quái | Hệ | Vai trò | HP | ATK | DEF | AGI (né) |
|---|---|---|---:|---:|---:|---:|
| Sương Hồn | Thủy | Băng / khống chế (trâu, lỳ) | 10.500 | 950 | 600 | 150 (7,3%) |
| Miêu Đèn | Hỏa | Sát thủ (nhanh, đập đau, mỏng) | 7.800 | 1.350 | 320 | 300 (13,6%) |
| Bọ Lá Tre | Mộc | Trị liệu / rút máu (né cao, dai) | 11.500 | 850 | 450 | 250 (11,6%) |
| Cáo Mây | Thủy | Phép / né ảo (khó đánh) | 8.800 | 1.100 | 400 | 380 (16,7%) |

Năng lượng tối đa của quái = 100.

## 5. Công thức ngọc

```ts
damage = applyDefense(ATK × tileCount × 0.4 × elementalModifier × comboMult × crit × fireBonus × burningBonus, monsterDEF) × vulnerability
poisonPerStack = round(ATK × 0.25 × elementalModifier × comboMult)        // tối đa 5 tầng, 3 lượt (+1 Mộc)
heal   = round(maxHP × 0.05 × tileCount × supportModifier × comboMult)
shield = round(DEF × 1.5 × tileCount × supportModifier × comboMult)       // × 1.5 nếu Thủy match ≥4
energy = { 3: 15, 4: 25, ≥5: 40 } × energyModifier                        // không nhân combo
```

- `tileCount` là số ô duy nhất bị clear trong nhóm resolve.
- Cascade multiplier: 1.0× / 1.2× / 1.4× / 1.6× (tầng 4+). Bỏ `agiMult` của V3 — AGI giờ chỉ quyết định né.
- Quái đánh: `applyDefense(ATK quái × hệ số đòn × hệ số số ngọc, playerDEF)` → nội tại Thổ × giảm chủ động (Huyền Nham) → khiên → HP → phản đòn.
- Làm tròn `Math.round` thống nhất trong game-core (có chống sai số float).

## 6. Cascade và nhịp lượt

Một swap hợp lệ là một lượt; resolve toàn bộ cascade trước khi quái hành động. Swap sai không mất lượt.

**Giới hạn lượt:** tạm bỏ — `combat.json → battle.maxTurns = 0` nghĩa là không giới hạn (HUD hiện "Lượt N"). Đặt lại số dương (vd 24) để bật lại thua do hết lượt (`turn_limit`).

Event order giữ nguyên:

```text
GEMS_CLEARED → GEMS_FALLING → GEMS_REFILLED → cascade tiếp theo / monster turn
```

## 7. UX bàn cờ

- Vuốt từ một ô sang ô kề trực giao để swap; tap không tạo selection state.
- Khóa input khi đang resolve/cascade.
- Màn PK V6: số ≥1.000 hiển thị có dấu chấm (9.000); nhân vật né có "💨 NÉ! x%" + anim dodge; Kim phá ngọc vàng nổ cùng đợt + "⚡ +15 NỘ"; Thủy hoãn đòn "🐢 HOÃN ĐÒN" + badge Làm chậm; Hỏa "🔥 XUYÊN KHIÊN"; Thổ/Mộc hiện khiên nhận thêm.

## 8. Quy đổi số cố định (V6)

| Mục | V5 | V6 |
|---|---:|---:|
| Hàn Triều Phá Không trừ khiên | 22 | 660 |
| Trúc Diệp Độc Châm sát thương gốc | 10 | 300 |
| Vụ Lưu Thuẫn khiên sương | 60 | 1.800 |
| Khiên tối đa Sương Hồn | 50 | 1.500 |
| Khiên guard Sương Hồn | 20 | 600 |
| Guard cộng DEF | +12 | +20% DEF gốc |
| Độc quái gieo lên nhân vật | tactics.poison × 1.5 | 30% ATK quái / lượt |
| Ngọc hồi máu của quái | 8 + level × 2 | 3% maxHP / viên |
| Ngọc khiên của quái | 8 + DEF × 0.5 | 240 + DEF × 0.5 / viên |
| Trang bị | ×1 | ×25 |

## 9. Trạng thái triển khai

- [x] Chỉ số theo hệ + quái V6 trong JSON, công thức AGI/DEF chung (`combat-formulas.ts`).
- [x] Năm nội tại bàn cờ + nội tại nghề Thủy/Hỏa mới, có event và test (`battle-v2.spec.ts`).
- [x] Màn PK hiển thị né hai phía, nội tại bàn cờ, số lớn.
- [ ] Mô phỏng nhiều seed + playtest Android để tinh chỉnh (số lượt trung bình mỗi trận, tỉ lệ thắng theo hệ).

## 10. Acceptance criteria

- Cùng seed và cùng action sequence cho cùng board, event và kết quả.
- Modifier 130/100/80% đúng quan hệ hệ; né/DEF đúng công thức sau làm tròn.
- Mỗi nội tại chỉ proc một lần theo event gameplay tương ứng; không kích hoạt lại từ UI/VFX.
- Balance version lưu cùng battle save/replay.
