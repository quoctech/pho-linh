# PHỐ LINH — GAME DESIGN SYSTEM, UI/UX & ART DIRECTION

> **Tài liệu:** `GAME_DESIGN.md`  
> **Phiên bản:** 1.0 · 17/10/2026  
> **Vai trò:** Nguồn chuẩn cho **giao diện, visual, tương tác, animation và cách tạo asset**.  
> **Luật chiến đấu/chỉ số:** [`GAMEPLAY.md`](./GAMEPLAY.md) (không được tự ý thay đổi tại đây).  
> **Cách code UI:** [`ARCHITECTURE.md`](./ARCHITECTURE.md). **Khi nào làm:** [`ROADMAP.md`](./ROADMAP.md).

---

## MỤC LỤC

1. [Định vị trải nghiệm và cảm hứng](#1-định-vị-trải-nghiệm-và-cảm-hứng)
2. [Nguyên tắc UX cốt lõi](#2-nguyên-tắc-ux-cốt-lõi)
3. [Art direction và thế giới hình ảnh](#3-art-direction-và-thế-giới-hình-ảnh)
4. [Design tokens: màu, chữ, khoảng cách](#4-design-tokens-màu-chữ-khoảng-cách)
5. [Lưới, safe area và responsive](#5-lưới-safe-area-và-responsive)
6. [Kiến trúc thông tin và điều hướng](#6-kiến-trúc-thông-tin-và-điều-hướng)
7. [Quy chuẩn màn hình Home](#7-quy-chuẩn-màn-hình-home)
8. [Quy chuẩn Character / cộng điểm](#8-quy-chuẩn-character-cộng-điểm)
9. [Quy chuẩn Hunt / chọn quái](#9-quy-chuẩn-hunt-chọn-quái)
10. [Quy chuẩn Battle Match-3](#10-quy-chuẩn-battle-match-3)
11. [Quy chuẩn Result](#11-quy-chuẩn-result)
12. [Quy chuẩn Inventory / Equipment](#12-quy-chuẩn-inventory-equipment)
13. [Component library và trạng thái](#13-component-library-và-trạng-thái)
14. [Gem design: năm viên ngọc](#14-gem-design-năm-viên-ngọc)
15. [Thiết kế nhân vật, quái và boss](#15-thiết-kế-nhân-vật-quái-và-boss)
16. [Motion, VFX, âm thanh và haptics](#16-motion-vfx-âm-thanh-và-haptics)
17. [Onboarding và microcopy tiếng Việt](#17-onboarding-và-microcopy-tiếng-việt)
18. [Accessibility và tùy chọn](#18-accessibility-và-tùy-chọn)
19. [Asset pipeline và AI prompt kit](#19-asset-pipeline-và-ai-prompt-kit)
20. [Tối ưu Ionic/Angular/Phaser](#20-tối-ưu-ionicangularphaser)
21. [Phát triển design system theo M0–M6](#21-phát-triển-design-system-theo-m0m6)
22. [UI acceptance checklist](#22-ui-acceptance-checklist)
23. [Những điều không được làm](#23-những-điều-không-được-làm)
24. [Tài liệu bàn giao và quản trị thay đổi](#24-tài-liệu-bàn-giao-và-quản-trị-thay-đổi)

---

## 1. Định vị trải nghiệm và cảm hứng

### 1.1. Lời hứa sản phẩm

**Phố Linh** mang lại cảm giác "Chơi một trận nhanh, tự mình ghép ngọc, săn được đồ, cộng điểm và mạnh lên". Đây là **game** chứ không phải dashboard chỉ số. UI cần chào đón người mới nhưng giữ được cảm giác phiêu lưu và thành tựu của RPG.

### 1.2. Học gì từ Tiny Harvest của Simon Grimm

Học triết lý, **không sao chép UI, nhân vật, thương hiệu, gameplay cụ thể**:

- **Màn hình dễ hiểu:** người chơi nhìn thấy hành động chính ngay.
- **Micro-reward liên tục:** progress trong vài phút đầu, không để màn hình trống quá lâu.
- **Mở khóa có thứ tự:** không hiển thị một rừng tab/badge hệ thống chưa có.
- **Phiên ngắn, không FOMO:** có thể chơi ít phút, không mất quà vì nghỉ một ngày.
- **Vòng lặp mạnh hơn số tính năng:** gameplay phải vui khi chỉ có một quái.

Khác biệt quan trọng: Tiny Harvest thiên về quản lý/idle; **Phố Linh là Match-3 combat chủ động**. Quyết định của người chơi tác động ngay đến HP, khiên, độc và kỹ năng.

### 1.3. Ba cảm giác muốn đạt được

1. **Thân thiện:** dễ đọc, ngón tay dễ chạm, không phải học bảng hướng dẫn dài.
2. **Ấm áp, kỳ ảo:** ánh đèn phố, vật liệu vải/gỗ/gốm/giấy, gam xanh ngọc và vàng ấm.
3. **Phấn khích có kiểm soát:** nổ ngọc đẹp, số damage rõ, boss telegraph minh bạch, không quá nhiều particles.

## 2. Nguyên tắc UX cốt lõi

| Nguyên tắc | Quy tắc thực tế | Kiểm thử |
|---|---|---|
| **Một CTA chính** | Mỗi màn có một hành động rõ nhất: "Săn quái", "Bắt đầu", "Săn tiếp" | Người mới chỉ đúng trong 3 giây |
| **Thông tin theo thời điểm** | Trong trận: HP, lượt, ngọc, chiêu; ngoài trận: EXP, trang bị, quái | Không có panel dư gây xao nhãng |
| **Không đánh lừa** | Nút bị khóa có lý do; item nhận được xuất hiện thật trong túi | Nhận thưởng → kiểm tra tồn kho |
| **Phản hồi tức thì** | Tap có highlight, swap có tween, ghép có burst | Không bấm "mất hút" |
| **Không ép chơi dài** | PvE không có timer lượt; có pause/bỏ trận, lưu state | Tạm dừng khi cuộc gọi đến |
| **Progress nhìn được** | EXP bar, chỉ số trước/sau, boss phase, trang bị so sánh | Người chơi thấy mạnh hơn |
| **Không lệ thuộc màu** | Ngọc có 5 icon/shape riêng; boss báo đòn bằng cả chữ và icon | Thử giao diện grayscale |
| **Một tay được** | CTA ở vùng dễ chạm; board ở vùng thấp vừa đủ | Test trên 320–420 CSS px |

## 3. Art direction và thế giới hình ảnh

### 3.1. Hướng nghệ thuật thống nhất

- **Tên style:** *Urban Lantern Fantasy — 2D Stylized Semi-Realism*.
- **Bối cảnh:** khu phố giả tưởng, ngõ đèn, mái hiên, chợ đêm, vườn mưa; gợi hơi thở Việt Nam hiện đại nhưng không tái hiện sự kiện/người lịch sử.
- **Chất liệu:** đèn giấy, gỗ sơn, vải dệt, gốm, đá, sương, lá và các chi tiết thủ công **thiết kế mới**.
- **Character:** người trưởng thành tỷ lệ tự nhiên, biểu cảm nhẹ, trang phục có tính công năng, tránh trang phục định kiến giới.
- **Monster:** linh vật tưởng tượng, silhouette khác nhau, hơi đáng yêu nhưng không chibi, không đáng sợ quá mức.
- **Bố cục:** foreground (ngọc/UI) rõ nét nhất, art background giảm tương phản trong khu vực tương tác.
- **Ánh sáng:** key light ấm từ đèn, fill xanh mát từ môi trường; VFX rực trong khoảnh khắc ngắn.

### 3.2. Không làm

Không robot/cơ khí khoa học viễn tưởng; không chibi, không sao chép các nhân vật lịch sử, game Ola hoặc Tiny Harvest; không dùng UI fantasy cổ điển quá rườm rà; không poster art 4K rồi thu bé làm sprite; không tạo chữ UI bằng AI image (vì khó kiểm soát font/đọc).

### 3.3. Level hình ảnh theo milestone

| Mốc | Asset | Mức chất lượng |
|---|---|---|
| M0 | 5 ngọc, 1 nền tối nhẹ | Đủ rõ/nhất quán, tối ưu hiệu năng |
| M1 | 1 nhân vật, 1 quái, 1 battle background | Đủ dùng thật, hit feedback rõ |
| M2 | 3 quái + 1 boss, icon item, portrait, screens | Thống nhất palette, độ phân giải |
| M3 | Chương, boss, audio/VFX, event art | Art polish + kiểm thử mobile |
| M4–M6 | Avatar cộng đồng, season cosmetic, PvP badges | Sau khi backend đã ổn định |

## 4. Design tokens: màu, chữ, khoảng cách

### 4.1. Palette cơ bản — baseline để chỉnh qua thiết bị thật

| Token | Hex | Sử dụng |
|---|---|---|
| `--pl-bg` | `#101C24` | Nền ứng dụng đêm |
| `--pl-surface` | `#192D35` | Panel/card |
| `--pl-surface-raised` | `#263F48` | Modal/card quan trọng |
| `--pl-border` | `#52656B` | Viền phân vùng |
| `--pl-text` | `#F7F4EA` | Chữ chính |
| `--pl-text-muted` | `#C0CDD0` | Nhãn thứ cấp |
| `--pl-gold` | `#F4C36A` | CTA, phần thưởng, ánh đèn |
| `--pl-teal` | `#6BD0BA` | Thành công, progress tích cực |
| `--pl-attack` | `#EF746E` | Gem attack / damage |
| `--pl-heal` | `#62C99E` | Heal |
| `--pl-shield` | `#72B9EF` | Shield |
| `--pl-energy` | `#F1CB64` | Energy |
| `--pl-poison` | `#BF95E2` | Poison |
| `--pl-danger` | `#FF928B` | Lỗi, HP nguy hiểm |
| `--pl-overlay` | `rgba(6, 15, 20, .72)` | Overlay modal |

**Không dùng màu gem làm màu duy nhất để diễn đạt ý nghĩa**; năm viên có icon/silhouette phân biệt. Kiểm tra tương phản chữ/nhãn WCAG cho UI thực tế; màu VFX không thay cho text.

### 4.2. Gắn Ionic variables

```scss
/* apps/mobile/src/theme/variables.scss — ví dụ design tokens */
:root {
  --pl-bg: #101c24;
  --pl-surface: #192d35;
  --pl-surface-raised: #263f48;
  --pl-text: #f7f4ea;
  --pl-text-muted: #c0cdd0;
  --pl-gold: #f4c36a;
  --pl-radius-card: 16px;
  --pl-space-4: 16px;

  /* Ionic components dùng cùng palette; các trạng thái hover/focus cần test riêng. */
  --ion-background-color: var(--pl-bg);
  --ion-text-color: var(--pl-text);
  --ion-color-primary: var(--pl-gold);
  --ion-color-primary-contrast: #101c24;
  --ion-card-background: var(--pl-surface);
  --ion-toolbar-background: var(--pl-bg);
}
```

Không override nội bộ Shadow DOM bằng selector CSS mong manh. Dùng CSS custom properties và các thuộc tính style mà Ionic công bố.

### 4.3. Typography

- Ưu tiên **system font** thân thiện tiếng Việt trong MVP, hoặc font được cấp phép rõ ràng hỗ trợ dấu Việt.
- Display/title: 24–28px, line-height 1.2–1.3, weight 700; không nhiều hơn 2 kiểu heading trong màn.
- Title card: 16–18px, weight 600–700.
- Body: 14–16px, line-height 1.45–1.55.
- Nhãn phụ: 12–13px, dùng chỉ khi không mang thông tin quyết định.
- Chỉ số lớn: 20–26px, dùng tabular numbers để thanh số không giật.
- Tuyệt đối không rasterize chữ nhỏ vào ảnh AI; render text với Angular/Phaser text.

### 4.4. Spacing, radius, elevation

| Token | Giá trị | Ví dụ |
|---|---:|---|
| Space 1 | 4px | icon + label |
| Space 2 | 8px | khoảng icon/đơn vị |
| Space 3 | 12px | row compact |
| Space 4 | 16px | page padding mặc định |
| Space 5 | 20px | card padding lớn |
| Space 6 | 24px | phân đoạn màn |
| Radius small | 8px | chip, stat box |
| Radius medium | 12px | small card |
| Radius large | 16px | MonsterCard / dialog |
| Radius XL | 24px | Panel nổi / result |

Elevation bằng viền sáng mỏng và shadow nhẹ, hạn chế gradient + glow dày nhiều lớp trên điện thoại yếu.

## 5. Lưới, safe area và responsive

### 5.1. Thiết bị mục tiêu

- Portrait bắt buộc cho M0–M3.
- Thiết kế từ **360×800 CSS px** làm reference, test thêm **320×568**, **390×844**, **412×915** và thiết bị có tai thỏ/safe area.
- Page padding ngang 16px; những thành phần lớn như battle board có thể dùng padding 12–16px.
- Responsive theo **vùng khả dụng thật** (container bounds), không phụ thuộc chỉ `window.innerWidth`.

### 5.2. Board 6×6 và vùng chạm

Với 360px rộng, padding ngang 16px: board khoảng 328px ⇒ mỗi cell ~54.7px, đủ thuận tiện. Với 320px: board khoảng 288px ⇒ mỗi cell 48px. Kích thước trên là **dự kiến CSS**; test lại nếu viền/gap làm ô nhỏ đi.

```text
boardWidth = min(availableContentWidth, boardMaxWidth)
cellSize   = floor((boardWidth - boardPadding * 2 - gap * 5) / 6)
```

- Giữ target thao tác ≥44×44 CSS px khi khả thi; dùng hitArea đầy đủ cell dù icon nhỏ hơn.
- Không co board vô hạn vì banner quái quá lớn. Trên màn hình thấp, ẩn art trang trí, rút gọn HUD rồi mới giảm board.
- Nếu nhóm test sử dụng máy quá nhỏ và bàn 6×6 khó chạm, nghiên cứu 5×6 ở bản sau theo `GAMEPLAY.md` §45; **không tự ý đổi core rule**.

### 5.3. Safe area

```scss
/* Sử dụng safe area cho header/footer; không đặt nút sát viền home indicator. */
.pl-page {
  padding-inline: 16px;
  padding-top: max(12px, env(safe-area-inset-top));
  padding-bottom: max(12px, env(safe-area-inset-bottom));
}
```

Không cộng safe-area hai lần nếu `ion-header`, `ion-footer` hoặc `ion-content` đã xử lý spacing; kiểm tra bằng thiết bị thật.

## 6. Kiến trúc thông tin và điều hướng

### 6.1. Màn hình MVP

```text
Splash / Init
  └─ Home
      ├─ Nhân vật ─ Cộng điểm ─ Trang bị
      ├─ Săn quái ─ Chi tiết quái ─ Battle ─ Kết quả
      ├─ Túi đồ
      └─ Cài đặt
```

Không hiển thị tab `PK`, `Bang hội`, `Forum`, `Mua vàng` khi chưa có backend. M3 có thêm `Nhiệm vụ`/`Thành tích` khi thật sự triển khai.

### 6.2. Điều hướng

- Sử dụng `ion-router-outlet` + Angular Router, `ion-back-button` nếu phù hợp.
- Home CTA **Săn quái**; navigation phụ nhân vật/túi đồ/settings.
- Không dùng nhiều lớp modal để thay page cho luồng chính.
- Battle ẩn navigation tabs; nút pause/thoát có xác nhận rõ.
- Android back: màn thường quay lại; battle hỏi xác nhận, tránh mất tiến trình.

## 7. Quy chuẩn màn hình Home

### 7.1. Mục tiêu

Trong 3 giây người chơi phải nhận biết: tôi là ai, cấp mấy, còn bao nhiêu EXP để lên cấp và có thể **Săn quái** ở đâu.

### 7.2. Wireframe minh họa

```text
┌──────────────────────────────────┐
│ PHỐ LINH                  ⚙       │
│ ┌──────────────────────────────┐ │
│ │ [Portrait]  Lữ Khách         │ │
│ │             Cấp 4 · EXP ███ │ │
│ │             Điểm cộng: 3 !   │ │
│ └──────────────────────────────┘ │
│                                  │
│    [      SĂN QUÁI ⚔️       ]    │
│                                  │
│ Thử thách đang mở                │
│ ┌──────────────────────────────┐ │
│ │ Bọ Lá Tre · Cấp đề xuất 3   │ │
│ │ Phần thưởng: EXP / Vàng      │ │
│ └──────────────────────────────┘ │
│                                  │
│  Nhân vật      Túi đồ    Cài đặt │
└──────────────────────────────────┘
```

### 7.3. Rules

- Header vừa phải, không quảng cáo/badge event trước M3.
- Portrait thể hiện cá tính, không che text.
- Main CTA rộng, tối thiểu 48px cao, rõ trạng thái pressed/disabled.
- Khi có điểm thuộc tính, badge nhỏ cạnh `Nhân vật`, không popup ép người chơi cộng ngay.
- Nếu save chưa có: CTA `Bắt đầu hành trình`; nếu load hỏng: hiện **Khôi phục** hoặc **Bắt đầu lại** có cảnh báo, không auto reset.

## 8. Quy chuẩn Character / cộng điểm

### 8.1. Mục tiêu

Người chơi hiểu **cộng điểm nào đem lại lợi ích gì** và không mất điểm vì chạm nhầm.

### 8.2. Bố cục

- Portrait, tên và cấp ở đầu.
- Bốn `StatRow`: STR, VIT, AGI, INT, icon và mô tả một dòng.
- `Điểm còn: N` luôn nhìn thấy.
- Dãy nút `−`/`+` điều chỉnh **draft**, hiển thị preview.
- Khối so sánh **Trước → Sau**: `HP 300 → 320`, `ATK 25 → 28`.
- Footer sticky: `Hủy` và **`Lưu 3 điểm`** (đổi chữ theo số draft).

### 8.3. Quy tắc tương tác

- Bấm `+` không ghi save ngay; nếu hết điểm, disable `+` và có feedback.
- Không cho nhấn `−` dưới giá trị đang sở hữu đã commit.
- Thoát khi có thay đổi chưa lưu: xác nhận `Bỏ thay đổi?`.
- Commit thành công → lưu + cập nhật store + toast ngắn `Đã phân bổ điểm`.
- Màn battle không cho mở allocator để tránh thay chỉ số giữa trận.
- Tooltip nhẹ: STR tăng đòn đỏ, VIT tăng HP/DEF, AGI ảnh hưởng cascade, INT ảnh hưởng kỹ năng/heal/độc (theo `GAMEPLAY.md`).

## 9. Quy chuẩn Hunt / chọn quái

### 9.1. MonsterCard

```text
┌────────────────────────────────────┐
│ [Ảnh quái]  MIÊU ĐÈN      Lv.2    │
│             Đòn: Phòng thủ         │
│             EXP +55  Vàng +20      │
│                         [ SĂN ]    │
└────────────────────────────────────┘
```

Card có portrait 72–96px, tên, level, behavior icon, phần thưởng, badge `Đã mở`/`Chưa mở`. Nếu chưa mở: hiển thị điều kiện, không làm nút giả.

### 9.2. Danh sách và bộ lọc

- M2 chỉ ba quái + boss, **không cần search/filter**.
- Quái mở đầu xuất hiện trước, đang khóa sau; sort theo tiến trình.
- Boss có card nổi bật nhưng không lạm dụng đỏ/glow.
- Nhấn card mở **Chi tiết quái**: HP/ATK/DEF, cách ra đòn, rơi đồ nếu được công bố, `Bắt đầu`.
- Không cần world map; chương M3 chỉ là tab/section danh sách.

### 9.3. Trạng thái

- Loading local asset: skeleton trong thời gian ngắn hoặc splash scene.
- Quái đang khóa: `Đánh bại Bọ Lá Tre để mở Cáo Mây`.
- Nếu asset lỗi: fallback silhouette + tên vẫn có thể chơi.

## 10. Quy chuẩn Battle Match-3

### 10.1. Mục tiêu

Trong battle, mắt đi theo: **quái sắp làm gì → HP hiện tại → bàn ngọc → kỹ năng**. Không để panel ngoài chiến đấu cạnh tranh sự chú ý với board.

### 10.2. Bố cục portrait tham chiếu

```text
┌──────────────────────────────────┐
│ [← Pause]    Lượt 04/20          │
│        [ART QUÁI / BOSS]         │
│ Cáo Mây       HP ███████▒░       │
│ ⚠️ Đang tích lực: Đòn mạnh lượt tới │
├──────────────────────────────────┤
│ Bạn · Cấp 4   HP ████▒░          │
│ Khiên 🛡 45    Năng lượng ⚡ 72/100 │
├──────────────────────────────────┤
│ ┌──────────────────────────────┐ │
│ │ 🔴 🟢 🔵 🟡 🟣 🔴             │ │
│ │ 🟢 🔴 🔵 🔵 🟡 🟣             │ │
│ │ ... (đủ 6 hàng)             │ │
│ │   6 × 6 MATCH-3 BOARD      │ │
│ └──────────────────────────────┘ │
│                                  │
│ [Đèn Phá Mây]          [ℹ Luật]  │
└──────────────────────────────────┘
```

Wireframe biểu tượng minh họa; bản chính thức dùng 5 gem assets có silhouette và icon riêng.

### 10.3. Tỷ lệ vùng tham khảo

- Enemy portrait + HP + telegraph: **20–25%**.
- Player HP/shield/energy: **10–15%**.
- Match-3 board: **50–55%** khu vực có thể sử dụng.
- Thanh hành động/kỹ năng: phần còn lại + safe area.

**Tỷ lệ chỉ là điểm khởi đầu**; làm responsive theo `GAMEPLAY.md` §23. Nếu màn thấp, thu nhỏ portrait quái trước, không thu nhỏ text combat thiết yếu.

### 10.4. Nguyên tắc input

1. Mọi viên có hit area ít nhất bằng cell; vuốt A→B sang ô kề trực giao sẽ swap trực tiếp.
2. Tap đơn không để lại trạng thái selected; có thể hiện hướng dẫn ngắn để người chơi biết cần vuốt.
3. Swap sai: tween quay lại, feedback ngắn; không tốn lượt.
4. Khi resolving/cascade: khóa input và có phản hồi trực quan rằng đang xử lý.
5. Resolve xong mới phản công, sau đó mở input lượt kế.
6. Pause trong lúc animation: dừng render; gameplay state nằm tại checkpoint rõ ràng.
7. Thắng/thua vô hiệu hóa input và chuyển result sau animation có thể skip.

### 10.5. Telegraph quái

- Hiện **icon + text rõ** (`⚠️ Sắp tung đòn mạnh`) trước khi quái ra đòn.
- Có animation ngắn nhưng không nhấp nháy liên tục.
- Color + animation không thay lời cảnh báo; màn hình thu nhỏ vẫn phải đọc được.
- Không che lên board/đường kéo thả.

### 10.6. HUD và trạng thái số

- HP dạng thanh + số chính xác, giảm mượt sau engine event, không tự tính trong tween.
- Shield và energy icon ở cạnh số, tránh chồng text khi nhiều digits.
- Poison có icon + số lượt còn, chạm info nếu giải thích cần thiết.
- Combo message nổi rồi tự biến mất; không che ô đang cần nhìn.

### 10.7. Trường hợp giao diện bất thường

| Trường hợp | UX |
|---|---|
| No legal move | Hiện `Đang xáo lại ngọc…`, transition rất ngắn |
| Cascade nhiều bước | Nhanh dần phần tween lặp; event log không bỏ hiệu ứng tính toán |
| Sai swap | Trả vị trí, không quái đánh, không âm thất bại quá khó chịu |
| Energy <100 | Nút kỹ năng disable + hiển thị tiến độ |
| Poison kết liễu boss | Có VFX poison + thắng, không thấy boss phản đòn ảo |
| App background | Pause có kiểm soát, resume từ snapshot hợp lệ |
| Reduced motion | Chuyển vị trí/cập nhật HP nhanh, vẫn giữ thông tin kết quả |
| Màn quá nhỏ | Compact HUD, board ưu tiên, không có scrolling giữa trận |

## 11. Quy chuẩn Result

### 11.1. Trình tự hiển thị

**Thắng**: `CHIẾN THẮNG` → EXP/vàng → item reward → thanh level tăng (nếu lên cấp) → CTA `Săn tiếp` và `Đổi quái`.

**Thua**: `THẤT BẠI` → một lời khuyên **liên quan nguyên nhân** (`Dùng khiên trước đòn mạnh`) → `Thử lại` và `Quay về`.

- Không fake vật phẩm, không "nhận thưởng" nếu chưa thực sự commit vào state.
- Nếu túi đầy: `Vật phẩm đang chờ nhận`, hướng đến túi đồ.
- Không ép quảng cáo, không ép phải bấm qua nhiều popup.
- Nếu tăng level: đánh dấu `+3 điểm chưa phân bổ`, dẫn tới Character khi người chơi muốn.

### 11.2. Thời lượng motion

Banner ~350–600ms; số tăng 250–500ms; người chơi có thể tap bỏ qua animation kết quả. Tổng thời gian chờ không phải rào cản trước CTA.

## 12. Quy chuẩn Inventory / Equipment

### 12.1. Inventory layout

- Trên: ba slot đang mặc `Vũ khí`, `Áo`, `Bùa`.
- Dưới: grid item có số lượng/chỉ báo hiếm; M2 tối đa 60 ô.
- Tap item mở modal có **tên, mô tả, chỉ số, so sánh với đồ đang mặc**, CTA `Trang bị` / `Tháo`.
- Rare có đường viền khác common **và nhãn chữ**, không chỉ màu.
- Nếu đầy túi, hiện `60/60` và pending rewards; không mất đồ.
- Không có nút bán/hủy nếu nghiệp vụ chưa được code/test.

### 12.2. Item tile states

| State | Visual | Hành vi |
|---|---|---|
| Default | Icon + border trung tính | Tap mở details |
| Equipped | Corner badge `Đang dùng` | Có thể tháo |
| Rare | Viền vàng tím nhẹ + chữ `Hiếm` | Chỉ phản ánh rarity data |
| Disabled | Giảm độ nổi, vẫn đọc được lý do | Không bấm làm gì |
| Pending | Dot/badge `Chờ nhận` | Chuyển sang màn nhận thưởng |

## 13. Component library và trạng thái

**Dùng Ionic/Angular Standalone trước; không cần StencilJS.** Component custom chỉ dành cho nơi làm giao diện game dễ tái sử dụng.

### 13.1. Các component được phép xây dựng dần

| Component | Công dụng | Milestone | Implementation owner |
|---|---|---|---|
| `PageHeader` | Title, back/settings | M0 | Ionic toolbar wrapper nếu cần |
| `PrimaryAction` | CTA thống nhất | M0 | `ion-button` + theme style |
| `GemHUD` | HP/energy/turn (nếu ngoài canvas) | M1 | Angular hoặc Phaser, **chọn một nguồn render** |
| `MonsterCard` | Thẻ quái và unlock | M1 | Angular + Ionic |
| `StatRow` | Tăng/giảm thuộc tính + preview | M2 | Angular |
| `CharacterSummary` | Lv/EXP/portrait | M2 | Angular |
| `RewardPanel` | EXP, vàng, item | M1–M2 | Angular |
| `ItemTile` | Grid túi đồ | M2 | Angular |
| `ConfirmDialog` | Bỏ trận, discard draft | M1–M2 | Ionic alert/modal |
| `EmptyState` | Save trống, túi trống | M2 | Angular |

**Không viết một design system framework riêng.** Dùng tokens + vài component dùng thật.

### 13.2. Component states bắt buộc

`default · pressed · focused · disabled · selected · loading · success · error · empty` (khi tình huống đó tồn tại). Focus rõ với bàn phím, tap có phản hồi, loading không cho double-commit.

### 13.3. Ngôn ngữ interaction

- CTA chính màu vàng ấm, secondary outline/neutral.
- Destructive (bỏ trận, xóa save) dùng confirm dialog và copy rõ.
- Badge cấp độ/trang bị ở mức vừa đủ, không nhồi quá 3 badge trên một card.
- Số quan trọng dùng tabular, tránh chuyển layout khi tăng.

## 14. Gem design: năm viên ngọc

| ID | Silhouette | Icon trung tâm | Hue | Combat effect |
|---|---|---|---|---|
| `attack` | Lục giác góc sắc | Kiếm/nhát cắt | San hô đỏ | Damage |
| `heal` | Hạt/lá tròn | Lá | Ngọc xanh lá | HP hồi |
| `shield` | Bát giác dày | Khiên | Xanh lam | Shield |
| `energy` | Kim cương dài | Đèn/tia | Vàng | Energy |
| `poison` | Hình giọt nhọn | Giọt xoáy | Tím | Poison |

### 14.1. Yêu cầu visual

- Mọi viên cùng khung canvas, tâm/cạnh hitbox đồng nhất; không lệch điểm bám khi xoay.
- Icon rõ ngay ở kích cỡ màn hình nhỏ; không dùng text/nhãn trực tiếp trên gem.
- Viên không có chi tiết quá nhỏ/giống nhau; kiểm tra grayscale và thử trên 48px.
- Bản nền trong suốt; baked shadows nhẹ, không có 5 loại glow khác nhau đến mức rối.
- Default gem asset M0 gợi ý `128×128` hoặc `192×192` PNG/WebP; texture atlas và độ phân giải thực tế sau khi đo GPU/memory.

### 14.2. Gem interaction states

`idle → selected → swapping → matched → dissolve/fall → refill`; với invalid: `swapping → rollback → idle`.

Sử dụng Phaser tween; game-core quyết định thứ tự events và kết quả. VFX không phát thêm một lượt hay thay RNG.

## 15. Thiết kế nhân vật, quái và boss

### 15.1. Character art spec

- Người trưởng thành, không chibi, cân đối, không phóng đại cơ thể.
- Trang phục hành trình + vật liệu đèn/vải hiện đại, các chi tiết kỳ ảo tự thiết kế.
- Ít nhất các asset: `portrait`, `battle bust`/avatar, full-body concept lưu để thống nhất (full-body không nhất thiết render ở battle).
- Biểu cảm chuẩn: bình thường, tập trung, vui khi thắng; không cần spritesheet phức tạp ở M0–M2.
- Không khóa giới tính nhân vật với STR/INT hay vai trò chiến đấu.

### 15.2. Monster art spec

- Silhouette đọc được ở 80–180 CSS px; quái và background có tương phản đủ.
- Mỗi loại quái khác nhau **ở hình dáng/hành vi**, không chỉ đổi màu.
- Khuôn mặt/điểm nhận diện đủ dễ thương để người chơi rộng tiếp cận; không hướng quá kinh dị.
- Có trạng thái hit flash/scale recoil bằng Phaser, không cần nhiều frame AI.

### 15.3. Monster MVP, theo `GAMEPLAY.md` §15

| ID | Ý tưởng visual | Distinct cue | Hành vi |
|---|---|---|---|
| `mist_blob` — Sương Hồn | Đám sương cuộn có mắt và lõi sáng | Chuyển động mềm | Basic |
| `lantern_cat` — Miêu Đèn | Linh miêu mang hoa văn ánh đèn | Mắt/vệt sáng đèn | Guard |
| `bamboo_mantis` — Bọ Lá Tre | Côn trùng lá có chi cong | Silhouette lá/chi gấp | Heavy |
| `cloud_fox_boss` — Cáo Mây | Cáo lớn vệt mây, đuôi như dải đèn | Hai phase ánh sáng | Basic/Guard/Heavy |

Tên/hình là thiết kế đề xuất cần kiểm tra trùng lặp với tác phẩm thương mại, không mặc nhiên có tính độc quyền.

### 15.4. Bộ hiệu ứng bắt buộc cho nhân vật và quái

Mỗi combatant (hero, quái thường và boss) phải có một bộ hiệu ứng phản hồi tối thiểu. Hiệu ứng có thể dùng sprite sheet, VFX layer, tween, particle và SFX; không bắt buộc mọi combatant có artwork khác nhau cho cùng một trạng thái, nhưng phải giữ cùng tên key và cùng ý nghĩa trigger.

| Nhóm | Key chuẩn | Khi phát | Nội dung cần thể hiện | Hero | Quái |
|---|---|---|---|:---:|:---:|
| Nền | `idle` | Không có action hoặc đang chờ lượt | Chuyển động thở/đứng chờ, loop nhẹ | ✓ | ✓ |
| Năng lượng | `energy` / `rage` | Năng lượng hoặc nộ đạt ngưỡng/khi đang tích lực | Glow, aura, màu năng lượng và SFX riêng | ✓ | ✓ |
| HP cao | `high_hp` | HP thuộc band cao | Aura nhẹ, không lấn át action | ✓ | ✓ |
| HP yếu | `low_hp` | HP thuộc band thấp | Nhịp cảnh báo, tint/glow tiết chế | ✓ | ✓ |
| Hồi máu | `heal` | HP tăng thật | Vòng hồi phục, hạt xanh, số `+HP` | ✓ | ✓ |
| Giảm hồi máu | `anti_heal` | Nhận debuff làm giảm hoặc chặn heal | Overlay ngược màu hồi máu, icon debuff, thời hạn | ✓ | ✓ |
| Dính độc | `poisoned` | Poison được áp dụng hoặc còn lượt độc | Overlay tím/xanh độc, icon và số lượt | ✓ | ✓ |
| Choáng | `stunned` | Bị choáng hoặc mất lượt | Animation one-shot + icon choáng; không để loop khóa actor | ✓ | ✓ |
| Có khiên | `shield` | Shield > 0 | Vòng/lớp bảo vệ, giá trị khiên, trạng thái vỡ khi về 0 | ✓ | ✓ |
| Bị tấn công | `hit` | HP hoặc shield bị tác động | Recoil, flash ngắn, hit SFX và damage feedback | ✓ | ✓ |
| Bị tiêu diệt | `death` | HP về 0/kết thúc combatant | Death one-shot, fade/knockout, SFX death | ✓ | ✓ |
| Đánh thường | `normal_attack` | Action tấn công cơ bản bắt đầu | Body attack; có thể nối `normal_attack_fx` → projectile | ✓ | ✓ |
| FX đòn thường | `normal_attack_fx` | Đòn chém/đòn đánh rời body | Slash/trail riêng, không dùng lại animation body | ✓ | ✓ |
| Tung chiêu | `cast` | Skill bắt đầu/đang charge | Pose cast, charge/release SFX, skill telegraph | ✓ | ✓ |
| Impact chiêu | `cast_impact` | Skill chạm mục tiêu | Impact tại mục tiêu, camera shake/VFX, impact SFX | ✓ | ✓ |
| Phóng độc | `poison_cast` + `poison_projectile` | Chuẩn bị và phóng đòn độc | Cast độc → projectile → impact → `poisoned` | ✓ | ✓ |
| Né đòn | `dodge` | Attack bị né | Motion né/ghost trail, chữ `NÉ!`, không phát hit impact | ✓ | ✓ |
| Đóng băng | `frozen` | Bị freeze và mất/giảm quyền hành động | Ice overlay, crack khi phá, icon + số lượt | ✓ | ✓ |
| Thiêu đốt | `burning` | Nhận burn damage theo lượt | Lửa quanh thân, ember, tick damage, icon + lượt | ✓ | ✓ |
| Sét đánh | `lightning_struck` | Bị lightning impact hoặc shock | Flash trắng/xanh, tia sét, camera shake ngắn | ✓ | ✓ |
| Khóa chiêu | `skill_locked` | Không thể dùng skill | Icon khóa trên nút skill và overlay ngắn trên actor | ✓ | ✓ |
| Phá giáp | `armor_break` | DEF/giáp bị giảm hoặc phá | Crack/fragment armor, icon debuff, số DEF mới | ✓ | ✓ |

#### Quy tắc asset và phát hiệu ứng

- Bộ actor V2 hiện tại dùng frame WebP tách rời, gồm **24 animation × 6 frame = 144 frame** cho mỗi hero hệ Kim/Mộc/Thủy/Hỏa/Thổ và hai quái `mist_blob`/`lantern_cat`. Manifest là nguồn sự thật về thứ tự frame và đường dẫn file.
- Runtime phát bộ frame này ở **12 FPS**. Sáu frame chạy hết một lượt trong khoảng **0,5 giây**; preview và battle phải lấy cùng một constant tốc độ, không hardcode riêng theo màn.
- Mỗi frame phải giữ cùng canvas/kích thước logic và origin đáy giữa (`0.5, 1`). Không crop lại theo bounding box khi đang chạy animation; display size của actor được chuẩn hóa từ frame `idle` để tránh nhảy kích thước giữa các trạng thái.
- Frame phải được preload trước khi vào battle/preview. Loader dùng texture riêng cho từng frame, không dùng lại spritesheet cũ hoặc ghép frame động trong `update()`.
- `idle`, `energy`, `high_hp`, `low_hp`, `poisoned`, `shield` là trạng thái loop; các key còn lại là one-shot hoặc event-driven.
- `hit`, `dodge`, `death`, `stunned`, `frozen`, `burning`, `lightning_struck`, `skill_locked`, `armor_break` phải có điểm kết thúc rõ ràng để không khóa animation của actor.
- Một action hoàn chỉnh nên tách thành các mốc: **body action → FX/action projectile → impact → state feedback**. Damage chỉ được áp dụng bởi `game-core` event, không do animation quyết định.
- Mỗi hiệu ứng gameplay có ít nhất ba lớp phản hồi khi cần: hình ảnh trên actor, feedback tại mục tiêu/HUD và SFX. Không dùng màu đơn lẻ để truyền đạt trạng thái; luôn có icon, text hoặc motion bổ trợ.
- `freeze`, `burning`, `lightning_struck`, `skill_locked` và `armor_break` là nhóm mở rộng. Có thể preload asset trước, nhưng chỉ phát khi `game-core` có event/state tương ứng; không tự thêm gameplay event trong lớp Phaser.
- Khi nhiều trạng thái cùng tồn tại, death ưu tiên cao nhất; control/debuff vẫn hiển thị qua overlay/icon; action one-shot được phục hồi về persistent state sau khi kết thúc.

## 16. Motion, VFX, âm thanh và haptics

### 16.1. Motion tokens — baseline theo `GAMEPLAY.md` §9/§25

| Sự kiện | Duration gợi ý | Easing/Visual | Lưu ý |
|---|---:|---|---|
| Tap gem | 60–100ms | scale/outline | Phản hồi lập tức |
| Swap | 120–180ms | ease-out position | Không đổi kết quả logic |
| Invalid rollback | 100–160ms | reverse tween | Không trừ lượt |
| Matched glow | 80–120ms | highlight | Tránh nhấp nháy mạnh |
| Burst | 150–220ms | alpha/scale + ít particle | Cap particles |
| Gravity | 180–260ms | ease-in fall | Thời gian theo quãng rơi có giới hạn |
| Damage popup | 300–550ms | bay lên + fade | Màu/icon rõ, không đè board |
| HP transition | 180–300ms | width tween | Thanh HP phản ánh state đúng |
| Boss telegraph | 250–450ms | pulse nhẹ + icon/chữ | Không che tương tác |
| Victory | 350–600ms | banner + tint ánh đèn | Có skip |

Duration thay đổi qua `animationSpeed`/`reducedMotion`, **không thay gameplay engine**.

### 16.2. Combo hierarchy

- `Match 3`: hiệu ứng chuẩn.
- `Match 4`: hiệu ứng hơi mạnh, nhấn +10 energy.
- `Match 5+`: burst nổi bật hơn, nhấn +20 energy.
- `Cascade 2/3/4+`: nhãn combo tăng độ nổi nhưng **không chặn** người chơi quan sát board quá lâu.

Quy tắc phần thưởng ghép 4/5 và multiplier vẫn là `GAMEPLAY.md` §8, không thiết kế thêm special gem ở M0–M2.

### 16.3. Sound và haptics

- SFX tối thiểu: select, swap, match, hit, heal, shield, skill, win, lose.
- Âm thanh ngắn, tránh phát quá nhiều tiếng nổ trùng lặp ở cascade; gom những effect trùng vào một cue có tầng âm lượng.
- Music nền ấm, nhịp vừa phải; boss tăng nhịp nhưng không gây mệt.
- Có toggle Music/SFX, tôn trọng âm lượng thiết bị.
- Haptics là tùy chọn khi đã đo tác dụng/thời lượng, không bắt buộc ở MVP; giảm haptics nếu người chơi chọn reduced motion.
- Assets âm thanh phải có quyền sử dụng thương mại, không mặc định âm thanh AI hoặc tải từ mạng là "free".

## 17. Onboarding và microcopy tiếng Việt

### 17.1. First-time UX trong 90 giây

1. Vào Home, CTA `Bắt đầu săn quái` hiển thị rõ.
2. Trận đầu chỉ spotlight ba viên ngọc đỏ có thể ghép; tooltip: `Đổi hai viên cạnh nhau để ghép ít nhất 3 viên giống nhau.`
3. Người chơi tạo một lượt thành công → `Hay lắm! Ngọc đỏ gây sát thương.`
4. Tắt hướng dẫn dài; khi gặp xanh lá/xanh dương mới giới thiệu tiếp.
5. Lên cấp xong mới hướng dẫn cộng điểm, không giải thích mọi thuộc tính từ splash.

Nếu đã biết: có nút `Bỏ qua hướng dẫn` (trong giới hạn không phá save).

### 17.2. Từ điển nút/label thống nhất

| Ngữ cảnh | Copy chuẩn | Không dùng |
|---|---|---|
| Bắt đầu PvE | `Săn quái` | `Start game!` |
| Thao tác trận | `Đổi ngọc` trong tutorial | `Swap cells` |
| Kỹ năng | `Đèn Phá Mây` | `Skill_1` |
| Commit stat | `Lưu điểm` | `Apply` |
| Kết quả thắng | `Chiến thắng` | `Success callback` |
| Kết quả thua | `Thất bại` | `You lose!!!` |
| Chơi lại | `Thử lại` / `Săn tiếp` | `Retry RNG` |
| Túi đầy | `Túi đã đầy. Vật phẩm được giữ trong mục chờ nhận.` | `Item lost` |
| Bỏ trận | `Bỏ trận? Bạn sẽ không nhận phần thưởng của trận này.` | `Exit` |
| Đòn boss | `Cáo Mây đang tích lực — hãy tạo khiên!` | Chỉ icon ⚠️ |

Microcopy ngắn, tránh cảm giác hệ thống trừng phạt hoặc gây áp lực quay lại mỗi ngày.

## 18. Accessibility và tùy chọn

- Icon/silhouette cho 5 gem; biểu diễn HP bằng thanh **và số**.
- Nút ≥44×44 CSS px khi có thể; content body khoảng 14–16px trở lên.
- Có `reducedMotion` làm hiệu ứng ngắn/gần tắt nhưng vẫn hiển thị số damage/kết quả.
- Các modal/tab/form Angular có label và focus rõ; không dựa mỗi hover.
- Tránh hiệu ứng chớp sáng mạnh lặp lại; camera shake biên độ nhỏ/có thể tắt.
- Đảm bảo tutorial không chỉ là hiệu ứng canvas: có chữ giải thích.
- Cài đặt M2: Music, SFX, Giảm chuyển động, có thể thêm `Fast animations` nếu playtest thấy cần.
- Với người cần thời gian suy nghĩ, PvE **không đặt đồng hồ lượt**. 12 giây là tham chiếu **PvP tương lai**, không dùng cho PvE offline.

## 19. Asset pipeline và AI prompt kit

### 19.1. Mục tiêu tạo asset thật, không chỉ concept

Mỗi asset phải đi qua:

```text
ART BRIEF → AI GENERATE → DUYỆT STYLE → CLEANUP → CROP/ALPHA
          → KÍCH THƯỚC/ATLAS → RENDER PHASER → QA MOBILE → ASSET MANIFEST
```

Không dùng ảnh trả ra trực tiếp nếu có viền trắng, bóng không nhất quán, chữ giả, giải phẫu lỗi hoặc alpha chưa đúng.

### 19.2. Prompts khởi đầu (viết mô tả gốc, không gọi tên game khác)

**A. Nhân vật**

```text
Original 2D stylized semi-realistic Vietnamese-inspired contemporary fantasy
adventurer, natural adult human anatomy and proportions, practical layered
travel clothing with warm lantern motifs and teal fabric accents, expressive
face, confident friendly posture, original world building, clean readable
silhouette, controlled painterly lighting, full body character concept,
neutral background, no text, no logos, not chibi, not sci-fi, no robot.
```

**B. Quái Sương Hồn**

```text
Original friendly mysterious mist creature for a 2D fantasy mobile RPG,
soft swirling vapor body, bright central core, distinct readable silhouette,
subtle lantern-lit rim light, teal-gray and pale gold palette, isolated
single creature, game-ready reference, no background, no words, no logo.
```

**C. Bộ năm viên ngọc**

```text
Five distinct premium 2D match-3 fantasy game gems designed as a coherent
asset family, centered icons and unique silhouettes: sharp red attack gem
with blade motif, rounded green healing gem with leaf, blue shield gem with
shield, tall golden energy gem with lantern, violet drop gem with poison
spiral, consistent perspective, clean thick shapes readable at 48 pixels,
flat transparent-ready background, no words, no logo.
```

**D. Background trận đánh**

```text
Original 2D fantasy night street courtyard, warm lantern glow, distant
wooden awnings and subtle mist, dark teal atmospheric palette, soft depth,
wide quiet negative space in the central lower region for an interactive
match-3 board overlay, painterly semi-realistic mobile game background,
no characters, no text, no brand, portrait composition.
```

Đây là prompt khởi tạo, **không** chứng minh AI tạo được sprite animation sạch ngay. Sau generation cần hậu kỳ, cắt alpha, phối màu và QA.

### 19.3. Asset file spec baseline

| Asset | Suggested source size | Runtime | Alpha |
|---|---|---|---|
| 5 ngọc | 128×128 / 192×192 | Texture atlas WebP/PNG | Có |
| Monster portrait | 512×512 hoặc 512×640 | Resize theo vùng 80–180px | Có |
| Hero portrait | 512×640 | Downscale/atlas nếu phù hợp | Có |
| Background battle | 720×1280 hoặc theo aspect target | WebP tối ưu, crop an toàn | Không |
| Item icon | 128×128 | Atlas | Có |
| VFX/particles | 32–128px mỗi sprite | Atlas nhỏ | Có |

Các cỡ chỉ là **baseline**, phải test bộ nhớ và độ nét trên DPR thiết bị mục tiêu. Không upload font file thương mại/asset có nguồn không rõ.

### 19.4. Manifest và review IP

```yaml
id: gem_attack
path: assets/game/gems/gem_attack.webp
kind: sprite
size: 128x128
alpha: true
source: ai-generated-and-edited
created_at: 2026-10-17
art_revision: A01
ip_review: pending
integration_status: pending
```

Manifest ghi quá trình tạo, phiên bản, nguồn, giấy phép, trạng thái approval. **Không tuyên bố mọi hình AI đều mặc nhiên không trùng bản quyền.** Trước thương mại hóa, kiểm tra thương hiệu, độ tương đồng asset, font và nhạc.

## 20. Tối ưu Ionic/Angular/Phaser

### 20.1. UI rendering

- Angular `OnPush`, signal/computed cho dữ liệu của page; `@for track` bằng stable ID.
- Lazy load BattlePage và import Phaser 4 khi cần; không đưa engine vào Home bundle vô điều kiện.
- Trang list/item tận dụng Ionic components và CSS tokens; không tự dựng lại toàn bộ component library.
- Không repaint cả app theo 60 FPS; Angular HUD chỉ cập nhật khi HP/turn/energy thực sự đổi.

### 20.2. Phaser performance

- Giữ số effect hiện diện trong frame có giới hạn; pool floating texts/particles nếu profiling cho thấy cần.
- Atlas ngọc dùng texture đủ nét nhưng vừa phải; preload có progress nếu cần.
- Không create/destroy game object liên tục ở từng frame khi có thể reuse.
- Ngừng scene/update khi app background, cleanup khi Ionic route leave.
- Mục tiêu 60 FPS **phải đo**, không xem là cam kết từ việc chọn Phaser 4.

### 20.3. Không trade-off sai

Không cắt hit target để tăng khoảng trống trang trí. Không giấu telegraph boss để "đẹp". Không làm người dùng chờ animation lâu hơn sự tương tác chính. Không dùng hình AI full-resolution trong thẻ list nếu bản resized đủ.

## 21. Phát triển design system theo M0–M6

| Milestone | Thiết kế phải có | Không làm |
|---|---|---|
| **M0** | Gem family, battle canvas layout, swap/match animations | Event landing page, forum |
| **M1** | Hero/monster portrait, HP/HUD, monster telegraph, result screen | Boss 3 phases, nhiều skin |
| **M2** | Home, Hunt, Character, stat allocator, Inventory, boss, settings, onboarding | PvP, guild, gacha |
| **M3** | Ba chương dạng menu, quest, achievements, polished assets/audio | World map, social feed |
| **M4** | Login/account, community cards, forum UX | Realtime PK UI chưa có server |
| **M5** | Matchmaking, room, player vs player HUD, timer/reconnect | Animation 3D/voice chat |
| **M6** | Seasonal visual templates, cosmetics, UX social/community | Thiết kế nội dung không đo hiệu quả |

## 22. UI acceptance checklist

### 22.1. Toàn ứng dụng

- [ ] UI nhìn như game fantasy hiện đại, **không giống admin dashboard**.
- [ ] Ionic components đúng vai trò, theme/tokens nhất quán.
- [ ] Typography đọc được tiếng Việt có dấu trên máy nhỏ.
- [ ] Mọi nút thực sự hoạt động hoặc disable có giải thích; không có nút giả.
- [ ] Safe area, Android back, foreground/background, orientation được xử lý.
- [ ] Không phụ thuộc Internet hoặc remote CDN asset ở M0–M3.
- [ ] Loading/error/empty/disabled states có UI đúng.

### 22.2. Battle

- [ ] Bàn 6×6 không bị che bởi header/footer, hit area đủ rộng.
- [ ] Swap hợp lệ/sai rõ ràng; input khóa khi cascade.
- [ ] Năm loại ngọc phân biệt được kể cả khi nhìn grayscale.
- [ ] HP/shield/energy/turn có số đúng, không nhảy sai khi tween.
- [ ] Telegraph boss rõ trước hành động, không dựa vào màu.
- [ ] Win/loss hiển thị kết quả thật, animation có thể skip.
- [ ] Không leak canvas/listener/texture khi ra vào trận nhiều lần.

### 22.3. RPG/Progression

- [ ] Cộng điểm có preview, lưu một lần, có xác nhận bỏ thay đổi.
- [ ] EXP, vàng, item đúng dữ liệu game core và local save.
- [ ] Túi đầy không nuốt đồ; trang bị thay derived stats.
- [ ] Người mới tự tìm thấy CTA săn quái trong vài giây.

### 22.4. Device & playtest

- [ ] Test trên 320px, 360px, 390px và Android thiết bị thật.
- [ ] Kiểm tra VFX khi cascade nhiều tầng, reduced motion, FPS/GC.
- [ ] Test thời lượng trận/khả năng hiểu luật với 20–30 người trước quyết định mở nội dung.
- [ ] Tất cả chênh lệch với art/design baseline được ghi lại, không silently drift.

## 23. Những điều không được làm

```text
❌ Copy ảnh/game UI của Tiny Harvest hay game Ola.
❌ Dùng robot/chibi hoặc lore lịch sử để làm nội dung chính.
❌ Dùng màn hình pixel card/administrative dashboard với nút chơi đặt lẫn.
❌ Render Match-3 board bằng HTML/Angular 60fps rồi gây lag.
❌ Dùng cả màu và phát sáng làm tín hiệu duy nhất cho ngọc/boss.
❌ Mỗi animation lại tính lại damage/drop trong Phaser Scene.
❌ Tạo hơn 30 asset AI chưa qua QA khi mới có một trận chưa vui.
❌ Làm tab online/forum/PK giả trong offline MVP.
❌ Bắt người chơi xem animation quá lâu mới được săn tiếp.
❌ Để save/error state bị reset âm thầm.
```

## 24. Tài liệu bàn giao và quản trị thay đổi

Mỗi màn/asset mới phải ghi rõ:

- **Màn/asset ID**, milestone, nơi dùng, kích thước và trạng thái.
- **UI states**, hành động, message lỗi và loading.
- **Ionic component** tương ứng và game-core data source.
- **Acceptance test** (touch trên máy, accessibility, screenshots).
- **Asset manifest/IP review** nếu là ảnh/nhạc/font.

**Quy tắc nguồn sự thật:**

- `GAMEPLAY.md`: luật, số liệu combat, tiến trình.
- `ROADMAP.md`: ưu tiên và lịch làm.
- `ARCHITECTURE.md`: code/lifecycle/module/test.
- `GAME_DESIGN.md`: visual, UI, interaction, motion, artwork.

Nếu đổi thiết kế làm thay đổi luật, phải cập nhật **GAMEPLAY.md trước** rồi mới thay code/design. Nếu chỉ đổi palette/layout, cập nhật design tokens và QA visual, không đổi combat engine.

---

**Nguyên tắc thẩm mỹ cao nhất:** Một trận săn quái phải trông dễ tiếp cận khi người chơi mới mở game, nhưng mỗi swap, combo và lần tăng cấp đều có **phản hồi rõ ràng và cảm giác tiến bộ thật** — đó là đặc trưng Phố Linh.
