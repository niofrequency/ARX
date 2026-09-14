# Clothing library (Image 3)

Admin Library tab now has a **Clothing** grid next to Faces / Poses / Scene.

- Upload outfit examples (Chel wrap, saree, etc.)
- Click a card -> file is pushed to **Image 3**
- Prompt role is set to: copy garments/colors/fabric from image 3 onto the Image 1 woman. Do not copy the clothing-model face or body.

Slot in Firestore: `clothes` (`RefSlot` in `src/lib/poseRefStore.ts`).

Apply the matching UI block in `src/components/AdminRandomPrompt.tsx` (Clothing · Image 3 section + saveClothes/addClothes/loadLibItem clothes branch). Patched copy is in the working tree as AdminRandomPrompt clothing section.
