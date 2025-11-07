
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, Loader2, Trophy } from 'lucide-react';
import { getLeaderboard } from '@/lib/firebase-service';
import type { LeaderboardEntry } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { LoadingAnimation } from '@/components/LoadingAnimation';

const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    return names.length > 1 ? `${names[0][0]}${names[names.length - 1][0]}` : names[0]?.[0] || 'U';
};

const podiumColors = ['bg-yellow-400', 'bg-gray-400', 'bg-yellow-600'];

export default function LeaderboardPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push('/login');
            return;
        }

        const fetchLeaderboard = async () => {
            setLoading(true);
            try {
                const data = await getLeaderboard();
                setLeaderboard(data);
            } catch (error) {
                console.error("Failed to fetch leaderboard", error);
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboard();
    }, [user, authLoading, router]);

    if (authLoading || loading) {
        return <div className="flex justify-center items-center h-full"><LoadingAnimation /></div>
    }

    return (
        <main className="flex-grow container mx-auto px-4 md:px-6 py-12">
            <Card>
                <CardHeader>
                     <div className="flex items-center gap-4">
                        <Award className="h-8 w-8" />
                        <div>
                            <CardTitle className="text-2xl font-headline">Leaderboard</CardTitle>
                            <CardDescription>Top performers from across all hackathons.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                     {leaderboard.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">Rank</TableHead>
                                    <TableHead>Participant</TableHead>
                                    <TableHead>Hackathons</TableHead>
                                    <TableHead className="text-right">Score</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {leaderboard.map((entry, index) => (
                                    <TableRow key={entry.userId}>
                                        <TableCell>
                                            <div className="flex justify-center items-center h-8 w-8 rounded-full bg-primary/10">
                                                {index < 3 ? (
                                                    <Trophy className={`h-5 w-5 ${podiumColors[index]}`} />
                                                ) : (
                                                    <span className="font-bold text-primary">{index + 1}</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                             <div className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarImage src={entry.userAvatar} />
                                                    <AvatarFallback>{getInitials(entry.userName)}</AvatarFallback>
                                                </Avatar>
                                                <span className="font-medium">{entry.userName}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{entry.hackathonCount}</TableCell>
                                        <TableCell className="text-right font-bold text-lg">{entry.score}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-lg">
                            <p>The leaderboard is empty.</p>
                            <p className="text-sm">Participate in a hackathon to get on the board!</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </main>
    );
}
