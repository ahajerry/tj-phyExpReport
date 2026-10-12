import type { ReactNode } from "react"
import { Input } from "@/components/ui/input"

type Props = {
  readingCell: (key: string, index: number) => ReactNode
  dampingSetting: string
  onDampingSettingChange: (value: string) => void
  disabled: boolean
}

export function ForcedVibrationReadings({ readingCell, dampingSetting, onDampingSettingChange, disabled }: Props) {
  const headers = (labels: string[]) => <thead><tr>{labels.map((label, index) =>
    <th key={index} className="whitespace-nowrap p-2">{label}</th>)}</tr></thead>
  return <fieldset disabled={disabled} className="min-w-0 space-y-4">
    <section className="overflow-x-auto rounded-xl border bg-white p-4">
      <h2 className="mb-2 font-semibold">1. 振幅与周期关系</h2>
      <p className="mb-3 text-sm text-muted-foreground">与 Excel 相同，每列 30 组，按左、中、右依次续接，共 90 组。</p>
      <table className="w-full text-center text-sm">
        {headers(["振幅 θ / °", "自由周期 T₀ / s", "振幅 θ / °", "自由周期 T₀ / s", "振幅 θ / °", "自由周期 T₀ / s"])}
        <tbody>{Array.from({ length: 30 }, (_, row) => <tr key={row} className="border-t">
          {[0, 30, 60].flatMap((offset) => ["free_angle", "free_period"].map((key) =>
            <td key={`${offset}-${key}`} className="p-2">{readingCell(key, row + offset)}</td>))}
        </tr>)}</tbody>
      </table>
    </section>
    <section className="overflow-x-auto rounded-xl border bg-white p-4">
      <h2 className="mb-3 font-semibold">2. 阻尼系数 β 的测量</h2>
      <label className="mb-3 flex max-w-xs items-center gap-3 text-sm">
        <span className="shrink-0">阻尼档位</span>
        <Input type="number" step="any" aria-label="阻尼档位" value={dampingSetting} onChange={(event) => onDampingSettingChange(event.target.value)} />
      </label>
      <p className="mb-3 text-sm text-muted-foreground">每次测量填写 10 个周期的总时间 10T，系统自动除以 10。每行的两个峰值相隔 5 个周期。</p>
      <table className="w-full text-center text-sm">
        {headers(["测量组", "10T / s", "序号 n", "振幅 θₙ / °", "振幅 θₙ₊₅ / °"])}
        {Array.from({ length: 3 }, (_, trial) => <tbody key={trial} aria-label={`第 ${trial + 1} 次阻尼测量`}>
          {Array.from({ length: 5 }, (_, row) => <tr key={row} className="border-t">
            {row === 0 && <>
              <th rowSpan={5} className="p-2 font-normal">{trial + 1}</th>
              <td rowSpan={5} className="p-2">{readingCell("damped_time_10", trial)}</td>
            </>}
            <th className="p-2 font-normal">{row + 1}</th>
            <td className="p-2">{readingCell("damped_peak", trial * 10 + row)}</td>
            <td className="p-2">{readingCell("damped_peak", trial * 10 + row + 5)}</td>
          </tr>)}
        </tbody>)}
      </table>
    </section>
    <section className="overflow-x-auto rounded-xl border bg-white p-4">
      <h2 className="mb-3 font-semibold">3. 强迫振动的幅频响应和相频响应</h2>
      <p className="mb-3 text-sm text-muted-foreground">周期填写单周期 T；若仪器显示 10T，请先除以 10。相位填写仪器的正读数 α（0–180°），报告按 φ = −α 换算。理论相位按各点振幅查取对应的 T₀。</p>
      <table className="w-full text-center text-sm">
        {headers(["序号", "强迫力矩周期 T / s", "振幅 θ / °", "相位滞后角读数 α / °"])}
        <tbody>{Array.from({ length: 20 }, (_, row) => <tr key={row} className="border-t">
          <th className="p-2 font-normal">{row + 1}</th>
          <td className="p-2">{readingCell("drive_period", row)}</td>
          <td className="p-2">{readingCell("amplitude", row)}</td>
          <td className="p-2">{readingCell("phase", row)}</td>
        </tr>)}</tbody>
      </table>
    </section>
  </fieldset>
}
