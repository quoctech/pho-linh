import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton, IonContent } from '@ionic/angular';
import { CHARACTER_DATA, COMBAT_DATA, type ElementId, type ElementProfileData, type LocalSaveV1 } from '../../game-core';
import { GameStorage } from '../state/game-storage.service';

interface ElementOption {
  readonly id: ElementId;
  readonly name: string;
  readonly hanzi: string;
  readonly color: string;
  readonly available: boolean;
}

interface StatBar {
  readonly label: string;
  readonly value: string;
  /** Độ dài thanh so với hệ cao nhất của chỉ số đó (0–100). */
  readonly percent: number;
}

const ELEMENT_COLORS: Readonly<Record<ElementId, string>> = {
  metal: '#d8e2f3', wood: '#7ecb8b', water: '#72b9ec', fire: '#f08a67', earth: '#c8a16b',
};

const formatNumber = (value: number) => Math.round(value).toLocaleString('vi-VN');

@Component({
  selector: 'app-element-selection',
  templateUrl: './element-selection.page.html',
  styleUrls: ['./element-selection.page.scss'],
  imports: [IonButton, IonContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ElementSelectionPage implements OnInit {
  private readonly storage = inject(GameStorage);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  save?: LocalSaveV1;
  isSaving = false;
  /** Hệ đang xem trước; chỉ lưu vào save khi bấm xác nhận. */
  previewId: ElementId = 'metal';

  readonly elements: readonly ElementOption[] = (['metal', 'wood', 'water', 'fire', 'earth'] as const).map((id) => ({
    id,
    name: CHARACTER_DATA.elementProfiles[id].elementLabel,
    hanzi: CHARACTER_DATA.elementProfiles[id].hanzi,
    color: ELEMENT_COLORS[id],
    available: true,
  }));

  async ngOnInit(): Promise<void> {
    this.save = await this.storage.load();
    this.previewId = this.save.settings.element;
    this.cdr.markForCheck();
  }

  get preview(): ElementOption { return this.elements.find((element) => element.id === this.previewId) ?? this.elements[0]; }
  get profile(): ElementProfileData { return CHARACTER_DATA.elementProfiles[this.previewId]; }

  get portraitSrc(): string {
    return this.save?.settings.gender === 'female'
      ? `assets/hero-female-elements/${this.previewId}/frames_webp/01_idle/01_idle_01.webp`
      : `assets/hero-${this.previewId}/frames_webp/01_idle/01_idle_01.webp`;
  }

  /** Chỉ số Lv1 theo hệ (elementBaseStats), thanh so với hệ cao nhất để dễ so sánh lối chơi. */
  get statBars(): readonly StatBar[] {
    const all = Object.values(CHARACTER_DATA.elementBaseStats);
    const base = CHARACTER_DATA.elementBaseStats[this.previewId];
    const bar = (label: string, key: 'maxHp' | 'atk' | 'defense' | 'agi', suffix = '') => ({
      label,
      value: `${formatNumber(base[key])}${suffix}`,
      percent: Math.round((base[key] / Math.max(...all.map((stats) => stats[key]))) * 100),
    });
    const dodge = (base.agi / (base.agi + CHARACTER_DATA.combat.dodge.agiOffset)) * 100;
    return [
      bar('HP', 'maxHp'),
      bar('Tấn công', 'atk'),
      bar('Phòng thủ', 'defense'),
      bar('Linh hoạt', 'agi', ` · né ${dodge.toFixed(1).replace('.', ',')}%`),
    ];
  }

  /** Vòng tương khắc trong combat.json: mỗi hệ khắc hệ kế tiếp. */
  get counters(): { readonly strong: ElementOption; readonly weak: ElementOption } {
    const cycle = COMBAT_DATA.elements.cycle;
    const index = cycle.indexOf(this.previewId);
    const byId = (id: ElementId) => this.elements.find((element) => element.id === id) ?? this.elements[0];
    return {
      strong: byId(cycle[(index + 1) % cycle.length]),
      weak: byId(cycle[(index - 1 + cycle.length) % cycle.length]),
    };
  }

  get skills(): readonly { readonly label: string; readonly cost: number }[] {
    const data = CHARACTER_DATA.elementSkills[this.previewId];
    return [
      { label: data.primarySkillLabel, cost: data.primarySkill.energyCost },
      { label: data.secondarySkillLabel, cost: data.secondarySkill.energyCost },
    ].sort((a, b) => a.cost - b.cost);
  }

  isSelected(element: ElementOption): boolean { return this.save?.settings.element === element.id; }

  select(element: ElementOption): void {
    this.previewId = element.id;
    this.cdr.markForCheck();
  }

  async choose(element: ElementOption = this.preview): Promise<void> {
    if (!element.available || this.isSaving || !this.save) return;
    this.isSaving = true;
    this.save = await this.storage.update((save) => ({
      ...save,
      settings: { ...save.settings, element: element.id },
    }));
    await this.router.navigate(['/home']);
  }

  async goBack(): Promise<void> { await this.router.navigate(['/home']); }
}
