import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, Lightformer } from "@react-three/drei";
import * as THREE from "three";

const INDIGO = "#4f46e5";
const DEEP = "#1e1e5a";

function Trophy() {
  const g = useRef<THREE.Group>(null);
  useFrame((_, d) => { if (g.current) g.current.rotation.y += Math.min(d, 0.05) * 0.5; });
  return (
    <Float speed={1.4} rotationIntensity={0.25} floatIntensity={0.8}>
      <group ref={g} position={[0, 0.2, 0]}>
        <mesh position={[0, 1.2, 0]}>
          <cylinderGeometry args={[1.05, 0.45, 1.6, 48, 1, true]} />
          <meshStandardMaterial color="#c7c9ff" metalness={1} roughness={0.15} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.12, 0.12, 0.6, 24]} /><meshStandardMaterial color="#c7c9ff" metalness={1} roughness={0.2} /></mesh>
        <mesh position={[0, -0.2, 0]}><cylinderGeometry args={[0.6, 0.75, 0.3, 48]} /><meshStandardMaterial color={INDIGO} metalness={0.6} roughness={0.3} /></mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 1.05, 1.35, 0]} rotation={[0, 0, s * Math.PI / 2]}>
            <torusGeometry args={[0.35, 0.06, 16, 32, Math.PI]} />
            <meshStandardMaterial color="#c7c9ff" metalness={1} roughness={0.15} />
          </mesh>
        ))}
      </group>
    </Float>
  );
}

function Rings() {
  const g = useRef<THREE.Group>(null);
  useFrame((_, d) => { if (g.current) g.current.rotation.z -= Math.min(d, 0.05) * 0.15; });
  return (
    <group ref={g} rotation={[-Math.PI / 2.4, 0, 0]} position={[0, -0.6, 0]}>
      {[2.2, 3, 3.8].map((r, i) => (
        <mesh key={r}>
          <torusGeometry args={[r, 0.015 + i * 0.008, 8, 128]} />
          <meshStandardMaterial color={i === 1 ? INDIGO : "#8b8fff"} emissive={INDIGO} emissiveIntensity={0.6} />
        </mesh>
      ))}
      {Array.from({ length: 24 }).map((_, i) => {
        const a = (i / 24) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 3, Math.sin(a) * 3, 0.1]}>
            <boxGeometry args={[0.12, 0.12, 0.3 + (i % 4) * 0.15]} />
            <meshStandardMaterial color={i % 3 ? DEEP : INDIGO} metalness={0.4} roughness={0.4} />
          </mesh>
        );
      })}
    </group>
  );
}

export default function ArenaScene() {
  return (
    <Canvas dpr={[1, 1.75]} camera={{ position: [0, 1.6, 7], fov: 42 }}>
      <fog attach="fog" args={["#0a0a1a", 7, 16]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 6, 4]} intensity={1.6} />
      <pointLight position={[-3, 1, 2]} color={INDIGO} intensity={30} />
      <Trophy />
      <Rings />
      <Environment resolution={128}>
        <Lightformer intensity={2.5} position={[0, 5, 2]} scale={[10, 3, 1]} />
        <Lightformer intensity={2} color="#6366f1" position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 2, 1]} />
        <Lightformer intensity={1.5} color="#a5b4fc" position={[5, 1, 1]} rotation-y={-Math.PI / 2} scale={[20, 2, 1]} />
      </Environment>
    </Canvas>
  );
}
