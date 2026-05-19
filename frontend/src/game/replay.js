const replayFrames = [];

export function recordFrame(state) {
  replayFrames.push({
    t: performance.now(),
    state: JSON.parse(JSON.stringify(state))
  });

  if (replayFrames.length > 1000) {
    replayFrames.shift();
  }
}

export function getReplayFrames() {
  return replayFrames;
}
