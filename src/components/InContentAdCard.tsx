
'use client';

import Link from 'next/link';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { ArrowRight, Megaphone } from 'lucide-react';
import { Badge } from './ui/badge';
import type { Advertisement } from '@/lib/types';

export function InContentAdCard({ item }: { item: Advertisement }) {
  return (
    <Card className="bg-primary/5 border-primary/20 shadow-lg">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-full hidden sm:block">
                <Megaphone className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-grow">
                <Badge>Promotion</Badge>
                <h4 className="font-bold text-lg mt-1">{item.title}</h4>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {item.description}
                </p>
            </div>
            <Button asChild className="w-full sm:w-auto flex-shrink-0" size="sm">
                <Link href={item.ctaLink}>
                    {item.ctaText}
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
