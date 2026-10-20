import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent } from '@ionic/angular';
import {
  CHARACTER_DATA,
  computeProfileStats,
  describePlayerSkillEffects,
  ELEMENT_IDS,
  type DerivedStats,
  type ElementId,
  type ElementProfileData,
  type LocalSaveV1,
} from '../../game-core';
import { skillIconPath } from '../battle/skill-icon-paths';
import { passiveIconPath } from '../character/passive-icon-assets';
import { GameStorage } from '../state/game-storage.service';

export interface CharacterSkillCard {
  readonly id: string;
  readonly label: string;
  readonly slotLabel: string;
  readonly iconSrc?: string;
  readonly energyCost: number;
  readonly effects: readonly string[];
  /** Sát thương ước tính theo ATK hiện tại, trước DEF của quái. */
  readonly damagePreview?: number;
}

export interface CharacterStatRow {
  readonly label: string;
  readonly value: string;
  readonly hint?: string;
}

const ELEMENT_COLORS: Readonly<Record<ElementId, string>> = {
  metal: '#d8e2f3', wood: '#7ecb8b', water: '#72b9ec', fire: '#f08a67', earth: '#c8a16b',
};

const formatNumber = (value: number) => Math.round(value).toLocaleString('vi-VN');

@Component({
  selector: 'app-character-info',
  templateUrl: './character-info.page.html',
  styleUrls: ['./character-info.page.scss'],
  imports: [IonButton, IonContent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CharacterInfoPage {
  private readonly storage = inject(GameStorage);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly elements = ELEMENT_IDS;
  save?: LocalSaveV1;
  selected: ElementId = 'metal';

  // Ionic cache page: tải lại save mỗi lần vào để hệ/điểm/trang bị luôn mới nhất.
  async ionViewWillEnter(): Promise<void> {
    this.save = await this.storage.load();
    this.selected = this.save.settings.element;
    this.cdr.markForCheck();
  }

  select(element: ElementId): void {
    this.selected = element;
    this.cdr.markForCheck();
  }

  isCurrent(element: ElementId): boolean { return this.save?.settings.element === element; }
  color(element: ElementId): string { return ELEMENT_COLORS[element]; }
  label(element: ElementId): string { return CHARACTER_DATA.elementProfiles[element].elementLabel; }
  hanzi(element: ElementId): string { return CHARACTER_DATA.elementProfiles[element].hanzi; }
  get profile(): ElementProfileData { return CHARACTER_DATA.elementProfiles[this.selected]; }

  get portraitSrc(): string {
    return this.save?.settings.gender === 'female'
      ? `assets/hero-female-elements/${this.selected}/frames_webp/01_idle/01_idle_01.webp`
      : `assets/hero-${this.selected}/frames_webp/01_idle/01_idle_01.webp`;
  }

  get passiveIconSrc(): string { return passiveIconPath(this.selected); }

  /** Chỉ số trận theo hệ đang xem, gồm điểm thuộc tính và trang bị hiện có. */
  get stats(): DerivedStats | undefined {
    if (!this.save) return undefined;
    return computeProfileStats({ ...this.save, settings: { ...this.save.settings, element: this.selected } });
  }

  get statRows(): readonly CharacterStatRow[] {
    const stats = this.stats;
    if (!stats) return [];
    const base = CHARACTER_DATA.elementBaseStats[this.selected];
    const bonus = (value: number, baseValue: number) => (value > baseValue ? `+${formatNumber(value - baseValue)} từ điểm/trang bị` : undefined);
    return [
      { label: 'HP', value: formatNumber(stats.maxHp), hint: bonus(stats.maxHp, base.maxHp) },
      { label: 'Năng lượng', value: formatNumber(CHARACTER_DATA.limits.maxEnergy) },
      { label: 'Tấn công', value: formatNumber(stats.atk), hint: bonus(stats.atk, base.atk) },
      { label: 'Phòng thủ', value: formatNumber(stats.defense), hint: bonus(stats.defense, base.defense) },
      { label: 'Linh hoạt', value: `${formatNumber(stats.agi)} · né ${(stats.dodgeChance * 100).toFixed(1).replace('.', ',')}%`, hint: bonus(stats.agi, base.agi) },
    ];
  }

  get skills(): readonly CharacterSkillCard[] {
    const data = CHARACTER_DATA.elementSkills[this.selected];
    const atk = this.stats?.atk ?? CHARACTER_DATA.elementBaseStats[this.selected].atk;
    const defense = this.stats?.defense ?? CHARACTER_DATA.elementBaseStats[this.selected].defense;
    const cards = [
      { id: data.primarySkillId, label: data.primarySkillLabel, icon: data.primarySkillIcon, config: data.primarySkill },
      { id: data.secondarySkillId, label: data.secondarySkillLabel, icon: data.secondarySkillIcon, config: data.secondarySkill },
    ].sort((a, b) => a.config.energyCost - b.config.energyCost);
    return cards.map((card, index) => ({
      id: card.id,
      label: card.label,
      slotLabel: index === 0 ? 'Chiêu 1' : 'Tuyệt kỹ',
      iconSrc: skillIconPath(card.icon),
      energyCost: card.config.energyCost,
      effects: describePlayerSkillEffects(card.config, defense),
      damagePreview: card.config.attackMultiplier !== undefined
        ? Math.round(atk * card.config.attackMultiplier * (card.config.hitCount ?? 1))
        : undefined,
    }));
  }

  formatNumber(value: number): string { return formatNumber(value); }
}
