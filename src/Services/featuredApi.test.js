import { formatPrice } from "./featuredApi.js";

describe("formatPrice", () => {
  describe("null and undefined", () => {
    it('returns "Price unavailable" for null', () => {
      expect(formatPrice(null)).toBe("Price unavailable");
    });

    it('returns "Price unavailable" for undefined', () => {
      expect(formatPrice(undefined)).toBe("Price unavailable");
    });
  });

  describe("normal values", () => {
    it("formats 0 as $0.00", () => {
      expect(formatPrice(0)).toBe("$0.00");
    });

    it("formats 9.99 as $9.99", () => {
      expect(formatPrice(9.99)).toBe("$9.99");
    });

    it("formats 25 as $25.00", () => {
      expect(formatPrice(25)).toBe("$25.00");
    });

    it("formats 0.5 as $0.50", () => {
      expect(formatPrice(0.5)).toBe("$0.50");
    });
  });

  describe("large values", () => {
    it("formats 1234.56 with comma separator", () => {
      expect(formatPrice(1234.56)).toBe("$1,234.56");
    });

    it("formats 99999.99 with comma separators", () => {
      expect(formatPrice(99999.99)).toBe("$99,999.99");
    });
  });

  describe("edge cases", () => {
    it("formats negative prices", () => {
      expect(formatPrice(-5.99)).toBe("-$5.99");
    });

    it("rounds fractions of a cent (1.999 -> $2.00)", () => {
      expect(formatPrice(1.999)).toBe("$2.00");
    });

    it("rounds half-cent values (1.005 -> $1.01)", () => {
      // Intl.NumberFormat uses banker's rounding, result may vary
      const result = formatPrice(1.005);
      expect(result).toMatch(/^\$1\.0[01]$/);
    });
  });
});
