import React from 'react';
import './Card023816.css';

interface Card023816Props {
  children: React.ReactNode;
  padding?: string;
  shadow?: boolean;
  rounded?: boolean;
}

const Card023816: React.FC<Card023816Props> = ({
  children,
  padding = "medium",
  shadow = true,
  rounded = true,
}) => {
  return (
    <div className="card-component">{children}</div>
  );
};

export default Card023816;
