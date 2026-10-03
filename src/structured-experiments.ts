export type MeasurementSpec = { id: string; label: string; unit: string; count: number }
export type ParameterSpec = { id: string; label: string; unit: string; initial?: string; min?: number; minExclusive?: number }
export type StructuredExperiment = {
  id: string
  title: string
  note: string
  measurements: MeasurementSpec[]
  parameters: ParameterSpec[]
  legacyCookieData?: boolean
}

export const structuredExperiments: StructuredExperiment[] = [
  {
    id: "speed-of-sound", title: "声速测定",
    note: "共振干涉法与相位比较法各输入 20 个位置读数；频率及误差按 kHz、位置及游标卡尺误差按 mm 输入。报告计算逐差波长、声速、不确定度、理论声速和百分差。",
    legacyCookieData: true,
    measurements: [
      { id: "resonance", label: "共振干涉法位置", unit: "mm", count: 20 },
      { id: "phase", label: "相位比较法位置", unit: "mm", count: 20 },
    ],
    parameters: [
      { id: "caliper_error", label: "游标卡尺仪器误差 Δl", unit: "mm", initial: "0.02", minExclusive: 0 },
      { id: "res_t_start", label: "共振干涉法开始室温", unit: "°C", minExclusive: -273 },
      { id: "res_t_end", label: "共振干涉法结束室温", unit: "°C", minExclusive: -273 },
      { id: "res_frequency", label: "共振干涉法信号频率", unit: "kHz", minExclusive: 0 },
      { id: "res_frequency_error", label: "共振干涉法频率误差 Δf", unit: "kHz", min: 0 },
      { id: "phase_t_start", label: "相位比较法开始室温", unit: "°C", minExclusive: -273 },
      { id: "phase_t_end", label: "相位比较法结束室温", unit: "°C", minExclusive: -273 },
      { id: "phase_frequency", label: "相位比较法信号频率", unit: "kHz", minExclusive: 0 },
      { id: "phase_frequency_error", label: "相位比较法频率误差 Δf", unit: "kHz", min: 0 },
    ],
  },
  {
    id: "heat-capacity-ratio", title: "空气比热容比的测定",
    note: "按官方资料使用振动法；直径和周期各测量五次。压强用 kPa、容积用 L 输入。",
    measurements: [
      { id: "diameter", label: "小球直径", unit: "mm", count: 5 },
      { id: "period", label: "小球振动周期", unit: "s", count: 5 },
    ],
    parameters: [
      { id: "mass_g", label: "小球质量", unit: "g" },
      { id: "volume_l", label: "储气瓶容积", unit: "L", initial: "2.650" },
      { id: "pressure_start_kpa", label: "起始大气压", unit: "kPa" },
      { id: "pressure_end_kpa", label: "终止大气压", unit: "kPa" },
      { id: "diameter_zero_mm", label: "直径零点修正", unit: "mm", initial: "0" },
      { id: "diameter_error_mm", label: "直径仪器误差", unit: "mm" },
      { id: "mass_error_g", label: "质量仪器误差", unit: "g" },
      { id: "period_error_s", label: "周期仪器误差", unit: "s" },
      { id: "pressure_error_kpa", label: "气压仪器误差", unit: "kPa" },
      { id: "volume_error_l", label: "容积误差", unit: "L" },
    ],
  },
  {
    id: "millikan", title: "密立根油滴实验",
    note: "每一行对应一颗油滴；输入平衡电压和四次固定路程的下降时间。计算式采用教材给定的仪器常数。",
    measurements: [
      { id: "voltage", label: "平衡电压", unit: "V", count: 10 },
      ...[1, 2, 3, 4].map((n) => ({ id: `time_${n}`, label: `第 ${n} 次下降时间`, unit: "s", count: 10 })),
    ], parameters: [],
  },
  {
    id: "moment-of-inertia", title: "用扭摆法测定物体转动惯量",
    note: "空盘计时 20 周期，其他物体计时 10 周期，滑块计时 5 周期；每种状态重复三次。滑块位置按质心到转轴距离输入。",
    measurements: [
      ...(["disk", "cylinder", "tube", "ball", "rod"] as const).map((key, i) => ({
        id: `time_${key}`, label: ["载物圆盘", "实心圆柱", "空心圆筒", "木球", "金属细杆"][i], unit: key === "disk" ? "s / 20 周期" : "s / 10 周期", count: 3,
      })),
      ...[5, 10, 15, 20].map((x) => ({ id: `slider_time_${x}`, label: `滑块距轴 ${x} cm`, unit: "s / 5 周期", count: 3 })),
    ],
    parameters: [
      { id: "mass_cylinder_g", label: "圆柱质量", unit: "g" },
      { id: "diameter_cylinder_mm", label: "圆柱直径", unit: "mm" },
      { id: "mass_tube_g", label: "圆筒质量", unit: "g" },
      { id: "diameter_tube_outer_mm", label: "圆筒外径", unit: "mm" },
      { id: "diameter_tube_inner_mm", label: "圆筒内径", unit: "mm" },
      { id: "mass_ball_g", label: "木球质量", unit: "g" },
      { id: "diameter_ball_mm", label: "木球直径", unit: "mm" },
      { id: "mass_rod_g", label: "细杆质量", unit: "g" },
      { id: "length_rod_mm", label: "细杆长度", unit: "mm" },
      { id: "slider_mass_g", label: "单个滑块质量", unit: "g" },
      { id: "slider_self_inertia", label: "单个滑块自身惯量", unit: "kg·m²", initial: "0" },
    ],
  },
  {
    id: "young-modulus", title: "金属丝杨氏模量的测定",
    note: "加载、卸载各十级；直径测五次。逐差法比较第 0–4 级与第 5–9 级。",
    measurements: [
      { id: "load_up", label: "加载标尺像位置", unit: "cm", count: 10 },
      { id: "load_down", label: "卸载标尺像位置", unit: "cm", count: 10 },
      { id: "diameter", label: "金属丝直径", unit: "mm", count: 5 },
    ],
    parameters: [
      { id: "mass_step_kg", label: "每级质量增量", unit: "kg", initial: "0.500" },
      { id: "preload_kg", label: "预载质量", unit: "kg", initial: "0" },
      { id: "wire_length_cm", label: "金属丝长度 L", unit: "cm" },
      { id: "mirror_distance_cm", label: "镜尺距离 D", unit: "cm" },
      { id: "lever_arm_cm", label: "光杠杆臂长 K", unit: "cm" },
      { id: "gravity_ms2", label: "当地重力加速度", unit: "m/s²", initial: "9.794" },
      { id: "reference_modulus_pa", label: "参考杨氏模量", unit: "Pa", initial: "1.85e11" },
    ],
  },
  {
    id: "forced-vibration", title: "用波尔共振仪研究物体受迫振动",
    note: "自由振动十组、阻尼峰值十个、受迫振动十五组。驱动周期和相位差必须一一对应。",
    measurements: [
      { id: "free_angle", label: "自由振动起始角", unit: "°", count: 10 },
      { id: "free_period", label: "自由振动周期", unit: "s", count: 10 },
      { id: "damped_peak", label: "阻尼振动峰值", unit: "°", count: 10 },
      { id: "damped_period", label: "阻尼振动单周期", unit: "s", count: 1 },
      { id: "drive_period", label: "受迫振动驱动周期", unit: "s", count: 15 },
      { id: "amplitude", label: "稳定振幅", unit: "°", count: 15 },
      { id: "phase", label: "相位差", unit: "°", count: 15 },
    ], parameters: [{ id: "damping_setting", label: "阻尼档位", unit: "档" }],
  },
  {
    id: "focal-length", title: "透镜焦距的测量",
    note: "所有位置和距离均用 mm；凹透镜虚物位置应在凹透镜右侧。",
    measurements: [
      { id: "object_distance", label: "单次成像物距", unit: "mm", count: 3 },
      { id: "image_distance", label: "单次成像像距", unit: "mm", count: 3 },
      { id: "bessel_length", label: "共轭法物屏距离 L", unit: "mm", count: 5 },
      { id: "bessel_separation", label: "共轭法两透镜位置差 D", unit: "mm", count: 5 },
      { id: "auto_object", label: "自准直法物位", unit: "mm", count: 5 },
      { id: "auto_lens", label: "自准直法透镜位", unit: "mm", count: 5 },
      { id: "concave_object", label: "凹透镜法虚物位", unit: "mm", count: 5 },
      { id: "concave_lens", label: "凹透镜位", unit: "mm", count: 5 },
      { id: "concave_image", label: "凹透镜法像位", unit: "mm", count: 5 },
    ], parameters: [],
  },
]

export const structuredExperimentById = new Map(structuredExperiments.map((experiment) => [experiment.id, experiment]))
