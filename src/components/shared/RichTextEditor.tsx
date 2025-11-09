
'use client';

import { Bold, Italic, Strikethrough, Heading1, Heading2, Heading3, List, ListOrdered, Quote, Code, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { RefObject } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement>;
}

export function RichTextEditor({ content, onChange, textareaRef }: RichTextEditorProps) {

    const insertText = (before: string, after: string = '') => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = content.substring(start, end);
        const newText = `${before}${selectedText}${after}`;
        const newContent = content.substring(0, start) + newText + content.substring(end);
        
        onChange(newContent);

        // This timeout is needed to allow React to re-render the textarea with the new content
        setTimeout(() => {
            textarea.focus();
            textarea.selectionStart = start + before.length;
            textarea.selectionEnd = start + before.length + selectedText.length;
        }, 0);
    };

    const insertLine = (lineStart: string) => {
         const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        // Find the beginning of the current line
        const lineStartPos = content.lastIndexOf('\n', start - 1) + 1;
        const newContent = content.substring(0, lineStartPos) + lineStart + content.substring(lineStartPos);
        
        onChange(newContent);
    }
    
    const insertImage = () => {
        const url = prompt('Enter image URL:');
        if(url) {
            insertText(`\n![Image Alt Text](${url})\n`);
        }
    }
    
    const insertLink = () => {
         const url = prompt('Enter URL:');
        if(url) {
            insertText(`[`, `](${url})`);
        }
    }

    return (
        <div className="border rounded-md">
            <div className="p-2 border-b flex flex-wrap items-center gap-1">
                <Button type="button" size="icon" variant="ghost" onClick={() => insertText('**', '**')} title="Bold"><Bold className="h-4 w-4" /></Button>
                <Button type="button" size="icon" variant="ghost" onClick={() => insertText('*', '*')} title="Italic"><Italic className="h-4 w-4" /></Button>
                <Button type="button" size="icon" variant="ghost" onClick={() => insertText('~~', '~~')} title="Strikethrough"><Strikethrough className="h-4 w-4" /></Button>
                <Separator orientation="vertical" className="h-6 mx-1" />
                 <Button type="button" size="icon" variant="ghost" onClick={() => insertLine('# ')} title="Heading 1"><Heading1 className="h-4 w-4" /></Button>
                 <Button type="button" size="icon" variant="ghost" onClick={() => insertLine('## ')} title="Heading 2"><Heading2 className="h-4 w-4" /></Button>
                 <Button type="button" size="icon" variant="ghost" onClick={() => insertLine('### ')} title="Heading 3"><Heading3 className="h-4 w-4" /></Button>
                <Separator orientation="vertical" className="h-6 mx-1" />
                <Button type="button" size="icon" variant="ghost" onClick={() => insertLine('- ')} title="Bulleted List"><List className="h-4 w-4" /></Button>
                <Button type="button" size="icon" variant="ghost" onClick={() => insertLine('1. ')} title="Numbered List"><ListOrdered className="h-4 w-4" /></Button>
                <Button type="button" size="icon" variant="ghost" onClick={() => insertLine('> ')} title="Quote"><Quote className="h-4 w-4" /></Button>
                <Separator orientation="vertical" className="h-6 mx-1" />
                <Button type="button" size="icon" variant="ghost" onClick={() => insertText('```\n', '\n```')} title="Code Block"><Code className="h-4 w-4" /></Button>
                <Button type="button" size="icon" variant="ghost" onClick={insertLink} title="Link"><LinkIcon className="h-4 w-4" /></Button>
                <Button type="button" size="icon" variant="ghost" onClick={insertImage} title="Image"><ImageIcon className="h-4 w-4" /></Button>
            </div>
            <Textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => onChange(e.target.value)}
                className="min-h-[400px] w-full border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-t-none"
                placeholder="Write your article content here. Markdown is supported."
            />
        </div>
    );
}
