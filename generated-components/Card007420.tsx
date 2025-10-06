import React from 'react';
import './Card007420.css';

interface Card007420Props {
  children: React.ReactNode;
  padding?: string;
  shadow?: boolean;
  rounded?: boolean;
}

const Card007420: React.FC<Card007420Props> = ({
  children,
  padding = "medium",
  shadow = true,
  rounded = true,
}) => {
  return (
    <div className="card-component">{children}</div>
  );
};

export default Card007420;
