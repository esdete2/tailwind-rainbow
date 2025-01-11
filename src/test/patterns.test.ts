import { readFileSync } from 'fs';
import { join } from 'path';

describe('Pattern Tests', () => {
  const packageJson = JSON.parse(
    readFileSync(join(__dirname, '../../package.json'), 'utf8')
  );
  const patterns = (packageJson.contributes.configuration.properties['tailwindRainbow.patterns'].default) as Record<string, RegexPattern>;
  const stringRegex = new RegExp(patterns.strings.regex, 'g');

  describe('HTML/JSX attributes', () => {
    it('should match class attribute', () => {
      const input = '<div class="sm:flex lg:grid"></div>';
      const matches = [...input.matchAll(stringRegex)];
      expect(matches[0][2]).toBe('sm:flex lg:grid');
    });

    it('should match className attribute', () => {
      const input = '<div className="hover:bg-blue md:p-4"></div>';
      const matches = [...input.matchAll(stringRegex)];
      expect(matches[0][2]).toBe('hover:bg-blue md:p-4');
    });
  });

  describe('Utility functions', () => {
    it('should match cn function', () => {
      const input = 'cn("focus:ring xl:mt-2")';
      const matches = [...input.matchAll(stringRegex)];
      expect(matches[0][2]).toBe('focus:ring xl:mt-2');
    });

    it('should match clsx function', () => {
      const input = 'clsx("dark:bg-gray focus:outline-none")';
      const matches = [...input.matchAll(stringRegex)];
      expect(matches[0][2]).toBe('dark:bg-gray focus:outline-none');
    });
  });

  describe('cva function', () => {
    it('should match base classes and variants', () => {
      const input = `
        const buttonVariants = cva(
          'px-4 py-2 rounded-md focus:ring hover:opacity-90',
          {
            variants: {
              intent: {
                primary: 'bg-blue-500 hover:bg-blue-600',
                secondary: 'bg-gray-500 hover:bg-gray-600',
                danger: 'bg-red-500 hover:bg-red-600'
              },
              size: {
                sm: 'text-sm md:text-base',
                lg: 'text-lg lg:text-xl'
              },
              fullWidth: {
                true: 'w-full sm:w-auto'
              }
            },
            compoundVariants: [
              {
                intent: 'primary',
                size: 'lg',
                class: 'shadow-lg hover:shadow-xl'
              },
              {
                intent: ['primary', 'secondary'],
                fullWidth: true,
                className: 'justify-center sm:justify-start'
              }
            ]
          }
        );`;

      const matches = [...input.matchAll(stringRegex)];
      
      // Base classes
      expect(matches[0][2]).toBe('px-4 py-2 rounded-md focus:ring hover:opacity-90');
      
      // Variant classes
      expect(matches.some(m => m[2] === 'bg-blue-500 hover:bg-blue-600')).toBe(true);
      expect(matches.some(m => m[2] === 'bg-gray-500 hover:bg-gray-600')).toBe(true);
      expect(matches.some(m => m[2] === 'text-sm md:text-base')).toBe(true);
      expect(matches.some(m => m[2] === 'w-full sm:w-auto')).toBe(true);
      
      // Compound variant classes
      expect(matches.some(m => m[2] === 'shadow-lg hover:shadow-xl')).toBe(true);
      expect(matches.some(m => m[2] === 'justify-center sm:justify-start')).toBe(true);
    });
  });

  describe('Variable declarations', () => {
    it('should match string literals', () => {
      const input = 'const classes = "sm:flex lg:grid"';
      const matches = [...input.matchAll(stringRegex)];
      expect(matches[0][2]).toBe('sm:flex lg:grid');
    });

    it('should match template literals', () => {
      const input = 'const dynamic = `dark:bg-gray ${value}`';
      const matches = [...input.matchAll(stringRegex)];
      expect(matches[0][2]).toBe('dark:bg-gray ${value}');
    });
  });
}); 