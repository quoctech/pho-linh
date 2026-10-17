import {
  createBoard,
  findLegalMoves,
  findMatches,
  reshuffleBoard,
} from './index';

describe('Match-3 board', () => {
  it('creates a stable 6x6 board with a legal move', () => {
    const result = createBoard(12345);

    expect(result.board).toHaveLength(6);
    expect(result.board.every((row) => row.length === 6)).toBe(true);
    expect(findMatches(result.board)).toHaveLength(0);
    expect(findLegalMoves(result.board).length).toBeGreaterThan(0);
  });

  it('generates the same board from the same seed', () => {
    expect(createBoard(99)).toEqual(createBoard(99));
    expect(createBoard(99).board).not.toEqual(createBoard(100).board);
  });

  it('deduplicates intersecting horizontal and vertical matches', () => {
    const board = [
      ['attack', 'heal', 'attack', 'poison', 'energy', 'shield'],
      ['heal', 'attack', 'attack', 'attack', 'poison', 'energy'],
      ['attack', 'attack', 'attack', 'shield', 'energy', 'poison'],
      ['shield', 'attack', 'heal', 'energy', 'poison', 'attack'],
      ['energy', 'attack', 'poison', 'heal', 'shield', 'heal'],
      ['poison', 'shield', 'energy', 'attack', 'heal', 'attack'],
    ] as const;

    const matches = findMatches(board);
    const unique = new Set(matches.map(({ row, col }) => `${row}:${col}`));

    expect(matches).toHaveLength(unique.size);
    expect(unique.has('1:2')).toBe(true);
    expect(unique.has('2:1')).toBe(true);
  });

  it('reshuffles a dead board into a stable board deterministically', () => {
    const deadBoard = Array.from({ length: 6 }, () =>
      Array.from({ length: 6 }, () => 'attack' as const),
    );
    const first = reshuffleBoard(deadBoard, 777);
    const second = reshuffleBoard(deadBoard, 777);

    expect(first).toEqual(second);
    expect(findMatches(first.board)).toHaveLength(0);
    expect(findLegalMoves(first.board).length).toBeGreaterThan(0);
  });
});
