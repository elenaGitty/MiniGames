import type { MutableRefObject } from 'react';

const BRUSH_LAYERS = ['soft', 'main', 'bristle'] as const;

type BrushPathProps = {
  d: string;
  className?: string;
  layers?: readonly string[];
  pathRefs?: MutableRefObject<Array<SVGPathElement | null>>;
  bristleOffset?: number;
};

const BrushPath = ({
  d,
  className,
  layers = BRUSH_LAYERS,
  pathRefs,
  bristleOffset = 1,
}: BrushPathProps) => (
  <>
    {layers.map((layer, index) => (
      <path
        key={layer}
        ref={pathRefs
          ? (element) => {
            pathRefs.current[index] = element;
          }
          : undefined}
        className={`${className ?? ''} ${className ? `${className}--${layer}` : ''} brush-outline--${layer}`.trim()}
        d={d}
        transform={layer === 'bristle' ? `translate(0 ${bristleOffset})` : undefined}
      />
    ))}
  </>
);

export default BrushPath;
