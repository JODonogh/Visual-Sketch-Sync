import React from 'react';
import './Card994512.css';

interface Card994512Props {
  children: React.ReactNode;
  padding?: string;
  shadow?: boolean;
  rounded?: boolean;
}

const Card994512: React.FC<Card994512Props> = ({
  children,
  padding = "medium",
  shadow = true,
  rounded = true,
}) => {
  return (
    <div className="card-component">{children}</div>
  );
};

export default Card994512;
