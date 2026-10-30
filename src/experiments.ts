type ExperimentGroup = { title: string; items: { id: string; title: string }[] }

export const experimentGroups: ExperimentGroup[] = [
  {
    title: "力学实验",
    items: [
      { id: "young-modulus", title: "杨氏弹性模量" },
      { id: "forced-vibration", title: "用波尔共振仪研究物体受迫振动" },
      { id: "moment-of-inertia", title: "用扭摆法测量物体转动惯量" },
    ],
  },
  { title: "热学实验", items: [{ id: "heat-capacity-ratio", title: "空气比热容比的测定" }] },
  { title: "电磁学实验", items: [{ id: "oscilloscope", title: "阴极射线示波器" }] },
  { title: "声学实验", items: [{ id: "speed-of-sound", title: "声速测定" }] },
  { title: "光学实验", items: [{ id: "focal-length", title: "透镜焦距的测量" }] },
  { title: "近代物理实验", items: [{ id: "millikan", title: "密立根油滴实验" }] },
] 

export const experimentItems = experimentGroups.flatMap((group) => group.items)
