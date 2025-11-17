
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Trash2, Mail, Loader2, Copy } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState } from 'react';
import { RegisteredUser, deleteUser, getOrganizationMembers, getUserByEmail } from '@/lib/firebase-service';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { createInvitation } from '@/lib/firebase-service';
import { LoadingAnimation } from '@/components/LoadingAnimation';
import { Textarea } from '@/components/ui/textarea';

const inviteFormSchema = z.object({
    emails: z.string().min(1, { message: "Please enter at least one email address." }),
});

function InviteDialog() {
    const { organization, members } = useAuth();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [isSending, setIsSending] = useState(false);

    const form = useForm<z.infer<typeof inviteFormSchema>>({
        resolver: zodResolver(inviteFormSchema),
        defaultValues: { emails: '' },
    });

    const onSubmit = async (values: z.infer<typeof inviteFormSchema>) => {
        if (!organization) return;

        const emails = values.emails.split(/[\n,;]+/).map(email => email.trim()).filter(Boolean);
        const availableSlots = (organization.memberLimit || 0) - members.length;

        if (emails.length > availableSlots) {
            toast({
                title: 'Member Limit Exceeded',
                description: `You can only invite ${availableSlots} more members. Your current plan limit is ${organization.memberLimit}. Please upgrade to invite more.`,
                variant: 'destructive',
                duration: 7000
            });
            return;
        }

        setIsSending(true);
        let successCount = 0;
        let failCount = 0;

        for (const email of emails) {
            try {
                const userToInvite = await getUserByEmail(email);

                if (userToInvite) {
                     if (userToInvite.organizationId === organization.id) {
                        // Skip silently if already a member
                        continue;
                    }
                    await createInvitation({
                        email: email,
                        userId: userToInvite.uid,
                        organizationId: organization.id,
                        organizationName: organization.name,
                        status: 'pending',
                        createdAt: new Date().toISOString(),
                    });
                } else {
                    // User doesn't exist, add to a conceptual waiting list (or handle as needed)
                    // For now, we'll just log it. A more robust solution might involve a separate "pending_invites" collection.
                     await createInvitation({
                        email: email,
                        organizationId: organization.id,
                        organizationName: organization.name,
                        status: 'pending',
                        createdAt: new Date().toISOString(),
                    });
                }
                successCount++;
            } catch (error) {
                console.error(`Failed to invite ${email}:`, error);
                failCount++;
            }
        }
        
        toast({
            title: 'Invitations Sent',
            description: `${successCount} invitations were sent successfully. ${failCount > 0 ? `${failCount} failed.` : ''}`,
        });

        setIsSending(false);
        setIsOpen(false);
        form.reset();
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Mail className="mr-2 h-4 w-4" />
                    Invite Members
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Invite New Members</DialogTitle>
                    <DialogDescription>
                        Paste a list of email addresses, separated by commas, new lines, or semicolons.
                    </DialogDescription>
                </DialogHeader>
                     <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="emails"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email Addresses</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="user1@example.com, user2@example.com"
                                                className="min-h-32"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <Button type="submit" disabled={isSending}>
                                    {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                    Send Invitations
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
            </DialogContent>
        </Dialog>
    )
}


export default function OrganizationMembersPage() {
    const { organization, user, members, setMembers } = useAuth();
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchMembers = async () => {
        if (!organization) return;
        setLoading(true);
        const fetchedMembers = await getOrganizationMembers(organization.id);
        setMembers(fetchedMembers);
        setLoading(false);
    }
    
    useEffect(() => {
        if (organization) {
            fetchMembers();
        } else {
            setLoading(false);
        }
    }, [organization]);

    const handleRemoveMember = async (memberId: string) => {
        toast({ title: "Action Not Implemented", description: `Removing members requires more complex logic to reassign their data or confirm deletion.`});
    }

    return (
        <div className="space-y-8">
             <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Manage Members</CardTitle>
                        <CardDescription>
                            {`You have ${members.length} of ${organization?.memberLimit || 5} members.`} Invite, remove, and manage members of your organization.
                        </CardDescription>
                    </div>
                    <InviteDialog />
                </CardHeader>
                <CardContent>
                    {loading ? (
                         <div className="flex justify-center py-10"><LoadingAnimation /></div>
                    ) : (
                       <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {members.map(member => (
                                    <TableRow key={member.uid}>
                                        <TableCell className="font-medium">{member.displayName}</TableCell>
                                        <TableCell>{member.email}</TableCell>
                                        <TableCell>
                                            <Badge variant={member.isOrganizationAdmin ? 'default' : 'secondary'}>
                                                {member.isOrganizationAdmin ? 'Admin' : 'Member'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" disabled={member.uid === user?.uid}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This will remove {member.displayName} from your organization. They will lose access to all assigned courses. This action cannot be undone.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleRemoveMember(member.uid)}>Remove Member</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                       </Table>
                   )}
                </CardContent>
            </Card>
        </div>
    );
}
