import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { environment } from '../environments/environment';
import { GameStorage } from './state/game-storage.service';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'element-selection',
    loadComponent: () => import('./element-selection/element-selection.page').then((m) => m.ElementSelectionPage),
  },
  {
    path: 'skin-preview',
    canMatch: [() => !environment.production && inject(GameStorage).load().then((save) => save.settings.devMode)],
    loadComponent: () => import('./skin-preview/skin-preview.page').then((m) => m.SkinPreviewPage),
  },
  ...(!environment.production ? [{
    path: 'skill-test',
    canMatch: [() => !environment.production && inject(GameStorage).load().then((save) => save.settings.devMode)],
    loadComponent: () => import('./skill-test/skill-test.page').then((m) => m.SkillTestPage),
  }] : []),
  {
    path: 'hunt',
    loadComponent: () => import('./hunt/hunt.page').then((m) => m.HuntPage),
  },
  {
    path: 'battle/:monsterId',
    loadComponent: () => import('./battle/battle.page').then((m) => m.BattlePage),
  },
  {
    path: 'result/:battleId',
    loadComponent: () => import('./result/result.page').then((m) => m.ResultPage),
  },
  { path: 'character', loadComponent: () => import('./character/character.page').then((m) => m.CharacterPage) },
  { path: 'character-info', loadComponent: () => import('./character-info/character-info.page').then((m) => m.CharacterInfoPage) },
  { path: 'inventory', loadComponent: () => import('./inventory/inventory.page').then((m) => m.InventoryPage) },
  { path: 'shop', loadComponent: () => import('./shop/shop.page').then((m) => m.ShopPage) },
  { path: 'settings', loadComponent: () => import('./settings/settings.page').then((m) => m.SettingsPage) },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
];
