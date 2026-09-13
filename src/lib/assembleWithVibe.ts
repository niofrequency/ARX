import { assembleAdminPrompt as assembleRaw, type BuilderOptions } from './adminPromptBuilder';
import { withCharacterBackground } from './characterBackgrounds';

export function assembleAdminPrompt(opts: BuilderOptions) {
  const built = assembleRaw(opts);
  built.prompt = withCharacterBackground(built.prompt, opts.character);
  return built;
}
