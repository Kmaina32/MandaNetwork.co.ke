
'use client';

import Link from 'next/link';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { ArrowRight, BookOpen, Rocket, Trophy } from 'lucide-react';
import { Badge } from './ui/badge';
import type { Course, Bootcamp, Hackathon } from '@/lib/types';
import { slugify } from '@/lib/utils';
import { format } from 'date-fns';

function isCourse(item: any): item is Course {
  return 'instructor' in item;
}

function isBootcamp(item: any): item is Bootcamp {
  return 'startDate' in item && 'duration' in item;
}

function isHackathon(item: any): item is Hackathon {
  return 'prizeMoney' in item;
}

export function InContentAdCard({ item }: { item: Course | Bootcamp | Hackathon }) {
  let type: 'Course' | 'Bootcamp' | 'Hackathon' = 'Course';
  let Icon = BookOpen;
  let link = '/';

  if (isCourse(item)) {
    type = 'Course';
    Icon = BookOpen;
    link = `/courses/${slugify(item.title)}`;
  } else if (isBootcamp(item)) {
    type = 'Bootcamp';
    Icon = Rocket;
    link = `/bootcamps/${item.id}`;
  } else if (isHackathon(item)) {
    type = 'Hackathon';
    Icon = Trophy;
    link = `/portal/hackathons/${item.id}`;
  }

  return (
    <Card className="bg-primary/5 border-primary/20 shadow-lg">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-full hidden sm:block">
                <Icon className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-grow">
                <Badge>{type}</Badge>
                <h4 className="font-bold text-lg mt-1">{item.title}</h4>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {item.description}
                </p>
                 {isHackathon(item) && (
                    <p className="text-sm font-semibold text-primary mt-1">
                        Prize: Ksh {item.prizeMoney.toLocaleString()}
                    </p>
                )}
                 {isBootcamp(item) && (
                    <p className="text-sm font-semibold text-primary mt-1">
                        Starts: {format(new Date(item.startDate), 'PPP')}
                    </p>
                )}
            </div>
            <Button asChild className="w-full sm:w-auto flex-shrink-0">
                <Link href={link}>
                    Learn More
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
