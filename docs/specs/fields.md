# 字段目录

对应 `src/structured-experiments.ts` 的当前表单配置。读数为字符串数组，参数为字符串；表中的初始数量与前端范围不是全部后端约束，跨字段校验及旧输入见 [实验规则](experiments.md)。所有未声明的范围仍由后端校验。

## 阴极射线示波器（oscilloscope）

| data 字段 | 含义 | 输入单位 | 初始数量 | 可选标记 |
| --- | --- | --- | --- | --- |
| `voltage_scale` | 波形电压档位 Sy；顺序：方波、正弦波、三角波、半波 | V/div | 4 | 否 |
| `voltage_divisions` | 峰峰值纵向跨度 NU；顺序：方波、正弦波、三角波、半波 | div | 4 | 否 |
| `time_scale` | 波形时基档位 Sx；顺序：方波、正弦波、三角波、半波 | ms/div | 4 | 否 |
| `period_divisions` | 单周期横向跨度 NT；顺序：方波、正弦波、三角波、半波 | div | 4 | 否 |
| `reference_frequency` | 李萨如法 X 参考频率 fx | kHz | 4 | 否 |
| `ny` | 垂直线切点数 ny | 个 | 4 | 否 |
| `nx` | 水平线切点数 nx | 个 | 4 | 否 |

| parameters 字段 | 含义 | 单位 | 初始值 | 配置范围 |
| --- | --- | --- | --- | --- |
| `probe_factor` | 波形测量的探头倍数 K（直连取 1） | 倍 | `1` | > 0 |

## 声速测定（speed-of-sound）

| data 字段 | 含义 | 输入单位 | 初始数量 | 可选标记 |
| --- | --- | --- | --- | --- |
| `resonance` | 共振干涉法位置 | mm | 20 | 否 |
| `phase` | 相位比较法位置 | mm | 20 | 否 |

| parameters 字段 | 含义 | 单位 | 初始值 | 配置范围 |
| --- | --- | --- | --- | --- |
| `caliper_error` | 游标卡尺仪器误差 Δl | mm | `0.02` | > 0 |
| `res_t_start` | 共振干涉法开始室温 | °C | 空 | > -273 |
| `res_t_end` | 共振干涉法结束室温 | °C | 空 | > -273 |
| `res_frequency` | 共振干涉法信号频率 | Hz | 空 | > 0 |
| `res_frequency_error` | 共振干涉法频率误差 Δf | Hz | 空 | ≥ 0 |
| `phase_t_start` | 相位比较法开始室温 | °C | 空 | > -273 |
| `phase_t_end` | 相位比较法结束室温 | °C | 空 | > -273 |
| `phase_frequency` | 相位比较法信号频率 | Hz | 空 | > 0 |
| `phase_frequency_error` | 相位比较法频率误差 Δf | Hz | 空 | ≥ 0 |

这里的频率和频率误差是界面单位 Hz；API parameters 与浏览器保存值仍用 kHz（40000 Hz 对应 40）。前端精确换算，报告显示 Hz。

## 空气比热容比的测定（heat-capacity-ratio）

| data 字段 | 含义 | 输入单位 | 初始数量 | 可选标记 |
| --- | --- | --- | --- | --- |
| `diameter_initial` | 直径初读数 | mm | 5 | 否 |
| `diameter_final` | 直径末读数 | mm | 5 | 否 |
| `time_100` | 100T 总时长 | s | 5 | 否 |

| parameters 字段 | 含义 | 单位 | 初始值 | 配置范围 |
| --- | --- | --- | --- | --- |
| `mass_g` | 小球质量 | g | 空 | 大于零 |
| `volume_l` | 储气瓶容积 | L | `2.650` | 大于零 |
| `pressure_start_kpa` | 起始大气压 | kPa | 空 | 大于零 |
| `pressure_end_kpa` | 终止大气压 | kPa | 空 | 大于零 |
| `mass_error_g` | 质量仪器误差 | g | 空 | 非负 |
| `pressure_error_kpa` | 气压仪器误差 | kPa | 空 | 非负 |

## 密立根油滴实验（millikan）

| data 字段 | 含义 | 输入单位 | 初始数量 | 可选标记 |
| --- | --- | --- | --- | --- |
| `current_voltage` | 当前电压 | V | 32 | 是 |
| `balance_voltage` | 平衡电压 | V | 32 | 否 |
| `fall_time` | 下降时间 | s | 32 | 否 |
| `instrument_charge` | 仪器电荷量 | C | 32 | 是 |

`parameters` 为 `{}`；32 行为表单容量，实际输入边界见 [实验规则](experiments.md)。

## 用扭摆法测定物体转动惯量（moment-of-inertia）

| data 字段 | 含义 | 输入单位 | 初始数量 | 可选标记 |
| --- | --- | --- | --- | --- |
| `size_cylinder_cm` | 圆柱直径 | cm | 3 | 否 |
| `size_tube_inner_cm` | 圆筒内径 | cm | 3 | 否 |
| `size_tube_outer_cm` | 圆筒外径 | cm | 3 | 否 |
| `size_ball_cm` | 圆球直径 | cm | 3 | 否 |
| `size_rod_cm` | 细杆长度 | cm | 3 | 否 |
| `time_disk` | 载物圆盘 | s / 20 周期 | 3 | 否 |
| `time_cylinder` | 实心圆柱 | s / 10 周期 | 3 | 否 |
| `time_tube` | 空心圆筒 | s / 10 周期 | 3 | 否 |
| `time_ball` | 木球 | s / 10 周期 | 3 | 否 |
| `time_rod` | 金属细杆 | s / 10 周期 | 3 | 否 |
| `slider_time_5` | 滑块距轴 5 cm | s / 5 周期 | 3 | 否 |
| `slider_time_10` | 滑块距轴 10 cm | s / 5 周期 | 3 | 否 |
| `slider_time_15` | 滑块距轴 15 cm | s / 5 周期 | 3 | 否 |
| `slider_time_20` | 滑块距轴 20 cm | s / 5 周期 | 3 | 否 |

| parameters 字段 | 含义 | 单位 | 初始值 | 配置范围 |
| --- | --- | --- | --- | --- |
| `mass_cylinder_kg` | 圆柱质量 | kg | 空 | > 0 |
| `mass_tube_kg` | 圆筒质量 | kg | 空 | > 0 |
| `mass_ball_kg` | 圆球质量 | kg | 空 | > 0 |
| `mass_rod_kg` | 细杆质量 | kg | 空 | > 0 |
| `slider_mass_1_kg` | 滑块1质量 | kg | 空 | > 0 |
| `slider_mass_2_kg` | 滑块2质量 | kg | 空 | > 0 |
| `slider_pair_inertia_scaled` | 两滑块绕质心转轴的转动惯量 | ×10⁻⁴ kg·m² | `0` | ≥ 0 |

## 金属丝杨氏模量的测定（young-modulus）

| data 字段 | 含义 | 输入单位 | 初始数量 | 可选标记 |
| --- | --- | --- | --- | --- |
| `load_up` | 加载标尺像位置 | cm | 10 | 否 |
| `load_down` | 卸载标尺像位置 | cm | 10 | 否 |
| `diameter_initial` | 直径初读数 | mm | 5 | 否 |
| `diameter_final` | 直径末读数 | mm | 5 | 否 |

| parameters 字段 | 含义 | 单位 | 初始值 | 配置范围 |
| --- | --- | --- | --- | --- |
| `mass_step_kg` | 每级质量增量 | kg | `0.500` | 未声明 |
| `preload_kg` | 预载质量 | kg | `0` | 未声明 |
| `wire_length_cm` | 金属丝长度 L | cm | 空 | 未声明 |
| `mirror_distance_cm` | 镜尺距离 D | cm | 空 | 未声明 |
| `lever_arm_cm` | 光杠杆臂长 K | cm | 空 | 未声明 |
| `gravity_ms2` | 当地重力加速度 | m/s² | `9.794` | 未声明 |
| `reference_modulus_pa` | 参考杨氏模量 | Pa | `1.85e11` | 未声明 |
| `diameter_error_mm` | 测微计仪器误差 Δ仪 | mm | `0.004` | 未声明 |
| `scale_error_cm` | 逐差位移仪器误差 Δ仪 | cm | `0.05` | 未声明 |

## 用波尔共振仪研究物体受迫振动（forced-vibration）

| data 字段 | 含义 | 输入单位 | 初始数量 | 可选标记 |
| --- | --- | --- | --- | --- |
| `free_angle` | 自由振动振幅 | ° | 10 | 否 |
| `free_period` | 自由振动周期 | s | 10 | 否 |
| `damped_peak` | 阻尼振动峰值 | ° | 10 | 否 |
| `damped_time_10` | 阻尼振动 10T 计时 | s | 1 | 否 |
| `drive_period` | 受迫振动驱动周期 | s | 15 | 否 |
| `amplitude` | 稳定振幅 | ° | 15 | 否 |
| `phase` | 相位滞后角读数 α | ° | 15 | 否 |

| parameters 字段 | 含义 | 单位 | 初始值 | 配置范围 |
| --- | --- | --- | --- | --- |
| `damping_setting` | 阻尼档位 | 档 | 空 | 未声明 |

## 透镜焦距的测量（focal-length）

| 字段 | 含义 | 单位 | 数量 |
| --- | --- | --- | --- |
| `single_object` | 物距像距法物屏位置 | mm | 3 |
| `single_lens` | 物距像距法透镜位置 | mm | 3 |
| `single_image` | 物距像距法像屏位置 | mm | 3 |
| `bessel_object` | 共轭法物屏位置 | mm | 3 |
| `bessel_image` | 共轭法像屏位置 | mm | 3 |
| `bessel_lens_large` | 共轭法成大像时透镜位置 | mm | 3 |
| `bessel_lens_small` | 共轭法成小像时透镜位置 | mm | 3 |
| `auto_object` | 自准直法物屏位置 | mm | 3 |
| `auto_lens` | 自准直法透镜位置 | mm | 3 |

当前表单不选择位置方向。旧 `position_direction` 参数的接受范围及计算含义见 [实验规则](experiments.md)。

## 共用封面

姓名、学号、组号、日期可留空；字段名和长度约束统一见 [API](api.md)。
