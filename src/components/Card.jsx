import React from "react";

export default function Card({ children, style, className = "", ...rest }) {
  return (
    <div className={`card ${className}`} style={style} {...rest}>
      {children}
    </div>
  );
}
