import type { ReactNode } from "react"

export function LensReadings({ readingCell, direction, onDirectionChange, disabled }: {
  readingCell: (key: string, index: number) => ReactNode
  direction: string
  onDirectionChange: (value: string) => void
  disabled: boolean
}) {
  const reversed = direction === "-1"
  const methods = [
    { title: "① 物距像距法（直接法）", note: `前两次成放大像，第三次成缩小像。${reversed ? "u = 物屏位置 − 透镜位置，v = 透镜位置 − 像屏位置" : "u = 透镜位置 − 物屏位置，v = 像屏位置 − 透镜位置"}，f = uv / (u + v)。`,
      keys: ["single_object", "single_lens", "single_image"], labels: ["物屏位置", "透镜位置", "像屏位置"] },
    { title: "② 共轭法（位移法）", note: `物屏与像屏固定，分别记录成大像和成小像时的透镜位置。${reversed ? "L = 物屏位置 − 像屏位置，D = 成大像时透镜位置 − 成小像时透镜位置" : "L = 像屏位置 − 物屏位置，D = 成小像时透镜位置 − 成大像时透镜位置"}，f = (L² − D²) / (4L)。`,
      keys: ["bessel_object", "bessel_image", "bessel_lens_large", "bessel_lens_small"], labels: ["物屏位置", "像屏位置", "成大像时透镜位置", "成小像时透镜位置"] },
    { title: "③ 自准直法（平面镜法）", note: `调节至返回像与物重合。f = ${reversed ? "物屏位置 − 透镜位置" : "透镜位置 − 物屏位置"}（物在焦平面）。`,
      keys: ["auto_object", "auto_lens"], labels: ["物屏位置", "透镜位置"] },
  ]
  function table(keys: string[], labels: string[]) {
    return <div className="overflow-x-auto"><table className="w-full text-center text-sm">
      <thead><tr><th className="whitespace-nowrap p-2">次数</th>{labels.map((label) => <th key={label} className="whitespace-nowrap p-2">{label} / mm</th>)}</tr></thead>
      <tbody>{[0, 1, 2].map((index) => <tr key={index} className="border-t">
        <th className="p-2 font-normal">{index + 1}</th>{keys.map((key) => <td key={key} className="p-2">{readingCell(key, index)}</td>)}
      </tr>)}</tbody>
    </table></div>
  }
  return <section className="space-y-4">
    <fieldset disabled={disabled} className="rounded-xl border bg-white p-4">
      <legend className="px-1 font-semibold">物屏所在侧</legend>
      <div className="flex flex-wrap gap-4 text-sm">
        {[["1", "物屏在左侧（坐标最小）"], ["-1", "物屏在右侧（坐标最大）"]].map(([value, label]) =>
          <label key={value} className="flex items-center gap-2">
            <input type="radio" name="lens-direction" value={value} checked={direction === value}
              onChange={() => onDirectionChange(value)} />{label}
          </label>)}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">按导轨坐标大小选择，适用于以下三种方法。切换只改变距离计算方向，已填的原始坐标保持不变。</p>
      <p className="mt-2 text-sm">{reversed ? "共轭法坐标顺序：物屏 > 成大像时透镜 > 成小像时透镜 > 像屏。" : "共轭法坐标顺序：物屏 < 成大像时透镜 < 成小像时透镜 < 像屏。"}</p>
    </fieldset>
    {methods.map((method) => <div key={method.title} className="rounded-xl border bg-white p-4">
      <h2 className="mb-2 font-semibold">{method.title}</h2>
      <p className="mb-3 text-sm text-muted-foreground">{method.note}</p>
      {table(method.keys, method.labels)}
    </div>)}
  </section>
}
