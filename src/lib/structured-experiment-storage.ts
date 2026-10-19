import type { StructuredExperiment } from "../structured-experiments.ts"
import { readMeasurements } from "./experiment-data.ts"

export const REPORT_INFO_FIELDS = [
  { id: "student", label: "学生姓名" },
  { id: "student_id", label: "学号" },
  { id: "group", label: "组号" },
  { id: "date", label: "实验日期" },
] as const

export type SavedExperimentValues = {
  data: Record<string, string[]>
  parameters: Record<string, string>
  reportInfo: Record<string, string>
}

export function experimentStorageKey(id: string) {
  return `phyexp_report_${id}${id === "focal-length" ? "_positions" : ""}`
}

export function readSavedExperimentValues(experiment: StructuredExperiment): SavedExperimentValues {
  const legacyReadings = Object.fromEntries(experiment.measurements.map((item) => [
    item.id, experiment.legacyCookieData ? readMeasurements(experiment.id, item.id)?.filter((value) => value.trim()) : null,
  ])) as Record<string, string[] | null>
  const legacyValue = (id: string) => experiment.legacyCookieData
    ? readMeasurements(experiment.id, id)?.[0] : undefined
  const fallback: SavedExperimentValues = {
    data: Object.fromEntries(experiment.measurements.map((item) => [
      item.id, Array.from({ length: item.count }, (_, index) => legacyReadings[item.id]?.[index] ?? ""),
    ])),
    parameters: Object.fromEntries(experiment.parameters.map((item) => [item.id, legacyValue(`field_${item.id}`) ?? item.initial ?? ""])),
    reportInfo: Object.fromEntries(REPORT_INFO_FIELDS.map((item) => [item.id, legacyValue(`field_${item.id}`) ?? ""])),
  }

  try {
    const raw = localStorage.getItem(experimentStorageKey(experiment.id))
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SavedExperimentValues>
      if (experiment.id === "heat-capacity-ratio" && parsed.data?.diameter && !parsed.data.diameter_final) {
        // Legacy net diameters cannot recover the original micrometer readings.
        const previous = parsed.data
        const correction = Number(parsed.parameters?.diameter_zero_mm ?? "0")
        parsed.data = {
          diameter_initial: Array<string>(5).fill(""),
          diameter_final: previous.diameter.map((value) => value.trim() && Number.isFinite(Number(value) + correction)
            ? String(Number((Number(value) + correction).toPrecision(12))) : ""),
          time_100: (previous.period ?? []).map((value) => value.trim() && Number.isFinite(Number(value))
            ? String(Number((Number(value) * 100).toPrecision(12))) : ""),
        }
      }
      if (experiment.id === "young-modulus" && parsed.data?.diameter && !parsed.data.diameter_final) {
        // The old form stored net diameters, equivalent to zero initial readings.
        parsed.data.diameter_initial = Array<string>(5).fill("0")
        parsed.data.diameter_final = parsed.data.diameter
      }
      if (experiment.id === "millikan" && parsed.data?.voltage && !parsed.data.balance_voltage) {
        const previous = parsed.data
        parsed.data = {
          current_voltage: Array<string>(32).fill(""),
          balance_voltage: Array.from({ length: 32 }, (_, index) => previous.voltage?.[Math.floor(index / 4)] ?? ""),
          fall_time: Array.from({ length: 32 }, (_, index) => previous[`time_${index % 4 + 1}`]?.[Math.floor(index / 4)] ?? ""),
          instrument_charge: Array<string>(32).fill(""),
        }
      }
      if (experiment.id === "moment-of-inertia" && parsed.parameters?.mass_cylinder_g && !parsed.parameters.mass_cylinder_kg) {
        const previous = parsed.parameters
        const converted = (key: string, factor: number) => previous[key]?.trim() && Number.isFinite(Number(previous[key]))
          ? String(Number((Number(previous[key]) * factor).toPrecision(12))) : ""
        parsed.data ??= {}
        for (const [key, old] of Object.entries({ cylinder: "diameter_cylinder_mm", tube_inner: "diameter_tube_inner_mm",
          tube_outer: "diameter_tube_outer_mm", ball: "diameter_ball_mm", rod: "length_rod_mm" })) {
          // The previous form kept only an average; do not invent three measurements.
          parsed.data[`size_${key}_cm`] = [converted(old, 0.1), "", ""]
        }
        parsed.parameters = {
          ...Object.fromEntries(["cylinder", "tube", "ball", "rod"].map((key) => [`mass_${key}_kg`, converted(`mass_${key}_g`, 0.001)])),
          slider_mass_1_kg: converted("slider_mass_g", 0.001), slider_mass_2_kg: "",
          slider_pair_inertia_scaled: converted("slider_self_inertia", 20000),
        }
      }
      if (experiment.id === "forced-vibration" && parsed.data?.damped_period && !parsed.data.damped_time_10) {
        parsed.data.damped_time_10 = parsed.data.damped_period.map((value) =>
          value.trim() && Number.isFinite(Number(value)) ? String(Number((Number(value) * 10).toPrecision(12))) : "")
      }
      if (experiment.id === "forced-vibration" && parsed.data) {
        const readings = parsed.data
        if (readings.drive_period && !readings.drive_time_10) {
          readings.drive_time_10 = readings.drive_period.map((value) =>
            value.trim() && Number.isFinite(Number(value)) ? String(Number((Number(value) * 10).toPrecision(12))) : "")
        }
        for (const [keys, min] of [
          [["free_angle", "free_period"], 2],
          [["drive_time_10", "amplitude", "phase"], 3],
          [["damped_time_10", "damped_peak"], 1],
        ] as [string[], number][]) {
          const counts = keys.filter((key) => Array.isArray(readings[key])).map((key) =>
            key === "damped_peak" ? Math.ceil(readings[key].length / 10) : readings[key].length)
          if (!counts.length) continue
          const count = Math.max(min, ...counts)
          for (const key of keys) readings[key] = Array.from({ length: key === "damped_peak" ? count * 10 : count },
            (_, index) => readings[key]?.[index] ?? "")
        }
      }
      // Previous oscilloscope forms stored seven waveforms in a different order.
      if (experiment.id === "oscilloscope" && parsed.data?.voltage_scale?.length === 7) {
        for (const key of ["voltage_scale", "voltage_divisions", "time_scale", "period_divisions"]) {
          const values = parsed.data[key]
          parsed.data[key] = [5, 4, 6, 3].map((index) => values?.[index] ?? "")
        }
      }
      return {
        data: Object.fromEntries(experiment.measurements.map((item) => [
          item.id, experiment.id === "forced-vibration" && Array.isArray(parsed.data?.[item.id])
            ? parsed.data[item.id].slice()
            : Array.from({ length: item.count }, (_, index) => parsed.data?.[item.id]?.[index] ?? fallback.data[item.id][index]),
        ])),
        parameters: Object.fromEntries(experiment.parameters.map((item) => [item.id, parsed.parameters?.[item.id] ?? fallback.parameters[item.id]])),
        reportInfo: Object.fromEntries(REPORT_INFO_FIELDS.map((item) => [item.id, parsed.reportInfo?.[item.id] ?? fallback.reportInfo[item.id]])),
      }
    }
  } catch { /* Corrupt or unavailable local storage falls back to previous values. */ }
  return fallback
}
