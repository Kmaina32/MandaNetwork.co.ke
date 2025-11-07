
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

export function BlogPostContent({ content, promoItems }: BlogPostContentProps) {
  // Split content into paragraphs. Assuming paragraphs are separated by two newlines.
  const paragraphs = content.split(/\n\s*\n/);
  
  // Don't show ads if there aren't enough paragraphs or promo items
  if (paragraphs.length < 3 || promoItems.length === 0) {
    return <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>;
  }

  let promoIndex = 0;
  const adInterval = 3; // Show an ad every 3 paragraphs

  return (
    <div>
      {paragraphs.map((paragraph, index) => {
        const showAd = (index + 1) % adInterval === 0 && index < paragraphs.length -1;
        const promoItem = promoItems[promoIndex % promoItems.length];
        
        if (showAd) {
           promoIndex++;
        }

        return (
          <React.Fragment key={index}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {paragraph}
            </ReactMarkdown>
            {showAd && (
                <div className="not-prose my-8">
                    <InContentAdCard item={promoItem} />
                </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
