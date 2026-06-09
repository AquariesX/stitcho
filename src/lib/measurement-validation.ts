/**
 * Smart Measurement Validation
 *
 * Rule-based validation of human body measurements.
 * Works for both inch and cm scales.
 * Returns user-friendly warning messages so the UI can highlight problems.
 */

export interface MeasurementInput {
  neck?: number | null;
  chest?: number | null;
  stomach?: number | null;
  shoulder?: number | null;
  sleeve?: number | null;
  length?: number | null;
  waist?: number | null;
  hip?: number | null;
  inseam?: number | null;
  thigh?: number | null;
  coatLength?: number | null;
  wrist?: number | null;
  scale?: "INCH" | "CM";
}

export interface ValidationResult {
  valid: boolean;
  warnings: string[];
}

// Realistic ranges for adult body measurements
const RANGES_INCH = {
  neck: { min: 12, max: 22, label: "Neck" },
  chest: { min: 28, max: 60, label: "Chest" },
  stomach: { min: 24, max: 60, label: "Stomach" },
  shoulder: { min: 13, max: 24, label: "Shoulder" },
  sleeve: { min: 20, max: 38, label: "Sleeve" },
  length: { min: 24, max: 50, label: "Length" },
  waist: { min: 22, max: 60, label: "Waist" },
  hip: { min: 28, max: 60, label: "Hip" },
  inseam: { min: 22, max: 38, label: "Inseam" },
  thigh: { min: 15, max: 36, label: "Thigh" },
  coatLength: { min: 28, max: 56, label: "Coat Length" },
  wrist: { min: 5, max: 12, label: "Wrist" },
};

// Convert inch ranges to cm (multiply by 2.54)
const RANGES_CM = Object.fromEntries(
  Object.entries(RANGES_INCH).map(([key, range]) => [
    key,
    {
      min: Math.round(range.min * 2.54),
      max: Math.round(range.max * 2.54),
      label: range.label,
    },
  ])
) as typeof RANGES_INCH;

/**
 * Validates measurement values against realistic human body ranges.
 * Returns `valid: true` if all provided values are within range,
 * plus a list of `warnings` for any field that is suspicious.
 */
export function validateMeasurements(input: MeasurementInput): ValidationResult {
  const warnings: string[] = [];
  const ranges = input.scale === "CM" ? RANGES_CM : RANGES_INCH;
  const unit = input.scale === "CM" ? "cm" : "inches";

  const fields = [
    "neck",
    "chest",
    "stomach",
    "shoulder",
    "sleeve",
    "length",
    "waist",
    "hip",
    "inseam",
    "thigh",
    "coatLength",
    "wrist",
  ] as const;

  for (const field of fields) {
    const value = input[field];
    if (value === null || value === undefined) continue; // Optional fields can be skipped

    const range = ranges[field];
    if (!range) continue;

    if (value <= 0) {
      warnings.push(
        `${range.label} cannot be zero or negative. Please enter a valid measurement.`
      );
    } else if (value < range.min || value > range.max) {
      warnings.push(
        `Please check the ${range.label} measurement (${value} ${unit}). ` +
          `Expected between ${range.min}–${range.max} ${unit}. Value seems unrealistic.`
      );
    }
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}

const REQUIRED_BY_PRODUCT = {
  T_SHIRT: ["neck", "chest", "length", "shoulder", "sleeve"],
  FORMAL_SHIRT: ["neck", "chest", "stomach", "length", "shoulder", "sleeve"],
  PANTS: ["waist", "hip", "inseam", "thigh"],
  SHALWAR_KAMEEZ: [
    "neck",
    "chest",
    "stomach",
    "length",
    "shoulder",
    "sleeve",
    "waist",
    "hip",
  ],
} as const;

export function validateMeasurementsForProduct(
  productType: keyof typeof REQUIRED_BY_PRODUCT,
  input: MeasurementInput
): ValidationResult {
  const result = validateMeasurements(input);
  const missing = REQUIRED_BY_PRODUCT[productType].filter((field) => {
    const value = input[field as keyof MeasurementInput];
    return value === null || value === undefined;
  });
  return {
    valid: result.valid && missing.length === 0,
    warnings: [
      ...result.warnings,
      ...missing.map((field) => `${field} is required for ${productType}`),
    ],
  };
}
