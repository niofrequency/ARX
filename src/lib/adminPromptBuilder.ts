export type ShotType = 'closeup' | 'medium' | 'far';
export type AngleType = 'low' | 'eye' | 'high';
export type TitSize = 'small' | 'medium' | 'big' | 'huge';
export type FaceMess = 'clean' | 'drool' | 'face_only' | 'bukkake' | 'bukkake_drool';

export interface CharacterDef {
  id: string;
  name: string;
  costume: string;
  hair: string;
}

export interface PoseDef {
  id: string;
  label: string;
  image2: string;
  block: string;
}

export interface BuilderOptions {
  character: CharacterDef;
  poseId: string;
  customPose?: string;
  shot: ShotType;
  angle: AngleType;
  titSize: TitSize;
  thickCellulite: boolean;
  plumpStomach: boolean;
  hairyPussy: boolean;
  faceMess: FaceMess;
  pussyCumPuddle: boolean;
}

export const CHARACTERS: CharacterDef[] = [
  { id: 'cammy', name: 'Cammy', hair: 'long blonde hair, beret off', costume: 'torn green thong leotard, red thong straps still on, wrecked and half-on' },
  { id: 'chunli', name: 'Chun-Li', hair: 'dark hair in double buns', costume: 'torn tight blue qipao, spiked bracelets, wrecked and half-on' },
  { id: 'juri', name: 'Juri Han', hair: 'dark purple-black fighter hair', costume: 'torn purple fighter suit, spiked choker, wrecked and half-on' },
  { id: 'tifa', name: 'Tifa Lockhart', hair: 'dark hair in a long ponytail', costume: 'torn white tank, suspenders down, short black skirt shoved up' },
  { id: '2b', name: '2B', hair: 'short white hair', costume: 'black leotard pulled aside, blindfold still on, black boots on, skirt gone' },
  { id: 'quiet', name: 'Quiet', hair: 'brown hair', costume: 'ripped soaked tactical bikini, boots still on' },
  { id: 'starfire', name: 'Starfire', hair: 'long flowing reddish-orange hair, not pink, not pigtails', costume: 'torn purple cape and silver armor pieces, wrecked and half-on' },
  { id: 'raven', name: 'Raven', hair: 'short dark violet hair, red forehead gem', costume: 'dark leotard pulled aside, hood half on, running dark makeup' },
  { id: 'ivy', name: 'Poison Ivy', hair: 'long red hair', costume: 'torn green leafy bodysuit, vines around her thighs, leaves in her hair' },
  { id: 'harley', name: 'Harley Quinn', hair: 'messy blonde pigtails with pink and blue tips', costume: 'wrecked red/blue jacket open, Daddys Lil Monster shirt yanked aside, smeared clown makeup' },
  { id: 'catwoman', name: 'Catwoman', hair: 'cowl pushed back, short black hair', costume: 'ripped black latex catsuit peeled open, whip on the floor' },
  { id: 'ww', name: 'Wonder Woman', hair: 'long dark wavy hair, broken gold tiara', costume: 'red/gold armor yanked open, lasso loose around one thigh' },
  { id: 'cersei', name: 'Cersei Lannister', hair: 'long blonde queen hair', costume: 'tight red Lannister gown ripped down the front, gold lion jewelry' },
  { id: 'dany', name: 'Daenerys', hair: 'long silver-blonde hair', costume: 'tight blue-white Targaryen gown ripped open' },
  { id: 'cleo', name: 'Cleopatra', hair: 'dark straight Egyptian wig with gold band', costume: 'white linen sheath ripped open, gold collar, snake cuffs' },
  { id: 'slave', name: 'Slave / handmaiden', hair: 'messy dark hair', costume: 'sheer wraps, metal collar, chains, wrecked and half-on' },
  { id: 'dexmom', name: "Dexter's Lab Mom", hair: 'big red 60s hair', costume: 'tight orange 1960s dress ripped open, pearls still on' },
  { id: 'sam', name: 'Sam (Totally Spies)', hair: 'long orange-red spy hair', costume: 'green spy catsuit unzipped' },
  { id: 'wednesday', name: 'Wednesday Addams', hair: 'black double braids', costume: 'black dress with white collar, wrecked and pulled open' },
  { id: 'starlight', name: 'Starlight (The Boys)', hair: 'long blonde hair', costume: 'torn star suit, flag cape off' },
  { id: 'lydia', name: 'Lydia Deetz', hair: 'black goth hair with red veil falling', costume: 'black wedding/goth dress ripped open' },
  { id: 'nun', name: 'The Nun', hair: 'hidden under wimple', costume: 'habit pulled open, wimple still on, half dressed as the nun' },
  { id: 'elvira', name: 'Elvira', hair: 'huge black beehive falling apart', costume: 'tight black gown ripped open' },
  { id: 'joi', name: 'Joi (Blade Runner 2049)', hair: 'dark holographic bob', costume: 'orange silk robe hanging open' },
  { id: 'cyber', name: 'Cyberpunk street samurai', hair: 'neon-streaked messy hair', costume: 'torn neon bodysuit and mesh, chrome jewelry' },
  { id: 'egirl', name: 'E-girl', hair: 'messy colored e-girl hair', costume: 'black tank yanked aside, striped arm warmers, choker' },
  { id: 'hooker', name: 'Dirty street hooker', hair: 'messy cheap dyed hair', costume: 'cheap tight mini ripped, smeared lipstick, wrecked club clothes' },
  { id: 'trailer', name: 'Trailer-trash woman', hair: 'messy mullet or clip-in hair', costume: 'tied-up flannel open, cutoff shorts yanked aside' },
  { id: 'teacher', name: 'Teacher', hair: 'messy bun falling out', costume: 'tight blouse unbuttoned, glasses still on, pencil skirt shoved up' },
  { id: 'nurse', name: 'Nurse', hair: 'hair falling out of a cap', costume: 'tight nurse dress unbuttoned, cap crooked' },
  { id: 'maid', name: 'French maid', hair: 'messy updo', costume: 'French maid dress yanked open, apron still on' },
  { id: 'prisoner', name: 'Prisoner', hair: 'messy prison hair', costume: 'orange jumpsuit unzipped and pulled open' },
];

export const POSES: PoseDef[] = [
  { id: 'spread', label: 'On back, legs spread', image2: 'Spread-leg front ref. Thighs wide, pussy toward camera.', block: 'She is on her back holding her thighs open, legs spread wide toward the camera. Pussy facing the viewer. She looks at the viewer. Direct eye contact. Mouth open, wrecked slutty expression.' },
  { id: 'front_pussy', label: 'Front pussy close-up', image2: 'Front crotch close-up, hips toward camera, thighs spread.', block: 'Front view. Hips toward the camera. Thighs spread. Extreme front pussy close-up. Pussy fills the frame. Face still visible above. She looks at the viewer. Direct eye contact.' },
  { id: 'squat_leg', label: 'Squat, one leg raised', image2: 'Squatting woman, one leg lifted. Low-angle squat ref if you have one.', block: 'She is squatting. One leg raised and opened to the side. Pussy facing the camera. She looks down at the viewer. Direct eye contact. Mouth open, wrecked slutty expression.' },
  { id: 'doggy', label: 'Doggystyle', image2: 'Doggystyle / all-fours rear pose. Ass and pussy from behind.', block: 'Doggystyle. On all fours. Ass toward the camera, pussy visible from behind. She looks back over her shoulder at the viewer. Direct eye contact.' },
  { id: 'ass', label: 'Ass shot', image2: 'Kneeling rear ass shot, cheeks spread, looking back.', block: 'Rear ass shot. Kneeling or bent, cheeks spread, pussy visible from behind. She looks back at the viewer. Direct eye contact over her shoulder.' },
  { id: 'missionary', label: 'Missionary, legs up', image2: 'On her back, legs up or on shoulders, pussy toward camera.', block: 'Missionary. On her back, legs up and open. Pussy toward the camera. Face visible. She looks at the viewer. Direct eye contact.' },
  { id: 'cowgirl', label: 'Cowgirl', image2: 'Straddling / sitting facing camera, thighs open.', block: 'Cowgirl. Sitting up facing the viewer, thighs open around the camera. Pussy visible. She looks at the viewer. Direct eye contact.' },
  { id: 'reverse_cowgirl', label: 'Reverse cowgirl', image2: 'Sitting facing away, looking back, ass toward camera.', block: 'Reverse cowgirl. Sitting facing away, ass toward the camera, looking back at the viewer. Direct eye contact over her shoulder.' },
  { id: 'kneeling_bj', label: 'Kneeling, face forward', image2: 'Kneeling woman looking up at camera, face close.', block: 'She is kneeling facing the viewer. Face and chest toward camera. She looks up at the viewer. Direct eye contact. Mouth open, wrecked slutty expression.' },
  { id: 'bent_over', label: 'Bent over, tits hanging', image2: 'Bent forward, tits hanging, pussy or cleavage in frame.', block: 'Bent over forward. Big tits hanging down. Pussy and hanging tits in the same frame if the crop allows. She looks at the viewer. Direct eye contact.' },
  { id: 'standing_wall', label: 'Standing against wall', image2: 'Standing, one leg up or thighs apart against a wall.', block: 'Standing against a wall. One leg lifted or thighs apart. She looks at the viewer. Direct eye contact.' },
  { id: 'custom', label: 'Custom pose', image2: 'Use a photo of that exact pose as Image 2 if you have one.', block: '' },
];

const SHOT_LINE: Record<ShotType, string> = {
  closeup: 'Close-up crop. Subject fills the frame. Pussy or ass is large in the foreground if the pose shows it. Face still readable.',
  medium: 'Medium shot. Face, tits, and sex pose all readable in one frame. Not an extreme crop.',
  far: 'Farther shot. More of her body and outfit in frame. Pose still clear. Face still visible.',
};

const ANGLE_LINE: Record<AngleType, string> = {
  low: 'Low angle. Camera low, looking up at her.',
  eye: 'Eye-level angle. Camera at the same height as the main subject.',
  high: 'High angle. Camera above her, looking down.',
};

const TIT_LINE: Record<TitSize, string> = {
  small: 'Small natural tits.',
  medium: 'Medium full tits.',
  big: 'Big heavy tits.',
  huge: 'Huge tits. Make her tits much bigger.',
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
  const poseBlock =
    pose.id === 'custom'
      ? `Custom sex pose: ${opts.customPose?.trim() || 'use the pose in image 2'}. Follow that pose exactly. She looks at the viewer when the pose allows. Direct eye contact.`
      : pose.block;

  const body: string[] = [];
  body.push(TIT_LINE[opts.titSize]);
  if (opts.thickCellulite) body.push('Thick outer thighs with visible cellulite. Heavy natural thighs, not skinny, not airbrushed smooth.');
  if (opts.plumpStomach) body.push('A little plump stomach.');
  if (opts.hairyPussy) body.push('Hairy pussy. Visible pubic hair. Natural bush, not shaved bald.');
  else body.push('Naked pussy exposed.');

  const mess: string[] = [];
  if (opts.faceMess === 'clean') mess.push('No bukkake. No cum on her face. Keep her face clean.');
  else if (opts.faceMess === 'drool') mess.push('No bukkake. Mouth open, spit and drool running from her tongue and lips down her chin.');
  else if (opts.faceMess === 'face_only') mess.push('Bukkake face only. Face full of cum. Thick white sticky semen on her forehead, eyebrows, eyelashes, eyes, nose, cheeks, lips, and chin. Fat ropes and clumps on the face only. Do not cover her whole body in cum. Mouth open with cum on her tongue and lips.');
  else mess.push(`Heavy messy bukkake. Face full of cum. Thick white sticky semen on her forehead, eyebrows, eyelashes, eyes, nose, cheeks, lips, chin, and tits. Fat ropes and clumps, not a thin glaze. Mouth open with cum coming out over her tongue and lips${opts.faceMess === 'bukkake_drool' ? ', spit mixed with cum, long strands drooling down' : ', a long strand drooling down'}.`);
  if (opts.pussyCumPuddle) mess.push('Pussy full of cum, dripping out. A messy puddle of cum and squirt is visible on the floor under her.');

  const prompt = [
    `Image 1 is the only identity reference. Keep her exact face details from image 1: exact face shape, bone structure, eyes, nose, lips, skin color, skin tone, and likeness. Do not change who she is. Do not copy the woman from image 2.`,
    `Dress her as ${opts.character.name}. ${opts.character.hair}. ${opts.character.costume}. Accurate character clothing, wrecked and half-on. Use the character's real hairstyle, not the reference photo hair unless it already matches.`,
    `If Image 2 is present, use it only for pose and camera. ${poseBlock}`,
    SHOT_LINE[opts.shot],
    ANGLE_LINE[opts.angle],
    body.join(' '),
    `Keep exact same skin color and skin tone from image 1. Highly detailed photorealistic skin: visible pores, natural texture, fine peach fuzz, subtle oil sheen, realistic micro-detail.`,
    mess.join(' '),
    `Photorealistic. Identity only from image 1. Pose from the chosen pose and Image 2. Do not change identity, age, or face shape.`,
  ].join('\n\n');

  return {
    prompt,
    image1: 'Subject face / likeness.',
    image2: pose.image2,
    summary: `${opts.character.name} · ${pose.label} · ${opts.shot} · ${opts.angle} · ${opts.faceMess}`,
  };
}
