import React from "react";

interface SpacingControlProps {
  spacing: string;
  onSpacingChange: (spacing: string) => void;
}

const options = ["Cozy", "Default", "Comfortable"];

const SpacingControl = ({ spacing, onSpacingChange }: SpacingControlProps) => {
  const handleChange = (e) => {
    onSpacingChange(e.target.value);
  };

  return (
    <div>
      <span>Spacing: </span>
      <select value={spacing} onChange={handleChange}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <span> (Adjust editor padding)</span>
    </div>
  );
};

export default SpacingControl;

