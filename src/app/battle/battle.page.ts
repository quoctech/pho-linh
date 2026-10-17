import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import type Phaser from 'phaser';

@Component({
  selector: 'app-battle',
  templateUrl: './battle.page.html',
  styleUrls: ['./battle.page.scss'],
  imports: [IonContent, IonHeader, IonTitle, IonToolbar],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BattlePage implements AfterViewInit, OnDestroy {
  @ViewChild('gameHost', { static: true }) private readonly gameHost!: ElementRef<HTMLDivElement>;

  private readonly zone = inject(NgZone);
  private game?: Phaser.Game;
  private startToken = 0;
  private viewReady = false;
  private visible = false;

  ngAfterViewInit(): void {
    this.viewReady = true;
  }

  ionViewDidEnter(): void {
    this.visible = true;
    void this.startGame();
  }

  ionViewDidLeave(): void {
    this.visible = false;
    this.stopGame();
  }

  ngOnDestroy(): void {
    this.visible = false;
    this.stopGame();
  }

  private async startGame(): Promise<void> {
    const token = ++this.startToken;
    if (!this.viewReady || this.game) {
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
}
