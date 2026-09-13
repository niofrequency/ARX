import { backgroundFor } from './characterBackgrounds';
export type ShotType = 'closeup' | 'medium' | 'far';
export type AngleType = 'low' | 'eye' | 'high';
export type TitSize = 'small' | 'medium' | 'big' | 'huge';
export type FaceMess = 'clean' | 'drool' | 'face_only' | 'bukkake' | 'bukkake_drool';
export type PoseFamily = 'front' | 'rear' | 'face' | 'tits' | 'other' | 'custom';

export interface CharacterDef { id: string; name: string; costume: string; hair: string; background?: string; }
export interface PoseDef { id: string; label: string; family: PoseFamily; image2: string; block: string; }
export interface BuilderOptions {
  character: CharacterDef; poseId: string; customPose?: string; shot: ShotType; angle: AngleType;
  titSize: TitSize; thickCellulite: boolean; plumpStomach: boolean; hairyPussy: boolean;
  faceMess: FaceMess; pussyCumPuddle: boolean;
}

export { CHARACTERS, POSES, POSE_FAMILIES } from './adminPromptData';
import { CHARACTERS, POSES } from './adminPromptData';

const SHOT_LINE: Record<ShotType, string> = {
  closeup: 'Close-up crop. Subject fills the frame. Face still readable unless this is an extreme face shot.',
  medium: 'Medium shot. Face, tits, and pose all readable. Not an extreme crop.',
  far: 'Farther shot. More of her body and outfit in frame. Pose still clear. Face still visible.',
};
const ANGLE_LINE: Record<AngleType, string> = {
  low: 'Low angle. Camera low, looking up at her.',
  eye: 'Eye-level angle. Camera at the same height as the main subject.',
  high: 'High angle. Camera above her, looking down.',
};
const TIT_LINE: Record<TitSize, string> = {
  small: 'Small natural tits.', medium: 'Medium full tits.', big: 'Big heavy tits.', huge: 'Huge tits. Make her tits much bigger.',
};

export function pickRandomCharacter(excludeId?: string): CharacterDef {
  const pool = excludeId ? CHARACTERS.filter((c) => c.id !== excludeId) : CHARACTERS;
  return pool[Math.floor(Math.random() * pool.length)];
}
export function pickRandomPose(excludeId?: string): PoseDef {
  const pool = POSES.filter((p) => p.id !== 'custom' && p.id !== excludeId);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function assembleAdminPrompt(opts: BuilderOptions): { prompt: string; image1: string; image2: string; summary: string } {
  const pose = POSES.find((p) => p.id === opts.poseId) ?? POSES[0];
  const poseBlock = pose.id === 'custom'
    ? `Custom sex pose: ${opts.customPose?.trim() || 'use the pose in image 2'}. Follow that pose exactly. She looks at the viewer when the pose allows.`
    : pose.block;
  const body: string[] = [TIT_LINE[opts.titSize]];
  if (opts.thickCellulite) body.push('Thick outer thighs with visible cellulite. Heavy natural thighs, not skinny.');
  if (opts.plumpStomach) body.push('A little plump stomach.');
  body.push(opts.hairyPussy ? 'Hairy pussy. Visible pubic hair.' : 'Naked pussy exposed.');
  const mess: string[] = [];
  if (opts.faceMess === 'clean') mess.push('No bukkake. Keep her face clean.');
  else if (opts.faceMess === 'drool') mess.push('No bukkake. Mouth open, spit and drool running down her chin.');
  else if (opts.faceMess === 'face_only') mess.push('Bukkake face only. Face full of cum. Thick white sticky semen on forehead, eyes, nose, cheeks, lips, chin. Face only, not the whole body.');
  else mess.push(`Heavy messy bukkake. Face full of cum. Thick white sticky semen on face and tits. Fat ropes, not a thin glaze${opts.faceMess === 'bukkake_drool' ? ', spit mixed with cum' : ''}.`);
  if (opts.pussyCumPuddle) mess.push('Pussy full of cum, dripping out. A puddle of cum and squirt on the floor under her.');
  const prompt = [
    `Image 1 is the only identity reference. Keep her exact face details from image 1. Do not copy the woman from image 2.`,
    `Dress her as ${opts.character.name}. ${opts.character.hair}. ${opts.character.costume}. Accurate character clothing, wrecked and half-on.`,
    `Background: ${backgroundFor(opts.character)} Match the location to her character vibe. Dirty and lived-in. Not a blank studio, not a random bedroom unless that is her world.`,
    `If Image 2 is present, use it only for pose and camera. ${poseBlock}`,
    SHOT_LINE[opts.shot], ANGLE_LINE[opts.angle], body.join(' '),
    `Keep exact same skin color from image 1. Highly detailed photorealistic skin: visible pores, natural texture, fine peach fuzz.`,
    mess.join(' '),
    `Photorealistic. Identity only from image 1. Pose from Image 2 and the chosen pose. Do not change identity, age, or face shape.`,
  ].join('\n\n');
  return { prompt, image1: 'Subject face / likeness.', image2: pose.image2, summary: `${opts.character.name} \u00b7 ${pose.label} \u00b7 ${opts.shot}/${opts.angle} \u00b7 ${opts.faceMess}` };
}
