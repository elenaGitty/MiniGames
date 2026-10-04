import React, { useCallback, useEffect, useRef } from 'react';
import './WigglyLine.scss';
import BrushPath from '../BrushPath/BrushPath';
import WaveBall, { createWaveBallPath } from './WaveBall';
import {
  PHYSICS,
  resolveSurfaceImpact,
} from '../../Physics';
import {
  createWaveMotionState,
  createWavePath,
  getWaveY,
  stepWaveMotion,
  WAVE_END_X,
  WAVE_POINT_COUNT,
  WAVE_START_X,
  WAVE_VIEWBOX_HEIGHT,
  WAVE_VIEWBOX_WIDTH,
} from '../../physics/wave';

const VIEWBOX_WIDTH = WAVE_VIEWBOX_WIDTH;
const VIEWBOX_HEIGHT = WAVE_VIEWBOX_HEIGHT;
const BALL_RADIUS = 11;
const BALL_PATH = createWaveBallPath(BALL_RADIUS);
const INITIAL_WAVE_PATH = createWavePath(createWaveMotionState());
const BALL_MAX_HEIGHT_ABOVE_FRAME = 10;
const BALL_DROP_SPEED = 160;
const CURSOR_LINE_HIT_RADIUS = 20;
const WAVE_LAUNCH_SPEED = 35;
const BALL_UPWARD_SPEED_LIMIT = 240;
const BALL_WAVE_CLEARANCE = 4;
const BALL_MAX_LANDING_RESTITUTION = 0.62;
const BALL_MIN_LANDING_RESTITUTION = 0.22;
const BALL_SETTLE_SPEED = 24;
const BALL_RESTITUTION_REFERENCE_SPEED = 850;
const BALL_RESTITUTION_CURVE = 1.1;
const BALL_LANDING_SURFACE_MASS = PHYSICS.mass * 1000;
const BALL_IMPACT_ANIMATION_COOLDOWN = 0.36;
const BALL_IMPACT_POSES = [
  { time: 0, squash: 0 },
  { time: 0.07, squash: 0.28 },
  { time: 0.12, squash: 0.24 },
  { time: 0.22, squash: -0.08 },
  { time: 0.3, squash: 0 },
];
const BALL_IMPACT_ANIMATION_DURATION = BALL_IMPACT_POSES[BALL_IMPACT_POSES.length - 1].time;
const FRAME_BOUNDS = { left: 20, right: 990, top: 25, bottom: 575 };
const CURSOR_STROKE_LAYERS = ['soft', 'main', 'bristle'] as const;
const POINTER_CURSOR_PATH = 'M 4 2 L 4 29 L 11 22 L 16 35 Q 17 37 19 36 Q 21 35 20 33 L 16 22 L 26 22 Z';
const HAND_CURSOR_PATH = 'M 11 36 Q 8 33 7 29 L 5 23 Q 4 21 6 20 Q 8 19 9 22 L 11 27 L 11 10 Q 11 7 14 7 Q 17 7 17 10 L 17 21 L 18 16 Q 19 13 22 14 Q 24 15 23 18 L 22 22 Q 24 19 26 21 Q 28 23 26 26 L 24 33 Q 23 37 19 38 Z';
const CLICK_MARKS_PATH = 'M 4 9 L 1 6 M 9 5 L 9 1 M 2 13 L -1 13';

const getEllipseSupportRadius = (
  tangentRadius: number,
  normalRadius: number,
  axisX: number,
  axisY: number,
  directionX: number,
  directionY: number,
) => {
  const projection = axisX * directionX + axisY * directionY;
  const radiusSquared = tangentRadius * tangentRadius
    + (normalRadius * normalRadius - tangentRadius * tangentRadius)
      * projection * projection;

  return Math.sqrt(Math.max(0, radiusSquared));
};

const WigglyLine: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const lineCursorRef = useRef<SVGSVGElement>(null);
  const lineRefs = useRef<Array<SVGPathElement | null>>([]);
  const ballRef = useRef<SVGGElement>(null);
  const ballSpinRef = useRef<SVGGElement>(null);
  const ballAspectRef = useRef<SVGGElement>(null);
  const ballAirBlurRef = useRef<SVGFEGaussianBlurElement>(null);
  const ballState = useRef({
    x: 0,
    y: 0,
    velocityX: 0,
    velocityY: 0,
    active: false,
    onWave: false,
    impactReady: true,
    impactAnimationCooldown: 0,
  });
  const ballRotation = useRef(0);
  const ballSpinVelocity = useRef(0);
  const dropBall = useCallback((progress: number) => {
    const ball = ballState.current;
    ball.x = WAVE_START_X + progress * (WAVE_END_X - WAVE_START_X);
    ball.x = Math.max(
      WAVE_START_X + BALL_RADIUS,
      Math.min(WAVE_END_X - BALL_RADIUS, ball.x),
    );
    ball.y = FRAME_BOUNDS.top - BALL_RADIUS - BALL_MAX_HEIGHT_ABOVE_FRAME;
    ball.velocityX = 0;
    ball.velocityY = BALL_DROP_SPEED;
    ball.onWave = false;
    ball.impactReady = true;
    ball.impactAnimationCooldown = 0;
    ball.active = true;
    ballRotation.current = 0;
    ballSpinVelocity.current = 0;
    ballRef.current?.setAttribute('visibility', 'visible');
  }, []);

  useEffect(() => {
    const wave = createWaveMotionState();
    const previousWave = createWaveMotionState();
    const previousImpactRipple = { center: 0, age: 0, strength: 0 };
    const wavePathSamples = new Float64Array(WAVE_POINT_COUNT);
    let ballVerticalRadius = BALL_RADIUS;
    let ballAspectScale = 1;
    let ballAirBlur = 0;
    let ballSquash = 0;
    let ballImpactPoseAge = -1;
    let ballImpactNormalX = 0;
    let ballImpactNormalY = -1;
    let previousPointer: { x: number; y: number; time: number } | null = null;
    let frameId = 0;
    let previousFrameTime = 0;

    const startImpactAnimation = (normalX: number, normalY: number) => {
      const ball = ballState.current;
      if (ball.impactAnimationCooldown > 0) return;

      ball.impactAnimationCooldown = BALL_IMPACT_ANIMATION_COOLDOWN;
      ballImpactPoseAge = 0;
      const normalLength = Math.hypot(normalX, normalY) || 1;
      ballImpactNormalX = normalX / normalLength;
      ballImpactNormalY = normalY / normalLength;
    };

    const getImpactPose = (age: number) => {
      for (let index = 1; index < BALL_IMPACT_POSES.length; index += 1) {
        const nextPose = BALL_IMPACT_POSES[index];
        if (age > nextPose.time) continue;

        const previousPose = BALL_IMPACT_POSES[index - 1];
        const progress = (age - previousPose.time) / (nextPose.time - previousPose.time);
        const easedProgress = progress * progress * (3 - 2 * progress);
        return previousPose.squash
          + (nextPose.squash - previousPose.squash) * easedProgress;
      }

      return 0;
    };

    const animate = (time: number) => {
      const deltaTime = previousFrameTime === 0 ? 0 : Math.min(time - previousFrameTime, 32);
      previousFrameTime = time;
      previousWave.pointerX = wave.pointerX;
      previousWave.targetPointerX = wave.targetPointerX;
      previousWave.energy = wave.energy;
      previousWave.targetEnergy = wave.targetEnergy;
      previousWave.phase = wave.phase;
      previousWave.center = wave.center;
      previousWave.momentum = wave.momentum;
      previousWave.pendingForce = wave.pendingForce;
      previousWave.direction = wave.direction;
      if (wave.impactRipple) {
        previousImpactRipple.center = wave.impactRipple.center;
        previousImpactRipple.age = wave.impactRipple.age;
        previousImpactRipple.strength = wave.impactRipple.strength;
        previousWave.impactRipple = previousImpactRipple;
      } else {
        previousWave.impactRipple = null;
      }
      stepWaveMotion(wave, deltaTime);

      const ball = ballState.current;
      const path = createWavePath(wave, wavePathSamples);
      for (let index = 0; index < lineRefs.current.length; index += 1) {
        lineRefs.current[index]?.setAttribute('d', path);
      }

      if (ball.active && ballRef.current) {
        const seconds = deltaTime / 1000;
        ball.impactAnimationCooldown = Math.max(0, ball.impactAnimationCooldown - seconds);
        const previousBallX = ball.x;
        const wasOnWave = ball.onWave;
        if (ballImpactPoseAge >= 0) {
          ballImpactPoseAge += seconds;
          if (ballImpactPoseAge < BALL_IMPACT_ANIMATION_DURATION) {
            ballSquash = getImpactPose(ballImpactPoseAge);
          } else {
            ballSquash = 0;
            ballImpactPoseAge = -1;
          }
        }
        const impactScaleY = 1 - ballSquash;
        const impactScaleX = 1 / Math.sqrt(impactScaleY);

        ball.x += ball.velocityX * seconds;
        if (ball.onWave) {
          ball.y += ball.velocityY * seconds;
        } else {
          ball.y += ball.velocityY * seconds
            + 0.5 * PHYSICS.gravity * seconds * seconds;
          ball.velocityY += PHYSICS.gravity * seconds;
        }
        const progress = Math.max(
          0,
          Math.min(1, (ball.x - WAVE_START_X) / (WAVE_END_X - WAVE_START_X)),
        );
        const surfaceVelocity = seconds === 0
          ? 0
          : (getWaveY(progress, wave) - getWaveY(progress, previousWave)) / seconds;
        const surfaceY = getWaveY(progress, wave);
        const leftProgress = Math.max(
          0,
          Math.min(1, (ball.x - 8 - WAVE_START_X) / (WAVE_END_X - WAVE_START_X)),
        );
        const rightProgress = Math.max(
          0,
          Math.min(1, (ball.x + 8 - WAVE_START_X) / (WAVE_END_X - WAVE_START_X)),
        );
        const slope = (getWaveY(rightProgress, wave) - getWaveY(leftProgress, wave)) / 16;

        const contactSlope = Math.max(-0.8, Math.min(0.8, slope));
        const normalLength = Math.hypot(contactSlope, 1);
        const overWave = ball.x >= WAVE_START_X && ball.x <= WAVE_END_X;

        const shapeRadius = Math.max(BALL_RADIUS, ballVerticalRadius);
        const tangentRadius = shapeRadius * impactScaleX;
        const normalRadius = shapeRadius * impactScaleY;
        const waveNormalX = contactSlope / normalLength;
        const waveNormalY = -1 / normalLength;
        const waveSupportRadius = getEllipseSupportRadius(
          tangentRadius,
          normalRadius,
          ballImpactNormalX,
          ballImpactNormalY,
          waveNormalX,
          waveNormalY,
        );
        const surfaceClearance = waveSupportRadius * normalLength + BALL_WAVE_CLEARANCE;
        const penetratesWave = ball.y + surfaceClearance >= surfaceY;
        const relativeNormalVelocity = (
          ball.velocityX * contactSlope - ball.velocityY + surfaceVelocity
        ) / normalLength;
        const movingIntoWave = relativeNormalVelocity < 0;

        if (!penetratesWave && !ball.onWave) {
          ball.impactReady = true;
        }

        if (
          overWave
          && (
            ball.onWave
            || (penetratesWave && movingIntoWave && ball.impactReady)
          )
        ) {
          ball.y = surfaceY - surfaceClearance;

          if (ball.onWave) {
            ball.velocityY = surfaceVelocity + contactSlope * ball.velocityX;
            if (ball.velocityY < -WAVE_LAUNCH_SPEED) {
              ball.velocityY = Math.max(ball.velocityY, -BALL_UPWARD_SPEED_LIMIT);
              ball.onWave = false;
            }
          } else {
            const impactSpeed = Math.max(0, -relativeNormalVelocity);
            const impactEnergy = Math.min(impactSpeed / BALL_RESTITUTION_REFERENCE_SPEED, 1);
            const landingRestitution = Math.min(
              BALL_MAX_LANDING_RESTITUTION,
              BALL_MIN_LANDING_RESTITUTION
                + (BALL_MAX_LANDING_RESTITUTION - BALL_MIN_LANDING_RESTITUTION)
                  * impactEnergy ** BALL_RESTITUTION_CURVE,
            );
            const impact = resolveSurfaceImpact(ball, {
              normalX: contactSlope,
              normalY: -1,
              surfaceVelocityY: surfaceVelocity,
              surfaceMass: BALL_LANDING_SURFACE_MASS,
              restitution: landingRestitution,
            });

            if (ball.impactReady && impact.relativeNormalVelocity < -BALL_SETTLE_SPEED) {
              const horizontalVelocityChange = Math.max(
                -PHYSICS.impactSideImpulseLimit,
                Math.min(
                  PHYSICS.impactSideImpulseLimit,
                  impact.velocityX - ball.velocityX,
                ),
              );
              ball.velocityX += horizontalVelocityChange;
              ball.velocityY = Math.max(
                impact.velocityY,
                -BALL_UPWARD_SPEED_LIMIT,
              );
              ball.onWave = false;
              ball.impactReady = true;
              startImpactAnimation(contactSlope, -1);
            } else if (
              impact.relativeNormalVelocity < 0
              && impact.relativeNormalVelocity > -BALL_SETTLE_SPEED
            ) {
              ball.onWave = true;
              ball.velocityY = surfaceVelocity + contactSlope * ball.velocityX;
            } else {
              ball.onWave = false;
            }
          }
        } else if (ball.onWave) {
          ball.onWave = false;
        }

        if (ball.velocityY < 0) {
          const maximumApexY = FRAME_BOUNDS.top - ballVerticalRadius
            - BALL_MAX_HEIGHT_ABOVE_FRAME;
          const availableRise = Math.max(ball.y - maximumApexY, 0);
          const maximumUpwardSpeed = Math.sqrt(2 * PHYSICS.gravity * availableRise);
          ball.velocityY = Math.max(ball.velocityY, -maximumUpwardSpeed);
        }

        if (overWave && ball.onWave) {
          ball.y = surfaceY - surfaceClearance;
          ball.velocityY = surfaceVelocity + contactSlope * ball.velocityX;
          const gravityAlongWave = PHYSICS.gravity
            * PHYSICS.rollingGravityScale
            * contactSlope
            / (1 + contactSlope * contactSlope);
          ball.velocityX += (gravityAlongWave - ball.velocityX * PHYSICS.rollingDamping) * seconds;

          const nextProgress = Math.max(
            0,
            Math.min(1, (ball.x - WAVE_START_X) / (WAVE_END_X - WAVE_START_X)),
          );
          ball.y = getWaveY(nextProgress, wave) - surfaceClearance;
        }

        const leftWall = FRAME_BOUNDS.left + BALL_RADIUS;
        const rightWall = FRAME_BOUNDS.right - BALL_RADIUS;
        const verticalSupportRadius = getEllipseSupportRadius(
          tangentRadius,
          normalRadius,
          ballImpactNormalX,
          ballImpactNormalY,
          0,
          1,
        );
        const floor = FRAME_BOUNDS.bottom - verticalSupportRadius;

        if (ball.x < leftWall) {
          ball.x = leftWall;
          if (ball.velocityX < 0) {
            ball.velocityX = -ball.velocityX * PHYSICS.wallRestitution;
            ball.onWave = false;
            ball.impactReady = true;
            startImpactAnimation(1, 0);
          }
        } else if (ball.x > rightWall) {
          ball.x = rightWall;
          if (ball.velocityX > 0) {
            ball.velocityX = -ball.velocityX * PHYSICS.wallRestitution;
            ball.onWave = false;
            ball.impactReady = true;
            startImpactAnimation(-1, 0);
          }
        }

        if (ball.y > floor) {
          ball.y = floor;
          if (ball.velocityY > 0) {
            ball.velocityY = -ball.velocityY * PHYSICS.floorRestitution;
            startImpactAnimation(0, -1);
          }
          ball.onWave = false;
        }

        ball.velocityX = Math.max(
          -PHYSICS.rollingSpeedLimit,
          Math.min(PHYSICS.rollingSpeedLimit, ball.velocityX),
        );
        const targetAirBlur = ball.onWave ? 0 : 1;
        ballAirBlur += (targetAirBlur - ballAirBlur) * (1 - Math.exp(-deltaTime / 90));
        const blurAmount = ballAirBlur * Math.min(
          0.7,
          0.15 + Math.hypot(ball.velocityX, ball.velocityY) / 900 * 0.55,
        );
        ballAirBlurRef.current?.setAttribute('stdDeviation', `${blurAmount.toFixed(2)}`);
        if (wasOnWave) {
          const horizontalDistance = ball.x - previousBallX;
          ballSpinVelocity.current = seconds > 0
            ? horizontalDistance / BALL_RADIUS / seconds
            : ball.velocityX / BALL_RADIUS;
          ballRotation.current += (horizontalDistance / BALL_RADIUS) * (180 / Math.PI);
        } else {
          ballRotation.current += ballSpinVelocity.current * seconds * (180 / Math.PI);
        }
        const impactScaleTangent = impactScaleX;
        const impactNormalScale = impactScaleY;
        const scaleDifference = impactNormalScale - impactScaleTangent;
        const transformScaleX = impactScaleTangent
          + scaleDifference * ballImpactNormalX * ballImpactNormalX;
        const transformSkew = scaleDifference * ballImpactNormalX * ballImpactNormalY;
        const transformScaleY = impactScaleTangent
          + scaleDifference * ballImpactNormalY * ballImpactNormalY;
        const anchoredX = ball.x
          - ballImpactNormalX * shapeRadius * (1 - impactNormalScale);
        const anchoredY = ball.y
          - ballImpactNormalY * shapeRadius * (1 - impactNormalScale);
        const rotation = ballRotation.current * (Math.PI / 180);
        const cosine = Math.cos(rotation);
        const sine = Math.sin(rotation);
        ballRef.current.setAttribute(
          'transform',
          `translate(${anchoredX} ${anchoredY}) matrix(${transformScaleX} ${transformSkew} ${transformSkew} ${transformScaleY} 0 0)`,
        );
        ballSpinRef.current?.setAttribute(
          'transform',
          `matrix(${cosine} ${sine * ballAspectScale} ${-sine / ballAspectScale} ${cosine} 0 0)`,
        );

      }

      frameId = window.requestAnimationFrame(animate);
    };

    const updateBallAspectRatio = () => {
      const bounds = svgRef.current?.getBoundingClientRect();
      if (!bounds || bounds.width === 0 || bounds.height === 0) return;

      const verticalScale = (bounds.width * VIEWBOX_HEIGHT) / (bounds.height * VIEWBOX_WIDTH);
      ballAspectScale = verticalScale;
      ballVerticalRadius = BALL_RADIUS * verticalScale;
      ballAspectRef.current?.setAttribute('transform', `scale(1 ${verticalScale})`);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!svgRef.current) return;

      const bounds = svgRef.current.getBoundingClientRect();
      if (bounds.width === 0 || bounds.height === 0) return;

      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;
      wave.targetPointerX = Math.max(0, Math.min(1, x / bounds.width));
      const progress = Math.max(0, Math.min(1, x / bounds.width));
      const waveY = getWaveY(progress, wave);
      const distanceFromWave = Math.abs((y / bounds.height) * VIEWBOX_HEIGHT - waveY)
        * (bounds.height / VIEWBOX_HEIGHT);
      const isOverWave = x >= 0
        && x <= bounds.width
        && distanceFromWave <= CURSOR_LINE_HIT_RADIUS;
      const cursor = lineCursorRef.current;
      if (cursor && containerRef.current) {
        const containerBounds = containerRef.current.getBoundingClientRect();
        const pointerInside = event.clientX >= containerBounds.left
          && event.clientX <= containerBounds.right
          && event.clientY >= containerBounds.top
          && event.clientY <= containerBounds.bottom;
        cursor.style.left = `${event.clientX - containerBounds.left}px`;
        cursor.style.top = `${event.clientY - containerBounds.top}px`;
        cursor.classList.toggle('line-cursor--visible', pointerInside);
        cursor.classList.toggle('line-cursor--hover', pointerInside && isOverWave);
      }

      if (previousPointer) {
        const elapsed = Math.max(event.timeStamp - previousPointer.time, 1);
        const deltaX = x - previousPointer.x;
        const speed = Math.hypot(deltaX, y - previousPointer.y) / bounds.width / elapsed;
        wave.targetEnergy = Math.max(wave.targetEnergy, Math.min(speed * 180, 0.65));

        const force = Math.max(-0.14, Math.min(0.14, (deltaX / bounds.width) * 2.2));
        wave.pendingForce = Math.max(-0.2, Math.min(0.2, wave.pendingForce + force));
      }

      previousPointer = { x, y, time: event.timeStamp };
    };

    const handleClick = (event: MouseEvent) => {
      if (!svgRef.current) return;

      const bounds = svgRef.current.getBoundingClientRect();
      if (bounds.width === 0 || bounds.height === 0) return;

      const progress = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
      const localY = (event.clientY - bounds.top) / bounds.height * VIEWBOX_HEIGHT;
      const waveY = getWaveY(progress, wave);
      if (Math.abs(localY - waveY) > 24) return;

      const cursor = lineCursorRef.current;
      if (cursor) {
        cursor.classList.remove('line-cursor--click');
        void cursor.getBoundingClientRect();
        cursor.classList.add('line-cursor--click');
      }
      dropBall(progress);
    };
    const handlePointerLeave = () => {
      lineCursorRef.current?.classList.remove('line-cursor--visible', 'line-cursor--hover');
    };

    window.addEventListener('pointermove', handlePointerMove);
    svgRef.current?.addEventListener('click', handleClick);
    containerRef.current?.addEventListener('pointerleave', handlePointerLeave);
    window.addEventListener('resize', updateBallAspectRatio);
    updateBallAspectRatio();
    frameId = window.requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      svgRef.current?.removeEventListener('click', handleClick);
      containerRef.current?.removeEventListener('pointerleave', handlePointerLeave);
      window.removeEventListener('resize', updateBallAspectRatio);
      window.cancelAnimationFrame(frameId);
    };
  }, [dropBall]);

  return (
    <div ref={containerRef} className="wiggly-line">
      <svg
        ref={svgRef}
        className="svg-container"
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <g className="brush-stroke">
          <BrushPath
            className="frame-path"
            d="M 29 27 C 126 19 183 35 275 27 S 436 34 512 25 S 693 31 779 25 S 909 30 970 27 C 984 27 987 58 988 90 C 994 200 991 383 989 506 C 989 551 985 570 968 572 C 856 578 755 568 657 574 S 451 568 344 574 S 158 570 49 575 C 26 576 18 561 18 535 C 16 445 24 359 18 276 S 18 113 20 64 C 20 42 21 29 29 27 Z"
            layers={['soft', 'main']}
            bristleOffset={0}
          />
          <WaveBall
            ballRef={ballRef}
            spinRef={ballSpinRef}
            aspectRef={ballAspectRef}
            blurRef={ballAirBlurRef}
            path={BALL_PATH}
          />
          <BrushPath
            className="wiggly-path"
            d={INITIAL_WAVE_PATH}
            pathRefs={lineRefs}
          />
        </g>
      </svg>
      <svg
        ref={lineCursorRef}
        className="line-cursor"
        viewBox="0 0 32 40"
        aria-hidden="true"
        focusable="false"
        onAnimationEnd={(event) => event.currentTarget.classList.remove('line-cursor--click')}
      >
        <g className="line-cursor__icon">
          <g className="line-cursor__pointer">
            <path className="line-cursor__fill" d={POINTER_CURSOR_PATH} />
            <BrushPath
              className="line-cursor__outline"
              d={POINTER_CURSOR_PATH}
              layers={CURSOR_STROKE_LAYERS}
            />
          </g>
          <g className="line-cursor__hand">
            <path className="line-cursor__fill" d={HAND_CURSOR_PATH} />
            <BrushPath
              className="line-cursor__outline"
              d={HAND_CURSOR_PATH}
              layers={CURSOR_STROKE_LAYERS}
            />
            <BrushPath
              className="line-cursor__click-mark"
              d={CLICK_MARKS_PATH}
              layers={CURSOR_STROKE_LAYERS}
            />
          </g>
        </g>
      </svg>
    </div>
  );
};

export default WigglyLine;
