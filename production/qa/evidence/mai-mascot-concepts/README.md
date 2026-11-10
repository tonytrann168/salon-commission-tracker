# Mai mascot concepts — owner, please pick A, B or C (or a mix)

Owner, 2026-11-10: "a very cute mascot... something that represents a nail salon (probably changed later for hair)."
Drawn in code (SVG) as three swappable skins: `src/game/mascot/polish-bottle.ts`, `hoa-mai.ts`, `salon-kitty.ts`.
Dev-only page: run `npm run dev:local` in `src/` and open http://localhost:5173/mascot-concepts.html (not in the
production build). These are concept sketches, not final art: the picked one gets polished.

| File | Concept |
|------|---------|
| `A-polish-bottle.png` | **A. Polish Bottle**: a round pastel-pink bottle with sparkly eyes and blush; a bow on her cap; her brush is a wand that rises when she's happy. Hair version: a hairdryer or comb character. |
| `B-hoa-mai.png` | **B. Hoa Mai blossom**: a yellow Tết apricot blossom (her name) with a face; each petal is a glossy painted nail tip whose colour follows her mood (yellow → orange when happy, pale when thinking, pink with a tip waiting, spinning pink when celebrating). Hair version: petals become curls. |
| `C-salon-kitty.png` | **C. Salon Kitty**: a tiny round cat with pink paw-beans and painted nail tips, holding a polish brush; her tail goes up when happy. Hair version: the same cat with a comb or scissors (the easiest swap). |
| `all-concepts.png` | The whole page |

Each sheet shows: idle, talking, happy/proud, thinking (hint), tip waiting, celebrating (level-up); the 56 px bubble,
the bubble with a badge, the bubble in the 320 px chat strip, the 160 px panel size; one sample accessory (A glasses,
B scarf, C bow), and all five accessory slots at once (head bow, face glasses, neck scarf, held gold brush, lavender
colour) to show dress-up fits each design.

To switch the game to the pick: set `"skin"` in `src/game/config/mascot.json` to `polish-bottle`, `hoa-mai` or
`salon-kitty` (now `placeholder`). Nothing else changes.
