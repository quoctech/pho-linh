import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { createItemInstance, ITEM_TEMPLATES, INVENTORY_CAPACITY, type EquipmentSlot, type ItemTemplate, type LocalSaveV1 } from '../../game-core';
import { SLOT_INFO } from '../shared/item-slots';
import { GameStorage } from '../state/game-storage.service';

type ShopFilter = 'all' | EquipmentSlot;

const formatNumber = (value: number) => Math.round(value).toLocaleString('vi-VN');

@Component({
  selector: 'app-shop',
  templateUrl: './shop.page.html',
  styleUrls: ['./shop.page.scss'],
  imports: [IonContent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShopPage implements OnInit {
  private readonly storage = inject(GameStorage);
  private readonly cdr = inject(ChangeDetectorRef);
  save?: LocalSaveV1;
  filter: ShopFilter = 'all';
  /** Thông báo ngắn sau khi mua (tên món vừa mua). */
  lastBought?: string;
  readonly capacity = INVENTORY_CAPACITY;
  readonly slotInfo = SLOT_INFO;
  readonly catalogue: readonly ItemTemplate[] = Object.values(ITEM_TEMPLATES);
  readonly filters: readonly { readonly id: ShopFilter; readonly label: string }[] = [
    { id: 'all', label: 'Tất cả' },
    { id: 'weapon', label: 'Vũ khí' },
    { id: 'armor', label: 'Giáp' },
    { id: 'charm', label: 'Bùa' },
  ];

  async ngOnInit(): Promise<void> { this.save = await this.storage.load(); this.cdr.markForCheck(); }
  // Ionic cache page: vàng có thể đổi sau trận hoặc từ công cụ dev.
  async ionViewWillEnter(): Promise<void> { await this.ngOnInit(); }

  get items(): readonly ItemTemplate[] {
    return this.catalogue.filter((item) => this.filter === 'all' || item.slot === this.filter);
  }

  formatNumber(value: number): string { return formatNumber(value); }
  rarityText(rarity: string): string { return rarity === 'rare' ? 'Hiếm' : 'Thường'; }
  owned(item: ItemTemplate): number { return (this.save?.inventory ?? []).filter((entry) => entry.templateId === item.id).length; }
  setFilter(filter: ShopFilter): void { this.filter = filter; this.cdr.markForCheck(); }

  /** Lý do không mua được, hoặc undefined nếu mua được. */
  blocker(item: ItemTemplate): string | undefined {
    if (!this.save) return 'Đang tải';
    if (this.save.inventory.length >= INVENTORY_CAPACITY) return 'Túi đầy';
    if (this.save.profile.gold < item.price) return 'Không đủ vàng';
    return undefined;
  }

  canBuy(item: ItemTemplate): boolean { return this.blocker(item) === undefined; }

  async buy(item: ItemTemplate): Promise<void> {
    if (!this.canBuy(item)) return;
    const next = await this.storage.update((save) => {
      if (save.profile.gold < item.price || save.inventory.length >= INVENTORY_CAPACITY) return save;
      const instance = createItemInstance(item.id, `shop:${Date.now()}:${item.id}`);
      return { ...save, profile: { ...save.profile, gold: save.profile.gold - item.price }, inventory: [...save.inventory, instance] };
    });
    this.lastBought = next !== this.save && next.inventory.length > (this.save?.inventory.length ?? 0) ? item.name : undefined;
    this.save = next;
    this.cdr.markForCheck();
  }
}
