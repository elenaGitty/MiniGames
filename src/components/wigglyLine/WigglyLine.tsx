import React, { useCallback, useEffect, useRef } from 'react';
import './WigglyLine.scss';
import BrushPath from '../BrushPath/BrushPath';
import WaveBall, { createWaveBallPath } from './WaveBall';
import OffscreenArrow from './OffscreenArrow';
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
const ARROW_EXIT_DURATION = 160;
const CURSOR_LINE_HIT_RADIUS = 20;
const CURSOR_STROKE_LAYERS = ['soft', 'main', 'bristle'] as const;
const POINTER_CURSOR_PATH = 'M 4 2 L 4 29 L 11 22 L 16 35 Q 17 37 19 36 Q 21 35 20 33 L 16 22 L 26 22 Z';
const HAND_CURSOR_PATH = 'M 11 36 Q 8 33 7 29 L 5 23 Q 4 21 6 20 Q 8 19 9 22 L 11 27 L 11 10 Q 11 7 14 7 Q 17 7 17 10 L 17 21 L 18 16 Q 19 13 22 14 Q 24 15 23 18 L 22 22 Q 24 19 26 21 Q 28 23 26 26 L 24 33 Q 23 37 19 38 Z';
const CLICK_MARKS_PATH = 'M 4 9 L 1 6 M 9 5 L 9 1 M 2 13 L -1 13';
const FRAME_BOUNDS = { left: 20, right: 990, top: 25, bottom: 575 };
const ARROW_INSET = 18;
const DISTANCE_DIGIT_PATHS: Record<string, string> = {
  '0': 'M 5.3 0.7 C 2.7 0.4 1.1 2.7 1.2 6.4 C 0.9 10.3 2.4 13.4 5 13.1 C 7.8 13.2 9 10.5 8.8 6.9 C 8.9 3.4 7.6 0.9 5.3 0.7 Z',
  '1': 'M 2 3 C 3.5 2.7 4.7 1.2 5.5 0.6 L 5.2 13.1 M 2.6 13.2 C 4.4 13.1 6.8 13.3 8.2 13',
  '2': 'M 1.1 3.4 C 1.4 1.2 3.2 0.5 5.4 0.7 C 7.8 0.7 8.9 2.3 8.7 4.1 C 8.7 5.7 6.8 7 5.4 8.2 C 3.8 9.6 2.3 11.3 1 12.7 C 3.5 12.5 6.7 12.9 9.1 12.4',
  '3': 'M 1.5 1.7 C 3 0.7 5.5 0.5 7.2 1.5 C 9 2.6 8.3 4.8 6.8 5.8 L 4.4 6.5 C 6.2 6.1 8.5 7 8.7 9.3 C 9.1 12 6.7 13.4 4.5 13.1 C 2.8 13.2 1.4 12.5 0.9 11.5',
  '4': 'M 6.7 13.4 C 6.9 9.5 6.8 4.8 7 0.8 C 5.1 3.2 2.4 6.7 1 8.5 C 3.7 8.3 6.8 8.6 9.1 8.4',
  '5': 'M 8.6 1.1 C 6.6 1.2 4.1 0.9 2 1 C 1.8 2.7 1.7 4.5 1.5 5.9 C 2.8 5 4.4 4.8 6 5.3 C 8.1 5.8 9 7.6 8.8 9.7 C 8.5 12.2 6.8 13.4 4.5 13.2 C 2.9 13 1.5 12.5 0.9 11.4',
  '6': 'M 7.8 1.3 C 6.3 0.5 4.8 0.8 3.6 2 C 1.6 4 1 7 1.3 9.7 C 1.6 12.3 3.1 13.5 5.3 13.2 C 7.6 13.1 8.7 11.4 8.5 9.1 C 8.4 6.8 6.8 5.7 5 5.8 C 3.4 5.8 2.1 6.8 1.4 8.2',
  '7': 'M 1 1.2 C 3.4 1 6.3 1.4 8.9 1.1 C 6.6 5 4.5 9.5 3.1 13.4',
  '8': 'M 5 0.8 C 2.8 0.5 1.4 1.8 1.5 3.6 C 1.5 5.3 3.1 6.2 5.2 6.7 C 7.4 7.2 8.9 8.3 8.8 10.2 C 8.7 12.3 7 13.3 4.8 13.2 C 2.4 13 1.1 11.8 1.2 9.9 C 1.3 8.2 2.8 7.2 5.1 6.7 C 7.1 6.1 8.5 5.2 8.3 3.4 C 8.1 1.7 7 0.8 5 0.8 Z',
  '9': 'M 7.7 6.6 C 6.7 7.6 5.2 7.8 3.8 7.5 C 1.7 7 1 5.6 1.2 3.6 C 1.3 1.7 2.9 0.5 5 0.8 C 7.3 0.8 8.5 2.7 8.4 5.4 C 8.5 9.2 7.1 12.5 3.2 13.3',
};
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

const drawDistanceLabel = (group: SVGGElement, value: string) => {
  const characterWidth = 10;
  const characterGap = 2;
  const totalWidth = value.length * (characterWidth + characterGap) - characterGap;
  group.replaceChildren();

  value.split('').forEach((digit, index) => {
    const digitGroup = document.createElementNS(SVG_NAMESPACE, 'g');
    digitGroup.setAttribute(
      'transform',
      `translate(${-totalWidth / 2 + index * (characterWidth + characterGap)} 0)`,
    );
    const pathData = DISTANCE_DIGIT_PATHS[digit];
    if (!pathData) return;

    ['soft', 'main', 'bristle'].forEach((layer) => {
      const path = document.createElementNS(SVG_NAMESPACE, 'path');
      path.setAttribute('d', pathData);
      path.setAttribute('class', `brush-outline--${layer}`);
      digitGroup.append(path);
    });
    group.append(digitGroup);
  });
};

const WigglyLine: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const lineCursorRef = useRef<SVGSVGElement>(null);
  const lineRefs = useRef<Array<SVGPathElement | null>>([]);
  const ballRef = useRef<SVGGElement>(null);
  const ballOutlineRefs = useRef<Array<SVGPathElement | null>>([]);
  const offscreenArrowRef = useRef<SVGGElement>(null);
  const offscreenDistanceRef = useRef<SVGGElement>(null);
  const ballState = useRef({
    x: 0,
    y: 0,
    velocityX: 0,
    velocityY: 0,
    active: false,
    onWave: false,
    impactReady: true,
  });
  const ballRotation = useRef(0);
  const initialPath = createWavePath(createWaveMotionState());
  const dropBall = useCallback((progress: number) => {
    const ball = ballState.current;
    ball.x = WAVE_START_X + progress * (WAVE_END_X - WAVE_START_X);
    ball.x = Math.max(
      WAVE_START_X + BALL_RADIUS,
      Math.min(WAVE_END_X - BALL_RADIUS, ball.x),
    );
    ball.y = -BALL_RADIUS * 2;
    ball.velocityX = 0;
    ball.velocityY = 0;
    ball.onWave = false;
    ball.impactReady = true;
    ball.active = true;
    ballRotation.current = 0;
    ballRef.current?.setAttribute('visibility', 'visible');
  }, []);

  useEffect(() => {
    const wave = createWaveMotionState();
    const previousWave = createWaveMotionState();
    const previousImpactRipple = { center: 0, age: 0, strength: 0 };
    const wavePathSamples = new Float64Array(WAVE_POINT_COUNT);
    let ballVerticalRadius = BALL_RADIUS;
    let ballAspectScale = 1;
    let ballSquash = 0;
    let ballSquashTarget = 0;
    let fallShapeMix = 0;
    let fallShapeRecovery = 0;
    let previousPointer: { x: number; y: number; time: number } | null = null;
    let arrowIsShown = false;
    let arrowExitElapsed = 0;
    let previousDistanceLabel = '';
    let frameId = 0;
    let previousFrameTime = 0;

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
        const previousBallX = ball.x;
        ballSquashTarget *= Math.exp(-seconds / 0.09);
        const squashTime = ballSquashTarget > ballSquash ? 0.04 : 0.18;
        ballSquash += (ballSquashTarget - ballSquash) * (1 - Math.exp(-seconds / squashTime));
        const previousProgress = Math.max(
          0,
          Math.min(1, (ball.x - WAVE_START_X) / (WAVE_END_X - WAVE_START_X)),
        );
        const previousSurfaceY = getWaveY(previousProgress, previousWave);
        const currentSurfaceAtPreviousX = getWaveY(previousProgress, wave);
        const surfaceVelocity = seconds === 0
          ? 0
          : (currentSurfaceAtPreviousX - previousSurfaceY) / seconds;

        if (!ball.onWave) {
          ball.velocityY += PHYSICS.gravity * seconds;
        }
        ball.x += ball.velocityX * seconds;
        ball.y += ball.velocityY * seconds;
        fallShapeRecovery = Math.max(0, fallShapeRecovery - seconds);
        const targetFallShapeMix = ball.onWave
          || fallShapeRecovery > 0
          ? 0
          : Math.min(Math.max(ball.velocityY, 0) / 180, 1);
        fallShapeMix += (targetFallShapeMix - fallShapeMix)
          * (1 - Math.exp(-deltaTime / 150));
        let shapeVerticalRadius = ballVerticalRadius * (1 + fallShapeMix * 0.3);

        const progress = Math.max(
          0,
          Math.min(1, (ball.x - WAVE_START_X) / (WAVE_END_X - WAVE_START_X)),
        );
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

        const surfaceClearance = shapeVerticalRadius * normalLength + 1.5;
        const penetratesWave = ball.y + surfaceClearance >= surfaceY;

        if (!penetratesWave && !ball.onWave) {
          ball.impactReady = true;
        }

        if (overWave && (penetratesWave || ball.onWave)) {
          fallShapeRecovery = 0.3;
          ball.y = surfaceY - surfaceClearance;

          if (ball.onWave) {
            ball.velocityY = surfaceVelocity + contactSlope * ball.velocityX;
          } else {
            const impact = resolveSurfaceImpact(ball, {
              normalX: contactSlope,
              normalY: -1,
              surfaceVelocityY: surfaceVelocity,
            });

            if (ball.impactReady && impact.relativeNormalVelocity < -12) {
              const impactSpeed = impact.impactSpeed;
              const horizontalVelocityChange = Math.max(
                -PHYSICS.impactSideImpulseLimit,
                Math.min(
                  PHYSICS.impactSideImpulseLimit,
                  impact.velocityX - ball.velocityX,
                ),
              );
              ball.velocityX += horizontalVelocityChange;
              ball.velocityY = impact.velocityY;
              ball.onWave = false;
              ball.impactReady = false;
              ballSquashTarget = Math.max(
                ballSquashTarget,
                Math.min(0.2, 0.06 + impactSpeed / 1800),
              );
              wave.impactRipple = {
                center: progress,
                age: 0,
                strength: Math.min(0.5 + impactSpeed * 0.004, 1.2),
              };
            } else if (Math.abs(impact.relativeNormalVelocity) < 10) {
              ball.onWave = true;
              ball.velocityY = surfaceVelocity + contactSlope * ball.velocityX;
            } else {
              ball.onWave = false;
            }
          }
        } else if (ball.onWave) {
          ball.onWave = false;
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
        const floor = FRAME_BOUNDS.bottom - shapeVerticalRadius;

        if (ball.x < leftWall) {
          ball.x = leftWall;
          if (ball.velocityX < 0) {
            ball.velocityX = -ball.velocityX * PHYSICS.wallRestitution;
          }
        } else if (ball.x > rightWall) {
          ball.x = rightWall;
          if (ball.velocityX > 0) {
            ball.velocityX = -ball.velocityX * PHYSICS.wallRestitution;
          }
        }

        if (ball.y > floor) {
          fallShapeRecovery = 0.3;
          ball.y = floor;
          if (ball.velocityY > 0) {
            ball.velocityY = -ball.velocityY * PHYSICS.floorRestitution;
          }
          ball.onWave = false;
        }

        if (fallShapeRecovery > 0 || ball.onWave || ball.velocityY <= 0) {
          fallShapeMix += (0 - fallShapeMix) * (1 - Math.exp(-deltaTime / 100));
          shapeVerticalRadius = ballVerticalRadius * (1 + fallShapeMix * 0.3);
        }

        ball.velocityX = Math.max(
          -PHYSICS.rollingSpeedLimit,
          Math.min(PHYSICS.rollingSpeedLimit, ball.velocityX),
        );
        ballRotation.current += ((ball.x - previousBallX) / BALL_RADIUS) * (180 / Math.PI);
        const impactScaleY = Math.max(0.8, 1 - ballSquash);
        const impactScaleX = 1 / Math.sqrt(impactScaleY);
        const fallStretch = 1 + fallShapeMix * 0.3;
        const ballPath = createWaveBallPath(BALL_RADIUS);
        for (let index = 0; index < ballOutlineRefs.current.length; index += 1) {
          ballOutlineRefs.current[index]?.setAttribute('d', ballPath);
        }
        const anchoredY = ball.y + shapeVerticalRadius * (1 - impactScaleY);
        const rotation = ballRotation.current * (Math.PI / 180);
        const cosine = Math.cos(rotation);
        const sine = Math.sin(rotation);
        ballRef.current.setAttribute(
          'transform',
          `translate(${ball.x} ${anchoredY}) matrix(${cosine * impactScaleX} ${fallStretch * sine * impactScaleX * ballAspectScale} ${-sine * impactScaleY / ballAspectScale} ${fallStretch * cosine * impactScaleY} 0 0)`,
        );

        const isOffscreen = ball.x < BALL_RADIUS
          || ball.x > VIEWBOX_WIDTH - BALL_RADIUS
          || ball.y < ballVerticalRadius
          || ball.y > VIEWBOX_HEIGHT - shapeVerticalRadius;
        if (offscreenArrowRef.current) {
          if (isOffscreen) {
            const centerX = VIEWBOX_WIDTH / 2;
            const centerY = VIEWBOX_HEIGHT / 2;
            const directionX = ball.x - centerX;
            const directionY = ball.y - centerY;
            const horizontalScale = directionX === 0
              ? Number.POSITIVE_INFINITY
              : (directionX > 0
                ? FRAME_BOUNDS.right - ARROW_INSET - centerX
                : centerX - FRAME_BOUNDS.left - ARROW_INSET) / Math.abs(directionX);
            const verticalScale = directionY === 0
              ? Number.POSITIVE_INFINITY
              : (directionY > 0
                ? FRAME_BOUNDS.bottom - ARROW_INSET - centerY
                : centerY - FRAME_BOUNDS.top - ARROW_INSET) / Math.abs(directionY);
            const scale = Math.min(horizontalScale, verticalScale);
            const arrowX = centerX + directionX * scale;
            const arrowY = centerY + directionY * scale;
            const svgBounds = svgRef.current?.getBoundingClientRect();
            const scaleX = svgBounds ? VIEWBOX_WIDTH / svgBounds.width : 1;
            const scaleY = svgBounds ? VIEWBOX_HEIGHT / svgBounds.height : 1;
            const angle = Math.atan2(directionY / scaleY, directionX / scaleX) * (180 / Math.PI);

            offscreenArrowRef.current.setAttribute(
              'transform',
              `translate(${arrowX} ${arrowY}) scale(${scaleX} ${scaleY}) rotate(${angle})`,
            );
            const leftDistance = Math.max(BALL_RADIUS - ball.x, 0);
            const rightDistance = Math.max(ball.x - (VIEWBOX_WIDTH - BALL_RADIUS), 0);
            const topDistance = Math.max(ballVerticalRadius - ball.y, 0);
            const bottomDistance = Math.max(
              ball.y - (VIEWBOX_HEIGHT - ballVerticalRadius),
              0,
            );
            const distanceInPixels = Math.hypot(
              (leftDistance || rightDistance) * (svgBounds?.width ?? 1) / VIEWBOX_WIDTH,
              (topDistance || bottomDistance) * (svgBounds?.height ?? 1) / VIEWBOX_HEIGHT,
            );
            if (offscreenDistanceRef.current) {
              offscreenDistanceRef.current.setAttribute(
                'transform',
                `translate(${arrowX} ${arrowY}) scale(${scaleX} ${scaleY}) translate(0 27)`,
              );
              const label = offscreenDistanceRef.current.firstElementChild;
              const labelText = `${Math.round(distanceInPixels / 10)}`;
              if (label instanceof SVGGElement && labelText !== previousDistanceLabel) {
                drawDistanceLabel(label, labelText);
                previousDistanceLabel = labelText;
              }
              offscreenDistanceRef.current.setAttribute('visibility', 'visible');
            }
            if (!arrowIsShown) {
              arrowIsShown = true;
              arrowExitElapsed = 0;
              offscreenArrowRef.current.setAttribute('visibility', 'visible');
              offscreenArrowRef.current.classList.remove('offscreen-arrow--exit');
              offscreenArrowRef.current.classList.remove('offscreen-arrow--enter');
              void offscreenArrowRef.current.getBoundingClientRect();
              offscreenArrowRef.current.classList.add('offscreen-arrow--enter');
            }
          } else {
            if (arrowIsShown) {
              arrowIsShown = false;
              arrowExitElapsed = 0;
              offscreenArrowRef.current.classList.remove('offscreen-arrow--enter');
              offscreenArrowRef.current.classList.remove('offscreen-arrow--exit');
              void offscreenArrowRef.current.getBoundingClientRect();
              offscreenArrowRef.current.classList.add('offscreen-arrow--exit');
            }
            if (arrowExitElapsed >= ARROW_EXIT_DURATION) {
              offscreenArrowRef.current.setAttribute('visibility', 'hidden');
              offscreenArrowRef.current.classList.remove('offscreen-arrow--exit');
              offscreenDistanceRef.current?.setAttribute('visibility', 'hidden');
            } else if (!arrowIsShown) {
              arrowExitElapsed += deltaTime;
            }
          }
        }
      } else {
        if (arrowIsShown && offscreenArrowRef.current) {
          arrowIsShown = false;
          arrowExitElapsed = 0;
          offscreenArrowRef.current.classList.remove('offscreen-arrow--enter');
          offscreenArrowRef.current.classList.remove('offscreen-arrow--exit');
          void offscreenArrowRef.current.getBoundingClientRect();
          offscreenArrowRef.current.classList.add('offscreen-arrow--exit');
        }
        if (offscreenArrowRef.current && arrowExitElapsed >= ARROW_EXIT_DURATION) {
          offscreenArrowRef.current.setAttribute('visibility', 'hidden');
          offscreenArrowRef.current.classList.remove('offscreen-arrow--exit');
          offscreenDistanceRef.current?.setAttribute('visibility', 'hidden');
        } else if (!arrowIsShown) {
          arrowExitElapsed += deltaTime;
        }
      }

      frameId = window.requestAnimationFrame(animate);
    };

    const updateBallAspectRatio = () => {
      const bounds = svgRef.current?.getBoundingClientRect();
      const outlines = ballRef.current?.children;
      if (!bounds || bounds.width === 0 || bounds.height === 0 || !outlines) return;

      const verticalScale = (bounds.width * VIEWBOX_HEIGHT) / (bounds.height * VIEWBOX_WIDTH);
      ballAspectScale = verticalScale;
      ballVerticalRadius = BALL_RADIUS * verticalScale;
      Array.from(outlines).forEach((outline) => {
        outline.setAttribute('transform', `scale(1 ${verticalScale})`);
      });
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
        wave.targetEnergy = Math.max(wave.targetEnergy, Math.min(speed * 110, 0.3));

        const force = Math.max(-0.08, Math.min(0.08, (deltaX / bounds.width) * 1.4));
        wave.pendingForce = Math.max(-0.12, Math.min(0.12, wave.pendingForce + force));
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
            outlineRefs={ballOutlineRefs.current}
            radius={BALL_RADIUS}
          />
          <BrushPath
            className="wiggly-path"
            d={initialPath}
            pathRefs={lineRefs}
          />
          <OffscreenArrow
            arrowRef={offscreenArrowRef}
            distanceRef={offscreenDistanceRef}
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
