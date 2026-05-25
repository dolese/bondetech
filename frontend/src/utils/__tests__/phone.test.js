import { normalizeTzPhoneListInline } from "../phone";

describe("normalizeTzPhoneListInline", () => {
  it("normalizes multiple comma-separated numbers", () => {
    expect(
      normalizeTzPhoneListInline("0712 345 678, +255 754 321 000")
    ).toBe("255712345678, 255754321000");
  });

  it("supports semicolon and newline separators and removes duplicates", () => {
    expect(
      normalizeTzPhoneListInline("0712345678;\n255712345678")
    ).toBe("255712345678");
  });
});
