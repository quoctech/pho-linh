import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonToggle } from '@ionic/angular';
import { COMBAT_DATA, type GameSettings, type LocalSaveV1 } from '../../game-core';
import { GameStorage } from '../state/game-storage.service';

type HeroGender = GameSettings['gender'];

type ToggleKey = 'music' | 'sfx' | 'reducedMotion' | 'devMode';

interface ToggleRow {
  readonly key: ToggleKey;
  readonly icon: string;
  readonly label: string;
  readonly hint: string;
}

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  imports: [IonContent, IonToggle, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage implements OnInit {
  private readonly storage = inject(GameStorage);
  private readonly cdr = inject(ChangeDetectorRef);
  save?: LocalSaveV1;
  readonly balanceVersion = COMBAT_DATA.match3.balanceVersion;

  readonly genders: readonly { readonly id: HeroGender; readonly label: string }[] = [
    { id: 'male', label: 'Nam' },
    { id: 'female', label: 'Nữ' },
  ];

  readonly groups: readonly { readonly title: string; readonly rows: readonly ToggleRow[] }[] = [
    {
      title: 'Âm thanh',
      rows: [
        { key: 'music', icon: '♫', label: 'Nhạc nền', hint: 'Chưa có nhạc nền' },
        { key: 'sfx', icon: '♪', label: 'Hiệu ứng âm thanh', hint: 'Đánh, trúng đòn, kỹ năng' },
      ],
    },
    {
      title: 'Hiển thị',
      rows: [{ key: 'reducedMotion', icon: '◐', label: 'Giảm chuyển động', hint: 'Bớt rung, nháy và hạt hiệu ứng' }],
    },
    {
      title: 'Nhà phát triển',
      rows: [{ key: 'devMode', icon: '⚙', label: 'Dev mode', hint: 'Hiện màn test đòn đánh & kỹ năng' }],
    },
  ];

  async ngOnInit(): Promise<void> { this.save = await this.storage.load(); this.cdr.markForCheck(); }

  portrait(gender: HeroGender): string {
    const element = this.save?.settings.element ?? 'metal';
    return gender === 'female'
      ? `assets/hero-female-elements/${element}/frames_webp/01_idle/01_idle_01.webp`
      : `assets/hero-${element}/frames_webp/01_idle/01_idle_01.webp`;
  }

  async toggle(key: ToggleKey, value: boolean): Promise<void> {
    if (!this.save) return;
    this.save = await this.storage.update((save) => ({ ...save, settings: { ...save.settings, [key]: value } }));
    this.cdr.markForCheck();
  }

  async setGender(value: unknown): Promise<void> {
    if (value !== 'male' && value !== 'female') return;
    if (!this.save || this.save.settings.gender === value) return;
    this.save = await this.storage.update((save) => ({ ...save, settings: { ...save.settings, gender: value } }));
    this.cdr.markForCheck();
  }
}
