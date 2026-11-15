# Round 2 — owner list and playtest checklist

> SAFE TO PAUSE after story 043 (commit `9fa1058`). Stories 046–052, 044, 045, 043 are done; each was reviewed by the
> overseer and its follow-ups are folded into the next commit.

## What changed (for the owner's playtest)

| Story | What to try |
|---|---|
| 046 | Tap 🎤 Nói, say a line: it waits in the box with a 3-second fill on Gửi; tap the box to fix it first. |
| 047 | Paint: is it smooth on your phone? The bottom row has a word under every icon. The reply box grows. |
| 048 | A client asks to fix an edge, or (Colour redo) for a new colour: 🔧 Sửa lại, Remover, Remove all. Leave one unfixed and see the results and Mai's note. |
| 049 | The steps 1 Dáng › 2 Độ dài › 3 Màu › 4 Trang trí with ✓, the instruction over the palm, ? Hướng dẫn. First appointment: the walk-through. |
| 051 | Độ dài: Ngắn / Vừa / Dài / Rất dài (hard clients), drawn on the hand; "a little shorter" is a fix. |
| 052 | The brush under your finger, 🧽 Lau → Chà or ✨ Lau viền, ↶ Hoàn tác, the hand switch over the hand (two hands). |
| 050 | Finish a set: the polaroid first, then the payment; Hồ sơ → Tác phẩm → Lưu vào điện thoại. |
| 044 | Cài đặt → Bảng giá: Bình dân / Vừa / Sang or your own; 📋 Bảng giá during consultation and checkout; the bill. |
| 045 | Cài đặt → Tốc độ nói của khách: Chậm / Vừa / Nhanh (with the client's voice on). |
| 043 | Cài đặt → Mai đọc mẹo thành tiếng (off by default); open a tip. |

## OWNER decisions (defaults are in place; change any in the named config file)

- OWNER (047): painting smoothness on a real phone. This container has no GPU, so its fps is not a phone's; long tasks
  went from 24 to 0–7 on the first stroke. If painting still lags, tell us the phone model.
- OWNER (048): a fix done: mood +4 and problem handling at least 80; left open at Done: mood −8 and problem handling at
  most 40 (`config/fix-requests.json`).
- OWNER (051): nail lengths drawn at 1 / 1.22 / 1.45 / 1.7 × a short nail; length weight 15 in the match score, 45
  points less per step away (`config/nail-art.json`, `game/nail-art/match.ts`).
- OWNER (052): Clean edges takes 1.2 s per nail (`tidy.seconds` in `config/nail-art.json`). Overseer: keep for now.
- OWNER (050): nail photos stay on the phone (not in backup codes or the account). Moving them to the account needs
  Supabase storage.
- OWNER (044): prices never change mood, stars or tips; Brenda and Tom (price-sensitive) may say a total over $45 is
  "a bit pricey" (`config/menu.json` `pricey.over`, client data `priceSensitive`).
- OWNER (045): Fast is 1.35 × (Slow 0.8). Listen with the client's voice on and say if Fast should be faster or slower
  (`config/voice.json` `speechSpeed`).
- OWNER (043): Mai's Vietnamese tips need Azure (live) or a Vietnamese voice on the phone; without either she stays
  quiet rather than read Vietnamese with an English voice.
- OWNER: the version is still 1.0.0-rc.1 and What's new still lists round 1. Bump the version and write round 2's
  What's new before sending to testers (`config/whats-new.json`, `package.json`).
- OWNER-EMAIL: still waits until publishing.

## Still to check outside this container

- The overseer's real sign-up test on the live Supabase project (no account flow needed a change on our side).
- `npm run smoke:api` with the real keys (18 checks; the overseer ran 18/18 on 045).
- A Vietnamese speaker's read of the new vi text (steps, menu, fixes, settings).
