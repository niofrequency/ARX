# ARX Admin — Strip Gallery + Clean Lock PRD

**Product:** ARX (`arx-engine.vercel.app` / `niofrequency/ARX`)  
**Surface:** Admin prompt factory only  
**Date:** 2026-09-14  
**Goal:** Generate a consistent-character gallery that reads as dressed → tease → pulled → half-nude → nude, one image at a time, without bukkake leaking when Clean is on.

---

## Problem

1. Admin always dressed her as “wrecked and half-on,” so every roll looked like the last frame of a porn set.
2. Face finish defaulted to **Face only** (a facial). Puddle defaulted on. The Facial close-up pose baked “face full of cum.” Image 2 pose refs often already have cum. Result: clicking off Bukkake still produced cum.
3. No first-class way to tease (pull top, one tit out, hike skirt, peel ass) while keeping the same face + character.
4. Character list was thin for slutty-accurate costumes. Chel (El Dorado) was missing.

## Non-goals

- No region segmenter / MediaPipe workbench in this PR.
- No auto-generate of all 5 frames in one click (one generate = one frame).
- No change to billing, Wavespeed, or Firebase rules.

---

## User flow (gallery)

Lock these across the set:

- Image 1 = face / identity
- Character dropdown (do not randomize)
- Lighting + Image 3 background
- Body sliders (tits / cellulite / plump / hairy)
- Face finish = **Clean** unless the last frames are meant to be messy

Change only:

1. **Strip stage** (1→5)
2. **Pose** (pick a matching tease/sex pose)

Generate. Paste. Run. Next stage.

Suggested pose pairing:

| Stage | Use these poses |
|---|---|
| 1 Dressed | standing wall, medium/far, eye or high |
| 2 Tease | pull top, one tit out, hike skirt, looking back undressing |
| 3 Pulled | peel ass, bent over, leaning cleavage, doggy still-clothed |
| 4 Half-nude | cowgirl, squat, ass shot, kneeling |
| 5 Nude | spread, front pussy, doggy, face close-up |

---

## Strip stages (wardrobe)

Type: `WardrobeStage = 'dressed' | 'tease' | 'pulled' | 'half' | 'nude'`

| ID | Label | Clothing rule | Genitals |
|---|---|---|---|
| dressed | 1 Dressed | Accurate costume on properly. Tight, not wrecked. | Covered. No nipples, pussy, ass crack. |
| tease | 2 Tease | Costume on. Hands pulling a strap / neckline / hem. Sliver of cleavage, underboob, or hip only. | Covered. |
| pulled | 3 Pulled | Costume yanked, still on the body. One or both tits out, or ass out. Mid-undress. | Peek allowed. |
| half | 4 Half-nude | Costume bunched at waist / one arm. Tits out. Ass or pussy by pose. | Visible. |
| nude | 5 Nude | Costume off or leftover on floor / ankle / wrist. | Visible. |

Assembler rules:

- Dress line uses `wardrobeLine` instead of always “wrecked and half-on.”
- “Naked pussy exposed” / hairy line only runs on **half** and **nude**.
- Default UI stage: **tease** (not nude).
- Summary includes the stage: `Chel · tease · Pulling top down · …`

---

## Face finish lock (bukkake leak)

Defaults:

- `faceMess = 'clean'`
- `pussyCumPuddle = false`

Clicking **Clean** also sets puddle off.

Prompt when Clean:

```
NO SEMEN. NO BUKKAKE. Keep her face and body clean.
Do not add cum, semen, ropes, glaze, or a facial.
Do not copy any cum from image 2 even if the pose reference has it.
Ignore semen in the reference photos.
No cum puddle. No creampie overlay.
```

Drool = spit only, still no semen.

Face only / Bukkake / Bukkake+drool are the only paths that request cum.

Puddle is ignored unless finish is a cum mode.

`facial_closeup` pose block no longer contains “Face full of cum.” Cum comes only from Face finish.

---

## New tease poses

| ID | Label | Family |
|---|---|---|
| pull_top | Pulling top down | tits |
| one_tit | One tit out | tits |
| hike_skirt | Hiking skirt / flashing | front |
| peel_ass | Peeling clothes off ass | rear |
| undress_look | Looking back, undressing | rear |

Existing sex poses stay. Custom pose still works.

---

## Characters

Keep existing roster. Add at least:

- Chel (The Road to El Dorado) — dark wavy hair, gold headband, teal-and-gold wrap, gold belt and cuffs
- Aerith, Yuffie, Lightning, Ciri
- D.Va, Mercy, Tracer, Sombra, Kiriko, Reyna, Sage, Jett
- Evelynn, Akali, Katarina
- Nami, Nico Robin, Boa Hancock
- Hinata, Tsunade
- Yor, Power, Himeno, Lucy (Edgerunners)
- Misty
- Cheerleader, Secretary, Flight attendant, Bunny girl, Latex doll, Goth slut, Wrecked idol, Cowgirl

Costume text stays slutty/accurate and **wrecked** at the character-def level. The wardrobe stage decides whether that wreck is applied this frame (dressed ignores wreck; nude drops the garment).

---

## Admin UI

Scene tab, one new block above Body:

**Strip stage · same girl, one frame at a time**  
Five pills: `1 Dressed` `2 Tease` `3 Pulled` `4 Half-nude` `5 Nude`  
Hint: lock the character; change only stage + pose.

Do not add a sixth tab. Do not auto-roll wardrobe when character lock is on.

---

## Files

- `src/lib/adminPromptBuilder.ts` (mirror `lib/adminPromptBuilder.ts` if that copy is still imported)
- `src/components/AdminRandomPrompt.tsx`
- `docs/ARX_Admin_Strip_Gallery_PRD.md` (this document)

---

## Acceptance

- [ ] Clean + generate → pasted prompt contains `NO SEMEN` and does not request bukkake or a puddle.
- [ ] Face only / Bukkake still request cum.
- [ ] Stage 1 prompt forbids nipples / pussy / ass crack.
- [ ] Stage 2 prompt keeps costume on and only teases.
- [ ] Stage 5 prompt is fully nude.
- [ ] Chel appears in the character dropdown.
- [ ] Pulling top down / one tit / hike skirt / peel ass / undress look appear under the matching pose family.
- [ ] Lock character + walk 1→5 with different poses produces five prompts that only change wardrobe + pose text.
- [ ] Vercel build passes (`AdminRandomPrompt` import of `WARDROBE_STAGES` resolves).

---

## Later (not this PR)

- One-click “export 5 prompts” zip.
- Per-stage Image 2 preset (dressed ref, tease ref, nude ref).
- Auto-advance stage after a successful generation.
- Wardrobe-aware costume strings (dressed uses intact outfit copy, not the wrecked line).
