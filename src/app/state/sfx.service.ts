import { Injectable } from '@angular/core';

/** Placeholder audio boundary: missing audio assets never block a battle action. */
@Injectable({ providedIn: 'root' })
export class SfxService {
  play(_cue: string): void { /* Intentionally silent until official local assets arrive. */ }
}
