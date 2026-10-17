import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { ITEM_TEMPLATES, type BattleState, type LocalSaveV1 } from '../../game-core';
import { GameStorage } from '../state/game-storage.service';

@Component({
  selector: 'app-result',
  templateUrl: './result.page.html',
  styleUrls: ['./result.page.scss'],
  imports: [IonButton, IonContent, IonHeader, IonTitle, IonToolbar, RouterLink],
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

  async retry(): Promise<void> {
    await this.gameStorage.clearActiveBattle();
    await this.router.navigate(['/battle', this.state?.monster.id ?? 'mist_blob']);
  }

  async chooseMonster(): Promise<void> {
    await this.gameStorage.clearActiveBattle();
    await this.router.navigate(['/hunt']);
  }

  get title(): string {
    if (this.state?.phase === 'VICTORY') return 'Thắng trận!';
    if (this.state?.phase === 'DEFEAT') return `${this.state.monster.name} đã thắng`;
    return 'Đã bỏ trận';
  }

  get description(): string {
    if (this.state?.phase === 'VICTORY') return 'Bạn đã đọc đúng nhịp tấn công và làm chủ bàn ngọc.';
    if (this.state?.phase === 'DEFEAT') return 'Hãy thử dùng khiên trước đòn đánh và tích đủ energy cho tuyệt kỹ.';
    return 'Trận này chưa được tính là thắng hoặc thua.';
  }

  get latestItemName(): string | undefined {
    const item = this.save?.rewardJournal.at(-1)?.reward.item;
    return item ? ITEM_TEMPLATES[item.templateId]?.name : undefined;
  }

  private isTerminal(phase: BattleState['phase']): boolean {
    return phase === 'VICTORY' || phase === 'DEFEAT' || phase === 'ABANDON';
  }
}
