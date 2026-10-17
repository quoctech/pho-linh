import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonItem, IonLabel, IonList, IonTitle, IonToolbar } from '@ionic/angular';
import { commitAttributeAllocation, computeProfileStats, getExpRequired, previewAttributeAllocation, type Attributes, type LocalSaveV1, type PlayerProfile } from '../../game-core';
import { GameStorage } from '../state/game-storage.service';

@Component({
  selector: 'app-character', templateUrl: './character.page.html', styleUrls: ['./character.page.scss'],
  imports: [IonButton, IonContent, IonHeader, IonItem, IonLabel, IonList, IonTitle, IonToolbar, RouterLink], changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CharacterPage implements OnInit {
  private readonly storage = inject(GameStorage);
  private readonly cdr = inject(ChangeDetectorRef);
  save?: LocalSaveV1;
  readonly attributeKeys: readonly (keyof Attributes)[] = ['str', 'vit', 'agi', 'int'];
  draft: Attributes = { str: 0, vit: 0, agi: 0, int: 0 };

  async ngOnInit(): Promise<void> { this.save = await this.storage.load(); this.cdr.markForCheck(); }
  get preview(): PlayerProfile | undefined { return this.save ? previewAttributeAllocation(this.save.profile, this.draft) : undefined; }
  get stats() { return this.save ? computeProfileStats(this.save) : undefined; }
  get previewStats() { return this.save && this.preview ? computeProfileStats({ ...this.save, profile: this.preview }) : undefined; }
  get expRequired(): number { return this.save ? getExpRequired(this.save.profile.level) : 1; }
  change(key: keyof Attributes, amount: number): void {
    const next = this.draft[key] + amount;
    if (next >= 0) this.draft = { ...this.draft, [key]: next };
  }
  async commit(): Promise<void> {
    if (!this.save || !this.preview) return;
    const committed = commitAttributeAllocation(this.save.profile, this.draft);
    this.save = { ...this.save, profile: committed };
    this.draft = { str: 0, vit: 0, agi: 0, int: 0 };
    await this.storage.save(this.save);
    this.cdr.markForCheck();
  }
  cancel(): void { this.draft = { str: 0, vit: 0, agi: 0, int: 0 }; }
}
