import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { createItemInstance, ITEM_TEMPLATES, INVENTORY_CAPACITY, type ItemTemplate, type LocalSaveV1 } from '../../game-core';
import { GameStorage } from '../state/game-storage.service';

@Component({ selector: 'app-shop', templateUrl: './shop.page.html', styleUrls: ['./shop.page.scss'], imports: [IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonContent, IonHeader, IonTitle, IonToolbar], changeDetection: ChangeDetectionStrategy.OnPush })
export class ShopPage implements OnInit {
  private readonly storage = inject(GameStorage);
  private readonly cdr = inject(ChangeDetectorRef);
  save?: LocalSaveV1;
  readonly catalogue: readonly ItemTemplate[] = Object.values(ITEM_TEMPLATES);
  async ngOnInit(): Promise<void> { this.save = await this.storage.load(); this.cdr.markForCheck(); }
  rarityText(rarity: string): string { return rarity === 'rare' ? 'Hiếm' : 'Thường'; }
  canBuy(item: ItemTemplate): boolean { return !!this.save && this.save.profile.gold >= item.price && this.save.inventory.length < INVENTORY_CAPACITY; }
  async buy(item: ItemTemplate): Promise<void> {
    const next = await this.storage.update((save) => {
      if (save.profile.gold < item.price || save.inventory.length >= INVENTORY_CAPACITY) return save;
      const instance = createItemInstance(item.id, `shop:${Date.now()}:${item.id}`);
      return { ...save, profile: { ...save.profile, gold: save.profile.gold - item.price }, inventory: [...save.inventory, instance] };
    });
    this.save = next;
    this.cdr.markForCheck();
  }
}
