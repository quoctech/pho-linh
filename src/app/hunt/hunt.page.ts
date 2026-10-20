import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonSpinner } from '@ionic/angular';
import type Phaser from 'phaser';
import { ALL_MONSTERS_TEMPORARILY_UNLOCKED, MONSTER_DEFINITIONS, type LocalSaveV1, type MonsterDefinition } from '../../game-core';
import { GameStorage } from '../state/game-storage.service';
import { TargetMapScene } from './target-map/target-map-scene';
import type { TargetMapSceneConfig } from './target-map/target-map-assets';

const TARGET_MAP_WIDTH = 941;
const TARGET_MAP_HEIGHT = 1672;

@Component({
  selector: 'app-hunt',
  templateUrl: './hunt.page.html',
  styleUrls: ['./hunt.page.scss'],
  imports: [IonContent, IonSpinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HuntPage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('gameHost', { static: true }) private readonly gameHost!: ElementRef<HTMLDivElement>;

  private readonly storage = inject(GameStorage);
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  private game?: Phaser.Game;
  private viewReady = false;
  private visible = false;
  private startToken = 0;

  readonly monsters: readonly MonsterDefinition[] = Object.values(MONSTER_DEFINITIONS);
  save?: LocalSaveV1;
  isLoading = true;
  loadError = false;

  async ngOnInit(): Promise<void> {
    try {
      this.save = await this.storage.load();
    } catch {
      this.loadError = true;
    } finally {
      if (this.loadError) this.isLoading = false;
      this.cdr.markForCheck();
      void this.startGameIfReady();
    }
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    void this.startGameIfReady();
  }

  ionViewDidEnter(): void {
    this.visible = true;
    void this.startGameIfReady();
  }

  ionViewDidLeave(): void {
    this.visible = false;
    this.stopGame();
  }

  ngOnDestroy(): void {
    this.visible = false;
    this.stopGame();
  }

  isUnlocked(monster: MonsterDefinition): boolean {
    return ALL_MONSTERS_TEMPORARILY_UNLOCKED || (this.save?.monsterProgress[monster.id]?.unlocked ?? monster.id === 'mist_blob');
  }

  async hunt(monsterId: string): Promise<void> {
    const monster = MONSTER_DEFINITIONS[monsterId];
    if (!monster || !this.isUnlocked(monster)) return;
    await this.router.navigate(['/battle', monster.id]);
  }

  async goHome(): Promise<void> {
    await this.router.navigate(['/home']);
  }

  private async startGameIfReady(): Promise<void> {
    if (!this.viewReady || !this.visible || this.game || !this.save || this.loadError) return;
    const token = ++this.startToken;

    try {
      const [{ default: PhaserRuntime }] = await Promise.all([import('phaser')]);
      if (!this.visible || token !== this.startToken || this.game) return;

      const unlockedMonsterIds = new Set(this.monsters.filter((monster) => this.isUnlocked(monster)).map((monster) => monster.id));
      const mapConfig: TargetMapSceneConfig = {
        monsters: this.monsters,
        unlockedMonsterIds,
        onMonsterSelected: (monsterId) => this.zone.run(() => void this.hunt(monsterId)),
        onReady: () => this.zone.run(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        }),
      };

      this.zone.runOutsideAngular(() => {
        this.game = new PhaserRuntime.Game({
          type: PhaserRuntime.AUTO,
          parent: this.gameHost.nativeElement,
          width: TARGET_MAP_WIDTH,
          height: TARGET_MAP_HEIGHT,
          backgroundColor: '#171426',
          antialias: false,
          antialiasGL: false,
          pixelArt: true,
          roundPixels: true,
          render: {
            antialias: false,
            antialiasGL: false,
            pixelArt: true,
            roundPixels: true,
            powerPreference: 'high-performance',
            preserveDrawingBuffer: false,
          },
          scale: {
            // Cover the viewport so the map reaches the full screen height;
            // the wider sides may crop slightly on portrait screens.
            mode: PhaserRuntime.Scale.ENVELOP,
            autoCenter: PhaserRuntime.Scale.CENTER_BOTH,
          },
          callbacks: {
            preBoot: (game) => game.registry.set('targetMapConfig', mapConfig),
          },
          scene: [TargetMapScene],
        });
      });
    } catch {
      this.loadError = true;
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  private stopGame(): void {
    this.startToken += 1;
    this.game?.destroy(true);
    this.game = undefined;
  }
}
