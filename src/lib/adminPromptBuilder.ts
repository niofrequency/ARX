export type ShotType = 'closeup' | 'medium' | 'far';
export type AngleType = 'low' | 'eye' | 'high';
export type TitSize = 'small' | 'medium' | 'big' | 'huge';
export type FaceMess = 'clean' | 'drool' | 'face_only' | 'bukkake' | 'bukkake_drool';

export interface CharacterDef { id: string; name: string; costume: string; hair: string; }
export interface PoseDef { id: string; label: string; image2: string; block: string; }
export interface BuilderOptions {
  character: CharacterDef; poseId: string; customPose?: string; shot: ShotType; angle: AngleType;
  titSize: TitSize; thickCellulite: boolean; plumpStomach: boolean; hairyPussy: boolean;
  faceMess: FaceMess; pussyCumPuddle: boolean;
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
  { id: 'batgirl', name: 'Batgirl', hair: 'red hair, cowl off', costume: 'torn bat suit, yellow bat emblem still on, cape under her' },
  { id: 'supergirl', name: 'Supergirl', hair: 'long blonde hair', costume: 'S-shield top shoved up, red skirt gone, cape used as a blanket' },
  { id: 'powergirl', name: 'Power Girl', hair: 'short blonde hair', costume: 'busted white suit, chest window ripped wider, cape still under her' },
  { id: 'blackcanary', name: 'Black Canary', hair: 'blonde canary hair', costume: 'canary jacket open, fishnets, leather pants off' },
  { id: 'huntress', name: 'Huntress', hair: 'black hair, mask off', costume: 'ripped purple leather, crossbow on the floor' },
  { id: 'zatanna', name: 'Zatanna', hair: 'long black hair, top hat fallen', costume: 'white shirt and tie open, fishnets, wand on the couch' },
  { id: 'blackwidow', name: 'Black Widow', hair: 'short red widow cut', costume: 'unzipped black tactical catsuit, empty holsters' },
  { id: 'widowmaker', name: 'Widowmaker', hair: 'long dark blue-black hair', costume: 'torn purple-pink catsuit peeled open' },
  { id: 'tracer', name: 'Tracer', hair: 'short brown spiked hair', costume: 'orange bomber jacket open, tight pants yanked down' },
  { id: 'ada', name: 'Ada Wong', hair: 'shoulder-length dark hair', costume: 'red dress split open, slit to the hip, heels still on' },
  { id: 'jill', name: 'Jill Valentine', hair: 'brown shoulder-length hair', costume: 'torn S.T.A.R.S. top, blue skirt shoved up' },
  { id: 'claire', name: 'Claire Redfield', hair: 'red ponytail', costume: 'red jacket open, tight jeans yanked down' },
  { id: 'aerith', name: 'Aerith', hair: 'long brown hair, pink ribbon messy', costume: 'pink dress shoved up, jacket off' },
  { id: 'bayonetta', name: 'Bayonetta', hair: 'long black hair, glasses crooked', costume: 'torn black leather, guns on the floor' },
  { id: 'samus', name: 'Samus Aran', hair: 'long blonde hair', costume: 'Zero Suit peeled down to her thighs, helmet on the table' },
  { id: 'zelda', name: 'Zelda', hair: 'long blonde princess hair', costume: 'torn pink-white royal gown, gold jewelry still on' },
  { id: 'mai', name: 'Mai Shiranui', hair: 'long brown hair with gold ornaments', costume: 'ripped red kunoichi outfit, obi undone' },
  { id: 'sakura', name: 'Sakura Kasugano', hair: 'short brown hair with red ribbon', costume: 'torn white sailor school outfit' },
  { id: 'android18', name: 'Android 18', hair: 'blonde bob', costume: 'torn black capsule jacket, blue jean shorts yanked aside' },
  { id: 'hinata', name: 'Hinata', hair: 'dark hair in a long ponytail or loose', costume: 'ripped lavender ninja jacket, fishnets' },
  { id: 'tsunade', name: 'Tsunade', hair: 'long blonde hair', costume: 'green haori open, grey top yanked aside' },
  { id: 'makima', name: 'Makima', hair: 'long red hair with bangs', costume: 'white shirt and black tie open' },
  { id: 'yor', name: 'Yor Forger', hair: 'long black hair with red gems', costume: 'ripped black goldthorn dress' },
  { id: 'zerotwo', name: 'Zero Two', hair: 'long pink hair, small red horns', costume: 'torn red pilot plugsuit' },
  { id: 'asuka', name: 'Asuka Langley', hair: 'long orange hair with blue clips', costume: 'ripped red plugsuit' },
  { id: 'rei', name: 'Rei Ayanami', hair: 'short pale blue hair', costume: 'torn white plugsuit' },
  { id: 'velma', name: 'Velma', hair: 'short auburn bob, glasses still on', costume: 'orange sweater yanked up, skirt shoved aside' },
  { id: 'daphne', name: 'Daphne', hair: 'long purple-red hair', costume: 'purple dress ripped open, pink scarf still on' },
  { id: 'misty', name: 'Misty', hair: 'orange ponytail', costume: 'yellow crop top yanked aside, denim shorts off' },
  { id: 'jessie', name: 'Jessie (Team Rocket)', hair: 'long magenta hair', costume: 'white Team Rocket crop ripped open' },
  { id: 'peach', name: 'Princess Peach', hair: 'long blonde hair with a crown', costume: 'pink gown ripped down the front' },
  { id: 'maeve', name: 'Queen Maeve', hair: 'long dark hair', costume: 'torn gold-black The Boys armor' },
  { id: 'kimiko', name: 'Kimiko', hair: 'black messy hair', costume: 'torn dark tactical clothes' },
  { id: 'morticia', name: 'Morticia Addams', hair: 'long straight black hair', costume: 'tight black gown ripped open' },
  { id: 'ladyD', name: 'Lady Dimitrescu', hair: 'black hair, hat off', costume: 'white blouse ripped open, black gloves still on' },
  { id: 'elektra', name: 'Elektra', hair: 'keep her hair color from image 1 unless specified', costume: 'red fabric strips, sai on the bed' },
  { id: 'blackcat', name: 'Black Cat', hair: 'white hair, mask pushed up', costume: 'torn black latex with white fur trim' },
];

export const POSES: PoseDef[] = [
  { id: 'spread', label: 'On back, legs spread', image2: 'Spread-leg front ref. Thighs wide, pussy toward camera.', block: 'She is on her back holding her thighs open, legs spread wide toward the camera. Pussy facing the viewer. She looks at the viewer. Direct eye contact. Mouth open, wrecked slutty expression.' },
  { id: 'front_pussy', label: 'Front pussy close-up', image2: 'Front crotch close-up, hips toward camera, thighs spread.', block: 'Front view. Hips toward the camera. Thighs spread. Extreme front pussy close-up. Pussy fills the frame. Face still visible above. She looks at the viewer. Direct eye contact.' },
  { id: 'squat_leg', label: 'Squat, one leg raised', image2: 'Squatting woman, one leg lifted.', block: 'She is squatting. One leg raised and opened to the side. Pussy facing the camera. She looks down at the viewer. Direct eye contact. Mouth open, wrecked slutty expression.' },
  { id: 'doggy', label: 'Doggystyle', image2: 'Doggystyle / all-fours rear pose.', block: 'Doggystyle. On all fours. Ass toward the camera, pussy visible from behind. She looks back over her shoulder at the viewer. Direct eye contact.' },
  { id: 'ass', label: 'Ass shot', image2: 'Kneeling rear ass shot, cheeks spread, looking back.', block: 'Rear ass shot. Kneeling or bent, cheeks spread, pussy visible from behind. She looks back at the viewer. Direct eye contact over her shoulder.' },
  { id: 'missionary', label: 'Missionary, legs up', image2: 'On her back, legs up, pussy toward camera.', block: 'Missionary. On her back, legs up and open. Pussy toward the camera. Face visible. She looks at the viewer. Direct eye contact.' },
  { id: 'cowgirl', label: 'Cowgirl', image2: 'Straddling facing camera, thighs open.', block: 'Cowgirl. Sitting up facing the viewer, thighs open. Pussy visible. She looks at the viewer. Direct eye contact.' },
  { id: 'reverse_cowgirl', label: 'Reverse cowgirl', image2: 'Sitting facing away, looking back.', block: 'Reverse cowgirl. Sitting facing away, ass toward the camera, looking back at the viewer. Direct eye contact over her shoulder.' },
  { id: 'kneeling_bj', label: 'Kneeling, face forward', image2: 'Kneeling woman looking up at camera.', block: 'She is kneeling facing the viewer. Face and chest toward camera. She looks up at the viewer. Direct eye contact. Mouth open, wrecked slutty expression.' },
  { id: 'bent_over', label: 'Bent over, tits hanging', image2: 'Bent forward, tits hanging.', block: 'Bent over forward. Big tits hanging down. She looks at the viewer. Direct eye contact.' },
  { id: 'standing_wall', label: 'Standing against wall', image2: 'Standing, one leg up against a wall.', block: 'Standing against a wall. One leg lifted or thighs apart. She looks at the viewer. Direct eye contact.' },
  { id: 'face_closeup', label: 'Face close-up', image2: 'Tight face close-up filling the frame.', block: 'Extreme face close-up. Face fills the frame. She looks directly at the viewer. Direct eye contact. Mouth open, wrecked slutty expression. No extra people.' },
  { id: 'facial_closeup', label: 'Facial close-up (bukkake face)', image2: 'Tight face close-up for a facial.', block: 'Extreme face close-up. Face fills the frame. She looks directly at the viewer. Direct eye contact. Mouth open. Face full of cum, messy bukkake facial. This is a face shot, not a body shot.' },
  { id: 'bj_pov', label: 'Blowjob POV', image2: 'Kneeling, mouth toward camera, looking up.', block: 'Blowjob POV. She is kneeling. Camera is the viewer. Mouth toward the camera, looking up at the viewer. Direct eye contact. Mouth open.' },
  { id: 'titjob', label: 'Titjob', image2: 'On her knees, tits pressed together toward camera.', block: 'Titjob pose. On her knees. Big tits pressed together toward the camera. She looks up at the viewer. Direct eye contact.' },
  { id: 'mating_press', label: 'Mating press', image2: 'On her back, legs folded up to her chest.', block: 'Mating press. On her back, legs folded up toward her chest, pussy toward the camera. Face visible. She looks at the viewer. Direct eye contact.' },
  { id: 'prone_bone', label: 'Prone bone', image2: 'Face down, ass up.', block: 'Prone bone. Face down, ass up. Pussy visible from behind. She looks back at the viewer if the crop allows. Direct eye contact over her shoulder.' },
  { id: 'full_nelson', label: 'Full nelson', image2: 'Legs spread in the air, face toward camera.', block: 'Full nelson style. Legs spread in the air, pussy toward the camera, face toward the viewer. Direct eye contact. Mouth open.' },
  { id: 'standing_doggy', label: 'Standing doggy', image2: 'Bent standing, ass toward camera.', block: 'Standing doggystyle. Bent at the waist, ass toward the camera, pussy visible from behind. She looks back at the viewer. Direct eye contact.' },
  { id: 'facesit', label: 'Facesitting / smother', image2: 'Pussy or ass over camera, looking down.', block: 'Facesitting. Pussy and ass over the camera looking down at the viewer. She looks down at the viewer. Direct eye contact.' },
  { id: 'ahegao', label: 'Ahegao face close-up', image2: 'Tight wrecked face close-up.', block: 'Extreme face close-up. Face fills the frame. Ahegao wrecked expression, tongue out. She still looks at the viewer. Slutty ruined face.' },
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
    ? `Custom sex pose: ${opts.customPose?.trim() || 'use the pose in image 2'}. Follow that pose exactly. She looks at the viewer when the pose allows. Direct eye contact.`
    : pose.block;
  const body: string[] = [TIT_LINE[opts.titSize]];
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
    SHOT_LINE[opts.shot], ANGLE_LINE[opts.angle], body.join(' '),
    `Keep exact same skin color and skin tone from image 1. Highly detailed photorealistic skin: visible pores, natural texture, fine peach fuzz, subtle oil sheen, realistic micro-detail.`,
    mess.join(' '),
    `Photorealistic. Identity only from image 1. Pose from the chosen pose and Image 2. Do not change identity, age, or face shape.`,
  ].join('\n\n');
  return { prompt, image1: 'Subject face / likeness.', image2: pose.image2, summary: `${opts.character.name} · ${pose.label} · ${opts.shot} · ${opts.angle} · ${opts.faceMess}` };
}
