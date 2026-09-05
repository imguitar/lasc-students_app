import React from 'react';
import './GradientStatCard.css';

const GradientStatCard = ({ title, value, unit, color, children }) => {
  // compute a brighter secondary accent for a vivid gradient
  const light = (() => {
    try {
      const c = color.replace('#', '');
      const num = parseInt(c, 16);
      let r = (num >> 16) & 0xff;
      let g = (num >> 8) & 0xff;
      let b = num & 0xff;
      // increase mix towards white for brighter, more vivid gradients
      const mix = 0.62;
      r = Math.round(r + (255 - r) * mix);
      g = Math.round(g + (255 - g) * mix);
      b = Math.round(b + (255 - b) * mix);
      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    } catch (e) {
      return color;
    }
  })();

  const isPlainIcon = React.isValidElement(children) && children.props && children.props['data-plain-icon'];

  return (
    <div className="stat-card gradient-stat" style={{ ['--accent']: color, ['--accent-2']: light }}>
      <div className="stat-left">
        <h3>{title}</h3>
        <p className="big-number">{value}</p>
        {unit && <p>{unit}</p>}
      </div>
      <div className={"stat-icon-box" + (isPlainIcon ? ' plain' : '')} aria-hidden>
        {children}
      </div>
    </div>
  );
};

export default GradientStatCard;
