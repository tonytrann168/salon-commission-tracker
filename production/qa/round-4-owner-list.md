# Round 4: owner list and playtest checklist

> SAFE TO PAUSE after story 066 (round-4 polish). Stories 058–065 come from the owner's playtest of Sun 2026-11-15. The overseer
> reviewed each one, and its notes went into the next commit.

## What changed (for the owner's playtest)

| Story | What to try |
|---|---|
| 058 | After Done, at checkout, a client says something is wrong ("polish on my skin… more red than coral") → an orange **🔧 Sửa lại / Fix it** in the chat. It reopens the station on the Fix it step, and Done returns to checkout with her thanks. Saying "để em sửa" / "let me fix it" also shows it. |
| 059 | Agree a discount in the chat ("$35 instead of $40"). At checkout the **Total** step is pre-filled with $35: − / +, −$5, −10%, Menu price, or type a number. The receipt shows "Discount −$5". Try charging more than agreed: she notices and tips less. |
| 060 | While painting, the station has the screen. Her line pops with a ding (✕ to close, tap to reply), and the slim **💬 Trả lời / Reply** bar is at the bottom. 📋 is a small icon by the mood bar (never on her face). |
| 061 | Every line gets a small badge pinned to its corner: **Thử câu này 💡 / Được đó 👍 / Hay lắm ✨ / Câu chuẩn luôn! 🌟**. Only the last gets confetti. |
| 062 | Come back the next day to a half-done day: **Làm tiếp Ngày N** or **Bắt đầu Ngày N+1** (no penalty; "Ngày 1: 2 khách ✓"). **📅 Khách hẹn hôm nay**: today's challenge ⭐ first, then booked guests with times and services (+5 XP each). |
| 063 | The new menu: 16 items in four groups with drawn icons. Settings → Bảng giá: Bình dân / Vừa / Sang. Clients order their usual ("#2 Gel mani + French"). |
| 064 | A hard client with a hangnail: Lau → **✂️ Kềm**, then hold gently on the pulsing ring. A quick snip slips (a tiny dot): **1 · Cầm máu**, **2 · Dán băng**, then say "xin lỗi". |
| 065 | A hard client brings **📷 a picture**: tap 📷 by the mood bar. At the results: "Hình mẫu và bộ móng của em" with **Giống N%**. |
| 066 | Polish: 📋 then 📷 for picture clients; her picture and your work drawn the same way; no "+0 coins" tile (three tiles). |

## OWNER decisions

The defaults are in place; change any of them in the config file named.

- OWNER (058): a fix offered by the player before she names one opens a clean-up (edge) (`config/fix-requests.json`
  `playerOffers`).
- OWNER (059): charging over the agreed price costs −2 mood per dollar (at most −20) and halves her tip. A small,
  unasked discount is +3 mood. Her tip follows what she pays (`config/payment.json` `charge`). Overseer: the Total
  step stays on every paid visit (the owner wants players to decide the final price).
- OWNER (060): a 25 ms vibration with her line, where the phone allows it. Say if it should be off by default.
- OWNER (061): Perfect needs 6+ English words and nothing to fix; a small fix (≤30% new words) is still Good
  (`config/juice.json` `grades`). Every line is checked, even after the tip cap. Overseer: keep this (the calls are
  cheap).
- OWNER (062): booked times start at 10:00, every 90 minutes, with +5 XP per booked guest (`config/path.json`
  `booked`). The appointment book (schedule, accept, reschedule) is noted for later in `design/game-brief.md`.
- OWNER (063): the three price sets (Mid is near the 2026 medians), in `config/menu.json`. The price-sensitive
  remark is now over $40. The icons are simple drawings; the designer's art can replace them
  (`game/ui/service-icon.ts`).
- OWNER (064): hold 0.9 s to trim; under 0.3 s slips. Slip −12, first aid +6, sorry +3, left at Done −4. Half of hard
  clients have a hangnail (`config/hangnail.json`).
- OWNER (065): 40% of hard clients bring a picture; the match counts ×1.5 for mood (`config/reference.json`). Real
  reference photos could replace the drawn ones later.
- OWNER: the version is still 1.0.0-rc.1; What's new lists round 1. Bump it and write What's new for rounds 2–4
  before sending to testers (`config/whats-new.json`, `package.json`).
- OWNER: the round-3 owner list's choices (coins, Perfect line frequency, tap sound, placeholder faces) still wait
  for your sign-off.

## Still to check outside this container

- `npm run smoke:api` with the real keys (the overseer ran 19/19 on 064, including the agreedTotal check).
- A Vietnamese speaker's read of the new text: Fix it, Total, the grades, the day choice, the menu names, the
  hangnail and first-aid terms, and the picture.
- On a real phone: the Nipper hold (and whether a pressure-sensitive screen slips too easily), the ding and the
  vibration.

## Waiting on the user (not the overseer)

- The subagent `model:` change in `.claude/agents/*.md` (Claude Code configuration) still needs the user's own
  approval in chat.
