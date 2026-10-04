export const WAVE_VIEWBOX_WIDTH = 1000;
export const WAVE_VIEWBOX_HEIGHT = 600;
export const WAVE_START_X = 19;
export const WAVE_END_X = 991;
export const WAVE_POINT_COUNT = 101;

const WAVE_END_LIFT = 18;
const WAVE_RIGHT_END_RELIEF = 8;
const WAVE_MOMENTUM_DAMPING = 1.8;
const WAVE_MOMENTUM_LIMIT = 0.75;
const WAVE_BOUNDARY_RESTITUTION = 0.35;
const WAVE_SAMPLE_PROGRESS = new Float64Array(WAVE_POINT_COUNT);
const WAVE_SAMPLE_X = new Float64Array(WAVE_POINT_COUNT);
const WAVE_SAMPLE_EDGE = new Float64Array(WAVE_POINT_COUNT);
const WAVE_SAMPLE_IDLE = new Float64Array(WAVE_POINT_COUNT);
const WAVE_SAMPLE_RAISED = new Float64Array(WAVE_POINT_COUNT);

for (let index = 0; index < WAVE_POINT_COUNT; index += 1) {
  const progress = index / (WAVE_POINT_COUNT - 1);
  const rightEndBlend = Math.max(0, Math.min(1, (progress - 0.72) / 0.28));
  const smoothRightEndBlend = rightEndBlend * rightEndBlend * (3 - 2 * rightEndBlend);

  WAVE_SAMPLE_PROGRESS[index] = progress;
  WAVE_SAMPLE_X[index] = WAVE_START_X + progress * (WAVE_END_X - WAVE_START_X);
  WAVE_SAMPLE_EDGE[index] = Math.pow(Math.sin(Math.PI * progress), 0.6);
  WAVE_SAMPLE_IDLE[index] = Math.sin(progress * Math.PI * 4.5);
  WAVE_SAMPLE_RAISED[index] = -WAVE_END_LIFT * Math.cos(progress * Math.PI * 2)
    + WAVE_RIGHT_END_RELIEF * smoothRightEndBlend;
}

export type ImpactRipple = {
  center: number;
  age: number;
  strength: number;
} | null;

export type WaveMotionState = {
  pointerX: number;
  targetPointerX: number;
  energy: number;
  targetEnergy: number;
  phase: number;
  center: number;
  momentum: number;
  pendingForce: number;
  direction: number;
  impactRipple: ImpactRipple;
};

export const createWaveMotionState = (): WaveMotionState => ({
  pointerX: 0.5,
  targetPointerX: 0.5,
  energy: 0,
  targetEnergy: 0,
  phase: 0,
  center: 0.5,
  momentum: 0,
  pendingForce: 0,
  direction: 0,
  impactRipple: null,
});

export const stepWaveMotion = (state: WaveMotionState, deltaTime: number) => {
  const positionBlend = 1 - Math.exp(-deltaTime / 180);
  state.pointerX += (state.targetPointerX - state.pointerX) * positionBlend;
  state.momentum = Math.max(
    -WAVE_MOMENTUM_LIMIT,
    Math.min(WAVE_MOMENTUM_LIMIT, state.momentum + state.pendingForce),
  );
  state.pendingForce = 0;

  const seconds = deltaTime / 1000;
  state.center += state.momentum * seconds;
  state.momentum *= Math.exp(-WAVE_MOMENTUM_DAMPING * seconds);
  if (Math.abs(state.momentum) > 0.015) state.direction = Math.sign(state.momentum);

  const energyBlend = 1 - Math.exp(
    -deltaTime / (state.targetEnergy > state.energy ? 420 : 850),
  );
  state.energy += (state.targetEnergy - state.energy) * energyBlend;
  state.targetEnergy *= Math.exp(-deltaTime / 850);
  state.phase += deltaTime * (0.0003 + state.energy * 0.00055);

  if (state.impactRipple) {
    state.impactRipple.age += seconds;
    if (state.impactRipple.age > 2.5) state.impactRipple = null;
  }

  if (state.center < 0.04) {
    state.center = 0.04;
    state.momentum = Math.abs(state.momentum) * WAVE_BOUNDARY_RESTITUTION;
  } else if (state.center > 0.96) {
    state.center = 0.96;
    state.momentum = -Math.abs(state.momentum) * WAVE_BOUNDARY_RESTITUTION;
  }

  return state;
};

export const getWaveY = (progress: number, state: WaveMotionState) => {
  const amplitude = 15 + (1 - state.pointerX) * 25;
  const packetAmplitude = state.energy * (32 + (1 - state.pointerX) * 24);
  const edgeEnvelope = Math.pow(Math.sin(Math.PI * progress), 0.6);
  const idleWave = Math.sin(progress * Math.PI * 4.5) * Math.sin(state.phase) * amplitude;
  const distance = progress - state.center;
  const packetEnvelope = Math.exp(-(distance * distance) / 0.04);
  const travelingWave = Math.sin(distance * 22 - state.phase * state.direction * 1.2)
    * packetEnvelope
    * packetAmplitude;
  const rippleDistance = Math.abs(progress - (state.impactRipple?.center ?? 0));
  const impactDip = state.impactRipple
    ? -state.impactRipple.strength
      * 0.35
      * Math.exp(-(rippleDistance * rippleDistance) / 0.002)
      * Math.exp(-state.impactRipple.age * 5)
    : 0;
  const rippleFront = state.impactRipple
    ? rippleDistance - state.impactRipple.age * 0.18
    : 0;
  const outwardRipple = state.impactRipple
    ? Math.sin(rippleDistance * 72 - state.impactRipple.age * 8)
      * Math.exp(-(rippleFront * rippleFront) / 0.014)
      * state.impactRipple.strength
      * 0.08
      * Math.exp(-state.impactRipple.age * 3)
    : 0;
  const rightEndBlend = Math.max(0, Math.min(1, (progress - 0.72) / 0.28));
  const smoothRightEndBlend = rightEndBlend * rightEndBlend * (3 - 2 * rightEndBlend);
  const raisedEnds = -WAVE_END_LIFT * Math.cos(progress * Math.PI * 2)
    + WAVE_RIGHT_END_RELIEF * smoothRightEndBlend;

  return WAVE_VIEWBOX_HEIGHT / 2
    + raisedEnds
    + (idleWave + travelingWave + impactDip + outwardRipple) * edgeEnvelope;
};

export const createWavePath = (
  state: WaveMotionState,
  samples = new Float64Array(WAVE_POINT_COUNT),
) => {
  const amplitude = 15 + (1 - state.pointerX) * 25;
  const packetAmplitude = state.energy * (32 + (1 - state.pointerX) * 24);
  const phaseSine = Math.sin(state.phase);
  const waveHeight = WAVE_VIEWBOX_HEIGHT / 2;
  const hasRipple = state.impactRipple !== null;
  const rippleCenter = state.impactRipple?.center ?? 0;
  const rippleStrength = state.impactRipple?.strength ?? 0;
  const rippleAge = state.impactRipple?.age ?? 0;
  const impactDecay = hasRipple ? Math.exp(-rippleAge * 5) : 0;
  const rippleDecay = hasRipple ? Math.exp(-rippleAge * 3) : 0;
  const ripplePhase = rippleAge * 8;
  const rippleTravel = rippleAge * 0.18;

  for (let index = 0; index < WAVE_POINT_COUNT; index += 1) {
    const progress = WAVE_SAMPLE_PROGRESS[index];
    const distance = progress - state.center;
    const packetEnvelope = Math.exp(-(distance * distance) / 0.04);
    const travelingWave = Math.sin(distance * 22 - state.phase * state.direction * 1.2)
      * packetEnvelope
      * packetAmplitude;
    let impactDip = 0;
    let outwardRipple = 0;

    if (hasRipple) {
      const rippleDistance = Math.abs(progress - rippleCenter);
      const dipEnvelope = Math.exp(-(rippleDistance * rippleDistance) / 0.002);
      const rippleFront = rippleDistance - rippleTravel;

      impactDip = -rippleStrength * 0.35 * dipEnvelope * impactDecay;
      outwardRipple = Math.sin(rippleDistance * 72 - ripplePhase)
        * Math.exp(-(rippleFront * rippleFront) / 0.014)
        * rippleStrength
        * 0.08
        * rippleDecay;
    }

    samples[index] = waveHeight
      + WAVE_SAMPLE_RAISED[index]
      + (
        WAVE_SAMPLE_IDLE[index] * phaseSine * amplitude
        + travelingWave
        + impactDip
        + outwardRipple
      ) * WAVE_SAMPLE_EDGE[index];
  }

  const firstX = WAVE_SAMPLE_X[0];
  const firstY = samples[0];
  let path = `M ${firstX} ${firstY}`;

  for (let index = 1; index < WAVE_POINT_COUNT; index += 1) {
    const previousX = WAVE_SAMPLE_X[index - 1];
    const previousY = samples[index - 1];
    const beforePreviousX = WAVE_SAMPLE_X[Math.max(index - 2, 0)];
    const beforePreviousY = samples[Math.max(index - 2, 0)];
    const pointX = WAVE_SAMPLE_X[index];
    const pointY = samples[index];
    const nextIndex = Math.min(index + 1, WAVE_POINT_COUNT - 1);
    const nextX = WAVE_SAMPLE_X[nextIndex];
    const nextY = samples[nextIndex];
    const control1X = previousX + (pointX - beforePreviousX) / 6;
    const control1Y = previousY + (pointY - beforePreviousY) / 6;
    const control2X = pointX - (nextX - previousX) / 6;
    const control2Y = pointY - (nextY - previousY) / 6;

    path += ` C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${pointX} ${pointY}`;
  }

  return path;
};
