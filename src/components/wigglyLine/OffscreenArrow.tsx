import type { Ref } from 'react';

type OffscreenArrowProps = {
  arrowRef: Ref<SVGGElement>;
  distanceRef: Ref<SVGGElement>;
};

const OffscreenArrow = ({ arrowRef, distanceRef }: OffscreenArrowProps) => (
  <>
    <g ref={arrowRef} className="offscreen-arrow" visibility="hidden" pointerEvents="none">
      <g className="offscreen-arrow__motion">
        {['soft', 'main', 'bristle'].map((layer) => (
          <path
            key={layer}
            className={`offscreen-arrow__shape brush-outline--${layer}`}
            d="M 7 -1.8 Q 8.8 -0.8 8.8 0 Q 8.8 0.8 7 1.8 C 2.5 3.5 -1.5 6 -6 8 C -9 9.5 -11.5 7 -10 4 C -8.5 1.5 -8.5 -1.5 -10 -4 C -11.5 -7 -9 -9.5 -6 -8 C -1.5 -6 2.5 -3.5 7 -1.8 Z"
          />
        ))}
      </g>
    </g>
    <g
      ref={distanceRef}
      className="offscreen-distance"
      visibility="hidden"
      pointerEvents="none"
    >
      <g className="offscreen-distance__glyphs" />
    </g>
  </>
);

export default OffscreenArrow;
