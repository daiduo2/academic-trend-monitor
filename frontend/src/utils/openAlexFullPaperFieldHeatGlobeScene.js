function asArray(value) {
  return Array.isArray(value) ? value : [];
}

const FALLBACK_CAMERA_STATE = {
  azimuth: 0.65,
  elevation: 0.32,
  maxRadius: 12,
  minRadius: 1.2,
  radius: 3.35,
  target: { x: 0, y: 0, z: 0 },
};

function hasValidLength(values, groupSize) {
  return groupSize <= 1 || values.length % groupSize === 0;
}

function toStrictFloat32Array(values, options = {}) {
  const source = asArray(values);

  if (!source.length || !hasValidLength(source, options.groupSize || 1)) {
    return new Float32Array();
  }

  const normalized = [];

  for (const value of source) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
      return new Float32Array();
    }

    normalized.push(parsed);
  }

  return Float32Array.from(normalized);
}

function toStrictUint32Array(values, options = {}) {
  const source = asArray(values);

  if (!source.length || !hasValidLength(source, options.groupSize || 1)) {
    return new Uint32Array();
  }

  const normalized = [];

  for (const value of source) {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < 0) {
      return new Uint32Array();
    }

    normalized.push(parsed);
  }

  return Uint32Array.from(normalized);
}

function normalizeColorChannel(value) {
  return Math.max(0, Math.min(255, value)) / 255;
}

function parsePatchColor(colorValue) {
  const normalized = String(colorValue || '').trim();

  if (/^#[0-9a-f]{6}$/i.test(normalized)) {
    return [
      normalizeColorChannel(Number.parseInt(normalized.slice(1, 3), 16)),
      normalizeColorChannel(Number.parseInt(normalized.slice(3, 5), 16)),
      normalizeColorChannel(Number.parseInt(normalized.slice(5, 7), 16)),
    ];
  }

  if (/^#[0-9a-f]{3}$/i.test(normalized)) {
    return [
      normalizeColorChannel(Number.parseInt(`${normalized[1]}${normalized[1]}`, 16)),
      normalizeColorChannel(Number.parseInt(`${normalized[2]}${normalized[2]}`, 16)),
      normalizeColorChannel(Number.parseInt(`${normalized[3]}${normalized[3]}`, 16)),
    ];
  }

  return [0.58, 0.64, 0.72];
}

function getBundlePatches(bundle) {
  return asArray(bundle?.patches);
}

function getPreferredPatchColorValue(patch) {
  return patch?.fieldColor || patch?.color || patch?.fillColor || null;
}

function validateIndicesAgainstPositions(indices, positions) {
  if (!indices.length || !positions.length) {
    return new Uint32Array();
  }

  const vertexCount = Math.floor(positions.length / 3);

  if (vertexCount <= 0) {
    return new Uint32Array();
  }

  for (const index of indices) {
    if (index < 0 || index >= vertexCount) {
      return new Uint32Array();
    }
  }

  return indices;
}

function createPatchMesh(patch, index) {
  const positions = toStrictFloat32Array(patch?.positions, { groupSize: 3 });
  const indices = validateIndicesAgainstPositions(
    toStrictUint32Array(patch?.indices, { groupSize: 3 }),
    positions,
  );

  return {
    color: parsePatchColor(getPreferredPatchColorValue(patch)),
    indices,
    patchId: String(patch?.patchId || patch?.topicId || patch?.fieldId || `patch-${index}`),
    positions,
  };
}

export function isRenderableFieldHeatGlobePatchMesh(patchMesh) {
  return Boolean(patchMesh?.positions?.length && patchMesh?.indices?.length);
}

export function getRenderableFieldHeatGlobePatchMeshes(patchMeshes) {
  return Object.values(patchMeshes || {}).filter(isRenderableFieldHeatGlobePatchMesh);
}

function deriveBoundsFromPatchMeshes(patchMeshes) {
  let bounds = null;

  getRenderableFieldHeatGlobePatchMeshes(patchMeshes).forEach((patchMesh) => {
    for (let index = 0; index + 2 < patchMesh.positions.length; index += 3) {
      const x = patchMesh.positions[index];
      const y = patchMesh.positions[index + 1];
      const z = patchMesh.positions[index + 2];

      if (!bounds) {
        bounds = {
          maxX: x,
          maxY: y,
          maxZ: z,
          minX: x,
          minY: y,
          minZ: z,
        };
      } else {
        bounds.minX = Math.min(bounds.minX, x);
        bounds.maxX = Math.max(bounds.maxX, x);
        bounds.minY = Math.min(bounds.minY, y);
        bounds.maxY = Math.max(bounds.maxY, y);
        bounds.minZ = Math.min(bounds.minZ, z);
        bounds.maxZ = Math.max(bounds.maxZ, z);
      }
    }
  });

  return bounds;
}

export function buildFieldHeatGlobeGeometryBuffers(bundle) {
  const patchMeshes = {};

  getBundlePatches(bundle).forEach((patch, index) => {
    const patchMesh = createPatchMesh(patch, index);
    patchMeshes[patchMesh.patchId] = patchMesh;
  });

  return { patchMeshes };
}

export function deriveFieldHeatGlobeCameraState(bundle) {
  const bounds = deriveBoundsFromPatchMeshes(buildFieldHeatGlobeGeometryBuffers(bundle).patchMeshes);

  if (!bounds) {
    return {
      ...FALLBACK_CAMERA_STATE,
      target: { ...FALLBACK_CAMERA_STATE.target },
    };
  }

  const spanX = Math.max(bounds.maxX - bounds.minX, 0);
  const spanY = Math.max(bounds.maxY - bounds.minY, 0);
  const spanZ = Math.max(bounds.maxZ - bounds.minZ, 0);
  const largestSpan = Math.max(spanX, spanY, spanZ, 1);
  const sceneRadius = largestSpan / 2;
  const radius = Math.max(sceneRadius * 2.0, FALLBACK_CAMERA_STATE.minRadius * 1.6);
  const minRadius = Math.max(sceneRadius * 0.9, FALLBACK_CAMERA_STATE.minRadius);
  const maxRadius = Math.max(radius * 2.4, minRadius + 1);

  return {
    azimuth: FALLBACK_CAMERA_STATE.azimuth,
    elevation: FALLBACK_CAMERA_STATE.elevation,
    maxRadius,
    minRadius,
    radius,
    target: {
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2,
      z: (bounds.minZ + bounds.maxZ) / 2,
    },
  };
}

export function resolvePickedFieldPatchId(patches, intersection) {
  const patchId = intersection?.object?.userData?.patchId;

  if (typeof patchId === 'string' && patchId) {
    return patchId;
  }

  return null;
}
