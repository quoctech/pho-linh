import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonBadge, IonButton, IonChip, IonContent, IonHeader, IonItem, IonLabel, IonSelect, IonSelectOption, IonTitle, IonToolbar } from '@ionic/angular';
import { ITEM_TEMPLATES, claimPendingReward, equipItem, unequipItem, type EquipmentSlot, type ItemInstance, type LocalSaveV1 } from '../../game-core';
import { GameStorage } from '../state/game-storage.service';

@Component({ selector: 'app-inventory', templateUrl: './inventory.page.html', styleUrls: ['./inventory.page.scss'],
  imports: [FormsModule, IonBadge, IonButton, IonChip, IonContent, IonHeader, IonItem, IonLabel, IonSelect, IonSelectOption, IonTitle, IonToolbar], changeDetection: ChangeDetectionStrategy.OnPush })
export class InventoryPage implements OnInit {
  private readonly storage = inject(GameStorage);
  private readonly cdr = inject(ChangeDetectorRef);
  save?: LocalSaveV1; filter = 'all';
  readonly slots: readonly EquipmentSlot[] = ['weapon', 'armor', 'charm'];
  readonly templates = ITEM_TEMPLATES;
  async ngOnInit(): Promise<void> { this.save = await this.storage.load(); this.cdr.markForCheck(); }
  get items(): readonly ItemInstance[] { return (this.save?.inventory ?? []).filter((item) => this.filter === 'all' || ITEM_TEMPLATES[item.templateId].slot === this.filter || ITEM_TEMPLATES[item.templateId].rarity === this.filter); }
  template(item: ItemInstance) { return ITEM_TEMPLATES[item.templateId]; }
  equipped(item: ItemInstance): boolean { return Object.values(this.save?.equipment ?? {}).includes(item.instanceId); }
  async equip(item: ItemInstance): Promise<void> { if (this.save) { this.save = equipItem(this.save, item.instanceId); await this.storage.save(this.save); this.cdr.markForCheck(); } }
  async unequip(slot: EquipmentSlot): Promise<void> { if (this.save) { this.save = unequipItem(this.save, slot); await this.storage.save(this.save); this.cdr.markForCheck(); } }
  async claim(claimId: string): Promise<void> { if (this.save) { this.save = claimPendingReward(this.save, claimId); await this.storage.save(this.save); this.cdr.markForCheck(); } }
}
