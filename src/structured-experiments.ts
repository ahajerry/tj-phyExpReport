export type MeasurementSpec = { id: string; label: string; unit: string; count: number; rowLabels?: string[]; optional?: boolean }
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
    id: "oscilloscope", title: "阴极射线示波器",
    note: "按原始记录表输入方波、正弦波、三角波、半波四种波形的电压档位、纵向跨度、时基档位和周期跨度；峰峰值（V）、周期（ms）和频率（kHz）自动计算。李萨如法输入四组 fx（kHz）、ny、nx，按 fy = nx/ny × fx 计算。四组与正弦波周期测量应使用频率不变的同一待测信号。可附最多两张原始记录图片。",
    measurements: [
      ...[
        { id: "voltage_scale", label: "波形电压档位 Sy", unit: "V/div" },
        { id: "voltage_divisions", label: "峰峰值纵向跨度 NU", unit: "div" },
        { id: "time_scale", label: "波形时基档位 Sx", unit: "ms/div" },
        { id: "period_divisions", label: "单周期横向跨度 NT", unit: "div" },
      ].map((item) => ({ ...item, count: 4,
        rowLabels: ["方波", "正弦波", "三角波", "半波"] })),
      { id: "reference_frequency", label: "李萨如法 X 参考频率 fx", unit: "kHz", count: 4 },
      { id: "ny", label: "垂直线切点数 ny", unit: "个", count: 4 },
      { id: "nx", label: "水平线切点数 nx", unit: "个", count: 4 },
    ],
    parameters: [
      { id: "probe_factor", label: "波形测量的探头倍数 K（直连取 1）", unit: "倍", initial: "1", minExclusive: 0 },
    ],
  },
  {
    id: "speed-of-sound", title: "声速测定",
    note: "共振干涉法与相位比较法各输入 20 个位置读数；频率及误差按 Hz、位置及游标卡尺误差按 mm 输入。报告计算逐差波长、声速、不确定度、理论声速和百分差。",
    legacyCookieData: true,
    measurements: [
      { id: "resonance", label: "共振干涉法位置", unit: "mm", count: 20 },
      { id: "phase", label: "相位比较法位置", unit: "mm", count: 20 },
    ],
    parameters: [
      { id: "caliper_error", label: "游标卡尺仪器误差 Δl", unit: "mm", initial: "0.02", minExclusive: 0 },
      { id: "res_t_start", label: "共振干涉法开始室温", unit: "°C", minExclusive: -273 },
      { id: "res_t_end", label: "共振干涉法结束室温", unit: "°C", minExclusive: -273 },
      { id: "res_frequency", label: "共振干涉法信号频率", unit: "Hz", minExclusive: 0 },
      { id: "res_frequency_error", label: "共振干涉法频率误差 Δf", unit: "Hz", min: 0 },
      { id: "phase_t_start", label: "相位比较法开始室温", unit: "°C", minExclusive: -273 },
      { id: "phase_t_end", label: "相位比较法结束室温", unit: "°C", minExclusive: -273 },
      { id: "phase_frequency", label: "相位比较法信号频率", unit: "Hz", minExclusive: 0 },
      { id: "phase_frequency_error", label: "相位比较法频率误差 Δf", unit: "Hz", min: 0 },
    ],
  },
  {
    id: "heat-capacity-ratio", title: "空气比热容比的测定",
    note: "按官方资料使用振动法；直径和周期各测量五次。压强用 kPa、容积用 L 输入。",
    measurements: [
      { id: "diameter_initial", label: "直径初读数", unit: "mm", count: 5 },
      { id: "diameter_final", label: "直径末读数", unit: "mm", count: 5 },
      { id: "time_100", label: "100T 总时长", unit: "s / 100 周期", count: 5 },
    ],
    parameters: [
      { id: "mass_g", label: "小球质量", unit: "g" },
      { id: "volume_l", label: "储气瓶容积", unit: "L", initial: "2.650" },
      { id: "pressure_start_kpa", label: "起始大气压", unit: "kPa" },
      { id: "pressure_end_kpa", label: "终止大气压", unit: "kPa" },
      { id: "mass_error_g", label: "质量仪器误差", unit: "g" },
      { id: "pressure_error_kpa", label: "气压仪器误差", unit: "kPa" },
    ],
  },
  {
    id: "millikan", title: "密立根油滴实验",
    note: "按 CSV 数据文件逐行填写当前电压、平衡电压、下降时间及仪器电荷量，每颗油滴四行，共 3 至 8 颗。上传文件可自动填入下方表格，所有记录均可修改；计算使用每颗油滴四次平衡电压的平均值。",
    measurements: [
      { id: "current_voltage", label: "当前电压", unit: "V", count: 32, optional: true },
      { id: "balance_voltage", label: "平衡电压", unit: "V", count: 32 },
      { id: "fall_time", label: "下降时间", unit: "s", count: 32 },
      { id: "instrument_charge", label: "仪器电荷量", unit: "C", count: 32, optional: true },
    ], parameters: [],
  },
  {
    id: "moment-of-inertia", title: "用扭摆法测定物体转动惯量",
    note: "按 XLSX 数据文件填写质量（kg）、三次尺寸（cm）、三次计时（s）、两个滑块质量及两滑块自身惯量。上传文件可自动填入全部记录并继续修改。空盘计时 20 周期，其他物体 10 周期，滑块 5 周期；平均尺寸和单位换算由系统完成。",
    measurements: [
      ...["cylinder", "tube_inner", "tube_outer", "ball", "rod"].map((key, index) => ({
        id: `size_${key}_cm`, label: ["圆柱直径", "圆筒内径", "圆筒外径", "圆球直径", "细杆长度"][index], unit: "cm", count: 3,
      })),
      ...(["disk", "cylinder", "tube", "ball", "rod"] as const).map((key, i) => ({
        id: `time_${key}`, label: ["载物圆盘", "实心圆柱", "空心圆筒", "木球", "金属细杆"][i], unit: key === "disk" ? "s / 20 周期" : "s / 10 周期", count: 3,
      })),
      ...[5, 10, 15, 20].map((x) => ({ id: `slider_time_${x}`, label: `滑块距轴 ${x} cm`, unit: "s / 5 周期", count: 3 })),
    ],
    parameters: [
      ...["cylinder", "tube", "ball", "rod"].map((key, index) => ({
        id: `mass_${key}_kg`, label: ["圆柱质量", "圆筒质量", "圆球质量", "细杆质量"][index], unit: "kg", minExclusive: 0,
      })),
      { id: "slider_mass_1_kg", label: "滑块1质量", unit: "kg", minExclusive: 0 },
      { id: "slider_mass_2_kg", label: "滑块2质量", unit: "kg", minExclusive: 0 },
      { id: "slider_pair_inertia_scaled", label: "两滑块绕质心转轴的转动惯量", unit: "×10⁻⁴ kg·m²", initial: "0", min: 0 },
    ],
  },
  {
    id: "young-modulus", title: "金属丝杨氏模量的测定",
    note: "按新模板记录加卸载各十级和五组直径初、末读数，计算逐差法与图解法。预载不计入作用质量；L、D、K 的误差按模板为 0.1、0.2、0.02 cm。",
    measurements: [
      { id: "load_up", label: "加载标尺像位置", unit: "cm", count: 10 },
      { id: "load_down", label: "卸载标尺像位置", unit: "cm", count: 10 },
      { id: "diameter_initial", label: "直径初读数", unit: "mm", count: 5 },
      { id: "diameter_final", label: "直径末读数", unit: "mm", count: 5 },
    ],
    parameters: [
      { id: "mass_step_kg", label: "每级质量增量", unit: "kg", initial: "0.500" },
      { id: "preload_kg", label: "预载质量", unit: "kg", initial: "0" },
      { id: "wire_length_cm", label: "金属丝长度 L", unit: "cm" },
      { id: "mirror_distance_cm", label: "镜尺距离 D", unit: "cm" },
      { id: "lever_arm_cm", label: "光杠杆臂长 K", unit: "cm" },
      { id: "gravity_ms2", label: "当地重力加速度", unit: "m/s²", initial: "9.794" },
      { id: "reference_modulus_pa", label: "参考杨氏模量", unit: "Pa", initial: "1.85e11" },
      { id: "diameter_error_mm", label: "测微计仪器误差 Δ仪", unit: "mm", initial: "0.004" },
      { id: "scale_error_cm", label: "逐差位移仪器误差 Δ仪", unit: "cm", initial: "0.05" },
    ],
  },
  {
    id: "forced-vibration", title: "用波尔共振仪研究物体受迫振动",
    note: "按表 3.4.1–3.4.3 记录自由振动、阻尼振动和受迫振动数据。阻尼与强迫力矩计时均填写 10T；报告计算逐差法与半峰宽作图法的阻尼系数，并按振幅查表校正理论相位。可上传 XLSX 后继续修改。",
    measurements: [
      { id: "free_angle", label: "自由振动振幅", unit: "°", count: 10 },
      { id: "free_period", label: "自由振动周期", unit: "s", count: 10 },
      { id: "damped_peak", label: "阻尼振动峰值", unit: "°", count: 10 },
      { id: "damped_time_10", label: "阻尼振动 10T 计时", unit: "s", count: 1 },
      { id: "drive_time_10", label: "强迫力矩周期 10T", unit: "s", count: 15 },
      { id: "amplitude", label: "稳定振幅", unit: "°", count: 15 },
      { id: "phase", label: "相位滞后角读数 α", unit: "°", count: 15 },
    ], parameters: [{ id: "damping_setting", label: "阻尼档位", unit: "档" }],
  },
  {
    id: "focal-length", title: "透镜焦距的测量",
    note: "按原始记录单填写三种方法的位置读数，各三组，单位 mm；距离和焦距自动计算。物距像距法前两次成放大像，第三次成缩小像。",
    measurements: [
      { id: "single_object", label: "物距像距法物屏位置", unit: "mm", count: 3 },
      { id: "single_lens", label: "物距像距法透镜位置", unit: "mm", count: 3 },
      { id: "single_image", label: "物距像距法像屏位置", unit: "mm", count: 3 },
      { id: "bessel_object", label: "共轭法物屏位置", unit: "mm", count: 3 },
      { id: "bessel_image", label: "共轭法像屏位置", unit: "mm", count: 3 },
      { id: "bessel_lens_large", label: "共轭法成大像时透镜位置", unit: "mm", count: 3 },
      { id: "bessel_lens_small", label: "共轭法成小像时透镜位置", unit: "mm", count: 3 },
      { id: "auto_object", label: "自准直法物屏位置", unit: "mm", count: 3 },
      { id: "auto_lens", label: "自准直法透镜位置", unit: "mm", count: 3 },
    ], parameters: [{ id: "position_direction", label: "物屏位置方向", unit: "", initial: "1" }],
  },
]

export const structuredExperimentById = new Map(structuredExperiments.map((experiment) => [experiment.id, experiment]))
