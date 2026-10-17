import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonItem, IonLabel, IonList, IonToggle, IonTitle, IonToolbar } from '@ionic/angular';
import type { GameSettings, LocalSaveV1 } from '../../game-core';
import { GameStorage } from '../state/game-storage.service';

@Component({ selector: 'app-settings', templateUrl: './settings.page.html', styleUrls: ['./settings.page.scss'], imports: [FormsModule, IonContent, IonHeader, IonItem, IonLabel, IonList, IonToggle, IonTitle, IonToolbar], changeDetection: ChangeDetectionStrategy.OnPush })
export class SettingsPage implements OnInit {
  private readonly storage = inject(GameStorage);
  private readonly cdr = inject(ChangeDetectorRef);
  save?: LocalSaveV1;
  async ngOnInit(): Promise<void> { this.save = await this.storage.load(); this.cdr.markForCheck(); }
  async toggle(key: keyof GameSettings, value: boolean): Promise<void> { if (this.save) { this.save = await this.storage.update((save) => ({ ...save, settings: { ...save.settings, [key]: value } })); this.cdr.markForCheck(); } }
}
