import React from 'react';

const createIcon = (name: string) => {
  const MockIcon = (props: React.SVGProps<SVGSVGElement>) =>
    React.createElement('svg', { 'aria-hidden': true, 'data-lucide': name, ...props });
  MockIcon.displayName = name;
  return MockIcon;
};

const icons = new Proxy({}, {
  get(_target, property) {
    if (property === '__esModule') return false;
    return createIcon(String(property));
  },
});

export = icons;
