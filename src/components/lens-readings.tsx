import type { ReactNode } from "react"

export function LensReadings({ readingCell }: { readingCell: (key: string, index: number) => ReactNode }) {
  const methods = [
    { title: "① 物距像距法（直接法）", note: "前两次成放大像，第三次成缩小像。u = 透镜位置 − 物屏位置，v = 像屏位置 − 透镜位置，f = uv / (u + v)。",
      keys: ["single_object", "single_lens", "single_image"], labels: ["物屏位置", "透镜位置", "像屏位置"] },
    { title: "② 共轭法（位移法）", note: "物屏与像屏固定，分别记录成大像和成小像时的透镜位置。L = 像屏位置 − 物屏位置，D = 两透镜位置之差，f = (L² − D²) / (4L)。",
      keys: ["bessel_object", "bessel_image", "bessel_lens_large", "bessel_lens_small"], labels: ["物屏位置", "像屏位置", "成大像时透镜位置", "成小像时透镜位置"] },
    { title: "③ 自准直法（平面镜法）", note: "调节至返回像与物重合。f = 透镜位置 − 物屏位置（物在焦平面）。",
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
    {methods.map((method) => <div key={method.title} className="rounded-xl border bg-white p-4">
      <h2 className="mb-2 font-semibold">{method.title}</h2>
      <p className="mb-3 text-sm text-muted-foreground">{method.note}</p>
      {table(method.keys, method.labels)}
    </div>)}
  </section>
}
