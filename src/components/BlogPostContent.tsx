
'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Advertisement } from '@/lib/types';
import { InContentAdCard } from './InContentAdCard';

interface BlogPostContentProps {
  content: string;
  promoItems: Advertisement[];
}

// This is a custom renderer for paragraphs.
const ParagraphRenderer = ({ node, children, ...props }: { node: any, children: React.ReactNode, [key: string]: any }) => {
    // We check if it's the right place to insert an ad.
    // We'll insert an ad every 6th element (roughly every 3rd paragraph).
    const showAd = props.index > 0 && props.index % 6 === 0;
    const adIndex = Math.floor(props.index / 6) - 1;
    
    const promoItem = props.promoItems[adIndex % props.promoItems.length];

    if (showAd && promoItem) {
      return (
        <>
          <p>{children}</p>
          <div className="not-prose my-8">
            <InContentAdCard item={promoItem} />
          </div>
        </>
      );
    }

    return <p>{children}</p>;
};

export function BlogPostContent({ content, promoItems }: BlogPostContentProps) {
  if (promoItems.length === 0) {
    return <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>;
  }

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: (props) => <ParagraphRenderer {...props} promoItems={promoItems} />
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
