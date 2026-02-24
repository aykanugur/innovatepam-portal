'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const VIDEOS = ['/auth-video.mp4', '/auth-video-2.mp4'] as const
const PLAYBACK_RATE = 0.3
const FADE_MS = 1800 // crossfade duration in ms

/**
 * Crossfades between two background videos at 30% playback speed.
 * Both <video> elements are always in the DOM, stacked on top of each other.
 * A CSS opacity transition handles the smooth dissolve when one ends.
 */
export function AuthBackgroundVideo() {
  // Index of the currently visible / playing video
  const [activeIndex, setActiveIndex] = useState(0)

  const ref0 = useRef<HTMLVideoElement>(null)
  const ref1 = useRef<HTMLVideoElement>(null)

  // Set playback rate whenever a video becomes ready
  const handleCanPlay = useCallback((i: number) => {
    const vid = i === 0 ? ref0.current : ref1.current
    if (vid) vid.playbackRate = PLAYBACK_RATE
  }, [])

  // Preload video 2 on mount (paused at frame 0)
  useEffect(() => {
    const vid1 = ref1.current
    if (vid1) {
      vid1.load()
      vid1.playbackRate = PLAYBACK_RATE
    }
  }, [])

  // When the active video ends, crossfade to the other one
  const handleEnded = useCallback((endedIndex: number) => {
    const nextIndex = (endedIndex + 1) % VIDEOS.length
    const nextVid = nextIndex === 0 ? ref0.current : ref1.current
    const prevVid = endedIndex === 0 ? ref0.current : ref1.current

    // Start playing the next video before the opacity swaps
    if (nextVid) {
      nextVid.currentTime = 0
      nextVid.playbackRate = PLAYBACK_RATE
      nextVid.play()
    }

    // Swap active — CSS transition takes care of the dissolve
    setActiveIndex(nextIndex)

    // After the fade completes, pause + reset the video that just finished
    setTimeout(() => {
      if (prevVid) {
        prevVid.pause()
        prevVid.currentTime = 0
      }
    }, FADE_MS)
  }, [])

  const baseStyle: React.CSSProperties = {
    filter: 'saturate(1.3) brightness(0.7)',
    transition: `opacity ${FADE_MS}ms ease-in-out`,
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  }

  return (
    <>
      {VIDEOS.map((src, i) => (
        <video
          key={src}
          ref={i === 0 ? ref0 : ref1}
          autoPlay={i === 0}
          muted
          playsInline
          onCanPlay={() => handleCanPlay(i)}
          onEnded={() => handleEnded(i)}
          style={{ ...baseStyle, opacity: i === activeIndex ? 0.5 : 0 }}
          aria-hidden
        >
          <source src={src} type="video/mp4" />
        </video>
      ))}
    </>
  )
}
