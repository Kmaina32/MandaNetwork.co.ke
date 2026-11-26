import { cn, slugify } from './utils';

describe('slugify', () => {
  it.each([
    ['  Hello World  ', 'hello-world'],
    ['Courses & Careers', 'courses-and-careers'],
    ['A   B', 'a-b'],
    ['Café & Design!', 'caf-and-design'],
    ['already--slug', 'already-slug'],
    ['', ''],
  ])('normalizes %p to %p', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe('cn', () => {
  it('joins conditional class values', () => {
    expect(cn('p-2', false && 'hidden', 'text-sm')).toBe('p-2 text-sm');
  });

  it('resolves conflicting Tailwind utilities', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-sm', 'text-lg')).toBe('text-lg');
  });
});
