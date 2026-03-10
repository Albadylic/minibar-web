// MBW-12: Compute CSS scale factor to letterbox the 375×667 canvas in any viewport
import { useState, useEffect } from 'react'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../config/barLayout'

function computeScale(): number {
  return Math.min(window.innerWidth / CANVAS_WIDTH, window.innerHeight / CANVAS_HEIGHT)
}

export function useViewportScale(): number {
  const [scale, setScale] = useState(computeScale)

  useEffect(() => {
    function handleResize() {
      setScale(computeScale())
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return scale
}
