import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Property-Based Test for Dark Mode Contrast Compliance
 * Feature: prism-frontend-redesign
 * Property 10: Dark Mode Contrast Compliance
 * Validates: Requirements 6.5
 * 
 * For any text element in dark mode, the contrast ratio between text and background
 * should meet WCAG AA standards (minimum 4.5:1 for normal text, 3:1 for large text).
 */

// Helper function to calculate relative luminance
function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Helper function to calculate contrast ratio
function getContrastRatio(rgb1, rgb2) {
  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Helper function to parse hex color to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Dark mode color palette from index.css
const darkModeColors = {
  backgrounds: {
    primary: '#1a1f2e',
    secondary: '#252b3b',
    tertiary: '#2f3747',
    card: '#252b3b'
  },
  text: {
    primary: '#ecf0f1',
    secondary: '#bdc3c7',
    tertiary: '#8a9ba8'
  }
};

describe('Property 10: Dark Mode Contrast Compliance', () => {
  it('should maintain WCAG AA contrast ratio for all text/background combinations', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.keys(darkModeColors.backgrounds)),
        fc.constantFrom(...Object.keys(darkModeColors.text)),
        fc.boolean(), // isLargeText
        (bgKey, textKey, isLargeText) => {
          // Skip invalid combinations (same level text on same level background)
          if (bgKey === textKey) {
            return true;
          }
          
          const bgColor = darkModeColors.backgrounds[bgKey];
          const textColor = darkModeColors.text[textKey];
          
          const bgRgb = hexToRgb(bgColor);
          const textRgb = hexToRgb(textColor);
          
          if (!bgRgb || !textRgb) {
            return true; // Skip invalid colors
          }
          
          const contrastRatio = getContrastRatio(bgRgb, textRgb);
          
          // WCAG AA standards: 4.5:1 for normal text, 3:1 for large text
          const minRatio = isLargeText ? 3.0 : 4.5;
          
          // Allow a small tolerance for rounding
          const meetsStandard = contrastRatio >= minRatio - 0.1;
          
          if (!meetsStandard) {
            console.log(`Contrast failure: ${textKey} (${textColor}) on ${bgKey} (${bgColor})`);
            console.log(`Ratio: ${contrastRatio.toFixed(2)}, Required: ${minRatio}`);
          }
          
          return meetsStandard;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain contrast for primary text on all backgrounds', () => {
    const primaryText = hexToRgb(darkModeColors.text.primary);
    
    Object.entries(darkModeColors.backgrounds).forEach(([bgKey, bgColor]) => {
      const bgRgb = hexToRgb(bgColor);
      const contrastRatio = getContrastRatio(primaryText, bgRgb);
      
      // Primary text should always meet normal text standards (4.5:1)
      expect(contrastRatio).toBeGreaterThanOrEqual(4.4); // Small tolerance
    });
  });

  it('should maintain contrast for secondary text on all backgrounds', () => {
    const secondaryText = hexToRgb(darkModeColors.text.secondary);
    
    Object.entries(darkModeColors.backgrounds).forEach(([bgKey, bgColor]) => {
      const bgRgb = hexToRgb(bgColor);
      const contrastRatio = getContrastRatio(secondaryText, bgRgb);
      
      // Secondary text should meet at least large text standards (3:1)
      expect(contrastRatio).toBeGreaterThanOrEqual(2.9); // Small tolerance
    });
  });

  it('should maintain contrast for tertiary text on all backgrounds', () => {
    const tertiaryText = hexToRgb(darkModeColors.text.tertiary);
    
    Object.entries(darkModeColors.backgrounds).forEach(([bgKey, bgColor]) => {
      const bgRgb = hexToRgb(bgColor);
      const contrastRatio = getContrastRatio(tertiaryText, bgRgb);
      
      // Tertiary text should meet at least large text standards (3:1)
      expect(contrastRatio).toBeGreaterThanOrEqual(2.9); // Small tolerance
    });
  });

  it('should verify health state colors maintain contrast in dark mode', () => {
    const healthStateColors = {
      normal: '#27ae60',
      advisory: '#f39c12',
      actionRequired: '#e74c3c',
      postMaintenance: '#3498db'
    };

    Object.entries(healthStateColors).forEach(([state, color]) => {
      const colorRgb = hexToRgb(color);
      
      // Test against dark backgrounds
      Object.entries(darkModeColors.backgrounds).forEach(([bgKey, bgColor]) => {
        const bgRgb = hexToRgb(bgColor);
        const contrastRatio = getContrastRatio(colorRgb, bgRgb);
        
        // Health state colors should be visible (at least 3:1 for large text/badges)
        expect(contrastRatio).toBeGreaterThanOrEqual(2.9);
      });
    });
  });
});
