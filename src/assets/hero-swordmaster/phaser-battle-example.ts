// Example state flow
// idle -> attack -> idle
// hit when damaged
// death when HP <= 0

hero.play('hero-swordmaster-idle');

function playHeroAttack(hero: Phaser.GameObjects.Sprite, monsterX: number, monsterY: number) {
  hero.play('hero-swordmaster-attack');

  hero.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
    hero.play('hero-swordmaster-idle');
  });

  // Optional extra projectile accent
  const swordFx = hero.scene.add.image(hero.x + 110, hero.y - 180, 'hero-swordmaster-flying-sword-projectile');
  swordFx.setScale(0.75);
  hero.scene.tweens.add({
    targets: swordFx,
    x: monsterX,
    y: monsterY - 30,
    alpha: 0.3,
    duration: 280,
    ease: 'Cubic.Out',
    onComplete: () => swordFx.destroy()
  });
}
