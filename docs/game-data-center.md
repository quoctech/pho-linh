# PHO LINH · Game Data Center

Tài liệu này mô tả nguồn dữ liệu cân bằng của nhân vật và quái. Mục tiêu là để đội game có thể chỉnh số liệu mà không phải sửa battle logic, đồng thời giữ cùng một contract khi chuyển từ JSON local sang backend.

## Nguồn dữ liệu hiện tại

| File | Phạm vi |
| --- | --- |
| `src/assets/game-data/character.json` | Chỉ số gốc, công thức derived stats, giới hạn combat và skill của người chơi |
| `src/assets/game-data/monsters.json` | Definition, tactic, level, HP, ATK, DEF, reward và unlock của từng quái; rule combat đặc thù quái |
| `src/assets/game-data/combat.json` | Cấu hình bàn match-3, combo, lượt trận và reward drop |

`src/game-core/game-data.ts` là lớp contract/loader local. Core battle chỉ đọc qua các constant đã typed ở đây, không đọc JSON rải rác trong từng hệ thống.

## Schema chung

Mỗi file phải có:

```json
{
  "schemaVersion": 1,
  "id": "stable-data-set-id"
}
```

`schemaVersion` là version của schema, không phải version trận đấu. `balanceVersion` trong `combat.json` được ghi vào `BattleState` để replay/save có thể nhận biết bộ cân bằng đã dùng.

## Asset animation metadata

Thông tin animation của hero và quái là presentation metadata, tách khỏi balance gameplay. Bộ frame V2 hiện được lưu trong các thư mục `src/assets/hero-*` và `src/assets/monsters/*`, mỗi actor có `frames-manifest.json` gồm 24 animation, 6 frame mỗi animation và tổng 144 frame.

- Tốc độ runtime chuẩn: **12 FPS**.
- Frame là WebP độc lập; manifest quyết định thứ tự và đường dẫn, không dùng spritesheet cũ.
- Battle/preview dùng origin đáy giữa và kích thước hiển thị chuẩn hóa theo `idle`.
- Khi chuyển sang backend/CDN, có thể đưa manifest vào asset catalog với các field `actorId`, `animationId`, `frameIndex`, `path`, `width`, `height`, `fps`, `loop`, `version`.
- Thay asset hoặc tốc độ render không được tự ý thay đổi `balanceVersion`; chỉ tăng `dataVersion`/asset version nếu snapshot backend cần cache bất biến.

## Character data

`character.json` gồm các nhóm:

- `baseAttributes`: `str`, `vit`, `agi`, `int` mặc định khi tạo profile.
- `derivedStats`: công thức tạo `maxHp`, `atk`, `defense`, `skillPower`, `agiBonus` và `power`.
- `limits`: năng lượng tối đa, giới hạn khiên theo HP và giới hạn độc theo HP.
- `combat`: hệ số công thức ngọc V2 — `attackTileFactor`, `poisonAtkFactor`, `poisonMaxStacks`, `heal.maxHpFactor`, `shield.defFactor`, `poison.turns`, và `monsterGems` (hằng số riêng cho hiệu ứng ngọc do quái tự match, tách khỏi công thức player).
- `passives`: tham số nội tại Balance V3 theo hệ (`metal/wood/water/fire/earth`): `criticalChanceBonus`, `criticalDamageBonus`, `healMultiplierWhenPoisoned`, `damageReduction`, `damageStreakMin`, `burnDamageBonus`, `burningTurns`, `burningAtkFactor` và `shieldDamageReduction`. Xem `GAMEPLAY_BALANCE_V2.md §3`.
- `skills`: cấu hình gameplay của skill chung/legacy. ID skill phải ổn định vì được ghi trong event/save.
- `elementSkills`: metadata hiển thị và cấu hình gameplay của hai kỹ năng theo hệ. Battle resolver dùng một luồng chung và nhận skill ID + config tương ứng, nên UI và damage thực tế luôn dùng cùng số liệu. Ngoài công thức ATK/SP, config hỗ trợ khiên, đa đòn, độc, hút năng lượng, khống chế, tăng sát thương nhận, giảm sát thương, miễn khống chế và phản kích.

### Combat data (Balance V3)

`combat.json` bổ sung cho đợt V2:

- `match3.gemWeights`: trọng số sinh ngọc `{attack:25, poison:20, energy:20, heal:18, shield:17}` (tổng 100).
- `match3.balanceVersion`: **3** — được ghi vào `BattleState` để replay/save biết bộ cân bằng đã dùng.
- `energyByMatchLength`: nộ theo độ dài match ngọc vàng `{3:15, 4:25, 5:40, 6:50}` (không nhân cascade).
- `elements.cycle`: vòng tương khắc `["metal","wood","earth","water","fire"]` (mỗi hệ khắc hệ kế tiếp).
- `elements.modifier`: bảng hệ số theo nhóm `damage/support/energy` và quan hệ `counter/neutral/countered`.

Logic Ngũ Hành/passive/burning thuần nằm ở `src/game-core/elements.ts` và `battle.ts`; không hardcode số trong class render.

Ví dụ chỉnh sức mạnh skill:

```json
"cloud_break_lantern": {
  "energyCost": 100,
  "baseDamage": 50,
  "skillPowerMultiplier": 4,
  "defenseMultiplier": 0.5
}
```

UI tooltip và battle resolver đều lấy cùng cấu hình này, tránh tình trạng tooltip hiển thị khác damage thật.

Trong PK với quái, cả skill chính và skill phụ đều mở khi đạt đúng `energyCost` riêng của skill, đi qua common player-skill flow. Tooltip giữ 2 giây hiển thị tên, nộ cần, sát thương và các hệ số/hiệu ứng tương ứng. `cloud_break_lantern` chỉ được giữ làm alias tương thích dữ liệu cũ/test cũ.

Thông số kỹ năng hiện hành:

| Hệ | Kỹ năng 1 | Kỹ năng 2 |
|---|---|---|
| Kim | Vạn Kiếm Quy Tông: 60, 120% ATK, chịu khiên | Kim Quang Phá Giáp: 100, 180% ATK xuyên khiên, giảm DEF 30%/2 lượt |
| Mộc | Thanh Đằng Trói Hồn: 50, 80% ATK, hút 15 năng lượng | Vạn Diệp Độc Chú: 90, 90% ATK, độc 20% ATK/lượt trong 3 lượt |
| Thủy | Hàn Triều Phá Không: 50, trừ 22 khiên; không có khiên thì trừ HP | Băng Phong Thiên Lý: 100, 110% ATK, đóng băng 1 lượt |
| Hỏa | Hỏa Vũ Liên Châu: 60, 3 × 40% ATK | Phần Thiên Xạ Nhật: 100, 150% ATK, mục tiêu nhận thêm 15% sát thương/2 lượt |
| Thổ | Sơn Nhạc Trấn Địa: 65, 70% ATK, 40% choáng 1 lượt | Huyền Nham Hộ Thể: 80, khiên 200% DEF, giảm 25% sát thương, miễn khống chế, phản 35% trong 2 lượt |

## Monster data

`monsters.json` có hai phần:

- `definitions`: record theo `monsterId` ổn định. Mỗi definition có tên hiển thị, `element` (hệ Ngũ Hành), level, `maxHp`, `attack`, `defense`, `shieldCap`, behavior, tactic, reward và điều kiện unlock.
- `combat`: hệ số dùng chung cho heavy attack, giảm damage theo defense, guard, năng lượng, poison và skill riêng của Miêu Đèn.

Các ID hiện có:

`mist_blob`, `lantern_cat`, `bamboo_mantis`, `cloud_fox_boss`.

Asset/UI có thể dùng cùng ID này để map sprite, SFX và tên hiển thị. Không đổi ID khi chỉ đổi tên hoặc số liệu; nếu cần một quái mới hãy thêm ID mới.

## Quy tắc chỉnh sửa

1. Không sửa trực tiếp số balance trong `src/game-core` nếu giá trị thuộc gameplay data.
2. Sau khi đổi JSON, tăng `combat.match3.balanceVersion` nếu thay đổi có thể ảnh hưởng replay hoặc kết quả trận.
3. Giữ số không âm cho HP, ATK, DEF, reward và tactic. Tỉ lệ phải nằm trong khoảng `0..1`.
4. Không xóa field đang được dùng trong save/event khi chưa có migration.
5. Thêm test cho mọi monster/skill mới: tạo state, resolve event và reward.

## Hướng chuyển sang Game Data Center

Hiện tại app import JSON lúc build để battle core vẫn chạy synchronous và offline. Khi có backend, giữ nguyên các interface trong `game-data.ts` và thay implementation loader:

```ts
interface GameDataProvider {
  getSnapshot(): Promise<GameDataSnapshot>;
  getVersion(): string;
}
```

Luồng đề xuất:

1. Backend phát hành một snapshot immutable gồm `character`, `monsters`, `combat` và `dataVersion`.
2. Client tải snapshot trước khi vào màn battle, kiểm tra schema/version và cache local.
3. `BattleController` nhận snapshot đã validate; không tự gọi API trong hàm resolve thuần.
4. Server là nguồn authoritative cho PvP/reward quan trọng; client JSON chỉ là fallback offline và presentation.
5. Event trận ghi `balanceVersion`/`dataVersion`, để replay dùng đúng snapshot cũ thay vì số liệu mới nhất.

API có thể bắt đầu bằng:

```text
GET /v1/game-data/snapshots/current
GET /v1/game-data/snapshots/{dataVersion}
```

Response nên trả về cả `schemaVersion`, `dataVersion`, `publishedAt`, checksum và payload. Client từ chối snapshot sai checksum hoặc thiếu field bắt buộc, sau đó dùng snapshot cache cuối cùng.

## Validation CI đề xuất

Backend và client nên chạy cùng các kiểm tra:

- tất cả `monsterId`, `skillId` và asset key là duy nhất;
- behavior/tactic chỉ dùng enum hợp lệ;
- `maxHp >= 1`, `attack/defense/reward >= 0`;
- tỉ lệ dodge, poison, shield và multiplier không vượt giới hạn thiết kế;
- mọi ID trong unlock requirement đều tồn tại;
- JSON parse được và khớp schema version;
- `balanceVersion` tăng khi dữ liệu cân bằng thay đổi;
- critical chance/damage, burning turns/factor và damage-reduction ratio nằm trong giới hạn thiết kế;
- `elements.cycle` đủ đúng 5 hệ không trùng; `elements.modifier` có đủ ba nhóm × ba quan hệ và trong khoảng thiết kế;
- mọi `monster.element` là hệ hợp lệ; `gemWeights` tổng bằng 100; `energyByMatchLength` có đủ khóa 3–6.
