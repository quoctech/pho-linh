// Ảnh idle frame đầu của từng quái; không phụ thuộc Phaser để trang Angular (Kết quả) dùng được.
export const MONSTER_IDLE_ASSETS: Readonly<Record<string, string>> = {
  mist_blob: 'assets/monsters/mist-dust/frames_webp/01_idle/01_idle_01.webp',
  lantern_cat: 'assets/monsters/mieu-den/frames_webp/01_idle/01_idle_01.webp',
  cloud_fox_boss: 'assets/monsters/cloud-fox/frames_webp/01_idle/01_idle_01.webp',
  bamboo_mantis: 'assets/monsters/bamboo-mantis/frames_webp/01_idle/01_idle_01.webp',
};

export function monsterPortrait(monsterId: string): string | undefined {
  return MONSTER_IDLE_ASSETS[monsterId];
}
