import { lightColors, darkColors, spacing, radii } from '../tokens';

describe('theme tokens', () => {
  describe('lightColors', () => {
    it('paper is #FBF6EE', () => {
      expect(lightColors.paper).toBe('#FBF6EE');
    });

    it('accent is #E07B3F', () => {
      expect(lightColors.accent).toBe('#E07B3F');
    });
  });

  describe('darkColors', () => {
    it('paper is #16110C', () => {
      expect(darkColors.paper).toBe('#16110C');
    });

    it('accent is #F09060', () => {
      expect(darkColors.accent).toBe('#F09060');
    });
  });

  describe('spacing', () => {
    it('screenPadding is 22', () => {
      expect(spacing.screenPadding).toBe(22);
    });
  });

  describe('radii', () => {
    it('sm is 8', () => {
      expect(radii.sm).toBe(8);
    });

    it('md is 14', () => {
      expect(radii.md).toBe(14);
    });

    it('lg is 22', () => {
      expect(radii.lg).toBe(22);
    });

    it('xl is 30', () => {
      expect(radii.xl).toBe(30);
    });

    it('pill is 999', () => {
      expect(radii.pill).toBe(999);
    });
  });
});
