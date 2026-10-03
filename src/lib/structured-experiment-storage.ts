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
    const raw = localStorage.getItem(`phyexp_report_${experiment.id}`)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SavedExperimentValues>
      return {
        data: Object.fromEntries(experiment.measurements.map((item) => [
          item.id, Array.from({ length: item.count }, (_, index) => parsed.data?.[item.id]?.[index] ?? fallback.data[item.id][index]),
        ])),
        parameters: Object.fromEntries(experiment.parameters.map((item) => [item.id, parsed.parameters?.[item.id] ?? fallback.parameters[item.id]])),
        reportInfo: Object.fromEntries(REPORT_INFO_FIELDS.map((item) => [item.id, parsed.reportInfo?.[item.id] ?? fallback.reportInfo[item.id]])),
      }
    }
  } catch { /* Corrupt or unavailable local storage falls back to previous values. */ }
  return fallback
}
