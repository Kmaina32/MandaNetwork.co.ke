
'use client';

import { GitBranch, Snowflake, Heart, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface LoadingAnimationProps {
  showText?: boolean;
  className?: string;
}

interface ThemeConfig {
    icon: React.ComponentType<any>;
    colors: {
        icon: string;
        text: string;
        name: string[];
    };
    text?: string;
}

const themeConfigs: Record<string, ThemeConfig> = {
    default: {
        icon: GitBranch,
        colors: { icon: 'text-primary', text: 'text-muted-foreground', name: [] },
        text: 'Loading your experience...'
    },
    jamhuri: {
        icon: GitBranch,
        colors: { icon: 'text-red-600', text: 'text-gray-800', name: ['text-black', 'text-red-600', 'text-green-600'] },
        text: 'Celebrating Jamhuri Day...'
    },
    christmas: {
        icon: Snowflake,
        colors: { icon: 'text-red-500', text: 'text-green-600', name: [] },
        text: 'Merry Christmas!'
    },
    valentines: {
        icon: Heart,
        colors: { icon: 'text-red-500 fill-red-500', text: 'text-pink-400', name: [] },
        text: 'Happy Valentine\'s Day!'
    },
    'new-year': {
        icon: PartyPopper,
        colors: { icon: 'text-yellow-500', text: 'text-muted-foreground', name: [] },
        text: 'Happy New Year!'
    },
    eid: {
        icon: GitBranch,
        colors: { icon: 'text-green-500', text: 'text-yellow-500', name: [] },
        text: 'Eid Mubarak!'
    }
};

export function LoadingAnimation({ showText = true, className }: LoadingAnimationProps) {
  const [activeTheme, setActiveTheme] = useState('default');

  useEffect(() => {
    const themeClass = Array.from(document.documentElement.classList).find(c => c.startsWith('theme-'));
    const themeName = themeClass ? themeClass.replace('theme-', '') : 'default';
    setActiveTheme(themeConfigs[themeName] ? themeName : 'default');
  }, []);

  const config = themeConfigs[activeTheme];
  const BrandIcon = config.icon;
  const brandName = "Varban Academy";

  const renderThemedName = () => {
    if (activeTheme === 'jamhuri' && config.colors.name.length > 0) {
        const colors = config.colors.name;
        return brandName.split('').map((char, index) => (
            <span
              key={index}
              className={cn('animate-fade-in', colors[index % colors.length])}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {char === ' ' ? '\u00A0' : char}
            </span>
        ));
    }
    return brandName.split('').map((char, index) => (
        <span
          key={index}
          className="animate-fade-in"
          style={{ animationDelay: `${index * 0.05}s` }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
    ));
  };
  
  const iconAnimationClass = {
      christmas: 'animate-spin-slow',
      valentines: 'animate-pulse-heart',
  }[activeTheme] || '';


  return (
    <div className={cn("flex flex-col items-center justify-center gap-4 text-primary", className)}>
      <div className="flex items-center justify-center gap-3">
        <BrandIcon className={cn("h-8 w-8 md:h-10 md:w-10", config.colors.icon, iconAnimationClass)} />
        <h1 className="text-3xl md:text-4xl font-headline font-bold tracking-wider">
          {renderThemedName()}
        </h1>
      </div>
      {showText && config.text && (
        <p 
          className={cn("animate-fade-in", config.colors.text)}
          style={{ animationDelay: `${(brandName.length * 0.05) + 0.2}s` }}
        >
          {config.text}
        </p>
      )}
      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-in-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}
