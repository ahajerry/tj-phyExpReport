import type { ReactNode } from "react"

type Cell = (key: string, index: number) => ReactNode
const head = (labels: string[]) => <thead><tr>{labels.map((label) => <th key={label} className="whitespace-nowrap p-2">{label}</th>)}</tr></thead>

export function MillikanReadings({ readingCell, disabled }: { readingCell: Cell; disabled: boolean }) {
  return <fieldset disabled={disabled} className="min-w-0 overflow-x-auto rounded-xl border bg-white p-4">
    <h2 className="mb-2 font-semibold">油滴仪原始记录</h2>
    <p className="mb-3 text-sm text-muted-foreground">与 CSV 一致，每颗油滴连续 4 行。填写 3 至 8 颗，未使用的油滴整组留空。当前电压和仪器电荷量可留空；仪器电荷量仅作原始记录，报告会重新计算电荷量。</p>
    <table className="w-full text-center text-sm">
      {head(["油滴", "次数", "当前电压 Uc / V（选填）", "平衡电压 U / V", "时间 t / s", "仪器电荷量 / C（选填）"])}
      {Array.from({ length: 8 }, (_, drop) => <tbody key={drop} aria-label={`第 ${drop + 1} 颗油滴`}>
        {Array.from({ length: 4 }, (_, trial) => <tr key={trial} className="border-t">
          {trial === 0 && <th rowSpan={4} className="p-2 font-normal">{drop + 1}</th>}
          <th className="p-2 font-normal">{trial + 1}</th>
          {["current_voltage", "balance_voltage", "fall_time", "instrument_charge"].map((key) =>
            <td key={key} className="p-2">{readingCell(key, drop * 4 + trial)}</td>)}
        </tr>)}
      </tbody>)}
    </table>
  </fieldset>
}

type TorsionProps = { readingCell: Cell; parameterCell: (key: string) => ReactNode; disabled: boolean }
export function TorsionReadings({ readingCell, parameterCell, disabled }: TorsionProps) {
  const geometry = (keys: string[]) => <table className="mb-4 w-full text-center text-sm">
    {head(["待测物 / 尺寸", "质量 / kg", "尺寸1 / cm", "尺寸2 / cm", "尺寸3 / cm"])}
    <tbody>{keys.map((key) => <tr key={key} className="border-t">
      <th className="whitespace-nowrap p-2 font-normal">{{ cylinder: "塑料圆柱直径", tube_inner: "金属圆筒内径", tube_outer: "金属圆筒外径", ball: "圆球直径", rod: "金属细杆长度" }[key]}</th>
      <td className="p-2">{key === "tube_outer" ? "同上" : parameterCell(`mass_${key === "tube_inner" ? "tube" : key}_kg`)}</td>
      {[0, 1, 2].map((trial) => <td key={trial} className="p-2">{readingCell(`size_${key}_cm`, trial)}</td>)}
    </tr>)}</tbody>
  </table>
  const timing = (keys: string[]) => <table className="w-full text-center text-sm">
    {head(["待测物", "周期数", "时长1 / s", "时长2 / s", "时长3 / s"])}
    <tbody>{keys.map((key) => <tr key={key} className="border-t">
      <th className="whitespace-nowrap p-2 font-normal">{{ cylinder: "塑料圆柱", disk: "载物盘", tube: "金属圆筒", ball: "圆球", rod: "金属细杆" }[key]}</th>
      <td className="p-2">{key === "disk" ? 20 : 10}</td>
      {[0, 1, 2].map((trial) => <td key={trial} className="p-2">{readingCell(`time_${key}`, trial)}</td>)}
    </tr>)}</tbody>
  </table>
  return <fieldset disabled={disabled} className="min-w-0 space-y-4">
    <section className="overflow-x-auto rounded-xl border bg-white p-4">
      <h2 className="mb-3 font-semibold">1. 测量弹簧扭转常数和载物盘转动惯量</h2>
      {geometry(["cylinder"])}
      {timing(["cylinder", "disk"])}
    </section>
    <section className="overflow-x-auto rounded-xl border bg-white p-4">
      <h2 className="mb-3 font-semibold">2. 测量不同刚体的转动惯量</h2>
      {geometry(["tube_inner", "tube_outer", "ball", "rod"])}
      {timing(["tube", "ball", "rod"])}
    </section>
    <section className="overflow-x-auto rounded-xl border bg-white p-4">
      <h2 className="mb-3 font-semibold">3. 验证平行轴定理</h2>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm"><span>滑块1质量 / kg</span>{parameterCell("slider_mass_1_kg")}</label>
        <label className="space-y-1 text-sm"><span>滑块2质量 / kg</span>{parameterCell("slider_mass_2_kg")}</label>
        <label className="space-y-1 text-sm sm:col-span-2"><span>两滑块绕通过质心转轴的转动惯量 / ×10⁻⁴ kg·m²</span>{parameterCell("slider_pair_inertia_scaled")}</label>
      </div>
      <table className="w-full text-center text-sm">
        {head(["距离中心 / cm", "周期数", "时长1 / s", "时长2 / s", "时长3 / s"])}
        <tbody>{[5, 10, 15, 20].map((distance) => <tr key={distance} className="border-t">
          <th className="p-2 font-normal">{distance}</th><td className="p-2">5</td>
          {[0, 1, 2].map((trial) => <td key={trial} className="p-2">{readingCell(`slider_time_${distance}`, trial)}</td>)}
        </tr>)}</tbody>
      </table>
    </section>
  </fieldset>
}
