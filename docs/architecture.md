# PHỐ LINH — KIẾN TRÚC KỸ THUẬT & QUY TẮC CODE

> **Tài liệu:** `ARCHITECTURE.md`  
> **Phiên bản:** 1.0 · 17/10/2026  
> **Áp dụng:** M0–M3 **offline-first**; phần online chỉ là định hướng M4–M6, **chưa triển khai**.  
> **Liên quan:** [`GAMEPLAY.md`](./GAMEPLAY.md) · [`ROADMAP.md`](./ROADMAP.md) · [`GAME_DESIGN.md`](./GAME_DESIGN.md)

---

## MỤC LỤC

1. [Mục tiêu và các quyết định kiến trúc](#1-mục-tiêu-và-các-quyết-định-kiến-trúc)
2. [Stack, phiên bản và điều kiện môi trường](#2-stack-phiên-bản-và-điều-kiện-môi-trường)
3. [Sơ đồ phân lớp và data flow](#3-sơ-đồ-phân-lớp-và-data-flow)
4. [Cấu trúc thư mục và module](#4-cấu-trúc-thư-mục-và-module)
5. [Chuẩn Ionic 9 + Angular Standalone](#5-chuẩn-ionic-9-angular-standalone)
6. [Quy tắc state management](#6-quy-tắc-state-management)
7. [Tích hợp Phaser 4 trong Ionic](#7-tích-hợp-phaser-4-trong-ionic)
8. [Thiết kế game-core thuần TypeScript](#8-thiết-kế-game-core-thuần-typescript)
9. [Battle orchestration và event rendering](#9-battle-orchestration-và-event-rendering)
10. [Character, progression, inventory](#10-character-progression-inventory)
11. [Offline persistence với Capacitor](#11-offline-persistence-với-capacitor)
12. [Asset, performance và native lifecycle](#12-asset-performance-và-native-lifecycle)
13. [Error handling, logging và accessibility](#13-error-handling-logging-và-accessibility)
14. [Quy tắc code style, comment và review](#14-quy-tắc-code-style-comment-và-review)
15. [Testing strategy và CI](#15-testing-strategy-và-ci)
16. [Con đường mở rộng JohnCMS + realtime](#16-con-đường-mở-rộng-johncms-realtime)
17. [Definition of Done và anti-patterns](#17-definition-of-done-và-anti-patterns)
18. [Nguồn kỹ thuật và ADR](#18-nguồn-kỹ-thuật-và-adr)

---

## 1. Mục tiêu và các quyết định kiến trúc

### 1.1. Nguyên tắc dẫn đường

**Mục tiêu thiết kế:** một developer có thể hiểu và sửa hệ thống sau nhiều tháng, test được luật combat không cần mở game, tạo phiên bản Android offline chạy ổn định; sau đó mở rộng online mà không phải viết lại game core.

- **Standalone-first:** mỗi page Angular là standalone; Ionic component import cục bộ.
- **Ionic owns UI:** route, form, modal, toast, page shell, settings, inventory, attribute allocator.
- **Phaser owns battle graphics:** ngọc, input swap, tween, quái, VFX, số damage; không render board với `*ngFor`/`@for`.
- **Game core owns rules:** toàn bộ board/RNG/damage/EXP/drop định nghĩa bằng TypeScript thuần.
- **Local first:** offline save qua adapter; không API/auth/network ở M0–M3.
- **One source of truth:** business state không nằm rải trong Scene, Page và SaveService.
- **Config-first balance:** các số trong `GAMEPLAY.md` §8–§21 vào `balance.config`/data, không hardcode trong class render.
- **Vertical slice:** chỉ trừu tượng hóa những gì cần cho tính năng đang làm; **không** dựng backend giả/microservices.

### 1.2. Những gì tuyệt đối không thêm trong giai đoạn đầu

StencilJS, Redux/NgRx (trừ khi có bằng chứng cần), NestJS, JohnCMS/MySQL, Socket.IO, AI SDK trong runtime, ECS phức tạp, world map, dependency injection trong `game-core`, hoặc class kế thừa dài chỉ để xử lý một button.

### 1.3. Ma trận quyền sở hữu

| Lĩnh vực | Sở hữu dữ liệu/logic | Render |
|---|---|---|
| Điểm/EXP, chỉ số, trang bị | `game-core` + `PlayerStore` | Angular |
| Logic board, RNG, lượt, damage | `game-core` | Phaser |
| Trạng thái màn hình/menu/form | Angular feature component/store | Ionic |
| Hiệu ứng ngọc/animation | `BattleScene` (chỉ presentation) | Phaser |
| Save/load, migration | `GameStorage` adapter | Không có |
| Assets/fonts/sound | `assets/` + manifest | Ionic/Phaser theo asset |
| PvP online (M5) | Backend server-authoritative (tương lai) | Client dùng lại Phaser |

## 2. Stack, phiên bản và điều kiện môi trường

### 2.1. Các mốc kỹ thuật

| Package | Quyết định | Lưu ý |
|---|---|---|
| Ionic Framework | **9.x** | Import standalone qua `@ionic/angular`; không `IonicModule` |
| Angular | **một bản ổn định trong dải Ionic 9 hỗ trợ** | Ionic 9 công bố Angular 18–22; khóa phiên bản chính xác ở lockfile |
| Phaser | **4.x stable** | Kiểm API V4 và renderer; không copy pipeline cũ của V3 |
| Capacitor | **8.x** | Node.js 22+; Android Studio/SDK theo tài liệu Capacitor 8 |
| TypeScript | Theo Angular được chọn | `strict: true`, không ép bản TypeScript vượt peer dependency |
| Test runner | Một giải pháp phù hợp Angular toolchain | Ưu tiên unit test thuần TS nhẹ, không mix nhiều runner |

**Không dùng `@latest` vô điều kiện trong CI.** Giai đoạn setup: kiểm tra `npm view ... peerDependencies`, tạo `package-lock.json`, `npm ci` trên máy khác, chốt bản trong ADR. Nếu package mới phát hành gây xung đột, dùng phiên bản **ổn định tương thích**, giải thích và lưu lại.

Tài liệu tham chiếu ở cuối file. Ionic 9 chuyển standalone component về `@ionic/angular` và đánh dấu `IonicModule` deprecated; Capacitor 8 cần Node 22+.

### 2.2. Lệnh dự kiến, phải chỉnh theo `package.json` thực tế

```bash
npm ci                       # cài bản được khóa bởi lockfile
npm run dev                  # phát triển web cục bộ
npm run typecheck            # kiểm tra types
npm run lint                 # lint nếu đã cấu hình
npm run test                 # unit tests
npm run build                # production web build
npx cap sync android         # sync build web + native plugins
npx cap open android         # mở Android Studio để chạy trên máy
```

**Không đánh dấu lệnh pass nếu dự án chưa được tạo/chưa thực thi.** Với Angular output có thể là `www` hoặc `dist/.../browser`; phải đặt đúng `webDir` trong Capacitor config theo build output thực tế.

## 3. Sơ đồ phân lớp và data flow

```text
                 ┌───────────────────────────────────────┐
                 │ Ionic 9 + Angular Standalone          │
                 │ Pages • Shell • Forms • Dialogs       │
                 └──────────┬───────────────┬────────────┘
                            │               │
                        signals          BattlePage
                            │               │
                       PlayerStore    BattleController
                            │               │
                 ┌──────────▼───────────────▼────────────┐
                 │ Pure TypeScript GAME CORE             │
                 │ Match3 • RNG • Combat • Progression   │
                 │ Items • Rewards • Contracts • Config  │
                 └──────────┬───────────────┬────────────┘
                            │               │ events
                     GameStorage       BattleScene
                            │               │
                    Capacitor/Browser    Phaser 4
                            │               │
                      Local device    Canvas/Tweens/SFX
```

**Luồng một swap:** `Phaser input` → `BattleController.dispatch(action)` → `resolveAction(oldState, action, config)` → `{nextState, events}` → `Phaser plays(events)` → `controller commits checkpoint/reward` → `Angular updates HUD khi cần`.

Không được đi ngược: Scene **không** tự cộng EXP/vàng; Angular Page **không** tự quyết định combo hoặc drop rate.

## 4. Cấu trúc thư mục và module

### 4.1. Bắt đầu bằng workspace tối giản

```text
pho-linh/
├─ apps/
│  └─ mobile/
│     ├─ src/
│     │  ├─ app/
│     │  │  ├─ app.component.ts
│     │  │  ├─ app.config.ts
│     │  │  ├─ app.routes.ts
│     │  │  ├─ core/
│     │  │  │  ├─ storage/          # GameStorage, preferences adapter, migrator
│     │  │  │  ├─ state/            # PlayerStore, GameSessionStore
│     │  │  │  └─ lifecycle/        # pause/resume, native events
│     │  │  ├─ features/
│     │  │  │  ├─ home/
│     │  │  │  ├─ character/        # attribute allocation
│     │  │  │  ├─ hunt/             # monster selection
│     │  │  │  ├─ battle/           # BattlePage, BattleController
│     │  │  │  ├─ result/
│     │  │  │  ├─ inventory/
│     │  │  │  └─ settings/
│     │  │  └─ shared/ui/          # game-card, stat-row, empty-state
│     │  ├─ game/
│     │  │  ├─ phaser/
│     │  │  │  ├─ scenes/           # BattleScene, BootScene
│     │  │  │  ├─ effects/          # damage popup, particle helpers
│     │  │  │  ├─ input/            # pointer gesture interpretation
│     │  │  │  └─ phaser-factory.ts
│     │  │  └─ assets/              # assets game, được đóng gói cùng app
│     │  ├─ theme/                  # Ionic variables + tokens
│     │  └─ global.scss
│     └─ capacitor.config.ts
├─ packages/
│  └─ game-core/
│     ├─ src/
│     │  ├─ match3/                 # board, move, resolve, RNG
│     │  ├─ battle/                 # battle reducer/state/events
│     │  ├─ progression/            # EXP, derived stats, allocation
│     │  ├─ monsters/               # static data + behaviors
│     │  ├─ inventory/              # item logic, equipment
│     │  ├─ economy/                # reward grant + idempotency
│     │  └─ config/                 # balance version
│     └─ tests/
├─ docs/
│  ├─ GAMEPLAY.md
│  ├─ ROADMAP.md
│  ├─ ARCHITECTURE.md
│  └─ GAME_DESIGN.md
├─ package.json                     # workspace scripts
└─ package-lock.json
```

**Giới hạn phân lớp:** M0 có thể chỉ cần `apps/mobile` + `packages/game-core`. `shared/` package tách riêng chỉ khi nhiều consumers thật sự cần. Không tạo file placeholder để đủ folder.

### 4.2. Quy tắc dependency

```text
features/ ---> app/core/state ---> packages/game-core
features/battle ---> BattleController ---> packages/game-core
BattleScene ---> render contracts, Phaser
app/core/storage ---> GameStorage interface + Capacitor plugin
packages/game-core -X-> @angular/*, @ionic/*, phaser, @capacitor/*
```

`game-core` không đọc thời gian máy, window, localStorage, network, không gọi Math.random trực tiếp: RNG là seed/state explicit.

## 5. Chuẩn Ionic 9 + Angular Standalone

### 5.1. Bootstrap bằng `provideIonicAngular()` và Router

**Ví dụ kiến trúc, chỉnh tên file theo project được generate:**

```ts
// apps/mobile/src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';

bootstrapApplication(AppComponent, {
  providers: [
    // IonicRouteStrategy giữ navigation behavior phù hợp mobile.
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes),
  ],
}).catch((error: unknown) => console.error('Bootstrap thất bại', error));
```

```ts
// apps/mobile/src/app/app.component.ts
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
  template: '<ion-app><ion-router-outlet /></ion-app>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {}
```

**Không làm:** `AppModule`, `IonicModule.forRoot`, import `@ionic/angular/standalone` theo tài liệu v8 cũ, hoặc import nội bộ `@ionic/angular/lazy` trong standalone page mới. Ionic 9 khuyên dùng direct imports từ `@ionic/angular`.

### 5.2. Lazy route từng tính năng

```ts
// apps/mobile/src/app/app.routes.ts
import type { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  {
    path: 'home',
    loadComponent: () => import('./features/home/home.page').then(m => m.HomePage),
  },
  {
    path: 'hunt',
    loadComponent: () => import('./features/hunt/hunt.page').then(m => m.HuntPage),
  },
  {
    path: 'battle/:monsterId',
    // Lazy-load BattlePage và tiếp tục dynamic import Phaser trong page.
    loadComponent: () => import('./features/battle/battle.page').then(m => m.BattlePage),
  },
  { path: '**', redirectTo: 'home' },
];
```

Mặc định lazy các trang gameplay nặng; home có thể preload khi đã đo được trải nghiệm.

### 5.3. Standalone Page với imports cục bộ

```ts
// Ví dụ tối giản (TypeScript, template và styles tách file khi code lớn).
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonRouterLink } from '@ionic/angular';
import { PlayerStore } from '../../core/state/player.store';

@Component({
  selector: 'pl-home',
  standalone: true,
  imports: [IonContent, IonButton, IonRouterLink, RouterLink],
  template: `
    <ion-content>
      <h1>Phố Linh</h1>
      <p>Cấp {{ level() }}</p>
      <ion-button routerLink="/hunt" routerDirection="forward">Săn quái</ion-button>
    </ion-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  private readonly store = inject(PlayerStore);
  // Dùng computed vì level phụ thuộc player state; không giữ bản copy đồng bộ thủ công.
  readonly level = computed(() => this.store.player()?.level ?? 1);
}
```

### 5.4. Ionic components có sẵn — tận dụng tối đa

| Tình huống | Ưu tiên Ionic | Khi cần tự tạo |
|---|---|---|
| Shell/navigation | `ion-app`, `ion-router-outlet`, `ion-header`, `ion-toolbar` | Không thay router bằng custom scene navigation |
| Danh sách săn quái | `ion-list`/`ion-item`, `ion-card`, `ion-badge` | Card quái artwork riêng trên nền Ionic |
| Cộng điểm | `ion-button`, `ion-modal`, `ion-alert` | Stepper stat + delta preview có thể tạo Angular component |
| Túi đồ | `ion-grid`, `ion-modal`, `ion-popover` | Ô item giàu artwork và trạng thái equip |
| Loading và feedback | `ion-loading`, `ion-toast`, `ion-skeleton-text` | Fullscreen battle VFX trong Phaser |
| Settings | `ion-toggle`, `ion-range`, `ion-select` | Không viết toggle custom chỉ để khác màu |

Sử dụng `routerLink` + `IonRouterLink`/`RouterLink` theo Ionic Angular docs. Không tự quản lý stack màn hình bằng array nếu Angular router làm được.

### 5.5. Angular conventions

- **Mỗi page/component `standalone: true`.** Không tạo `NgModule` mới.
- **`OnPush` mặc định.** Dùng `signal`, `computed`, `input()/output()` (khi phù hợp phiên bản Angular khóa), không gọi hàm nặng liên tục trong template.
- Dùng cú pháp control flow mới `@if`, `@for (...; track item.id)` nếu Angular được khóa hỗ trợ.
- Dùng `inject()` cho service; constructor chỉ dành cho nơi thực sự cần.
- `effect()` chỉ dành cho side effect không thể biểu diễn bằng `computed`, không dùng effect để mirror hai signals.
- Unsubscribe bằng `takeUntilDestroyed()` khi có Observable, nhưng **Ionic page cache** có thể chưa `ngOnDestroy`; dừng các hoạt động **theo thời gian hiển thị** trong `ionViewDidLeave()`.
- Không đặt trực tiếp phép tính damage/drop/board trong page hay Angular service UI.
- Không cập nhật Angular state từ mỗi Phaser tick. Chỉ gửi **event ranh giới**: HP changed, turn end, win/loss, progress updated.

## 6. Quy tắc state management

### 6.1. Signal Store nhỏ là đủ

M0–M2 ưu tiên một hoặc vài service `providedIn: 'root'` và Signals thay vì NgRx. State có ba loại:

- **Persistent domain state:** `PlayerProfile`, `Inventory`, `MonsterProgress`, settings, persisted qua GameStorage.
- **Ephemeral UI state:** tab đang mở, modal, provisional point allocation, trạng thái nút loading.
- **Active battle state:** lưu trong `BattleController`/`game-core`; Angular chỉ giữ summary cần render.

### 6.2. Ví dụ PlayerStore

```ts
import { Injectable, computed, signal } from '@angular/core';
import type { PlayerProfile } from '@pho-linh/game-core';

@Injectable({ providedIn: 'root' })
export class PlayerStore {
  private readonly _player = signal<PlayerProfile | null>(null);
  readonly player = this._player.asReadonly();
  readonly canAllocate = computed(() => (this._player()?.unspentPoints ?? 0) > 0);

  /** Chỉ cập nhật store sau khi game-core đã xác minh và GameStorage commit thành công. */
  setPersistedProfile(profile: PlayerProfile): void {
    this._player.set(profile);
  }
}
```

Giao diện cộng điểm: giữ `draftAllocation` riêng; preview derived stats dùng hàm core thuần; nhấn xác nhận → validate → lưu **snapshot mới** → store update. Không cộng trực tiếp mỗi nút `+` vào permanent state.

## 7. Tích hợp Phaser 4 trong Ionic

### 7.1. Lifecycle chuẩn

- Dynamic import Phaser khi mở trang Battle để tránh bundle trận làm chậm Home.
- Khởi tạo `Phaser.Game` **một lần** mỗi lần vào trận thật sự; không mỗi lần Angular render.
- Lưu `game` reference; `ionViewDidLeave` stop audio/scene và destroy/detach game theo chiến lược chọn.
- Vì Ionic có thể cache page, **`ngOnDestroy` không đủ** làm cleanup duy nhất.
- Nếu rời màn khi asset đang load, kiểm tra token/flag để ngăn Game mới tạo sau khi page đã ẩn.
- `NgZone.runOutsideAngular()` bao bọc tạo engine và event loop; khi emit trạng thái Angular, dùng `zone.run()` có chọn lọc.
- Khi app background: pause active scene/tweens, lưu checkpoint ở **ranh giới action**. Khi resume: khôi phục an toàn, không phát lại reward.

### 7.2. Skeleton BattlePage — ví dụ integration có giải thích

```ts
import {
  AfterViewInit, ChangeDetectionStrategy, Component,
  ElementRef, NgZone, OnDestroy, ViewChild, inject,
} from '@angular/core';
import { IonContent } from '@ionic/angular';
import type Phaser from 'phaser';

@Component({
  selector: 'pl-battle',
  standalone: true,
  imports: [IonContent],
  template: '<ion-content [scrollY]="false"><div #gameHost class="battle-host"></div></ion-content>',
  styles: [':host, ion-content { display:block; height:100%; }',
           '.battle-host { width:100%; height:100%; min-height:1px; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BattlePage implements AfterViewInit, OnDestroy {
  @ViewChild('gameHost', { static: true }) private host!: ElementRef<HTMLDivElement>;
  private readonly zone = inject(NgZone);
  private game?: Phaser.Game;
  private isViewReady = false;
  private isVisible = false;
  private startToken = 0;

  ngAfterViewInit(): void { this.isViewReady = true; }

  ionViewDidEnter(): void {
    this.isVisible = true;
    void this.startGame();
  }

  ionViewDidLeave(): void {
    this.isVisible = false;
    this.stopGame();
  }

  ngOnDestroy(): void { this.isVisible = false; this.stopGame(); }

  private async startGame(): Promise<void> {
    const token = ++this.startToken;
    if (!this.isViewReady || this.game) return;

    // Phaser được tải lazy; token ngăn khởi tạo sau khi user rời page giữa lúc import.
    const [{ default: PhaserRuntime }, { BattleScene }] = await Promise.all([
      import('phaser'),
      import('../../../game/phaser/scenes/battle.scene'),
    ]);
    if (!this.isVisible || token !== this.startToken || this.game) return;

    this.zone.runOutsideAngular(() => {
      this.game = new PhaserRuntime.Game({
        type: PhaserRuntime.AUTO,
        parent: this.host.nativeElement,
        width: 360,
        height: 620,
        transparent: true,
        scale: {
          mode: PhaserRuntime.Scale.FIT,
          autoCenter: PhaserRuntime.Scale.CENTER_BOTH,
        },
        scene: [BattleScene],
      });
    });
  }

  private stopGame(): void {
    ++this.startToken; // Vô hiệu hóa kết quả của import async đang chạy.
    // Scene/tween/audio phải được giải phóng; không giữ instance khi page bị cache.
    this.game?.destroy(true);
    this.game = undefined;
  }
}
```

**Đây là skeleton tham chiếu, chưa phải file đã build.** Khi triển khai thực tế, xử lý thêm lỗi import, pause/save trước destroy, ResizeObserver/safe area và khóa start đồng thời. Tùy renderer Phaser 4, xác nhận sự tồn tại của `default` export/`PhaserRuntime.Game` qua package type đang khóa; nếu khác, điều chỉnh import theo tài liệu đúng version. `BattleScene` phải có entry bootstrap state từ `BattleController` thay vì tự khởi tạo game reward.

### 7.3. Chiến lược resize và safe area

- Mặc định logical canvas portrait 360×620, **số tham khảo**, tự scale theo container.
- Container được đo **sau Ionic navigation**, kích thước không được bằng 0 trước khi new Phaser.Game.
- `Phaser.Scale.FIT` không làm méo tỷ lệ; nếu bị letterbox, dùng nền phù hợp.
- `ResizeObserver` theo dõi khung chứa, cập nhật vùng bố trí HUD và board; không resize theo từng frame.
- `ion-content` trên màn battle không cuộn; tránh vùng gesture trùng OS safe area/gesture navigation.
- Nếu màn hình quá thấp, ưu tiên giữ board đủ lớn rồi rút gọn art/banner, không thu nhỏ touch target xuống mức khó bấm.

### 7.4. Không dùng API Phaser 3 bị loại bỏ

Phaser 4 thay đổi renderer và FX pipeline. Không copy `Pipeline` custom, `setTintFill()` cũ, BitmapMask cũ hoặc API plugin đã bị loại bỏ; đối chiếu migration guide rồi mới viết VFX. Standard Sprite/Text/Tweens vẫn là lựa chọn ưu tiên cho M0/M1.

## 8. Thiết kế game-core thuần TypeScript

### 8.1. Contracts

```ts
export type GemType = 'attack' | 'heal' | 'shield' | 'energy' | 'poison';
export type Board = ReadonlyArray<ReadonlyArray<GemType>>;
export interface Coord { readonly row: number; readonly col: number }
export interface SwapAction {
  readonly kind: 'swap';
  readonly from: Coord;
  readonly to: Coord;
  readonly actionId: string;
}
export interface SkillAction {
  readonly kind: 'skill';
  readonly skillId: string;
  readonly actionId: string;
}
export type PlayerAction = SwapAction | SkillAction;

/** Event được tạo bởi engine; renderer chỉ đọc, không được tính lại business result. */
export interface GameEvent {
  readonly eventId: string;
  readonly battleId: string;
  readonly turn: number;
  readonly type: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface ResolveResult<State> {
  readonly nextState: State;
  readonly events: readonly GameEvent[];
  readonly accepted: boolean;
}
```

Loại/type của `GameEvent` nên tiến hóa thành discriminated union theo từng sự kiện (`GEMS_CLEARED`, `DAMAGE_APPLIED`, `BATTLE_WON`, …), thay vì giữ `string` trong implementation lâu dài. Đưa schema vào package `game-core`, chỉ export public contract.

### 8.2. Pure reducer, deterministic RNG

```ts
/**
 * Duy nhất nơi thực thi hành động combat.
 * Không đọc Date.now()/Math.random(): rngState nằm trong BattleState.
 * Cùng state + cùng action + cùng balance => cùng nextState và event log.
 */
export function resolveAction(
  state: Readonly<BattleState>,
  action: Readonly<PlayerAction>,
  balance: Readonly<BalanceConfig>,
): ResolveResult<BattleState> {
  // Implementation đi qua: validate → swap → match/cascade → combat → monster → final phase.
  // Code thực tế phải nằm trong các hàm thuần nhỏ và có unit tests riêng.
  throw new Error('Implementation được thực hiện ở M0/M1');
}
```

**Quan trọng:** snippet này **là hợp đồng/đặc tả**, không phải chức năng chạy được. Khi coder triển khai M0, phải thay `throw` bằng implementation và test; không được copy file placeholder rồi tuyên bố hoàn thành.

### 8.3. Quy tắc engine chi tiết

- Board `board[row][col]`, chiều cao/rộng từ config; M0=6×6, năm màu.
- Chỉ swap trực giao, swap không tạo match => rollback, không phản công, không tiêu lượt.
- Tìm match ngang/dọc, hợp tập ô đã xóa; giao điểm T/L không đếm hai lần.
- Xử lý cascade đầy đủ trước monster turn, tối đa 12 tầng; khi cap phải forced stabilize, log event.
- Hết legal moves → deterministic reshuffle, không mất lượt.
- Serialize `seed`, `rngState`, `balanceVersion`, `turn`, phase, active effects, board, action journal.
- Nếu replay dùng same seed và action log nhưng nội dung config thay đổi, **không** dùng config mới: gắn version hoặc snapshot balance.
- Không mutate arrays/objects từ Angular Store trong hàm reducer; clone hoặc structural-sharing rõ ràng.
- Không dùng `Math.random()` ngoài adapter tạo seed đầu trận; nguồn RNG trong core phải test được.

### 8.4. Các bất biến (invariants)

1. `0 <= currentHp <= maxHp`.
2. `0 <= shield <= round(maxHp * 0.5)`.
3. `0 <= energy <= 100`.
4. `0 <= playerSkipTurns <= 1`; lượt bị choáng được reducer tự động tiêu thụ.
5. `0 <= turn <= maxTurns`, end-state không nhận action mới.
6. Board sau resolve không có null và có nước đi hợp lệ.
7. `rewardClaimed` hoặc journal tương đương chỉ chuyển `false → true` đúng một lần.
8. `unspentPoints >= 0`, `attributes` không âm.

## 9. Battle orchestration và event rendering

### 9.1. BattleController chịu trách nhiệm gì

- Chứa `BattleState` làm nguồn sự thật đang hoạt động.
- Nhận `PlayerAction` từ Scene/Input adapter.
- Chặn double action khi phase đang resolve/animation lock.
- Gọi `game-core.resolveAction` và nhận `{nextState, events}`.
- Cung cấp event queue cho Phaser; event semantics độc lập duration animation.
- Khi đến end state, commit trận/phần thưởng một lần, điều hướng màn kết quả.
- Phát summary HP/turn/energy đến Angular ở ranh giới trạng thái cần thiết.

### 9.2. Event flow

```text
pointer down/up → SwapIntent
               → BattleController.dispatch
               → game-core: validate and resolve
               → new immutable BattleState + events
               → PhaserEventPlayer.play(events)
               → unlock input, update Angular HUD if applicable
               → checkpoint/save at safe boundary
```

Hiệu ứng rút gọn/reduced motion chỉ thay `PhaserEventPlayer`, **không thay kết quả**, RNG hay số lượt.

### 9.3. Rendering performance

- Scene là consumer event, không đọc rồi sửa `PlayerStore` trực tiếp.
- Khi nhiều event: chơi theo sequence, gom hiệu ứng đơn giản, có skip/cancel bảo đảm cleanup.
- Không gửi mỗi viên ngọc rơi thành Angular state update; chỉ các summary cần hiển thị ngoài canvas.
- Tách các promise animation không đồng thời tự tạo kết quả chiến đấu; `Controller` khóa input tại ranh giới.

## 10. Character, progression, inventory

### 10.1. Domain services thuần

```text
computeDerivedStats(attributes, equipment, config)
previewAttributeAllocation(player, draft, config)
commitAttributeAllocation(player, draft, config)
applyBattleReward(save, battleResult, config)
equipItem(save, itemId, slot)
getExpRequired(level, config)
```

**Không viết các công thức này trong `CharacterPage`, `InventoryPage` hoặc `BattleScene`.**

### 10.2. Điểm thuộc tính

STR/VIT/AGI/INT khởi điểm đều 5; mỗi lần lên cấp +3 điểm. UI dùng draft; validate budget trước commit. `GAMEPLAY.md` §10 chứa công thức HP/ATK/DEF/SKILL_POWER/AGI_BONUS/POWER; không tự tạo công thức thứ hai trong UI.

### 10.3. Economy/Reward pipeline

- Battle engine quyết định win/lose.
- Reward calculator tạo `RewardGrant` (EXP, vàng, drop theo seeded/config).
- `applyBattleReward` idempotent theo battleId/claimId; kết quả+grant+save commit thành một snapshot hợp lệ.
- Inventory full → pending reward; không bỏ item.
- `PlayerStore` chỉ nhận dữ liệu sau commit thành công; lỗi lưu phải hiện rõ và cho retry an toàn.

## 11. Offline persistence với Capacitor

### 11.1. Cổng `GameStorage`

```ts
export interface GameStorage {
  load(): Promise<LocalSaveV1 | null>;
  save(snapshot: LocalSaveV1): Promise<void>;
  clearForDevelopment(): Promise<void>;
}
```

`LocalSaveV1` theo `GAMEPLAY.md` §27. Backend M4 có thể thêm repository khác, không để Scene biết điều đó.

### 11.2. Capacitor Preferences — khi nào dùng

- Chấp nhận cho **snapshot JSON nhỏ** trong M0/M1/M2 nếu kích thước ổn; docs Preferences không xem nó là database.
- Với nhiều inventory, journal/replays lớn, đánh giá SQLite có migration và transaction rõ hơn.
- Web dev chạy adapter đơn giản, nhưng phải thử native persistence thật trên Android.
- Không ghi mỗi frame/mỗi viên rơi; chỉ ở ranh giới game transaction/checkpoint.

### 11.3. Adapter mẫu, có validation trước sử dụng

```ts
import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import type { GameStorage } from './game-storage';
import type { LocalSaveV1 } from './save.types';
import { parseAndMigrateSave } from './save-migration';

const KEY = 'pho-linh.save.v1';

@Injectable({ providedIn: 'root' })
export class PreferencesGameStorage implements GameStorage {
  async load(): Promise<LocalSaveV1 | null> {
    const { value } = await Preferences.get({ key: KEY });
    // Không tin JSON parse thành công là dữ liệu hợp lệ: phải validate + migrate schema.
    return value === null ? null : parseAndMigrateSave(value);
  }

  async save(snapshot: LocalSaveV1): Promise<void> {
    // Chỉ serialize snapshot đã được game-core kiểm tra; không tự sửa business state.
    await Preferences.set({ key: KEY, value: JSON.stringify(snapshot) });
  }

  async clearForDevelopment(): Promise<void> {
    await Preferences.remove({ key: KEY });
  }
}
```

**`parseAndMigrateSave` là dependency phải implement và test, không phải API có sẵn.** Bản production nên có backup snapshot/version, recovery UI và chiến lược ghi/khôi phục phù hợp; Preferences không bảo đảm transaction nhiều key hay chống sửa dữ liệu thiết bị.

### 11.4. Save safety và crash recovery

- Validate schema version, type, min/max, active battle state; unknown version phải xử lý có thông báo, không xóa silent.
- Save tại: sau phân bổ điểm/equip/nhận thưởng, sau combat checkpoint, khi app background.
- Có trạng thái grant `pending/claimed`, actionId/battleId để tránh đúp khi app kill giữa animation.
- Không dùng `claimedBattleIds` vô hạn; có bounded journal/checkpoint hoặc SQLite khi quy mô tăng.
- Trong offline mode người chơi có thể sửa save: **không hứa anti-cheat tuyệt đối**; M4 phải có chính sách online trust riêng.

## 12. Asset, performance và native lifecycle

### 12.1. Asset pipeline

`AI concept → approve art bible → alpha cleanup → consistent dimensions → optimized PNG/WebP → atlas → manifest → Phaser load`.

Quy tắc tên: `char_hero_default.webp`, `monster_mist_blob.webp`, `gem_attack.webp`, `bg_ngoden_battle.webp`; atlas/tên file không phụ thuộc display name có dấu. Không dùng ảnh concept nguyên khổ 4K cho mỗi icon 64px.

Asset manifest nên lưu:

```text
id | path | type | width/height | alpha | atlas | origin/tool/date | license review | status
```

Tất cả asset phải đóng gói trong app; offline không gọi URL remote. Kiểm tra sử dụng thương mại với artwork/âm thanh/font và độ tương đồng IP.

### 12.2. Performance budget *đề xuất*, không phải kết quả đo

| Hạng mục | Target thực nghiệm | Hướng kiểm tra |
|---|---|---|
| FPS battle | Cố gắng 60 FPS, giảm cấp hiệu ứng nếu không đạt | Profile máy Android tầm trung |
| Touch latency | Phản hồi chọn ngọc gần như ngay | Record màn và đo visual feedback |
| Particle | Giới hạn emitter và tổng particle | Stress combo nhiều tầng |
| Texture | Atlas + lazy load scene | Chrome DevTools / Android GPU profiling |
| GC | Tránh alloc array/object mỗi frame | Performance trace sau 10 trận |
| Memory | Không tăng dần qua 10–20 lần vào-ra battle | Android profiler |

### 12.3. Native lifecycle

- Theo dõi `App.addListener('appStateChange', ...)` và `pause/resume` khi phù hợp; remove listeners đúng lúc.
- `pause` gameplay khi app background, không để âm thanh tiếp tục nếu không muốn; tách **pause simulation** và **save checkpoint**.
- `resume` đọc chính xác trạng thái đã checkpoint, tránh clone Scene cũ.
- Android back trong trận: xác nhận "Bỏ trận?", chỉ bỏ sau khi người chơi quyết định; không tự thoát app.
- Trong `ionViewDidLeave`, pause/destroy game theo chính sách; không phụ thuộc hoàn toàn `ngOnDestroy` vì Ionic có thể cache routes.

## 13. Error handling, logging và accessibility

### 13.1. Nhóm lỗi

- **Recoverable:** load ảnh lỗi, save lỗi tạm thời, missing optional sound → toast/retry/fallback.
- **Unrecoverable battle state:** state corrupt/invalid version → quay về checkpoint an toàn, không cộng thưởng.
- **Developer invariant violation:** log stack và redacted state metadata, fail test; không nuốt lỗi lặng lẽ.

### 13.2. Logging

```text
[game-core] battleId, turn, actionId, seed/balanceVersion, errorCode
[storage] saveVersion, save size, migration step, errorCode
[performance] sceneName, load duration, observed fps/deviceTier
```

Không log toàn bộ save người dùng hoặc thông tin định danh nhạy cảm. Production tắt debug spam trong `update()`. Nếu thêm crash reporting online ở M4, cần xin phép/đáp ứng chính sách thích hợp.

### 13.3. Accessibility

- Ngọc có icon/silhouette riêng, không chỉ màu; buff/debuff có label ngắn.
- Click target trong UI ≥44 CSS px khi có thể; có reduced motion, âm thanh on/off.
- Angular component có semantic labels; game canvas có tutorial text và mô tả tình trạng ngoài canvas nếu cần hỗ trợ screen reader.
- Không chỉ dùng rung màn hoặc màu đỏ để báo đòn boss.

## 14. Quy tắc code style, comment và review

### 14.1. Quy định bắt buộc

| Quy tắc | Áp dụng |
|---|---|
| TypeScript strict | Bật `strict`, `noImplicitAny`, strict template check |
| Export rõ contract | Dùng interface/type cho state/action/result/events |
| Naming | File `kebab-case`, class `PascalCase`, field/function `camelCase`, const hard-coded `UPPER_SNAKE_CASE` |
| Immutable domain | Không mutate state đầu vào reducer, config/data object |
| Single responsibility | Page điều phối UI, Service lưu/chuyển state, reducer tính gameplay |
| No random in view | Không `Math.random` trong Scene/UI, không tự tính item drop |
| No magic numbers | Game balance trong config, motion/tokens trong game design |
| Small functions | Một hàm một ý nghĩa, ưu tiên hàm thuần dễ test |
| Error first | `try/catch` ở I/O; phân loại lỗi, hiển thị retry hợp lý |
| No premature abstraction | Không interface factory cho mọi component khi chưa có nhu cầu |
| Comment meaningful | Bắt buộc comment giải thích **lý do/tradeoff/invariant**, không mô tả code hiển nhiên |

### 14.2. Quy tắc comment cụ thể (bắt buộc)

**Comment bằng tiếng Việt rõ ràng; tên kỹ thuật có thể giữ tiếng Anh.** Cấu trúc:

1. **Tài liệu module:** nhiệm vụ, dữ liệu vào/ra, invariant quan trọng.
2. **JSDoc cho public API:** mục đích, tiền điều kiện, trường hợp lỗi, lý do tồn tại.
3. **Giải thích thuật toán khó:** vì sao sort/deduplicate, giới hạn cascade, dùng seeded RNG.
4. **Lifecycle/async:** vì sao token cancel, cleanup event listener, NgZone.
5. **Rủi ro dữ liệu:** vì sao reward idempotent, migrate save, không tin dữ liệu client.
6. **Đặt `TODO(Mn, issue-id)`** với phạm vi rõ, không để TODO vĩnh viễn.

**Comment tốt:**

```ts
/**
 * Gom ô match vào Set trước khi tính hiệu ứng.
 * Một viên ở giao điểm chữ T chỉ được tính một lần, nếu không combo sẽ tăng sai.
 */
const uniqueMatchedIndices = new Set(matchedIndices);
```

**Comment không tốt:**

```ts
// Tăng level lên một
level++;
```

**Không phải cứ nhiều comment là tốt**: xóa comment lỗi thời khi refactor, dùng tên hàm/biến rõ ràng để tự mô tả logic đơn giản. Tránh code comment giả định "đã test".

### 14.3. Quy tắc đặt file component

```text
features/character/
  character.page.ts
  character.page.html
  character.page.scss
  attribute-allocator.component.ts
  attribute-allocator.component.html
  attribute-allocator.component.spec.ts
```

Component nhỏ có thể dùng inline template; màn lớn nên tách HTML/SCSS. Import Ionic components trực tiếp trong `@Component.imports`; không tạo shared NgModule chứa cả thư viện Ionic.

### 14.4. AI-assisted coding rule

Mỗi khi AI sinh code phải ghi rõ:

- File path **đúng** và imports đúng package đã chọn.
- Không tự đưa API Phaser 3 vào Phaser 4.
- Không thêm package ngoài kế hoạch nếu không nêu lý do.
- Có comment **vì sao**, không chỉ comment cho đẹp.
- Có test cho phần gameplay core thay đổi.
- Có lệnh xác minh, phân biệt **đã chạy** và **chưa chạy**.
- Không tự ghi "DONE" trong roadmap nếu chưa có bằng chứng.

## 15. Testing strategy và CI

### 15.1. Test pyramid

1. **Unit (đa số):** `game-core` board, RNG, cascade, combat, stats, XP, equip, drop, reward idempotent.
2. **Integration:** `BattleController` ↔ engine; `GameStorage` migration/save; Page ↔ store.
3. **UI/Manual smoke:** touch swap, ion navigation, modal, back, Android pause/resume, FPS/memory.
4. **Playtest:** người mới có hiểu luật, thấy điểm cộng thay đổi gameplay, muốn chơi lại không.

### 15.2. Test cases cốt lõi

- Same seed + same actions + same balance → same battle result/event log.
- Board mới không match sẵn, có nước đi; dead board reshuffle.
- Swap không hợp lệ không trừ lượt/không gây monster attack.
- Cross match được tính ô duy nhất; cap 12 cascade không vô hạn.
- Poison kết liễu quái trước khi quái tấn công; skill chỉ dùng khi đủ 100 energy.
- EXP vượt ngưỡng nhiều cấp cấp đúng +3 điểm mỗi cấp; không âm unspent points.
- Equip đổi derived stats; item bag full thành pending reward; không nhận hai lần battleId.
- Save corrupt, unknown version, app kill/resume có recovery rõ.
- Điều hướng vào/ra Battle 20 lần không sinh nhiều canvas/listener.

### 15.3. CI/quality gate

Tối thiểu CI: install locked deps → typecheck → lint → unit tests → production build. Khi có môi trường Android, thêm native build/smoke riêng. Không chạy e2e hàng chục phút cho mỗi chỉnh sửa CSS nhỏ khi solo; nhưng phải có ít nhất smoke test trước bản beta.

## 16. Con đường mở rộng JohnCMS + realtime

### M4 — online repository

```text
Offline (M0–M3): PlayerStore → GameRepository → GameStorage (device)
Online  (M4+):   PlayerStore → GameRepository → JohnCMS REST API → MySQL
```

Không nhất thiết tạo repository abstraction giả lúc M0; chỉ cần phân lớp đủ sạch để thay adapter khi thực sự tới M4. Server sẽ giữ nguồn sự thật cho XP/gold/inventory online.

### M5 — PvP server-authoritative

```text
Phaser input → intent(actionId, swap, seq)
             → Socket.IO gateway (Node.js)
             → authoritative shared game-core on server
             → broadcast verified events/state → Phaser renderer
```

Không tin save offline ở PvP xếp hạng. Matchmaking và room management chưa là một phần implementation M0–M3. Khi thực hiện M4/M5, đánh giá cụ thể khả năng chia sẻ TypeScript `game-core` với server Node.js và tích hợp token xác thực qua JohnCMS/PHP.

## 17. Definition of Done và anti-patterns

### 17.1. Definition of Done của một PR/tính năng

- [ ] Business rule khớp `GAMEPLAY.md`, thông số nằm trong config.
- [ ] Page/Component chuẩn Standalone, `OnPush`, imports cụ thể từ `@ionic/angular`.
- [ ] Input mobile, states loading/error/empty/disabled hoạt động.
- [ ] Game core có unit tests, RNG deterministic.
- [ ] Comment cho public API/thuật toán/lifecycle/quyết định khác thường.
- [ ] Không leak Phaser/DOM listeners, không gọi Angular mỗi frame.
- [ ] Save/reward đúng và chống double apply.
- [ ] Có bằng chứng typecheck/build/manual test tương ứng.

### 17.2. Các anti-pattern cần tránh

```text
❌ this.hp -= damage trong Phaser.Scene rồi update PlayerStore.
❌ this.gold += 100 trong ResultPage.
❌ Math.random() khắp UI/scene để tạo ngọc/drop.
❌ ngOnInit() new Phaser.Game(...) mà không xử lý Ionic route caching.
❌ Import cả IonicModule cho từng page mới.
❌ Dùng @ionic/angular/standalone theo ví dụ Ionic phiên bản cũ trong Ionic 9.
❌ Save state mỗi frame.
❌ Dùng setTimeout cố định để đồng bộ kết quả combat.
❌ Làm Socket.IO ngay khi bàn Match-3 chưa ổn định.
❌ Claim 60 FPS khi chưa đo được trên thiết bị thật.
```

## 18. Nguồn kỹ thuật và ADR

### 18.1. Tài liệu chính thức tham khảo tại thời điểm viết

- Ionic 9 Breaking Changes: https://github.com/ionic-team/ionic-framework/blob/main/BREAKING.md
- Ionic Angular Build Options / Standalone: https://ionicframework.com/docs/angular/build-options
- Ionic Angular Navigation: https://ionicframework.com/docs/angular/navigation
- Angular Signals: https://angular.dev/guide/signals
- Angular Routing: https://angular.dev/guide/routing/define-routes
- Phaser 4 migration: https://phaser.io/news/2026/04/migrating-from-phaser-3-to-phaser-4-what-you-need-to-know
- Phaser Scale Manager: https://docs.phaser.io/phaser/concepts/scale-manager
- Capacitor 8 setup: https://capacitorjs.com/docs/getting-started/environment-setup
- Capacitor 8 updates: https://capacitorjs.com/docs/updating/8-0
- Capacitor Preferences: https://capacitorjs.com/docs/apis/preferences
- Capacitor App events: https://capacitorjs.com/docs/apis/app

### 18.2. ADR (Architecture Decision Record)

| ID | Quyết định | Lý do | Khi nào xem lại |
|---|---|---|---|
| ADR-001 | Ionic Angular Standalone, không StencilJS | Giảm stack, tận dụng Ionic 9 | Nếu có component quá phức tạp sau M3 |
| ADR-002 | Phaser 4 render battle | VFX/tweens/input thích hợp 2D | Nếu benchmark máy yếu không đạt |
| ADR-003 | Pure TypeScript game-core | Test, replay, sẵn sàng dùng server | Không thay nếu thiếu chứng cứ |
| ADR-004 | Capacitor Preferences cho save nhỏ | MVP nhẹ và nhanh | Dữ liệu/replay tăng, cần SQLite |
| ADR-005 | Signals + OnPush, không NgRx | Ít boilerplate cho solo dev | Store state quá phức tạp |
| ADR-006 | Không mạng M0–M3 | Chứng minh gameplay trước | Sau khi qua gate M2/M3 |

---

**Luật kiến trúc tối thượng:** `GameCore quyết định kết quả → Phaser thể hiện trận đấu → Angular thể hiện sản phẩm → Capacitor bảo toàn tiến trình`. Tuyệt đối không đảo chiều trách nhiệm chỉ để code nhanh một màn.
