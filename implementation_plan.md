# Cinematic Fuel Delivery & Roadside Assistance Experience – Implementation Plan

This document serves as the "blueprint" for transforming the FillUp247 platform into a premium, cinematic, Apple-inspired storytelling experience. This plan focuses on creating landing page 2, extending the existing hero section with an immersive, scroll-driven cinematic journey.

## 1. TECHNOLOGY STACK
* **Framework:** React + Vite (aligning with existing repo structure, but using modern routing/architecture similar to Next.js App Router patterns)
* **Language:** TypeScript
* **Styling:** Tailwind CSS (already configured)
* **Animation & Scroll:** 
  * GSAP + GSAP ScrollTrigger
  * Framer Motion (for UI micro-interactions)
  * Lenis (`@studio-freight/lenis`) for smooth scrolling
* **Optional:** React Three Fiber (`@react-three/fiber`) for subtle 3D depth effects and particle overlays.

## 2. VISUAL & UX DIRECTION
* **Aesthetic:** Minimal futuristic luxury, premium cinematic startup experience, automotive technology inspired visuals. Dark modern interface with elegant motion design.
* **Color Palette:** 
  * Background: Deep black/charcoal (`#050505`)
  * Surfaces: Matte black
  * Gradients: Dark navy
  * Accents: Soft orange highlights, Electric blue, Subtle neon reflections.
* **Typography:** Inter or Geist (existing Sans-serif), wide letter spacing, large premium headings, minimal text density, high contrast white text.
* **Copywriting:** Minimal but impactful. "Reliability, innovation, emergency support, trust, speed, premium roadside technology."

## 3. WEBSITE STRUCTURE & ROUTING
**Overall Flow:**
1. **Section 1 (Existing Hero):** Kept fully intact. Smoothly transitions into the dark cinematic mode.
2. **Section 2 (Fuel Delivery):** Pinned immersive scroll experience. Scroll wheel controls video playback.
3. **Section 3 (Mechanic Assistance):** Secondary immersive sequence following fuel delivery.

**Production-Ready Folder Structure (to add to `src/`):**
```text
src/
├── components/
│   ├── landing2/
│   │   ├── FuelDeliveryScrollSection.tsx
│   │   ├── MechanicScrollSection.tsx
│   │   ├── CinematicGradient.tsx
│   │   ├── AmbientOverlay.tsx
│   │   ├── FloatingGlassCard.tsx
│   │   └── ScrollProgressController.tsx
├── hooks/
│   ├── useVideoPreloader.ts
│   ├── useLenisScroll.ts
│   └── useScrollScrub.ts
├── assets/
│   ├── sequence-1/ (Fuel Delivery Videos)
│   ├── sequence-2/ (Mechanic Assistance Videos)
│   └── cinematic/ (Ambient Overlays)
└── pages/
    └── LandingPage2.tsx
```

## 4. COMPONENT & ANIMATION LOGIC

### Scroll System Architecture
Implement `@studio-freight/lenis` at the root of the new landing page component to hijack the native scroll and provide smooth interpolation.

### `FuelDeliveryScrollSection.tsx`
* **Layout:** A large wrapper (e.g., `h-[500vh]`) to create enough scrolling distance. Inside, a `sticky top-0 h-screen w-full` container holding the video and UI layers.
* **Video Scrubbing Implementation Logic:**
  1. Load cinematic fuel clips sequentially. 
  2. Use `HTMLVideoElement` with `currentTime` manipulated via GSAP ScrollTrigger.
  3. Map the scroll progress (0 to 1) of the wrapper `div` to the video's total duration.
  4. Use `requestAnimationFrame` for hyper-smooth scrubbing, decoupling DOM updates from the scroll event.
* **Fuel Story Flow:**
  - *Scene 1 - 3:* Tension builds, empty fuel realization.
  - *Scene 4 - 5:* Dispatch activation, cinematic truck movement.
  - *Scene 6 - 7:* Fueling process, successful restart.
  - *Scene 8:* Smooth fade transition into the mechanic section.

## 5. SECONDARY MECHANIC ASSISTANCE EXPERIENCE

### `MechanicScrollSection.tsx`
* **Trigger:** Begins immediately parsing the end of the Fuel section (`margin-top` or chained ScrollTriggers).
* **Story Flow:** Vehicle issue → dispatch → repair → recovery.
* **Execution:** Similar scrolling-video mapping structure, but introducing new UI floating cards highlighting specialized repair metrics (time-to-arrive, diagnostics).

## 6. AMBIENT VISUAL LAYERS

* **`AmbientOverlay.tsx`**: A subtle fog or particle layer using CSS noise or React Three Fiber rendering on top of the videos.
* **`FloatingGlassCard.tsx`**: Glassmorphism UI elements (backdrop-blur, semi-transparent white borders) that fade in and out at specific scroll markers (coordinated via Framer Motion `useScroll` or GSAP ScrollTrigger).
* **`CinematicGradient.tsx`**: Top and bottom edge radial gradients to seamlessly blend the video edges into the `#050505` background of the website.

## 7. PERFORMANCE OPTIMIZATION STRATEGY

To prevent video tearing, lag spikes, and excessive re-renders:
1. **Video Encoding:** Ensure all videos in `/public` and `/assets/sequence-*` are optimized (H.264/WebM, fast-start enabled/moov atom moved to front, bitrate capped).
2. **Preloading (`useVideoPreloader`):** Preload the first video sequence in the background as soon as the landing page loads using `fetch` or `<link rel="preload">`.
3. **Hardware Acceleration:** Apply `will-change: transform, opacity` to animated DOM elements.
4. **Canvas Fallback (if needed):** If direct video `currentTime` scrubbing stutters on mobile devices, extract video frames to WebP sequences and draw them on an HTML5 `<canvas>` synced to scroll progress.
5. **Debouncing & Cleanup:** Ensure all ScrollTriggers are properly killed and memory is released during React component unmounts.

## 8. RESPONSIVE CINEMATIC BEHAVIOR
* **Mobile Handling:** Scroll-linked video can be intensive on mobile.
* **Optimization:** Load lower-resolution (720p/portrait cropped) video assets based on `window.innerWidth`.
* **Touch Scrolling:** Fine-tune Lenis configurations for touch devices to ensure the scrubbing doesn't feel overly sensitive or unresponsive.

## 9. CONTENT GENERATION (COPYWRITING)

* **Fuel Section Headline:** "Empowering Your Journey. Never Be Stranded Again."
* **Sub-text (Fading in alongside Scene 4):** "Intelligent dispatch algorithms deploy advanced refueling units directly to your coordinates in minutes."
* **Mechanic Section Headline:** "Precision Recovery. On-Demand Expertise."
* **Sub-text (Along with Repair Scene):** "Elite roadside technicians equipped with the technology to diagnose and repair, wherever the road takes you."

## 10. FINAL EXPERIENCE GOAL
The resulting `LandingPage2` will not act as a standard SaaS template. It will feel like an interactive narrative: users scroll down to literally "drive" the story forward, unveiling how FillUp247's premium technology seamlessly rescues stranded drivers. All transitions from the existing hero into the dark, awe-inspiring video sequence must be completely seamless.
