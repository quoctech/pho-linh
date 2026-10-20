import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import type Phaser from 'phaser';
import { actorRows, type ActorFrameId } from '../battle/actor-frame-assets';
import { MetalSkinPreviewScene } from './metal-skin-preview.scene';

@Component({
  selector: 'app-skin-preview',
  templateUrl: './skin-preview.page.html',
  styleUrls: ['./skin-preview.page.scss'],
  imports: [IonButton, IonContent, IonHeader, IonTitle, IonToolbar, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkinPreviewPage implements AfterViewInit, OnDestroy {
  @ViewChild('gameHost', { static: true }) private readonly gameHost!: ElementRef<HTMLDivElement>;
  readonly actors: readonly { id: ActorFrameId; label: string }[] = [
    { id: 'metal', label: 'Kim' }, { id: 'wood', label: 'Mộc' }, { id: 'water', label: 'Thủy' },
    { id: 'fire', label: 'Hỏa' }, { id: 'earth', label: 'Thổ' },
    { id: 'mist_blob', label: 'Bụi Sương' }, { id: 'lantern_cat', label: 'Miêu Đèn' },
    { id: 'cloud_fox_boss', label: 'Cáo Mây' }, { id: 'bamboo_mantis', label: 'Bọ Lá Tre' },
  ];
  selectedActor: ActorFrameId = 'metal';
  get actions() { return actorRows(this.selectedActor); }
  actionLabel(label: string): string { return label.replace(/^Hiệu ứng\s*/i, '').split('/')[0].trim(); }
  selected = 'idle';
  private game?: Phaser.Game;

  async ngAfterViewInit(): Promise<void> {
    const { default: PhaserRuntime } = await import('phaser');
    if (!this.gameHost?.nativeElement) return;
    this.game = new PhaserRuntime.Game({
      type: PhaserRuntime.AUTO,
      parent: this.gameHost.nativeElement,
      width: 720,
      height: 680,
      transparent: true,
      // Keep the separated actor frames crisp when the preview scales them
      // down from their source canvas.
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
      },
      scale: { mode: PhaserRuntime.Scale.FIT, autoCenter: PhaserRuntime.Scale.CENTER_BOTH },
      scene: [MetalSkinPreviewScene],
    });
  }

  select(id: string): void {
    this.selected = id;
    this.game?.events.emit('skin-preview:play', id);
  }

  selectActor(actor: ActorFrameId): void {
    this.selectedActor = actor;
    this.selected = 'idle';
    this.game?.scene.start('MetalSkinPreviewScene', { actor });
  }

  ngOnDestroy(): void {
    this.game?.destroy(true);
    this.game = undefined;
  }
}
