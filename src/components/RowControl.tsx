import React from "react";

interface RowControlProps {
  rows: number;
  onRowsChange: (rows: number) => void;
}

const RowControl = ({ rows, onRowsChange }: RowControlProps) => {
  const decreaseRows = () => {
    if (rows > 1) {
      onRowsChange(rows - 1);
    }
  };

  const increaseRows = () => {
    onRowsChange(rows + 1);
  };

  return (
    <div>
      <button onClick={decreaseRows}>-</button>
      <span> {rows} Rows </span>
      <button onClick={increaseRows}>+</button>
      <span> (Adjust textarea height)</span>
    </div>
  );
};

export default RowControl;

