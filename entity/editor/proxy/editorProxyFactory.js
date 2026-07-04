// ======================================================
// NOSLEEP_ENGINE — editorProxyFactory.js v1
// Editor primitive proxy factory
// ======================================================

import { createCubeProxy } from "./cubeProxy.js";
import { createSphereProxy } from "./sphereProxy.js";
import { createCylinderProxy } from "./cylinderProxy.js";
import { createConeProxy } from "./coneProxy.js";
import { createCapsuleProxy } from "./capsuleProxy.js";

export function createEditorProxy({ THREE, primitiveId, geometryType, quality = 12 }) {
  const type = primitiveId || geometryType || "cube";

  if (type === "sphere") return createSphereProxy({ THREE, quality });
  if (type === "cylinder") return createCylinderProxy({ THREE, quality });
  if (type === "cone") return createConeProxy({ THREE, quality });
  if (type === "capsule") return createCapsuleProxy({ THREE, quality });

  return createCubeProxy({ THREE });
}

// CHANGELOG v1:
// • Добавлена единая фабрика editor proxy.
// • Поддержаны cube / sphere / cylinder / cone / capsule.
// • Focus сможет получать каркас без знания типа фигуры.

