import React, { useEffect, useRef } from 'react';
import { getSensorEngine } from '../../data/engineSingleton';

export default function EcgCanvas({ paused }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const engine = getSensorEngine();
    const ctx = canvas.getContext('2d');
    let raf = null;

    const render = () => {
      const width = wrap.clientWidth || 600;
      const height = wrap.clientHeight || 260;
      const dpr = window.devicePixelRatio || 1;

      if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Background
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, width, height);

      // Draw Grid (Medical ECG Style)
      const minor = 10;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= width; x += minor) {
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, height);
      }
      for (let y = 0; y <= height; y += minor) {
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(width, y + 0.5);
      }
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.08)';
      ctx.stroke();

      ctx.beginPath();
      for (let x = 0; x <= width; x += minor * 5) {
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, height);
      }
      for (let y = 0; y <= height; y += minor * 5) {
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(width, y + 0.5);
      }
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.22)';
      ctx.stroke();

      // Retrieve buffer from Engine
      let rawBuf = (engine && typeof engine.getEcgBuffer === 'function') ? engine.getEcgBuffer() : null;
      let buf = [];

      if (rawBuf && rawBuf.length >= 20) {
        buf = rawBuf;
      } else {
        // High-realism mathematical P-Q-R-S-T synthetic scrolling wave
        const now = performance.now() / 1000;
        const hr = (engine && engine._live && engine._live.hrBase) ? engine._live.hrBase : 75;
        const bps = hr / 60; // beats per sec
        const points = 300;
        
        for (let i = 0; i < points; i++) {
          const t = now - (points - i) * 0.006;
          const cycle = (t * bps) % 1; // 0 to 1
          
          let v = 0;
          // P wave
          if (cycle > 0.1 && cycle < 0.22) {
            v += 0.15 * Math.sin(((cycle - 0.1) / 0.12) * Math.PI);
          }
          // Q dip
          else if (cycle >= 0.22 && cycle < 0.25) {
            v -= 0.12 * Math.sin(((cycle - 0.22) / 0.03) * Math.PI);
          }
          // R sharp spike
          else if (cycle >= 0.25 && cycle < 0.31) {
            v += 1.15 * Math.sin(((cycle - 0.25) / 0.06) * Math.PI);
          }
          // S dip
          else if (cycle >= 0.31 && cycle < 0.36) {
            v -= 0.25 * Math.sin(((cycle - 0.31) / 0.05) * Math.PI);
          }
          // T wave
          else if (cycle >= 0.45 && cycle < 0.65) {
            v += 0.30 * Math.sin(((cycle - 0.45) / 0.20) * Math.PI);
          }
          
          // Slight baseline breathing modulation
          v += 0.03 * Math.sin(t * 1.5);
          buf.push(v);
        }
      }

      const n = buf.length;
      const midY = height / 2;
      const scale = height * 0.38;

      // Draw Waveform
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * width;
        const sample = buf[i] != null ? Number(buf[i]) : 0;
        const y = midY - (isNaN(sample) ? 0 : sample) * scale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 10;
      ctx.strokeStyle = '#00e5ff';
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Leading Pulse Dot
      if (n > 0) {
        const lastSample = buf[n - 1] != null ? Number(buf[n - 1]) : 0;
        const lastY = midY - (isNaN(lastSample) ? 0 : lastSample) * scale;
        ctx.beginPath();
        ctx.arc(width - 4, lastY, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.restore();
      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);

    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="ecg-canvas-wrap" ref={wrapRef} style={{ width: '100%', height: '260px', position: 'relative' }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      {paused && <div className="ecg-paused-overlay">PAUSED</div>}
    </div>
  );
}
