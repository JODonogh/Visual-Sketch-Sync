import React from 'react';
import './ButtonComponent.css';

interface ButtonComponentProps {
  children?: React.ReactNode;
  variant?: string;
  size?: string;
  disabled?: boolean;
  onClick: () => void;
}

const ButtonComponent: React.FC<ButtonComponentProps> = ({
  children = "Click Me",
  variant = "primary",
  size = "medium",
  disabled = false,
  onClick,
}) => {
  return (
    <button className={`component-button ${className}`} onClick={onClick} disabled={disabled}>{children}</button>
  );
};

export default ButtonComponent;
