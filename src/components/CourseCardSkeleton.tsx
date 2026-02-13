import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'

export function CourseCardSkeleton() {
  return (
    <Card className="flex flex-col h-full overflow-hidden">
      <CardHeader className="p-0">
        <Skeleton className="w-full h-48" />
      </CardHeader>
      <CardContent className="p-6 flex-grow">
        <Skeleton className="h-5 w-20 mb-2" />
        <Skeleton className="h-6 w-full mb-2" />
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-2/3" />
      </CardContent>
      <CardFooter className="p-6 pt-0 flex justify-between items-center">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-9 w-28" />
      </CardFooter>
    </Card>
  )
}