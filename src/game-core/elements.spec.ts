import { elementalModifier, elementRelationship } from './elements';

describe('Ngũ Hành (Balance V2)', () => {
  it('xác định quan hệ tương khắc theo vòng Kim→Mộc→Thổ→Thủy→Hỏa→Kim', () => {
    // Mỗi hệ khắc hệ đứng sau nó trong vòng.
    expect(elementRelationship('metal', 'wood')).toBe('counter');
    expect(elementRelationship('wood', 'earth')).toBe('counter');
    expect(elementRelationship('earth', 'water')).toBe('counter');
    expect(elementRelationship('water', 'fire')).toBe('counter');
    expect(elementRelationship('fire', 'metal')).toBe('counter');
  });

  it('nhận ra khi nhân vật bị quái khắc', () => {
    expect(elementRelationship('wood', 'metal')).toBe('countered');
    expect(elementRelationship('metal', 'fire')).toBe('countered');
    expect(elementRelationship('fire', 'water')).toBe('countered');
  });

  it('coi cùng hệ hoặc không liên quan là hòa', () => {
    expect(elementRelationship('metal', 'metal')).toBe('neutral');
    expect(elementRelationship('metal', 'earth')).toBe('neutral');
    expect(elementRelationship('metal', 'water')).toBe('neutral');
  });

  it('áp đúng modifier 130/100/80 cho sát thương', () => {
    expect(elementalModifier('counter', 'damage')).toBe(1.3);
    expect(elementalModifier('neutral', 'damage')).toBe(1.0);
    expect(elementalModifier('countered', 'damage')).toBe(0.8);
  });

  it('áp đúng modifier cho hồi máu/khiên và năng lượng', () => {
    expect(elementalModifier('counter', 'support')).toBe(1.0);
    expect(elementalModifier('countered', 'support')).toBe(0.8);
    expect(elementalModifier('counter', 'energy')).toBe(1.2);
    expect(elementalModifier('countered', 'energy')).toBe(1.0);
  });
});
