import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent } from '@ionic/angular';
import {
  CHARACTER_DATA,
  ITEM_TEMPLATES,
  elementRelationship,
  getExpRequired,
  type BattleState,
  type ItemTemplate,
  type LocalSaveV1,
  type RewardGrant,
} from '../../game-core';
import { monsterPortrait } from '../shared/monster-portraits';
import { GameStorage } from '../state/game-storage.service';

type Outcome = 'VICTORY' | 'DEFEAT' | 'ABANDON';

interface OutcomeCopy {
  readonly eyebrow: string;
  readonly title: string;
  readonly mark: string;
}

const OUTCOME_COPY: Readonly<Record<Outcome, OutcomeCopy>> = {
  VICTORY: { eyebrow: 'KẾT QUẢ TRẬN', title: 'Chiến thắng', mark: '★' },
  DEFEAT: { eyebrow: 'KẾT QUẢ TRẬN', title: 'Thất bại', mark: '✕' },
  ABANDON: { eyebrow: 'TRẬN ĐẤU', title: 'Đã bỏ trận', mark: '⟲' },
};

const formatNumber = (value: number) => Math.round(value).toLocaleString('vi-VN');
const percent = (value: number, max: number) => (max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0);

@Component({
  selector: 'app-result',
  templateUrl: './result.page.html',
  styleUrls: ['./result.page.scss'],
  imports: [IonContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResultPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly gameStorage = inject(GameStorage);
  private readonly cdr = inject(ChangeDetectorRef);

  state?: BattleState;
  save?: LocalSaveV1;

  async ngOnInit(): Promise<void> {
    this.save = await this.gameStorage.load();
    const state = this.save.activeBattle;
    const battleId = this.route.snapshot.paramMap.get('battleId');
    if (!state || state.battleId !== battleId || !this.isTerminal(state.phase)) {
      await this.router.navigate(['/hunt']);
      return;
    }
    this.state = state;
    this.cdr.markForCheck();
  }

  get outcome(): Outcome {
    const phase = this.state?.phase;
    return phase === 'VICTORY' || phase === 'DEFEAT' ? phase : 'ABANDON';
  }

  get copy(): OutcomeCopy { return OUTCOME_COPY[this.outcome]; }

  get description(): string {
    const battle = this.state;
    if (!battle) return '';
    if (this.outcome === 'VICTORY') return `Bạn đã hạ ${battle.monster.name} sau ${battle.turn} lượt.`;
    if (this.outcome === 'DEFEAT') {
      if (battle.terminalReason === 'turn_limit') return `Hết ${battle.maxTurns} lượt trước khi hạ được ${battle.monster.name}.`;
      if (battle.terminalReason === 'player_defeated_by_poison') return `Nhân vật gục vì độc ở lượt ${battle.turn}.`;
      if (battle.terminalReason === 'player_defeated_by_burning') return `Nhân vật gục vì thiêu đốt ở lượt ${battle.turn}.`;
      return `${battle.monster.name} đã hạ nhân vật ở lượt ${battle.turn}.`;
    }
    return 'Trận này không tính thắng hay thua. Bạn không mất EXP, vàng hay vật phẩm.';
  }

  get heroPortrait(): string {
    const element = this.save?.settings.element ?? 'metal';
    return this.save?.settings.gender === 'female'
      ? `assets/hero-female-elements/${element}/frames_webp/01_idle/01_idle_01.webp`
      : `assets/hero-${element}/frames_webp/01_idle/01_idle_01.webp`;
  }

  get monsterPortrait(): string | undefined { return this.state ? monsterPortrait(this.state.monster.id) : undefined; }
  get heroClass(): string { return CHARACTER_DATA.elementProfiles[this.save?.settings.element ?? 'metal'].className; }

  get playerHp(): { readonly text: string; readonly percent: number } {
    const player = this.state?.player;
    return player
      ? { text: `${formatNumber(player.currentHp)} / ${formatNumber(player.stats.maxHp)}`, percent: percent(player.currentHp, player.stats.maxHp) }
      : { text: '', percent: 0 };
  }

  get monsterHp(): { readonly text: string; readonly percent: number } {
    const monster = this.state?.monster;
    return monster
      ? { text: `${formatNumber(monster.currentHp)} / ${formatNumber(monster.maxHp)}`, percent: percent(monster.currentHp, monster.maxHp) }
      : { text: '', percent: 0 };
  }

  /** Phần thưởng của chính trận này (tra theo battleId, không lấy nhầm trận trước). */
  get reward(): RewardGrant | undefined {
    const battleId = this.state?.battleId;
    return this.save?.rewardJournal.find((entry) => entry.battleId === battleId)?.reward;
  }

  get rewardItem(): ItemTemplate | undefined {
    const item = this.reward?.item;
    return item ? ITEM_TEMPLATES[item.templateId] : undefined;
  }

  get rewardPending(): boolean {
    return (this.save?.pendingRewards ?? []).some((pending) => pending.battleId === this.state?.battleId);
  }

  /**
   * Lên cấp trong trận này: EXP dư sau khi lên cấp luôn nhỏ hơn EXP vừa nhận
   * (EXP trước + nhận − yêu cầu < nhận), còn khi không lên cấp thì EXP hiện có ≥ EXP vừa nhận.
   */
  get leveledUp(): boolean {
    const gained = this.reward?.exp ?? 0;
    return gained > 0 && (this.save?.profile.exp ?? 0) < gained;
  }

  get expPercent(): number {
    const profile = this.save?.profile;
    return profile ? percent(profile.exp, getExpRequired(profile.level)) : 0;
  }

  get expText(): string {
    const profile = this.save?.profile;
    return profile ? `${formatNumber(profile.exp)} / ${formatNumber(getExpRequired(profile.level))} EXP` : '';
  }

  /** Gợi ý sau khi thua, dựa trên tình huống trận (tối đa 3). */
  get defeatTips(): readonly string[] {
    const battle = this.state;
    const save = this.save;
    if (!battle || !save) return [];
    const tips: string[] = [];
    if (save.profile.unspentPoints > 0) tips.push(`Bạn còn ${save.profile.unspentPoints} điểm thuộc tính chưa cộng — vào Nhân vật để tăng sức mạnh.`);
    if (battle.monster.element && elementRelationship(battle.player.element, battle.monster.element) === 'countered') {
      const monsterElement = CHARACTER_DATA.elementProfiles[battle.monster.element].elementLabel;
      tips.push(`${battle.monster.name} hệ ${monsterElement} đang khắc hệ của bạn — thử đổi hệ Ngũ Hành.`);
    }
    if (battle.terminalReason === 'player_defeated_by_poison' || battle.terminalReason === 'player_defeated_by_burning') {
      tips.push('Hồi máu bằng ngọc Xanh lá sớm khi đang dính độc hoặc thiêu đốt.');
    }
    tips.push('Gom ngọc Xanh dương lấy Khiên khi quái báo đòn mạnh.');
    tips.push('Tích ngọc Vàng để tung kỹ năng đúng lúc quái yếu.');
    return tips.slice(0, 3);
  }

  formatNumber(value: number): string { return formatNumber(value); }
  rarityText(rarity: string): string { return rarity === 'rare' ? 'Hiếm' : 'Thường'; }

  async retry(): Promise<void> {
    await this.gameStorage.clearActiveBattle();
    await this.router.navigate(['/battle', this.state?.monster.id ?? 'mist_blob']);
  }

  async chooseMonster(): Promise<void> { await this.leaveTo('/hunt'); }
  async goHome(): Promise<void> { await this.leaveTo('/home'); }
  async goCharacter(): Promise<void> { await this.leaveTo('/character'); }
  async goInventory(): Promise<void> { await this.leaveTo('/inventory'); }

  private async leaveTo(path: string): Promise<void> {
    await this.gameStorage.clearActiveBattle();
    await this.router.navigate([path]);
  }

  private isTerminal(phase: BattleState['phase']): boolean {
    return phase === 'VICTORY' || phase === 'DEFEAT' || phase === 'ABANDON';
  }
}
