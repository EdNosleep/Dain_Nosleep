// ======================================================
// Dain_Coin — testShooterCamera.js v2
// FPS shooter test camera + TrayPanel Lift Support
// ======================================================
//
// CHANGELOG v2:
// • Добавлена поддержка ui:viewportInsetsChanged
// • Shooter-сцена поднимается вместе с нижней панелью
// • Renderer не ресайзится при движении панели
// • Overlay ON  → сцена не двигается
// • Overlay OFF → сцена lift вверх вместе с TrayPanel
// • Добавлены Inspector-параметры Viewport Lift Factor / Viewport FOV Boost
// ======================================================

import { defineModule } from "../../engine/moduleFactory.js";
import * as THREE from "../../libs/three.module.js";

import {
  createStageDOM,
  applyStageViewportLift
} from "./entityStageDom.js";

import { createGeometry } from "./entityStageGeometry.js";

import {
  createStageMesh,
  applySelection,
  refreshMeshColors,
  disposeMesh
} from "./entityStageMaterials.js";

const KEY = "__testShooterCameraModule";

export const registerTestShooterCameraModule = defineModule({
  key: KEY,
  name: "Test Shooter Camera",

  inspector: {
    "Качество геометрии": { param: "geometryQuality", type: "range", min: 0, max: 100, step: 1, value: 65 },
    "Цвет фигур": { param: "meshColor", type: "color", value: "#b9b2ff" },
    "Цвет выделенной фигуры": { param: "selectedMeshColor", type: "color", value: "#ffd36a" },
    "Свечение выделенной фигуры": { param: "selectedEmissiveColor", type: "color", value: "#332000" },
    "Прозрачный фон": { param: "transparentBackground", type: "toggle", value: false },
    "Цвет фона": { param: "backgroundColor", type: "color", value: "#111117" },
    "Интенсивность света": { param: "lightIntensity", type: "range", min: 0.3, max: 2, step: 0.05, value: 1.15 },

    "Джойстик X": { param: "joystickX", type: "range", min: 20, max: 80, step: 1, value: 25 },
    "Джойстик Y": { param: "joystickY", type: "range", min: 55, max: 92, step: 1, value: 60 },
    "Скорость движения": { param: "moveSpeed", type: "range", min: 0.2, max: 12, step: 0.1, value: 5 },
    "Высота камеры": { param: "cameraHeight", type: "range", min: 0.4, max: 4, step: 0.05, value: 1.65 },
    "Макс. дистанция от центра": { param: "maxMoveDistance", type: "range", min: 2, max: 80, step: 1, value: 24 },
    "Чувствительность обзора": { param: "lookSensitivity", type: "range", min: 0.5, max: 4, step: 0.1, value: 1.3 },

    "Viewport Lift Factor": {
      param: "viewportLiftFactor",
      type: "range",
      min: 0,
      max: 1,
      step: 0.05,
      value: 0.45
    },
    "Viewport FOV Boost": {
      param: "viewportFovBoost",
      type: "range",
      min: 0,
      max: 20,
      step: 1,
      value: 6
    }
  },

  dependencies: ["__entityEditorLogicModule"],

  createState() {
    return {
      params: {
        geometryQuality: 65,
        meshColor: "#b9b2ff",
        selectedMeshColor: "#ffd36a",
        selectedEmissiveColor: "#332000",
        transparentBackground: false,
        backgroundColor: "#111117",
        lightIntensity: 1.15,
        joystickX: 50,
        joystickY: 80,
        moveSpeed: 4,
        cameraHeight: 1.65,
        maxMoveDistance: 24,
        lookSensitivity: 1.3,
        viewportLiftFactor: 0.45,
        viewportFovBoost: 6
      },

      THREE,

      root: null,
      canvasHost: null,
      joystick: null,
      joystickKnob: null,

      scene: null,
      camera: null,
      renderer: null,
      raycaster: null,
      pointer: null,

      bus: null,
      resizeHandler: null,
      inputHandlers: null,

      meshes: new Map(),
      selectedNodeId: null,
      lastDraft: null,
      unsubDraft: null,

      raf: 0,
      running: false,
      lastTime: 0,

      position: new THREE.Vector3(0, 1.65, 8),
      yaw: Math.PI,
      pitch: 0,

      moveX: 0,
      moveY: 0,

      joystickPointerId: null,
      lookPointerId: null,
      lastLookX: 0,
      lastLookY: 0,

      viewportLiftPx: 0,
      lastViewportRawBottom: 0,
      lastViewportOverlayMode: true
    };
  },

  onStart({ ctx, state, bus, store }) {
    state.bus = bus;
    state.THREE = THREE;

    createStageDOM(ctx.container, state);
    createJoystickDOM(state);
    setupShooterThree(state);
    bindShooterInput(state);

    renderDraft(state, store.get("entityDraft"));

    state.unsubDraft = store.subscribe("entityDraft", draft => {
      renderDraft(state, draft);
    });

    bus.on("ui:viewportInsetsChanged", payload => {
      state.lastViewportRawBottom = Number(payload?.rawBottom) || 0;
      state.lastViewportOverlayMode = !!payload?.overlayMode;

      applyStageViewportLift(state, payload);
      applyViewportFov(state);
    }, { moduleKey: KEY });

    bus.on("entityEditor:setTool", payload => {
      state.bus?.emit("log:add", {
        type: "debug",
        source: KEY,
        message: `Tool ignored in shooter camera: ${payload?.tool || payload?.mode || "unknown"}`
      });
    }, { moduleKey: KEY });

    state.running = true;
    state.lastTime = performance.now();

    updateShooterCamera(state);
    loop(state);
  },

  onDisable({ state }) {
    state.running = false;
    cancelAnimationFrame(state.raf);
    state.raf = 0;

    unbindShooterInput(state);

    try { state.unsubDraft?.(); } catch (_) {}
    state.unsubDraft = null;

    if (state.resizeHandler) {
      window.removeEventListener("resize", state.resizeHandler);
      state.resizeHandler = null;
    }

    for (const mesh of state.meshes.values()) {
      disposeMesh(mesh);
    }

    state.meshes.clear();

    if (state.renderer) {
      try { state.renderer.dispose(); } catch (_) {}
    }

    if (state.root) state.root.remove();

    state.root = null;
    state.canvasHost = null;
    state.joystick = null;
    state.joystickKnob = null;
    state.scene = null;
    state.camera = null;
    state.renderer = null;
    state.raycaster = null;
    state.pointer = null;
    state.bus = null;
    state.lastDraft = null;

    state.joystickPointerId = null;
    state.lookPointerId = null;
    state.moveX = 0;
    state.moveY = 0;
  },

  onParam({ param, value, state }) {
    state.params[param] = value;

    if (param === "geometryQuality") {
      rebuildAllMeshGeometry(state);
    }

    if (
      param === "meshColor" ||
      param === "selectedMeshColor" ||
      param === "selectedEmissiveColor"
    ) {
      refreshMeshColors(state);
    }

    if (param === "joystickX" || param === "joystickY") {
      applyJoystickPosition(state);
    }

    if (param === "cameraHeight") {
      state.position.y = safeNumber(value, 1.65);
      updateShooterCamera(state);
    }

    if (param === "viewportLiftFactor") {
      applyStageViewportLift(state, {
        bottom: state.lastViewportOverlayMode ? 0 : state.lastViewportRawBottom,
        rawBottom: state.lastViewportRawBottom,
        overlayMode: state.lastViewportOverlayMode,
        dragging: false
      });
    }

    if (param === "viewportFovBoost") {
      applyViewportFov(state);
    }

    applyShooterRendererParams(state);
  }
});

function setupShooterThree(state) {
  state.scene = new THREE.Scene();

  state.camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.05,
    160
  );

  state.baseFov = 70;

  state.renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
  });

  state.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
  state.renderer.setSize(window.innerWidth, window.innerHeight);
  state.renderer.setClearColor(0x000000, 0);

  state.canvasHost.appendChild(state.renderer.domElement);

  state.raycaster = new THREE.Raycaster();
  state.pointer = new THREE.Vector2();

  const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 1.1);
  hemi.name = "hemiLight";

  const dir = new THREE.DirectionalLight(0xffffff, 1.15);
  dir.name = "dirLight";
  dir.position.set(4, 8, 5);

  const grid = new THREE.GridHelper(80, 80, 0x444455, 0x252530);
  grid.name = "groundGrid";
  grid.position.y = -1;

  state.scene.add(hemi, dir, grid);

  state.resizeHandler = () => resizeShooterStage(state);
  window.addEventListener("resize", state.resizeHandler);

  applyShooterRendererParams(state);
}

function applyShooterRendererParams(state) {
  if (state.root) {
    if (state.params.transparentBackground) {
      state.root.style.background = "transparent";
    } else {
      state.root.style.background = String(state.params.backgroundColor || "#111117");
    }
  }

  if (!state.renderer || !state.scene) return;

  state.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
  state.renderer.setClearColor(0x000000, 0);

  const hemi = state.scene.getObjectByName("hemiLight");
  const dir = state.scene.getObjectByName("dirLight");

  const intensity = safeNumber(state.params.lightIntensity, 1.15);

  if (hemi) hemi.intensity = intensity;
  if (dir) dir.intensity = intensity;

  state.position.y = safeNumber(state.params.cameraHeight, 1.65);
  applyViewportFov(state);
}

function applyViewportFov(state) {
  if (!state.camera) return;

  const rawBottom = Number(state.lastViewportRawBottom) || 0;
  const boostMax = clamp(safeNumber(state.params.viewportFovBoost, 6), 0, 30);
  const ratio = clamp(rawBottom / Math.max(1, window.innerHeight * 0.8), 0, 1);

  const targetFov = state.lastViewportOverlayMode
    ? 70
    : 70 + boostMax * ratio;

  state.camera.fov = targetFov;
  state.camera.updateProjectionMatrix();
}

function createJoystickDOM(state) {
  if (!state.root) return;

  const joystick = document.createElement("div");
  const knob = document.createElement("div");

  joystick.className = "test-shooter-joystick";
  knob.className = "test-shooter-joystick-knob";

  Object.assign(joystick.style, {
    position: "absolute",
    width: "118px",
    height: "118px",
    borderRadius: "999px",
    transform: "translate(-50%, -50%)",
    zIndex: "5",
    touchAction: "none",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.18)",
    boxShadow: "0 18px 44px rgba(0,0,0,0.38), inset 0 0 26px rgba(255,255,255,0.08)",
    backdropFilter: "blur(14px)",
    webkitBackdropFilter: "blur(14px)"
  });

  Object.assign(knob.style, {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: "54px",
    height: "54px",
    borderRadius: "999px",
    transform: "translate(-50%, -50%)",
    pointerEvents: "none",
    background: "rgba(255,255,255,0.22)",
    border: "1px solid rgba(255,255,255,0.32)",
    boxShadow: "0 10px 26px rgba(0,0,0,0.36), inset 0 0 18px rgba(255,255,255,0.16)"
  });

  joystick.appendChild(knob);
  state.root.appendChild(joystick);

  state.joystick = joystick;
  state.joystickKnob = knob;

  applyJoystickPosition(state);
}

function applyJoystickPosition(state) {
  if (!state.joystick) return;

  const x = clamp(safeNumber(state.params.joystickX, 50), 20, 80);
  const y = clamp(safeNumber(state.params.joystickY, 80), 55, 92);

  state.joystick.style.left = `${x}%`;
  state.joystick.style.top = `calc(${y}% - env(safe-area-inset-bottom, 0px))`;
}

function bindShooterInput(state) {
  if (!state.root) return;

  state.inputHandlers = {
    pointerdown: event => onPointerDown(event, state),
    pointermove: event => onPointerMove(event, state),
    pointerup: event => onPointerUp(event, state),
    pointercancel: event => onPointerUp(event, state),
    pointerleave: event => onPointerUp(event, state)
  };

  state.root.addEventListener("pointerdown", state.inputHandlers.pointerdown, { passive: false });
  state.root.addEventListener("pointermove", state.inputHandlers.pointermove, { passive: false });
  state.root.addEventListener("pointerup", state.inputHandlers.pointerup, { passive: false });
  state.root.addEventListener("pointercancel", state.inputHandlers.pointercancel, { passive: false });
  state.root.addEventListener("pointerleave", state.inputHandlers.pointerleave, { passive: false });
}

function unbindShooterInput(state) {
  if (!state.root || !state.inputHandlers) return;

  state.root.removeEventListener("pointerdown", state.inputHandlers.pointerdown);
  state.root.removeEventListener("pointermove", state.inputHandlers.pointermove);
  state.root.removeEventListener("pointerup", state.inputHandlers.pointerup);
  state.root.removeEventListener("pointercancel", state.inputHandlers.pointercancel);
  state.root.removeEventListener("pointerleave", state.inputHandlers.pointerleave);

  state.inputHandlers = null;
}

function onPointerDown(event, state) {
  if (!state.root) return;

  event.preventDefault();

  if (state.joystick && state.joystick.contains(event.target)) {
    state.joystickPointerId = event.pointerId;
    state.joystick.setPointerCapture?.(event.pointerId);
    updateJoystickFromPointer(state, event);
    return;
  }

  state.lookPointerId = event.pointerId;
  state.lastLookX = event.clientX;
  state.lastLookY = event.clientY;
  state.root.setPointerCapture?.(event.pointerId);
}

function onPointerMove(event, state) {
  if (event.pointerId === state.joystickPointerId) {
    event.preventDefault();
    updateJoystickFromPointer(state, event);
    return;
  }

  if (event.pointerId === state.lookPointerId) {
    event.preventDefault();

    const dx = event.clientX - state.lastLookX;
    const dy = event.clientY - state.lastLookY;

    state.lastLookX = event.clientX;
    state.lastLookY = event.clientY;

    const sensitivity = safeNumber(state.params.lookSensitivity, 1.3);

    state.yaw -= dx * 0.004 * sensitivity;
    state.pitch -= dy * 0.0035 * sensitivity;
    state.pitch = clamp(state.pitch, -1.25, 1.25);

    updateShooterCamera(state);
  }
}

function onPointerUp(event, state) {
  event.preventDefault();

  if (event.pointerId === state.joystickPointerId) {
    resetJoystick(state);
  }

  if (event.pointerId === state.lookPointerId) {
    state.lookPointerId = null;
  }
}

function updateJoystickFromPointer(state, event) {
  if (!state.joystick || !state.joystickKnob) return;

  const rect = state.joystick.getBoundingClientRect();
  const cx = rect.left + rect.width * 0.5;
  const cy = rect.top + rect.height * 0.5;
  const radius = rect.width * 0.34;

  let dx = event.clientX - cx;
  let dy = event.clientY - cy;

  const len = Math.hypot(dx, dy);

  if (len > radius) {
    dx = dx / len * radius;
    dy = dy / len * radius;
  }

  state.moveX = radius > 0 ? dx / radius : 0;
  state.moveY = radius > 0 ? dy / radius : 0;

  state.joystickKnob.style.transform =
    `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
}

function resetJoystick(state) {
  state.joystickPointerId = null;
  state.moveX = 0;
  state.moveY = 0;

  if (state.joystickKnob) {
    state.joystickKnob.style.transform = "translate(-50%, -50%)";
  }
}

function loop(state) {
  if (!state.running) return;

  const now = performance.now();
  const dt = Math.min(0.05, Math.max(0, (now - state.lastTime) / 1000));
  state.lastTime = now;

  updateShooterMovement(state, dt);
  updateShooterCamera(state);

  if (state.renderer && state.scene && state.camera) {
    state.renderer.render(state.scene, state.camera);
  }

  state.raf = requestAnimationFrame(() => loop(state));
}

function updateShooterMovement(state, dt) {
  const deadZone = 0.08;

  if (Math.abs(state.moveX) < deadZone && Math.abs(state.moveY) < deadZone) {
    state.position.y = safeNumber(state.params.cameraHeight, 1.65);
    return;
  }

  const speed = safeNumber(state.params.moveSpeed, 4);
  const forwardInput = -state.moveY;
  const rightInput = state.moveX;

  const forward = new THREE.Vector3(
    -Math.sin(state.yaw),
    0,
    -Math.cos(state.yaw)
  );

  const right = new THREE.Vector3(
    Math.cos(state.yaw),
    0,
    -Math.sin(state.yaw)
  );

  const delta = new THREE.Vector3();
  delta.addScaledVector(forward, forwardInput);
  delta.addScaledVector(right, rightInput);

  if (delta.lengthSq() > 1) delta.normalize();

  state.position.addScaledVector(delta, speed * dt);

  const maxDistance = safeNumber(state.params.maxMoveDistance, 24);
  const flatDistance = Math.hypot(state.position.x, state.position.z);

  if (flatDistance > maxDistance) {
    const k = maxDistance / flatDistance;
    state.position.x *= k;
    state.position.z *= k;
  }

  state.position.y = safeNumber(state.params.cameraHeight, 1.65);
}

function updateShooterCamera(state) {
  if (!state.camera) return;

  state.position.y = safeNumber(state.params.cameraHeight, 1.65);
  state.camera.position.copy(state.position);

  const lookDirection = new THREE.Vector3(
    -Math.sin(state.yaw) * Math.cos(state.pitch),
    Math.sin(state.pitch),
    -Math.cos(state.yaw) * Math.cos(state.pitch)
  );

  state.camera.lookAt(state.position.clone().add(lookDirection));

  state.bus?.emit("testShooterCamera:cameraChanged", {
    position: {
      x: state.position.x,
      y: state.position.y,
      z: state.position.z
    },
    yaw: state.yaw,
    pitch: state.pitch,
    fov: state.camera.fov
  });
}

function resizeShooterStage(state) {
  if (!state.renderer || !state.camera) return;

  state.camera.aspect = window.innerWidth / window.innerHeight;
  state.camera.updateProjectionMatrix();
  state.renderer.setSize(window.innerWidth, window.innerHeight);
}

function renderDraft(state, draft) {
  if (!state.scene) return;

  state.lastDraft = draft;

  const nodes = Array.isArray(draft?.nodes) ? draft.nodes : [];
  const alive = new Set(nodes.map(n => n.id));

  state.selectedNodeId = draft?.selectedNodeId || null;

  for (const [id, mesh] of state.meshes.entries()) {
    if (!alive.has(id)) {
      state.scene.remove(mesh);
      disposeMesh(mesh);
      state.meshes.delete(id);
    }
  }

  nodes.forEach(node => {
    let mesh = state.meshes.get(node.id);

    if (!mesh) {
      const geometry = createGeometry(state, node.primitiveId);
      mesh = createStageMesh(state, node, geometry);
      state.meshes.set(node.id, mesh);
      state.scene.add(mesh);
    }

    applyNodeToMesh(mesh, node);
    applySelection(state, mesh, node.id === state.selectedNodeId);
  });
}

function rebuildAllMeshGeometry(state) {
  if (!state.lastDraft || !state.scene) return;

  const nodes = Array.isArray(state.lastDraft.nodes) ? state.lastDraft.nodes : [];

  nodes.forEach(node => {
    const mesh = state.meshes.get(node.id);
    if (!mesh) return;

    const nextGeometry = createGeometry(state, node.primitiveId);
    if (!nextGeometry) return;

    if (mesh.geometry) mesh.geometry.dispose();
    mesh.geometry = nextGeometry;
  });
}

function applyNodeToMesh(mesh, node) {
  const t = node.transform || {};
  const p = t.position || {};
  const r = t.rotation || {};
  const s = t.scale || {};

  mesh.position.set(
    Number(p.x) || 0,
    Number(p.y) || 0,
    Number(p.z) || 0
  );

  mesh.rotation.set(
    degToRad(Number(r.x) || 0),
    degToRad(Number(r.y) || 0),
    degToRad(Number(r.z) || 0)
  );

  mesh.scale.set(
    Number(s.x) || 1,
    Number(s.y) || 1,
    Number(s.z) || 1
  );
}

function degToRad(v) {
  return v * Math.PI / 180;
}

function safeNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
