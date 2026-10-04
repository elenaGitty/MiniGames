import './DropBallButton.scss';

type DropBallButtonProps = {
  onDrop: () => void;
  label?: string;
};

const DropBallButton = ({ onDrop, label = 'Drop the ball' }: DropBallButtonProps) => (
  <button
    className="drop-ball-button"
    type="button"
    aria-label={label}
    onClick={onDrop}
  >
    <svg
      className="drop-ball-button__icon"
      viewBox="0 0 60 48"
      aria-hidden="true"
      focusable="false"
    >
      <g className="brush-stroke">
        {['soft', 'main', 'bristle'].map((layer) => (
          <g key={layer} className={`drop-ball-button__stroke brush-outline--${layer}`}>
            <rect x="3" y="3" width="54" height="42" rx="9" />
            <circle cx="30" cy="24" r="7" />
          </g>
        ))}
      </g>
    </svg>
  </button>
);

export default DropBallButton;
