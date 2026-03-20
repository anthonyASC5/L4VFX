import { renderMotionVideoEffectLayer, layerNeedsMotionSourceImageData, motionVideoEffectDefinitions } from "./motionvideofx.js";
import { createVideoWorkspace } from "./video-workspace-base.js";

createVideoWorkspace({
  title: "Motion Editor",
  recordingFilename: "motionvideo-recording.webm",
  effectDefinitions: motionVideoEffectDefinitions,
  renderEffectLayer: renderMotionVideoEffectLayer,
  layerNeedsSourceImageData: layerNeedsMotionSourceImageData,
});
