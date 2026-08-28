import { cn } from '../../lib/utils';
import { useCallback, useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

interface GlobeProps {
  className?: string;
  size?: number;
  dotColor?: string;
  arcColor?: string;
  markerColor?: string;
  autoRotateSpeed?: number;
  connections?: { from: [number, number]; to: [number, number] }[];
  markers?: { lat: number; lng: number; label?: string }[];
}

const DEFAULT_MARKERS = [
  { lat: 58, lng: -145, label: 'DIRECCIÓN' },
  { lat: 38, lng: -78, label: 'IDENTIDAD' },
  { lat: 17, lng: -12, label: 'ESTRATEGIA' },
  { lat: 54, lng: 30, label: 'DISEÑO' },
  { lat: 28, lng: 92, label: 'DESARROLLO' },
  { lat: 4, lng: 145, label: 'SISTEMAS' },
  { lat: -28, lng: 154, label: 'IMPACTO' },
  { lat: -48, lng: 72, label: 'CAPACIDAD' },
  { lat: -34, lng: 8, label: 'EXPERIENCIA' },
  { lat: -12, lng: -64, label: 'CONEXIÓN' },
  { lat: 12, lng: -145, label: 'PROPÓSITO' },
  { lat: 72, lng: -22, label: 'AUTOMATIZACIÓN' },
];

const DEFAULT_CONNECTIONS = [
  { from: [58, -145], to: [38, -78] },
  { from: [38, -78], to: [17, -12] },
  { from: [17, -12], to: [54, 30] },
  { from: [54, 30], to: [28, 92] },
  { from: [28, 92], to: [4, 145] },
  { from: [4, 145], to: [-28, 154] },
  { from: [-28, 154], to: [-48, 72] },
  { from: [-48, 72], to: [-34, 8] },
  { from: [-34, 8], to: [-12, -64] },
  { from: [-12, -64], to: [12, -145] },
  { from: [12, -145], to: [72, -22] },
  { from: [72, -22], to: [58, -145] },
  { from: [58, -145], to: [17, -12] },
  { from: [54, 30], to: [-34, 8] },
  { from: [28, 92], to: [-48, 72] },
] as { from: [number, number]; to: [number, number] }[];

function latLngToXYZ(lat: number, lng: number, radius: number): [number, number, number] {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lng + 180) * Math.PI) / 180;
  return [-(radius * Math.sin(phi) * Math.cos(theta)), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta)];
}

function rotateY(x: number, y: number, z: number, angle: number): [number, number, number] {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [x * cos + z * sin, y, -x * sin + z * cos];
}

function rotateX(x: number, y: number, z: number, angle: number): [number, number, number] {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [x, y * cos - z * sin, y * sin + z * cos];
}

function project(x: number, y: number, z: number, cx: number, cy: number, fov: number): [number, number] {
  const scale = fov / (fov + z);
  return [x * scale + cx, y * scale + cy];
}

export function Component({
  className,
  size = 600,
  dotColor = 'rgba(255, 77, 0, ALPHA)',
  arcColor = 'rgba(255, 77, 0, 0.52)',
  markerColor = 'rgba(255, 77, 0, 1)',
  autoRotateSpeed = 0.002,
  connections = DEFAULT_CONNECTIONS,
  markers = DEFAULT_MARKERS,
}: GlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotation = useRef({ y: 0.4, x: 0.3 });
  const drag = useRef({ active: false, startX: 0, startY: 0, y: 0.4, x: 0.3 });
  const animation = useRef<number>(0);
  const time = useRef(0);
  const dots = useRef<[number, number, number][]>([]);

  useEffect(() => {
    const generated: [number, number, number][] = [];
    // A longitude/latitude lattice gives the sphere a readable surface.
    // Unlike a uniformly random cloud, it visibly travels as the globe rotates.
    const latitudeStep = 8;
    for (let lat = -80; lat <= 80; lat += latitudeStep) {
      const circumference = Math.max(0.28, Math.cos((lat * Math.PI) / 180));
      const columns = Math.max(8, Math.round(46 * circumference));
      const longitudeStep = 360 / columns;
      const rowOffset = ((lat + 80) / latitudeStep) % 2 === 0 ? 0 : longitudeStep / 2;
      for (let index = 0; index < columns; index += 1) {
        const lng = -180 + index * longitudeStep + rowOffset;
        generated.push(latLngToXYZ(lat, lng, 1));
      }
    }
    dots.current = generated;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) {
      animation.current = requestAnimationFrame(draw);
      return;
    }
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * 0.39;
    const fov = 600;
    if (!drag.current.active) rotation.current.y += autoRotateSpeed;
    time.current += 0.015;
    context.clearRect(0, 0, width, height);

    const glow = context.createRadialGradient(cx, cy, radius * 0.45, cx, cy, radius * 1.45);
    glow.addColorStop(0, 'rgba(255, 77, 0, 0.10)');
    glow.addColorStop(1, 'rgba(255, 77, 0, 0)');
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);

    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.strokeStyle = 'rgba(10, 10, 10, 0.16)';
    context.stroke();

    const ry = rotation.current.y;
    const rx = rotation.current.x;
    for (const dot of dots.current) {
      let [x, y, z] = dot;
      x *= radius; y *= radius; z *= radius;
      [x, y, z] = rotateX(x, y, z, rx);
      [x, y, z] = rotateY(x, y, z, ry);
      const [sx, sy] = project(x, y, z, cx, cy, fov);
      const depth = 1 - (z + radius) / (2 * radius);
      context.beginPath();
      context.arc(sx, sy, 0.8 + depth * 0.9, 0, Math.PI * 2);
      context.fillStyle = dotColor.replace('ALPHA', (0.16 + depth * 0.84).toFixed(2));
      context.fill();
    }

    for (const connection of connections) {
      let [x1, y1, z1] = latLngToXYZ(connection.from[0], connection.from[1], radius);
      let [x2, y2, z2] = latLngToXYZ(connection.to[0], connection.to[1], radius);
      [x1, y1, z1] = rotateY(...rotateX(x1, y1, z1, rx), ry);
      [x2, y2, z2] = rotateY(...rotateX(x2, y2, z2, rx), ry);
      const [sx1, sy1] = project(x1, y1, z1, cx, cy, fov);
      const [sx2, sy2] = project(x2, y2, z2, cx, cy, fov);
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const mz = (z1 + z2) / 2;
      const length = Math.sqrt(mx * mx + my * my + mz * mz) || 1;
      const [scx, scy] = project((mx / length) * radius * 1.22, (my / length) * radius * 1.22, (mz / length) * radius * 1.22, cx, cy, fov);
      const connectionDepth = Math.max(0.14, 1 - ((z1 + z2) / 2 + radius) / (2 * radius));
      context.globalAlpha = connectionDepth;
      context.beginPath();
      context.moveTo(sx1, sy1);
      context.quadraticCurveTo(scx, scy, sx2, sy2);
      context.strokeStyle = arcColor;
      context.lineWidth = 1.1;
      context.stroke();
      const t = (Math.sin(time.current * 1.2 + connection.from[0] * 0.1) + 1) / 2;
      const tx = (1 - t) ** 2 * sx1 + 2 * (1 - t) * t * scx + t ** 2 * sx2;
      const ty = (1 - t) ** 2 * sy1 + 2 * (1 - t) * t * scy + t ** 2 * sy2;
      context.beginPath();
      context.arc(tx, ty, 2.2, 0, Math.PI * 2);
      context.fillStyle = markerColor;
      context.fill();
      context.globalAlpha = 1;
    }

    for (const marker of markers) {
      let [x, y, z] = latLngToXYZ(marker.lat, marker.lng, radius);
      [x, y, z] = rotateY(...rotateX(x, y, z, rx), ry);
      const [sx, sy] = project(x, y, z, cx, cy, fov);
      const pulse = Math.sin(time.current * 2 + marker.lat) * 0.5 + 0.5;
      context.globalAlpha = z > 0 ? 0.24 : 1;
      context.beginPath();
      context.arc(sx, sy, 4 + pulse * 4, 0, Math.PI * 2);
      context.strokeStyle = `rgba(255, 77, 0, ${0.18 + pulse * 0.16})`;
      context.stroke();
      context.beginPath();
      context.arc(sx, sy, 2.5, 0, Math.PI * 2);
      context.fillStyle = markerColor;
      context.fill();
      if (marker.label) {
        context.font = '10px system-ui, sans-serif';
        context.fillStyle = 'rgba(10, 10, 10, 0.65)';
        context.fillText(marker.label, sx + 8, sy + 3);
      }
      context.globalAlpha = 1;
    }
    animation.current = requestAnimationFrame(draw);
  }, [arcColor, autoRotateSpeed, connections, dotColor, markerColor, markers]);

  useEffect(() => {
    animation.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animation.current);
  }, [draw]);

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    drag.current = { active: true, startX: event.clientX, startY: event.clientY, y: rotation.current.y, x: rotation.current.x };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drag.current.active) return;
    rotation.current.y = drag.current.y + (event.clientX - drag.current.startX) * 0.005;
    rotation.current.x = Math.max(-1, Math.min(1, drag.current.x + (event.clientY - drag.current.startY) * 0.005));
  };

  return <canvas ref={canvasRef} className={cn('interactive-globe-canvas', className)} style={{ width: size, height: size }} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={() => { drag.current.active = false; }} aria-label="Globo interactivo de soluciones digitales Kairos" />;
}
