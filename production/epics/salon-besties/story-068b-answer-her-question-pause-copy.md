# Story 068b — The companion answers her open question; pause copy

Type: UI fix (overseer review of 068) · Owner playtest 5.

## What
1. **Help after a miss answers HER question.** When the player misses the client's open question, the companion's top card is built from that question and gives direct answers, not a tip about the last line:
   - choice ("Short or medium nails, please?") → "Short, please." / "Let's do short." / "Medium would be nice." (vi under each: "Dạ, mình làm ngắn nha." …; no hardcoded chị/em)
   - yes/no ("Can I …?") → "Yes, please." / "No, thank you."
   - anything else → a polite holding line.
   The header is "Answer her question:" / "Trả lời câu khách hỏi:", with no praise. Older tips stay below the buttons, never on top. The lines and Vietnamese words are in config/stuck.json (`answers`, `yesNoStart`, `words`); the logic is `answersFor` in game/stuck.ts.
2. **Pause copy.** "Game paused. Take your time." / "Tạm dừng trò chơi. Cứ từ từ nha."

## Acceptance
- [x] Unit: `answersFor` on the owner's question gives short/medium lines; yes/no; vi; a bad config is refused.
- [x] e2e (the owner's transcript): the top card says "Answer her question:" and mentions short or medium. Watched failing on the old code (4/4 failed), passing on the fix.
- [x] e2e: the pause overlay shows the new copy (en + vi).
- [x] Evidence: production/qa/evidence/story-068b/ (answer card, pause; en + vi, 320×568 @2×).

## OWNER
- OWNER: are three answer lines right for a choice question, or should it be just one per choice?
