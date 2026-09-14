export type ShotType = 'closeup' | 'medium' | 'far';
export type AngleType = 'low' | 'eye' | 'high';
export type TitSize = 'small' | 'medium' | 'big' | 'huge';
export type FaceMess = 'clean' | 'drool' | 'face_only' | 'bukkake' | 'bukkake_drool';
export type PoseFamily = 'front' | 'rear' | 'face' | 'tits' | 'other' | 'custom';
export type WardrobeStage = 'dressed' | 'tease' | 'pulled' | 'half' | 'nude';

export interface CharacterDef { id: string; name: string; costume: string; hair: string; }
export interface PoseDef { id: string; label: string; family: PoseFamily; image2: string; block: string; }
export interface BuilderOptions {
  character: CharacterDef; poseId: string; customPose?: string; shot: ShotType; angle: AngleType;
  titSize: TitSize; thickCellulite: boolean; plumpStomach: boolean; hairyPussy: boolean;
  faceMess: FaceMess; pussyCumPuddle: boolean;
  wardrobe?: WardrobeStage;
  matchImage2Pose?: boolean;
  keepImage1Accessories?: boolean;
  image3Role?: string;
}

export const POSE_FAMILIES: { id: PoseFamily; label: string }[] = [
  { id: 'front', label: 'Front / spread' },
  { id: 'rear', label: 'Rear / doggy' },
  { id: 'face', label: 'Face / oral' },
  { id: 'tits', label: 'Tits' },
  { id: 'other', label: 'Other' },
  { id: 'custom', label: 'Custom' },
];

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
  { id: 'blackwidow', name: 'Black Widow', hair: 'short red widow cut', costume: 'unzipped black tactical catsuit, empty holsters' },
  { id: 'widowmaker', name: 'Widowmaker', hair: 'long dark blue-black hair', costume: 'torn purple-pink catsuit peeled open' },
  { id: 'ada', name: 'Ada Wong', hair: 'shoulder-length dark hair', costume: 'red dress split open, slit to the hip, heels still on' },
  { id: 'samus', name: 'Samus Aran', hair: 'long blonde hair', costume: 'Zero Suit peeled down to her thighs, helmet on the table' },
  { id: 'mai', name: 'Mai Shiranui', hair: 'long brown hair with gold ornaments', costume: 'ripped red kunoichi outfit, obi undone' },
  { id: 'zerotwo', name: 'Zero Two', hair: 'long pink hair, small red horns', costume: 'torn red pilot plugsuit' },
  { id: 'asuka', name: 'Asuka Langley', hair: 'long orange hair with blue clips', costume: 'ripped red plugsuit' },
  { id: 'velma', name: 'Velma', hair: 'short auburn bob, glasses still on', costume: 'orange sweater yanked up, skirt shoved aside' },
  { id: 'peach', name: 'Princess Peach', hair: 'long blonde hair with a crown', costume: 'pink gown ripped down the front' },
  { id: 'maeve', name: 'Queen Maeve', hair: 'long dark hair', costume: 'torn gold-black The Boys armor' },
  { id: 'ladyD', name: 'Lady Dimitrescu', hair: 'black hair, hat off', costume: 'white blouse ripped open, black gloves still on' },
  { id: 'blackcat', name: 'Black Cat', hair: 'white hair, mask pushed up', costume: 'torn black latex with white fur trim' },
  { id: 'jinx', name: 'Jinx (Arcane)', hair: 'long blue-black twin braids', costume: 'torn crop top and low-slung pants, belts undone, wrecked and half-on' },
  { id: 'makima', name: 'Makima', hair: 'red hair in a low ponytail', costume: 'torn white dress shirt and tie, pulled open' },
  { id: 'rebecca', name: 'Rebecca (Edgerunners)', hair: 'short choppy pink hair', costume: 'ripped tactical crop top and shorts, wrecked and half-on' },
  { id: 'yennefer', name: 'Yennefer of Vengerberg', hair: 'long black curly hair', costume: 'torn black-and-white sorceress gown, obsidian star pendant' },
  { id: 'triss', name: 'Triss Merigold', hair: 'long wavy auburn hair', costume: 'torn green corset dress, wrecked and half-on' },
  { id: 'lara', name: 'Lara Croft', hair: 'long braided brown hair', costume: 'torn tank top and cargo shorts, gear straps hanging loose' },
  { id: 'jill', name: 'Jill Valentine', hair: 'short brown bob', costume: 'torn blue tactical vest and tube top, wrecked and half-on' },
  { id: 'bayonetta', name: 'Bayonetta', hair: 'long black hair, glasses off', costume: 'torn black bodysuit, peeled open at the chest' },
  { id: 'morrigan', name: 'Morrigan Aensland', hair: 'short green hair', costume: 'torn purple succubus bodysuit, bat-wing collar askew' },
  { id: 'shego', name: 'Shego', hair: 'short black hair', costume: 'torn green and black catsuit, zipper pulled down' },
  { id: 'ahri', name: 'Ahri', hair: 'long white-blonde hair, fox ears', costume: 'torn silk hanbok-style outfit, tails visible, wrecked and half-on' },
  { id: 'sailormoon', name: 'Sailor Moon', hair: 'long blonde twin-tail odango hair', costume: 'torn sailor fuku, tiara crooked, gloves still on' },
  { id: 'chel', name: 'Chel (The Road to El Dorado)', hair: 'long dark wavy hair, gold headband', costume: 'tiny teal-and-gold El Dorado wrap bikini ripped and hanging off, gold belt, arm cuffs, wrecked and half-on' },
  { id: 'aerith', name: 'Aerith', hair: 'long brown hair with a pink ribbon', costume: 'pink dress shoved up, jacket off, wrecked and half-on' },
  { id: 'yuffie', name: 'Yuffie Kisaragi', hair: 'short black ninja hair', costume: 'torn green ninja outfit, wrapping loose' },
  { id: 'lightning', name: 'Lightning Farron', hair: 'rose-pink swept hair', costume: 'torn military coat and skirt, wrecked and half-on' },
  { id: 'ciri', name: 'Ciri', hair: 'ash-blonde hair', costume: 'torn witcher leathers, wrecked and half-on' },
  { id: 'dva', name: 'D.Va', hair: 'dark hair with pink mouse clips', costume: 'torn pink-and-blue bodysuit, zipper down' },
  { id: 'mercy', name: 'Mercy', hair: 'blonde hair, halo crooked', costume: 'torn white-and-gold Valkyrie suit, peeled open' },
  { id: 'tracer', name: 'Tracer', hair: 'short spiked brown hair', costume: 'torn orange bomber jacket and shorts, wrecked' },
  { id: 'sombra', name: 'Sombra', hair: 'short purple-black hair', costume: 'torn purple cyber suit, peeled open' },
  { id: 'kiriko', name: 'Kiriko', hair: 'fox-ear hood off, dark hair', costume: 'torn green-and-white shrine outfit, wrecked and half-on' },
  { id: 'reyna', name: 'Reyna', hair: 'long dark hair with purple tips', costume: 'torn black-and-purple Valorant gear, unzipped' },
  { id: 'sage', name: 'Sage', hair: 'dark hair in a tail falling loose', costume: 'torn white healer robes, pulled open' },
  { id: 'jett', name: 'Jett', hair: 'short white hair', costume: 'torn teal-and-white duelist gear, wrecked' },
  { id: 'evelynn', name: 'Evelynn', hair: 'long pink-lavender hair, horns', costume: 'torn dark succubus latex, straps hanging' },
  { id: 'akali', name: 'Akali', hair: 'black-and-neon-pink k/da hair', costume: 'torn K/DA crop and shorts, wrecked and half-on' },
  { id: 'katarina', name: 'Katarina', hair: 'long red assassin hair', costume: 'torn dark Noxian leathers, pulled open' },
  { id: 'nami', name: 'Nami', hair: 'long orange hair', costume: 'torn orange bikini top and skirt, wrecked pirate look' },
  { id: 'robin', name: 'Nico Robin', hair: 'long dark hair', costume: 'torn purple coat and bikini, wrecked and half-on' },
  { id: 'boa', name: 'Boa Hancock', hair: 'long black hair', costume: 'torn red cheongsam, pulled open' },
  { id: 'hinata', name: 'Hinata', hair: 'long dark hair, shy bangs', costume: 'torn lavender jacket and shorts, wrecked' },
  { id: 'tsunade', name: 'Tsunade', hair: 'long blonde hair with a crown jewel', costume: 'torn green haori and grey top, wrecked and half-on' },
  { id: 'yor', name: 'Yor Forger', hair: 'long black hair, red-thorn headband', costume: 'torn black gold-rose dress, pulled open' },
  { id: 'powercsm', name: 'Power', hair: 'long blonde messy hair, small red horns', costume: 'torn white shirt, red long-sleeves, wrecked' },
  { id: 'himeno', name: 'Himeno', hair: 'short dark hair', costume: 'torn white shirt and slacks, wrecked and half-on' },
  { id: 'lucyedge', name: 'Lucy (Edgerunners)', hair: 'short silver-white hair', costume: 'torn black jacket and shorts, wrecked netrunner look' },
  { id: 'misty', name: 'Misty', hair: 'short orange hair', costume: 'torn yellow crop and shorts, suspenders down' },
  { id: 'cheer', name: 'Cheerleader', hair: 'high ponytail', costume: 'tiny wrecked cheer top and skirt, yanked aside' },
  { id: 'secretary', name: 'Secretary', hair: 'sleek office bun falling out', costume: 'tight blouse ripped open, pencil skirt hiked' },
  { id: 'flight', name: 'Flight attendant', hair: 'neat airline updo falling', costume: 'tight uniform dress unzipped, scarf still on' },
  { id: 'bunny', name: 'Bunny girl', hair: 'styled updo, bunny ears crooked', costume: 'torn black bunny leotard, fishnets, tail still on' },
  { id: 'latexdoll', name: 'Latex doll', hair: 'slicked wet-look hair', costume: 'ripped shiny black latex, peeled open' },
  { id: 'gothslut', name: 'Goth slut', hair: 'black hair with blunt bangs', costume: 'torn mesh top, choker, tiny skirt yanked aside' },
  { id: 'idol', name: 'Wrecked idol', hair: 'idol curls falling apart', costume: 'ripped stage costume, sparkle fabric hanging off' },
  { id: 'cowgirlfit', name: 'Cowgirl', hair: 'messy western waves', costume: 'tied flannel open, tiny denim shorts yanked aside, boots on' },
];

export const WARDROBE_STAGES: { id: WardrobeStage; label: string; block: string }[] = [
  { id: 'dressed', label: '1 Dressed', block: 'Fully dressed in accurate character clothing, fitted and on properly, not wrecked. No nudity. No nipples. No pussy. No ass crack. Teasing tightness only. This is the first frame of a strip sequence.' },
  { id: 'tease', label: '2 Tease', block: 'Still mostly dressed. She is teasing: pulling one strap down, tugging a neckline, hiking a hem. Partial cleavage or a sliver of underboob or hip, but nipples and pussy stay covered. Clothes still on. Second frame of a strip sequence.' },
  { id: 'pulled', label: '3 Pulled', block: 'Clothes pulled down or aside, not off. One or both tits out, or ass exposed while the outfit is still hanging on her body. She is mid-undress. Pussy may peek but the costume is still the outfit, just yanked. Third frame of a strip sequence.' },
  { id: 'half', label: '4 Half-nude', block: 'Half nude. Costume bunched at the waist, around one arm, or off the tits. Tits out. Ass or pussy visible depending on the pose. She still wears part of the character outfit. Fourth frame of a strip sequence.' },
  { id: 'nude', label: '5 Nude', block: 'Fully nude. Costume off or only leftover fabric on the floor or around an ankle/wrist. Body fully visible. Last frame of a strip sequence.' },
];

export const POSES: PoseDef[] = [
  { id: 'spread', label: 'On back, legs spread', family: 'front', image2: 'Front spread-leg ref.', block: 'She is on her back holding her thighs open, legs spread wide toward the camera. Pussy facing the viewer. Direct eye contact. Mouth open.' },
  { id: 'front_pussy', label: 'Front pussy close-up', family: 'front', image2: 'Front crotch close-up.', block: 'Front view. Hips toward the camera. Thighs spread. Extreme front pussy close-up. Face still visible above. Direct eye contact.' },
  { id: 'squat_leg', label: 'Squat, one leg raised', family: 'front', image2: 'Squat one-leg-up ref.', block: 'She is squatting. One leg raised and opened to the side. Pussy facing the camera. Looks down at the viewer. Direct eye contact.' },
  { id: 'missionary', label: 'Missionary, legs up', family: 'front', image2: 'Legs-up front ref.', block: 'Missionary. On her back, legs up and open. Pussy toward the camera. Face visible. Direct eye contact.' },
  { id: 'cowgirl', label: 'Cowgirl', family: 'front', image2: 'Facing-camera straddle ref.', block: 'Cowgirl. Sitting up facing the viewer, thighs open. Pussy visible. Direct eye contact.' },
  { id: 'mating_press', label: 'Mating press', family: 'front', image2: 'Legs folded to chest, front.', block: 'Mating press. On her back, legs folded up toward her chest, pussy toward the camera. Direct eye contact.' },
  { id: 'full_nelson', label: 'Full nelson', family: 'front', image2: 'Legs in the air, face toward camera.', block: 'Full nelson style. Legs spread in the air, pussy toward the camera, face toward the viewer. Direct eye contact.' },
  { id: 'doggy', label: 'Doggystyle', family: 'rear', image2: 'All-fours rear ref.', block: 'Doggystyle. On all fours. Ass toward the camera, pussy visible from behind. Looks back over her shoulder. Direct eye contact.' },
  { id: 'ass', label: 'Ass shot', family: 'rear', image2: 'Kneeling rear ass ref.', block: 'Rear ass shot. Kneeling or bent, cheeks spread, pussy visible from behind. Looks back at the viewer.' },
  { id: 'reverse_cowgirl', label: 'Reverse cowgirl', family: 'rear', image2: 'Sitting away, looking back.', block: 'Reverse cowgirl. Sitting facing away, ass toward the camera, looking back at the viewer.' },
  { id: 'prone_bone', label: 'Prone bone', family: 'rear', image2: 'Face down, ass up.', block: 'Prone bone. Face down, ass up. Pussy visible from behind. Looks back if the crop allows.' },
  { id: 'standing_doggy', label: 'Standing doggy', family: 'rear', image2: 'Standing bent, ass toward camera.', block: 'Standing doggystyle. Bent at the waist, ass toward the camera. Looks back at the viewer.' },
  { id: 'face_closeup', label: 'Face close-up', family: 'face', image2: 'Tight face close-up.', block: 'Extreme face close-up. Face fills the frame. Looks directly at the viewer. Mouth open, wrecked slutty expression.' },
  { id: 'facial_closeup', label: 'Facial close-up', family: 'face', image2: 'Tight face close-up for a facial.', block: 'Extreme face close-up. Face fills the frame. Looks directly at the viewer. Mouth open. This is a face shot, not a body shot.' },
  { id: 'ahegao', label: 'Ahegao face close-up', family: 'face', image2: 'Tight wrecked face close-up.', block: 'Extreme face close-up. Face fills the frame. Ahegao wrecked expression, tongue out. Still looks at the viewer.' },
  { id: 'kneeling_bj', label: 'Kneeling, face forward', family: 'face', image2: 'Kneeling looking up.', block: 'She is kneeling facing the viewer. Face and chest toward camera. Looks up at the viewer. Mouth open.' },
  { id: 'bj_pov', label: 'Blowjob POV', family: 'face', image2: 'Mouth toward camera, looking up.', block: 'Blowjob POV. Kneeling. Camera is the viewer. Mouth toward the camera, looking up. Direct eye contact.' },
  { id: 'titjob', label: 'Titjob', family: 'tits', image2: 'Tits pressed together toward camera.', block: 'Titjob pose. On her knees. Big tits pressed together toward the camera. Looks up at the viewer.' },
  { id: 'bent_over', label: 'Bent over, tits hanging', family: 'tits', image2: 'Bent forward, tits hanging.', block: 'Bent over forward. Big tits hanging down. Looks at the viewer.' },
  { id: 'standing_wall', label: 'Standing against wall', family: 'other', image2: 'Standing one-leg-up wall ref.', block: 'Standing against a wall. One leg lifted or thighs apart. Looks at the viewer.' },
  { id: 'facesit', label: 'Facesitting', family: 'other', image2: 'Pussy over camera looking down.', block: 'Facesitting. Pussy and ass over the camera looking down at the viewer.' },
  { id: 'legs_over_shoulders', label: 'Legs over shoulders', family: 'front', image2: 'Deep missionary, legs back.', block: 'Missionary with her legs pushed back over her shoulders, deep bend. Pussy toward the camera. Face still visible. Direct eye contact.' },
  { id: 'side_lying', label: 'Side-lying, leg raised', family: 'front', image2: 'Side view, top leg raised.', block: 'She is lying on her side, top leg raised and pulled toward her chest. Pussy visible from the front. Looks back at the viewer.' },
  { id: 'standing_split', label: 'Standing, leg up', family: 'front', image2: 'Standing, one leg propped up.', block: 'Standing, one leg propped up on a chair or ledge, pussy facing the camera. Looks at the viewer.' },
  { id: 'bent_over_desk', label: 'Bent over a surface', family: 'rear', image2: 'Bent over desk/table edge, rear.', block: 'Bent forward over a desk or table edge, ass toward the camera, pussy visible from behind. Looks back over her shoulder.' },
  { id: 'kneeling_rear', label: 'Kneeling, low rear angle', family: 'rear', image2: 'Kneeling, low rear angle.', block: 'Kneeling on the bed, low rear angle. Ass and pussy toward the camera. Looks back at the viewer.' },
  { id: 'standing_carry_rear', label: 'Standing carry, rear', family: 'rear', image2: 'Standing carry, rear view.', block: 'Standing carry position from behind, one leg lifted. Ass toward the camera. Direct eye contact over her shoulder.' },
  { id: 'pov_kissing', label: 'POV close, mouth toward camera', family: 'face', image2: 'POV close, mouth toward camera.', block: 'POV close-up, her mouth just in front of the camera as if about to kiss the viewer. Direct eye contact. Lips parted.' },
  { id: 'side_face_profile', label: 'Side face profile', family: 'face', image2: 'Side profile face close-up.', block: 'Side profile close-up of her face, mouth open, wrecked expression. Looks toward the camera from the side.' },
  { id: 'tits_pov', label: 'Tits POV, looking down', family: 'tits', image2: 'POV looking down at chest.', block: 'POV shot looking down at her chest. Big tits filling the lower frame. She looks up at the camera.' },
  { id: 'leaning_forward_cleavage', label: 'Leaning forward, cleavage', family: 'tits', image2: 'Leaning forward, deep cleavage.', block: 'Leaning forward toward the camera, tits pushed together and hanging, deep cleavage. Looks at the viewer.' },
  { id: 'mirror_shot', label: 'Mirror shot', family: 'other', image2: 'Standing in front of a mirror.', block: 'Standing in front of a mirror, body visible in the reflection. Looks at her own reflection or the viewer.' },
  { id: 'shower_wet', label: 'Wet, in the shower', family: 'other', image2: 'Standing in the shower, wet.', block: 'Standing in a shower, water running down her body, hair wet. Looks at the viewer.' },
  { id: 'pull_top', label: 'Pulling top down', family: 'tits', image2: 'Hands pulling top down.', block: 'Standing or kneeling facing the viewer. Both hands pulling her top down to flash her tits. Outfit still on. Direct eye contact.' },
  { id: 'one_tit', label: 'One tit out', family: 'tits', image2: 'One breast exposed, clothes on.', block: 'Mostly dressed. One tit pulled out of the costume. Other side still covered. Looks at the viewer.' },
  { id: 'hike_skirt', label: 'Hiking skirt / flashing', family: 'front', image2: 'Skirt hiked, flashing.', block: 'Standing. She hikes her skirt or shorts aside to flash her pussy, clothes otherwise on. Looks at the viewer.' },
  { id: 'peel_ass', label: 'Peeling clothes off ass', family: 'rear', image2: 'Hands peeling bottoms down.', block: 'Rear view. She peels shorts, skirt, or leotard down over her ass. Looks back at the viewer.' },
  { id: 'undress_look', label: 'Looking back, undressing', family: 'rear', image2: 'Look-back while undressing.', block: 'She looks back over her shoulder while pulling clothes off. Mid-undress. Direct eye contact.' },
  { id: 'custom', label: 'Custom pose', family: 'custom', image2: 'Use a photo of that exact pose as Image 2.', block: '' },
];

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

export function assembleAdminPrompt(opts: BuilderOptions): { prompt: string; image1: string; image2: string; image3: string; summary: string } {
  const pose = POSES.find((p) => p.id === opts.poseId) ?? POSES[0];
  const poseBlock = pose.id === 'custom'
    ? `Custom sex pose: ${opts.customPose?.trim() || 'use the pose in image 2'}. Copy that exact pose and body positioning. She looks at the viewer when the pose allows.`
    : pose.block;
  const image3Role = opts.image3Role?.trim() || 'background, clothing, or an object';
  const matchPose = opts.matchImage2Pose !== false;
  const keepAccessories = opts.keepImage1Accessories !== false;
  const body: string[] = [TIT_LINE[opts.titSize]];
  if (opts.thickCellulite) body.push('Thick outer thighs with visible cellulite. Heavy natural thighs, not skinny.');
  if (opts.plumpStomach) body.push('A little plump stomach.');
  const wardrobe: WardrobeStage = opts.wardrobe || 'half';
  const wardrobeLine = (WARDROBE_STAGES.find((w) => w.id === wardrobe) ?? WARDROBE_STAGES[3]).block;
  const showGenitals = wardrobe === 'half' || wardrobe === 'nude';
  if (showGenitals) body.push(opts.hairyPussy ? 'Hairy pussy. Visible pubic hair.' : 'Naked pussy exposed.');
  else body.push('Keep genitals covered unless the wardrobe stage below explicitly flashes them.');
  const wantCum = opts.faceMess !== 'clean' && opts.faceMess !== 'drool';
  const mess: string[] = [];
  if (opts.faceMess === 'clean') {
    mess.push('NO SEMEN. NO BUKKAKE. Keep her face and body clean. Do not add cum, semen, ropes, glaze, or a facial. Do not copy any cum from image 2 even if the pose reference has it. Ignore semen in the reference photos.');
  } else if (opts.faceMess === 'drool') {
    mess.push('NO SEMEN. NO BUKKAKE. Mouth open, spit and drool running down her chin only. Do not add cum. Do not copy cum from image 2.');
  } else if (opts.faceMess === 'face_only') {
    mess.push('Bukkake face only. Face full of cum. Thick white sticky semen on forehead, eyes, nose, cheeks, lips, chin. Face only, not the whole body.');
  } else {
    mess.push(`Heavy messy bukkake. Face full of cum. Thick white sticky semen on face and tits. Fat ropes, not a thin glaze${opts.faceMess === 'bukkake_drool' ? ', spit mixed with cum' : ''}.`);
  }
  if (opts.pussyCumPuddle && wantCum) mess.push('Pussy full of cum, dripping out. A puddle of cum and squirt on the floor under her.');
  else if (!wantCum) mess.push('No cum puddle. No creampie overlay.');
  const image2Line = matchPose
    ? `If Image 2 is present, copy the exact pose and body positioning shown in image 2 — same limb placement, same camera angle and framing — and also match her body shape, build, and proportions (frame, waist, hips, limb length) from image 2, combined with image 1's face. ${poseBlock}`
    : `If Image 2 is present, use it only to match her body shape, build, and proportions (frame, waist, hips, limb length) from image 2, combined with image 1's face — do not copy its pose or camera framing; use the pose described below instead. ${poseBlock}`;
  const accessoriesLine = keepAccessories
    ? `Keep her exact accessories from image 1 unchanged: jewelry, piercings, glasses, watches, hair accessories, tattoos, and any other identity-linked accessories. Do not add, remove, or alter them.`
    : `Accessories are not locked to image 1 this time — the character's own accessories/costume described below take priority instead.`;
  const prompt = [
    `Image 1 is the only identity/face reference. Keep her exact face details from image 1. Do not copy the face or identity of the woman in image 2 — image 2's own face and identity are irrelevant here.`,
    accessoriesLine,
    `Dress her as ${opts.character.name}. ${opts.character.hair}. ${opts.character.costume}. ${wardrobeLine}`,
    image2Line,
    `If Image 3 is present, use it only as a reference for: ${image3Role}. Do not take her face, identity, pose, or body proportions from image 3 — those still come from images 1 and 2 as described above.`,
    SHOT_LINE[opts.shot], ANGLE_LINE[opts.angle], body.join(' '),
    `Keep exact same skin color from image 1. Highly detailed photorealistic skin: visible pores, natural texture, fine peach fuzz.`,
    mess.join(' '),
    `Photorealistic. Face and identity only from image 1.${keepAccessories ? ' Accessories also from image 1.' : ''} Body${matchPose ? ', exact pose,' : ' proportions'} and camera from Image 2 (when present)${matchPose ? '' : ', pose from the chosen description below'}. ${image3Role[0].toUpperCase()}${image3Role.slice(1)} from Image 3 (when present). Do not change identity, age, or face shape.`,
  ].join('\n\n');
  return {
    prompt,
    image1: 'Subject face / likeness only.',
    image2: `${pose.image2} Body reference (shape/build/proportions)${matchPose ? ' + exact pose/positioning' : ''}.`,
    image3: `Reference for: ${image3Role}.`,
    summary: `${opts.character.name} · ${wardrobe} · ${pose.label} · ${opts.shot}/${opts.angle} · ${opts.faceMess}${matchPose ? '' : ' · own pose'}${keepAccessories ? '' : ' · no acc. lock'}`,
  };
}
