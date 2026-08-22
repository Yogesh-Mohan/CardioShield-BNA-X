/**
 * DnaScene.jsx — Three.js Digital DNA scene (Step 6).
 *
 * Futuristic asymmetric DATA-NETWORK structure (NOT a biological helix):
 *   - central aggregate node + 7 feature nodes + similarity edges
 *   - geometry driven ONLY by the processed feature vector (dnaMapping.js)
 *   - smooth lerp toward targets ⇒ scenario changes morph the structure
 *   - orbit / zoom / pan, hover highlight, click-to-focus, reset view
 *   - subtle particle drift whose energy follows overall activity
 *
 * Digital DNA = data-driven representation of multidimensional physiological
 * signals. Not biological DNA. Demo visualization only.
 */

import React, {
  forwardRef, useEffect, useImperativeHandle, useRef,
} from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FEATURES } from '../../data/sensorSchema';
import { computeNodeTargets, nodePosition } from './dnaMapping';

const NODE_SEGMENTS = 24;

/** Neutral starting targets so the structure exists before the engine runs. */
function neutralTargets() {
  const features = Object.fromEntries(
    FEATURES.map((f) => [
      f.id,
      { normalized: 0.5, contribution: 0, status: 'NOMINAL' },
    ])
  );
  return computeNodeTargets({ features });
}

const DnaScene = forwardRef(function DnaScene({ featureState, onHoverNode, onSelectNode }, ref) {
  const mountRef = useRef(null);
  const apiRef = useRef(null);

  // Latest props mirrored into the rAF loop without re-initializing WebGL.
  const stateRef = useRef(featureState);
  stateRef.current = featureState;
  const hoverCbRef = useRef(onHoverNode);
  hoverCbRef.current = onHoverNode;
  const selectCbRef = useRef(onSelectNode);
  selectCbRef.current = onSelectNode;

  useImperativeHandle(ref, () => ({
    resetView: () => apiRef.current?.resetView(),
  }));

  useEffect(() => {
    const mount = mountRef.current;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030816, 0.055);

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    const HOME_POS = new THREE.Vector3(4.6, 2.4, 5.4);
    const HOME_TARGET = new THREE.Vector3(0, 0, 0);
    camera.position.copy(HOME_POS);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 2.5;
    controls.maxDistance = 14;
    controls.target.copy(HOME_TARGET);

    /* ---------- lights ---------- */
    scene.add(new THREE.AmbientLight(0x334466, 0.9));
    const keyLight = new THREE.PointLight(0x00e5ff, 30, 30);
    keyLight.position.set(4, 5, 3);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0xff66aa, 12, 25);
    rimLight.position.set(-5, -3, -4);
    scene.add(rimLight);

    /* ---------- central node ---------- */
    const centerGeo = new THREE.IcosahedronGeometry(1, 3);
    const centerBase = Float32Array.from(centerGeo.attributes.position.array);
    const centerMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff, emissive: 0x007788, emissiveIntensity: 0.8,
      roughness: 0.25, metalness: 0.55, flatShading: false,
    });
    const centerMesh = new THREE.Mesh(centerGeo, centerMat);
    centerMesh.scale.setScalar(0.34);
    scene.add(centerMesh);
    const centerWire = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.18, 1),
      new THREE.MeshBasicMaterial({ color: 0x00e5ff, wireframe: true, transparent: true, opacity: 0.14 })
    );
    centerWire.scale.copy(centerMesh.scale);
    scene.add(centerWire);

    /* ---------- feature nodes ---------- */
    const nodes = FEATURES.map((f, i) => {
      const geo = new THREE.IcosahedronGeometry(1, 2);
      const base = Float32Array.from(geo.attributes.position.array);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x00ff88, emissive: 0x00aa55, emissiveIntensity: 0.7,
        roughness: 0.35, metalness: 0.4,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.userData.featureIndex = i;
      mesh.scale.setScalar(0.2);
      scene.add(mesh);

      const halo = new THREE.Sprite(
        new THREE.SpriteMaterial({
          color: 0x00ff88, transparent: true, opacity: 0.22,
          blending: THREE.AdditiveBlending, depthWrite: false,
        })
      );
      halo.scale.setScalar(0.7);
      scene.add(halo);

      return { def: f, geo, base, mat, mesh, halo, live: { phi: Math.PI / 2, orbitRadius: 2, radius: 0.2, deform: 0, intensity: 0.5 }, color: new THREE.Color(0x00ff88) };
    });

    /* ---------- edges (center→node + node↔node pairs) ---------- */
    const MAX_EDGES = nodes.length + 21;
    const edgePos = new Float32Array(MAX_EDGES * 2 * 3);
    const edgeCol = new Float32Array(MAX_EDGES * 2 * 3);
    const edgeGeo = new THREE.BufferGeometry();
    edgeGeo.setAttribute('position', new THREE.BufferAttribute(edgePos, 3));
    edgeGeo.setAttribute('color', new THREE.BufferAttribute(edgeCol, 3));
    const edgeLines = new THREE.LineSegments(
      edgeGeo,
      new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    scene.add(edgeLines);
    let activeEdges = []; // {a:vec3,b:vec3,color,alpha}

    /* ---------- particles ---------- */
    const P_COUNT = 260;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(P_COUNT * 3);
    const pSeed = new Float32Array(P_COUNT);
    for (let i = 0; i < P_COUNT; i++) {
      const r = 1.6 + Math.random() * 3.4;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(Math.random() * 2 - 1);
      pPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pPos[i * 3 + 1] = r * Math.cos(ph);
      pPos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
      pSeed[i] = Math.random();
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const particles = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({
        color: 0x66eaff, size: 0.045, transparent: true, opacity: 0.5,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    scene.add(particles);

    /* ---------- interaction state ---------- */
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2(-10, -10);
    let hoveredIdx = -1;
    let focusedIdx = -1; // -1 = overview
    const focusPoint = new THREE.Vector3();

    const onPointerMove = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };
    const onClick = () => {
      if (hoveredIdx >= 0) {
        focusedIdx = hoveredIdx === focusedIdx ? -1 : hoveredIdx;
        selectCbRef.current?.(focusedIdx >= 0 ? nodes[focusedIdx].def.id : null);
      }
    };
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('click', onClick);

    /* ---------- resize ---------- */
    const resize = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    /* ---------- targets & live lerp ---------- */
    let targets = neutralTargets();
    const tmpA = new THREE.Vector3();
    const tmpB = new THREE.Vector3();
    const tmpC = new THREE.Color();

    const deformGeometry = (geo, baseArr, amount, t, seedPhase) => {
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const bx = baseArr[i * 3], by = baseArr[i * 3 + 1], bz = baseArr[i * 3 + 2];
        const n =
          Math.sin(bx * 5.1 + t * 2.2 + seedPhase) *
          Math.cos(by * 4.3 - t * 1.7 + seedPhase) *
          Math.sin(bz * 5.7 + t * 1.3);
        const s = 1 + n * amount;
        pos.setXYZ(i, bx * s, by * s, bz * s);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
    };

    const clock = new THREE.Clock();
    let raf = null;

    const render = () => {
      const dt = Math.min(clock.getDelta(), 0.1);
      const t = clock.elapsedTime;

      // Pull fresh targets from THE pipeline state (deterministic mapping).
      const fs = stateRef.current;
      if (fs && fs.features) {
        const next = computeNodeTargets(fs);
        if (next) targets = next;
      }

      const k = 1 - Math.exp(-dt * 3.2); // smoothing factor

      // --- central node ---
      const c = targets.center;
      centerMesh.scale.lerp(tmpA.setScalar(c.radius), k);
      centerWire.scale.copy(centerMesh.scale).multiplyScalar(1.06);
      centerWire.rotation.y += dt * 0.12;
      centerWire.rotation.x -= dt * 0.07;
      deformGeometry(centerGeo, centerBase, c.deform * 0.16, t, 0);
      tmpC.setRGB(c.color[0], c.color[1], c.color[2]);
      centerMat.color.lerp(tmpC, k);
      centerMat.emissive.copy(centerMat.color).multiplyScalar(0.55);
      centerMat.emissiveIntensity = 0.5 + c.intensity * 0.5;

      // --- feature nodes ---
      nodes.forEach((n, i) => {
        const tg = targets.nodes[i];
        n.live.phi += (tg.phi - n.live.phi) * k;
        n.live.orbitRadius += (tg.orbitRadius - n.live.orbitRadius) * k;
        n.live.radius += (tg.radius - n.live.radius) * k;
        n.live.deform += (tg.deform - n.live.deform) * k;
        n.live.intensity += (tg.intensity - n.live.intensity) * k;

        nodePosition(
          { theta: tg.theta, phi: n.live.phi, orbitRadius: n.live.orbitRadius, bobAmp: tg.bobAmp, bobSpeed: tg.bobSpeed, phase: tg.phase },
          t, tmpA
        );
        n.mesh.position.lerp(tmpA, k);
        n.halo.position.copy(n.mesh.position);
        n.mesh.scale.lerp(tmpB.setScalar(n.live.radius), k);
        n.halo.scale.setScalar(n.live.radius * (3.4 + Math.sin(t * 2 + tg.phase) * 0.5));

        deformGeometry(n.geo, n.base, n.live.deform * 0.22, t, i * 2.3);

        const hot = i === hoveredIdx || i === focusedIdx;
        tmpC.setRGB(tg.color[0], tg.color[1], tg.color[2]);
        n.mat.color.lerp(tmpC, k);
        n.mat.emissive.copy(n.mat.color).multiplyScalar(hot ? 1.1 : 0.5);
        n.mat.emissiveIntensity = n.live.intensity * (hot ? 1.6 : 1);
        n.halo.material.color.copy(n.mat.color);
        n.halo.material.opacity = hot ? 0.42 : 0.16 + n.live.intensity * 0.1;
      });

      // --- edges ---
      activeEdges = [];
      nodes.forEach((n, i) => activeEdges.push({
        a: tmpA.set(0, 0, 0).clone(), b: n.mesh.position.clone(),
        color: n.mat.color.clone(), alpha: 0.16 + targets.activity * 0.2,
      }));
      for (const p of targets.pairs) {
        activeEdges.push({
          a: nodes[p.i].mesh.position.clone(),
          b: nodes[p.j].mesh.position.clone(),
          color: nodes[p.i].mat.color.clone().lerp(nodes[p.j].mat.color, 0.5),
          alpha: p.thickness * 9,
        });
      }
      let vi = 0;
      for (const e of activeEdges.slice(0, MAX_EDGES)) {
        edgePos[vi * 3] = e.a.x; edgePos[vi * 3 + 1] = e.a.y; edgePos[vi * 3 + 2] = e.a.z;
        vi++;
        edgePos[vi * 3] = e.b.x; edgePos[vi * 3 + 1] = e.b.y; edgePos[vi * 3 + 2] = e.b.z;
        vi++;
        edgeCol[(vi - 2) * 3] = e.color.r; edgeCol[(vi - 2) * 3 + 1] = e.color.g; edgeCol[(vi - 2) * 3 + 2] = e.color.b;
        edgeCol[(vi - 1) * 3] = e.color.r; edgeCol[(vi - 1) * 3 + 1] = e.color.g; edgeCol[(vi - 1) * 3 + 2] = e.color.b;
      }
      edgeGeo.setDrawRange(0, vi);
      edgeGeo.attributes.position.needsUpdate = true;
      edgeGeo.attributes.color.needsUpdate = true;

      // --- particles: slow orbital drift, energy follows activity ---
      const spin = dt * (0.02 + targets.activity * 0.12);
      particles.rotation.y += spin;
      particles.rotation.z += spin * 0.4;
      particles.material.opacity = 0.25 + targets.activity * 0.45;

      // --- hover pick ---
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(nodes.map((n) => n.mesh), false);
      const idx = hits.length ? hits[0].object.userData.featureIndex : -1;
      if (idx !== hoveredIdx) {
        hoveredIdx = idx;
        hoverCbRef.current?.(idx >= 0 ? nodes[idx].def.id : null);
        renderer.domElement.style.cursor = idx >= 0 ? 'pointer' : 'grab';
      }

      // --- camera focus ---
      if (focusedIdx >= 0) {
        focusPoint.lerp(nodes[focusedIdx].mesh.position, k);
      } else {
        focusPoint.lerp(HOME_TARGET, k);
      }
      controls.target.copy(focusPoint);
      controls.update();

      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    apiRef.current = {
      resetView: () => {
        focusedIdx = -1;
        selectCbRef.current?.(null);
        camera.position.copy(HOME_POS);
        controls.target.copy(HOME_TARGET);
      },
    };

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('click', onClick);
      controls.dispose();
      scene.traverse((obj) => {
        obj.geometry?.dispose?.();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => m?.dispose?.());
      });
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div className="dna-scene" ref={mountRef} />;
});

export default DnaScene;
