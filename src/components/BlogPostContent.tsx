
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
const ParagraphRenderer = ({ children, node, ...props }: any) => {
    // We check if it's the right place to insert an ad.
    // `props.index` is the index of the element in the markdown document.
    // We'll insert an ad every 6th element (roughly every 3rd paragraph, as there are other elements).
    const showAd = props.index > 0 && props.index % 6 === 0;
    const adIndex = Math.floor(props.index / 6) - 1;
    
    const promoItem = props.promoItems[adIndex % props.promoItems.length];

    if (showAd && promoItem) {
      return (
        <>
          <p {...props}>{children}</p>
          <div className="not-prose my-8">
            <InContentAdCard item={promoItem} />
          </div>
        </>
      );
    }

    return <p {...props}>{children}</p>;
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
