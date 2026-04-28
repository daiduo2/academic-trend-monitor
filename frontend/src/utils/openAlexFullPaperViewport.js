function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getCoordinateCenter(bounds) {
  return {
    x: (Number(bounds?.minX || 0) + Number(bounds?.maxX || 0)) / 2,
    y: (Number(bounds?.minY || 0) + Number(bounds?.maxY || 0)) / 2,
    z: (Number(bounds?.minZ || 0) + Number(bounds?.maxZ || 0)) / 2,
  };
}

function projectRelative3dPoint(x, y, z, camera) {
  const cosYaw = Math.cos(camera.yaw);
  const sinYaw = Math.sin(camera.yaw);
  const cosPitch = Math.cos(camera.pitch);
  const sinPitch = Math.sin(camera.pitch);
  const rotatedX = (x * cosYaw) + (z * sinYaw);
  const rotatedZ = (-x * sinYaw) + (z * cosYaw);
  const rotatedY = (y * cosPitch) - (rotatedZ * sinPitch);
  const depth = (y * sinPitch) + (rotatedZ * cosPitch);
  const perspective = camera.scale / Math.max(camera.distance - depth, 0.9);

  return {
    depth,
    projectedX: rotatedX * perspective,
    projectedY: rotatedY * perspective,
    perspective,
  };
}

export function projectFullPaperToScreen({
  camera,
  coordinateBounds2d,
  coordinateBounds3d,
  paper,
  size,
  viewMode,
}) {
  const center2d = getCoordinateCenter(coordinateBounds2d);
  const center3d = getCoordinateCenter(coordinateBounds3d);
  const halfWidth = size.width / 2;
  const halfHeight = size.height / 2;

  if (viewMode === '2d') {
    return {
      depth: 0,
      paper,
      radius: 5.8,
      screenX: halfWidth + camera.offsetX + ((paper.coordinates.x - center2d.x) * camera.scale),
      screenY: halfHeight + camera.offsetY - ((paper.coordinates.y - center2d.y) * camera.scale),
    };
  }

  const projectedPoint = projectRelative3dPoint(
    paper.coordinates3d.x - center3d.x,
    paper.coordinates3d.y - center3d.y,
    paper.coordinates3d.z - center3d.z,
    camera,
  );

  return {
    depth: projectedPoint.depth,
    paper,
    radius: clamp(4.2 + (projectedPoint.perspective * 0.012), 4.2, 12),
    screenX: halfWidth + camera.offsetX + projectedPoint.projectedX,
    screenY: halfHeight + camera.offsetY - projectedPoint.projectedY,
  };
}

function isProjectedPaperVisible(entry, size) {
  if (!size) {
    return true;
  }

  return !(
    entry.screenX < -entry.radius
    || entry.screenX > size.width + entry.radius
    || entry.screenY < -entry.radius
    || entry.screenY > size.height + entry.radius
  );
}

export function pickProjectedFullPaper(projectedPapers, clientX, clientY, size) {
  let bestMatch = null;

  projectedPapers.forEach((entry) => {
    if (!isProjectedPaperVisible(entry, size)) {
      return;
    }

    const deltaX = entry.screenX - clientX;
    const deltaY = entry.screenY - clientY;
    const distanceSquared = (deltaX ** 2) + (deltaY ** 2);
    const pickRadius = Math.max(entry.radius + 4, 10);

    if (distanceSquared > (pickRadius ** 2)) {
      return;
    }

    if (
      !bestMatch
      || distanceSquared < bestMatch.distanceSquared
      || (
        distanceSquared === bestMatch.distanceSquared
        && Number(entry.depth || 0) > Number(bestMatch.depth || 0)
      )
    ) {
      bestMatch = {
        ...entry,
        distanceSquared,
      };
    }
  });

  return bestMatch;
}

export function buildFullPaperHoverCard(paper) {
  return {
    meta: `${paper?.publicationYear || 'Unknown year'} · cited by ${Number(paper?.citedByCount || 0).toLocaleString()}`,
    title: paper?.title || 'Untitled work',
  };
}
