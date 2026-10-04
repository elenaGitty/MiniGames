export const PHYSICS = {
  gravity: 560,
  restitution: 0.38,
  mass: 1.5,
  surfaceMass: 7,
  rollingDamping: 0,
  rollingGravityScale: 1.3,
  rollingSpeedLimit: 220,
  impactSideImpulseLimit: 3.5,
  edgeRestitution: 0.35,
  wallRestitution: 0.6,
  floorRestitution: 0.48,
} as const;

export type PhysicsMotion = {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
};

export type PhysicsVector = {
  x: number;
  y: number;
};

export const integrateMotion = (
  motion: PhysicsMotion,
  deltaSeconds: number,
  acceleration: PhysicsVector = { x: 0, y: PHYSICS.gravity },
): PhysicsMotion => {
  const velocityX = motion.velocityX + acceleration.x * deltaSeconds;
  const velocityY = motion.velocityY + acceleration.y * deltaSeconds;

  return {
    x: motion.x + velocityX * deltaSeconds,
    y: motion.y + velocityY * deltaSeconds,
    velocityX,
    velocityY,
  };
};

type SurfaceImpactOptions = {
  normalX: number;
  normalY: number;
  surfaceVelocityX?: number;
  surfaceVelocityY?: number;
  mass?: number;
  surfaceMass?: number;
  restitution?: number;
};

export const resolveSurfaceImpact = (
  motion: PhysicsMotion,
  {
    normalX,
    normalY,
    surfaceVelocityX = 0,
    surfaceVelocityY = 0,
    mass = PHYSICS.mass,
    surfaceMass = PHYSICS.surfaceMass,
    restitution = PHYSICS.restitution,
  }: SurfaceImpactOptions,
) => {
  const normalLength = Math.hypot(normalX, normalY) || 1;
  const nx = normalX / normalLength;
  const ny = normalY / normalLength;
  const relativeNormalVelocity = (
    (motion.velocityX - surfaceVelocityX) * nx
    + (motion.velocityY - surfaceVelocityY) * ny
  );

  if (relativeNormalVelocity >= 0) {
    return { ...motion, relativeNormalVelocity, impactSpeed: 0 };
  }

  const impulse = -(1 + restitution) * relativeNormalVelocity
    / (1 / mass + 1 / surfaceMass);

  return {
    ...motion,
    velocityX: motion.velocityX + (impulse * nx) / mass,
    velocityY: motion.velocityY + (impulse * ny) / mass,
    relativeNormalVelocity,
    impactSpeed: -relativeNormalVelocity,
  };
};

export const stepSpring = (
  value: number,
  velocity: number,
  deltaSeconds: number,
  stiffness: number,
  damping: number,
) => {
  const nextVelocity = velocity + (-value * stiffness - velocity * damping) * deltaSeconds;

  return {
    value: value + nextVelocity * deltaSeconds,
    velocity: nextVelocity,
  };
};
