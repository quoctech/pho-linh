import { Routes } from '@angular/router';

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
    loadComponent: () => import('./skin-preview/skin-preview.page').then((m) => m.SkinPreviewPage),
  },
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
  { path: 'inventory', loadComponent: () => import('./inventory/inventory.page').then((m) => m.InventoryPage) },
  { path: 'shop', loadComponent: () => import('./shop/shop.page').then((m) => m.ShopPage) },
  { path: 'settings', loadComponent: () => import('./settings/settings.page').then((m) => m.SettingsPage) },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
];
