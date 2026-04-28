import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  buildShellGeometryBuffers,
  buildShellVertexColors,
  deriveShellCameraState,
  resolvePickedShellRegion,
} from '../../utils/openAlexFullPaperImpactShellScene';

const MIN_HOST_HEIGHT = 720;
const DRAG_SUPPRESSION_DISTANCE = 6;

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function getHostSize(host) {
  return {
    height: Math.max(host?.clientHeight || 0, MIN_HOST_HEIGHT),
    width: Math.max(host?.clientWidth || 0, 1),
  };
}

function buildLiftedPositions(buffers) {
  const vertexCount = Math.floor(buffers.positions.length / 3);
  const hasNormals = buffers.normals.length === buffers.positions.length;
  const hasLift = buffers.vertexLift.length === vertexCount;

  if (!hasNormals || !hasLift) {
    return buffers.positions;
  }

  const liftedPositions = new Float32Array(buffers.positions.length);

  for (let index = 0; index < vertexCount; index += 1) {
    const baseOffset = index * 3;
    const lift = Number(buffers.vertexLift[index] || 0);

    liftedPositions[baseOffset] = buffers.positions[baseOffset] + (buffers.normals[baseOffset] * lift);
    liftedPositions[baseOffset + 1] = buffers.positions[baseOffset + 1] + (buffers.normals[baseOffset + 1] * lift);
    liftedPositions[baseOffset + 2] = buffers.positions[baseOffset + 2] + (buffers.normals[baseOffset + 2] * lift);
  }

  return liftedPositions;
}

function positionCamera(camera, state) {
  const horizontalRadius = state.radius * Math.cos(state.elevation);
  const x = state.target.x + (horizontalRadius * Math.sin(state.azimuth));
  const y = state.target.y + (state.radius * Math.sin(state.elevation));
  const z = state.target.z + (horizontalRadius * Math.cos(state.azimuth));

  camera.position.set(x, y, z);
  camera.lookAt(state.target.x, state.target.y, state.target.z);
  camera.updateProjectionMatrix();
}

export default function OpenAlexFullPaperImpactShellViewport({
  activeRegionId = null,
  onSelectRegion,
  shell = null,
}) {
  const hostRef = useRef(null);
  const onSelectRegionRef = useRef(onSelectRegion);
  const shellRef = useRef(shell);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const sceneRef = useRef(null);
  const raycasterRef = useRef(null);
  const shellMeshRef = useRef(null);
  const markerMeshRef = useRef(null);
  const meshResourcesRef = useRef({ geometry: null, material: null });
  const cameraStateRef = useRef({
    ...deriveShellCameraState(shell),
  });
  const pointerStateRef = useRef({
    active: false,
    downX: 0,
    downY: 0,
    dragged: false,
    lastX: 0,
    lastY: 0,
  });

  onSelectRegionRef.current = onSelectRegion;
  shellRef.current = shell;

  useEffect(() => {
    const host = hostRef.current;

    if (!host) {
      return undefined;
    }

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 100);
    const raycaster = new THREE.Raycaster();
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    scene.add(new THREE.DirectionalLight(0xffffff, 0.45));

    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = camera;
    raycasterRef.current = raycaster;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    host.appendChild(renderer.domElement);

    const renderScene = () => {
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    const syncSize = () => {
      const nextSize = getHostSize(host);

      renderer.setSize(nextSize.width, nextSize.height);
      camera.aspect = nextSize.width / nextSize.height;
      positionCamera(camera, cameraStateRef.current);
      renderScene();
    };

    const handlePointerDown = (event) => {
      pointerStateRef.current.active = true;
      pointerStateRef.current.downX = event.clientX;
      pointerStateRef.current.downY = event.clientY;
      pointerStateRef.current.dragged = false;
      pointerStateRef.current.lastX = event.clientX;
      pointerStateRef.current.lastY = event.clientY;
      renderer.domElement.setPointerCapture?.(event.pointerId);
    };

    const handlePointerMove = (event) => {
      if (!pointerStateRef.current.active) {
        return;
      }

      const deltaX = event.clientX - pointerStateRef.current.lastX;
      const deltaY = event.clientY - pointerStateRef.current.lastY;
      const dragDistanceX = event.clientX - pointerStateRef.current.downX;
      const dragDistanceY = event.clientY - pointerStateRef.current.downY;

      pointerStateRef.current.lastX = event.clientX;
      pointerStateRef.current.lastY = event.clientY;
      if (
        !pointerStateRef.current.dragged
        && ((dragDistanceX * dragDistanceX) + (dragDistanceY * dragDistanceY))
          >= (DRAG_SUPPRESSION_DISTANCE * DRAG_SUPPRESSION_DISTANCE)
      ) {
        pointerStateRef.current.dragged = true;
      }
      cameraStateRef.current.azimuth -= deltaX * 0.008;
      cameraStateRef.current.elevation = clamp(
        cameraStateRef.current.elevation + (deltaY * 0.006),
        -1.1,
        1.1,
      );
      positionCamera(camera, cameraStateRef.current);
      renderScene();
    };

    const handlePointerUp = (event) => {
      pointerStateRef.current.active = false;
      renderer.domElement.releasePointerCapture?.(event.pointerId);
    };

    const handleWheel = (event) => {
      event.preventDefault();
      cameraStateRef.current.radius = clamp(
        cameraStateRef.current.radius + (event.deltaY * 0.0025),
        cameraStateRef.current.minRadius,
        cameraStateRef.current.maxRadius,
      );
      positionCamera(camera, cameraStateRef.current);
      renderScene();
    };

    const handleClick = (event) => {
      if (!shellMeshRef.current) {
        return;
      }

      if (pointerStateRef.current.dragged) {
        pointerStateRef.current.dragged = false;
        return;
      }

      const rect = renderer.domElement.getBoundingClientRect();
      const pointer = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -(((event.clientY - rect.top) / rect.height) * 2 - 1),
      );

      raycaster.setFromCamera(pointer, camera);
      const intersections = raycaster.intersectObject(shellMeshRef.current, false);
      const pickedRegion = resolvePickedShellRegion(shellRef.current?.regions, intersections[0] || null);

      if (pickedRegion?.id) {
        onSelectRegionRef.current?.(pickedRegion.id);
      }
    };

    const observer = new ResizeObserver(syncSize);

    observer.observe(host);
    renderer.domElement.addEventListener('click', handleClick);
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);
    renderer.domElement.addEventListener('pointerleave', handlePointerUp);
    renderer.domElement.addEventListener('wheel', handleWheel, { passive: false });

    syncSize();

    return () => {
      observer.disconnect();
      renderer.domElement.removeEventListener('click', handleClick);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('pointerleave', handlePointerUp);
      renderer.domElement.removeEventListener('wheel', handleWheel);
      meshResourcesRef.current.geometry?.dispose?.();
      meshResourcesRef.current.material?.dispose?.();
      markerMeshRef.current?.geometry?.dispose?.();
      markerMeshRef.current?.material?.dispose?.();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    const renderer = rendererRef.current;
    const camera = cameraRef.current;

    if (!scene || !renderer || !camera) {
      return;
    }

    meshResourcesRef.current.geometry?.dispose?.();
    meshResourcesRef.current.material?.dispose?.();

    if (shellMeshRef.current) {
      scene.remove?.(shellMeshRef.current);
      if (!scene.remove) {
        const meshIndex = scene.children.indexOf(shellMeshRef.current);

        if (meshIndex >= 0) {
          scene.children.splice(meshIndex, 1);
        }
      }
    }

    const buffers = buildShellGeometryBuffers(shell);
    cameraStateRef.current = deriveShellCameraState(shell);
    positionCamera(camera, cameraStateRef.current);

    if (!buffers.positions.length || !buffers.indices.length) {
      shellMeshRef.current = null;
      renderer.render(scene, camera);
      return;
    }

    const geometry = new THREE.BufferGeometry();
    const positionArray = buildLiftedPositions(buffers);
    const vertexCount = Math.floor(positionArray.length / 3);
    const impactArray = buffers.vertexImpact.length === vertexCount
      ? buffers.vertexImpact
      : new Float32Array(vertexCount);

    geometry.setIndex(new THREE.BufferAttribute(buffers.indices, 1));
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positionArray, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(buildShellVertexColors(impactArray), 3));

    if (buffers.normals.length === positionArray.length) {
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(buffers.normals, 3));
    }

    geometry.computeBoundingSphere?.();

    const material = new THREE.MeshBasicMaterial({
      opacity: 0.96,
      transparent: true,
      vertexColors: true,
    });
    const shellMesh = new THREE.Mesh(geometry, material);
    const marker = markerMeshRef.current || new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 16, 16),
      new THREE.MeshBasicMaterial({
        color: '#f8fafc',
      }),
    );

    marker.visible = false;

    shellMeshRef.current = shellMesh;
    markerMeshRef.current = marker;
    meshResourcesRef.current = { geometry, material };
    scene.add(shellMesh);
    if (!scene.children.includes(marker)) {
      scene.add(marker);
    }
    renderer.render(scene, camera);
  }, [shell]);

  useEffect(() => {
    const marker = markerMeshRef.current;
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;

    if (!marker || !renderer || !scene || !camera) {
      return;
    }

    const region = shell?.regionById?.[activeRegionId] || shell?.regions?.find((item) => item.id === activeRegionId) || null;

    if (!region?.centroid) {
      marker.visible = false;
      renderer.render(scene, camera);
      return;
    }

    marker.visible = true;
    marker.position.set(
      Number(region.centroid.x || 0),
      Number(region.centroid.y || 0),
      Number(region.centroid.z || 0),
    );
    renderer.render(scene, camera);
  }, [activeRegionId, shell]);

  return (
    <div
      ref={hostRef}
      className="relative h-full min-h-[720px] overflow-hidden rounded-[24px] bg-slate-950"
      data-active-region-id={activeRegionId || ''}
    >
      <div className="pointer-events-none absolute left-4 top-4 rounded-2xl border border-slate-800/80 bg-slate-950/90 px-4 py-3 text-xs leading-5 text-slate-300 shadow-[0_18px_50px_rgba(15,23,42,0.3)]">
        Drag to inspect the shell, wheel to zoom, and click a shell patch to lock regional evidence.
      </div>
      {!shell?.mesh?.positions?.length ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-slate-500">
          Shell geometry is unavailable for this view.
        </div>
      ) : null}
    </div>
  );
}
