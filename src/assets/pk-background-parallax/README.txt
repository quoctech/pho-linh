PHO LINH - PK Background Parallax Pack (WebP)

Converted from PNG to WebP for lower download size and faster loading.

Files:
- full-background.webp       : full static reference background
- layer-sky-moon.webp        : background sky + moon layer
- layer-mid-city.webp        : midground city / temple / mountain layer
- layer-fx-mist-petals.webp  : overlay mist / petals / ambient FX layer
- layer-ground-path.webp     : foreground ground path + grass / flowers for character feet area

Suggested order in Phaser 4:
1. layer-sky-moon
2. layer-mid-city
3. battle UI / board
4. characters / enemies
5. layer-fx-mist-petals (as overlay)
6. layer-ground-path (foreground at bottom)

Suggested movement:
- sky: very slow vertical or horizontal drift
- city: subtle parallax drift
- mist/petals: alpha pulse + slow movement
- ground: static or extremely subtle

Size report:
- full-background.png -> full-background.webp: 2560407 bytes -> 197882 bytes (92.3% smaller)
- layer-fx-mist-petals.png -> layer-fx-mist-petals.webp: 1707092 bytes -> 299392 bytes (82.5% smaller)
- layer-ground-path.png -> layer-ground-path.webp: 1188944 bytes -> 177712 bytes (85.1% smaller)
- layer-mid-city.png -> layer-mid-city.webp: 1222039 bytes -> 202462 bytes (83.4% smaller)
- layer-sky-moon.png -> layer-sky-moon.webp: 1620998 bytes -> 39394 bytes (97.6% smaller)