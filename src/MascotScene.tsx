import { memo, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { COLOURS, OPTIONS, type Combination } from "../shared/game";

const cream = "#fff0cd";
const ink = "#162624";
function material(colour: string, roughness = 0.57) {
  return new THREE.MeshStandardMaterial({
    color: colour,
    roughness,
    metalness: 0,
  });
}
function buildMascot(combo: Combination): THREE.Group {
  const root = new THREE.Group();
  const paint = material(COLOURS[combo.colour]);
  const pale = material(cream);
  const dark = material(ink, 0.32);
  const white = material("#fffef0", 0.25);
  const gold = material("#ffd34d", 0.27);
  gold.metalness = 0.18;
  const accent = material("#f56a42", 0.42);
  function sphere(
    parent: THREE.Group,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy = sx,
    sz = sx,
  ) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), mat);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function capsule(
    parent: THREE.Group,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    radius: number,
    length: number,
    angle = 0,
  ) {
    const mesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(radius, length, 6, 14),
      mat,
    );
    mesh.position.set(x, y, z);
    mesh.rotation.z = angle;
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function tube(
    parent: THREE.Group,
    mat: THREE.Material,
    points: number[][],
    radius: number,
  ) {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...(p as [number, number, number]))),
    );
    const mesh = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 24, radius, 8, false),
      mat,
    );
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }
  const body = new THREE.Group();
  root.add(body);
  sphere(body, paint, 0, 1.05, 0, 0.62, 0.72, 0.45);
  sphere(body, pale, 0, 1.09, 0.365, 0.4, 0.47, 0.13);
  [-1, 1].forEach((s) => {
    capsule(
      body,
      combo.animal === 3 ? dark : paint,
      s * 0.7,
      1.06,
      0,
      0.19,
      0.48,
      s * 0.18,
    );
    sphere(body, paint, s * 0.72, 0.65, 0.06, 0.23, 0.22, 0.24);
    capsule(body, paint, s * 0.31, 0.35, 0, 0.22, 0.3);
    sphere(
      body,
      combo.animal === 3 ? dark : paint,
      s * 0.32,
      0.14,
      0.19,
      0.29,
      0.17,
      0.4,
    );
  });
  const head = new THREE.Group();
  head.name = "head";
  head.position.y = 2.15;
  root.add(head);
  if (combo.animal === 0) {
    sphere(head, paint, 0, 0, 0, 0.84, 0.7, 0.61);
    [-1, 1].forEach((s) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.85, 3), paint);
      ear.position.set(s * 0.54, 0.66, -0.02);
      ear.rotation.z = -s * 0.16;
      ear.rotation.y = Math.PI;
      ear.castShadow = true;
      head.add(ear);
      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.54, 3), pale);
      inner.position.set(s * 0.54, 0.69, 0.14);
      inner.rotation.z = -s * 0.16;
      inner.rotation.y = Math.PI;
      head.add(inner);
      sphere(head, pale, s * 0.29, -0.23, 0.48, 0.41, 0.27, 0.23);
      sphere(head, dark, s * 0.32, 0.09, 0.56, 0.083, 0.12, 0.065);
      sphere(head, white, s * 0.32 - 0.024, 0.13, 0.615, 0.022);
    });
    sphere(head, dark, 0, -0.16, 0.738, 0.12, 0.075, 0.075);
    tube(
      body,
      paint,
      [
        [0.47, 0.65, -0.24],
        [0.94, 0.79, -0.35],
        [1.05, 1.33, -0.38],
        [0.86, 1.55, -0.4],
      ],
      0.25,
    );
    sphere(body, pale, 0.88, 1.49, -0.39, 0.24, 0.3, 0.24);
  } else if (combo.animal === 1) {
    sphere(head, paint, 0, 0, 0, 0.87, 0.57, 0.6);
    sphere(head, pale, 0, -0.23, 0.25, 0.73, 0.24, 0.39);
    [-1, 1].forEach((s) => {
      sphere(head, paint, s * 0.5, 0.43, 0.19, 0.32, 0.36, 0.31);
      sphere(head, pale, s * 0.5, 0.45, 0.43, 0.245);
      sphere(head, dark, s * 0.5, 0.47, 0.6, 0.17, 0.2, 0.1);
      sphere(head, white, s * 0.5 - 0.045, 0.53, 0.678, 0.045);
      sphere(head, paint, s * 0.21, 0.02, 0.58, 0.055);
    });
    tube(
      head,
      dark,
      [
        [-0.53, -0.03, 0.49],
        [-0.3, -0.16, 0.592],
        [0, -0.2, 0.625],
        [0.3, -0.16, 0.592],
        [0.53, -0.03, 0.49],
      ],
      0.024,
    );
  } else if (combo.animal === 2) {
    sphere(head, paint, 0, 0, 0, 0.82, 0.76, 0.56);
    [-1, 1].forEach((s) => {
      const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.23, 0.55, 3), paint);
      tuft.position.set(s * 0.59, 0.64, -0.04);
      tuft.rotation.z = -s * 0.35;
      head.add(tuft);
      sphere(head, pale, s * 0.33, 0.05, 0.44, 0.37, 0.4, 0.14);
      sphere(head, dark, s * 0.33, 0.06, 0.555, 0.19, 0.22, 0.1);
      sphere(head, white, s * 0.33 - 0.05, 0.13, 0.63, 0.048);
      sphere(body, paint, s * 0.53, 1.15, 0.12, 0.22, 0.55, 0.22).rotation.z =
        s * 0.2;
    });
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.3, 4), gold);
    beak.position.set(0, -0.18, 0.64);
    beak.rotation.x = Math.PI;
    head.add(beak);
  } else {
    sphere(head, pale, 0, 0, 0, 0.81, 0.71, 0.58);
    [-1, 1].forEach((s) => {
      sphere(head, dark, s * 0.62, 0.57, 0, 0.29, 0.29, 0.19);
      sphere(head, paint, s * 0.62, 0.58, 0.16, 0.15, 0.16, 0.06);
      sphere(head, dark, s * 0.32, 0.06, 0.49, 0.21, 0.29, 0.13).rotation.z =
        -s * 0.22;
      sphere(head, white, s * 0.3, 0.09, 0.592, 0.09, 0.105, 0.045);
      sphere(head, dark, s * 0.3, 0.085, 0.628, 0.058, 0.075, 0.032);
    });
    sphere(head, pale, 0, -0.25, 0.52, 0.32, 0.2, 0.19);
    sphere(head, dark, 0, -0.16, 0.687, 0.115, 0.075, 0.05);
    tube(
      head,
      dark,
      [
        [-0.14, -0.32, 0.673],
        [0, -0.36, 0.7],
        [0.14, -0.32, 0.673],
      ],
      0.02,
    );
  }
  const accessory = new THREE.Group();
  accessory.name = "accessory";
  head.add(accessory);
  if (combo.accessory === 0) {
    const crown = new THREE.Shape();
    crown.moveTo(-0.4, 0);
    crown.lineTo(-0.46, 0.46);
    crown.lineTo(-0.22, 0.3);
    crown.lineTo(0, 0.62);
    crown.lineTo(0.22, 0.3);
    crown.lineTo(0.46, 0.46);
    crown.lineTo(0.4, 0);
    crown.closePath();
    const mesh = new THREE.Mesh(
      new THREE.ExtrudeGeometry(crown, {
        depth: 0.27,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.035,
        bevelThickness: 0.035,
      }),
      gold,
    );
    mesh.position.set(0, 0.62, -0.1);
    mesh.rotation.z = -0.08;
    mesh.castShadow = true;
    accessory.add(mesh);
    [
      [-0.46, 0.46],
      [0, 0.62],
      [0.46, 0.46],
    ].forEach((p) => sphere(accessory, gold, p[0], p[1] + 0.64, 0.045, 0.073));
  } else if (combo.accessory === 1) {
    [-1, 1].forEach((s) => {
      sphere(accessory, dark, s * 0.36, 0.12, 0.68, 0.32, 0.21, 0.09);
      tube(
        accessory,
        dark,
        [
          [s * 0.65, 0.17, 0.64],
          [s * 0.8, 0.18, 0.3],
          [s * 0.78, 0.17, 0],
        ],
        0.043,
      );
    });
    tube(
      accessory,
      dark,
      [
        [-0.1, 0.16, 0.73],
        [0, 0.18, 0.76],
        [0.1, 0.16, 0.73],
      ],
      0.046,
    );
    tube(
      accessory,
      white,
      [
        [-0.53, 0.22, 0.752],
        [-0.41, 0.25, 0.766],
      ],
      0.018,
    );
  } else if (combo.accessory === 2) {
    tube(
      accessory,
      accent,
      [
        [-0.9, 0, 0],
        [-0.91, 0.48, 0],
        [-0.57, 0.84, 0],
        [0, 0.98, 0],
        [0.57, 0.84, 0],
        [0.91, 0.48, 0],
        [0.9, 0, 0],
      ],
      0.093,
    );
    [-1, 1].forEach((s) => {
      sphere(accessory, dark, s * 0.85, -0.04, 0.02, 0.15, 0.37, 0.32);
      sphere(accessory, accent, s * 0.98, -0.04, 0.02, 0.13, 0.3, 0.25);
    });
  } else {
    [-1, 1].forEach((s) => {
      const bow = sphere(root, accent, s * 0.23, 1.62, 0.5, 0.28, 0.17, 0.115);
      bow.rotation.z = -s * 0.16;
    });
    sphere(root, gold, 0, 1.62, 0.57, 0.09, 0.105, 0.08);
  }
  root.rotation.y = -0.08;
  return root;
}
function dispose(group: THREE.Object3D) {
  const materials = new Set<THREE.Material>();
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose();
      (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach(
        (m) => materials.add(m),
      );
    }
  });
  materials.forEach((m) => m.dispose());
}

interface Props {
  single?: boolean;
  target: Combination;
  selection: Combination;
  reducedMotion: boolean;
}
export const MascotScene = memo(function MascotScene({
  target,
  selection,
  reducedMotion,
  single = false,
}: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const state = useRef<{
    scene: THREE.Scene;
    renderer: THREE.WebGLRenderer;
    camera: THREE.OrthographicCamera;
    figures: THREE.Group[];
    render: () => void;
    layout: () => void;
  } | null>(null);
  const [fallback, setFallback] = useState(false);
  useEffect(() => {
    const el = mount.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "low-power",
      });
    } catch {
      setFallback(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-4, 4, 4, 0, 0.1, 30);
    camera.position.set(0, 2.9, 9);
    camera.lookAt(0, 1.85, 0);
    scene.add(new THREE.HemisphereLight("#fff9e4", "#7195eb", 1.8));
    const light = new THREE.DirectionalLight("#fff1d8", 2.5);
    light.position.set(-3, 6, 7);
    light.castShadow = true;
    light.shadow.mapSize.set(512, 512);
    light.shadow.camera.left = -8;
    light.shadow.camera.right = 8;
    light.shadow.camera.top = 5;
    light.shadow.camera.bottom = -4;
    light.shadow.bias = -0.002;
    scene.add(light);
    const fill = new THREE.DirectionalLight("#a6ceff", 1.5);
    fill.position.set(4, 3, -3);
    scene.add(fill);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 20),
      new THREE.ShadowMaterial({ opacity: 0.16 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.045;
    floor.receiveShadow = true;
    scene.add(floor);
    let pending = 0;
    const render = () => {
      if (!pending && !document.hidden)
        pending = requestAnimationFrame(() => {
          pending = 0;
          renderer.render(scene, camera);
        });
    };
    const figures: THREE.Group[] = [];
    let lastWidth = 0,
      lastHeight = 0;
    const layout = () => {
      const width = el.clientWidth,
        height = el.clientHeight;
      if (!width || !height) return;
      const aspect = width / height,
        viewHeight = 3.75,
        viewWidth = viewHeight * aspect;
      camera.left = -viewWidth / 2;
      camera.right = viewWidth / 2;
      camera.top = viewHeight / 2;
      camera.bottom = -viewHeight / 2;
      camera.updateProjectionMatrix();
      if (width !== lastWidth || height !== lastHeight) {
        renderer.setSize(width, height, false);
        lastWidth = width;
        lastHeight = height;
      }
      figures.forEach((g, i) => {
        g.position.x = single ? 0 : (i === 0 ? -1 : 1) * viewWidth * 0.25;
      });
      render();
    };
    state.current = { scene, renderer, camera, figures, render, layout };
    const observer = new ResizeObserver(layout);
    observer.observe(el);
    layout();
    const visibility = () => render();
    document.addEventListener("visibilitychange", visibility);
    const lost = (event: Event) => {
      event.preventDefault();
      setFallback(true);
    };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      cancelAnimationFrame(pending);
      figures.forEach((g) => {
        gsap.killTweensOf(g.scale);
        gsap.killTweensOf(g.rotation);
        const h = g.getObjectByName("head");
        if (h) gsap.killTweensOf(h.position);
      });
      dispose(scene);
      renderer.dispose();
      light.shadow.map?.dispose();
      el.replaceChildren();
      state.current = null;
      previous.current = [];
    };
  }, [single]);
  const previous = useRef<string[]>([]);
  useEffect(() => {
    const s = state.current;
    if (!s) return;
    (single ? [target] : [target, selection]).forEach((combo, i) => {
      const key = JSON.stringify(combo);
      if (previous.current[i] === key) return;
      previous.current[i] = key;
      const old = s.figures[i];
      if (old) {
        gsap.killTweensOf(old.scale);
        gsap.killTweensOf(old.rotation);
        const h = old.getObjectByName("head");
        if (h) gsap.killTweensOf(h.position);
        s.scene.remove(old);
        dispose(old);
      }
      const figure = buildMascot(combo);
      figure.scale.set(1.3, 1.08, 1.08);
      s.figures[i] = figure;
      s.scene.add(figure);
      s.layout();
      if (!reducedMotion) {
        gsap.from(figure.scale, {
          y: 0.94,
          x: 1.4,
          z: 1.13,
          duration: 0.48,
          ease: "back.out(2)",
          onUpdate: s.render,
        });
        gsap.from(figure.rotation, {
          y: i === 0 ? -0.3 : 0.3,
          duration: 0.55,
          ease: "power3.out",
          onUpdate: s.render,
        });
        const head = figure.getObjectByName("head");
        if (head)
          gsap.from(head.position, {
            y: 2.42,
            duration: 0.48,
            ease: "bounce.out",
            onUpdate: s.render,
          });
      } else s.render();
    });
  }, [
    target.animal,
    target.colour,
    target.accessory,
    selection.animal,
    selection.colour,
    selection.accessory,
    reducedMotion,
    single,
  ]);
  return (
    <div className="mascot-canvas" ref={mount} aria-hidden="true">
      {fallback && (
        <div className="scene-fallback">
          {(single ? [target] : [target, selection]).map((c, i) => (
            <div key={i} style={{ color: COLOURS[c.colour] }}>
              <strong>{OPTIONS.animal[c.animal]}</strong>
              <span>
                {OPTIONS.colour[c.colour]} · {OPTIONS.accessory[c.accessory]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
