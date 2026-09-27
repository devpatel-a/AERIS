/* Parametric three.js model of the engine (horizontally opposed, 4 cylinders,
 * front reduction gearbox, rear turbocharger) for the Digital Twin viewport.
 * Heads are coloured from live CHT on the Stitch heat-map scale; diagnostic
 * layers (heat map, airflow, x-ray, vibration, exploded) and camera presets are
 * driven by props. DOM callouts are positioned each frame by projecting anchor
 * points (see `anchorEls`).
 */
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export type ViewPreset = "iso" | "top" | "front" | "side";
export type Tool = "rotate" | "pan" | "zoom";
export type AnchorKey = "cyl1" | "cyl2" | "cyl3" | "cyl4" | "turbo" | "sump" | "radiator" | "alternator" | "vib";

export interface EngineSceneProps {
  chtC: (number | null)[]; // measured CHT per cylinder (°C), index 0 = cyl 1
  rpm: number;
  airspeedMps: number;
  vibIps: number;
  heatmap: boolean;
  airflow: boolean;
  xray: boolean;
  vibration: boolean;
  exploded: number; // 0..1
  view: ViewPreset;
  tool: Tool;
  zoomTick: number; // increments on each zoom-tool click
  gearRatio: number;
  anchorEls: React.MutableRefObject<Partial<Record<AnchorKey, HTMLElement | null>>>;
  onSelectCylinder?: (cyl: number) => void;
}

// Stitch CHT heat-map legend: sky-400 (80°C) -> emerald-500 (110) -> amber-400 (125) -> rose-600 (145)
const HEAT_STOPS: [number, THREE.Color][] = [
  [80, new THREE.Color("#38BDF8")],
  [110, new THREE.Color("#10B981")],
  [125, new THREE.Color("#FBBF24")],
  [145, new THREE.Color("#E11D48")],
];
export function heatColor(c: number | null): THREE.Color {
  if (c == null) return new THREE.Color("#CBD5E1");
  if (c <= HEAT_STOPS[0][0]) return HEAT_STOPS[0][1].clone();
  for (let i = 1; i < HEAT_STOPS.length; i++) {
    const [t1, c1] = HEAT_STOPS[i];
    const [t0, c0] = HEAT_STOPS[i - 1];
    if (c <= t1) return c0.clone().lerp(c1, (c - t0) / (t1 - t0));
  }
  return HEAT_STOPS[HEAT_STOPS.length - 1][1].clone();
}

// Cylinder layout: [x along crank (front = -x), bank side (+1 left / -1 right)]; Stitch: 1 L-front, 3 L-rear, 2 R-front, 4 R-rear.
const CYL_LAYOUT: [number, number][] = [
  [-0.7, 1],
  [-0.7, -1],
  [0.7, 1],
  [0.7, -1],
];
const CAMERA_PRESETS: Record<ViewPreset, THREE.Vector3> = {
  iso: new THREE.Vector3(-9.6, 8.6, 12.2),
  top: new THREE.Vector3(0.01, 17, 0.01),
  front: new THREE.Vector3(-17, 1.4, 0.01),
  side: new THREE.Vector3(0.01, 1.4, 17),
};

interface Parts {
  root: THREE.Group;
  heads: THREE.Mesh[];
  barrels: THREE.Group[];
  pistons: THREE.Mesh[];
  crank: THREE.Group;
  prop: THREE.Group;
  gearbox: THREE.Group;
  turbo: THREE.Group;
  casings: THREE.MeshStandardMaterial[];
  headMats: THREE.MeshStandardMaterial[];
  particles: THREE.Points;
  anchors: Record<AnchorKey, THREE.Object3D>;
}

function metal(color: string, rough = 0.45, metalness = 0.55) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness });
}

function buildEngine(): Parts {
  const root = new THREE.Group();
  const casings: THREE.MeshStandardMaterial[] = [];
  const cm = (m: THREE.MeshStandardMaterial) => (casings.push(m), m);
  const anchors = {} as Record<AnchorKey, THREE.Object3D>;
  const anchor = (key: AnchorKey, parent: THREE.Object3D, pos: [number, number, number]) => {
    const o = new THREE.Object3D();
    o.position.set(...pos);
    parent.add(o);
    anchors[key] = o;
  };

  // Crankcase with ribs.
  const caseMat = cm(metal("#E2E8F0", 0.5, 0.35));
  const crankcase = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.5, 1.6), caseMat);
  root.add(crankcase);
  const ribMat = cm(metal("#94A3B8"));
  for (const x of [-0.95, 0, 0.95]) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.52, 1.62), ribMat);
    rib.position.x = x;
    root.add(rib);
  }

  // Cylinders: finned barrel + head (coloured by CHT) + inner piston (x-ray).
  const heads: THREE.Mesh[] = [];
  const headMats: THREE.MeshStandardMaterial[] = [];
  const barrels: THREE.Group[] = [];
  const pistons: THREE.Mesh[] = [];
  const barrelMat = cm(metal("#CBD5E1", 0.5, 0.4));
  const finMat = cm(metal("#64748B", 0.5, 0.6));
  CYL_LAYOUT.forEach(([x, side], i) => {
    const g = new THREE.Group();
    g.position.set(x, 0.1, side * 0.8);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.1, 32), barrelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = side * 0.55;
    g.add(barrel);
    for (let f = 0; f < 6; f++) {
      const fin = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.04, 32), finMat);
      fin.rotation.x = Math.PI / 2;
      fin.position.z = side * (0.2 + f * 0.15);
      g.add(fin);
    }
    const headMat = cm(new THREE.MeshStandardMaterial({ color: "#CBD5E1", roughness: 0.4, metalness: 0.3, emissive: "#000000" }));
    headMats.push(headMat);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.95, 0.5), headMat);
    head.position.z = side * 1.35;
    head.userData.cylinder = i + 1;
    g.add(head);
    heads.push(head);
    const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.35, 24), metal("#475569"));
    piston.rotation.x = Math.PI / 2;
    piston.position.z = side * 0.6;
    piston.visible = false;
    g.add(piston);
    pistons.push(piston);
    anchor(`cyl${i + 1}` as AnchorKey, g, [0, 0.55, side * 1.35]);
    root.add(g);
    barrels.push(g);
  });

  // Crankshaft (x-ray only).
  const crank = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.2, 16), metal("#334155"));
  shaft.rotation.z = Math.PI / 2;
  crank.add(shaft);
  for (const [x, dir] of [[-0.7, 1], [0.7, -1]] as const) {
    const throwArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 0.12), metal("#475569"));
    throwArm.position.set(x, 0.18 * dir, 0);
    crank.add(throwArm);
  }
  crank.visible = false;
  root.add(crank);

  // Reduction gearbox + propeller flange/hub at the front (-x).
  const gearbox = new THREE.Group();
  const gbMat = cm(metal("#94A3B8", 0.4, 0.6));
  const gb = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.78, 1.0, 32), gbMat);
  gb.rotation.z = Math.PI / 2;
  gb.position.x = -2.0;
  gearbox.add(gb);
  const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.2, 32), cm(metal("#475569")));
  flange.rotation.z = Math.PI / 2;
  flange.position.x = -2.6;
  gearbox.add(flange);
  const prop = new THREE.Group();
  prop.position.x = -2.78;
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.26, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#1E5EFF", roughness: 0.35, metalness: 0.4 }));
  hub.rotation.z = Math.PI / 2;
  prop.add(hub);
  for (const s of [1, -1]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.2, 0.16), new THREE.MeshStandardMaterial({ color: "#1E5EFF", roughness: 0.4, transparent: true, opacity: 0.85 }));
    blade.position.y = s * 0.7;
    prop.add(blade);
  }
  gearbox.add(prop);
  const vibSensor = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), new THREE.MeshStandardMaterial({ color: "#0F172A" }));
  vibSensor.position.set(-1.55, 0.62, 0.3);
  gearbox.add(vibSensor);
  anchor("vib", gearbox, [-1.55, 0.72, 0.3]);
  root.add(gearbox);

  // Turbocharger at the rear (+x) with wastegate and exhaust runners.
  const turbo = new THREE.Group();
  turbo.position.set(2.15, 0.2, -0.4);
  const snail = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.16, 16, 40), cm(metal("#64748B", 0.35, 0.7)));
  snail.rotation.y = Math.PI / 2;
  turbo.add(snail);
  const comp = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 0.4, 24), cm(metal("#94A3B8", 0.35, 0.7)));
  comp.rotation.z = Math.PI / 2;
  comp.position.x = 0.3;
  turbo.add(comp);
  const wastegate = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8), new THREE.MeshStandardMaterial({ color: "#DC2626" }));
  wastegate.position.set(0.1, -0.35, 0.25);
  wastegate.rotation.x = 0.6;
  turbo.add(wastegate);
  anchor("turbo", turbo, [0.3, 0.45, 0]);
  root.add(turbo);
  const exhaustMat = cm(metal("#94A3B8", 0.35, 0.7));
  CYL_LAYOUT.forEach(([x, side]) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x, -0.25, side * 2.1),
      new THREE.Vector3(x + 0.5, -0.55, side * 1.6),
      new THREE.Vector3(1.6, -0.4, side * 0.5 - 0.2),
      new THREE.Vector3(2.0, 0.05, -0.35),
    ]);
    root.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.07, 10), exhaustMat));
  });

  // Oil sump below, radiator at front-bottom, alternator at rear-top.
  const sump = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.35, 1.0), cm(metal("#475569", 0.5, 0.5)));
  sump.position.y = -0.95;
  root.add(sump);
  anchor("sump", root, [0, -1.15, 0.5]);
  const radiator = new THREE.Group();
  radiator.position.set(-1.5, -1.25, 1.2);
  radiator.rotation.y = 0.35;
  const core = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 0.12), cm(new THREE.MeshStandardMaterial({ color: "#7DD3FC", roughness: 0.6, metalness: 0.2 })));
  radiator.add(core);
  for (let k = -4; k <= 4; k++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.5, 0.13), metal("#0284C7"));
    fin.position.x = k * 0.12;
    radiator.add(fin);
  }
  anchor("radiator", radiator, [0, -0.3, 0]);
  root.add(radiator);
  const alternator = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.5, 24), cm(metal("#64748B", 0.4, 0.6)));
  alternator.rotation.z = Math.PI / 2;
  alternator.position.set(1.75, 0.95, 0.35);
  root.add(alternator);
  anchor("alternator", alternator, [0, 0.35, 0]);

  // Cooling-air particles (airflow layer).
  const n = 420;
  const pos = new Float32Array(n * 3);
  for (let k = 0; k < n; k++) {
    pos[k * 3] = -3.2 + Math.random() * 6.4;
    pos[k * 3 + 1] = -0.9 + Math.random() * 1.9;
    pos[k * 3 + 2] = -2.4 + Math.random() * 4.8;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: "#0284C7", size: 0.045, transparent: true, opacity: 0.55 }));
  particles.visible = false;
  root.add(particles);

  return { root, heads, barrels, pistons, crank, prop, gearbox, turbo, casings, headMats, particles, anchors };
}

export default function EngineScene(props: EngineSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const api = useRef<{ camera: THREE.PerspectiveCamera; controls: OrbitControls; target: THREE.Vector3 | null } | null>(null);

  useEffect(() => {
    const mount = mountRef.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.copy(CAMERA_PRESETS.iso);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0.2, 0.9, 0); // engine sits in the lower-centre of the viewport, as in Stitch
    api.current = { camera, controls, target: null };

    scene.add(new THREE.HemisphereLight(0xffffff, 0xcbd5e1, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(-4, 8, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xdbeafe, 0.6);
    rim.position.set(6, 2, -6);
    scene.add(rim);

    const grid = new THREE.GridHelper(14, 28, 0x0047d3, 0x0047d3);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.08;
    grid.position.y = -1.55;
    scene.add(grid);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(2.6, 48), new THREE.MeshBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.06 }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.set(1.4, 0.55, 1);
    shadow.position.y = -1.54;
    scene.add(shadow);

    const parts = buildEngine();
    scene.add(parts.root);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const onClick = (e: MouseEvent) => {
      const r = renderer.domElement.getBoundingClientRect();
      pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(parts.heads, false)[0];
      if (hit) propsRef.current.onSelectCylinder?.(hit.object.userData.cylinder);
    };
    renderer.domElement.addEventListener("click", onClick);

    const resize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = `${w}px`;
      renderer.domElement.style.height = `${h}px`;
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();

    const clock = new THREE.Clock();
    const v = new THREE.Vector3();
    let crankAngle = 0;
    let frame = 0;
    const tick = () => {
      frame = requestAnimationFrame(tick);
      const dt = Math.min(clock.getDelta(), 0.05);
      const p = propsRef.current;

      // Heads: CHT heat map (or neutral), hot heads glow.
      parts.headMats.forEach((m, i) => {
        const c = p.chtC[i];
        // Heat map is a translucent tint over grey metal (Stitch: heat overlay at ~35-75% opacity).
        const hot = c != null && c >= 125;
        m.color.copy(p.heatmap ? new THREE.Color("#CBD5E1").lerp(heatColor(c), hot ? 0.8 : 0.45) : new THREE.Color("#CBD5E1"));
        m.emissive.copy(p.heatmap && c != null && c >= 125 ? heatColor(c).multiplyScalar(0.35) : new THREE.Color(0));
      });
      // X-ray cutaway: translucent casings, show pistons + crank.
      parts.casings.forEach((m) => {
        m.transparent = p.xray;
        m.opacity = p.xray ? 0.22 : 1;
        m.depthWrite = !p.xray;
      });
      parts.pistons.forEach((m) => (m.visible = p.xray));
      parts.crank.visible = p.xray;
      // Exploded view.
      parts.barrels.forEach((g, i) => {
        const side = CYL_LAYOUT[i][1];
        g.position.z = side * (0.8 + p.exploded * 1.3);
      });
      parts.gearbox.position.x = -p.exploded * 1.0;
      parts.turbo.position.x = 2.15 + p.exploded * 1.0;
      // Rotation: prop at crank rpm / gear ratio, crank for x-ray (slowed for legibility).
      const visualRate = 1 / 25;
      crankAngle += (p.rpm / 60) * 2 * Math.PI * dt * visualRate;
      parts.prop.rotation.x = crankAngle / Math.max(p.gearRatio, 1);
      parts.crank.rotation.x = crankAngle;
      parts.pistons.forEach((m, i) => {
        const side = CYL_LAYOUT[i][1];
        m.position.z = side * (0.6 + 0.18 * Math.sin(crankAngle + (i % 2) * Math.PI));
      });
      // Airflow particles stream front-to-rear, speed from airspeed.
      parts.particles.visible = p.airflow;
      if (p.airflow) {
        const arr = parts.particles.geometry.attributes.position.array as Float32Array;
        const speed = 0.6 + p.airspeedMps / 20;
        for (let k = 0; k < arr.length; k += 3) {
          arr[k] += speed * dt;
          if (arr[k] > 3.2) arr[k] = -3.2;
        }
        parts.particles.geometry.attributes.position.needsUpdate = true;
      }
      // Vibration dynamics: exaggerated shake proportional to measured ips.
      if (p.vibration) {
        const amp = Math.min(p.vibIps * 0.6, 0.08);
        const t = clock.elapsedTime;
        parts.root.position.set(Math.sin(t * 61) * amp, Math.sin(t * 47) * amp, Math.cos(t * 53) * amp);
      } else {
        parts.root.position.set(0, 0, 0);
      }
      // Camera preset tween.
      const a = api.current!;
      if (a.target) {
        camera.position.lerp(a.target, 0.12);
        if (camera.position.distanceTo(a.target) < 0.02) a.target = null;
      }
      controls.update();
      renderer.render(scene, camera);

      // Project anchors to DOM callouts.
      const w = mount.clientWidth, h = mount.clientHeight;
      (Object.keys(parts.anchors) as AnchorKey[]).forEach((k) => {
        const el = p.anchorEls.current[k];
        if (!el) return;
        parts.anchors[k].getWorldPosition(v);
        v.project(camera);
        const behind = v.z > 1;
        el.style.left = `${((v.x + 1) / 2) * w}px`;
        el.style.top = `${((1 - v.y) / 2) * h}px`;
        el.style.visibility = behind ? "hidden" : "visible";
      });
    };
    tick();

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      renderer.domElement.removeEventListener("click", onClick);
      controls.dispose();
      renderer.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose?.();
      });
      mount.removeChild(renderer.domElement);
    };
  }, []);

  // Camera preset.
  useEffect(() => {
    if (api.current) api.current.target = CAMERA_PRESETS[props.view].clone();
  }, [props.view]);

  // Tool: left-drag rotates or pans.
  useEffect(() => {
    const c = api.current?.controls;
    if (!c) return;
    c.mouseButtons.LEFT = props.tool === "pan" ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
  }, [props.tool]);

  // Zoom tool: dolly in one step per click.
  useEffect(() => {
    const a = api.current;
    if (!a || props.zoomTick === 0) return;
    const dir = a.camera.position.clone().sub(a.controls.target).multiplyScalar(0.82);
    a.target = a.controls.target.clone().add(dir);
  }, [props.zoomTick]);

  return <div ref={mountRef} className="absolute inset-0" />;
}
