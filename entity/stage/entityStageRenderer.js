// ======================================================
// NOSLEEP_ENGINE — entityStageRenderer.js v2
// Stage Environment Integration
// ======================================================
//
// Private renderer helper for Entity Stage 3D
//
// ======================================================

import * as THREE from "../../libs/three.module.js";
import {
  updateCamera,
  emitCameraChanged,
  clampPitchParams,
  clampZoomParams,
  getPixelRatio,
  clamp
} from "./entityStageCamera.js";
import { bindStageInput } from "./entityStageInput.js";
import { applyStageBackground } from "./entityStageDom.js";

import {
  createStageEnvironment,
  updateStageEnvironment,
  applyStageEnvironmentParams,
  rebuildStageEnvironment,
  disposeStageEnvironment
} from "./entityStageEnvironment.js";

export function setupThree(state) {
  state.scene = new THREE.Scene();

  state.camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );

  state.renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
  });

  state.renderer.setPixelRatio(getPixelRatio(state));
  state.renderer.setSize(window.innerWidth, window.innerHeight);
  state.renderer.setClearColor(0x000000, 0);

  state.canvasHost.appendChild(state.renderer.domElement);

  state.raycaster = new THREE.Raycaster();
  state.pointer = new THREE.Vector2();

  const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 1.1);
  hemi.name = "hemiLight";

  const dir = new THREE.DirectionalLight(0xffffff, 1.15);
  dir.name = "dirLight";
  dir.position.set(4, 6, 5);

  const grid = new THREE.GridHelper(10, 10, 0x444455, 0x252530);
  grid.name = "stageBaseGrid";
  grid.position.y = -1;

  state.scene.add(hemi, dir, grid);

  createStageEnvironment(state);

  updateCamera(state);

  state.resizeHandler = () => resizeStage(state);
  window.addEventListener("resize", state.resizeHandler);

  bindStageInput(state);
}

export function applyRendererParams(state) {
  applyStageBackground(state);
  clampPitchParams(state);
  clampZoomParams(state);

  if (!state.renderer || !state.scene) return;

  state.renderer.setPixelRatio(getPixelRatio(state));
  state.renderer.setClearColor(0x000000, 0);

  const hemi = state.scene.getObjectByName("hemiLight");
  const dir = state.scene.getObjectByName("dirLight");
  const grid = state.scene.getObjectByName("stageBaseGrid");

  if (hemi) hemi.intensity = Number(state.params.lightIntensity) || 1;
  if (dir) dir.intensity = Number(state.params.lightIntensity) || 1;

  if (grid) {
    grid.visible = !!state.params.baseGridEnabled;
    grid.material.opacity = clamp(Number(state.params.baseGridOpacity ?? 1), 0, 1);
    grid.material.transparent = true;
  }

  state.distance = clamp(state.distance, state.params.minZoom, state.params.maxZoom);

  applyStageEnvironmentParams(state);
}

export function rebuildRendererEnvironment(state) {
  rebuildStageEnvironment(state);
}

export function disposeRendererEnvironment(state) {
  disposeStageEnvironment(state);
}

export function resizeStage(state) {
  if (!state.renderer || !state.camera) return;

  state.camera.aspect = window.innerWidth / window.innerHeight;
  state.camera.updateProjectionMatrix();
  state.renderer.setSize(window.innerWidth, window.innerHeight);
  emitCameraChanged(state);
}

export function loop(state) {
  if (!state.running) return;

  state.raf = requestAnimationFrame(() => loop(state));

  updateStageEnvironment(state, 1 / 60);

  if (state.renderer && state.scene && state.camera) {
    state.renderer.render(state.scene, state.camera);
  }
}

// CHANGELOG v2:
// • Подключён entityStageEnvironment.js как внутренний Stage helper.
// • Environment создаётся внутри той же Three.Scene, без второго renderer.
// • loop() обновляет environment перед render.
// • Добавлены rebuildRendererEnvironment / disposeRendererEnvironment.
// • GridHelper получил имя stageBaseGrid и управляется параметрами baseGridEnabled/baseGridOpacity.
// • Сохранены setupThree, resizeStage, applyRendererParams и render loop v1.