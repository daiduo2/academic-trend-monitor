import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  buildTopicStructureGeometryBuffers,
  deriveTopicStructureCameraState,
  resolvePickedTopicFromFragmentPick,
} from '../../utils/openAlexFullPaperTopicStructureScene';

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

function positionCamera(camera, state) {
  const horizontalRadius = state.radius * Math.cos(state.elevation);
  const x = state.target.x + (horizontalRadius * Math.sin(state.azimuth));
  const y = state.target.y + (state.radius * Math.sin(state.elevation));
  const z = state.target.z + (horizontalRadius * Math.cos(state.azimuth));

  camera.position.set(x, y, z);
  camera.lookAt(state.target.x, state.target.y, state.target.z);
  camera.updateProjectionMatrix();
}

function getIntersection(raycaster, meshes) {
  if (typeof raycaster?.intersectObjects === 'function') {
    return raycaster.intersectObjects(meshes, false)[0] || null;
  }

  for (const mesh of meshes) {
    const match = raycaster?.intersectObject?.(mesh, false)?.[0];

    if (match) {
      return match;
    }
  }

  return null;
}

function resolveMaterialOpacity(fragmentOpacity, isActive) {
  if (isActive) {
    return clamp(fragmentOpacity + 0.12, 0.28, 0.54);
  }

  return clamp(fragmentOpacity, 0.28, 0.42);
}

function applyFragmentHighlight(meshes, activeTopicId) {
  meshes.forEach((mesh) => {
    const nextOpacity = resolveMaterialOpacity(
      Number(mesh?.userData?.baseOpacity || 0.28),
      activeTopicId === mesh?.userData?.topicId,
    );

    if (mesh?.material) {
      mesh.material.opacity = nextOpacity;
      if (mesh.material.config) {
        mesh.material.config.opacity = nextOpacity;
      }
    }
  });
}

export default function OpenAlexFullPaperTopicStructureViewport({
  activeTopicId = null,
  onHoverTopic,
  onSelectTopic,
  structure = null,
}) {
  const hostRef = useRef(null);
  const onHoverTopicRef = useRef(onHoverTopic);
  const onSelectTopicRef = useRef(onSelectTopic);
  const structureRef = useRef(structure);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const sceneRef = useRef(null);
  const raycasterRef = useRef(null);
  const fragmentMeshesRef = useRef([]);
  const meshResourcesRef = useRef([]);
  const lastHoverTopicIdRef = useRef(undefined);
  const cameraStateRef = useRef({
    ...deriveTopicStructureCameraState(structure),
  });
  const pointerStateRef = useRef({
    active: false,
    downX: 0,
    downY: 0,
    dragged: false,
    lastX: 0,
    lastY: 0,
    suppressClick: false,
  });

  onHoverTopicRef.current = onHoverTopic;
  onSelectTopicRef.current = onSelectTopic;
  structureRef.current = structure;

  const emitHoverTopic = (topic) => {
    const nextTopicId = topic?.topicId || null;

    if (lastHoverTopicIdRef.current === nextTopicId) {
      return;
    }

    lastHoverTopicIdRef.current = nextTopicId;
    onHoverTopicRef.current?.(topic);
  };

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

    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
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

    const readPointerIntersection = (event) => {
      if (!fragmentMeshesRef.current.length) {
        return null;
      }

      const rect = renderer.domElement.getBoundingClientRect();
      const pointer = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -(((event.clientY - rect.top) / rect.height) * 2 - 1),
      );

      raycaster.setFromCamera(pointer, camera);
      return getIntersection(raycaster, fragmentMeshesRef.current);
    };

    const handlePointerDown = (event) => {
      pointerStateRef.current.active = true;
      pointerStateRef.current.downX = event.clientX;
      pointerStateRef.current.downY = event.clientY;
      pointerStateRef.current.dragged = false;
      pointerStateRef.current.lastX = event.clientX;
      pointerStateRef.current.lastY = event.clientY;
      pointerStateRef.current.suppressClick = false;
      renderer.domElement.setPointerCapture?.(event.pointerId);
    };

    const resetPointerState = (event, options = {}) => {
      pointerStateRef.current.active = false;
      pointerStateRef.current.dragged = false;
      if (options.clearSuppressClick) {
        pointerStateRef.current.suppressClick = false;
      }
      renderer.domElement.releasePointerCapture?.(event.pointerId);
    };

    const handlePointerMove = (event) => {
      if (!pointerStateRef.current.active) {
        const intersection = readPointerIntersection(event);
        const topic = resolvePickedTopicFromFragmentPick(structureRef.current, intersection);

        emitHoverTopic(topic);
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
        pointerStateRef.current.suppressClick = true;
      }

      if (!pointerStateRef.current.dragged) {
        return;
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
      resetPointerState(event);
    };

    const handlePointerLeave = (event) => {
      resetPointerState(event, { clearSuppressClick: true });
      emitHoverTopic(null);
    };

    const handlePointerCancel = (event) => {
      resetPointerState(event, { clearSuppressClick: true });
      emitHoverTopic(null);
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
      if (pointerStateRef.current.suppressClick) {
        pointerStateRef.current.suppressClick = false;
        return;
      }

      const intersection = readPointerIntersection(event);
      const topic = resolvePickedTopicFromFragmentPick(structureRef.current, intersection);

      if (topic?.topicId) {
        onSelectTopicRef.current?.(topic.topicId);
      }
    };

    const observer = new ResizeObserver(syncSize);

    observer.observe(host);
    renderer.domElement.addEventListener('click', handleClick);
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);
    renderer.domElement.addEventListener('pointerleave', handlePointerLeave);
    renderer.domElement.addEventListener('pointercancel', handlePointerCancel);
    renderer.domElement.addEventListener('wheel', handleWheel, { passive: false });

    syncSize();

    return () => {
      observer.disconnect();
      renderer.domElement.removeEventListener('click', handleClick);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('pointerleave', handlePointerLeave);
      renderer.domElement.removeEventListener('pointercancel', handlePointerCancel);
      renderer.domElement.removeEventListener('wheel', handleWheel);
      meshResourcesRef.current.forEach(({ geometry, material }) => {
        geometry?.dispose?.();
        material?.dispose?.();
      });
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

    fragmentMeshesRef.current.forEach((mesh) => {
      scene.remove(mesh);
    });
    meshResourcesRef.current.forEach(({ geometry, material }) => {
      geometry?.dispose?.();
      material?.dispose?.();
    });

    const geometryBuffers = buildTopicStructureGeometryBuffers(structure);
    cameraStateRef.current = deriveTopicStructureCameraState(structure);
    emitHoverTopic(null);

    const nextResources = [];
    const nextMeshes = [];

    geometryBuffers.fragments.forEach((fragment) => {
      if (!fragment.positions.length || !fragment.indices.length) {
        return;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(fragment.positions, 3));
      geometry.setIndex(new THREE.BufferAttribute(fragment.indices, 1));
      geometry.computeBoundingSphere?.();

      const material = new THREE.MeshBasicMaterial({
        color: fragment.colorHex,
        depthWrite: false,
        opacity: resolveMaterialOpacity(fragment.opacity, activeTopicId === fragment.topicId),
        transparent: true,
      });
      const mesh = new THREE.Mesh(geometry, material);

      mesh.userData.baseOpacity = fragment.opacity;
      mesh.userData.fragmentId = fragment.fragmentId;
      mesh.userData.topicId = fragment.topicId;

      scene.add(mesh);
      nextMeshes.push(mesh);
      nextResources.push({ geometry, material });
    });

    fragmentMeshesRef.current = nextMeshes;
    meshResourcesRef.current = nextResources;

    positionCamera(camera, cameraStateRef.current);
    renderer.render(scene, camera);
  }, [structure]);

  useEffect(() => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;

    if (!renderer || !scene || !camera) {
      return;
    }

    applyFragmentHighlight(fragmentMeshesRef.current, activeTopicId);
    renderer.render(scene, camera);
  }, [activeTopicId]);

  return (
    <div
      ref={hostRef}
      className="h-full min-h-[720px] w-full overflow-hidden rounded-[28px] border border-slate-800 bg-[radial-gradient(circle_at_top,_rgba(30,41,59,0.95),_rgba(2,6,23,1))]"
      data-testid="topic-structure-viewport"
    />
  );
}
