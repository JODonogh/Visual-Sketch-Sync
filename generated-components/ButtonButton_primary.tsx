import React from 'react';
import './ButtonButton_primary.css';

interface ButtonButton_primaryProps {
  children?: React.ReactNode;
  variant?: string;
  size?: string;
  disabled?: boolean;
  onClick: () => void;
  rounded?: boolean;
}

const ButtonButton_primary: React.FC<ButtonButton_primaryProps> = ({
  children = "Click Me",
  variant = "primary",
  size = "medium",
  disabled = false,
  onClick,
  rounded = true,
}) => {
  return (
    <button className={`button_primary-button ${className}`} onClick={onClick} disabled={disabled}>{children}</button>
  );
};

export default ButtonButton_primary;
