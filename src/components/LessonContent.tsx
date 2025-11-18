
'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Lesson } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Check, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const GoogleDriveIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" {...props}>
        <path d="M330.2 284.4l-15.1 26.2-70.2-121.5L200 81l130.2 203.4z" fill="#ffc107"/>
        <path d="M117.9 284.4L73 368.8l102.3-177.2L219.7 121l-101.8 163.4z" fill="#03a9f4"/>
        <path d="M375.1 368.8L440 256H199.3l-47.5 82.3 223.3.5z" fill="#4caf50"/>
    </svg>
);

const CodeBlock = ({ node, inline, className, children, ...props }: any) => {
    const { toast } = useToast();
    const [hasCopied, setHasCopied] = useState(false);
    const match = /language-(\w+)/.exec(className || '');
    const codeString = String(children).replace(/\n$/, '');

    const copyToClipboard = () => {
        navigator.clipboard.writeText(codeString);
        setHasCopied(true);
        toast({ title: "Copied to clipboard!" });
        setTimeout(() => setHasCopied(false), 2000);
    };

    if (inline) {
      return <code className="bg-muted px-1.5 py-1 rounded-sm text-sm font-mono">{children}</code>;
    }

    return (
        <div className="my-4 not-prose">
            <div className={cn("rounded-md border", match ? `language-${match[1]}` : '')}>
                <div className="flex items-center justify-between bg-secondary px-4 py-2 rounded-t-md">
                    <span className="text-xs font-semibold uppercase text-muted-foreground">{match ? match[1] : 'code'}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copyToClipboard}>
                        {hasCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                </div>
                 <pre className="p-4 bg-background rounded-b-md overflow-x-auto text-sm font-mono">{children}</pre>
            </div>
        </div>
    );
};


interface LessonContentProps {
  lesson: Lesson | null;
  onComplete: () => void;
}

export function LessonContent({ lesson, onComplete }: LessonContentProps) {
  if (!lesson) return null;

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-grow">
        <div className="pr-4">
          <h1 className="text-3xl font-bold font-headline mb-4">{lesson.title}</h1>
          <div className="prose max-w-none text-foreground/90 mb-6">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    code: CodeBlock,
                }}
              >
                  {lesson.content}
              </ReactMarkdown>
          </div>

          {lesson.googleDriveLinks && lesson.googleDriveLinks.length > 0 && (
            <div className="mt-8">
              <Separator />
              <h3 className="text-lg font-semibold my-4">Lesson Resources</h3>
              <div className="space-y-2">
                {lesson.googleDriveLinks.map((link) => (
                  <a
                    href={link.url}
                    key={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-background border rounded-md hover:bg-secondary transition-colors"
                  >
                    <GoogleDriveIcon className="h-6 w-6 flex-shrink-0" />
                    <span className="text-sm font-medium text-primary">
                      {link.title}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="pt-6 mt-auto flex-shrink-0">
        <Button
          size="lg"
          className="w-full bg-accent hover:bg-accent/90"
          onClick={onComplete}
        >
          Mark as Completed &amp; Continue
        </Button>
      </div>
    </div>
  );
}
