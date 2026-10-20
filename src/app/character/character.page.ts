import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent } from '@ionic/angular';
import {
  CHARACTER_DATA,
  commitAttributeAllocation,
  computeProfileStats,
  devGrantAttributePoints,
  devGrantGold,
  devGrantLevels,
  devSetLevel,
  resetAttributePoints,
  spentAttributePoints,
  getExpRequired,
  previewAttributeAllocation,
  type Attributes,
  type DerivedStats,
  type ElementProfileData,
  type LocalSaveV1,
  type PlayerProfile,
} from '../../game-core';
import { GameStorage } from '../state/game-storage.service';
import { passiveIconForElement, passiveIconPath } from './passive-icon-assets';

interface AttributeRow {
  readonly key: keyof Attributes;
  readonly label: string;
  /** Hiệu quả mỗi điểm, đọc từ character.json → derivedStats. */
  readonly effect: string;
}

interface StatRow {
  readonly label: string;
  readonly value: string;
  readonly delta?: string;
}

const ELEMENT_COLORS: Readonly<Record<string, string>> = {
  metal: '#d8e2f3', wood: '#7ecb8b', water: '#72b9ec', fire: '#f08a67', earth: '#c8a16b',
};

const formatNumber = (value: number) => Math.round(value).toLocaleString('vi-VN');

@Component({
  selector: 'app-character', templateUrl: './character.page.html', styleUrls: ['./character.page.scss'],
  imports: [IonButton, IonContent, RouterLink], changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CharacterPage implements OnInit {
  private readonly storage = inject(GameStorage);
  private readonly cdr = inject(ChangeDetectorRef);
  save?: LocalSaveV1;
  draft: Attributes = { str: 0, vit: 0, agi: 0, int: 0 };

  readonly attributes: readonly AttributeRow[] = (() => {
    const formula = CHARACTER_DATA.derivedStats;
    return [
      { key: 'str', label: 'Sức mạnh', effect: `+${formula.atk.strPerPoint} ATK / điểm` },
      { key: 'vit', label: 'Thể lực', effect: `+${formula.maxHp.vitPerPoint} HP · +${formula.defense.vitPerPoint} DEF / điểm` },
      { key: 'agi', label: 'Linh hoạt', effect: `+${formula.agi.agiPerPoint} AGI / điểm (tăng né)` },
      { key: 'int', label: 'Trí tuệ', effect: `+${formula.skillPower.intPerPoint} Sức mạnh kỹ năng / điểm` },
    ];
  })();

  async ngOnInit(): Promise<void> { this.save = await this.storage.load(); this.cdr.markForCheck(); }
  // Ionic cache page: tải lại khi quay lại để cấp/EXP/điểm sau trận luôn mới.
  async ionViewWillEnter(): Promise<void> { await this.ngOnInit(); }

  get color(): string { return ELEMENT_COLORS[this.save?.settings.element ?? 'metal']; }
  get profile(): ElementProfileData { return CHARACTER_DATA.elementProfiles[this.save?.settings.element ?? 'metal']; }

  get heroPortrait(): string {
    const element = this.save?.settings.element ?? 'metal';
    return this.save?.settings.gender === 'female'
      ? `assets/hero-female-elements/${element}/frames_webp/01_idle/01_idle_01.webp`
      : `assets/hero-${element}/frames_webp/01_idle/01_idle_01.webp`;
  }

  get passiveIcon() { return passiveIconForElement(this.save?.settings.element ?? 'metal'); }
  get passiveIconSrc(): string { return passiveIconPath(this.save?.settings.element ?? 'metal'); }

  get preview(): PlayerProfile | undefined { return this.save ? previewAttributeAllocation(this.save.profile, this.draft) : undefined; }
  get stats(): DerivedStats | undefined { return this.save ? computeProfileStats(this.save) : undefined; }
  get previewStats(): DerivedStats | undefined {
    return this.save && this.preview ? computeProfileStats({ ...this.save, profile: this.preview }) : undefined;
  }
  get expRequired(): number { return this.save ? getExpRequired(this.save.profile.level) : 1; }
  get expPercent(): number { return this.save ? Math.min(100, (this.save.profile.exp / this.expRequired) * 100) : 0; }
  get pointsLeft(): number { return this.preview?.unspentPoints ?? this.save?.profile.unspentPoints ?? 0; }
  get hasDraft(): boolean { return Object.values(this.draft).some((value) => value > 0); }

  /** Chỉ số hiện tại kèm phần tăng thêm nếu xác nhận draft điểm. */
  get statRows(): readonly StatRow[] {
    const now = this.stats;
    const next = this.previewStats ?? now;
    if (!now || !next) return [];
    const row = (label: string, key: 'maxHp' | 'atk' | 'defense' | 'agi' | 'skillPower'): StatRow => ({
      label,
      value: formatNumber(now[key]),
      delta: next[key] > now[key] ? `+${formatNumber(next[key] - now[key])}` : undefined,
    });
    const dodgeNow = now.dodgeChance * 100;
    const dodgeNext = next.dodgeChance * 100;
    return [
      row('HP', 'maxHp'),
      row('Tấn công', 'atk'),
      row('Phòng thủ', 'defense'),
      row('Linh hoạt', 'agi'),
      {
        label: 'Né tránh',
        value: `${dodgeNow.toFixed(1).replace('.', ',')}%`,
        delta: dodgeNext > dodgeNow + 0.05 ? `+${(dodgeNext - dodgeNow).toFixed(1).replace('.', ',')}%` : undefined,
      },
      row('Sức mạnh kỹ năng', 'skillPower'),
    ];
  }

  formatNumber(value: number): string { return formatNumber(value); }

  change(key: keyof Attributes, amount: number): void {
    const next = this.draft[key] + amount;
    if (next < 0 || (amount > 0 && this.pointsLeft <= 0)) return;
    this.draft = { ...this.draft, [key]: next };
  }

  async commit(): Promise<void> {
    if (!this.save || !this.preview || !this.hasDraft) return;
    const committed = commitAttributeAllocation(this.save.profile, this.draft);
    this.save = { ...this.save, profile: committed };
    this.draft = { str: 0, vit: 0, agi: 0, int: 0 };
    await this.storage.save(this.save);
    this.cdr.markForCheck();
  }

  cancel(): void { this.draft = { str: 0, vit: 0, agi: 0, int: 0 }; }

  // ---- Công cụ test cân bằng offline: chỉ hiện khi bật Dev mode trong Cài đặt. ----
  readonly devTools = CHARACTER_DATA.devTools;
  levelInput = 1;

  get devMode(): boolean { return this.save?.settings.devMode === true; }
  get spentPoints(): number { return this.save ? spentAttributePoints(this.save.profile) : 0; }

  async devGrantPoints(points: number): Promise<void> { await this.applyDev((profile) => devGrantAttributePoints(profile, points)); }
  async devGrantLevels(levels: number): Promise<void> { await this.applyDev((profile) => devGrantLevels(profile, levels)); }
  async devGrantGold(): Promise<void> { await this.applyDev((profile) => devGrantGold(profile, this.devTools.goldStep)); }
  async devResetPoints(): Promise<void> { await this.applyDev(resetAttributePoints); }
  async devSetLevel(): Promise<void> { await this.applyDev((profile) => devSetLevel(profile, this.levelInput)); }

  setLevelInput(value: string): void { this.levelInput = Number(value) || 1; }

  private async applyDev(mutate: (profile: PlayerProfile) => PlayerProfile): Promise<void> {
    if (!this.save || !this.devMode) return;
    this.draft = { str: 0, vit: 0, agi: 0, int: 0 };
    this.save = await this.storage.update((save) => ({ ...save, profile: mutate(save.profile) }));
    this.levelInput = this.save.profile.level;
    this.cdr.markForCheck();
  }
}
