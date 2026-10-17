import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonSpinner } from '@ionic/angular';
import type Phaser from 'phaser';
import { applyBattleReward, createBattleState, createPlayerBattleState, equipmentBonuses, type BattleState, type LocalSaveV1 } from '../../game-core';
import { BattleController } from './battle.controller';
import { GameStorage } from '../state/game-storage.service';

@Component({
  selector: 'app-battle',
  templateUrl: './battle.page.html',
  styleUrls: ['./battle.page.scss'],
  imports: [IonContent, IonSpinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BattlePage implements AfterViewInit, OnDestroy {
  @ViewChild('gameHost', { static: true }) private readonly gameHost!: ElementRef<HTMLDivElement>;

  private readonly zone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly gameStorage = inject(GameStorage);
  private game?: Phaser.Game;
  private controller?: BattleController;
  private unsubscribe?: () => void;
  private startToken = 0;
  private viewReady = false;
  private visible = false;
  private resultNavigated = false;
  private saveQueue: Promise<void> = Promise.resolve();
  private saveSnapshot?: LocalSaveV1;
  private rewardApplied = false;
  isLoading = true;

  ngAfterViewInit(): void {
    this.viewReady = true;
  }

  ionViewDidEnter(): void {
    this.visible = true;
    this.isLoading = true;
    this.cdr.markForCheck();
    void this.enterBattle();
  }

  ionViewDidLeave(): void {
    this.visible = false;
    this.isLoading = false;
    void this.leaveBattle();
  }

  ngOnDestroy(): void {
    this.visible = false;
    this.unsubscribe?.();
    this.stopGame();
  }

  private async enterBattle(): Promise<void> {
    try {
      await this.prepareBattle();
      if (this.visible) {
        await this.startGame();
      }
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  private async prepareBattle(): Promise<void> {
    if (this.controller) {
      return;
    }

    this.resultNavigated = false;
    const monsterId = this.route.snapshot.paramMap.get('monsterId') ?? 'mist_blob';
    const save = await this.gameStorage.load();
    if (!(save.monsterProgress[monsterId]?.unlocked ?? monsterId === 'mist_blob')) {
      await this.router.navigate(['/hunt']);
      return;
    }
    this.saveSnapshot = save;
    let restored = save.activeBattle;
    if (restored && (restored.monster.id !== monsterId || this.isTerminal(restored.phase))) restored = undefined;
    const initial = restored ?? createBattleState(
      Date.now() >>> 0,
      monsterId,
      `m2-${Date.now().toString(36)}`,
      undefined,
      createPlayerBattleState(save.profile.attributes, equipmentBonuses(save.inventory, save.equipment)),
    );
    this.controller = new BattleController(initial);
    this.unsubscribe = this.controller.subscribe((state) => this.onBattleStateChanged(state));
    void this.queueSave(this.controller.currentState);
  }

  private async startGame(): Promise<void> {
    const token = ++this.startToken;
    if (!this.viewReady || this.game || !this.controller) {
      return;
    }

    try {
      const [{ default: PhaserRuntime }, { BattleScene }] = await Promise.all([
        import('phaser'),
        import('./battle.scene'),
      ]);

      if (!this.visible || token !== this.startToken || this.game) {
        return;
      }

      this.zone.runOutsideAngular(() => {
        this.game = new PhaserRuntime.Game({
          type: PhaserRuntime.AUTO,
          parent: this.gameHost.nativeElement,
          width: 360,
          height: 620,
          backgroundColor: '#171426',
          scale: {
            mode: PhaserRuntime.Scale.FIT,
            autoCenter: PhaserRuntime.Scale.CENTER_BOTH,
          },
          callbacks: {
            preBoot: (game) => game.registry.set('battleController', this.controller),
          },
          scene: [BattleScene],
        });
      });
    } catch (error: unknown) {
      console.error('Không thể khởi tạo màn Match-3', error);
    }
  }

  private stopGame(): void {
    ++this.startToken;
    this.game?.destroy(true);
    this.game = undefined;
  }

  private async leaveBattle(): Promise<void> {
    const controller = this.controller;
    if (controller) {
      await controller.waitUntilIdle();
      if (!controller.isTerminal) {
        await this.queueSave(controller.currentState);
      }
    }
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.stopGame();
    this.controller = undefined;
  }

  private isTerminal(phase: string): boolean {
    return phase === 'VICTORY' || phase === 'DEFEAT' || phase === 'ABANDON';
  }

  private onBattleStateChanged(state: BattleState): void {
    if (this.saveSnapshot && this.isTerminal(state.phase) && !this.rewardApplied) {
      const applied = applyBattleReward(this.saveSnapshot, state);
      this.saveSnapshot = { ...applied.save, activeBattle: state };
      this.rewardApplied = true;
    } else if (this.saveSnapshot) {
      this.saveSnapshot = { ...this.saveSnapshot, activeBattle: state };
    }
    const save = this.queueSave(state);
    if (this.isTerminal(state.phase) && !this.resultNavigated) {
      this.resultNavigated = true;
      void save.then(() => {
        this.zone.run(() => void this.router.navigate(['/result', state.battleId]));
      });
    }
  }

  private queueSave(state: BattleState): Promise<void> {
    this.saveQueue = this.saveQueue
      .catch(() => undefined)
      .then(async () => {
        if (this.saveSnapshot) await this.gameStorage.save(this.saveSnapshot);
      });
    return this.saveQueue;
  }
}
