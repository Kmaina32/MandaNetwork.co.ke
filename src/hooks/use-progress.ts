import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { set, get } from 'idb-keyval'

interface Progress {
  courseId: string
  lessonId: string
  timestamp: number
  completed: boolean
  timeSpent: number
}

export function useProgress(courseId: string, lessonId: string) {
  const { user } = useAuth()
  const [progress, setProgress] = useState<Progress | null>(null)
  const [loading, setLoading] = useState(true)

  // Load progress from IndexedDB
  useEffect(() => {
    async function loadProgress() {
      if (!user) return
      try {
        const key = `progress:${user.uid}:${courseId}:${lessonId}`
        const savedProgress = await get(key)
        if (savedProgress) setProgress(savedProgress)
      } catch (error) {
        console.error('Failed to load progress:', error)
      } finally {
        setLoading(false)
      }
    }
    loadProgress()
  }, [user, courseId, lessonId])

  // Save progress to both IndexedDB and backend
  const updateProgress = async (updates: Partial<Progress>) => {
    if (!user) return

    const updatedProgress = {
      ...progress,
      ...updates,
      timestamp: Date.now(),
    }

    // Save to IndexedDB first (works offline)
    const key = `progress:${user.uid}:${courseId}:${lessonId}`
    await set(key, updatedProgress)
    setProgress(updatedProgress)

    // Try to sync with backend
    try {
      await fetch('/api/progress', {
        method: 'POST',
        body: JSON.stringify(updatedProgress),
      })
    } catch (error) {
      // Queue for retry when online
      const queue = await get('sync-queue') || []
      await set('sync-queue', [...queue, { key, progress: updatedProgress }])
    }
  }

  return { progress, loading, updateProgress }
}