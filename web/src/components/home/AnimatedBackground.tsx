"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/** WebGL availability check — graceful fallback to CSS gradients. */
function supportsWebGL(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl2") || canvas.getContext("webgl") || canvas.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// --- Crystal core: low-poly icosahedron with glass-like wireframe ---
function CrystalCore({ dark }: { dark: boolean }) {
  const mesh = useRef<THREE.Mesh>(null);
  const inner = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (mesh.current) {
      mesh.current.rotation.y += delta * 0.12;
      mesh.current.rotation.x = Math.sin(t * 0.2) * 0.15;
    }
    if (inner.current) {
      inner.current.rotation.y -= delta * 0.08;
      inner.current.rotation.z += delta * 0.05;
    }
  });

  return (
    <group position={[0, 0.2, 0]}>
      <mesh ref={mesh} scale={1.6}>
        <icosahedronGeometry args={[1, 0]} />
        <meshPhysicalMaterial
          color={dark ? "#4f6bff" : "#3d4df2"}
          wireframe
          transparent
          opacity={dark ? 0.55 : 0.3}
          roughness={0.2}
          metalness={0.6}
        />
      </mesh>
      <mesh ref={inner} scale={0.85} rotation={[0.4, 0.6, 0]}>
        <octahedronGeometry args={[1, 0]} />
        <meshPhysicalMaterial
          color={dark ? "#8b5cf6" : "#7c3aed"}
          transparent
          opacity={dark ? 0.25 : 0.12}
          roughness={0.1}
          metalness={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh scale={2.1} rotation={[0.9, 0, 0.4]}>
        <torusGeometry args={[1.45, 0.008, 8, 64]} />
        <meshBasicMaterial color={dark ? "#38bdf8" : "#4f6bff"} transparent opacity={dark ? 0.5 : 0.3} />
      </mesh>
    </group>
  );
}

// --- Orbiting satellites ---
function Satellites({ dark }: { dark: boolean }) {
  const group = useRef<THREE.Group>(null);

  const satellites = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        angle: (i / 6) * Math.PI * 2,
        radius: 2.6 + (i % 3) * 0.5,
        speed: 0.15 + (i % 3) * 0.05,
        size: 0.05 + (i % 2) * 0.03,
      })),
    []
  );

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    satellites.forEach((s, i) => {
      const child = group.current?.children[i];
      if (child) {
        const a = s.angle + t * s.speed;
        child.position.set(Math.cos(a) * s.radius, Math.sin(a * 1.7) * 0.4, Math.sin(a) * s.radius);
      }
    });
  });

  return (
    <group ref={group}>
      {satellites.map((s, i) => (
        <mesh key={i}>
          <sphereGeometry args={[s.size, 8, 8]} />
          <meshBasicMaterial color={dark ? "#a78bfa" : "#6b8dff"} transparent opacity={0.8} />
        </mesh>
      ))}
    </group>
  );
}

// --- Particle field (GPU-friendly points) ---
function Particles({ count = 500 }: { count?: number }) {
  const points = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 24;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 14;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 12 - 2;
    }
    return arr;
  }, [count]);

  useFrame((state) => {
    if (!points.current) return;
    points.current.rotation.y = state.clock.elapsedTime * 0.015;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.035} color="#6b8dff" transparent opacity={0.7} sizeAttenuation depthWrite={false} />
    </points>
  );
}

function Scene({ dark }: { dark: boolean }) {
  return (
    <>
      <ambientLight intensity={dark ? 0.35 : 0.5} />
      <pointLight position={[6, 4, 6]} intensity={30} color="#4f6bff" />
      <pointLight position={[-6, -2, 4]} intensity={22} color="#8b5cf6" />
      <CrystalCore dark={dark} />
      <Satellites dark={dark} />
      <Particles />
    </>
  );
}

export default function AnimatedBackground() {
  const [dark, setDark] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [ready, setReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    const observer = new MutationObserver(() => {
      setDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setEnabled(supportsWebGL() && !prefersReducedMotion());
    const t = window.setTimeout(() => setReady(true), 50);
    return () => window.clearTimeout(t);
  }, []);

  // Static fallback renders instantly; WebGL fades in on top.
  if (!enabled) {
    return (
      <div className="absolute inset-0 -z-10" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(900px_600px_at_70%_20%,rgba(79,107,255,0.25),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(800px_500px_at_15%_40%,rgba(139,92,246,0.18),transparent_55%)]" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`absolute inset-0 -z-10 transition-opacity duration-1000 ${ready ? "opacity-100" : "opacity-0"}`} aria-hidden>
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0.2, 7], fov: 55 }}
        gl={{ antialias: false, powerPreference: "high-performance", alpha: true }}
        style={{ position: "absolute", inset: 0 }}
      >
        <fog attach="fog" args={[dark ? "#05070f" : "#f7f9ff", 9, 16]} />
        <Scene dark={dark} />
      </Canvas>
    </div>
  );
}