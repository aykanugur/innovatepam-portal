'use client'

import { useEffect, useRef } from 'react'

/**
 * Slow-looping muted background video for the auth split-panel.
 * playbackRate is set via JS — can't be done with HTML attributes alone.
 */
export function AuthBackgroundVideo() {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const vid = videoRef.current
    if (!vid) return
    // Slow the video to 40% speed for a calm ambient effect
    vid.playbackRate = 0.4
  }, [])

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      loop
      playsInline
      className="absolute inset-0 w-full h-full object-cover"
      style={{ opacity: 0.5, filter: 'saturate(1.3) brightness(0.7)' }}
      aria-hidden
    >
      <source src="/auth-video.mp4" type="video/mp4" />
    </video>
  )
}
