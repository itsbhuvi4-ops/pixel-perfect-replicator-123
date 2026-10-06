import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const VIOLET = "#8b5cf6";
const BLUE = "#312e81";
const WHITE = "#e9d5ff";

function Gate() {
  const group = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.045;
  });
  return (
    <group ref={group} position={[0, 0.1, -1.2]}>
      <mesh position={[0, 2.1, 0]}>
        <torusGeometry args={[2.35, 0.12, 20, 96]} />
        <meshStandardMaterial color={VIOLET} emissive={VIOLET} emissiveIntensity={4} metalness={0.8} roughness={0.2} />
      </mesh>
      {[-2.2, 2.2].map((x) => (
        <mesh key={x} position={[x, 0.7, 0]} rotation={[0, 0, x < 0 ? -0.16 : 0.16]}>
          <boxGeometry args={[0.42, 4.2, 0.42]} />
          <meshStandardMaterial color={BLUE} emissive={VIOLET} emissiveIntensity={1.4} metalness={0.75} roughness={0.28} />
        </mesh>
      ))}
      <mesh position={[0, -0.15, 0]}>
        <cylinderGeometry args={[3.6, 3.9, 0.18, 64]} />
        <meshStandardMaterial color="#090613" emissive={VIOLET} emissiveIntensity={0.35} metalness={0.9} roughness={0.2} />
      </mesh>
    </group>
  );
}

function Orbit() {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.z -= delta * 0.08;
  });
  return (
    <group ref={ref} rotation={[-0.9, 0.1, 0.2]}>
      {[3.3, 4.2, 5.1].map((radius, index) => (
        <mesh key={radius}>
          <torusGeometry args={[radius, index === 1 ? 0.035 : 0.018, 12, 160]} />
          <meshBasicMaterial color={index === 1 ? VIOLET : BLUE} transparent opacity={index === 1 ? 0.9 : 0.45} />
        </mesh>
      ))}
    </group>
  );
}

function FloatingShard({ position, scale, speed }: { position: [number, number, number]; scale: number; speed: number }) {
  const mesh = useRef<THREE.Mesh>(null);
  const initialPosition = useMemo(() => new THREE.Vector3(...position), [position]);
  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const time = clock.getElapsedTime() * speed;
    mesh.current.rotation.x += 0.0015 * speed;
    mesh.current.rotation.y += 0.002 * speed;
    mesh.current.position.y = initialPosition.y + Math.sin(time) * 0.22;
  });
  return (
    <mesh ref={mesh} position={position} scale={scale} rotation={[0.4, 0.2, 0.7]}>
      <icosahedronGeometry args={[0.55, 1]} />
      <meshStandardMaterial color="#17102b" emissive={VIOLET} emissiveIntensity={0.55} metalness={0.85} roughness={0.28} />
    </mesh>
  );
}

function StarField() {
  const positions = useMemo(() => {
    const points = new Float32Array(850 * 3);
    for (let i = 0; i < 850; i += 1) {
      const radius = 18 + Math.random() * 52;
      const theta = Math.random() * Math.PI * 2;
      const vertical = (Math.random() - 0.5) * 46;
      points[i * 3] = Math.cos(theta) * radius;
      points[i * 3 + 1] = vertical;
      points[i * 3 + 2] = Math.sin(theta) * radius - 8;
    }
    return points;
  }, []);
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#c4b5fd" size={0.075} transparent opacity={0.7} sizeAttenuation />
    </points>
  );
}

function AmbientParticles() {
  const points = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const values = new Float32Array(45 * 3);
    for (let i = 0; i < 45; i += 1) {
      values[i * 3] = (Math.random() - 0.5) * 12;
      values[i * 3 + 1] = (Math.random() - 0.5) * 6;
      values[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    return values;
  }, []);
  useFrame((_, delta) => {
    if (points.current) points.current.rotation.y += delta * 0.012;
  });
  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#c4b5fd" size={0.045} transparent opacity={0.45} sizeAttenuation />
    </points>
  );
}

function ScrollCamera() {
  const camera = useRef<THREE.PerspectiveCamera>(null);
  useFrame(() => {
    if (!camera.current || typeof window === "undefined") return;
    const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    const progress = Math.min(window.scrollY / maxScroll, 1);
    const targetX = Math.sin(progress * Math.PI * 1.4) * 1.8;
    const targetY = 1.4 + progress * 1.7;
    const targetZ = 10.5 - progress * 3.2;
    camera.current.position.x = THREE.MathUtils.lerp(camera.current.position.x, targetX, 0.035);
    camera.current.position.y = THREE.MathUtils.lerp(camera.current.position.y, targetY, 0.035);
    camera.current.position.z = THREE.MathUtils.lerp(camera.current.position.z, targetZ, 0.035);
    camera.current.lookAt(progress * 0.8, progress * 0.6, -1.2);
  });
  return null;
}

export default function ArenaScene() {
  return (
    <Canvas
      dpr={[1, 1.25]}
      camera={{ position: [0, 1.4, 10.5], fov: 43 }}
      gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
      performance={{ min: 0.5, max: 1, debounce: 180 }}
    >
      <ScrollCamera />
      <color attach="background" args={["#030208"]} />
      <fog attach="fog" args={["#030208", 7, 19]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[4, 7, 5]} intensity={1.5} />
      <pointLight position={[0, 2, 2]} color={VIOLET} intensity={42} distance={13} />
      <pointLight position={[-6, 1, -2]} color="#4338ca" intensity={28} distance={12} />
      <Gate />
      <Orbit />
      <FloatingShard position={[-4.2, 2.5, -1]} scale={1.1} speed={0.7} />
      <FloatingShard position={[4.1, 2.9, -2]} scale={0.75} speed={0.9} />
      <FloatingShard position={[3.4, -0.4, 1]} scale={0.5} speed={1.1} />
      <FloatingShard position={[-3.3, -0.8, 0]} scale={0.65} speed={0.8} />
      <StarField />
      <AmbientParticles />
    </Canvas>
  );
}
