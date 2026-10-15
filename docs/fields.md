# 当前前端表单字段目录

此目录从 `src/structured-experiments.ts` 的当前配置提取，记录 2026-10-14 阅读基线。用于对照请求结构，不是已经建立的自动生成契约系统。后端还有旧 payload 兼容，见 [实验规则](experiments.md)。

所有读数在前端保存为字符串数组，参数保存为字符串。`初始数量` 不总是最终约束：波尔共振支持动态数量；油滴 32 行是容量，需要连续 3–8 颗、每颗四行。optional 表示配置标记，跨字段完整性仍由实验规则决定。表中“未声明”只表示前端配置未声明范围，不能理解为后端允许任意数。

## 阴极射线示波器（oscilloscope）

按原始记录表输入方波、正弦波、三角波、半波四种波形的电压档位、纵向跨度、时基档位和周期跨度；峰峰值（V）、周期（ms）和频率（Hz）自动计算。李萨如法输入四组 fx（kHz）、ny、nx，按 fy = nx/ny × fx 计算。四组与正弦波周期测量应使用频率不变的同一待测信号。可附最多两张原始记录图片。

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

共振干涉法与相位比较法各输入 20 个位置读数；频率及误差按 kHz、位置及游标卡尺误差按 mm 输入。报告计算逐差波长、声速、不确定度、理论声速和百分差。

| data 字段 | 含义 | 输入单位 | 初始数量 | 可选标记 |
| --- | --- | --- | --- | --- |
| `resonance` | 共振干涉法位置 | mm | 20 | 否 |
| `phase` | 相位比较法位置 | mm | 20 | 否 |

| parameters 字段 | 含义 | 单位 | 初始值 | 配置范围 |
| --- | --- | --- | --- | --- |
| `caliper_error` | 游标卡尺仪器误差 Δl | mm | `0.02` | > 0 |
| `res_t_start` | 共振干涉法开始室温 | °C | 空 | > -273 |
| `res_t_end` | 共振干涉法结束室温 | °C | 空 | > -273 |
| `res_frequency` | 共振干涉法信号频率 | kHz | 空 | > 0 |
| `res_frequency_error` | 共振干涉法频率误差 Δf | kHz | 空 | ≥ 0 |
| `phase_t_start` | 相位比较法开始室温 | °C | 空 | > -273 |
| `phase_t_end` | 相位比较法结束室温 | °C | 空 | > -273 |
| `phase_frequency` | 相位比较法信号频率 | kHz | 空 | > 0 |
| `phase_frequency_error` | 相位比较法频率误差 Δf | kHz | 空 | ≥ 0 |

## 空气比热容比的测定（heat-capacity-ratio）

按官方资料使用振动法；直径和周期各测量五次。压强用 kPa、容积用 L 输入。

| data 字段 | 含义 | 输入单位 | 初始数量 | 可选标记 |
| --- | --- | --- | --- | --- |
| `diameter` | 小球直径 | mm | 5 | 否 |
| `period` | 小球振动周期 | s | 5 | 否 |

| parameters 字段 | 含义 | 单位 | 初始值 | 配置范围 |
| --- | --- | --- | --- | --- |
| `mass_g` | 小球质量 | g | 空 | 未声明 |
| `volume_l` | 储气瓶容积 | L | `2.650` | 未声明 |
| `pressure_start_kpa` | 起始大气压 | kPa | 空 | 未声明 |
| `pressure_end_kpa` | 终止大气压 | kPa | 空 | 未声明 |
| `diameter_zero_mm` | 直径零点修正 | mm | `0` | 未声明 |
| `diameter_error_mm` | 直径仪器误差 | mm | 空 | 未声明 |
| `mass_error_g` | 质量仪器误差 | g | 空 | 未声明 |
| `period_error_s` | 周期仪器误差 | s | 空 | 未声明 |
| `pressure_error_kpa` | 气压仪器误差 | kPa | 空 | 未声明 |
| `volume_error_l` | 容积误差 | L | 空 | 未声明 |

## 密立根油滴实验（millikan）

按 CSV 数据文件逐行填写当前电压、平衡电压、下降时间及仪器电荷量，每颗油滴四行，共 3 至 8 颗。上传文件可自动填入下方表格，所有记录均可修改；计算使用每颗油滴四次平衡电压的平均值。

| data 字段 | 含义 | 输入单位 | 初始数量 | 可选标记 |
| --- | --- | --- | --- | --- |
| `current_voltage` | 当前电压 | V | 32 | 是 |
| `balance_voltage` | 平衡电压 | V | 32 | 否 |
| `fall_time` | 下降时间 | s | 32 | 否 |
| `instrument_charge` | 仪器电荷量 | C | 32 | 是 |

`parameters` 为 `{}`。

## 用扭摆法测定物体转动惯量（moment-of-inertia）

按 XLSX 数据文件填写质量（kg）、三次尺寸（cm）、三次计时（s）、两个滑块质量及两滑块自身惯量。上传文件可自动填入全部记录并继续修改。空盘计时 20 周期，其他物体 10 周期，滑块 5 周期；平均尺寸和单位换算由系统完成。

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

按新模板记录加卸载各十级和五组直径初、末读数，计算逐差法与图解法。预载不计入作用质量；L、D、K 的误差按模板为 0.1、0.2、0.02 cm。

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

按实际测量数量增减输入框。上传 XLSX 可自动填入已有记录并继续修改；报告使用当前表格中的全部数据。

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

所有位置和距离均用 mm。凹透镜实验选填，未做时三项均留空即可；填写时需完成整组数据。

| data 字段 | 含义 | 输入单位 | 初始数量 | 可选标记 |
| --- | --- | --- | --- | --- |
| `object_distance` | 单次成像物距 | mm | 3 | 否 |
| `image_distance` | 单次成像像距 | mm | 3 | 否 |
| `bessel_length` | 共轭法物屏距离 L | mm | 5 | 否 |
| `bessel_separation` | 共轭法两透镜位置差 D | mm | 5 | 否 |
| `auto_object` | 自准直法物位 | mm | 5 | 否 |
| `auto_lens` | 自准直法透镜位 | mm | 5 | 否 |
| `concave_object` | 凹透镜法虚物位（选填） | mm | 5 | 是 |
| `concave_lens` | 凹透镜位（选填） | mm | 5 | 是 |
| `concave_image` | 凹透镜法像位（选填） | mm | 5 | 是 |

`parameters` 为 `{}`。

## 共用封面字段

`reportInfo`：`student`（姓名）、`student_id`（学号）、`group`（组号）、`date`（实验日期），均可留空。后端长度与字符约束见 [接口文档](api.md)。
