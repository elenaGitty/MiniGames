import type { Ref } from 'react';

const OUTLINE_LAYERS = ['soft', 'main', 'bristle'] as const;

type WaveBallProps = {
  ballRef: Ref<SVGGElement>;
  spinRef: Ref<SVGGElement>;
  aspectRef: Ref<SVGGElement>;
  blurRef: Ref<SVGFEGaussianBlurElement>;
  fillRef: Ref<SVGPathElement>;
  outlineRefs: Array<SVGPathElement | null>;
  radius: number;
};

export const createWaveBallPath = (radius: number) => {
  const horizontalRadius = radius;
  const verticalRadius = radius;
  const pointCount = 48;
  const points = Array.from({ length: pointCount }, (_, index) => {
    const angle = (index / pointCount) * Math.PI * 2 - Math.PI / 2;
    const brushWobble = 1
      + Math.sin(angle * 3 + 0.35) * 0.022
      + Math.sin(angle * 7 + 1.1) * 0.012
      + Math.sin(angle * 11 - 0.4) * 0.006;

    return {
      x: Math.cos(angle) * horizontalRadius * brushWobble,
      y: Math.sin(angle) * verticalRadius * brushWobble,
    };
  });

  return points.reduce((path, point, index) => {
    const previous = points[(index - 1 + pointCount) % pointCount];
    const next = points[(index + 1) % pointCount];
    const afterNext = points[(index + 2) % pointCount];
    const control1X = point.x + (next.x - previous.x) / 6;
    const control1Y = point.y + (next.y - previous.y) / 6;
    const control2X = next.x - (afterNext.x - point.x) / 6;
    const control2Y = next.y - (afterNext.y - point.y) / 6;

    return `${path}${index === 0 ? `M ${point.x} ${point.y}` : ''} C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${next.x} ${next.y}`;
  }, '') + ' Z';
};

const WaveBall = ({
  ballRef,
  spinRef,
  aspectRef,
  blurRef,
  fillRef,
  outlineRefs,
  radius,
}: WaveBallProps) => {
  const path = createWaveBallPath(radius);

  return (
    <>
      <defs>
        <filter id="wave-ball-air-blur" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur ref={blurRef} stdDeviation="0" />
        </filter>
      </defs>
      <g
        ref={ballRef}
        className="wave-ball"
        filter="url(#wave-ball-air-blur)"
        visibility="hidden"
      >
        <g ref={spinRef}>
          <g ref={aspectRef}>
            <path ref={fillRef} className="wave-ball__fill" d={path} />
            {OUTLINE_LAYERS.map((layer, index) => (
              <path
                key={layer}
                ref={(element) => {
                  outlineRefs[index] = element;
                }}
                className={`wave-ball__outline brush-outline--${layer}`}
                d={path}
              />
            ))}
          </g>
        </g>
      </g>
    </>
  );
};

export default WaveBall;
