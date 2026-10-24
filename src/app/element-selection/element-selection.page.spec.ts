import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { createDefaultSave } from '../../game-core';
import { GameStorage } from '../state/game-storage.service';
import { ElementSelectionPage } from './element-selection.page';

class FakeGameStorage {
  async load() { return createDefaultSave(); }
  async update(mutator: (save: ReturnType<typeof createDefaultSave>) => ReturnType<typeof createDefaultSave>) { return mutator(createDefaultSave()); }
}

describe('ElementSelectionPage', () => {
  let component: ElementSelectionPage;
  let fixture: ComponentFixture<ElementSelectionPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ElementSelectionPage],
      providers: [provideRouter([]), { provide: GameStorage, useClass: FakeGameStorage }],
    }).compileComponents();
    fixture = TestBed.createComponent(ElementSelectionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows all five elements and makes every shipped element available', () => {
    expect(component.elements.map((element) => element.id)).toEqual(['metal', 'wood', 'water', 'fire', 'earth']);
    expect(component.elements.filter((element) => element.available).map((element) => element.id)).toEqual(['metal', 'wood', 'water', 'fire', 'earth']);
  });

  it('previews an element without saving and reads counters from the element cycle', () => {
    component.select(component.elements[3]);
    expect(component.previewId).toBe('fire');
    expect(component.save?.settings.element).toBe('metal');
    expect(component.counters.strong.id).toBe('metal');
    expect(component.counters.weak.id).toBe('water');
    expect(component.statBars[0].value).toBe('10.000');
  });
});
