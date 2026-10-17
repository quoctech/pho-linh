import { Component, OnInit, inject } from '@angular/core';
import { IonButton, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import type { LocalSaveV1 } from '../../game-core';
import { GameStorage } from '../state/game-storage.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [IonButton, IonContent, IonHeader, IonTitle, IonToolbar, RouterLink],
})
export class HomePage implements OnInit {
  private readonly storage = inject(GameStorage);
  save?: LocalSaveV1;
  async ngOnInit(): Promise<void> { this.save = await this.storage.load(); }

  ionViewWillLeave(): void {
    this.blurFocusedElement();
  }

  private blurFocusedElement(): void {
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
  }
}
