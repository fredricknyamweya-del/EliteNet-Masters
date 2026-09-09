"use client";

import { useRef, useEffect } from "react";

export default function CyberpunkBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId;
    let t = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: 55 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      color: Math.random() > 0.5 ? "#2563EB" : "#06B6D4",
      alpha: Math.random() * 0.7 + 0.2,
    }));

    const draw = () => {
      t += 0.008;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      bg.addColorStop(0, "#0D1B2A");
      bg.addColorStop(0.5, "#0D1B2A");
      bg.addColorStop(1, "#162B45");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const gridSize = 48;
      ctx.lineWidth = 0.4;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.strokeStyle = `rgba(37,99,235,${0.06 + 0.03 * Math.sin(t + x * 0.01)})`;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.strokeStyle = `rgba(6,182,212,${0.05 + 0.02 * Math.cos(t + y * 0.01)})`;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      const traces = [
        { x1: 0.1, y1: 0.2, x2: 0.4, y2: 0.2, color: "#2563EB" },
        { x1: 0.4, y1: 0.2, x2: 0.4, y2: 0.5, color: "#2563EB" },
        { x1: 0.6, y1: 0.1, x2: 0.9, y2: 0.1, color: "#06B6D4" },
        { x1: 0.9, y1: 0.1, x2: 0.9, y2: 0.4, color: "#06B6D4" },
        { x1: 0.1, y1: 0.8, x2: 0.5, y2: 0.8, color: "#10B981" },
        { x1: 0.7, y1: 0.7, x2: 0.95, y2: 0.7, color: "#7C3AED" },
      ];
      traces.forEach(({ x1, y1, x2, y2, color }) => {
        ctx.lineWidth = 1;
        ctx.strokeStyle = color + "44";
        ctx.beginPath();
        ctx.moveTo(x1 * canvas.width, y1 * canvas.height);
        ctx.lineTo(x2 * canvas.width, y2 * canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x2 * canvas.width, y2 * canvas.height, 2, 0, Math.PI * 2);
        ctx.fillStyle = color + "99";
        ctx.fill();
      });

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle =
          p.color +
          Math.floor(p.alpha * 255)
            .toString(16)
            .padStart(2, "0");
        ctx.fill();
      });

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

 