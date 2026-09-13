import type { PoseFamily } from './adminPromptBuilder';
import { PoseLandmarker, FilesetResolver, type PoseLandmarkerResult } from '@mediapipe/tasks-vision';

export interface PoseGuess {
  family: PoseFamily;
  label: string;
  confidence: number;
  reason: string;
}

let landmarker: PoseLandmarker | null = null;
let loading: Promise<PoseLandmarker> | null = null;

async function getLandmarker(): Promise<PoseLandmarker> {
  if (landmarker) return landmarker;
  if (!loading) {
    loading = (async () => {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm',
      );
      landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
        },
        runningMode: 'IMAGE',
        numPoses: 1,
      });
      return landmarker;
    })();
  }
  return loading;
}

function vis(lm: { visibility?: number } | undefined) {
  return lm?.visibility ?? 0;
}

function classify(result: PoseLandmarkerResult): PoseGuess {
  const pose = result.landmarks?.[0];
  if (!pose || pose.length < 29) {
    return { family: 'custom', label: 'unknown', confidence: 0.2, reason: 'No body landmarks' };
  }

  const nose = pose[0];
  const lShoulder = pose[11];
  const rShoulder = pose[12];
  const lHip = pose[23];
  const rHip = pose[24];
  const lKnee = pose[25];
  const rKnee = pose[26];
  const lAnkle = pose[27];
  const rAnkle = pose[28];

  const faceVis = vis(nose);
  const hipVis = (vis(lHip) + vis(rHip)) / 2;
  const kneeVis = (vis(lKnee) + vis(rKnee)) / 2;
  const ankleVis = (vis(lAnkle) + vis(rAnkle)) / 2;
  const shoulderVis = (vis(lShoulder) + vis(rShoulder)) / 2;

  const hipY = ((lHip?.y ?? 0) + (rHip?.y ?? 0)) / 2;
  const shoulderY = ((lShoulder?.y ?? 0) + (rShoulder?.y ?? 0)) / 2;
  const kneeY = ((lKnee?.y ?? 0) + (rKnee?.y ?? 0)) / 2;
  const kneeSpread = Math.abs((lKnee?.x ?? 0) - (rKnee?.x ?? 0));
  const hipSpread = Math.abs((lHip?.x ?? 0) - (rHip?.x ?? 0));
  const torsoLen = Math.abs(hipY - shoulderY);

  if (faceVis > 0.6 && hipVis < 0.35 && ankleVis < 0.25 && torsoLen < 0.35) {
    return { family: 'face', label: 'face_closeup', confidence: 0.82, reason: 'Face dominant, little body' };
  }
  if (hipVis > 0.45 && shoulderY > hipY + 0.05) {
    return { family: 'rear', label: 'doggy', confidence: 0.78, reason: 'Hips above shoulders (rear / all fours)' };
  }
  if (hipVis > 0.55 && faceVis < 0.35 && torsoLen < 0.28) {
    return { family: 'rear', label: 'ass', confidence: 0.74, reason: 'Hips fill frame, face weak' };
  }
  if (kneeVis > 0.45 && kneeSpread > 0.22 && faceVis > 0.4) {
    return { family: 'front', label: 'front_spread', confidence: 0.76, reason: 'Open knees, face visible' };
  }
  if (ankleVis > 0.45 && torsoLen > 0.35) {
    return { family: 'other', label: 'standing', confidence: 0.7, reason: 'Ankles visible, long torso' };
  }
  if (shoulderVis > 0.55 && hipVis < 0.4 && faceVis > 0.45) {
    return { family: 'tits', label: 'kneeling_chest', confidence: 0.66, reason: 'Chest / shoulders fill frame' };
  }
  if (hipVis > 0.4 && kneeY > hipY && faceVis > 0.35) {
    return { family: 'front', label: 'front_body', confidence: 0.6, reason: 'Front body, face in frame' };
  }
  if (hipSpread > 0.2 && faceVis > 0.3) {
    return { family: 'front', label: 'front_spread', confidence: 0.55, reason: 'Open hips' };
  }
  return { family: 'custom', label: 'unknown', confidence: 0.35, reason: 'Ambiguous skeleton' };
}

export async function detectPoseFromFile(file: File): Promise<PoseGuess> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not read image'));
      el.src = url;
    });
    const model = await getLandmarker();
    const result = model.detect(img);
    return classify(result);
  } finally {
    URL.revokeObjectURL(url);
  }
}
