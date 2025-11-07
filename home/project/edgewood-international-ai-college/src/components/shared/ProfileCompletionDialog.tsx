
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { User, Check, X } from 'lucide-react';
import type { RegisteredUser } from '@/lib/types';

interface ProfileCompletionDialogProps {
  student: RegisteredUser;
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileCompletionDialog({ student, isOpen, onClose }: ProfileCompletionDialogProps) {
  const checks = {
    hasName: student.displayName && student.displayName !== 'New Member',
    hasAboutMe: !!student.portfolio?.aboutMe,
    hasGithub: !!student.portfolio?.socialLinks?.github,
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 mb-4">
            <User className="h-6 w-6 text-yellow-600" />
          </div>
          <DialogTitle className="text-center">Incomplete Profile</DialogTitle>
          <DialogDescription className="text-center">
            This student needs to complete their profile before they can be contacted.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-4">
            <p className="text-sm font-semibold">Missing Information:</p>
            <ul className="list-none space-y-1 text-sm">
                <li className={`flex items-center gap-2 ${checks.hasName ? 'text-muted-foreground' : 'text-foreground'}`}>
                    {checks.hasName ? <Check className="h-4 w-4 text-green-500"/> : <X className="h-4 w-4 text-destructive"/>}
                    Full Name Provided
                </li>
                <li className={`flex items-center gap-2 ${checks.hasAboutMe ? 'text-muted-foreground' : 'text-foreground'}`}>
                    {checks.hasAboutMe ? <Check className="h-4 w-4 text-green-500"/> : <X className="h-4 w-4 text-destructive"/>}
                    "About Me" Section
                </li>
                <li className={`flex items-center gap-2 ${checks.hasGithub ? 'text-muted-foreground' : 'text-foreground'}`}>
                    {checks.hasGithub ? <Check className="h-4 w-4 text-green-500"/> : <X className="h-4 w-4 text-destructive"/>}
                    GitHub Link
                </li>
            </ul>
            <p className="text-xs text-muted-foreground pt-2">An automated notification has been sent to the student prompting them to complete their portfolio.</p>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
