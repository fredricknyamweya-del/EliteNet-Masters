"use client";

import { useState } from "react";

// Text input with a glowing border on focus.
// borderColor: "cyan" | "purple"
export default function NeonInput({
  placeholder,
  type = "text",
  value = "",
  onChange,
  borderColor = "cyan",
}) {
  const [focused, setFocused] = useState(false);

  const focusGlow =
    borderColor === "cyan"
      ? "border-[#06B6D4] shadow-[0_0_12px_rgba(6,182,212,0.45)]"
      : "border-[#7C3AED] shadow-[0_0_12px_rgba(124,58,237,0.45)]";

  const idleGlow =
    borderColor === "cyan"
      ? "border-[#06B6D4]/35"
      : "border-[#7C3AED]/35";

  const handleChange = (event) => {
    if (typeof onChange === "function") {
      onChange(event.target.value);
    }
  };

 