import React, { useRef, useEffect } from 'react';
import { Theme } from '../types';

interface AnimatedBackgroundProps {
  background: Theme['background'];
  theme: Theme;
}

export const StarfieldBackground: React.FC<AnimatedBackgroundProps> = ({ background, theme }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // --- Common setup ---
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const handleResize = () => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        // Re-initialize on resize to adjust particle/column counts
        if (background === 'starfield') initStarfield();
        if (background === 'matrix') initMatrix();
        if (background === 'cozy') initCozy();
      }
    };
    window.addEventListener('resize', handleResize);
    
    // --- Cancel previous animation frame ---
    if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
    }

    // --- Animation-specific state ---
    let state: any = {};

    // --- Starfield Logic ---
    const initStarfield = () => {
      const numStars = 800;
      state.stars = [];
      for (let i = 0; i < numStars; i++) {
        state.stars.push({
          x: Math.random() * canvas.width - canvas.width / 2,
          y: Math.random() * canvas.height - canvas.height / 2,
          z: Math.random() * canvas.width,
        });
      }
    };
    const drawStarfield = () => {
      const speed = 0.05;
      ctx.fillStyle = theme.colors.bgDark;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = theme.colors.textBase;
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      for (let i = 0; i < state.stars.length; i++) {
        let star = state.stars[i];
        star.z -= speed;
        if (star.z <= 0) {
          star.x = Math.random() * canvas.width - canvas.width / 2;
          star.y = Math.random() * canvas.height - canvas.height / 2;
          star.z = canvas.width;
        }
        const k = 128.0 / star.z;
        const px = star.x * k;
        const py = star.y * k;
        const size = (1 - star.z / canvas.width) * 2;
        ctx.beginPath();
        ctx.arc(px, py, size, 0, 2 * Math.PI);
        ctx.fill();
      }
      ctx.restore();
    };

    // --- Matrix Logic ---
    const initMatrix = () => {
      const characters = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン0123456789';
      const fontSize = 16;
      const columns = Math.floor(canvas.width / fontSize);
      state.characters = characters;
      state.fontSize = fontSize;
      state.drops = [];
      for (let x = 0; x < columns; x++) {
        state.drops[x] = 1;
      }
    };
    const drawMatrix = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = theme.colors.primary;
      ctx.font = `${state.fontSize}px monospace`;
      for (let i = 0; i < state.drops.length; i++) {
        const text = state.characters.charAt(Math.floor(Math.random() * state.characters.length));
        ctx.fillText(text, i * state.fontSize, state.drops[i] * state.fontSize);
        if (state.drops[i] * state.fontSize > canvas.height && Math.random() > 0.975) {
          state.drops[i] = 0;
        }
        state.drops[i]++;
      }
    };

    // --- Cozy Logic ---
    const initCozy = () => {
      const numParticles = 100;
      state.particles = [];
      for (let i = 0; i < numParticles; i++) {
        state.particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 2 + 1,
          vx: Math.random() * 0.5 - 0.25,
          vy: Math.random() * -1 - 0.5,
          alpha: Math.random() * 0.5 + 0.2,
        });
      }
    };
    const drawCozy = () => {
      ctx.fillStyle = theme.colors.bgDark;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < state.particles.length; i++) {
        const p = state.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -p.radius) { p.y = canvas.height + p.radius; p.x = Math.random() * canvas.width; }
        if (p.x < -p.radius) p.x = canvas.width + p.radius;
        if (p.x > canvas.width + p.radius) p.x = -p.radius;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2, false);
        ctx.fillStyle = `rgba(209, 166, 94, ${p.alpha})`; // Weatherspoons primary
        ctx.fill();
      }
    };

    // --- Main Animation Loop ---
    let drawFunction: () => void;
    
    switch (background) {
      case 'starfield':
        initStarfield();
        drawFunction = drawStarfield;
        break;
      case 'matrix':
        initMatrix();
        drawFunction = drawMatrix;
        break;
      case 'cozy':
        initCozy();
        drawFunction = drawCozy;
        break;
      default:
        drawFunction = () => {
            if(ctx && canvas) {
              ctx.fillStyle = theme.colors.bgLight;
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        };
    }

    const animate = () => {
      drawFunction();
      animationFrameId.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      if(animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [background, theme]);

  return <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full -z-10 animate-fade-in" />;
};
