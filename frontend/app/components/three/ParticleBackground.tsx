'use client';

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ArenaSceneProps {
  camTarget: [number, number, number];
  themeColors: { primary: string; secondary: string };
  shockwaveRef: React.MutableRefObject<number>;
}

function CyberArenaCore({ themeColors, shockwaveRef }: { themeColors: { primary: string; secondary: string }; shockwaveRef: React.MutableRefObject<number> }) {
  const coreRef = useRef<THREE.Mesh>(null);
  const wireRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock, pointer }) => {
    const t = clock.getElapsedTime();
    const boost = 1 + shockwaveRef.current * 4;
    if (shockwaveRef.current > 0.01) {
      shockwaveRef.current *= 0.94;
    } else {
      shockwaveRef.current = 0;
    }

    if (coreRef.current) {
      coreRef.current.rotation.y += 0.006 * boost + pointer.x * 0.01;
      coreRef.current.rotation.x += 0.004 * boost + pointer.y * 0.01;
      const s = 1 + shockwaveRef.current * 0.45;
      coreRef.current.scale.set(s, s, s);
    }
    if (wireRef.current) {
      wireRef.current.rotation.y -= 0.004 * boost;
      wireRef.current.rotation.z = t * 0.18;
    }
  });

  return (
    <group position={[0, 0, -2]}>
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[1.45, 1]} />
        <meshStandardMaterial
          color={themeColors.primary}
          emissive="#3b0764"
          emissiveIntensity={0.85}
          wireframe
          transparent
          opacity={0.36}
        />
      </mesh>
      <mesh ref={wireRef}>
        <octahedronGeometry args={[2.25, 0]} />
        <meshBasicMaterial color={themeColors.secondary} wireframe transparent opacity={0.2} />
      </mesh>
    </group>
  );
}

function Particles({ count = 520 }: { count?: number }) {
  const meshRef = useRef<THREE.Points>(null);

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const c1 = new THREE.Color('#a855f7');
    const c2 = new THREE.Color('#00f0ff');
    const c3 = new THREE.Color('#fbbf24');

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 24;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 15;

      const pick = i % 3 === 0 ? c1 : i % 3 === 1 ? c2 : c3;
      col[i * 3] = pick.r;
      col[i * 3 + 1] = pick.g;
      col[i * 3 + 2] = pick.b;
    }
    return [pos, col];
  }, [count]);

  useFrame(({ clock, pointer }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    meshRef.current.rotation.y = t * 0.04 + pointer.x * 0.18;
    meshRef.current.rotation.x = Math.sin(t * 0.15) * 0.08 - pointer.y * 0.12;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.055} vertexColors transparent opacity={0.78} sizeAttenuation />
    </points>
  );
}

function GlowRing({ radius, speed, color, tilt }: { radius: number; speed: number; color: string; tilt: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock, pointer }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.rotation.x = tilt + Math.sin(t * speed) * 0.35 + pointer.y * 0.15;
    ref.current.rotation.y = t * speed + pointer.x * 0.2;
  });
  return (
    <mesh ref={ref}>
      <torusGeometry args={[radius, 0.015, 16, 120]} />
      <meshBasicMaterial color={color} transparent opacity={0.28} />
    </mesh>
  );
}

function CameraRig({ camTarget }: { camTarget: [number, number, number] }) {
  useFrame(({ camera, pointer }) => {
    camera.position.x += (camTarget[0] + pointer.x * 0.85 - camera.position.x) * 0.05;
    camera.position.y += (camTarget[1] + pointer.y * 0.55 - camera.position.y) * 0.05;
    camera.position.z += (camTarget[2] - camera.position.z) * 0.05;
    camera.lookAt(0, 0, -2);
  });
  return null;
}

export default function ParticleBackground() {
  const [camTarget, setCamTarget] = useState<[number, number, number]>([0, 0, 8.5]);
  const [themeColors, setThemeColors] = useState({ primary: '#a855f7', secondary: '#00f0ff' });
  const shockwaveRef = useRef<number>(0);

  useEffect(() => {
    const onCamPreset = (e: Event) => {
      const preset = (e as CustomEvent).detail;
      if (preset === 'front') setCamTarget([0, 0, 8.5]);
      else if (preset === 'stadium') setCamTarget([0, 5.2, 6.2]);
      else if (preset === 'core') setCamTarget([0, 0, 4.2]);
    };

    const onThemeChange = (e: Event) => {
      const theme = (e as CustomEvent).detail;
      if (theme === 'cyber') setThemeColors({ primary: '#a855f7', secondary: '#00f0ff' });
      else if (theme === 'supernova') setThemeColors({ primary: '#fbbf24', secondary: '#f43f5e' });
      else if (theme === 'matrix') setThemeColors({ primary: '#10b981', secondary: '#38bdf8' });
      shockwaveRef.current = 1.0;
    };

    const onShockwave = () => {
      shockwaveRef.current = 1.0;
    };

    window.addEventListener('creator11:camera-preset', onCamPreset);
    window.addEventListener('creator11:theme-change', onThemeChange);
    window.addEventListener('creator11:shockwave', onShockwave);
    return () => {
      window.removeEventListener('creator11:camera-preset', onCamPreset);
      window.removeEventListener('creator11:theme-change', onThemeChange);
      window.removeEventListener('creator11:shockwave', onShockwave);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      <Canvas camera={{ position: [0, 0, 8.5], fov: 58 }} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.48} />
        <pointLight position={[6, 5, 5]} intensity={2.0} color={themeColors.primary} />
        <pointLight position={[-6, -4, 5]} intensity={1.8} color={themeColors.secondary} />
        <CameraRig camTarget={camTarget} />
        <CyberArenaCore themeColors={themeColors} shockwaveRef={shockwaveRef} />
        <Particles count={520} />
        <GlowRing radius={3.1} speed={0.12} color={themeColors.primary} tilt={0.7} />
        <GlowRing radius={4.3} speed={-0.09} color={themeColors.secondary} tilt={1.1} />
        <GlowRing radius={5.6} speed={0.06} color="#fbbf24" tilt={0.4} />
        <GlowRing radius={7.0} speed={-0.04} color={themeColors.primary} tilt={1.4} />
      </Canvas>
    </div>
  );
}
