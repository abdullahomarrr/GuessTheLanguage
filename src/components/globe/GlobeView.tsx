'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { feature } from 'topojson-client';
import type { FeatureCollection, MultiPolygon, Polygon, Position } from 'geojson';
import type { GeometryCollection, Topology } from 'topojson-specification';
import worldCountries from 'world-atlas/countries-110m.json';
import countries from 'world-countries';
import { GuessResult, GeoAnchor } from '@/types';

const COUNTRY_NUMERIC_CODES = Object.fromEntries(
  countries
    .filter((country) => country.cca2 && country.ccn3)
    .map((country) => [country.cca2.toUpperCase(), country.ccn3.padStart(3, '0')])
);

const countryTopology = worldCountries as unknown as Topology<{
  countries: GeometryCollection;
}>;
const countryFeatures = feature(
  countryTopology,
  countryTopology.objects.countries
) as unknown as FeatureCollection<Polygon | MultiPolygon>;

const disposeObject = (object: THREE.Object3D) => {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh || child instanceof THREE.Line)) return;
    child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if (material instanceof THREE.MeshBasicMaterial) {
        material.map?.dispose();
      }
      material.dispose();
    });
  });
};

interface GlobeViewProps {
  guesses: GuessResult[];
  targetAnchor?: GeoAnchor | null;
  isGameComplete: boolean;
  isGameWon?: boolean;
}

export const GlobeView: React.FC<GlobeViewProps> = ({
  guesses,
  targetAnchor,
  isGameComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [webGlSupported, setWebGlSupported] = useState<boolean>(true);
  const latestGuess = guesses.at(-1);
  const activeLocationLabel = isGameComplete && targetAnchor
    ? `Today’s country: ${targetAnchor.countryName || targetAnchor.regionName || targetAnchor.continent}`
    : latestGuess
      ? `${latestGuess.guessedCountryName || latestGuess.geoAnchor.countryName || latestGuess.guessedLanguageName} · ${latestGuess.geoAnchor.regionName || latestGuess.geoAnchor.continent}`
      : null;

  // References to three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const globeGroupRef = useRef<THREE.Group | null>(null);
  const markersGroupRef = useRef<THREE.Group | null>(null);

  // Target rotation for smooth slerp/damping
  const targetRotationRef = useRef<{ x: number; y: number }>({ x: 0.3, y: 0 });
  const isDraggingRef = useRef<boolean>(false);
  const previousMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const autoRotateRef = useRef<boolean>(true);

  // Convert lat/long to 3D Cartesian coordinates on sphere
  const latLonToVector3 = useCallback((lat: number, lon: number, radius: number = 2.0): THREE.Vector3 => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    const x = -radius * Math.sin(phi) * Math.cos(theta);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);

    return new THREE.Vector3(x, y, z);
  }, []);

  const createCountryHighlight = useCallback((
    countryCode: string,
    color: number,
    opacity: number,
    polygonId?: string
  ): THREE.Group | null => {
    const numericCode = polygonId || COUNTRY_NUMERIC_CODES[countryCode.toUpperCase()];
    const country = countryFeatures.features.find(
      (item) => String(item.id).padStart(3, '0') === numericCode
    );
    if (!country) return null;

    // Rasterize the real Natural Earth polygon onto a transparent
    // equirectangular texture. Applying that texture to a sphere keeps the
    // entire country fill on the globe's surface instead of stretching flat
    // triangulated faces through the globe.
    const textureWidth = 2048;
    const textureHeight = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = textureWidth;
    canvas.height = textureHeight;
    const context = canvas.getContext('2d');
    if (!context) return null;

    const countryGroup = new THREE.Group();
    const polygons = country.geometry.type === 'Polygon'
      ? [country.geometry.coordinates]
      : country.geometry.coordinates;

    const drawPolygon = (polygon: Position[][], xOffset: number) => {
      context.beginPath();
      polygon.forEach((ring) => {
        if (ring.length < 3) return;
        let previousLongitude = ring[0][0];
        ring.forEach(([rawLongitude, latitude], index) => {
          let longitude = rawLongitude;
          while (longitude - previousLongitude > 180) longitude -= 360;
          while (longitude - previousLongitude < -180) longitude += 360;
          previousLongitude = longitude;
          const x = ((longitude + 180) / 360) * textureWidth + xOffset;
          const y = ((90 - latitude) / 180) * textureHeight;
          if (index === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        });
        context.closePath();
      });
      context.fill('evenodd');
      context.stroke();
    };

    const highlightColor = new THREE.Color(color);
    const red = Math.round(highlightColor.r * 255);
    const green = Math.round(highlightColor.g * 255);
    const blue = Math.round(highlightColor.b * 255);
    context.fillStyle = `rgba(${red}, ${green}, ${blue}, ${opacity})`;
    context.strokeStyle = `rgba(${red}, ${green}, ${blue}, ${Math.min(1, opacity + 0.2)})`;
    context.lineWidth = 2;
    context.lineJoin = 'round';

    polygons.forEach((polygon) => {
      // Duplicate at either side so countries crossing ±180° wrap cleanly.
      drawPolygon(polygon, -textureWidth);
      drawPolygon(polygon, 0);
      drawPolygon(polygon, textureWidth);
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;

    const fillGeometry = new THREE.SphereGeometry(2.013, 96, 64);
    const fillMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.01,
      depthWrite: false,
    });
    const fillMesh = new THREE.Mesh(fillGeometry, fillMaterial);
    fillMesh.renderOrder = 3;
    countryGroup.add(fillMesh);

    return countryGroup;
  }, []);

  // Set rotation to face specific lat/lon
  const rotateToLatLon = useCallback((lat: number, lon: number) => {
    autoRotateRef.current = false;
    // Calculate rotation angles so (lat, lon) faces the camera (0, 0, Z)
    const targetY = (lon * Math.PI) / 180 - Math.PI / 2;
    const targetX = (lat * Math.PI) / 180;

    targetRotationRef.current = {
      x: Math.max(-1.2, Math.min(1.2, targetX)),
      y: targetY,
    };
  }, []);

  // Initialize Three.js scene
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    try {
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      const scene = new THREE.Scene();
      sceneRef.current = scene;

      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      camera.position.z = 5.2;
      cameraRef.current = camera;

      const renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      rendererRef.current = renderer;

      // Master globe group
      const globeGroup = new THREE.Group();
      scene.add(globeGroup);
      globeGroupRef.current = globeGroup;

      // Base Earth Sphere
      const globeRadius = 2.0;
      const sphereGeo = new THREE.SphereGeometry(globeRadius, 64, 64);

      // Check for dark mode to style globe
      const isDark = document.documentElement.classList.contains('dark') ||
        window.matchMedia('(prefers-color-scheme: dark)').matches;

      const sphereMat = new THREE.MeshBasicMaterial({
        color: isDark ? 0x11161d : 0xf1f5f9,
        transparent: true,
        opacity: 0.95,
      });
      const earthSphere = new THREE.Mesh(sphereGeo, sphereMat);
      globeGroup.add(earthSphere);

      // Subtle atmospheric glow shell
      const glowGeo = new THREE.SphereGeometry(globeRadius * 1.015, 48, 48);
      const glowMat = new THREE.MeshBasicMaterial({
        color: isDark ? 0x10b981 : 0x059669,
        wireframe: true,
        transparent: true,
        opacity: isDark ? 0.04 : 0.03,
      });
      const glowMesh = new THREE.Mesh(glowGeo, glowMat);
      globeGroup.add(glowMesh);

      // Add the complete Natural Earth 110m country geometry. Subdivide long
      // segments before projecting them so borders follow the sphere instead
      // of cutting through it as straight chords.
      const linePositions: number[] = [];
      const addRing = (ring: Position[]) => {
        for (let index = 0; index < ring.length - 1; index++) {
          const [startRawLongitude, startLatitude] = ring[index];
          const [endRawLongitude, endLatitude] = ring[index + 1];
          let endLongitude = endRawLongitude;
          while (endLongitude - startRawLongitude > 180) endLongitude -= 360;
          while (endLongitude - startRawLongitude < -180) endLongitude += 360;

          const longitudeSpan = endLongitude - startRawLongitude;
          const latitudeSpan = endLatitude - startLatitude;
          const subdivisions = Math.max(
            1,
            Math.ceil(Math.max(Math.abs(longitudeSpan), Math.abs(latitudeSpan)) / 2)
          );

          for (let step = 0; step < subdivisions; step++) {
            const startT = step / subdivisions;
            const endT = (step + 1) / subdivisions;
            const pointA = latLonToVector3(
              startLatitude + latitudeSpan * startT,
              startRawLongitude + longitudeSpan * startT,
              globeRadius * 1.004
            );
            const pointB = latLonToVector3(
              startLatitude + latitudeSpan * endT,
              startRawLongitude + longitudeSpan * endT,
              globeRadius * 1.004
            );
            linePositions.push(pointA.x, pointA.y, pointA.z, pointB.x, pointB.y, pointB.z);
          }
        }
      };

      countryFeatures.features.forEach((country) => {
        const polygons = country.geometry.type === 'Polygon'
          ? [country.geometry.coordinates]
          : country.geometry.coordinates;
        polygons.forEach((polygon) => polygon.forEach(addRing));
      });

      const linesGeo = new THREE.BufferGeometry();
      linesGeo.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(linePositions, 3)
      );

      const linesMat = new THREE.LineBasicMaterial({
        color: isDark ? 0x475569 : 0x94a3b8,
        transparent: true,
        opacity: isDark ? 0.55 : 0.65,
        linewidth: 1,
      });

      const bordersMesh = new THREE.LineSegments(linesGeo, linesMat);
      globeGroup.add(bordersMesh);

      // Markers group
      const markersGroup = new THREE.Group();
      globeGroup.add(markersGroup);
      markersGroupRef.current = markersGroup;

      // Animation Loop
      let animId: number;
      const clock = new THREE.Clock();

      const animate = () => {
        animId = requestAnimationFrame(animate);

        if (globeGroupRef.current) {
          // Auto rotate slightly if user is idle
          if (autoRotateRef.current && !isDraggingRef.current) {
            targetRotationRef.current.y += 0.002;
          }

          // Smooth slerp/damping towards target rotation
          globeGroupRef.current.rotation.y +=
            (targetRotationRef.current.y - globeGroupRef.current.rotation.y) * 0.08;
          globeGroupRef.current.rotation.x +=
            (targetRotationRef.current.x - globeGroupRef.current.rotation.x) * 0.08;
        }

        // Animate marker pulses
        if (markersGroupRef.current) {
          const time = clock.getElapsedTime();
          markersGroupRef.current.children.forEach((child, i) => {
            if (child instanceof THREE.Mesh && child.name === 'pulse') {
              const scale = 1.0 + Math.sin(time * 4 + i) * 0.25;
              child.scale.set(scale, scale, scale);
            }
          });
        }

        renderer.render(scene, camera);
      };

      animate();

      // Handle window resize
      const handleResize = () => {
        if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
        const newWidth = containerRef.current.clientWidth;
        const newHeight = containerRef.current.clientHeight;
        cameraRef.current.aspect = newWidth / newHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(newWidth, newHeight);
      };

      window.addEventListener('resize', handleResize);

      return () => {
        cancelAnimationFrame(animId);
        window.removeEventListener('resize', handleResize);
        renderer.dispose();
      };
    } catch (e) {
      console.error('WebGL initialization error:', e);
      setTimeout(() => setWebGlSupported(false), 0);
    }
  }, [latLonToVector3]);

  // Update markers when guesses change
  useEffect(() => {
    if (!markersGroupRef.current) return;

    // Clear old markers
    while (markersGroupRef.current.children.length > 0) {
      const obj = markersGroupRef.current.children[0];
      markersGroupRef.current.remove(obj);
      disposeObject(obj);
    }

    // Add marker for each guess
    guesses.forEach((guess, idx) => {
      const { latitude, longitude } = guess.geoAnchor;
      const pos = latLonToVector3(latitude, longitude, 2.015);

      // Color mapping based on feedback
      let markerColor = 0x64748b; // neutral slate
      if (guess.isCorrect) {
        markerColor = 0x10b981; // Emerald / correct
      } else if (guess.continentMatch) {
        markerColor = 0xf59e0b; // Amber / correct continent
      }

      const countryHighlight = guess.geoAnchor.countryCode
        ? createCountryHighlight(
            guess.geoAnchor.countryCode,
            markerColor,
            idx === guesses.length - 1 ? 0.72 : 0.42,
            guess.geoAnchor.polygonId
          )
        : null;

      if (countryHighlight) {
        markersGroupRef.current?.add(countryHighlight);
      } else {
        // A point is retained only for regional languages without country geometry.
        const pinGeo = new THREE.SphereGeometry(0.04, 16, 16);
        const pinMat = new THREE.MeshBasicMaterial({ color: markerColor });
        const pinMesh = new THREE.Mesh(pinGeo, pinMat);
        pinMesh.position.copy(pos);
        markersGroupRef.current?.add(pinMesh);
      }

      // Pulsing outer halo for latest guess
      if (idx === guesses.length - 1) {
        const haloGeo = new THREE.RingGeometry(0.05, 0.08, 24);
        const haloMat = new THREE.MeshBasicMaterial({
          color: markerColor,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8,
        });
        const haloMesh = new THREE.Mesh(haloGeo, haloMat);
        haloMesh.name = 'pulse';
        haloMesh.position.copy(pos);
        haloMesh.lookAt(0, 0, 0); // Orient flat on sphere surface
        markersGroupRef.current?.add(haloMesh);

        // Rotate globe towards this guess
        rotateToLatLon(latitude, longitude);
      }
    });

    // If game complete (win or reveal), animate target homeland
    if (isGameComplete && targetAnchor) {
      const targetCountry = targetAnchor.countryCode
        ? createCountryHighlight(
            targetAnchor.countryCode,
            0x10b981,
            0.82,
            targetAnchor.polygonId
          )
        : null;

      if (targetCountry) {
        markersGroupRef.current.add(targetCountry);
      }

      // Rotate camera to target homeland
      rotateToLatLon(targetAnchor.latitude, targetAnchor.longitude);
    }
  }, [guesses, targetAnchor, isGameComplete, latLonToVector3, rotateToLatLon, createCountryHighlight]);

  // Touch and Mouse Drag interactions
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    autoRotateRef.current = false;
    previousMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - previousMousePosRef.current.x;
    const deltaY = e.clientY - previousMousePosRef.current.y;

    targetRotationRef.current.y += deltaX * 0.008;
    targetRotationRef.current.x = Math.max(
      -1.2,
      Math.min(1.2, targetRotationRef.current.x + deltaY * 0.008)
    );

    previousMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  return (
    <div
      ref={containerRef}
      className="relative mx-auto my-1 flex h-52 w-full max-w-lg touch-pan-y select-none items-center justify-center sm:h-72 sm:touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Ambient background glow for globe */}
      <div className="absolute w-52 h-52 sm:w-60 sm:h-60 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 blur-2xl pointer-events-none" />

      <canvas ref={canvasRef} className="w-full h-full cursor-grab active:cursor-grabbing block relative z-10" />

      {/* Subtle indicator caption overlay */}
      <div className="absolute bottom-0 inset-x-0 flex justify-center pointer-events-none px-3 z-20">
        <div className="text-[11px] text-neutral-400 dark:text-neutral-500 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md px-3 py-1 rounded-full border border-neutral-200/40 dark:border-neutral-800/40 text-center truncate max-w-xs shadow-xs">
          {activeLocationLabel || 'Drag globe to explore'}
        </div>
      </div>

      {/* Fallback notice if WebGL is unavailable */}
      {!webGlSupported && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-100 dark:bg-neutral-900 p-4 text-center rounded-2xl">
          <p className="text-xs text-neutral-500">
            3D Globe rendering requires WebGL. Geographic deductions will still be provided in text below!
          </p>
        </div>
      )}
    </div>
  );
};
