import React, { useRef, useEffect } from "react";

export interface AadhaarInputProps {
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

const AadhaarInput: React.FC<AadhaarInputProps> = ({
  value = "",
  onChange,
  className = "",
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      const clean = value.replace(/\D/g, "").slice(0, 12);
      inputRef.current.value = clean;

      setTimeout(() => {
        inputRef.current?.setSelectionRange(clean.length, clean.length);
      }, 0);
    }
  }, [value]);

  const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
    const input = e.currentTarget;

    let clean = input.value.replace(/\D/g, "");
    clean = clean.slice(0, 12);

    input.value = clean;

    setTimeout(() => {
      input.setSelectionRange(clean.length, clean.length);
    }, 0);

    onChange?.(clean);
  };

  const handleFocus = () => {
    const input = inputRef.current;
    if (!input) return;

    setTimeout(() => {
      const len = input.value.length;
      input.setSelectionRange(len, len);
    }, 0);
  };

  return (
    <input
      ref={inputRef}
      data-type="aadhaar"   // ⭐ IMPORTANT
      type="text"
      inputMode="numeric"
      pattern="\d*"
      placeholder="Enter 12-digit Aadhaar"
      maxLength={12}
      autoComplete="off"
      className={className}
      onInput={handleInput}
      onFocus={handleFocus}
    />
  );
};

export default AadhaarInput;