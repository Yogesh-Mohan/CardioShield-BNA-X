import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function LoginBackground3D() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x02050f, 0.015);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 30;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Particles
    const particleCount = 180;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];

    for (let i = 0; i < particleCount; i++) {
      // Random coordinates inside a bounding box
      const x = (Math.random() - 0.5) * 60;
      const y = (Math.random() - 0.5) * 60;
      const z = (Math.random() - 0.5) * 60;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      velocities.push({
        x: (Math.random() - 0.5) * 0.05,
        y: (Math.random() - 0.5) * 0.05,
        z: (Math.random() - 0.5) * 0.05,
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x00e5ff,
      size: 0.25,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particleSystem = new THREE.Points(geometry, material);
    scene.add(particleSystem);

    // Faint connection lines
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x0077ff,
      transparent: true,
      opacity: 0.1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // Create lines between close particles
    const getLinesGeometry = () => {
      const linePositions = [];
      const pos = geometry.attributes.position.array;

      for (let i = 0; i < particleCount; i++) {
        for (let j = i + 1; j < particleCount; j++) {
          const dx = pos[i * 3] - pos[j * 3];
          const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
          const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < 10) {
            linePositions.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
            linePositions.push(pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2]);
          }
        }
      }

      const lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
      return lineGeo;
    };

    let connectionLines = new THREE.LineSegments(getLinesGeometry(), lineMaterial);
    scene.add(connectionLines);

    // Mouse movement response
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const onMouseMove = (event) => {
      mouseX = (event.clientX - window.innerWidth / 2) * 0.05;
      mouseY = (event.clientY - window.innerHeight / 2) * 0.05;
    };

    window.addEventListener('mousemove', onMouseMove);

    // Resize
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', onResize);

    // Animation loop
    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Slow rotation
      particleSystem.rotation.y += 0.001;
      particleSystem.rotation.x += 0.0005;
      connectionLines.rotation.y += 0.001;
      connectionLines.rotation.x += 0.0005;

      // Inertia cursor lag effect
      targetX += (mouseX - targetX) * 0.05;
      targetY += (mouseY - targetY) * 0.05;

      camera.position.x = targetX;
      camera.position.y = -targetY;
      camera.lookAt(scene.position);

      // Update particle positions
      const pos = geometry.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        pos[i * 3] += velocities[i].x;
        pos[i * 3 + 1] += velocities[i].y;
        pos[i * 3 + 2] += velocities[i].z;

        // Bounce back inside sphere/box boundaries
        if (Math.abs(pos[i * 3]) > 30) velocities[i].x *= -1;
        if (Math.abs(pos[i * 3 + 1]) > 30) velocities[i].y *= -1;
        if (Math.abs(pos[i * 3 + 2]) > 30) velocities[i].z *= -1;
      }
      geometry.attributes.position.needsUpdate = true;

      // Recalculate line segments
      scene.remove(connectionLines);
      connectionLines.geometry.dispose();
      connectionLines = new THREE.LineSegments(getLinesGeometry(), lineMaterial);
      connectionLines.rotation.copy(particleSystem.rotation);
      scene.add(connectionLines);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      container.removeChild(renderer.domElement);
      geometry.dispose();
      material.dispose();
      lineMaterial.dispose();
      connectionLines.geometry.dispose();
      renderer.dispose();
    };
  }, []);

  return <div className="login-bg-3d" ref={containerRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }} />;
}
