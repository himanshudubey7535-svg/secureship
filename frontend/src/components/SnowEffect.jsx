import { useEffect, useRef } from 'react';

export default function SnowEffect() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Generate snowflakes
    const flakeCount = Math.floor(Math.min(width, 1920) / 18); // ~60-100 flakes depending on screen size
    const flakes = [];

    for (let i = 0; i < flakeCount; i++) {
      flakes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2.5 + 0.8, // size 0.8px to 3.3px
        density: Math.random() * 1 + 0.5,
        speed: Math.random() * 1.2 + 0.5,
        swaySpeed: Math.random() * 0.02 + 0.01,
        swayAngle: Math.random() * Math.PI * 2,
        opacity: Math.random() * 0.6 + 0.25,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < flakes.length; i++) {
        const f = flakes[i];

        // Update position
        f.swayAngle += f.swaySpeed;
        f.x += Math.sin(f.swayAngle) * 0.8;
        f.y += f.speed;

        // Wrap around when falling off bottom or sides
        if (f.y > height + 5) {
          f.y = -5;
          f.x = Math.random() * width;
        }
        if (f.x > width + 5) {
          f.x = -5;
        } else if (f.x < -5) {
          f.x = width + 5;
        }

        // Draw soft glowing snowflake
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2, false);
        ctx.fillStyle = `rgba(224, 242, 254, ${f.opacity})`;
        ctx.shadowBlur = f.radius > 2 ? 4 : 0;
        ctx.shadowColor = 'rgba(0, 217, 255, 0.4)';
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
      aria-hidden="true"
    />
  );
}
