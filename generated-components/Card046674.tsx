import React from 'react';
import './Card046674.css';

interface Card046674Props {
  children: React.ReactNode;
  padding?: string;
  shadow?: boolean;
  rounded?: boolean;
}

const Card046674: React.FC<Card046674Props> = ({
  children,
  padding = "medium",
  shadow = true,
  rounded = true,
}) => {
  return (
    <div className="card-component">{children}</div>
  );
};

export default Card046674;
