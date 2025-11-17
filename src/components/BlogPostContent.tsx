
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
    // Check if the thematic break is our special ad marker
    // The markdown parser will see `--- ad ---` as a thematic break with text inside, but we can't easily access that text here.
    // A simpler convention is to just use a standard thematic break `---` as the ad placeholder.
    // We will use a counter to cycle through ads.
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
  // Use a ref to keep track of which ad to show next, so we can cycle through them.
  const adCounter = React.useRef(0);

  if (promoItems.length === 0 || !content.includes('---')) {
    // If no ads or no ad markers, just render the content as is.
    return <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>;
  }

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // We override the thematic break (`---`) component.
        // When the markdown parser finds a `---`, it will render our ad card instead.
        hr: (props) => (
            <ThematicBreakRenderer {...props} promoItems={promoItems} adCounter={adCounter} />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
