# PHỐ LINH — GAMEPLAY DESIGN DOCUMENT

> **Tài liệu:** `GAMEPLAY.md`  
> **Phiên bản:** 1.0 — Gameplay baseline  
> **Trạng thái:** Thiết kế đề xuất, chưa được xác nhận bằng playtest  
> **Thể loại:** Mobile portrait · Casual RPG · Match-3 Battle · Monster Hunting · Character Progression  
> **Nền tảng MVP:** Android offline-first (Ionic 9 + Angular + Phaser 4 + Capacitor 8 + TypeScript)  
> **Tương lai:** JohnCMS/PHP + MySQL; Node.js + Socket.IO cho matchmaking và PvP. **Không nằm trong MVP offline.**

---

# PHẦN A — TẦM NHÌN VÀ PHẠM VI

## 1. Tuyên ngôn sản phẩm

**Phố Linh** là game nhập vai săn quái bằng bàn ghép ngọc 6×6. Người chơi sở hữu **một nhân vật chính**, tự cộng điểm thuộc tính khi lên cấp, chọn quái để săn, chủ động ra quyết định trong trận 2–5 phút, nhận EXP/vàng/vật phẩm rồi quay lại thử thách khó hơn.

**Trải nghiệm cần tạo ra:** "Thêm một trận nữa để lên cấp, lấy món đồ đó, hoặc đánh bại con boss vừa thua." Trận thắng cần đến từ cả **lựa chọn trên bàn ngọc** và **cách build nhân vật**, không chỉ từ lực chiến.

### 1.1. Bốn trụ cột

1. **Chơi thật, không auto hoàn toàn:** mỗi lượt đổi ngọc có ý nghĩa tấn công/phòng thủ/hồi máu/tích năng lượng.
2. **Tiến trình dễ hiểu và thấy được:** lên cấp +3 điểm thuộc tính, trang bị tạo khác biệt đo được.
3. **Phiên ngắn, ít áp lực:** 2–5 phút/trận; mất mạng vẫn chơi; không ép điểm danh, không có cây/vật nuôi chết vì vắng mặt.
4. **Nội dung mở dần:** chỉ giới thiệu một hệ thống mới khi người chơi đã nắm hệ thống cũ; học triết lý vòng lặp và mở khóa dần của Tiny Harvest, không sao chép nội dung/cơ chế/asset cụ thể.

### 1.2. Cảm hứng và ranh giới IP

- Tham khảo **triết lý sản phẩm** của Tiny Harvest (phiên chơi ngắn, tiến trình đều, mở khóa từng bước).
- Match-3 là thể loại phổ biến; phải có **luật phối hợp chỉ số, cảnh báo boss và lựa chọn đánh/phòng thủ** của riêng Phố Linh.
- Bối cảnh thế giới giả tưởng hiện đại, không dùng nhân vật lịch sử; artwork 2D stylized semi-realistic, không chibi, không robot.
- Không sử dụng tên, thẻ, màn hình, nhân vật, nhạc, hình ảnh, luật đặc trưng sao chép từ trò chơi có sẵn. Tên **Phố Linh** là tên làm việc, cần tra cứu thương hiệu trước phát hành.

## 2. Nhóm người chơi và trải nghiệm

| Đối tượng | Nhu cầu | Thiết kế đáp ứng |
|---|---|---|
| Người chơi casual | Chơi nhanh, dễ hiểu | Hướng dẫn dưới 90 giây, nút lớn, mỗi trận 2–5 phút |
| Người thích RPG | Cày cấp, tối ưu build | STR/VIT/AGI/INT, trang bị, boss có cơ chế |
| Người thích giải đố | Chọn nước đi tốt | Ghép 4/5, cascade, dự đoán đòn boss |
| Người thích cạnh tranh | Chứng minh kỹ năng | Đấu tập offline trước; PvP có server về sau |
| Người chơi ít thời gian | Không phải mở app liên tục | Save offline, không phạt vắng mặt, thám hiểm idle chỉ ở bản sau |

**Nguyên tắc tiếp cận:** không mặc định giới tính quyết định lối chơi; lựa chọn mỹ thuật nhân vật, độ khó và giao diện đáp ứng sở thích đa dạng. Mục tiêu rộng nhưng **không khẳng định phù hợp mọi độ tuổi** trước khi phân loại nội dung.

## 3. Trục phát triển từ MVP đến hoàn chỉnh

| Mốc | Tên | Mục tiêu có thể nghiệm thu | Chưa làm |
|---|---|---|---|
| M0 | Prototype Match-3 | Bàn 6×6, swap/match/cascade chạy được | RPG, online |
| M1 | Vertical slice săn quái | 1 nhân vật, 1 quái, trận có thắng/thua, VFX | Nhiều quái, vật phẩm |
| M2 | **Offline MVP** | 3 quái + 1 boss, level, cộng điểm, vàng, save/load, 6–10 vật phẩm | Backend, chat, PK online |
| M3 | Offline complete | 3 chương menu, 12–18 quái, 3 boss, nhiệm vụ, kỹ năng, đa dạng build, polish | Giao dịch/PvP online |
| M4 | Online foundation | JohnCMS + MySQL, tài khoản, đồng bộ, forum cơ bản | PvP xếp hạng |
| M5 | Realtime PvP | Socket.IO, tìm đối thủ, phòng đấu, xác minh server | Bang hội phức tạp |
| M6 | Live game | Sự kiện mùa, boss cộng đồng, nhiệm vụ mới, analytics, cập nhật cân bằng | Phụ thuộc đánh giá thực tế |

**Định nghĩa quan trọng:** "Offline complete" là **game chơi đủ vòng lặp một mình**, không phải sản phẩm online đã sẵn sàng thương mại. Phát hành thương mại, nhất là ở Việt Nam, yêu cầu xem xét riêng quy định và giấy phép liên quan.

---

# PHẦN B — VÒNG LẶP GAME VÀ TIẾN TRÌNH NGƯỜI CHƠI

## 4. Vòng lặp cốt lõi (core loop)

```text
Trang chủ → Chọn quái → Xem điều kiện và phần thưởng
         → Vào trận Match-3 → Thắng/thua
         → Nhận EXP + vàng + vật phẩm (nếu thắng)
         → Cộng điểm / đổi trang bị → Săn tiếp
```

### 4.1. Vòng lặp micro (10–30 giây)

Quan sát bàn → cân nhắc máu/đòn báo trước → đổi ngọc → nổ ngọc & combo → nhìn kết quả → phản ứng quái → lượt kế.

### 4.2. Vòng lặp phiên (3–10 phút)

1–3 trận săn quái → nhận đủ EXP/vàng → tăng điểm hoặc đổi trang bị → mở thử thách tiếp theo.

### 4.3. Vòng lặp dài (ngày/tuần)

Mở chương → săn trang bị có chỉ số hợp build → vượt boss → thử hướng cộng điểm khác (reset điểm ở bản sau). Không dùng timer ép người chơi quay lại trong MVP.

## 5. Onboarding 10 phút đầu

| Thời điểm | Trải nghiệm | Kiến thức mở |
|---|---|---|
| 0–30 giây | Chọn tên, xem nhân vật | HP, quái, nút Săn |
| 30–90 giây | Trận hướng dẫn 1, chỉ cho swap đỏ | Đổi ngọc và gây damage |
| 2–4 phút | Trận 2 có xanh lá/xanh dương | Hồi máu, khiên |
| 4–6 phút | Lên cấp nhận 3 điểm | Cộng chỉ số với preview trước/sau |
| 6–10 phút | Gặp quái có báo đòn | Chủ động phòng thủ/giữ năng lượng |
| Sau đó | Mở ngọc vàng, tím và boss | Kỹ năng, trạng thái |

**Không khóa game bằng hướng dẫn nhiều trang.** Hướng dẫn theo ngữ cảnh; đã biết thì bỏ qua được.

## 6. Thời lượng và nhịp độ

- Trận thường mục tiêu **2–3 phút**, boss **3–5 phút**.
- Trận không được kéo dài vô hạn: MVP giới hạn **20 lượt người chơi**; hết lượt xét thắng nếu boss/quái đã bị hạ, ngược lại thua. Đây là thông số cân bằng thử nghiệm.
- Không dùng thời gian thực giới hạn mỗi lượt ở PvE MVP; có thể tạm dừng bất kỳ lúc nào.
- **Thắng nhanh**: thưởng EXP/vàng cơ bản không phụ thuộc tốc độ để tránh ép người chậm; huy chương phụ dựa trên lượt/HP còn lại ở M3.

---

# PHẦN C — QUY TẮC MATCH-3

## 7. Bàn đấu và thao tác

### 7.1. Cấu hình cơ bản

| Thuộc tính | Giá trị baseline |
|---|---|
| Bàn | 6 cột × 6 hàng |
| Loại ngọc | 5 |
| Cách di chuyển | Đổi chỗ **2 ô kề cạnh trực giao** |
| Ghép tối thiểu | 3 viên cùng màu theo hàng/cột |
| Ngọc rơi | Theo cột, từ trên xuống |
| Ngọc mới | Sinh từ trên, sử dụng seeded RNG |
| Lượt | Một swap hợp lệ = một lượt người chơi, resolve toàn bộ cascade trước quái |
| Swap sai | Animation trả về vị trí cũ, **không tiêu hao lượt** |
| Hết nước đi | Reshuffle, không mất lượt, ưu tiên giữ trạng thái chiến đấu |

### 7.2. Luật thao tác

1. Chọn ô A bằng tap/drag, chọn ô B ở trên/dưới/trái/phải.
2. Game chỉ cho swap nếu A và B là hai ô kề cạnh; không cho swap đường chéo.
3. Nếu swap không tạo nhóm ≥3, trả ngọc về chỗ cũ, không kích hoạt phản công.
4. Nếu hợp lệ, khóa input, tính **toàn bộ nhóm match** cùng lúc.
5. Xóa nhóm; các viên phía trên rơi; sinh ngọc mới; kiểm tra cascade.
6. Resolve tiếp cho đến khi không còn match; chỉ sau đó quái mới thực hiện một hành động.
7. Kích hoạt trạng thái thắng/thua theo thứ tự ưu tiên ở §11.7.

### 7.3. Loại ngọc và nhận diện không chỉ bằng màu

| ID | Biểu tượng / màu | Tác dụng | Gợi ý accessibility |
|---|---|---|---|
| `attack` | Đỏ — kiếm | Gây damage trực tiếp | Hình kiếm |
| `heal` | Xanh lá — lá | Hồi HP | Hình lá |
| `shield` | Xanh dương — khiên | Tạo khiên | Hình khiên |
| `energy` | Vàng — đèn | Nạp năng lượng tuyệt kỹ | Hình tia/đèn |
| `poison` | Tím — giọt | Gây độc | Hình giọt độc |

Mỗi viên phải có **shape/icon riêng**, không chỉ khác màu để hỗ trợ người chơi khó phân biệt màu.

## 8. Ghép 3, 4, 5 và cascade

**Đơn vị tính hiệu ứng:** số viên bị xóa theo từng loại trong toàn bộ bước resolve. Không cộng cùng một ô nhiều lần nếu nằm tại giao điểm hàng và cột.

| Sự kiện | Quy tắc MVP |
|---|---|
| Ghép 3 | Hiệu ứng cơ bản 100% |
| Ghép 4 | Tổng 4 viên, thêm **+10 năng lượng** bất kể màu; chưa tạo special gem |
| Ghép ≥5 thẳng hàng | Tổng viên tương ứng, thêm **+20 năng lượng**; chưa tạo special gem |
| Nhóm giao nhau T/L | Tính tất cả ô duy nhất; chỉ nhận thưởng dài nhất **một lần** trong bước resolve |
| Cascade 1 | Hệ số 1.0× |
| Cascade 2 | 1.2× |
| Cascade 3 | 1.4× |
| Cascade 4+ | Tối đa 1.6× |

**Lưu ý:** Hệ số cascade chỉ nhân các hiệu ứng theo số viên (damage, heal, shield, poison) trong **cùng lượt**; năng lượng thưởng ghép dài không nhân. Thông số cần playtest và tinh chỉnh.

### 8.1. Ngăn cascade vô hạn

- Giới hạn tối đa **12 vòng resolve trong một lượt**.
- Nếu đạt ngưỡng: hoàn tất thưởng đến vòng 12, đưa bàn về cấu hình không có match sẵn và có ít nhất một nước đi, ghi event `board:forced_stabilize`.
- Engine phải xử lý cả trường hợp RNG liên tục tạo match, tránh treo game.

### 8.2. Tạo bàn ban đầu

- Tạo row-major, tránh ngẫu nhiên có ba viên cùng loại liên tiếp ngang/dọc.
- Kiểm tra có ít nhất một nước đi hợp lệ; nếu không, tạo lại với seed tiếp theo (giới hạn số lần, có fallback deterministic).
- Seed được lưu với trận để replay/debug.

### 8.3. Match đặc biệt hậu MVP

M3 có thể thử `bomb gem`, `row clear`, `color clear`, nhưng **không thêm vào M0–M2** để dễ cân bằng và kiểm thử.

## 9. Trình tự animation một lượt

```text
PLAYER_INPUT
  → swap (~160ms)
  → validate
  → matched highlight (~120ms)
  → explode (~200ms)
  → gravity/refill (~220ms)
  → cascade (nếu có)
  → apply combat results / damage numbers
  → monster telegraph / action (~500ms)
  → next turn
```

Các mốc ms là gợi ý, phải điều chỉnh theo cảm giác thực tế; hỗ trợ `animationSpeed` để tăng tốc và `reducedMotion` để giảm hiệu ứng. Logic game resolve độc lập; animation chỉ tiêu thụ event log, không quyết định kết quả.

---

# PHẦN D — CHIẾN ĐẤU, CHỈ SỐ VÀ KỸ NĂNG

## 10. Nhân vật và thuộc tính

### 10.1. Thuộc tính gốc

| Thuộc tính | Tên | Tác động chính |
|---|---|---|
| `STR` | Sức mạnh | Damage ngọc đỏ |
| `VIT` | Thể lực | Max HP, DEF |
| `AGI` | Nhanh nhẹn | Hiệu quả cascade và lợi ích chiến thuật *được giới hạn* |
| `INT` | Linh lực | Độc, hồi phục, skill power |

**Baseline cấp 1:** STR=5, VIT=5, AGI=5, INT=5; HP đầy; không có điểm chưa phân bổ.

### 10.2. Công thức dẫn xuất baseline (để lập trình, chưa phải balance cuối)

```text
MAX_HP      = 200 + 20 × VIT + bonusHpFromGear
ATK         = 10 + 3 × STR + bonusAtkFromGear
DEF         = 2 × VIT + bonusDefFromGear
SKILL_POWER = 5 + 3 × INT + bonusSkillFromGear
AGI_BONUS   = min(0.20, AGI × 0.005)   // tối đa +20% hiệu quả damage cascade
POWER       = round(MAX_HP/10 + ATK×4 + DEF×2 + SKILL_POWER×2)
```

`POWER` chỉ là **điểm tham khảo** trên UI, không dùng để quyết định kết quả trận. `AGI_BONUS` chỉ áp dụng cho **damage ở cascade từ tầng 2 trở lên**, không tăng số lượt hoặc thay đổi xác suất random ở MVP; tránh biến AGI thành thuộc tính quá mạnh/khó giải thích.

### 10.3. EXP và lên cấp

- Thắng trận nhận EXP; thua **không nhận phần thưởng chiến thắng**, nhưng có thể có một lượng EXP khích lệ nhỏ ở M3 (chưa bật MVP).
- EXP cần để từ cấp `L` lên `L+1`:

```text
expRequired(L) = round(60 + 25 × (L - 1) + 5 × (L - 1)^2)
```

- Khi nhận đủ EXP, tăng level và **+3 điểm tự cộng**; EXP dư được giữ lại, hỗ trợ tăng nhiều cấp từ một phần thưởng lớn.
- Cộng điểm vào STR/VIT/AGI/INT; xem preview trước/sau; nhấn **Xác nhận** để commit (không cộng trực tiếp mỗi lần chạm dấu `+`).
- Trong trận, không thể mở màn phân bổ thuộc tính. Cộng VIT làm tăng MAX_HP; khi ngoài trận có thể tự hồi đầy HP chuẩn bị trận kế tiếp.
- Chưa cho reset điểm ở M2; M3 cho vật phẩm/reset miễn phí giới hạn để người chơi thử build, không buộc mua.

## 11. Combat math baseline

### 11.1. Damage ngọc đỏ

```text
rawAttackDamage = gemsClearedRed × (ATK / 3)
postDefense     = max(1, round(rawAttackDamage × comboMult × agiCascadeMult) - monsterDEF)
```

- Mỗi bước match đỏ trong cascade tính damage một lần, sau đó trừ DEF một lần trên bước đó.
- `comboMult`: từ §8.
- `agiCascadeMult = 1 + AGI_BONUS` với cascade ≥2, ngược lại 1.
- Sát thương tối thiểu 1 nếu match đỏ tạo đòn hợp lệ.

### 11.2. Hồi HP (ngọc xanh lá)

```text
heal = round(gemsClearedGreen × (8 + INT × 0.6) × comboMult)
currentHp = min(MAX_HP, currentHp + heal)
```

Hồi vượt giới hạn không chuyển thành khiên.

### 11.3. Khiên (ngọc xanh dương)

```text
shieldGain = round(gemsClearedBlue × (8 + VIT × 0.5) × comboMult)
shield = min(round(MAX_HP × 0.50), shield + shieldGain)
```

Khiên hấp thụ damage trước HP, giữ qua lượt cho đến hết trận; tối đa 50% Max HP.

### 11.4. Năng lượng (ngọc vàng)

```text
energyGain = gemsClearedYellow × 8 + longMatchBonus
energy = min(100, energy + energyGain)
```

Năng lượng không giữ qua trận trong MVP. `longMatchBonus` là tổng thưởng dài theo §8, chỉ một lần cho mỗi bước resolve.

### 11.5. Độc (ngọc tím)

```text
poisonAdded = round(gemsClearedPurple × (3 + INT × 0.4) × comboMult)
monster.poisonPotency += poisonAdded
monster.poisonTurns = 3
```

- Mỗi lượt quái bắt đầu, quái chịu sát thương độc bằng `poisonPotency`, sau đó giảm `poisonTurns` đi 1.
- Tái áp dụng cộng potency, đặt lại duration về 3, tối đa `poisonPotency = 20% maxHp quái` để tránh snowball quá mạnh.
- Độc không bị DEF giảm. Độc có thể kết liễu quái trước khi quái ra đòn.

### 11.6. Đòn đánh quái

```text
incoming = max(1, monsterATK - floor(DEF × 0.6))
shieldAbsorbed = min(shield, incoming)
shield -= shieldAbsorbed
hp -= (incoming - shieldAbsorbed)
```

Monster abilities có hệ số riêng; damage không được âm. Đây là cơ chế thử nghiệm để cân bằng.

### 11.7. Thứ tự xử lý trong một lượt

1. Player swap hợp lệ; resolve tất cả match và hiệu ứng player theo event log.
2. Nếu quái HP ≤ 0, **thắng ngay**, không phản công.
3. Nếu đã đủ 100 energy, player có thể **chọn kích hoạt tuyệt kỹ ở đầu lượt tiếp theo**; không tự auto xả.
4. Bắt đầu lượt quái: tick độc; nếu quái chết → thắng, không hành động.
5. Quái dùng hành động dựa trên telegraph đã hiển thị ở lượt trước.
6. Kiểm tra HP người chơi ≤ 0 → thua; sau đó tăng lượt.
7. Nếu vượt giới hạn lượt và quái chưa chết → thua (MVP), hiển thị gợi ý nâng cấp.

### 11.8. Tuyệt kỹ MVP

**Tên:** Đèn Phá Mây (tên làm việc). Khi energy ≥100, người chơi có thể kích hoạt ở **đầu một lượt của mình**, không tiêu hao swap; energy về 0.

```text
skillDamage = round(50 + SKILL_POWER × 4)
actual = max(1, skillDamage - floor(monsterDEF × 0.5))
```

Chỉ có **một tuyệt kỹ** ở M2. M3 thêm tối đa ba kỹ năng có vai trò rõ: tấn công/bảo hộ/giải hiệu ứng.

### 11.9. Tuyệt kỹ riêng của Miêu Đèn

**Tên:** Long Miêu Liên Kích. Khi Miêu Đèn đạt 100 năng lượng từ ngọc vàng hoặc phần thưởng năng lượng, lượt quái kế tiếp tự động dùng skill thay cho hành động thường.

```text
damage = ceil(playerMaxHp × 0.10)
energyDrain = ceil(playerEnergy × 0.20)
playerEnergy = max(0, playerEnergy - energyDrain)
monsterEnergyAfterSkill = 10
playerSkipTurns = 1
```

- Sát thương đi thẳng vào HP nhân vật, không bị khiên hấp thụ.
- Nhân vật tự động mất đúng một lượt; không swap, dùng skill hoặc timeout trong lượt đó.
- Sau lượt bị bỏ qua, quái tiếp tục xử lý một lượt và sau đó trả quyền điều khiển cho người chơi.
- Core phát `MONSTER_SKILL_USED` và `PLAYER_TURN_SKIPPED`; Phaser chỉ trình diễn cast, liên kích, impact và icon choáng.

## 12. Hành vi quái và tính công bằng

Mỗi quái có `behaviorId` và chuỗi hành vi gồm hành động + telegraph. Không random "ăn gian" theo HP người chơi.

- `basic`: đánh thường.
- `guard`: tăng DEF 1 lượt, có icon báo trước.
- `heavy`: báo trước một lượt; lượt sau đánh ×1.7 ATK.
- `venom`: gây một lượng độc lên người chơi (M3).

**Telegraph** phải hiện bằng icon + mô tả ngắn, ví dụ "Thú Sương đang tích lực — đòn mạnh lượt tới". Người chơi được quyền phòng thủ/đánh kết liễu trước khi đòn tới. Chương đầu giới thiệu `basic`, sau đó `heavy`.

## 13. Trạng thái chiến đấu

```text
INIT → PLAYER_READY → SWAPPING → RESOLVING
                               ↓
                        PLAYER_RESULT
                         ↓        ↓
                    VICTORY    MONSTER_TURN
                                   ↓
                            PLAYER_READY / DEFEAT
```

**Các trường hợp bắt buộc:** app background trong lúc animate; người dùng nhấn back; double tap; trận kết thúc đúng khi poison kết liễu; save/load giữa trận; board deadlock; người chơi không đủ energy; cascade vượt giới hạn.

---

# PHẦN E — SĂN QUÁI, BOSS VÀ NỘI DUNG

## 14. Màn hình săn quái

Mỗi thẻ quái hiển thị: portrait, tên, cấp độ đề xuất, icon kiểu đánh, phần thưởng chính, trạng thái mở khóa, nút **Săn**. Không có bản đồ di chuyển. Các chương là **menu theo địa điểm**, không phải world map.

Người chơi có thể xem chi tiết trước trận: HP, ATK, DEF, cơ chế đặc biệt, vật phẩm có thể rơi. Không hiện xác suất rơi không xác minh.

## 15. Nội dung Offline MVP (M2)

**Các con số dưới đây là dataset khởi động**, phải chỉnh khi test thời lượng/tỉ lệ thắng.

| ID | Quái | Cấp gợi ý | HP | ATK | DEF | Hành vi | EXP | Vàng |
|---|---|---:|---:|---:|---:|---|---:|---:|
| `mist_blob` | Bụi Sương | 1 | 270 | 55 | 0 | basic | 35 | 12 |
| `lantern_cat` | Miêu Đèn | 2 | 280 | 26 | 5 | basic, guard | 55 | 20 |
| `bamboo_mantis` | Bọ Lá Tre | 3 | 400 | 32 | 8 | basic, heavy | 75 | 28 |
| `cloud_fox_boss` | Cáo Mây | 4 (boss) | 760 | 36 | 10 | basic, guard, heavy | 160 | 65 |

- Người chơi bắt đầu với Bụi Sương; thắng 2 lần mở Miêu Đèn; thắng Miêu Đèn mở Bọ Lá Tre; thắng Bọ Lá Tre mở boss.
- Bụi Sương có khiên tối đa 50 và 25% tỷ lệ né đòn đánh thường từ ngọc công; skill không bị né.
- Thua trận không mất EXP/vàng/túi đồ. Cho nút **Thử lại** và gợi ý ("Cộng VIT để sống lâu hơn", "Dùng ngọc xanh trước đòn mạnh").
- Boss đầu có 2 trạng thái: trên 50% HP (basic/guard); ≤50% HP (heavy 2 lượt một lần). Trạng thái được hiển thị rõ.

## 16. Nội dung từ M3 đến hoàn chỉnh offline

| Chương (dạng menu) | Chủ đề | Tổng quái mục tiêu | Boss | Cơ chế giới thiệu |
|---|---|---:|---|---|
| 1. Ngõ Đèn | Phố tối dịu, linh vật hiền | 4–6 | Cáo Mây | Basic/guard/heavy |
| 2. Vườn Mưa | Rừng vườn giả tưởng | 4–6 | Linh Lộc | Độc/giải độc |
| 3. Chợ Trăng | Chợ đêm kỳ ảo | 4–6 | Hổ Đèn | Khiên quái/nhịp tấn công |

**Tổng đích M3:** 12–18 quái thường + 3 boss; tái sử dụng archetype và biến thể, không tạo hàng chục kỹ năng độc nhất cho từng quái. Boss có 2–3 đòn đọc được, telegraph rõ và thưởng đặc trưng.

## 17. Độ khó và cân bằng PvE

- Không scale quái theo level hiện tại trong MVP: người chơi cần cảm nhận mình mạnh lên khi quay lại quái cũ.
- Cấp đề xuất chỉ là chỉ dẫn; không khóa bằng lực chiến.
- Mục tiêu playtest cho trận thường đúng cấp: **tỉ lệ thắng lượt đầu khoảng 65–85%** với người đã hiểu cơ chế; boss khoảng **35–60%**, không phải định mức bắt buộc.
- Đo số lượt trung bình, số swap thất bại, sát thương từ từng loại ngọc, tỉ lệ người bị kẹt ở một quái, số trận liên tiếp người muốn chơi.
- Nếu một thuộc tính vượt trội, điều chỉnh công thức/đồ rơi thay vì nerf ngầm không thông báo.

---

# PHẦN F — TIẾN TRÌNH RPG, VẬT PHẨM, KINH TẾ

## 18. EXP, level và phân bổ điểm

Chi tiết baseline ở §10. Khi mở màn cộng điểm:

1. Hiển thị điểm còn lại.
2. Dùng `+`/`−` để phân phối **tạm** (không thể giảm dưới điểm đang sở hữu từ trước).
3. Hiển thị thay đổi MAX_HP, ATK, DEF, SKILL_POWER theo thời gian thực.
4. Bấm **Lưu điểm** để commit một lần vào save.
5. Nếu thoát không lưu, bỏ thay đổi tạm.

Không để hiệu ứng animation hay thao tác spam làm cộng điểm trùng.

## 19. Trang bị & chỉ số

### 19.1. Ô trang bị MVP

- **Vũ khí:** tăng ATK/STR.
- **Áo:** tăng HP/VIT/DEF.
- **Bùa:** tăng INT/SKILL POWER hoặc một bonus nhỏ AGI.

### 19.2. Độ hiếm

M2 chỉ có `common`, `rare`. M3 thêm `epic` với số lượng hạn chế. Không có pay-to-win hay gacha ở offline MVP.

### 19.3. Ví dụ 8 vật phẩm M2

| ID | Tên | Loại | Thưởng | Hiếm |
|---|---|---|---|---|
| `twig_blade` | Đao Cành | Weapon | +3 ATK | common |
| `lantern_blade` | Đao Lồng Đèn | Weapon | +6 ATK | rare |
| `cloth_coat` | Áo Vải | Armor | +25 HP | common |
| `mist_coat` | Áo Sương | Armor | +50 HP, +1 DEF | rare |
| `leaf_charm` | Bùa Lá | Charm | +2 INT | common |
| `moon_charm` | Bùa Trăng | Charm | +3 INT | rare |
| `swift_charm` | Bùa Gió | Charm | +2 AGI | common |
| `sturdy_charm` | Bùa Đá | Charm | +2 VIT | rare |

Item có ID cố định, icon, slot, bonus, description; mỗi item instance có unique ID nếu hệ thống về sau có enchant/quality. MVP chưa cần enchant.

## 20. Túi đồ

- M2: tối đa **60 ô item instance**, stack tối đa 99 cho nguyên liệu (nếu có).
- Equip/unequip thực sự đổi derived stats.
- Vật phẩm được thưởng chỉ một lần mỗi `battleId`.
- Khi túi đầy: **không xóa chiến lợi phẩm**; dùng `pendingRewards` để người chơi nhận sau khi dọn chỗ. Có badge thông báo.
- Không cho bán/huỷ vật phẩm đang trang bị nếu chưa tháo.

## 21. Phần thưởng, rơi đồ và vàng

### 21.1. Chiến thắng

- Nhận đúng `expReward`, `goldReward` của quái (M2).
- Tỷ lệ rơi item được cấu hình trong `DropTable` có trọng số, không được tùy ý random trong UI.
- Ví dụ quái đầu: 80% không rơi item, 18% common, 2% rare; chỉ là số liệu thử nghiệm, không phải cam kết.

### 21.2. Vai trò vàng

M2: dùng vàng để mua một số vật phẩm cơ bản từ **tiệm NPC offline** hoặc mở khóa tiện ích nhỏ, không cần hệ thống cường hóa. Nếu chưa kịp làm tiệm, **ẩn vàng khỏi vòng lặp tiêu dùng** hoặc thực hiện sink tối thiểu trước khi nghiệm thu M2, tránh tiền tích mà không có mục đích.

M3: thêm nâng cấp trang bị tiêu hao vàng theo bảng cấu hình; không tạo cơ chế "đập đồ mất trắng".

### 21.3. Chống farm mất kiểm soát

- Quái cũ vẫn cho thưởng nhưng hiệu quả thấp hơn quái cấp tương ứng.
- Không áp dụng "energy/stamina paywall" trong MVP.
- Theo dõi tốc độ lên cấp và thời gian để kiếm trang bị hiếm bằng số liệu test, không dùng cảm tính.

## 22. Nhiệm vụ và thành tích (M3)

- **Nhiệm vụ tuyến tính**: thắng quái A, dùng ngọc khiên B lần, đánh bại boss C.
- **Thành tích**: combo 4+, thắng boss không chết, hạ 10 quái.
- **Nhiệm vụ ngày**: tùy chọn cho M3; không bắt buộc đăng nhập streak, không bỏ lỡ là mất quà độc quyền.
- Rewards tách `achievementId` / `claimId` để không nhận lặp.

---

# PHẦN G — GIAO DIỆN, HIỆU ỨNG, ÂM THANH

## 23. Luồng màn hình

```text
Splash → Home
       ├─ Nhân vật → Cộng điểm → Trang bị
       ├─ Săn quái → Danh sách → Thông tin quái → Battle → Kết quả
       ├─ Túi đồ
       └─ Cài đặt
```

### 23.1. Home

Avatar nhân vật, level/EXP, vài chỉ số nổi bật, nút **Săn quái** chính, các tab nhân vật/túi đồ. Không nhồi banner sự kiện ở M2.

### 23.2. Battle (portrait)

- 20–25% trên: portrait quái + tên/HP + báo chiêu.
- 10–15%: player HP/shield/energy, tên kỹ năng.
- 50–55%: bàn ngọc 6×6, đủ lớn cho ngón tay.
- Dưới cùng: skill button, pause, lượt còn lại.

Cần điều chỉnh theo safe area, màn hình nhỏ/large text. Target chạm thực tế nên ≥44×44 CSS px khi khả thi.

### 23.3. Kết quả

Win/lose rõ ràng, EXP/vàng/item hiện theo thứ tự, thanh EXP lên mượt, nút **Săn tiếp**, **Đổi quái**. Không ép xem quảng cáo.

## 24. Quy chuẩn hình ảnh (Art Bible tối thiểu)

- **Phong cách:** 2D stylized semi-realistic, đường nét rõ; hình người tỷ lệ tự nhiên.
- **Bảng màu định hướng:** xanh ngọc trầm, vàng đèn ấm, đỏ san hô, tím huyền ảo; kiểm tra tương phản UI.
- **Ngọc:** 5 silhouette khác nhau + icon giữa viên, không chỉ phân biệt màu.
- **Quái:** biểu cảm dễ đọc, silhouette riêng; không cần skeletal animation ở M2.
- **Nền:** ít chi tiết ở vùng phía sau bàn ngọc; nền tối hơn ngọc.
- **Asset:** ưu tiên PNG/WebP nền trong suốt; chuẩn hóa tỉ lệ, đặt tên, đóng atlas; lưu prompt/phiên bản và quy trình hậu kỳ.
- **AI generated assets:** rà soát quyền thương mại và độ tương đồng; tránh logo/nhân vật nổi tiếng; kiểm tra tách nền trước tích hợp.

## 25. VFX và animation

| Tình huống | Hiệu ứng | Ưu tiên |
|---|---|---|
| Chọn ngọc | Outline/glow và scale nhẹ | M0 |
| Swap | Tween 120–180ms | M0 |
| Swap sai | Reverse tween + âm click nhẹ | M0 |
| Match | Burst/particles giới hạn | M0 |
| Gravity | Tween rơi theo khoảng cách | M0 |
| Damage | Số bay + quái flash | M1 |
| Độc | Hạt tím + icon debuff | M1 |
| Khiên/heal | Vòng bảo vệ / số xanh | M1 |
| Skill | VFX đặc trưng, camera shake nhẹ | M2 |
| Boss phase | Chuyển sắc/telegraph | M2 |
| Victory | Banner + âm thắng | M1 |

**Phaser hiển thị trận; Ionic/Angular hiển thị màn hình ngoài trận.** CSS animation chỉ dùng cho UI, không điều khiển kết quả combat.

## 26. Âm thanh và accessibility

- M2: âm swap, match, damage, heal, victory/defeat; nhạc nền tùy nguồn lực.
- Có công tắc music/SFX, và giảm hiệu ứng chuyển động.
- Không chặn input vì chờ âm thanh; hoạt động tốt khi device mute.
- Icon + số/chuỗi mô tả thay vì chỉ màu hoặc camera shake.
- Text về damage/telegraph phải đọc được; không dựa hoàn toàn vào VFX để báo cơ chế.

---

# PHẦN H — SAVE GAME, KIỂM THỬ VÀ ĐỘ TIN CẬY

## 27. Offline save

### 27.1. Nguyên tắc

- MVP không cần mạng, tài khoản hay backend.
- Tách `GameStorage` interface khỏi logic; có adapter Preferences hoặc SQLite tùy dữ liệu; không để Phaser gọi trực tiếp storage API.
- Save kèm `saveVersion`, timestamp, validation, migration.
- Lưu sau kết thúc trận, sau commit thuộc tính, equip/unequip, claim reward, và khi app background.
- Có state machine `battle.completed` và `rewardClaimed` để tránh double reward trong một lần save.

### 27.2. Dữ liệu tối thiểu

```ts
interface LocalSaveV1 {
  saveVersion: 1;
  player: PlayerProfile;
  inventory: ItemInstance[];
  equipment: Record<'weapon' | 'armor' | 'charm', string | null>;
  monsterProgress: Record<string, { kills: number; unlocked: boolean }>;
  pendingRewards: RewardGrant[];
  claimedBattleIds: string[];
  settings: { music: boolean; sfx: boolean; reducedMotion: boolean };
  activeBattle?: SerializedBattle;
}
```

**Không lưu `claimedBattleIds` vô hạn:** về sau dùng journal có giới hạn và snapshot/checkpoint; ở MVP số trận thử nghiệm vẫn phải xử lý phù hợp.

### 27.3. Dừng/tiếp tục trận

- Nếu app background: pause animation, lưu `SerializedBattle` ở ranh giới hành động xác định.
- Khi resume: khôi phục state hợp lệ rồi phát lại/skip animation; không tự cộng kết quả lần hai.
- Nếu app bị kill giữa bước resolve: khôi phục snapshot ở đầu lượt **hoặc** kết quả đã tính xong, không phụ thuộc frame render giữa chừng.
- Có nút bỏ trận; bỏ trận không nhận phần thưởng.

### 27.4. Hạn chế chống gian lận offline

Người sở hữu thiết bị có thể sửa save. **Không tuyên bố dữ liệu local chống cheat tuyệt đối.** Khi chuyển online, phải thiết kế chính sách import: mặc định **không dùng vàng/item/chỉ số offline cho xếp hạng hoặc kinh tế online** nếu chưa có quy trình xác minh.

## 28. Kiểm thử bắt buộc

### 28.1. Match-3 tests

- Board khởi tạo không có match sẵn; có ≥1 legal move.
- Chỉ swap 2 ô kề cạnh; swap sai trả về.
- Match ngang/dọc; match giao nhau không double count.
- Gravity không để ô trống sau refill.
- Cascade deterministic theo seed.
- 12 tầng cascade không treo.
- Reshuffle cứu board không còn move.

### 28.2. Battle tests

- Đúng thứ tự apply damage/heal/shield/poison/energy.
- HP nằm trong [0, MAX_HP], shield ≤50% MAX_HP.
- Độc có thể kết liễu trước hành động quái.
- Skill đúng điều kiện energy; không auto kích hoạt.
- Boss telegraph đúng trước heavy.
- Thắng, thua, hết lượt chỉ emit kết quả một lần.

### 28.3. RPG/economy tests

- EXP overflow khi lên nhiều cấp.
- +3 điểm mỗi level, không tiêu vượt.
- Equipment thay đổi derived stats.
- Item bag full chuyển pendingRewards.
- Reward claim idempotent.
- Save/load & migration không làm hỏng dữ liệu.

### 28.4. Mobile tests

- Android màn hình nhỏ/lớn, thao tác một tay.
- Mở/tắt app, background/resume, cuộc gọi đến.
- Không có nhiều Phaser instances sau khi vào/ra Battle nhiều lần.
- Đo FPS trên máy thật, theo dõi crash/memory; không tuyên bố 60 FPS nếu chưa đo.

## 29. Chỉ số playtest mục tiêu

| Chỉ số | Mục tiêu thử nghiệm (không phải benchmark thị trường) |
|---|---|
| Bắt đầu được trận đầu | < 60 giây sau khi mở game lần đầu |
| Hiểu cơ chế swap sau tutorial | ≥80% người test không cần trợ giúp |
| Thời lượng trận thường | Trung vị 2–3 phút |
| Thời lượng boss | Trung vị 3–5 phút |
| Người test chủ động chơi trận 2 | ≥70% trong phiên đầu |
| Thấy khác biệt sau lần cộng điểm | ≥70% tự nhận biết hoặc thấy chỉ số rõ |
| Crash-free test session | ≥99% phiên trong đợt test nhỏ |

Các ngưỡng chỉ mang tính **mốc ra quyết định nội bộ**; điều chỉnh sau test 20–30 người gồm người chơi puzzle, RPG và người mới.

---

# PHẦN I — MỞ RỘNG SAU MVP

## 30. M3 — Offline complete: chiều sâu mà không phình scope

### 30.1. Mở rộng nội dung

- Ba chương menu, 12–18 quái, ba boss.
- 2–3 bộ trang bị chủ đề; không cần hàng trăm item.
- Ba kỹ năng mở theo level, chọn **một kỹ năng đang trang bị** trước trận (hoặc tối đa hai nếu test cân bằng tốt).
- Quest tuyến tính và achievement; không cần battle pass.
- Đấu tập AI theo lượt trên chung luật board ở cuối M3 nếu gameplay đã tốt.

### 30.2. Chế độ đấu tập offline (tùy chọn)

- Đối thủ AI có nhân vật/chỉ số riêng, chọn nước đi hợp lệ theo heuristic.
- Hai bên **dùng cùng bàn**, thay phiên swap.
- AI không được nhìn trước RNG tương lai hoặc chỉnh ngọc để thắng.
- Thời gian chơi 2–5 phút; thắng/thua không tính PvP xếp hạng.
- Chức năng này giúp kiểm tra luật dùng chung trước khi làm real-time.

### 30.3. Endless/Tháp thử thách (sau khi đo retention)

- Chuỗi trận tăng độ khó; reset khi thua, có mốc thưởng.
- Dùng lại quái và skill hiện có; không làm chế độ mới nếu số người chơi thử ít.

## 31. M4 — JohnCMS + MySQL và cộng đồng

**Chỉ bắt đầu khi M2/M3 chứng minh gameplay đủ tốt.**

- JohnCMS là nguồn xác thực tài khoản; MySQL lưu dữ liệu online và hồ sơ game.
- Tách API RPG module; không giả định cấu trúc bảng users trước khi xem đúng bản JohnCMS triển khai.
- Profile, bạn bè, forum, bài viết, bình luận, thành tích được chia sẻ.
- Server sở hữu vàng, item, level, battle rewards của tài khoản online.
- Thiết kế hướng chuyển từ offline: người chơi có thể giữ hồ sơ offline dưới dạng **bản chơi độc lập**, hoặc import hạn chế/có xác minh; không tự đồng bộ phần thưởng chưa xác thực lên online.

## 32. M5 — Matchmaking và PvP Socket.IO

### 32.1. Mục tiêu

Tạo trận **1v1 theo lượt, cùng bàn Match-3**, không phải hai game độc lập gửi kết quả lên rồi so điểm.

### 32.2. Luật dự kiến

- Người chơi bấm **Tìm đối thủ**, tham gia queue.
- Matchmaking ưu tiên khoảng level/rating gần nhau, nới dần khoảng chờ theo cấu hình.
- Hai bên vào cùng trận do server tạo, nhận chung board seed và state.
- Mỗi lượt tối đa **12 giây** (phải playtest, người mới có thể cần 15–20 giây).
- Một swap hợp lệ → resolve → damage/hiệu ứng → đổi lượt.
- Hết thời gian: tự skip lượt; liên tiếp nhiều lần xử lý theo luật công khai.
- Có giới hạn lượt và quy tắc hòa/tiebreaker rõ trước khi làm ranked.
- Nếu mất kết nối: khoảng grace ngắn + resume state từ server; không để client quyết định win/loss.

### 32.3. Chống gian lận

- `game-core` port/chạy trên server, server tạo RNG và kiểm tra swap, thứ tự, timer.
- Client gửi **ý định** (tọa độ A/B, actionId, seq), không gửi damage, board mới hay phần thưởng.
- Kết quả trận/điểm xếp hạng và inventory update ở backend có transaction/idempotency.
- Không tin local offline save làm nguồn thuộc tính chính trong ranked.
- Có logging/replay để xử lý tranh chấp.

### 32.4. Những gì chưa nên làm

Chưa guild war, chợ người chơi, chuyển vật phẩm, PvP nhiều người, hệ thống gacha trả phí hay voice chat. Ưu tiên PK ổn định, nhanh, công bằng.

## 33. M6 — Live Ops, mùa sự kiện, doanh thu

### 33.1. Sự kiện Tết (mùa nội dung, không phải game mới)

- Chủ đề lễ hội giả tưởng: Đèn đầu năm, phong bao thưởng nhiệm vụ, boss mùa.
- Tận dụng hoạt động hiện hữu: săn quái, hoàn thành nhiệm vụ, điểm cộng đồng.
- Không gắn gameplay với triều đại hay sự kiện lịch sử.
- Không đặt cược, đổi thưởng tiền thật hoặc tạo cơ chế may rủi vi phạm quy định.
- Nếu chưa kịp phát hành dịp Tết 2027, giữ cơ chế event tái sử dụng cho mùa sau.

### 33.2. Monetization (sau khi game có người chơi)

- Ưu tiên trang phục/khung avatar/hiệu ứng hiển thị, không bán lực chiến PvP.
- Không ép quảng cáo sau mỗi trận; rewarded ads hoàn toàn tự nguyện nếu triển khai.
- Không thiết kế game xoay quanh paywall.
- Kiểm tra yêu cầu của cửa hàng ứng dụng và nghĩa vụ pháp lý thị trường trước phát hành.

### 33.3. Nội dung theo mùa

Tạo content bằng data config: quái mới, modifier boss, quest và cosmetic; tránh phải viết engine mới mỗi mùa.

---

# PHẦN J — DỮ LIỆU MẪU VÀ CONTRACT GAMEPLAY

## 34. TypeScript contracts gợi ý

```ts
type GemType = 'attack' | 'heal' | 'shield' | 'energy' | 'poison';
type AttributeKey = 'str' | 'vit' | 'agi' | 'int';
type BattlePhase = 'player_ready' | 'resolving' | 'monster_turn' | 'victory' | 'defeat';

type Cell = GemType;
type Board = Cell[][]; // board[row][col], 6×6

interface Coord { row: number; col: number }
interface SwapAction { kind: 'swap'; from: Coord; to: Coord; actionId: string }
interface SkillAction { kind: 'skill'; skillId: string; actionId: string }
type PlayerAction = SwapAction | SkillAction;

interface Attributes { str: number; vit: number; agi: number; int: number }
interface PlayerProfile {
  id: string;
  name: string;
  level: number;
  exp: number;
  gold: number;
  attributes: Attributes;
  unspentPoints: number;
}
interface MonsterDefinition {
  id: string;
  name: string;
  level: number;
  maxHp: number;
  attack: number;
  defense: number;
  behaviorId: string;
  expReward: number;
  goldReward: number;
  drops: DropEntry[];
}
interface DropEntry { itemTemplateId: string; weight: number; amount: number }
interface BattleState {
  battleId: string;
  seed: number;
  rngState: number;
  turn: number;
  board: Board;
  phase: BattlePhase;
  playerHp: number;
  playerShield: number;
  energy: number;
  monsterHp: number;
  monsterPoisonPotency: number;
  monsterPoisonTurns: number;
  monsterNextAction: string;
  completed: boolean;
}
```

**Hợp đồng quan trọng:** `resolveAction(state, action, config)` phải là hàm thuần (hoặc deterministic với `rngState` nằm trong state), trả về `{ nextState, events }`. UI không tự tính reward/damage. Hệ thống save chỉ lưu state/transaction sau khi game-core trả kết quả.

## 35. Game events để render/ghi log

```text
SWAP_STARTED
SWAP_REJECTED
MATCH_FOUND
GEMS_CLEARED
GEMS_FALLING
GEMS_REFILLED
CASCADE_STARTED
DAMAGE_APPLIED
HEAL_APPLIED
SHIELD_GAINED
ENERGY_GAINED
POISON_APPLIED
MONSTER_TELEGRAPH
MONSTER_ATTACKED
MONSTER_SKILL_USED
PLAYER_TURN_SKIPPED
SKILL_USED
BATTLE_WON
BATTLE_LOST
REWARD_GRANTED
LEVEL_UP
```

Có `eventId`, `battleId`, `turn` cho các event ảnh hưởng dữ liệu để theo dõi và tránh xử lý trùng.

## 36. Config-first balancing

Lưu trong dữ liệu có version, ví dụ:

```json
{
  "balanceVersion": 1,
  "board": { "rows": 6, "cols": 6, "maxCascade": 12 },
  "level": { "pointsPerLevel": 3 },
  "battle": { "maxTurns": 20, "energyCap": 100, "shieldCapMaxHpRatio": 0.5 },
  "combo": [1.0, 1.2, 1.4, 1.6],
  "rewards": { "allowLossRewards": false }
}
```

Không đổi balance giữa một trận đang diễn ra; `balanceVersion` được gắn vào `SerializedBattle` để replay và khôi phục đúng.

---

# PHẦN K — CHECKLIST THỰC THI VÀ TIÊU CHÍ HOÀN THÀNH

## 37. M0 — Prototype Match-3

- [ ] Ionic + Angular + Phaser 4 render canvas đúng lifecycle.
- [ ] Bàn 6×6, năm ngọc có shape/icon khác nhau.
- [ ] Chạm/kéo swap, invalid swap hoàn tác.
- [ ] Match ngang/dọc, clear, gravity, refill, cascade.
- [ ] Seed deterministic, legal move, reshuffle, max cascade.
- [ ] Có animation và unit test gameplay engine.
- [ ] `npm test` và `npm run build` chạy thành công ở môi trường thích hợp.

**Done:** có thể ngồi chơi ghép ngọc nhiều lượt không treo/không board chết.

## 38. M1 — Vertical slice săn quái

- [ ] 1 nhân vật + 1 quái, HP/shield/energy/poison.
- [ ] Đúng công thức combat; monster basic + telegraph.
- [ ] Skill đầu tiên, thắng/thua, event-based animation.
- [ ] Kết quả trận và nút săn lại.
- [ ] Pause/resume tối thiểu.

**Done:** một vòng săn quái trọn vẹn vui và giải thích được vì sao thắng/thua.

## 39. M2 — Offline MVP

- [ ] 3 quái + 1 boss, progression/unlock.
- [ ] EXP + level + tự cộng 3 điểm.
- [ ] 3 slot trang bị, 6–10 item, túi đồ, rơi đồ.
- [ ] Vàng có công dụng tối thiểu hoặc tạm ẩn.
- [ ] Save/load/migration; reward idempotent.
- [ ] Onboarding theo ngữ cảnh, settings, SFX/VFX.
- [ ] Đo trận 2–5 phút; test người thật.

**Done:** offline không mạng vẫn có lý do chơi tiếp nhiều trận và lưu tiến trình ổn định.

## 40. M3 — Offline complete

- [ ] Ba chương menu, 12–18 quái, 3 boss.
- [ ] Thêm kỹ năng có lựa chọn, quest và achievements.
- [ ] Nội dung rơi đồ và builds khác biệt.
- [ ] Balance, onboarding, sound, performance polish.
- [ ] Đóng gói và test Android trên ít nhất máy thấp/trung/cao nếu có điều kiện.
- [ ] Đấu tập AI là **optional**, không chặn release offline.

**Done:** đủ nội dung cho vòng chơi ngắn và vài mục tiêu dài hạn, không cần hệ thống xã hội.

## 41. M4 — Online foundation

- [ ] Đánh giá mô hình phát hành và pháp lý.
- [ ] JohnCMS đúng version, API/module, tài khoản, token.
- [ ] MySQL schema game online, transaction và quyền dữ liệu.
- [ ] Migration strategy từ offline sang online (không tin save client).
- [ ] Forum/profile/achievement cơ bản.

## 42. M5 — Realtime PvP

- [ ] Socket.IO authenticated gateway.
- [ ] Matchmaking, room, shared seed, server-authoritative rules.
- [ ] Timer, timeout, reconnect, abandon/forfeit.
- [ ] Idempotent result/ranking, anti-cheat, replay.
- [ ] Soak tests, latency simulation, fairness balancing.

## 43. M6 — Live Ops

- [ ] Thiết kế sự kiện lặp lại bằng config.
- [ ] Theo dõi retention, funnel, crash, thời lượng trận.
- [ ] Nội dung mới không phá cân bằng quá mạnh.
- [ ] Kiểm tra chính sách store, pháp lý, tài sản số.
- [ ] Kế hoạch cộng đồng, hỗ trợ người chơi, xử lý khiếu nại.

---

# PHẦN L — CÁC QUYẾT ĐỊNH CHỐT VÀ CÂU HỎI CHỜ PLAYTEST

## 44. Quyết định đã chốt cho giai đoạn đầu

- **Offline-first.** Không JohnCMS/MySQL/Socket.IO trong M0–M3.
- **Một nhân vật chính**, bốn thuộc tính, +3 điểm tự cộng mỗi cấp.
- **Bàn 6×6**, năm ngọc, swap hai ô kề nhau, match ≥3, cascade.
- **Săn quái bằng menu**, không bản đồ phức tạp.
- **Phaser 4** hiển thị battle; Ionic/Angular hiển thị ứng dụng; Capacitor đóng gói mobile.
- **Không StencilJS**.
- **Asset do AI hỗ trợ tạo** nhưng cần kiểm tra pháp lý và khả năng dùng trong game.
- **PvP Match-3** là mục tiêu tương lai, không để nó kéo phình MVP.

## 45. Quyết định cần đo, chưa nên coi là chân lý

1. Bàn 6×6 có đủ dễ đọc trên màn 5–6 inch không? Nếu không, thử 5×6 mà không thay engine.
2. 20 lượt/trận có quá ít với boss? Điều chỉnh dựa trên data.
3. Ngọc tím tạo độc có mạnh quá khi cộng dồn? Cần thống kê.
4. AGI +20% cascade có đủ khác biệt mà không mất cân bằng? Test build.
5. Phần thưởng level/item có đủ đều để người chơi muốn trận tiếp? Đo.
6. Nếu người chơi muốn tự do khám phá, mở thêm quái nào mà vẫn không cần world map?
7. PvP dùng bàn chung theo lượt có gây chờ lâu? Cần thử đấu tập và beta.

## 46. Tài liệu bổ sung nên đi kèm (không thay thế GAMEPLAY.md)

- `ART_BIBLE.md`: style, nhân vật, quái, ngọc, prompt asset, licensing checklist.
- `BALANCE.json`: mọi con số điều chỉnh, tách khỏi code.
- `TECH_ARCHITECTURE.md`: module, interfaces, Phaser scene lifecycle, save adapters.
- `TEST_PLAN.md`: cases cụ thể, test harness, máy thử.
- `CONTENT_CATALOG.md`: dữ liệu từng quái/item/quest/boss khi làm M3.

---

## Phụ lục — Mẫu một trận đầu tiên

**Người chơi:** Level 1, STR/VIT/AGI/INT = 5/5/5/5, MAX_HP = 300, ATK = 25, DEF = 10, SKILL_POWER = 20.  
**Quái:** Bụi Sương, HP=270, ATK=55, DEF=0, khiên tối đa 50, né 25% đòn đánh thường.

1. Lượt 1: match 3 đỏ → nếu không né, `round(3×25/3)−0 = 25 damage`; nếu né thì không mất HP/khiên. Khi quái phản công, sát thương là `55−floor(10×0.6)=49`.
2. Lượt 2: match 3 xanh dương → khiên `round(3×(8+5×0.5))=32`; quái đánh 49, khiên hấp thụ tối đa 32 rồi phần còn lại trừ HP.
3. Lượt 3: match 3 vàng → +24 energy; quái tiếp tục gây 49 damage nếu không né/không có khiên.
4. Các lượt sau: người chơi tìm combo đỏ/vàng, dùng heal/shield đúng lúc và tích skill. Kết quả tùy lựa chọn, board seed và cascade — **không bảo đảm chiến thắng bằng kịch bản cố định**.

**Quan trọng:** ví dụ trên chứng minh công thức tương tác, chưa chứng minh cân bằng hoặc thời lượng trận 2–5 phút. Phải chạy mô phỏng nhiều seed và playtest người thật trước khi chốt chỉ số quái.

---

**Quy tắc phát triển:** Nếu có hai lựa chọn, ưu tiên phương án giúp **một trận săn quái có quyết định thú vị và cảm giác thắng rõ** hơn phương án chỉ làm tăng số lượng màn hình, item hoặc hệ thống. Đó là tiêu chuẩn cao nhất của Phố Linh.
