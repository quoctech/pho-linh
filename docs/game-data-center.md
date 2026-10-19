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

## Character data

`character.json` gồm các nhóm:

- `baseAttributes`: `str`, `vit`, `agi`, `int` mặc định khi tạo profile.
- `derivedStats`: công thức tạo `maxHp`, `atk`, `defense`, `skillPower`, `agiBonus` và `power`.
- `limits`: năng lượng tối đa, giới hạn khiên theo HP và giới hạn độc theo HP.
- `combat`: hệ số của ngọc hồi máu, khiên, năng lượng, độc và damage đánh thường.
- `skills`: cấu hình gameplay của skill. ID skill phải ổn định vì được ghi trong event/save.

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

## Monster data

`monsters.json` có hai phần:

- `definitions`: record theo `monsterId` ổn định. Mỗi definition có tên hiển thị, level, `maxHp`, `attack`, `defense`, `shieldCap`, behavior, tactic, reward và điều kiện unlock.
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
- `balanceVersion` tăng khi dữ liệu cân bằng thay đổi.
