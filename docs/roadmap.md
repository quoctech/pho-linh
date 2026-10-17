# PHỐ LINH — ROADMAP PHÁT TRIỂN

> **Tài liệu:** `ROADMAP.md`  
> **Phiên bản:** 1.0 · 17/10/2026  
> **Trạng thái:** Kế hoạch, **không phải tiến độ đã hoàn thành**  
> **Nguồn gameplay:** [`GAMEPLAY.md`](./GAMEPLAY.md) · **Kiến trúc:** [`ARCHITECTURE.md`](./ARCHITECTURE.md) · **Giao diện:** [`GAME_DESIGN.md`](./GAME_DESIGN.md)  
> **Bối cảnh:** một developer chính, Android trước, iOS sau; giai đoạn M0–M3 **offline tuyệt đối**.

---

## MỤC LỤC

- [1. Tầm nhìn và tiêu chí ưu tiên](#1-tầm-nhìn-và-tiêu-chí-ưu-tiên)
- [2. Nguyên tắc quản lý phạm vi](#2-nguyên-tắc-quản-lý-phạm-vi)
- [3. Tổng quan milestone M0–M6](#3-tổng-quan-milestone-m0m6)
- [4. M0 — Match-3 Prototype](#4-m0-match-3-prototype)
- [5. M1 — Vertical Slice săn quái](#5-m1-vertical-slice-săn-quái)
- [6. M2 — Offline MVP](#6-m2-offline-mvp)
- [7. M3 — Offline Complete](#7-m3-offline-complete)
- [8. M4 — Online Foundation](#8-m4-online-foundation)
- [9. M5 — Realtime PvP](#9-m5-realtime-pvp)
- [10. M6 — Live Operations](#10-m6-live-operations)
- [11. Kế hoạch thời gian đến Tết 2027](#11-kế-hoạch-thời-gian-đến-tết-2027)
- [12. Quy trình làm việc hằng tuần](#12-quy-trình-làm-việc-hằng-tuần)
- [13. Definition of Done và quality gates](#13-definition-of-done-và-quality-gates)
- [14. Quản lý rủi ro và phụ thuộc](#14-quản-lý-rủi-ro-và-phụ-thuộc)
- [15. Backlog và quy ước đánh dấu tiến độ](#15-backlog-và-quy-ước-đánh-dấu-tiến-độ)
- [16. Điều kiện chuyển sang online](#16-điều-kiện-chuyển-sang-online)

---

## 1. Tầm nhìn và tiêu chí ưu tiên

**Tuyên ngôn:** Phố Linh là game RPG săn quái offline, đánh bằng bàn Match-3 6×6, mỗi trận thường 2–3 phút và boss 3–5 phút. Người chơi **chủ động đổi ngọc**, thắng bằng chiến thuật và cách cộng STR/VIT/AGI/INT; mỗi cấp nhận **3 điểm tự phân bổ**.

Ba kết quả quan trọng hơn số lượng màn hình:

1. **Fun:** đổi ngọc thật sự thú vị; quái có đòn báo trước để người chơi phản ứng.
2. **Feel:** input chính xác, hình ảnh/âm thanh phản hồi nhanh, trận có cao trào.
3. **Progress:** thắng trận nhận EXP, vàng, trang bị; chỉ số mới làm gameplay thay đổi.

**Ưu tiên cứng:** Match-3 → săn quái → EXP/cộng điểm → lưu offline → trang bị/boss → polishing → backend/cộng đồng → PK realtime.

Học từ **Tiny Harvest** về vòng lặp ngắn, mở khóa dần và phần thưởng có ý nghĩa; **không sao chép** tài sản, nội dung hay biến Phố Linh thành game nông trại.

### KPI dùng để quyết định, không phải cam kết thị trường

| Chỉ số | Mục tiêu thử nghiệm | Khi không đạt |
|---|---:|---|
| Người mới bắt đầu trận đầu | Dưới 60 giây | Lược bỏ onboarding hoặc thao tác thừa |
| Hiểu luật đổi ngọc sau hướng dẫn | ≥80% người test | Thiết kế lại phản hồi swap |
| Thời lượng trận thường (trung vị) | 2–3 phút | Điều chỉnh máu quái, lượt, damage |
| Thời lượng boss (trung vị) | 3–5 phút | Điều chỉnh boss phase và lượt |
| Tự nguyện chơi trận thứ 2 | ≥70% người test | Chưa mở rộng nội dung; sửa core loop |
| Crash-free phiên test | ≥99% | Ưu tiên ổn định trước phát hành |

Mục tiêu phù hợp với tài liệu gameplay §29. Đo bằng người chơi thật; tuyệt đối không tuyên bố KPI đã đạt nếu chưa có test.

## 2. Nguyên tắc quản lý phạm vi

### 2.1. Phạm vi bắt buộc của M0–M3

- **Ionic 9 + Angular Standalone** cho UI; **Phaser 4** cho trận; **Capacitor 8** cho mobile; TypeScript cho logic.
- Hoàn toàn **không yêu cầu mạng** sau cài đặt, không đăng nhập, không JohnCMS/MySQL/Socket.IO.
- Một nhân vật chính; bốn thuộc tính; +3 điểm sau mỗi lần lên cấp.
- Không bản đồ mở, không di chuyển nhân vật; quái và chương hiển thị dạng danh sách thẻ.
- AI tạo asset gốc cho game, được hậu kỳ và tối ưu; **không chibi, không robot**.
- Sản phẩm đầu tiên tập trung Android; iOS chỉ xử lý khi Android ổn định.

### 2.2. Explicit non-goals giai đoạn đầu

- PvP online, matchmaking, chat, bang hội, marketplace, thanh toán, đăng nhập.
- Gacha, battle pass, idle timer và economy phức tạp.
- Engine vật lý, bản đồ chạy, animation skeletal 3D, StencilJS, microservices.
- Hàng chục quái ở M0/M1; không tạo ảnh trước khi biết frame kích thước cần dùng.

### 2.3. Quy tắc chống scope creep

Một tính năng chỉ vào milestone hiện tại nếu **(a)** chứng minh vòng lặp hiện tại vui hơn, **(b)** có test/điều kiện nghiệm thu và **(c)** không làm trễ nhiệm vụ trọng yếu. Các ý tưởng còn lại chuyển `Icebox`/M3+.

## 3. Tổng quan milestone M0–M6

| Mốc | Phát hành | Kết quả có thể kiểm tra | Phụ thuộc | Quy mô tham khảo* |
|---|---|---|---|---|
| **M0** | Prototype nội bộ | Bàn 6×6, đổi/ngã/cascade và VFX | Không | 2–3 tuần |
| **M1** | Vertical slice | Chơi trọn 1 trận săn quái có thắng/thua | M0 | 2–3 tuần |
| **M2** | **Offline MVP** | 3 quái + 1 boss, EXP, +3 điểm, đồ, local save | M1 | 4–5 tuần |
| **M3** | Offline complete | Chương, nhiệm vụ, 12–18 quái, 3 boss, polish | M2 + playtest | 6–10+ tuần |
| **M4** | Online foundation | JohnCMS/MySQL, tài khoản, API, cộng đồng | M2/M3 + quyết định pháp lý | Chỉ ước lượng sau khảo sát |
| **M5** | PK realtime | Matchmaking, shared board, server-authoritative | M4 | Chỉ ước lượng sau load test |
| **M6** | Live game | Sự kiện mùa, theo dõi vận hành, nội dung mới | M4/M5 theo chiến lược | Liên tục |

\*Ước lượng có độ bất định lớn, giả sử developer làm gần toàn thời gian, có sẵn máy kiểm thử và có thể tạo/hậu kỳ asset. **Không hứa ngày release hay doanh thu.** Mốc/chi tiết gameplay là nguồn ở `GAMEPLAY.md` §3, §37–43.

## 4. M0 — Match-3 Prototype

**Mục tiêu:** bất kỳ ai cũng có thể vào bàn và chơi liên tiếp nhiều nước đổi ngọc trên điện thoại hoặc trình duyệt mà không có board chết/treo.

### 4.1. Hạng mục implementation

- [ ] Khởi tạo Ionic 9 + Angular **Standalone**, routing lazy page, Capacitor 8, Phaser 4 theo phiên bản đã khóa.
- [ ] Mount Phaser đúng lifecycle khi vào/ra trang; tránh trùng canvas/listener.
- [ ] `game-core` thuần TypeScript, gồm seeded RNG và board 6×6 có năm loại ngọc.
- [ ] Tạo board **không có match sẵn** và **có ít nhất một legal move**.
- [ ] Tap hoặc drag swap hai ô kề trực giao; đổi sai hoàn tác, không tính lượt.
- [ ] Match ngang/dọc, giao nhau không double-count; gravity, refill, cascade tối đa 12 bước.
- [ ] Reshuffle deterministic nếu dead board; state/action log có thể replay.
- [ ] Visual ngọc có hình/icon riêng; tween swap, nổ, rơi ngọc rõ ràng.
- [ ] Unit tests logic; test touch trên màn hình hẹp; `npm run build` hoàn tất.

### 4.2. Deliverables

`Match3Engine` và tests; `BattlePage` Angular; `BattleScene` Phaser; năm gem assets tối thiểu; video ngắn hoặc screenshot màn gameplay; hướng dẫn chạy và log test.

### 4.3. Gate M0 → M1

10 phút liên tục đổi ngọc được, không để input hoạt động lúc đang resolve; cùng seed + cùng action sequence sinh cùng kết quả; không có lỗi runtime/blocker. Các lỗi về hiệu ứng nhỏ được ghi backlog, không chặn combat.

## 5. M1 — Vertical Slice săn quái

**Mục tiêu:** người chơi có thể săn **Bụi Sương** từ chọn quái → đánh → kết quả → săn lại.

### 5.1. Hạng mục implementation

- [x] Tạo nhân vật level 1, STR/VIT/AGI/INT = 5, derived stats theo `GAMEPLAY.md` §10.
- [x] Tích hợp ngọc đỏ/green/blue/yellow/purple vào damage/heal/shield/energy/poison.
- [x] State machine battle; một swap hợp lệ = một lượt; quái phản công sau cascade.
- [x] Hành vi quái `basic`, telegraph ở UI, boss/heavy sau; combat math config-driven.
- [x] Kỹ năng **Đèn Phá Mây**, energy ≥100, người chơi bấm chủ động ở đầu lượt.
- [x] Trạng thái `VICTORY`, `DEFEAT`, `ABANDON` có kết quả rõ ràng.
- [x] Floating numbers, flash trúng đòn, thanh HP, cảnh báo chiêu, button săn tiếp.
- [x] Pause/resume ở ranh giới lượt bằng checkpoint offline; reward vẫn để M2.
- [x] Test damage/heal/shield/poison, skill, victory priority, defeat, turn limit.

### 5.2. Deliverables

Một trận có đủ vòng lặp; nhân vật/quái bằng asset gốc hoặc placeholder có nhãn; cấu hình quái trong `monster-definitions` và test combat.

### 5.3. Trạng thái triển khai

Code path M1 và automated quality gates đã hoàn tất. Manual browser/Android playtest vẫn cần xác nhận trước khi đóng gate M1 → M2; xem [`M1_TEST_LOG.md`](./m1-test-log.md).

### 5.4. Gate M1 → M2

Người test trả lời được "Vì sao tôi thắng/thua?", hành động trên bàn có tác động thật; mất/khôi phục ứng dụng không làm sai state; trận không bị kẹt không kết thúc.

## 6. M2 — Offline MVP

**Mục tiêu:** game có thể cày cuốc nhiều phiên và lưu giữ tiến trình hoàn chỉnh, không cần mạng.

### 6.1. Nội dung gameplay khóa phạm vi

- [ ] **Ba quái thường:** Bụi Sương, Miêu Đèn, Bọ Lá Tre.
- [ ] **Một boss:** Cáo Mây (hai phase có báo đòn rõ ràng).
- [ ] Luật mở khóa quái theo `GAMEPLAY.md` §15.
- [ ] EXP tích lũy, level up, nhận **+3 điểm** mỗi cấp; màn preview rồi commit STR/VIT/AGI/INT.
- [ ] Item common/rare, ba slot `weapon/armor/charm`, 6–10 item từ dataset gameplay §19.
- [ ] Túi 60 ô, trang bị thay đổi chỉ số thực tế; túi đầy → pending reward, không mất item.
- [ ] Vàng có ít nhất một công dụng hợp lý **hoặc tạm ẩn** khỏi game loop.
- [ ] Lưu offline với schema `saveVersion`, migration, validation và reward journal/idempotency.
- [ ] Onboarding theo ngữ cảnh; SFX tối thiểu, tắt âm/reduced motion, nút bỏ trận.
- [ ] Thu thập số liệu playtest trên thiết bị, không phụ thuộc dịch vụ bên ngoài.

### 6.2. Deliverables

Bản Android internal test/APK nếu môi trường build cho phép; bộ save test sạch/bị lỗi; checklist lỗi; `BALANCE` baseline và asset manifest. **Không tuyên bố đã xuất APK nếu chưa có file APK.**

### 6.3. Gate M2 → M3

Chơi offline tối thiểu nhiều phiên liên tiếp; 3–4 trận săn quái có lý do để nâng cấp; không mất save khi bị gián đoạn; UX cộng điểm dễ hiểu; KPI cần đo ở §1, chỉ phát triển nội dung thêm khi combat nhận phản hồi tốt.

## 7. M3 — Offline Complete

**Mục tiêu:** game solo có đủ chiều sâu và mỹ thuật để phát hành thử độc lập; không cần cộng đồng online để hấp dẫn.

### 7.1. Content và tính năng

- [ ] **Ba chương dạng menu:** Ngõ Đèn, Vườn Mưa, Chợ Trăng; 12–18 quái + 3 boss (tổng mục tiêu, không cộng trùng boss ở M2).
- [ ] Đa dạng enemy behavior, tối đa 2–3 đòn đọc được cho boss.
- [ ] Tối đa ba kỹ năng có vai trò khác nhau, người chơi chọn trang bị trước trận.
- [ ] Nhiệm vụ tuyến tính, thành tích, vài lựa chọn build khác nhau.
- [ ] Tối ưu ảnh AI đã được chuẩn hóa, atlas, âm thanh, accessibility, UI từng màn.
- [ ] Điều chỉnh balance và tutorial từ session người dùng thật.
- [ ] **Đấu tập offline AI** là tùy chọn: chỉ làm sau khi core đủ vui.
- [ ] Test Android nhiều độ phân giải/hiệu năng; profile memory/FPS.

### 7.2. Gate M3 → xét online

Cần có người test muốn quay lại đánh tiếp ngay cả khi không có chat, bảng hạng và PvP; có hệ thống hỗ trợ lỗi save; gameplay ổn trên thiết bị mục tiêu; có quyết định pháp lý/thị trường trước khi phát hành công khai.

## 8. M4 — Online Foundation

**Chỉ bắt đầu khi M2/M3 đủ tốt và có chủ trương phát hành online.** Không có code backend ở M0–M3.

- [ ] Khảo sát chính xác bản **JohnCMS** đang dùng và giấy phép; thiết kế adapter tài khoản.
- [ ] **PHP + MySQL**: auth/token, game profile, inventory, rewards, transactional updates.
- [ ] Xác định quyền sở hữu dữ liệu: online server authoritative cho cấp, vàng, item và phần thưởng.
- [ ] Xây REST endpoints có version, validation, idempotency và nhật ký thay đổi.
- [ ] Tích hợp forum, hồ sơ, tương tác cộng đồng ở mức tối thiểu.
- [ ] Quy định rõ chính sách offline → online: **không tự động tin hoặc nhập vàng/item từ local save**.
- [ ] Đánh giá thủ tục phát hành/trò chơi điện tử và yêu cầu store trước release.

**Gate:** chơi online không làm hỏng/offline save, có thử nghiệm nâng cấp schema và phục hồi dữ liệu; các endpoint nhạy cảm có test truy cập trái phép.

## 9. M5 — Realtime PvP

- [ ] Node.js + Socket.IO gateway có auth từ hệ thống JohnCMS.
- [ ] Queue tìm đối thủ và ghép phù hợp theo rank/level (configurable).
- [ ] Phòng đấu 1v1, **cùng board**, theo lượt; server giữ seed/RNG/state/timer.
- [ ] 12 giây/lượt là baseline cần playtest; skip khi timeout, có reconnect grace.
- [ ] Client chỉ gửi ý định swap/kỹ năng, không gửi sát thương, vật phẩm hoặc kết quả.
- [ ] Xác minh server, idempotency, transaction xếp hạng/phần thưởng, replay log.
- [ ] Test mất mạng, spam action, double connection, độ trễ và tải.

**Gate:** không thể tự gửi damage giả; thắng/thua thống nhất trên cả hai màn; reconnect và timeout có kết quả xác định.

## 10. M6 — Live Operations

- [ ] Các mùa sự kiện xây từ cơ chế sẵn có, không viết engine mới cho mỗi mùa.
- [ ] Boss cộng đồng và nhiệm vụ chung khi có số người online đủ.
- [ ] Nội dung mỹ thuật theo mùa, tùy biến thẻ/hồ sơ, không bán lực chiến PvP.
- [ ] Crash/performance, retention, báo lỗi, cân bằng và hỗ trợ người chơi.
- [ ] Kiểm tra chính sách store và nghĩa vụ pháp lý trước thanh toán/kinh doanh.

**Định nghĩa hoàn thiện:** không phải hết backlog, mà là trải nghiệm ổn định, có số liệu, vận hành/giải quyết lỗi được và cập nhật nội dung có nhịp.

## 11. Kế hoạch thời gian đến Tết 2027

**Mốc tham chiếu:** 17/10/2026. **Mùng 1 Tết 2027: 06/02/2027.** Khoảng 16 tuần, vì vậy không nên cam kết cả offline complete + backend + PvP trong cùng giai đoạn.

| Thời gian dự kiến | Ưu tiên duy nhất | Kết quả dự kiến |
|---|---|---|
| 17/10–08/11 | M0 | Match-3 chơi được, test deterministic |
| 09/11–29/11 | M1 | Trận săn quái Bụi Sương hoàn chỉnh |
| 30/11–03/01 | M2 | EXP, stat allocation, đồ, 3 quái + boss, save |
| 04/01–17/01 | Ổn định/closed playtest | Dùng người thật đánh giá nhịp chơi, crash và save |
| 18/01–05/02 | Fix/Polish | Beta Android offline nội bộ nếu đủ gate |
| Sau Tết | M3 hoặc M4 tùy KPI | Mở content trước khi cân nhắc online |

**Đường lui:** nếu M0/M1/M2 trễ, **cắt nội dung/đồ/boss** trước, không cắt test deterministic, save safety, core controls. Có thể ra bản **vertical slice** cho người thử thay vì cố phát hành thương mại kém ổn định. M3 có thể cần nhiều thời gian hơn cả kế hoạch 16 tuần.

## 12. Quy trình làm việc hằng tuần

### 12.1. Nhịp sprint một tuần

1. **Thứ Hai:** chọn một kết quả kiểm chứng được, chia nhỏ thành 2–5 task.
2. **Thứ Ba–Năm:** implement theo vertical slice, test logic mỗi lần thay đổi.
3. **Thứ Sáu:** build, đo thử mobile, chụp lỗi và chỉnh hiệu ứng.
4. **Cuối tuần nếu rảnh:** cho 1–3 người test, xem video thao tác, sửa mục gây nhầm lẫn.

Không cần ceremony nặng. Duy trì `CHANGELOG.md`, issue đơn giản và một danh sách lỗi ưu tiên.

### 12.2. Thứ tự chọn công việc

**P0** mất save/crash/corrupt/gameplay sai → **P1** tính năng core sai/không chơi được → **P2** UX dễ nhầm/FPS tụt → **P3** nội dung/đẹp hơn/tính năng thêm.

### 12.3. Mẫu ticket

```md
### [M1][P1] Độc kết liễu quái trước đòn phản công
- Why: người chơi cần thấy chiến thuật độc có tác dụng.
- Done: độc tick, quái HP <= 0 => victory, không monster attack.
- Tests: test state transition + animation event.
- Files: game-core/battle/*, BattleScene.
- Evidence: test output + video 15s.
```

## 13. Definition of Done và quality gates

### 13.1. DoD áp dụng mọi task

- [ ] Không thay đổi trái `GAMEPLAY.md` nếu chưa cập nhật tài liệu và config.
- [ ] Mã có kiểu rõ, không dùng `any` tùy tiện; comment giải thích **tại sao**, state/lifecycle/thuật toán khó.
- [ ] Unit test thay đổi gameplay và test được lỗi từng phát sinh.
- [ ] `typecheck`, lint (nếu cấu hình), `test`, `build` chạy thành công theo môi trường thích hợp.
- [ ] Không có listener/timer/Phaser instance rò rỉ sau khi vào-ra battle.
- [ ] UI có loading/error/disabled/empty state; không có nút giả trong luồng nghiệm thu.
- [ ] Asset tối ưu và có bản ghi nguồn tạo/giấy phép trong manifest.
- [ ] Có mô tả kiểm chứng bằng người (manual steps), screenshot hoặc video khi cần.
- [ ] Cập nhật `ROADMAP.md`/changelog theo **trạng thái thực**, không tự đánh dấu pass nếu chưa chạy.

### 13.2. Gate kiểm thử tối thiểu

| Gate | Công cụ/giai đoạn | Điều kiện |
|---|---|---|
| G1 | Unit tests game-core | Match, damage, progress, save đều pass |
| G2 | Angular compile | Strict TS, build production thành công |
| G3 | Browser gameplay | Luồng vào trận→đánh→thắng/thua hoạt động |
| G4 | Android smoke test | App mở, touch, pause/resume, save/load |
| G5 | Playtest | Người mới hiểu luật, trận có quyết định thú vị |
| G6 | Online (M4+) | API auth/transaction/security đã được test |

Không dùng chỉ số FPS/lượt tải/tỉ lệ quay lại giả định thay cho đo đạc.

## 14. Quản lý rủi ro và phụ thuộc

| Rủi ro | Hậu quả | Phòng tránh / kế hoạch B |
|---|---|---|
| Phaser 4 khác API v3 | Code VFX không chạy | Khóa bản v4 đã kiểm chứng, đọc release notes, test sớm |
| Ionic cache trang battle | Hai canvas, leak | Gate `ionViewDidEnter/Leave`, destroy/pause có test |
| Artwork AI thiếu đồng nhất | UI thiếu chuyên nghiệp | Art Bible + asset manifest + kiểm tra atlas/alpha |
| Gameplay lặp, không vui | Người chơi bỏ sớm | M0/M1 test trước khi làm 20 quái |
| Cascade/seed lỗi | Combat bất định, treo | Pure reducer + cap 12 + replay tests |
| Save corrupt hoặc double reward | Mất tin tưởng | Version/migration, snapshot, idempotent grant |
| Too many dependencies | Mất tuần cho setup | Single app + `game-core` đơn giản, không Stencil |
| Mobile máy yếu | FPS tụt, nóng | Atlas, pooling VFX, theo dõi memory và frame time |
| Mốc Tết quá gần | Release non | Tết = beta/mùa nội dung, không gấp làm online |
| Kinh doanh/pháp lý | Không thể phát hành như dự kiến | Kiểm tra mô hình phát hành trước M4/public launch |

## 15. Backlog và quy ước đánh dấu tiến độ

**Các checkbox trong tài liệu này mặc định chưa đánh dấu**, vì đây là kế hoạch; không lấy prototype chat trước làm bằng chứng cho codebase mới nếu chưa kiểm chứng.

Quy ước issue:

- `M0–M6`: milestone.
- `P0–P3`: severity.
- `type:core/ui/asset/test/mobile/docs`.
- `status:todo/in-progress/blocked/review/done`.
- Một issue Done cần link commit, kết quả test hoặc bằng chứng chạy thực tế.

### Icebox (không triển khai trước M3)

PvP xếp hạng, bang hội, gacha, giao dịch giữa người chơi, chợ vật phẩm, auto chiến đấu, bản đồ mở, idle thám hiểm, nhiều class, AI tạo hiệu ứng khung hình hàng loạt.

## 16. Điều kiện chuyển sang online

Chỉ bắt đầu JohnCMS/MySQL/Socket.IO khi đã trả lời bằng dữ liệu thử nghiệm:

1. Trận Match-3 2–5 phút có **ra quyết định thú vị** chưa?
2. Người chơi có muốn săn quái tiếp ngay cả khi không có bạn bè/PK không?
3. Save, cấp độ, item, reward có đúng và kiểm thử được chưa?
4. Game có chạy ổn trên Android mục tiêu không?
5. Đã xác định cách **tách tiến trình offline không đáng tin** khỏi kinh tế/rank online chưa?
6. Đã nắm được đường phát hành, pháp lý, chi phí và vận hành chưa?

**Quy tắc khóa scope:** Nếu câu 1–4 là "chưa", quay về tối ưu offline; không "chữa" gameplay bằng cách thêm mạng xã hội.

---

**Thứ tự đọc:** [`GAMEPLAY.md`](./GAMEPLAY.md) (luật) → `ROADMAP.md` (khi nào làm) → [`ARCHITECTURE.md`](./ARCHITECTURE.md) (làm thế nào) → [`GAME_DESIGN.md`](./GAME_DESIGN.md) (trông/hoạt động ra sao).
