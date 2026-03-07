import { useState } from 'react';
import './CDButton.css';

export interface CDButtonProps {
  /** Size of the button in pixels (default: 120) */
  size?: number;
  /** Click handler function */
  onClick?: () => void;
  /** Additional CSS class name */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Label or content for the button */
  children?: React.ReactNode;
  /** Aria label for accessibility */
  ariaLabel?: string;
}

const CDButton: React.FC<CDButtonProps> = ({
  size = 120,
  onClick,
  className = '',
  disabled = false,
  children,
  ariaLabel = 'CD Button',
}) => {
  const [isSpinning, setIsSpinning] = useState(false);

  const handleClick = () => {
    if (disabled || !onClick) return;

    // Trigger spinning animation
    setIsSpinning(true);
    
    // Call the onClick handler
    onClick();

    // Reset spinning state after animation completes
    setTimeout(() => {
      setIsSpinning(false);
    }, 2000); // Match animation duration
  };

  return (
    <button
      className={`cd-button ${isSpinning ? 'cd-button--spinning' : ''} ${className}`}
      onClick={handleClick}
      disabled={disabled}
      aria-label={ariaLabel}
      style={{ '--cd-size': `${size}px` } as React.CSSProperties}
    >
      <div className="cd-button__ring">
        <div className="cd-button__ring-gradient"></div>
      </div>
      <div className="cd-button__inner">
        <div className="cd-button__center">
          {children || (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.6" />
            </svg>
          )}
        </div>
      </div>
    </button>
  );
};

export default CDButton;
