import type { ReactNode } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { forcedVibrationPreview, previewNumber } from "@/lib/forced-vibration-preview"

type Props = {
  readingCell: (key: string, index: number) => ReactNode
  data: Record<string, string[]>
  dampingSetting: string
  onDampingSettingChange: (value: string) => void
  disabled: boolean
  freeCount: number
  trialCount: number
  forcedCount: number
  onResize: (section: "free" | "damped" | "forced", count: number) => void
}

export function ForcedVibrationReadings({ readingCell, data, dampingSetting, onDampingSettingChange, disabled, freeCount, trialCount, forcedCount, onResize }: Props) {
  const preview = forcedVibrationPreview(data)
  const headers = (labels: string[]) => <thead><tr>{labels.map((label, index) =>
    <th key={index} className="whitespace-nowrap p-2">{label}</th>)}</tr></thead>
  const controls = (section: "free" | "damped" | "forced", count: number, min: number) =>
    <div className="mt-3 flex items-center gap-3">
      <Button type="button" variant="outline" onClick={() => onResize(section, count + 1)}>增加一组</Button>
      <Button type="button" variant="outline" disabled={count <= min} onClick={() => onResize(section, count - 1)}>删除末组</Button>
      <span className="text-sm text-muted-foreground">当前 {count} 组（至少 {min} 组）</span>
    </div>
  return <fieldset disabled={disabled} className="min-w-0 space-y-4">
    <details className="rounded-xl border bg-white p-4">
      <summary className="cursor-pointer font-semibold">实验内容与步骤</summary>
      <div className="mt-3 space-y-3 text-sm leading-7">
        <p><strong>5.1 自由振动：</strong>将摆轮转至约 160°，放手后开启测量，记录从 160° 衰减至 50° 的振幅 θ 与自由周期 T₀。仪器仅在周期变化时保存对应振幅，回查表中不一定包含每个振幅。此对应表用于后续理论相位计算。</p>
        <p><strong>5.2 阻尼振动：</strong>选择阻尼档位（阻尼 1 最小），将角度盘指针置于 0°，摆轮转至约 160°，从约 150° 开始记录。每次填写十个连续振幅与 10T 计时，按相隔五周期的振幅计算对数逐差；建议测量 2–3 组后取阻尼系数平均值。</p>
        <p><strong>5.3 受迫振动：</strong>保持阻尼档位，打开电机，将强迫力周期旋钮调至约 4–6。待振幅不变且摆轮周期与电机周期基本一致后，记录振幅、10T 和频闪相位读数。从约 30° 或 150° 起，沿同一方向逐点调节；共振附近加密测点。相位范围约 30°–150°，建议测量 15 组以上。</p>
        <p>每次改变强迫力周期后须重新等待稳定，摆轮与电机周期差一般不大于 0.003 s。测量状态显示“关”后再使用闪光灯读取相位，避免闪光脉冲干扰光电门采集。</p>
      </div>
    </details>
    <section className="overflow-x-auto rounded-xl border bg-white p-4">
      <h2 className="mb-2 font-semibold">表 3.4.1 近似自由振动的振幅 θ 与周期 T₀ 的关系</h2>
      <p className="mb-3 text-sm text-muted-foreground">空气阻尼使振幅缓慢衰减，通常测量 160° 至 50°。弹性力矩系数随振幅略有变化，理论相位需按各点振幅查取 T₀；没有相同振幅时用相邻两点内插。可按实际数量增减，导入 Excel 时各列依次续接。</p>
      <table className="w-full text-center text-sm">
        {headers(["序号", "振幅 θ / °", "自由周期 T₀ / s"])}
        <tbody>{Array.from({ length: freeCount }, (_, row) => <tr key={row} className="border-t">
          <th className="p-2 font-normal">{row + 1}</th>
          {["free_angle", "free_period"].map((key) =>
            <td key={key} className="p-2">{readingCell(key, row)}</td>)}
        </tr>)}</tbody>
      </table>
      {controls("free", freeCount, 2)}
    </section>
    <section className="overflow-x-auto rounded-xl border bg-white p-4">
      <h2 className="mb-3 font-semibold">表 3.4.2 振幅衰减规律的对数逐差法计算表</h2>
      <label className="mb-3 flex max-w-xs items-center gap-3 text-sm">
        <span className="shrink-0">阻尼档位</span>
        <Input type="number" step="any" aria-label="阻尼档位" value={dampingSetting} onChange={(event) => onDampingSettingChange(event.target.value)} />
      </label>
      <p className="mb-3 text-sm text-muted-foreground">每次测量填写 10 个周期的总时间 10T，系统自动除以 10。每行的两个峰值相隔 5 个周期。</p>
      <table className="w-full text-center text-sm">
        {headers(["测量组", "10T / s", "次数 i", "振幅 θᵢ / °", "次数 i+5", "振幅 θᵢ₊₅ / °", "ln(θᵢ/θᵢ₊₅)"])}
        {Array.from({ length: trialCount }, (_, trial) => <tbody key={trial} aria-label={`第 ${trial + 1} 次阻尼测量`}>
          {Array.from({ length: 5 }, (_, row) => <tr key={row} className="border-t">
            {row === 0 && <>
              <th rowSpan={5} className="p-2 font-normal">{trial + 1}</th>
              <td rowSpan={5} className="p-2">{readingCell("damped_time_10", trial)}</td>
            </>}
            <th className="p-2 font-normal">{row + 1}</th>
            <td className="p-2">{readingCell("damped_peak", trial * 10 + row)}</td>
            <th className="p-2 font-normal">{row + 6}</th>
            <td className="p-2">{readingCell("damped_peak", trial * 10 + row + 5)}</td>
            <td className="p-2">{previewNumber(preview.trials[trial].logs[row])}</td>
          </tr>)}
          <tr className="border-t bg-muted/40"><td colSpan={7} className="p-2 text-left">
            第 {trial + 1} 组：平均周期 T̄ = {previewNumber(preview.trials[trial].period)} s；
            对数比均值 = {previewNumber(preview.trials[trial].meanLog)}；
            β = {previewNumber(preview.trials[trial].beta, 6)} s⁻¹
          </td></tr>
        </tbody>)}
      </table>
      <p className="mt-3 text-sm">β = 对数比均值 / (5T̄)。各组 β 平均值：{previewNumber(preview.beta, 6)} s⁻¹。</p>
      {controls("damped", trialCount, 1)}
    </section>
    <section className="overflow-x-auto rounded-xl border bg-white p-4">
      <h2 className="mb-3 font-semibold">表 3.4.3 幅频特性和相频特性测量数据记录表</h2>
      <p className="mb-3 text-sm text-muted-foreground">填写强迫力矩的十周期总时间 10T，系统除以 10 得到 T。相位填写仪器正读数 α（0–180°），报告中的相位差 φ = −α。频率比取 ω/ωᵣ = Tᵣ/T，θᵣ 为实测最大振幅。理论相位按各点振幅对应的 T₀ 计算；超出自由振动测量范围时提示补测。</p>
      <table className="w-full text-center text-sm">
        {headers(["序号", "强迫力矩周期 10T / s", "相位滞后角 α / °", "振幅 θ / °", "ω/ωᵣ", "(θ/θᵣ)²", "查表 T₀ / s", "理论相位 φₘ / °"])}
        <tbody>{Array.from({ length: forcedCount }, (_, row) => <tr key={row} className="border-t">
          <th className="p-2 font-normal">{row + 1}</th>
          <td className="p-2">{readingCell("drive_time_10", row)}</td>
          <td className="p-2">{readingCell("phase", row)}</td>
          <td className="p-2">{readingCell("amplitude", row)}</td>
          <td className="p-2">{previewNumber(preview.rows[row].frequencyRatio)}</td>
          <td className="p-2">{previewNumber(preview.rows[row].power)}</td>
          <td className="p-2">{previewNumber(preview.rows[row].t0)}</td>
          <td className="p-2">{preview.rows[row].t0 === null && data.amplitude[row]?.trim() ? "需补测" : previewNumber(preview.rows[row].theory, 1)}</td>
        </tr>)}</tbody>
      </table>
      {controls("forced", forcedCount, 3)}
      {forcedCount < 15 && <p className="mt-2 text-sm text-muted-foreground">资料建议测量 15 组以上，并覆盖共振峰两侧。</p>}
    </section>
    <section className="space-y-3 rounded-xl border bg-white p-4 text-sm leading-7">
      <h2 className="font-semibold">数据处理：作图法求阻尼系数</h2>
      <p>报告绘制 (θ/θᵣ)²–ω/ωᵣ 幅频曲线与 φ–ω/ωᵣ 相频曲线。在小阻尼、共振附近，(θ/θᵣ)² ≈ β² / [(ω−ω₀)²+β²]。取半峰高 (θ/θᵣ)² = 1/2 对应的两个圆频率 ω₁、ω₂，计算 β图 = (ω₂−ω₁)/2。</p>
      <p>后端按圆频率排序，在峰值两侧分别内插半峰高交点，并将 β图 与逐差法 β 比较。未测到两侧交点时，报告提示补测，不外推。</p>
    </section>
    <details className="rounded-xl border bg-white p-4 text-sm leading-7">
      <summary className="cursor-pointer font-semibold">讨论与分析：系统误差</summary>
      <p className="mt-3">仪器采用石英晶体计时，周期测量误差可忽略，主要误差来自阻尼系数 β 和固有频率 ω₀ 的确定，后者影响较大。弹簧的弹性系数 k 受制造工艺和材料性能影响，随扭转角度有约 3% 的微小变化，使不同振幅下的固有频率不同。</p>
      <p className="mt-3">若统一使用平均固有频率，共振附近的理论相位与实测相位可能相差很大。因此在 φₘ = arctan[−βT₀²T / π(T²−T₀²)] 中，对每个受迫振幅查表或内插对应 T₀，并按滞后相位取负值，可减小系统误差。</p>
    </details>
  </fieldset>
}
