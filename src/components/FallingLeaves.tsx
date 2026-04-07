// Detect touch-only devices once at module load — avoids creating unnecessary DOM nodes.
const isTouchDevice = window.matchMedia('(hover: none) and (pointer: coarse)').matches

export default function FallingLeaves() {
  if (isTouchDevice) return null

  return (
    <div className="falling-leaves-layer" aria-hidden="true">
      <span className="leaf leaf--1" />
      <span className="leaf leaf--2" />
      <span className="leaf leaf--3" />
      <span className="leaf leaf--4" />
      <span className="leaf leaf--5" />
      <span className="leaf leaf--6" />
      <span className="leaf leaf--7" />
      <span className="leaf leaf--8" />
    </div>
  )
}
