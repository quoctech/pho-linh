# PHỐ LINH — ĐẶC TẢ LỐI CHƠI, CHỈ SỐ & CÂN BẰNG V7

> **Trạng thái:** **Đã triển khai trong runtime** (`combat.json.balanceVersion = 7`). Tiến độ và kết quả mô phỏng của đợt V7 ở **mục 11**.
>
> **V7 (24/10/2026):** mục tiêu mỗi trận PK **4–5 phút** (≈ 20–25 lượt). Nguyên tắc: *sát thương > hồi phục* ở cả hai phía — giảm hồi máu/khiên (người chơi lẫn quái), ngọc Đỏ thành nguồn sát thương chính thay vì Độc, thu hẹp chênh lệch giữa các hệ và giữa khắc/bị khắc, đảo lại đường cong độ khó (Sương Hồn dễ nhất, Cáo Mây là boss thật), thêm **Cuồng Nộ** chống kéo trận (mục 6.1).
>
> **V6 (20/10/2026):** thang chỉ số hàng nghìn, chỉ số Lv1 theo hệ, né theo AGI `AGI / (AGI + 1900)` cho nhân vật và quái, DEF giảm sát thương theo % `DEF / (DEF + 1900)`, nội tại bàn cờ theo hệ (mục 3.1), năng lượng match ≥5 = 40. Các số cố định cũ quy đổi ×30 hoặc sang % (mục 8).
>
> **V5:** skill quái data-driven trong `monsters.json → skills` (xem `GAMEPLAY.md §11.9`). **V4:** quy tắc resolver skill nhân vật (xem `GAME_DATA_CENTER.md → Quy tắc resolver skill`).
>
> **Dữ liệu:** mọi con số nằm trong `src/assets/game-data/{character,monsters,combat}.json`; logic ở `src/game-core` (`battle.ts`, `combat-formulas.ts`, `enrage.ts`, `resolve.ts`, `monsters/*`). Đổi số xong chạy `npm run balance:sim` (mục 11.1).

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
| Nhân vật khắc quái | 120% | 100% | 120% (match-3 = 18 nộ) |
| Cùng hệ / hòa | 100% | 100% | 100% |
| Quái khắc nhân vật | 85% | 90% | 100% |

V7 thu hẹp từ 130/80/80 (V6): cặp khắc trước đây chênh tỉ lệ thắng tới 60 điểm % (Kim vs Miêu Đèn 38% ↔ Thổ vs Cáo Mây 95%).

Hệ quái: Sương Hồn & Cáo Mây — Thủy, Miêu Đèn — Hỏa, Bọ Lá Tre — Mộc.

## 3. Nội tại theo hệ

Hai lớp nội tại chạy song song; tham số trong `character.json → passives`, mọi proc dùng RNG deterministic của `game-core` và phát `PASSIVE_TRIGGERED`.

### 3.1. Nội tại bàn cờ

| Hệ | Cơ chế | Tham số |
|---|---|---|
| Kim — Kiếm Tông | Mỗi cascade có ngọc Đỏ: 25% phá thêm 1 ngọc Vàng kề trực giao (ô đầu tiên theo hàng/cột), viên đó cho **+15 nộ** (× modifier năng lượng); ô trống rơi/refill như thường. | `yellowBreakChance 0.25`, `yellowBreakEnergy 15` |
| Mộc — Linh Mộc Sư | Ngọc Tím duy trì độc **+1 lượt** (3 → 4). Hồi máu dư từ ngọc Xanh lá khi đầy HP chuyển thành **Khiên**. | `poisonExtraTurns 1`, `overhealToShield` |
| Thủy — Hàn Thủy Thương | Match ngọc Xanh dương có dòng ≥4: khiên **×1.5** và **hoãn đòn đánh** của quái lượt kế (quái vẫn đi ngọc, DoT vẫn tick, không dùng skill). Quái vừa bị hoãn bị **Làm chậm** 2 hành động. | `shieldMatchMin 4`, `shieldBonusRatio 0.5`, `delayMonsterAttackTurns 1`, `slowedTurnsAfterDelay 2` |
| Hỏa — Viêm Vũ Cung | Ngọc Đỏ **+10%** sát thương (V6: 20%) và **xuyên khiên** quái (vào thẳng HP); vẫn gây Thiêu đốt DoT 10% ATK × 3 lượt. | `redDamageBonus 0.1`, `redPierceShield`, `burningTurns 3`, `burningAtkFactor 0.1` |
| Thổ — Huyền Thổ Vệ | Ngọc Vàng: nhận Khiên = **35% nộ vừa tích × 30** (V6: 50%; 15 nộ → 158 khiên). | `energyToShieldRatio 0.35`, `energyToShieldScale 30` |

### 3.2. Nội tại nghề

| Hệ | Nội tại | Cơ chế |
|---|---|---|
| Kim | Kiếm Tâm Bất Diệt | Từ đòn trực tiếp thứ 2 liên tiếp vào cùng mục tiêu: 40% chí mạng, chí mạng +40% sát thương. |
| Mộc | Sinh Cơ Bất Tận | Quái đang dính độc → hồi máu của nhân vật ×1.4. |
| Thủy | Hàn Tức Ngưng Kết | Quái đang bị **Làm chậm** (vừa bị hoãn đòn) → Băng Phong Thiên Lý đóng băng **+1 lượt**. |
| Hỏa | Liệt Diễm Chi Tâm | Mục tiêu đang Thiêu đốt nhận thêm **+20%** sát thương (ngọc + skill). |
| Thổ | Bất Động Như Sơn | Đang có Khiên → sát thương nhận giảm 10% trước khi khiên hấp thụ. |

### 3.3. Skill nhân vật đổi ở V7

| Skill | V6 | V7 |
|---|---|---|
| Hàn Triều Phá Không (Thủy, 50 nộ) | trừ 660 khiên/HP | trừ **1.100** khiên/HP |
| Băng Phong Thiên Lý (Thủy, 100 nộ) | 110% ATK + đóng băng | **140%** ATK + đóng băng |

Các skill khác giữ hệ số %ATK (xem `GAME_DATA_CENTER.md`).

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
| HP | 10.500 | 11.000 | 10.000 | 10.000 | 10.500 |
| Năng lượng | 100 | 100 | 100 | 100 | 100 |
| ATK | 1.150 | 1.050 | 1.100 | 1.050 | 1.150 |
| DEF | 450 | 500 | 550 | 350 | 550 |
| AGI (né) | 180 (8,7%) | 120 (5,9%) | 150 (7,3%) | 220 (10,4%) | 60 (3,1%) |

V6 → V7: Kim 9.000/1.250/400 → 10.500/1.150/450 · Mộc ATK 950 → 1.050 · Thủy ATK 1.000 → 1.100 · Hỏa 8.500/1.300 → 10.000/1.050 · Thổ 13.000/750/800 → 10.500/1.150/550. Thổ V6 vừa trâu vừa đánh yếu nên trận nào cũng dài; Hỏa V6 hạ quái quá nhanh.

Điểm thuộc tính vượt mốc khởi đầu (5/5/5/5): xem mục 4.4. Trang bị (`items.ts`) nhân `equipmentScale = 25`.

### 4.3. Quái (`monsters.json → definitions`)

| Quái | Hệ | Lv | Vai trò | HP | ATK | DEF | AGI (né) | Trần khiên |
|---|---|---:|---|---:|---:|---:|---:|---:|
| Sương Hồn | Thủy | 1 | Nhập môn · băng / khống chế | 9.500 | 700 | 600 | 150 (7,3%) | 1.500 |
| Miêu Đèn | Hỏa | 2 | Sát thủ (nhanh, đập đau) | 14.000 | 1.050 | 320 | 300 (13,6%) | 800 |
| Bọ Lá Tre | Mộc | 3 | Trị liệu / né (dai) | 14.000 | 1.550 | 450 | 250 (11,6%) | 1.200 |
| Cáo Mây | Thủy | 5 | **Boss** · phép / né ảo | 18.000 | 2.100 | 500 | 380 (16,7%) | 2.000 |

V6: Sương Hồn 10.500/950 · Miêu Đèn 7.800/1.350 · Bọ Lá Tre 11.500/850 · Cáo Mây 8.800/1.100/400. Năng lượng tối đa của quái = 100. Quái không khai báo `shieldCap` dùng 50% maxHP (V7: cả 4 quái đều khai báo).

**Boss — ra đòn không cần ngọc đỏ:** `gemlessAttackBelowHp: 0.5` — Cáo Mây dưới 50% HP vẫn đánh thường/nặng dù lượt đó không match được ngọc đỏ (trước đây chỉ Sương Hồn có cơ chế này). Tạo sức ép ở nửa sau trận boss.

Skill quái đổi ở V7 (bảng đầy đủ: `GAMEPLAY.md §11.9`):

| Skill | V6 | V7 |
|---|---|---|
| Long Miêu Liên Kích (Miêu Đèn) | 80 nộ · thiêu 10% HP tối đa/lượt | **100 nộ** · thiêu **6%** |
| Lục Diệp Ẩn Tung (Bọ Lá Tre) | né +60%, hồi 10%/lượt, dùng không giới hạn | né **+35%**, hồi **5%**/lượt, **1 lần/trận** |
| Vụ Lưu Thuẫn (Cáo Mây) | dùng không giới hạn | **1 lần/trận** |

`maxUses` (V7) trong `monsters.json → skills[]`: số lần tối đa mỗi trận; số lần đã dùng lưu ở `monster.skillUses`.

### 4.4. Điểm thuộc tính

+1 STR = **+30 ATK** (V6: 25), +1 VIT = **+250 HP** (V6: 200) & +10 DEF, +1 AGI = +5 AGI. Mỗi cấp +3 điểm ≈ +4–5% sức mạnh; chi tiết và đường cong theo cấp ở mục 11.6.

## 5. Công thức ngọc

```ts
damage = applyDefense(ATK × tileCount × 0.45 × elementalModifier × comboMult × crit × fireBonus × burningBonus, monsterDEF) × vulnerability × enrage
poisonPerStack = round(ATK × 0.18 × elementalModifier × comboMult)        // tối đa 5 tầng, 3 lượt (+1 Mộc)
heal   = round(maxHP × 0.03 × tileCount × supportModifier × comboMult)
shield = round(DEF × 0.8 × tileCount × supportModifier × comboMult)       // × 1.5 nếu Thủy match ≥4
energy = { 3: 15, 4: 25, ≥5: 40 } × energyModifier                        // không nhân combo
```

V6: tile 0.4 · độc 0.25 · hồi 0.05 · khiên 1.5. Một match hồi máu V6 = 15% HP, còn V7 = 9% HP.

- `tileCount` là số ô duy nhất bị clear trong nhóm resolve.
- Cascade multiplier: 1.0× / 1.2× / 1.4× / 1.6× (tầng 4+).
- Ngọc quái tự match: hồi máu **1,5%** maxHP/viên (V6: 3%), khiên **150 + DEF × 0,3**/viên (V6: 240 + DEF × 0,5), độc quái gieo **20%** ATK/lượt (V6: 30%).
- Quái đánh: `applyDefense(ATK quái × hệ số đòn × hệ số số ngọc, playerDEF)` → Cuồng Nộ × nội tại Thổ × giảm chủ động (Huyền Nham) → khiên → HP → phản đòn.
- Làm tròn `Math.round` thống nhất trong game-core (có chống sai số float).

## 6. Cascade và nhịp lượt

Một swap hợp lệ là một lượt; resolve toàn bộ cascade trước khi quái hành động. Swap sai không mất lượt.

**Giới hạn lượt:** tắt — `combat.json → battle.maxTurns = 0` (HUD hiện "Lượt N"). V7 dùng Cuồng Nộ thay cho thua do hết lượt, vì thua "hết giờ" gây ức chế.

### 6.1. Cuồng Nộ (V7, `combat.json → battle.enrage`, `game-core/enrage.ts`)

| Tham số | Giá trị | Ý nghĩa |
|---|---:|---|
| `startTurn` | 20 | Từ hành động thứ 21 bắt đầu tầng 1; mỗi hành động thêm 1 tầng. 0 = tắt |
| `damageBonusPerTurn` | 0,1 | Sát thương **trực tiếp** của **cả hai bên** × (1 + 0,1 × tầng): ngọc Đỏ, skill %ATK, đòn thường/nặng/skill quái |
| `monsterHealMultiplier` | 0,5 | Đang Cuồng Nộ: mọi hồi máu của quái (ngọc xanh lá, Lục Diệp, hồi theo lượt) × 0,5 |

- Tầng tính lại ở đầu mỗi hành động từ `turn` (`monster.enrageStacks = max(0, turn + 1 − startTurn)`), áp cho cả lượt người chơi lẫn phản đòn của quái trong hành động đó. Không áp cho độc/thiêu và sát thương cố định (Hàn Triều Phá Không).
- Tooltip skill (`previewPlayerSkill`) dùng tầng của hành động kế tiếp.
- HUD: nhãn lượt đổi màu cam "Lượt 21 🔥+10%"; popup "⚠ Cuồng Nộ sau 2 lượt" ở lượt 18 và "🔥 CUỒNG NỘ! Sát thương tăng dần" khi bắt đầu.

Event order giữ nguyên:

```text
GEMS_CLEARED → GEMS_FALLING → GEMS_REFILLED → cascade tiếp theo / monster turn
```

### 6.2. Nhịp animation (V7)

| Event | V6 | V7 |
|---|---:|---:|
| `MONSTER_THINKING` (`monsters.json → combat.thinkingSeconds`) | 1,2–3,0 s | **0,6–1,2 s** |
| `MONSTER_ATTACKED` | 1.000 ms | **700 ms** |
| `MONSTER_MOVE_SELECTED` | 500 ms | **350 ms** |

Tiết kiệm ≈ 1,9 s/lượt (≈ 14% thời gian trận) mà không đổi cân bằng. Mỗi lượt còn ≈ 11 s (4 s suy nghĩ + ≈ 7 s animation).

## 7. UX bàn cờ

- Vuốt từ một ô sang ô kề trực giao để swap; tap không tạo selection state.
- Khóa input khi đang resolve/cascade.
- Màn PK: số ≥1.000 hiển thị có dấu chấm (9.000); nhân vật né có "💨 NÉ! x%" + anim dodge; Kim phá ngọc vàng nổ cùng đợt + "⚡ +15 NỘ"; Thủy hoãn đòn "🐢 HOÃN ĐÒN" + badge Làm chậm; Hỏa "🔥 XUYÊN KHIÊN"; Thổ/Mộc hiện khiên nhận thêm; Cuồng Nộ ở nhãn lượt (mục 6.1).

## 8. Quy đổi số cố định (V6)

| Mục | V5 | V6 | V7 |
|---|---:|---:|---:|
| Hàn Triều Phá Không trừ khiên | 22 | 660 | 1.100 |
| Trúc Diệp Độc Châm sát thương gốc | 10 | 300 | 300 |
| Vụ Lưu Thuẫn khiên sương | 60 | 1.800 | 1.800 |
| Khiên tối đa Sương Hồn | 50 | 1.500 | 1.500 |
| Khiên guard Sương Hồn | 20 | 600 | 600 |
| Guard cộng DEF | +12 | +20% DEF gốc | +20% DEF gốc |
| Độc quái gieo lên nhân vật | tactics.poison × 1.5 | 30% ATK quái / lượt | 20% |
| Ngọc hồi máu của quái | 8 + level × 2 | 3% maxHP / viên | 1,5% |
| Ngọc khiên của quái | 8 + DEF × 0.5 | 240 + DEF × 0.5 / viên | 150 + DEF × 0.3 |
| Trang bị | ×1 | ×25 | ×25 |

## 9. Trạng thái triển khai

- [x] Chỉ số theo hệ + quái trong JSON, công thức AGI/DEF chung (`combat-formulas.ts`).
- [x] Năm nội tại bàn cờ + nội tại nghề, có event và test (`battle-v2.spec.ts`).
- [x] Màn PK hiển thị né hai phía, nội tại bàn cờ, số lớn, Cuồng Nộ.
- [x] Mô phỏng nhiều seed: `npm run balance:sim` (mục 11).
- [x] V7 Giai đoạn 1–2: số liệu JSON, Cuồng Nộ, `maxUses`, đòn không cần ngọc đỏ của boss, rút ngắn animation.
- [x] V7 Giai đoạn 3: điểm thuộc tính mạnh hơn mỗi cấp (mục 4.4, 11.6).
- [x] V7 Giai đoạn 4: công cụ mô phỏng trong repo, `balanceVersion 7`, test hồi quy thời lượng trận (mục 11.7).
- [ ] Playtest Android để đối chiếu thời gian thật với mô phỏng.

## 10. Acceptance criteria

- Cùng seed và cùng action sequence cho cùng board, event và kết quả.
- Modifier 120/100/85% (support 90%) đúng quan hệ hệ; né/DEF đúng công thức sau làm tròn.
- Mỗi nội tại chỉ proc một lần theo event gameplay tương ứng; không kích hoạt lại từ UI/VFX.
- Cuồng Nộ chỉ phụ thuộc `turn` (deterministic, replay đúng).
- Balance version lưu cùng battle save/replay.

## 11. Đợt cân bằng V7 — thời lượng trận 4–5 phút

### 11.1. Cách đo

`npm run balance:sim` (`tools/balance-sim.ts`) chạy bot trên chính `game-core` + JSON hiện hành, 5 hệ × 4 quái × N seed, nhân vật ở cấp đề xuất của quái (điểm chia đều STR/VIT), không trang bị.

- `MODE=greedy`: chọn nước có giá trị cao nhất theo nhóm ngọc **cascade đầu** (không nhìn trước ngọc rơi/RNG) ≈ **người chơi hiểu cơ chế** — dùng để so với mục tiêu tỉ lệ thắng của `GAMEPLAY.md §17`.
- `MODE=mixed` (mặc định): 50% greedy / 50% ngẫu nhiên ≈ **người mới**. `random` = cận dưới.
- Đủ nộ thì dùng skill đắt nhất có thể.
- Thời gian = thời lượng animation thật (`battle.scene.ts → durationForEvent`, cần đồng bộ `eventMs` trong script khi đổi) + `THINK` = 4 s suy nghĩ/lượt.
- Biến môi trường: `N`, `MODE`, `THINK`, `LV`, `MON`.

> **Lưu ý đo lường:** bản đầu của bot chấm điểm nước đi theo *kết quả sau cả phản đòn của quái* — tức nhìn trước được RNG — nên mạnh hơn người thật rất nhiều. Bảng Giai đoạn 1 (11.4) đo bằng bot đó; từ Giai đoạn 2 dùng bot công bằng.

### 11.2. Chẩn đoán V6

| Vấn đề | Số đo V6 |
|---|---|
| Trận kéo dài vô tận vs Bọ Lá Tre | Thổ **44 phút** (72% trận chưa xong sau 200 lượt); Thủy 8,4 phút; Mộc 5,7 phút |
| Chênh lệch hệ lớn | Hỏa hạ Miêu Đèn trong 4–6 lượt; Thổ cần 14–24 lượt với mọi quái |
| Đường cong độ khó ngược | Boss Cáo Mây máu thấp nhất (8.800), thắng 100% còn 99% HP; Sương Hồn (quái đầu) khó nhất với người mới |
| Không có áp lực | Thắng còn 75–100% HP |

Nguyên nhân: hồi phục > sát thương ở cả hai phía — ngọc hồi máu quái 3%/viên + khiên 240 + 0,5 DEF/viên với trần 50% maxHP; một match hồi máu của người chơi = 15% HP; Độc mạnh gấp 2–2,5 lần ngọc Đỏ; Sương Hồn gieo độc ≈ 585/lượt.

### 11.3. Mục tiêu V7

| Tiêu chí | Quái thường | Boss |
|---|---|---|
| Thời gian trung vị | 3,5–5 phút | 4,5–5,5 phút |
| p75 số lượt | ≤ 28 | ≤ 32 |
| Tỉ lệ thắng — bot greedy (hiểu cơ chế) | 75–95% (Sương Hồn ≥ 90%) | 40–65% |
| Tỉ lệ thắng — bot mixed (người mới) | ≥ 55% (Sương Hồn ≥ 80%) | 20–50% |

### 11.4. Giai đoạn 1 — số liệu JSON ✅ (24/10/2026)

Giảm hồi phục hai phía (hồi máu 5% → 3%/ô, khiên 1,5 → 1,0 × DEF/ô, ngọc hồi/khiên của quái giảm một nửa, thêm `shieldCap`), ngọc Đỏ 0,4 → 0,45, Độc 0,25 → 0,18, thu hẹp ATK giữa các hệ, đảo độ khó quái. Đo bằng bot cũ (nhìn trước RNG, 11.1): mọi trận về 10–30 lượt, Thổ vs Bọ Lá Tre 44 → 6,5 phút. Số cuối cùng đã được tinh chỉnh tiếp ở Giai đoạn 2 — xem bảng mục 2–5.

### 11.5. Giai đoạn 2 — chặn trận kéo dài + sức ép ✅ (24/10/2026)

Thay đổi:

1. **Cuồng Nộ** (mục 6.1).
2. **`maxUses`** cho skill quái: Lục Diệp Ẩn Tung, Vụ Lưu Thuẫn 1 lần/trận.
3. **Boss ra đòn không cần ngọc đỏ** dưới 50% HP (`gemlessAttackBelowHp`).
4. **Rút ngắn animation** (mục 6.2).
5. Tinh chỉnh lại theo bot công bằng: tương khắc 120/85/90, khiên 0,8 × DEF, nội tại Hỏa +10% / Thổ 35%, chỉ số hệ (4.2), quái (4.3), Hàn Triều 1.100, Băng Phong 140%, Long Miêu 100 nộ / thiêu 6%.

Kết quả (60 seed, cấp đề xuất, không trang bị) — `thắng% · lượt trung vị · phút trung vị`:

**Bot greedy (người chơi hiểu cơ chế)**

| Hệ | Sương Hồn (Lv1) | Miêu Đèn (Lv2) | Bọ Lá Tre (Lv3) | Cáo Mây (Lv5) |
|---|---|---|---|---|
| Kim | 100% · 15 · 3,1′ | 83% · 21 · 4,0′ | 92% · 16 · 3,0′ | 60% · 22 · 4,3′ |
| Mộc | 93% · 19 · 4,0′ | 95% · 23 · 4,2′ | 92% · 24 · 4,7′ | 65% · 26 · 5,1′ |
| Thủy | 95% · 19 · 3,8′ | 98% · 20 · 3,6′ | 82% · 25 · 4,7′ | 45% · 27 · 5,1′ |
| Hỏa | 90% · 14 · 2,8′ | 93% · 14 · 2,8′ | 83% · 15 · 3,1′ | 47% · 18 · 3,7′ |
| Thổ | 100% · 13 · 2,7′ | 98% · 24 · 4,5′ | 95% · 28 · 5,3′ | 90% · 24 · 4,7′ |

**Bot mixed (người mới)**

| Hệ | Sương Hồn | Miêu Đèn | Bọ Lá Tre | Cáo Mây |
|---|---|---|---|---|
| Kim | 87% · 18 · 3,7′ | 57% · 25 · 4,6′ | 75% · 19 · 3,6′ | 32% · 22 · 4,2′ |
| Mộc | 83% · 21 · 4,1′ | 82% · 25 · 4,6′ | 73% · 25 · 4,9′ | 33% · 25 · 5,0′ |
| Thủy | 80% · 23 · 4,5′ | 78% · 22 · 3,8′ | 63% · 26 · 4,9′ | 22% · 25 · 4,9′ |
| Hỏa | 82% · 16 · 3,3′ | 68% · 17 · 3,3′ | 58% · 17 · 3,4′ | 20% · 17 · 3,4′ |
| Thổ | 100% · 18 · 3,6′ | 85% · 27 · 4,8′ | 63% · 28 · 5,5′ | 57% · 25 · 4,8′ |

Đánh giá:

- Không còn trận vô tận: p75 lớn nhất 32 lượt (Thổ vs Bọ Lá Tre), mọi trung vị ≤ 5,5 phút.
- Hỏa là hệ "đánh nhanh" (2,8–3,7 phút) — chấp nhận theo vai trò bộc phát; Thổ là hệ dễ nhất cho người mới.
- Boss: người hiểu cơ chế thắng 45–65% (Thổ khắc Thủy 90%), người mới 20–57% → cần lên cấp/đồ để vượt, đúng vai trò boss.
- Còn lại cho Giai đoạn 3: tăng cảm giác mạnh lên theo cấp; sau đó tinh chỉnh lại boss vì Lv5 có nhiều điểm thuộc tính nhất.

### 11.6. Giai đoạn 3 — giữ chân người chơi: mạnh lên thấy rõ theo cấp ✅ (24/10/2026)

Mục tiêu (`GAMEPLAY.md §1, §17`): quay lại quái cũ phải thấy mình mạnh lên; boss nên thua 1–2 lần đầu rồi thắng được sau 1–2 cấp hoặc đồ hiếm.

| Điểm thuộc tính | V6 | V7 |
|---|---:|---:|
| +1 STR | +25 ATK (≈2,2% ATK Lv1) | **+30 ATK** (≈2,7%) |
| +1 VIT | +200 HP, +10 DEF | **+250 HP** (≈2,4%), +10 DEF |

Mỗi cấp +3 điểm ⇒ ≈ +4–5% sức mạnh tổng (V6 ≈ 3–4%). EXP/cấp giữ nguyên (`expBase 100`, `+50`/cấp): tới boss Lv5 cần ≈ 11 trận ≈ 45–50 phút chơi.

**Tỉ lệ thắng boss Cáo Mây theo cấp người chơi** (60 seed, không trang bị):

| Cấp | Greedy (hiểu cơ chế): Kim · Mộc · Thủy · Hỏa · Thổ | Mixed (người mới): Kim · Mộc · Thủy · Hỏa · Thổ |
|---|---|---|
| Lv4 (dưới đề xuất) | 55 · 63 · 43 · 42 · 85 | 25 · 33 · 18 · 17 · 55 |
| **Lv5 (đề xuất)** | 60 · 50 · 60 · 50 · 90 | 40 · 40 · 27 · 22 · 70 |
| Lv6 | 70 · 75 · 65 · 65 · 92 | 37 · 40 · 33 · 25 · 75 |
| Lv7 | 80 · 77 · 77 · 68 · 95 | 43 · 57 · 55 · 33 · 83 |

Lv4 → Lv7 tăng ≈ +25–30 điểm % (greedy). Người mới chưa vượt được boss ở Lv5–6 thì có thêm hai lối ra: lên cấp hoặc đồ hiếm của Bọ Lá Tre / Cáo Mây (trang bị ×25, vd Kiếm Đèn +300 ATK ≈ +26%).

**Bảng cuối V7 ở cấp đề xuất** (`thắng% · lượt trung vị · phút trung vị`):

| Hệ | Sương Hồn (Lv1) | Miêu Đèn (Lv2) | Bọ Lá Tre (Lv3) | Cáo Mây (Lv5) |
|---|---|---|---|---|
| Kim | 100% · 15 · 3,1′ / 87% · 18 · 3,7′ | 85% · 21 · 4,0′ / 58% · 25 · 4,4′ | 92% · 15 · 3,0′ / 77% · 19 · 3,8′ | 60% · 23 · 4,6′ / 40% · 21 · 4,0′ |
| Mộc | 93% · 19 · 4,0′ / 83% · 21 · 4,1′ | 95% · 22 · 4,1′ / 83% · 25 · 4,5′ | 92% · 24 · 4,6′ / 75% · 25 · 4,9′ | 50% · 27 · 5,4′ / 40% · 26 · 5,1′ |
| Thủy | 95% · 19 · 3,8′ / 80% · 23 · 4,5′ | 97% · 20 · 3,6′ / 78% · 22 · 3,9′ | 85% · 25 · 4,7′ / 65% · 26 · 4,9′ | 60% · 27 · 5,5′ / 27% · 24 · 4,6′ |
| Hỏa | 90% · 14 · 2,8′ / 82% · 16 · 3,3′ | 93% · 13 · 2,7′ / 67% · 17 · 3,2′ | 87% · 15 · 3,1′ / 57% · 17 · 3,5′ | 50% · 18 · 3,8′ / 22% · 17 · 3,5′ |
| Thổ | 100% · 13 · 2,7′ / 100% · 18 · 3,6′ | 98% · 23 · 4,3′ / 85% · 27 · 4,8′ | 93% · 27 · 5,2′ / 65% · 28 · 5,4′ | 90% · 25 · 4,9′ / 70% · 27 · 5,2′ |

(mỗi ô: greedy / mixed)

### 11.7. Giai đoạn 4 — kiểm chứng ✅ (24/10/2026)

- **Công cụ:** `npm run balance:sim` (`tools/balance-sim.ts`) — chạy lại sau mọi thay đổi số liệu; so với bảng mục tiêu 11.3. Khi đổi thời lượng animation trong `battle.scene.ts → durationForEvent`, cập nhật `eventMs` trong script cho khớp.
- **Version:** `combat.json → match3.balanceVersion = 7`. Trận đang dở lưu bằng version cũ bị bỏ khi mở lại (`isResumableBattle`), không áp số V7 lên state V6.
- **Test** (`npm test`, 160 test):
  - công thức V7 (ngọc, tương khắc, nội tại, skill nhân vật/quái) trong `battle-v2.spec.ts`, `monster-skills.spec.ts`, `lantern-cat.spec.ts`, `game-data.spec.ts`;
  - cơ chế mới: tầng Cuồng Nộ, Cuồng Nộ nhân sát thương hai phía và giảm hồi máu quái, `maxUses`, boss ra đòn không cần ngọc đỏ;
  - **hồi quy thời lượng:** Thổ dồn VIT vs Bọ Lá Tre — khi tắt Cuồng Nộ cả 5 seed kéo quá 120 lượt; khi bật luôn kết thúc trước lượt 60.
- **Còn mở:** playtest Android 5–10 người (người chơi puzzle, RPG, người mới) để đo thời gian thật, so với mô phỏng (≈ 11 s/lượt với 4 s suy nghĩ) và điều chỉnh `THINK` của bot cho khớp; theo dõi tỉ lệ thắng lượt đầu theo `GAMEPLAY.md §17, §29`.

**Quy trình chỉnh số sau này:**

1. Sửa JSON trong `src/assets/game-data/`.
2. `npm run balance:sim` và `MODE=greedy npm run balance:sim` → đối chiếu 11.3 (thời gian, tỉ lệ thắng hai loại bot).
3. Với boss/quái mới: `LV=<cấp> MON=<id>` để xem đường cong theo cấp (11.6).
4. Tăng `balanceVersion` nếu thay đổi ảnh hưởng kết quả trận; cập nhật test và bảng trong tài liệu này.
