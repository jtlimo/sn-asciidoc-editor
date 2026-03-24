import React from "react";

interface TextAreaProps {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  disabled?: boolean;
}

const TextArea = ({ value, onChange, rows = 3, disabled = false }: TextAreaProps) => {
  const handleChange = (e) => {
    onChange(e.target.value);
  };

  return <textarea className="sn-editor" rows={rows} disabled={disabled} value={value} onChange={handleChange} />;
};

export default TextArea;

