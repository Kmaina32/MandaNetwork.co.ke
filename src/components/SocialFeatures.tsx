import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase-admin'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Trophy, Star, Award } from 'lucide-react'

interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  points: number
}

interface Props {
  courseId: string
  onAchievement?: (achievement: Achievement) => void
}

export function SocialFeatures({ courseId, onAchievement }: Props) {
  const { user } = useAuth()
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [peers, setPeers] = useState<any[]>([])
  const [points, setPoints] = useState(0)

  useEffect(() => {
    if (!user) return

    // Load achievements
    const achievementsRef = db.ref(`achievements/${user.uid}/${courseId}`)
    achievementsRef.on('value', (snapshot) => {
      if (snapshot.exists()) {
        setAchievements(Object.values(snapshot.val()))
      }
    })

    // Load peers currently taking the course
    const peersRef = db.ref(`course-users/${courseId}`)
    peersRef.on('value', (snapshot) => {
      if (snapshot.exists()) {
        setPeers(Object.values(snapshot.val()))
      }
    })

    // Load points
    const pointsRef = db.ref(`points/${user.uid}/${courseId}`)
    pointsRef.on('value', (snapshot) => {
      if (snapshot.exists()) {
        setPoints(snapshot.val())
      }
    })

    return () => {
      achievementsRef.off()
      peersRef.off()
      pointsRef.off()
    }
  }, [user, courseId])

  const shareProgress = async () => {
    if (!user) return
    // Implement social sharing logic
  }

  return (
    <div className="space-y-6">
      {/* Points and Level */}
      <div className="flex items-center gap-4">
        <Badge variant="secondary" className="text-lg">
          <Trophy className="w-4 h-4 mr-1" />
          {points} Points
        </Badge>
        <Badge variant="outline" className="text-lg">
          Level {Math.floor(points / 100) + 1}
        </Badge>
      </div>

      {/* Achievements */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Achievements</h3>
        <div className="flex gap-2">
          {achievements.map((achievement) => (
            <Badge key={achievement.id} variant="secondary">
              <Award className="w-4 h-4 mr-1" />
              {achievement.title}
            </Badge>
          ))}
        </div>
      </div>

      {/* Peer Learning */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Learning with You</h3>
        <div className="flex gap-2">
          {peers.slice(0, 5).map((peer) => (
            <Avatar key={peer.uid}>
              <AvatarImage src={peer.photoURL} />
              <AvatarFallback>{peer.displayName?.[0]}</AvatarFallback>
            </Avatar>
          ))}
          {peers.length > 5 && (
            <Badge variant="outline">+{peers.length - 5} more</Badge>
          )}
        </div>
      </div>

      {/* Social Sharing */}
      <Button onClick={shareProgress} variant="outline">
        Share Progress
      </Button>
    </div>
  )
}