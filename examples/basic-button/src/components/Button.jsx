import React from 'react';
import '../styles/button.css';

/**
 * Button component generated from VDS drawing canvas
 * 
 * This component is automatically generated when you draw button shapes
 * in the VDS canvas. The styles are synchronized with your visual design.
 */
export const Button = ({ 
  children = 'Click me',
  variant = 'primary',
  size = 'medium',
  disabled = false,
  onClick,
  ...props 
}) => {
  const handleClick = (e) => {
    if (!disabled && onClick) {
      onClick(e);
    }
  };

  return (
    <button 
      className={`button button-${variant} button-${size}`}
      onClick={handleClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

// Example usage:
// <Button variant="primary" size="large" onClick={() => alert('Clicked!')}>
//   Primary Button
// </Button>