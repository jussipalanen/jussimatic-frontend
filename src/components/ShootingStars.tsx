// Detect touch-only devices once at module load — avoids creating unnecessary DOM nodes.
const isTouchDevice = window.matchMedia('(hover: none) and (pointer: coarse)').matches

export default function ShootingStars() {
  if (isTouchDevice) return null

  return (
    <div className="shooting-stars-layer" aria-hidden="true">
      <span className="shooting-star shooting-star--1" />
      <span className="shooting-star shooting-star--2" />
      <span className="shooting-star shooting-star--3" />
      <span className="shooting-star shooting-star--4" />
      <span className="shooting-star shooting-star--5" />
      <span className="starlight-flare starlight-flare--1" />
      <span className="starlight-flare starlight-flare--2" />
      <span className="starlight-flare starlight-flare--3" />
    </div>
  )
}
