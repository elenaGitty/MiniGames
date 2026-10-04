import './HandDrawnText.scss';

const CHARACTER_PATHS: Record<string, string> = {
  A: 'M 0.8 13.5 L 2.1 9.2 3.7 4.8 5.3 0.8 6.7 4.5 8.1 9 9.2 13.2 M 2 9.8 L 7.8 9.5',
  B: 'M 1.5 13 L 1.6 0.9 5.4 1 7.7 2.1 8.1 4 7 5.7 3.2 6.2 6.2 6.3 8.4 7.4 8.6 9.8 7.4 12 5.1 13.1 Z',
  C: 'M 8.7 2.2 L 6.4 0.9 4.1 1 2.2 2.8 1.2 5.4 1.3 8.5 2.7 11.4 4.9 12.9 7.1 12.4 8.7 11.2',
  D: 'M 1.5 13 L 1.6 1 4.5 0.9 7.1 2.2 8.5 4.7 8.7 7.8 7.3 10.8 5.1 12.8 Z',
  E: 'M 8.4 1 L 2 1.1 1.7 6.4 7 6.1 M 1.7 6.4 L 1.4 12.8 8.8 12.5',
  F: 'M 1.7 13 L 1.9 0.9 8.7 1 M 1.8 6.1 L 7 6',
  G: 'M 8.7 2.1 L 6.7 0.9 4.2 1.1 2.2 3.2 1.2 6.1 1.6 9.2 3.2 11.8 5.5 13 8.2 12.2 8.5 7.2 5.5 7.4',
  H: 'M 1.5 0.8 L 1.4 13.2 M 8.5 0.9 L 8.2 13 M 1.5 6.7 L 8.4 6.3',
  I: 'M 2.2 1 L 7.7 0.9 M 5 1 L 4.8 12.8 M 1.9 13 L 7.5 12.8',
  J: 'M 7.7 1 L 7.3 9.6 6.1 12.1 4 13 2 12.1 1.1 10.6',
  K: 'M 1.6 0.8 L 1.4 13.2 M 8.7 1 L 5.4 5.4 2.1 7.2 M 4.6 6.2 L 8.8 13',
  L: 'M 1.8 0.9 L 1.5 12.8 8.7 12.7',
  M: 'M 1.2 13 L 1.5 1 3 1 5.1 6.2 7 1 8.4 1.2 8.9 13',
  N: 'M 1.4 13 L 1.6 1 2.4 1 7.8 10.8 8.4 1.2 8.8 13',
  O: 'M 5 0.8 L 2.7 1.4 1.3 3.7 1 7.1 2 10.4 4 12.6 6.5 12.8 8.4 10.6 9 7.1 8.5 3.7 7 1.4 5 0.8 Z',
  P: 'M 1.5 13 L 1.6 1 5.1 0.9 7.6 2 8.4 4.2 7.4 6.3 5.1 7.1 1.6 7',
  Q: 'M 5 0.8 L 2.7 1.4 1.3 3.7 1 7.1 2 10.4 4 12.6 6.5 12.8 8.4 10.6 9 7.1 8.5 3.7 7 1.4 5 0.8 Z M 6.2 10.4 L 9.8 14',
  R: 'M 1.5 13 L 1.6 1 5.1 0.9 7.6 2 8.4 4.2 7.4 6.3 5.1 7.1 1.6 7 M 5.1 7.1 L 8.8 13',
  S: 'M 8.2 1.7 L 6 0.9 3.5 1.1 1.8 2.7 1.5 4.5 3 5.8 6.8 7.1 8.2 8.7 8 10.7 6.1 12.6 3.5 12.8 1.2 11.6',
  T: 'M 0.9 1.2 L 4.8 1.1 9 0.9 M 5 1.1 L 4.8 13.2',
  U: 'M 1.4 1 L 1.5 8.8 2.4 11.4 4.4 12.8 6.5 12.6 8.1 10.6 8.5 1.1',
  V: 'M 1 1 L 2.2 5.2 3.8 9.5 5.1 13 6.5 9.1 8.8 1',
  W: 'M 0.8 1 L 2 12.8 3.5 12.8 5 6.5 6.7 12.9 8.2 12.5 9.2 1',
  X: 'M 1.2 1 L 8.7 12.9 M 8.5 1 L 1.1 13',
  Y: 'M 1 1 L 4.8 6.5 8.8 1.1 M 4.8 6.5 L 4.7 13.1',
  Z: 'M 1 1.3 L 8.8 1 1.2 12.5 8.9 12.7',
  '0': 'M 5.2 0.8 L 3.1 0.6 1.7 2.4 1.1 5.1 1.5 8.6 2.7 11.5 4.7 13 6.8 12.4 8.3 10 8.9 6.2 8.2 2.6 6.7 1 5.2 0.8 Z',
  '1': 'M 1.8 3.1 L 4.1 2.2 5.8 0.5 5.1 13.2 M 2 13.4 L 8.5 13',
  '2': 'M 1.3 3.3 L 1.7 1.6 3.4 0.7 5.8 0.8 7.7 1.5 8.8 3.1 8.2 5 6.7 6.8 4.7 8.5 2.9 10.5 1.1 12.7 4 12.5 6.8 12.8 9.1 12.3',
  '3': 'M 1.4 1.5 L 3.3 0.8 5.8 0.7 7.8 1.6 8.5 3.2 7.7 4.8 6 5.8 4.3 6.3 6.2 6.5 8 7.6 8.7 9.4 8.1 11.4 6.3 12.8 4.1 13.2 2.1 12.6 1 11.5',
  '4': 'M 6.7 13.4 L 6.9 9.2 6.8 4.7 7.1 0.7 5.1 3.4 3.2 6.1 1.1 8.5 4.2 8.4 6.8 8.7 9.2 8.4',
  '5': 'M 8.7 1 L 6.3 1.2 4 0.9 2 1.1 1.8 3.4 1.5 5.9 3.2 5.1 5.4 5 7.4 5.8 8.7 7.6 8.8 9.7 7.6 11.8 5.7 13 3.5 13 1.6 12.3 0.9 11.2',
  '6': 'M 7.8 1.2 L 5.8 0.7 4 1.4 2.5 3.3 1.6 5.8 1.2 8.5 1.9 11.1 3.6 12.8 5.8 13.1 7.7 12 8.7 10.1 8.3 7.8 6.8 6.3 4.8 5.9 3 6.8 1.7 8.3',
  '7': 'M 0.9 1.2 L 3.2 1.1 5.5 1.4 8.9 1 7.1 4.1 5.5 7.2 4.1 10.1 3 13.5',
  '8': 'M 5 0.8 L 3 0.7 1.5 2 1.4 3.8 2.4 5.3 4.2 6.3 6.3 7 8 8.2 8.8 9.8 8.4 11.4 6.8 12.7 4.8 13.2 2.8 12.5 1.4 11 1.1 9.3 2 7.8 3.6 6.9 5.7 6.2 7.4 5.1 8.2 3.5 7.8 1.9 6.5 0.9 5 0.8 Z',
  '9': 'M 7.7 6.5 L 6.2 7.5 4.1 7.6 2.2 6.8 1.2 5.1 1.1 3.2 2.2 1.4 4.1 0.6 6.3 0.9 7.9 2.3 8.5 4.6 8.3 7.4 7.2 10.2 5.4 12.2 3 13.3',
  '-': 'M 1.2 7.2 L 4 7 6.5 7.2 9 7',
  '.': 'M 4.2 12.1 L 4.5 12.4',
  ',': 'M 4.3 11.8 L 4.6 12.3 3.9 13.6',
  '!': 'M 4.8 1 L 4.5 9.6 M 4.2 12.2 L 4.5 12.5',
  '?': 'M 1.2 3 L 2 1.3 4.2 0.7 6.8 1.2 8.4 2.7 8 4.4 6.2 5.8 4.8 7.2 4.5 9 M 4.2 12 L 4.5 12.4',
  ':': 'M 4.5 4.2 L 4.8 4.5 M 4.2 11.8 L 4.5 12.2',
  ';': 'M 4.5 4.2 L 4.8 4.5 M 4.2 11.3 L 4.5 11.8 3.8 13',
  '/': 'M 1.2 13 L 8.5 0.8',
};

type HandDrawnTextProps = {
  text: string;
  x?: number;
  y?: number;
  scale?: number;
  anchor?: 'start' | 'middle' | 'end';
  className?: string;
};

const HandDrawnText = ({
  text,
  x = 0,
  y = 0,
  scale = 1,
  anchor = 'middle',
  className,
}: HandDrawnTextProps) => {
  const characters = Array.from(text);
  const characterWidth = 10;
  const characterGap = 2;
  const totalWidth = characters.length * (characterWidth + characterGap) - characterGap;
  const width = totalWidth * scale;
  const height = 16 * scale;
  const svgX = x - (anchor === 'middle' ? width / 2 : anchor === 'end' ? width : 0);
  const rotations = [-4, 2.5, -3.5, 1.5];
  const verticalOffsets = [0.6, -0.4, 0.3, -0.6];

  return (
    <svg
      className={`hand-drawn-text ${className ?? ''}`.trim()}
      x={svgX}
      y={y}
      width={width}
      height={height}
      viewBox={`0 0 ${totalWidth} 16`}
      aria-label={text}
      role="img"
    >
      <g aria-hidden="true">
        {characters.map((character, index) => {
          const path = CHARACTER_PATHS[character.toUpperCase()];
          if (!path) return null;

          return (
            <g
              key={`${index}-${character}`}
              transform={`translate(${index * (characterWidth + characterGap)} ${verticalOffsets[index % verticalOffsets.length]}) rotate(${rotations[index % rotations.length]} 5 7)`}
            >
              {(['soft', 'main', 'bristle'] as const).map((layer) => (
                <path
                  key={layer}
                  d={path}
                  className={`brush-outline--${layer}`}
                  transform={layer === 'bristle' ? 'translate(0 0.45)' : undefined}
                />
              ))}
            </g>
          );
        })}
      </g>
      <text className="hand-drawn-text__selectable">
        {characters.map((character, index) => (
          <tspan
            key={`${index}-${character}`}
            x={index * (characterWidth + characterGap) + characterWidth / 2}
            y="12"
          >
            {character === ' ' ? '\u00a0' : character}
          </tspan>
        ))}
      </text>
    </svg>
  );
};

export default HandDrawnText;
