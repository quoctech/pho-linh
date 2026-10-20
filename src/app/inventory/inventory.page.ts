import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';
import {
  INVENTORY_CAPACITY,
  ITEM_TEMPLATES,
  claimPendingReward,
  computeProfileStats,
  equipItem,
  unequipItem,
  type EquipmentSlot,
  type ItemInstance,
  type ItemTemplate,
  type LocalSaveV1,
} from '../../game-core';
import { SLOT_INFO } from '../shared/item-slots';
import { GameStorage } from '../state/game-storage.service';

type InventoryFilter = 'all' | EquipmentSlot | 'rare';

const formatNumber = (value: number) => Math.round(value).toLocaleString('vi-VN');

@Component({
  selector: 'app-inventory',
  templateUrl: './inventory.page.html',
  styleUrls: ['./inventory.page.scss'],
  imports: [IonContent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryPage implements OnInit {
  private readonly storage = inject(GameStorage);
  private readonly cdr = inject(ChangeDetectorRef);
  save?: LocalSaveV1;
  filter: InventoryFilter = 'all';
  readonly capacity = INVENTORY_CAPACITY;
  readonly slots: readonly EquipmentSlot[] = ['weapon', 'armor', 'charm'];
  readonly slotInfo = SLOT_INFO;
  readonly filters: readonly { readonly id: InventoryFilter; readonly label: string }[] = [
    { id: 'all', label: 'Tất cả' },
    { id: 'weapon', label: 'Vũ khí' },
    { id: 'armor', label: 'Giáp' },
    { id: 'charm', label: 'Bùa' },
    { id: 'rare', label: 'Hiếm' },
  ];

  async ngOnInit(): Promise<void> { this.save = await this.storage.load(); this.cdr.markForCheck(); }
  // Ionic cache page: tải lại để thấy đồ vừa nhặt/mua.
  async ionViewWillEnter(): Promise<void> { await this.ngOnInit(); }

  get items(): readonly ItemInstance[] {
    return (this.save?.inventory ?? []).filter((item) => {
      const template = ITEM_TEMPLATES[item.templateId];
      if (!template) return false;
      if (this.filter === 'all') return true;
      return this.filter === 'rare' ? template.rarity === 'rare' : template.slot === this.filter;
    });
  }

  /** Phần chỉ số trang bị đang cộng thêm (đã nhân equipmentScale). */
  get gearBonuses(): readonly string[] {
    if (!this.save) return [];
    const withGear = computeProfileStats(this.save);
    const without = computeProfileStats({ ...this.save, equipment: {} });
    const rows: [string, number][] = [
      ['HP', withGear.maxHp - without.maxHp],
      ['ATK', withGear.atk - without.atk],
      ['DEF', withGear.defense - without.defense],
      ['AGI', withGear.agi - without.agi],
      ['Skill Power', withGear.skillPower - without.skillPower],
    ];
    return rows.filter(([, value]) => value > 0).map(([label, value]) => `+${formatNumber(value)} ${label}`);
  }

  template(item: ItemInstance | string): ItemTemplate {
    return ITEM_TEMPLATES[typeof item === 'string' ? item : item.templateId];
  }

  equippedTemplate(slot: EquipmentSlot): ItemTemplate | undefined {
    const instanceId = this.save?.equipment[slot];
    const instance = this.save?.inventory.find((item) => item.instanceId === instanceId);
    return instance ? ITEM_TEMPLATES[instance.templateId] : undefined;
  }

  equipped(item: ItemInstance): boolean { return Object.values(this.save?.equipment ?? {}).includes(item.instanceId); }
  setFilter(filter: InventoryFilter): void { this.filter = filter; this.cdr.markForCheck(); }

  async equip(item: ItemInstance): Promise<void> { await this.persist((save) => equipItem(save, item.instanceId)); }
  async unequip(slot: EquipmentSlot): Promise<void> { await this.persist((save) => unequipItem(save, slot)); }
  async claim(claimId: string): Promise<void> { await this.persist((save) => claimPendingReward(save, claimId)); }

  private async persist(mutate: (save: LocalSaveV1) => LocalSaveV1): Promise<void> {
    if (!this.save) return;
    this.save = mutate(this.save);
    await this.storage.save(this.save);
    this.cdr.markForCheck();
  }
}
