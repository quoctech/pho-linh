import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonSpinner,
} from '@ionic/angular';
import { MONSTER_DEFINITIONS, type LocalSaveV1, type MonsterDefinition } from '../../game-core';
import { GameStorage } from '../state/game-storage.service';

@Component({
  selector: 'app-hunt',
  templateUrl: './hunt.page.html',
  styleUrls: ['./hunt.page.scss'],
  imports: [
    IonButton,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonSpinner,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HuntPage implements OnInit {
  private readonly storage = inject(GameStorage);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  save?: LocalSaveV1;
  isLoading = true;
  readonly monsters: readonly MonsterDefinition[] = Object.values(MONSTER_DEFINITIONS);
  async ngOnInit(): Promise<void> {
    try {
      this.save = await this.storage.load();
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }
  isUnlocked(monster: MonsterDefinition): boolean { return this.save?.monsterProgress[monster.id]?.unlocked ?? monster.id === 'mist_blob'; }
  unlockText(monster: MonsterDefinition): string { const req = monster.unlockRequirement; return req ? `Thắng ${req.wins} trận ${MONSTER_DEFINITIONS[req.monsterId].name}` : 'Mở sẵn'; }
  behaviorText(behavior: string): string {
    return { basic: 'đánh thường', guard: 'phòng thủ', heavy: 'đòn nặng' }[behavior] ?? behavior;
  }
  async hunt(monster: MonsterDefinition): Promise<void> { if (this.isUnlocked(monster)) await this.router.navigate(['/battle', monster.id]); }

  ionViewWillLeave(): void {
    this.blurFocusedElement();
  }

  private blurFocusedElement(): void {
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
  }
}
