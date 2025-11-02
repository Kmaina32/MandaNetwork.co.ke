
'use client';

import { MessagesSquare } from "lucide-react";

export function NoConversationSelected() {
    return (
        <div className="flex h-full flex-col items-center justify-center text-center bg-secondary/50">
            <div className="flex flex-col items-center gap-4">
                <div className="rounded-full bg-primary/10 p-4">
                    <MessagesSquare className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">Select a Conversation</h2>
                <p className="max-w-xs text-muted-foreground">
                    Choose a conversation from the list to view messages or start a new one.
                </p>
            </div>
        </div>
    );
}
