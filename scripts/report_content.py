"""Detailed, source-grounded narrative and data-driven plot blocks for reports."""

CONTENT = {
    "空气比热容比的测定": {
        "实验目的": r"""1. 理解气体的定压、定容比热容及比热容比的物理意义，并认识绝热过程的近似条件。\par
2. 使用振动法测定空气比热容比，掌握小球直径、质量、周期、气压和容积的测量。\par
3. 学习零点修正、重复测量及 A、B 类不确定度的合成，分析直径误差的放大效应。\par""",
        "实验原理": r"""储气瓶与细玻璃管构成近似封闭的气体系统。小球在管中平衡时，瓶内压强高于大气压；设球质量为 $m$、直径为 $d$，压强满足
\[P=P_L+\frac{4mg}{\pi d^2}.\]
小球偏离平衡位置时，瓶内气体在振动周期内近似绝热，$PV^\gamma=\mathrm{const}$。气体压强的微小变化提供回复力，由牛顿第二定律与绝热方程得到
\[\gamma=\frac{64mV}{T^2Pd^4}.\]
这里 $V$ 为储气瓶容积，$T$ 为小球振动周期，$P$ 是瓶内平衡压强。气体漏失、球与管壁摩擦、振幅过大及热交换都会使上述模型偏离理想条件。
\begin{center}\includegraphics[width=5.2cm]{figures/heat-apparatus.png}\par
{\small 振动法装置示意图。}\end{center}""",
        "实验内容": r"""\ReportSubsection{仪器准备与读数}
1. 检查储气瓶、细管和进气口的密封状况，调节进气量，使小球在细管内作稳定小幅振动。\par
2. 测量小球质量，用螺旋测微计在不同方位测直径五次，并记录仪器零点修正。\par
3. 记录实验始末的大气压及储气瓶容积；用计时装置测量五次振动周期，避免把多个周期的总时长误记为单周期。\par
\ReportSubsection{计算顺序}
先修正直径并求各量平均值，再计算瓶内压强和 $\gamma$；最后合成不确定度，并与室温空气参考值 $1.402$ 比较。""",
        "实验仪器": r"""网络型气体比热容比测试仪、带小孔细玻璃管和储气瓶、螺旋测微计、电子天平、空盒气压计及计时器。记录各仪器最小分度与估计误差。""",
        "讨论与分析": r"""\ReportSubsection{误差来源}
直径在计算式中以四次方出现；小球直径的零点修正和重复性往往比周期末位更影响结果。若球与管壁接触、振动幅度较大，摩擦和非线性回复力会改变周期。漏气与热交换使绝热条件变差，气压记录不及时也会造成系统偏差。\par
\ReportSubsection{结果检查}
检查修正后直径是否全为正、五次周期有无明显离群、始末气压差是否异常。计算相对不确定度时各项应使用同一单位；特别注意 mm 转 m、L 转 m$^3$、kPa 转 Pa。若 $\gamma$ 与参考值偏差超过不确定度范围，应先复查密封性和直径读数。\par
\ReportSubsection{思考题}
为何应采用小幅振动？小幅振动使气体压强变化较小，绝热方程可以线性化，周期才近似与振幅无关。为何测量五次直径？球可能并非理想球体，多方向测量可暴露形状差异并估计读数分散。""",
        "实验结论": r"""由五次振动周期和修正后的几何、气压数据得到空气比热容比 $\gamma=\MathField{gamma_result}\pm\MathField{gamma_uncertainty}$；相对参考值 $1.402$ 的百分差为 $\Field{gamma_error_percent}\%$。结果应结合密封性和直径测量条件评价。""",
    },
    "密立根油滴实验": {
        "实验目的": r"""1. 观察带电油滴在重力和电场力作用下的运动，用平衡电压与下降时间估计油滴电荷量。\par
2. 理解电荷量子化假设 $q_i\approx n_i e$，并用多颗油滴检查整数倍关系。\par
3. 分别用反向验证、图解拟合和过原点最小二乘法估计元电荷，比较三种处理方式。\par
4. 练习识别布朗运动、油滴蒸发和计时误差对结果的影响。\par""",
        "实验原理": r"""关闭电场时，油滴达到终端速度，重力与黏滞阻力平衡；加电场后，调节极板电压可使油滴悬浮，电场力与有效重力平衡。结合斯托克斯阻力、坎宁安修正及本实验仪器常数，油滴电荷量可写为
\[q_i=\frac{0.928\times10^{-14}}{U_i\bar t_i(1+0.0226\sqrt{\bar t_i})^{3/2}}\,\mathrm C.\]
$U_i$ 是平衡电压，$\bar t_i$ 是同一油滴在固定路程内四次自由下降时间的均值。若电荷量子化成立，则 $q_i=n_i e$，其中 $n_i$ 应接近正整数。可将 $q_i$ 对 $n_i$ 作图，以斜率估计 $e$；截距可提示系统偏差。
\begin{center}\includegraphics[width=7.2cm]{figures/millikan-chamber.png}\par
{\small 油滴盒结构示意图。}\end{center}""",
        "实验内容": r"""\ReportSubsection{观测准备}
1. 检查油滴盒清洁、照明、显微镜调焦和极板电压零点；喷入少量油雾，选取孤立且运动缓慢的油滴。\par
2. 标定目镜中的固定下降距离。关闭电场，待油滴运动稳定后计时；同一滴重复四次，若轨迹偏离或油滴消失，应重新选滴。\par
\ReportSubsection{平衡与重复测量}
3. 逐渐增大电压，使油滴尽可能悬浮，记录平衡电压。对十颗油滴重复下降计时与电压测量。\par
4. 分别计算 $q_i$、整数 $n_i$ 和 $\frac{q_i}{n_i}$；绘制散点与拟合直线，比较反向验证值、图解斜率和最小二乘结果。""",
        "实验仪器": r"""密立根油滴仪（油滴盒、电极板、照明及显微镜）、喷油器、计时器和直流高压电源。极板间距、空气黏度与修正常数已包含在仪器给定的计算常数中。""",
        "讨论与分析": r"""\ReportSubsection{图形与数值的对照}
图中每个散点都来自一颗油滴的四次平均下降时间与平衡电压。若某点明显偏离拟合线，应回查该滴是否发生蒸发、带电量跳变或布朗运动；不应只为得到整齐直线而删去读数。图解法允许非零截距，过原点最小二乘法则强制符合 $q=ne$，两种斜率的差异可以反映系统偏差。\par
\ReportSubsection{主要误差与改进}
下降时间过短会放大按表计时的相对误差；平衡状态的人工判断、极板电压波动、空气流动及焦平面变化也影响结果。选取运动较慢且稳定的油滴，保持油滴盒清洁并多次计时，可减小这些影响。\par
\ReportSubsection{思考题}
为何测量多颗油滴？单颗油滴只能给出一个电荷估计，无法可靠检验整数倍规律。为何先记录自由下降时间再调节平衡电压？下降速度用于估计油滴尺寸和有效重力，平衡电压再确定所带电荷量。""",
        "实验结论": r"""本次实验以十颗油滴检验电荷量子化。反向验证得到 $e_{\rm rev}=(\MathField{electron_charge_reverse}\pm\MathField{electron_charge_reverse_u})\,\mathrm C$，图解拟合斜率为 $e_{\rm graph}=(\MathField{electron_charge_graph}\pm\MathField{electron_charge_graph_u})\,\mathrm C$，过原点最小二乘结果为 $e_{\rm ls}=(\MathField{electron_charge_ls}\pm\MathField{electron_charge_ls_u})\,\mathrm C$。三种结果应结合散点分布与不确定度比较。""",
    },
    "用扭摆法测定物体转动惯量": {
        "实验目的": r"""1. 观察小角度扭摆，测量空盘与规则物体的周期并标定扭转常数。\par
2. 比较圆柱、圆筒、球和细杆的理论与实验转动惯量。\par
3. 改变两个对称滑块到转轴的距离，验证平行轴定理及惯量对距离平方的依赖。\par""",
        "实验原理": r"""扭摆的回复力矩在小角度范围内近似满足 $M=-\kappa\theta$，运动方程为 $I\ddot\theta+\kappa\theta=0$，故
\[T=2\pi\sqrt{\frac I\kappa}.\]
以圆柱作标准物体，比较空盘周期 $T_0$ 和装圆柱周期 $T_1$，可由圆柱理论惯量 $I'_1=\frac{mD^2}{8}$ 求 $\kappa=\frac{4\pi^2I'_1}{T_1^2-T_0^2}$。其他物体的实验惯量由 $I_j=\frac{\kappa T_j^2}{4\pi^2}-I_0$ 求得。对两个质量均为 $m_s$ 的滑块，平行轴模型为 $I(x)=I_{\rm rod}+2I_s+2m_sx^2$。
以 $\Delta=T_1^2-T_0^2$ 记周期平方差。暂把标准圆柱的理论惯量视为已知常量，独立重复计时的传播公式为
\[u_\kappa=\kappa\sqrt{\left(\frac{2T_0u_{T_0}}{\Delta}\right)^2+
\left(\frac{2T_1u_{T_1}}{\Delta}\right)^2}.\]
\[\begin{aligned}
u_{I_0}^2={}&\left(\frac{2I'_1T_0T_1^2u_{T_0}}{\Delta^2}\right)^2+
\left(\frac{2I'_1T_1T_0^2u_{T_1}}{\Delta^2}\right)^2,\\
u_{I_j}^2={}&\left(\frac{2I'_1T_ju_{T_j}}{\Delta}\right)^2+
\left(\frac{2I'_1T_0(T_j^2-T_1^2)u_{T_0}}{\Delta^2}\right)^2\\
&+\left(\frac{2I'_1T_1(T_j^2-T_0^2)u_{T_1}}{\Delta^2}\right)^2\quad(j\ne1).
\end{aligned}\]
标定圆柱的 $I_1$ 与 $I'_1$ 由同一组周期构成，其计时项相消；完整不确定度还需计入圆柱质量、直径等仪器误差。
\begin{center}\includegraphics[width=3.4cm]{figures/torsion-apparatus.png}\par
{\small 扭摆装置示意图。}\end{center}""",
        "实验内容": r"""\ReportSubsection{周期和几何量}
1. 调节底座水平与转轴竖直，保证载物盘空载时自由摆动；轻转一小角度后放手，避免向下压轴。\par
2. 测量空盘连续二十周期的总时长三次。依次安装圆柱、圆筒、木球和细杆，各计十周期并重复三次。\par
3. 测量各物体质量及必要的直径、长度；装置应居中、固定可靠，换物体时保持转轴条件一致。\par
\ReportSubsection{平行轴验证}
4. 把两个滑块关于转轴对称放在细杆上，量取滑块质心到轴的距离；在 5、10、15、20 cm 四个位置分别计五周期三次。\par
5. 将实验惯量与理论惯量对照，并以 $x^2$ 为横轴作图，检查线性关系。""",
        "实验仪器": r"""扭摆实验仪、电子天平、游标卡尺、刻度尺和秒表。按计时周期数换算单周期，空盘、规则物体与滑块的周期数不同，不可混用。""",
        "讨论与分析": r"""\ReportSubsection{图形与模型}
若平行轴定理适用，$I$ 对 $x^2$ 的点应近似落在直线上，斜率由两个滑块的质量决定。若图中随位置出现系统偏离，应检查距离是否从滑块质心量起、两个滑块是否对称，以及滑块本身惯量是否计入。\par
\ReportSubsection{主要误差}
计时起止点不一致、转轴摩擦、振幅过大和物体偏心都会改变周期。圆柱用于标定 $\kappa$，其质量和直径误差会传递到所有实验惯量。比较理论值时必须扣除空盘惯量 $I_0$。\par
\ReportSubsection{思考题}
为何空盘计时二十周期，而物体只计十周期？空盘周期较短，扩大总计时长度可以减小启停反应时间的相对影响。为何使用两个对称滑块？对称布置可以减少质心偏离转轴引起的附加晃动。""",
        "实验结论": r"""由圆柱与空盘的周期差标定扭转常数 $\kappa=(\MathField{torsion_constant}\pm\MathField{torsion_constant_u})\,\mathrm{N\,m}$，再求其他物体惯量。这里的不确定度只计重复计时的贡献。滑块位置变化所得散点应与 $I=I_{\rm rod}+2I_s+2m_sx^2$ 的平方关系比较，不能只凭周期随距离变大作结论。""",
    },
    "金属丝杨氏模量的测定": {
        "实验目的": r"""1. 理解杨氏模量与应力、应变的关系，用光杠杆放大金属丝微小伸长。\par
2. 完成加载和卸载两组读数，采用五级逐差法减小零点与随机误差。\par
3. 测量金属丝直径、长度、光杠杆臂长和镜尺距离，并估计结果的不确定度。\par""",
        "实验原理": r"""弹性限度内，金属丝的杨氏模量 $E=\frac{F/S}{\Delta L/L}$，其中 $S=\frac{\pi d^2}{4}$。光杠杆镜面转角很小，标尺像移动 $l$ 对应金属丝伸长 $\Delta L=\frac{Kl}{2D}$；$K$ 为光杠杆臂长，$D$ 为镜尺距离。因此五级载荷增量 $5\delta m$ 的结果为
\[E=\frac{8LDg(5\delta m)}{\pi d^2K\bar l}.\]
逐差法比较第 0--4 级和第 5--9 级的平均标尺像位置，既增加有效位移，也削弱统一零点偏差。
\begin{center}\includegraphics[width=9.3cm]{figures/young-optical-lever.png}\par
{\small 光杠杆镜尺关系示意图。}\end{center}""",
        "实验内容": r"""\ReportSubsection{仪器调节}
1. 检查金属丝竖直且未超过弹性限度，施加预载消除松弛。调节光杠杆镜面、望远镜和标尺，使标尺像及十字线清晰。\par
2. 测量金属丝长度、镜尺距离与光杠杆臂长；用螺旋测微计在不同方向测直径五次，记录零点。\par
\ReportSubsection{加卸载测量}
3. 按固定质量步长逐级加载，待标尺像稳定后读取十级位置；再逐级卸载，记录对应的十级位置。\par
4. 对每级加载、卸载读数取均值，计算五组逐差 $l_i$ 和杨氏模量；若两条曲线明显分离，应检查摩擦、松弛或是否超出弹性范围。""",
        "实验仪器": r"""杨氏模量仪、金属丝、光杠杆、望远镜与标尺、砝码、螺旋测微计、游标卡尺和米尺。直径进入平方项，应重视其测量与零点检查。""",
        "讨论与分析": r"""\ReportSubsection{加载与卸载}
图中的加载、卸载及均值曲线用于检查弹性区的近似线性。若加载与卸载差距大，可能有机械滞后、支架松动或读数尚未稳定，不能仅凭平均值掩盖异常。\par
\ReportSubsection{不确定度}
金属丝直径以平方进入公式，直径偏差会被放大；镜尺距离和臂长误差以及望远镜视差也应检查。逐差法利用较大的位移可减弱标尺像单次读数的相对误差，但不能消除系统误差。\par
\ReportSubsection{思考题}
为何先施加预载？使钢丝和装置进入稳定受力状态。为何沿多个方向测直径？金属丝可能略呈椭圆，多方位测量有助于估计截面尺寸。""",
        "实验结论": r"""通过光杠杆和五级逐差法得到 $E=(\MathField{young_modulus_pa}\pm\MathField{young_uncertainty_pa})\,\mathrm{Pa}$，与输入参考值的百分差为 $\Field{young_error_percent}\%$。应结合加载卸载一致性与直径测量评价结果。""",
    },
    "用波尔共振仪研究物体受迫振动": {
        "实验目的": r"""1. 观察自由振动、阻尼振动与受迫振动的区别，求自由周期和阻尼系数。\par
2. 改变驱动周期，记录稳定振幅和相位差，绘制由本次读数得到的幅频、相频曲线。\par
3. 比较峰值位置与固有频率，并分析阻尼和测量步长对共振曲线的影响。\par""",
        "实验原理": r"""阻尼受迫振动可写为 $\ddot\theta+2\beta\dot\theta+\omega_0^2\theta=M\cos\omega t$。自由振动给出 $\omega_0\approx\frac{2\pi}{T_0}$；阻尼峰值按 $\theta_k\propto\exp(-\beta kT_d)$ 逐渐衰减。稳态振幅与相位满足
\[\theta_m=\frac{M}{\sqrt{(\omega_0^2-\omega^2)^2+4\beta^2\omega^2}},\qquad
\tan\varphi=\frac{2\beta\omega}{\omega_0^2-\omega^2}.\]
阻尼越大，振幅峰值通常越低、曲线越宽；相位随频率穿过共振区时迅速改变。下图展示理论趋势，后文的散点和连线则由本次输入数据生成。
\begin{center}\includegraphics[width=10.5cm]{figures/forced-reference-curves.png}\par
{\small 幅频与相频曲线的理论趋势示意图。}\end{center}""",
        "实验内容": r"""\ReportSubsection{自由与阻尼振动}
1. 调平仪器、选择阻尼档位，拨动转盘使其自由振动；在不同初始角下记录十组周期，检查周期是否基本稳定。\par
2. 记录连续十个阻尼峰值与单周期，使用相隔五个峰值的幅度比估计衰减系数。\par
\ReportSubsection{受迫振动}
3. 接通驱动装置，改变驱动周期并等待瞬态衰减；在十五个设置点记录驱动周期、稳定振幅及相位差。共振附近缩小调节步长。\par
4. 将横轴统一为 $\frac{\omega}{\omega_0}=\frac{T_0}{T}$，分别绘制幅频和相频图；用实测最大振幅对应的驱动周期报告共振位置。""",
        "实验仪器": r"""波尔共振仪（转盘、阻尼器和驱动电机）、角度盘、数字计时器与光电门。各组周期、振幅和相位读数必须按同一驱动设置对应。""",
        "讨论与分析": r"""\ReportSubsection{曲线判读}
幅频图应在固有频率附近出现峰值，相频图应有连续过渡。理论示意曲线展示了不同阻尼的趋势，本报告数据图只对应输入的一个阻尼档位。若最大值落在采样端点或曲线跳跃，应补测相关区间。\par
\ReportSubsection{主要误差}
驱动周期设置误差、光电门触发延迟、等待稳态时间不足及相位零点偏移都会改变曲线形状。阻尼峰值若没有随时间总体衰减，应先核对峰值顺序。\par
\ReportSubsection{思考题}
为何共振区要缩小步长？振幅和相位变化最快，大步长可能错过峰值。为何每次改变驱动周期后要等待？瞬态项尚未衰减时，读到的振幅并非稳态响应。""",
        "实验结论": r"""自由周期平均值为 $(\MathField{free_period_mean_s}\pm\MathField{free_period_u_s})\,\mathrm s$，阻尼系数估计为 $(\MathField{damping_beta_s_inv}\pm\MathField{damping_beta_u_s_inv})\,\mathrm{s^{-1}}$。本次测量的最大稳定振幅 $\MathField{peak_amplitude_deg}^{\circ}$ 出现在驱动周期 $\MathField{resonance_period_s}\,\mathrm s$ 附近；最终应以数据图判断共振区与相位变化。""",
    },
    "透镜焦距的测量": {
        "实验目的": r"""1. 理解薄透镜成像公式及实物、虚物的物距符号，掌握四种焦距测量方法。\par
2. 用物像距法、共轭法和自准直法分别测凸透镜焦距，再用辅助成像测凹透镜焦距。\par
3. 比较方法间的一致性，识别光轴未对准、清晰像判断和透镜厚度带来的误差。\par""",
        "实验原理": r"""薄透镜近轴成像满足 $\frac1u+\frac1v=\frac1f$；物像距法由 $f=\frac{uv}{u+v}$ 求焦距。共轭法固定物屏间距 $L>4f$，两次清晰成像的透镜位置差为 $D$，故 $f=\frac{L^2-D^2}{4L}$。自准直法借助平面镜使返回像与物重合，此时物位于透镜焦平面。对凹透镜，先用凸透镜形成虚物，再按符号约定使用 $u<0$、$v>0$；若分母接近零，结果会对位置误差十分敏感。
\begin{center}\includegraphics[width=10.3cm]{figures/lens-ray-diagrams.png}\par
{\small 共轭与自准直光路示意图。}\end{center}""",
        "实验内容": r"""\ReportSubsection{调节与凸透镜测量}
1. 调整光源、透镜中心及屏幕中心共轴，记录各滑座位置时统一从同一刻线读取。\par
2. 物像距法测三组清晰像的物距与像距；共轭法固定五组物屏间距，在两清晰像位置测透镜位移；自准直法逐次调节平面镜使返回像与物重合，记录五组位置。\par
\ReportSubsection{凹透镜辅助成像}
3. 先用凸透镜形成实像，将凹透镜插在会聚光束中使该像成为凹透镜的虚物，再移动屏幕取得新的实像。\par
4. 对每组记录虚物、凹透镜及新像的位置；按统一的正负号计算凹透镜焦距，并检查五组结果的离散程度。""",
        "实验仪器": r"""光学导轨、光源与物屏、凸透镜、凹透镜、平面镜及滑座。所有位置和距离输入均为 mm，混用 cm 会使报告结果错误。""",
        "讨论与分析": r"""\ReportSubsection{各方法比较}
物像距法操作直观，但物距和像距都受清晰度判断影响；共轭法只需位置差，并应检查 $L>4f$；自准直法对返回像重合的判断较敏感。三法所得凸透镜焦距若明显不一致，应优先检查光轴共线和读数基准。\par
\ReportSubsection{凹透镜符号}
凹透镜的虚物位于透镜右侧，按本报告约定 $u=x_L-x_V<0$、$v=x_I-x_L>0$，由 $f=\frac{uv}{u+v}$ 得到负焦距。若把三个位置当作绝对距离代入，可能算出错误的正焦距。\par
\ReportSubsection{思考题}
为何共轭法要求 $L>4f$？否则不存在两个可区分的清晰成像透镜位置。为何应在导轨上反复检查共轴？偏轴会造成像差和读数误判。""",
        "实验结论": r"""凸透镜焦距由物像距法、共轭法和自准直法分别得到 $\MathField{focus_single_mean_mm}$、$\MathField{focus_bessel_mean_mm}$、$\MathField{focus_auto_mean_mm}\,\mathrm{mm}$；辅助成像得到凹透镜焦距 $\MathField{focus_concave_mean_mm}\,\mathrm{mm}$。各值的重复测量标准不确定度见上式；结果需结合三法一致性与符号约定评价。""",
    },
}


PLOTS = {
    "密立根油滴实验": r"""\clearpage
\ReportSection{图解法：电荷量与整数倍数}
以 $n_i$ 为横轴、$\frac{q_i}{10^{-19}\,\mathrm C}$ 为纵轴，将十颗油滴的计算值逐点绘出。直线为带截距的线性拟合 $q=en+b$，其斜率对应图解法元电荷估计；该曲线由本次输入的电压和下降时间实时计算。
\begin{center}\begin{tikzpicture}
\begin{axis}[width=.88\textwidth,height=7cm,xlabel={$n_i$},ylabel={$\frac{q_i}{10^{-19}\,\mathrm C}$},grid=both,legend pos=north west]
\addplot+[only marks,mark=*,mark size=2pt] coordinates {\PlotCoordinates{charge_graph_points}};
\addlegendentry{油滴数据}
\addplot+[no marks,thick,blue] coordinates {\PlotCoordinates{charge_graph_fit_points}};
\addlegendentry{线性拟合}
\end{axis}\end{tikzpicture}\par
{\small 图解斜率 $e=(\MathField{electron_charge_graph}\pm\MathField{electron_charge_graph_u})\,\mathrm C$，截距 $b=\MathField{electron_charge_graph_intercept}\,\mathrm C$。}
\end{center}
""",
    "用扭摆法测定物体转动惯量": r"""\clearpage
\ReportSection{平行轴定理的数据图}
横轴取滑块距离平方 $x^2$（cm$^2$），纵轴取总惯量的 $10^{-3}\,\mathrm{kg\,m^2}$ 数值。散点是周期换算的实验结果，直线连接对应理论值；两条序列均来自本次读数和输入的滑块质量。
\begin{center}\begin{tikzpicture}
\begin{axis}[width=.82\textwidth,height=4.8cm,xlabel={$\frac{x^2}{\mathrm{cm^2}}$},ylabel={$\frac{I}{10^{-3}\,\mathrm{kg\,m^2}}$},grid=both,legend pos=north west]
\addplot+[only marks,mark=*,mark size=2pt] coordinates {\PlotCoordinates{slider_graph_points}};
\addlegendentry{实测惯量}
\addplot+[no marks,thick,blue] coordinates {\PlotCoordinates{slider_graph_theory_points}};
\addlegendentry{平行轴理论}
\end{axis}\end{tikzpicture}\end{center}
""",
    "金属丝杨氏模量的测定": r"""\clearpage
\ReportSection{加载与卸载曲线}
以加载质量为横轴、望远镜标尺像位置为纵轴，绘出加载、卸载和两者均值。图形用于检查数据是否近似线性及是否存在明显滞后；点均由本次十级读数生成。
\begin{center}\begin{tikzpicture}
\begin{axis}[width=.88\textwidth,height=7cm,xlabel={加载质量/kg},ylabel={标尺像位置/cm},grid=both,legend pos=north west]
\addplot+[mark=*,blue] coordinates {\PlotCoordinates{young_load_up_points}};\addlegendentry{加载}
\addplot+[mark=square*,orange] coordinates {\PlotCoordinates{young_load_down_points}};\addlegendentry{卸载}
\addplot+[mark=triangle*,black] coordinates {\PlotCoordinates{young_load_mean_points}};\addlegendentry{均值}
\end{axis}\end{tikzpicture}\end{center}
""",
    "用波尔共振仪研究物体受迫振动": r"""\clearpage
\ReportSection{阻尼衰减与受迫振动曲线}
下列图形使用本次输入数据，横轴 $\frac{\omega}{\omega_0}=\frac{T_0}{T}$；连线只帮助观察趋势，不代表额外测量点。阻尼峰值图用于核对振幅总体衰减。
\begin{center}\begin{tikzpicture}
\begin{axis}[width=.82\textwidth,height=5.8cm,xlabel={峰值序号},ylabel={阻尼峰值/$^\circ$},grid=both]
\addplot+[mark=*,blue] coordinates {\PlotCoordinates{damped_graph_points}};
\end{axis}\end{tikzpicture}\par
\begin{tikzpicture}
\begin{axis}[width=.82\textwidth,height=5.8cm,xlabel={$\frac{\omega}{\omega_0}$},ylabel={稳定振幅/$^\circ$},grid=both]
\addplot+[mark=*,blue] coordinates {\PlotCoordinates{amplitude_graph_points}};
\end{axis}\end{tikzpicture}\par
\begin{tikzpicture}
\begin{axis}[width=.82\textwidth,height=5.8cm,xlabel={$\frac{\omega}{\omega_0}$},ylabel={相位差/$^\circ$},grid=both]
\addplot+[mark=square*,orange] coordinates {\PlotCoordinates{phase_graph_points}};
\end{axis}\end{tikzpicture}\end{center}
""",
}

