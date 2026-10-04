import {
  forwardRef,
  useImperativeHandle,
  useRef,
} from 'react';
import './SvgLineText.scss';

export type SvgLineTextPosition = {
  x: number;
  y: number;
  angle: number;
};

export type SvgLineTextHandle = {
  updatePositions: (positions: SvgLineTextPosition[]) => void;
  setRevealProgress: (progress: number) => void;
};

type SvgLineTextProps = {
  text: string;
  className?: string;
};

const SvgLineText = forwardRef<SvgLineTextHandle, SvgLineTextProps>(
  ({ text, className }, ref) => {
    const groupRef = useRef<SVGGElement>(null);
    const characters = Array.from(text);

    useImperativeHandle(ref, () => ({
      updatePositions: (positions) => {
        const glyphs = groupRef.current?.querySelectorAll<SVGTextElement>(
          '.svg-line-text__character',
        );
        if (!glyphs) return;

        glyphs.forEach((glyph, index) => {
          const position = positions[index];
          if (!position) return;
          glyph.setAttribute(
            'transform',
            `translate(${position.x} ${position.y}) rotate(${position.angle})`,
          );
        });
      },
      setRevealProgress: (progress) => {
        const glyphs = groupRef.current?.querySelectorAll<SVGTextElement>(
          '.svg-line-text__character',
        );
        if (!glyphs) return;

        const outermostIndex = Math.max(
          ...Array.from(glyphs, (_, index) => Math.abs(index - (glyphs.length - 1) / 2)),
        );
        glyphs.forEach((glyph, index) => {
          const distanceFromCenter = Math.abs(index - (glyphs.length - 1) / 2);
          const fadeOrder = outermostIndex - distanceFromCenter;
          const disappearanceProgress = 1 - progress;
          const fadeAmount = Math.max(
            0,
            Math.min(1, disappearanceProgress * (outermostIndex + 1) - fadeOrder),
          );
          glyph.setAttribute('opacity', String(1 - fadeAmount));
        });
      },
    }), []);

    return (
      <g ref={groupRef} aria-label={text}>
        {characters.map((character, index) => (
          <text
            key={`${character}-${index}`}
            className={`${className ?? ''} svg-line-text__character`}
            data-character={character}
            textAnchor="middle"
            dominantBaseline="central"
          >
            {character === ' ' ? '\u00a0' : character}
          </text>
        ))}
      </g>
    );
  },
);

SvgLineText.displayName = 'SvgLineText';

export default SvgLineText;
