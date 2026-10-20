import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, NgZone, OnDestroy, ViewChild, inject } from '@angular/core';
import { IonButton, IonContent, IonItem, IonLabel, IonSelect, IonSelectOption } from '@ionic/angular';
import { RouterLink } from '@angular/router';
import type Phaser from 'phaser';
import type { ElementId } from '../../game-core';
import { ELEMENT_SKILL_CONFIG } from '../battle/element-skill-assets';
import type { SkillTestAction, SkillTestConfig } from './skill-test.scene';
import type { TestMonsterId } from '../battle/monster-basic-attack-assets';

@Component({ selector: 'app-skill-test', templateUrl: './skill-test.page.html', styleUrls: ['./skill-test.page.scss'], imports: [IonButton, IonContent, IonItem, IonLabel, IonSelect, IonSelectOption, RouterLink], changeDetection: ChangeDetectionStrategy.OnPush })
export class SkillTestPage implements AfterViewInit, OnDestroy {
  @ViewChild('gameHost', { static: true }) private readonly gameHost!: ElementRef<HTMLDivElement>;
  readonly elements: readonly { id: ElementId; label: string }[] = [{ id: 'metal', label: 'Kim' }, { id: 'wood', label: 'Mộc' }, { id: 'water', label: 'Thủy' }, { id: 'fire', label: 'Hỏa' }, { id: 'earth', label: 'Thổ' }];
  readonly monsters: readonly { id: TestMonsterId; label: string }[] = [{ id: 'mist_blob', label: 'Sương Hồn' }, { id: 'lantern_cat', label: 'Miêu Đèn' }, { id: 'cloud_fox_boss', label: 'Cáo Mây' }, { id: 'bamboo_mantis', label: 'Bọ Lá Tre' }];
  gender: 'male' | 'female' = 'male'; element: ElementId = 'metal'; monsterId: TestMonsterId = 'mist_blob'; game?: Phaser.Game;
  private readonly zone = inject(NgZone); private viewReady = false;
  get skills() { return ELEMENT_SKILL_CONFIG[this.element]; }
  ngAfterViewInit(): void { this.viewReady = true; void this.startGame(); }
  ngOnDestroy(): void { this.game?.destroy(true); this.game = undefined; }
  selectGender(value: 'male' | 'female'): void { this.gender = value; this.restart(); }
  selectElement(value: ElementId): void { this.element = value; this.restart(); }
  selectMonster(value: TestMonsterId): void { this.monsterId = value; this.restart(); }
  action(action: SkillTestAction): void { this.scene()?.events.emit('skill-test-action', action); }
  reset(): void { this.scene()?.events.emit('skill-test-reset'); this.scene()?.scene.restart(); }
  private scene(): Phaser.Scene | undefined { return this.game?.scene.getScene('SkillTestScene') as Phaser.Scene | undefined; }
  private restart(): void { if (!this.viewReady || !this.game) return; this.game.registry.set('skillTestConfig', { gender: this.gender, element: this.element, monsterId: this.monsterId } satisfies SkillTestConfig); this.scene()?.scene.restart(); }
  private async startGame(): Promise<void> {
    const [{ default: PhaserRuntime }, { SkillTestScene }] = await Promise.all([import('phaser'), import('./skill-test.scene')]);
    this.zone.runOutsideAngular(() => {
      this.game = new PhaserRuntime.Game({ type: PhaserRuntime.AUTO, parent: this.gameHost.nativeElement, width: 360, height: 640, backgroundColor: '#171426', antialias: false, pixelArt: true, scale: { mode: PhaserRuntime.Scale.FIT, autoCenter: PhaserRuntime.Scale.CENTER_BOTH }, callbacks: { preBoot: (game) => game.registry.set('skillTestConfig', { gender: this.gender, element: this.element, monsterId: this.monsterId }) }, scene: [SkillTestScene] });
    });
  }
}
