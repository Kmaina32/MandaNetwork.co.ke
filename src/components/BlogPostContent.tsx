
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

// This is a custom renderer for thematic breaks (---)
const ThematicBreakRenderer = ({ node, ...props }: { node: any, [key: string]: any }) => {
    const adIndex = props.adCounter.current % props.promoItems.length;
    const promoItem = props.promoItems[adIndex];
    
    if (promoItem) {
      props.adCounter.current += 1;
      return (
        <div className="not-prose my-8">
          <InContentAdCard item={promoItem} />
        </div>
      );
    }
    
    // If no promo item, render a standard separator
    return <hr />;
};

export function BlogPostContent({ content, promoItems }: BlogPostContentProps) {
  const adCounter = React.useRef(0);

  const hasAdMarkers = content.includes('---');
  
  if (promoItems.length === 0 || !hasAdMarkers) {
    return <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>;
  }

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        hr: (props) => (
            <ThematicBreakRenderer {...props} promoItems={promoItems} adCounter={adCounter} />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
