'use client'

import { useCallback, useRef, useState } from 'react'

const VIDEOS = ['/auth-video.mp4', '/auth-video-2.mp4']
const PLAYBACK_RATE = 0.3

/**
 * Alternates between two background videos at 30% playback speed.
 * Video 1 plays → ends → Video 2 plays → ends → Video 1 … (infinite)
 */
export function AuthBackgroundVideo() {
  const [index, setIndex] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Called every time the <video> element is ready to play
  const applySpeed = useCallback(() => {
    const vid = videoRef.current
    if (!vid) return
    vid.playbackRate = PLAYBACK_RATE
  }, [])

  // When current video ends, swap to the other one
  const handleEnded = useCallback(() => {
    setIndex((prev) => (prev + 1) % VIDEOS.length)
  }, [])

  return (
    <video
      ref={videoRef}
      key={index} // remounts the element so the new src loads automatically
      autoPlay
      muted
      playsInline
      onCanPlay={applySpeed}
      onEnded={handleEnded}
      className="absolute inset-0 w-full h-full object-cover"
      style={{ opacity: 0.5, filter: 'saturate(1.3) brightness(0.7)' }}
      aria-hidden
    >
      <source src={VIDEOS[index]} type="video/mp4" />
    </video>
  )
}
