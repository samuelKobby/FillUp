import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import circlesUrl from '../assets/models/circles.gltf?url'

type Props = {
  className?: string
}

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v))
}

export function CirclesModelCanvas({ className }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })

    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2

    const scene = new THREE.Scene()

    const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 200)
    camera.position.set(0, 0, 5)

    const ambient = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambient)
    
    // Main rim light (White/Cool)
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 2.5)
    dirLight1.position.set(5, 5, 5)
    scene.add(dirLight1)

    // Brand color light (Orange)
    const dirLight2 = new THREE.DirectionalLight(0xf97316, 4)
    dirLight2.position.set(-5, 2, 5)
    scene.add(dirLight2)

    // Accent light (Red)
    const dirLight3 = new THREE.DirectionalLight(0xef4444, 3)
    dirLight3.position.set(0, -5, 2)
    scene.add(dirLight3)

    // Specular point light for glossiness
    const pointLight = new THREE.PointLight(0xffffff, 2, 20)
    pointLight.position.set(0, 2, 4)
    scene.add(pointLight)

    let model: THREE.Object3D | null = null
    let mixer: THREE.AnimationMixer | null = null
    let animationDuration = 0
    let raf = 0

    const loader = new GLTFLoader()
    loader.load(
      circlesUrl,
      (gltf) => {
        model = gltf.scene
        scene.add(model)

        // Prevent animated parts from disappearing due to culling bounds.
        model.traverse((obj) => {
          const mesh = obj as THREE.Mesh
          if (!mesh.isMesh) return
          mesh.frustumCulled = false
          
          // Apply premium glossy brand material
          mesh.material = new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(0xf6850a), // Matched to brand orange
            emissive: new THREE.Color(0x2a0a00), // Slight warm glow
            metalness: 0.9,
            roughness: 0.1,
            clearcoat: 1.0,
            clearcoatRoughness: 0.05,
          })
        })

        // Setup animation mixer if model has animations
        // eslint-disable-next-line no-console
        console.log('GLTF loaded. Animations count:', gltf.animations?.length || 0)
        if (gltf.animations && gltf.animations.length > 0) {
          // eslint-disable-next-line no-console
          console.log(
            'Found animations:',
            gltf.animations.map((c) => ({ name: c.name, duration: c.duration })),
          )

          mixer = new THREE.AnimationMixer(model)
          const clip = gltf.animations[0]
          animationDuration = clip.duration
          // eslint-disable-next-line no-console
          console.log('Playing clip:', clip.name, 'Duration:', animationDuration)

          const action = mixer.clipAction(clip)
          action.clampWhenFinished = true
          action.play()

          // Ensure initial pose is applied
          mixer.time = 0
          mixer.update(0)
        } else {
          // eslint-disable-next-line no-console
          console.warn('No animations found in circles.gltf')
        }

        // Center/scale using bounds across the animation range (so it doesn't get clipped when opening).
        const union = new THREE.Box3()
        const tmp = new THREE.Box3()
        const times = mixer && animationDuration > 0 ? [0, animationDuration * 0.5, animationDuration] : [0]

        times.forEach((t, i) => {
          if (mixer) mixer.setTime(t)
          tmp.setFromObject(model)
          if (i === 0) union.copy(tmp)
          else union.union(tmp)
        })

        const size = union.getSize(new THREE.Vector3())
        const center = union.getCenter(new THREE.Vector3())

        model.position.sub(center)

        const maxDim = Math.max(size.x, size.y, size.z) || 1
        const target = 2.2 // tuned for this section size
        const s = target / maxDim
        model.scale.setScalar(s)

        // Reset to start pose after fitting
        if (mixer) mixer.setTime(0)
      },
      undefined,
      (err) => {
        // eslint-disable-next-line no-console
        console.error('Failed to load circles.gltf', err)
      },
    )

    const resize = () => {
      const rect = container.getBoundingClientRect()
      const width = Math.max(1, Math.floor(rect.width))
      const height = Math.max(1, Math.floor(rect.height))

      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }

    const getScrollProgress = () => {
      const rect = container.getBoundingClientRect()
      const vh = window.innerHeight || 1
      const total = vh + rect.height
      return clamp01((vh - rect.top) / total)
    }

    resize()

    const onResize = () => resize()
    window.addEventListener('resize', onResize)

    const tick = () => {
      const p = getScrollProgress()

      // Scrub the model's embedded animation with scroll position
      if (mixer && animationDuration > 0) {
        mixer.setTime(p * animationDuration)
      }

      renderer.render(scene, camera)
      raf = window.requestAnimationFrame(tick)
    }

    raf = window.requestAnimationFrame(tick)

    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)

      if (model) {
        model.traverse((obj) => {
          const mesh = obj as THREE.Mesh
          if (!mesh.isMesh) return

          mesh.geometry?.dispose?.()
          const material = mesh.material as THREE.Material | THREE.Material[]
          if (Array.isArray(material)) {
            material.forEach((m) => m.dispose())
          } else {
            material?.dispose?.()
          }
        })
      }

      renderer.dispose()
    }
  }, [])

  return (
    <div ref={containerRef} className={className}>
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  )
}
