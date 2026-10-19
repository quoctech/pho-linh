import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import type { ElementId, LocalSaveV1 } from '../../game-core';
import { GameStorage } from '../state/game-storage.service';

interface ElementOption {
  readonly id: ElementId;
  readonly name: string;
  readonly icon: string;
  readonly color: string;
  readonly description: string;
  readonly available: boolean;
}

@Component({
  selector: 'app-element-selection',
  templateUrl: './element-selection.page.html',
  styleUrls: ['./element-selection.page.scss'],
  imports: [IonButton, IonContent, IonHeader, IonTitle, IonToolbar],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ElementSelectionPage implements OnInit {
  private readonly storage = inject(GameStorage);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  save?: LocalSaveV1;
  isSaving = false;

  readonly elements: readonly ElementOption[] = [
    { id: 'metal', name: 'Kim', icon: '✦', color: '#d8e2f3', description: 'Kiếm khí sắc lạnh, công thủ cân bằng.', available: true },
    { id: 'wood', name: 'Mộc', icon: '♣', color: '#7ecb8b', description: 'Sức sống bền bỉ và những đòn đánh lan.', available: true },
    { id: 'water', name: 'Thủy', icon: '◌', color: '#72b9ec', description: 'Dòng chảy linh hoạt, kiểm soát nhịp trận.', available: true },
    { id: 'fire', name: 'Hỏa', icon: '♨', color: '#f08a67', description: 'Bùng cháy dữ dội, dồn sát thương nhanh.', available: true },
    { id: 'earth', name: 'Thổ', icon: '⬟', color: '#c8a16b', description: 'Lớp giáp vững chắc và phản đòn nặng.', available: true },
  ];

  async ngOnInit(): Promise<void> {
    this.save = await this.storage.load();
    this.cdr.markForCheck();
  }

  isSelected(element: ElementOption): boolean { return this.save?.settings.element === element.id; }

  async choose(element: ElementOption): Promise<void> {
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
