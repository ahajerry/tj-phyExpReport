"""Build the report templates from the shared Tongji report layout.

The source documents stay in tex/official and tex/original. Generated editable
templates are archived in tex/templates and also packaged in tex/zipped.
"""
from __future__ import annotations

from pathlib import Path
import re
import shutil
import zipfile

from report_content import CONTENT, PLOTS
from oscilloscope_template import body as oscilloscope_body

ROOT = Path(__file__).resolve().parents[1]
TEX = ROOT / "tex"
ARCHIVE = TEX / "templates"
ZIPPED = TEX / "zipped"

BASE = r"""% 《物理实验报告模板.tex》的共同版式；所有实验模板均载入本文件。
\documentclass[UTF8,a4paper,10pt,fontset=fandol]{ctexart}
\usepackage[left=3.175cm,right=3.175cm,top=2.54cm,bottom=2.54cm]{geometry}
\usepackage{graphicx,tikz,pgfplots,needspace,adjustbox,booktabs,fancyhdr,lastpage,amsmath,amssymb,array,tabularx,longtable}
\pgfplotsset{compat=1.18}
\setlength{\parindent}{0pt}
\setlength{\parskip}{2pt}
\setlength{\headheight}{18pt}
\linespread{1}
\newcommand{\SetField}[2]{\expandafter\def\csname reportfield@#1\endcsname{#2}}
\makeatletter
\newcommand{\Field}[2][1.35cm]{%
  \ifcsname reportfield@#2\endcsname
    \expandafter\ifx\csname reportfield@#2\endcsname\@empty
      \underline{\makebox[#1]{\strut}}%
    \else\csname reportfield@#2\endcsname\fi
  \else\underline{\makebox[#1]{\strut}}\fi}
\makeatother
\newcommand{\MathField}[2][1.35cm]{%
  \ifcsname reportfield@math_#2\endcsname
    \csname reportfield@math_#2\endcsname
  \else\text{\Field[#1]{#2}}\fi}
\newcommand{\coverfield}[2]{%
  \noindent{\heiti\fontsize{18pt}{48pt}\selectfont
  \makebox[3.3cm][l]{#1}\underline{\makebox[8.8cm][c]{\Field[0pt]{#2}}}\par}}
\newcommand{\bindingline}[1][2.85]{%
  \begin{tikzpicture}[remember picture,overlay]
    \foreach \i in {0,...,38}{%
      \pgfmathsetmacro{\bindingy}{-#1-0.52*\i}%
      \ifnum\i=13\relax
        \node[inner sep=0pt] at ([xshift=1.05cm,yshift=\bindingy cm]current page.north west) {\songti\fontsize{10.5pt}{10.5pt}\selectfont 装};
      \else\ifnum\i=19\relax
        \node[inner sep=0pt] at ([xshift=1.05cm,yshift=\bindingy cm]current page.north west) {\songti\fontsize{10.5pt}{10.5pt}\selectfont 订};
      \else\ifnum\i=25\relax
        \node[inner sep=0pt] at ([xshift=1.05cm,yshift=\bindingy cm]current page.north west) {\songti\fontsize{10.5pt}{10.5pt}\selectfont 线};
      \else
        \pgfmathsetmacro{\bindingtop}{\bindingy+0.20}%
        \pgfmathsetmacro{\bindingbottom}{\bindingy-0.20}%
        \draw[line width=0.35pt,dash pattern=on 1.2pt off 1.8pt]
          ([xshift=1.05cm,yshift=\bindingtop cm]current page.north west)
          -- ([xshift=1.05cm,yshift=\bindingbottom cm]current page.north west);
      \fi\fi\fi}
  \end{tikzpicture}%
}
% 装订线印在每一页正文和原始数据页，续页也沿用母模板样式。
\newif\ifreportbinding
\AddToHook{shipout/foreground}{\ifreportbinding\bindingline\fi}
\fancypagestyle{report}{\fancyhf{}\fancyfoot[C]{第\thepage 页\quad 共\pageref{LastPage}页}\renewcommand{\headrulewidth}{0.4pt}}
\fancypagestyle{record}{\fancyhf{}\fancyhead[C]{原始数据记录单}\fancyfoot[C]{第\thepage 页\quad 共\pageref{LastPage}页}\renewcommand{\headrulewidth}{0.4pt}}
\newcommand{\ReportCover}[1]{%
  \thispagestyle{empty}\vspace*{1.0cm}
  \begin{center}
    \includegraphics[width=8.184cm]{tongji_logo.jpeg}\par
    {\bfseries\fontsize{18pt}{24pt}\selectfont TONGJI UNIVERSITY\par}
    \vspace{1.5cm}{\heiti\fontsize{36pt}{44pt}\selectfont 物理实验报告\par}
  \end{center}
  \vspace{1.5cm}
  \coverfield{实验名称}{experiment}
  \coverfield{学生姓名}{student}
  \coverfield{学\hspace{1em}号}{student_id}
  \coverfield{组\hspace{1em}号}{group}
  \coverfield{实验日期}{date}
  \clearpage\reportbindingtrue\pagestyle{report}
  \begin{center}{\heiti\fontsize{14pt}{40pt}\selectfont #1\par}\end{center}}
\newcommand{\ReportSection}[1]{\Needspace{4\baselineskip}\par\vspace{0.35\baselineskip}{\heiti #1}\par}
\newcommand{\ReportSubsection}[1]{\Needspace{3\baselineskip}\par\vspace{0.2\baselineskip}{\bfseries #1}\par}
\newif\ifreportimages
\newcommand{\ReportRecord}{%
  \clearpage\thispagestyle{record}
  \vspace*{0.6cm}%
  \ifreportimages\else（请将教师签字的实验数据记录单完整拍照粘贴至此处。）\fi
}
"""


def f(key: str, width: str = "10mm") -> str:
    return rf"\Field[{width}]{{{key}}}"


def mf(key: str) -> str:
    return rf"$\MathField{{{key}}}$"


def tab(headers: list[str], rows: list[list[str]], widths: str | None = None, fit: bool = False) -> str:
    col = widths or ("|" + "c|" * len(headers))
    content = [r"\begin{center}\small\renewcommand{\arraystretch}{1.35}"]
    if fit:
        content.append(r"\begin{adjustbox}{max width=\textwidth}")
    content += [rf"\begin{{tabular}}{{{col}}}\hline", " & ".join(headers) + r"\\\hline"]
    content += [" & ".join(row) + r"\\\hline" for row in rows]
    content += [r"\end{tabular}"]
    if fit:
        content.append(r"\end{adjustbox}")
    content.append(r"\end{center}")
    return "\n".join(content)


def build(title: str, body: str) -> str:
    body = body.replace(r"\clearpage\ReportSection", r"\ReportSection")
    for section, replacement in CONTENT[title].items():
        pattern = rf"(\\ReportSection\{{{re.escape(section)}\}}).*?(?=\\ReportSection\{{|\Z)"
        body, count = re.subn(pattern, lambda match: match.group(1) + "\n" + replacement + "\n", body, count=1, flags=re.S)
        if count != 1:
            raise ValueError(f"{title}: missing section {section}")
    if title in PLOTS:
        plot = PLOTS[title].removeprefix(r"\clearpage")
        body = body.replace(r"\ReportSection{讨论与分析}", plot + r"\ReportSection{讨论与分析}", 1)
    return (r"\input{physics_report_base.tex}" + "\n"
            "% ===== 数据输入区开始 =====\n"
            + rf"\SetField{{experiment}}{{{title}}}" + "\n"
            "% 后端以 \\SetField{字段名}{值} 填入数据；缺省值保持空白。\n"
            "% 母模板封面字段：\\Field{experiment} \\Field{student} \\Field{student_id} \\Field{group} \\Field{date}\n"
            "% ===== 数据输入区结束 =====\n"
            r"\begin{document}\fontsize{10.5pt}{20pt}\selectfont" + "\n"
            rf"\ReportCover{{{title}}}" + "\n" + body + "\n"
            r"\ReportRecord" + "\n% ===== 原始数据图片插入区 =====\n"
            + r"\end{document}" + "\n")


def heat() -> str:
    diameter = [[str(i), f(f"diameter_{i:02d}"), f(f"diameter_corrected_{i:02d}")] for i in range(1, 6)]
    period = [[str(i), f(f"period_{i:02d}"), f(f"period_deviation_{i:02d}")] for i in range(1, 6)]
    return build("空气比热容比的测定", r"""\ReportSection{实验目的}
测定空气的定压、定容比热容比，练习小球直径、质量、压强及振动周期的测量与不确定度处理。
\ReportSection{实验原理}
小球在储气瓶颈部作小幅振动，瓶内气体近似满足绝热关系 $PV^\gamma=\mathrm{const}$。
平衡压强 $P=P_L+4mg/(\pi d^2)$，周期法给出
\[\gamma=\frac{64mV}{T^2Pd^4}.\]
此式要求振幅较小、漏气与摩擦可忽略。室温空气参考值取 $\gamma_0=1.402$。
\ReportSection{实验内容}
用螺旋测微计测备用小球直径五次，测量小球质量与实验前后大气压；按仪器要求测量五次振动周期，代入上式并估计不确定度。
\ReportSection{实验仪器}
网络型气体比热容比测试仪、螺旋测微计、物理天平、空盒气压计。
\ReportSection{数据记录处理}
小球直径（mm；修正值由后端计算）：
""" + tab(["序号", "读数", "修正后"], diameter) + r"""
周期（s）：
""" + tab(["序号", "读数", "与均值之差"], period) + r"""
\noindent 小球质量 $m=\Field{mass_g}$ g；瓶容积 $V=\Field{volume_l}$ L；
大气压始末读数 $P_{L1}=\Field{pressure_start_kpa}$ kPa，$P_{L2}=\Field{pressure_end_kpa}$ kPa。
\clearpage\ReportSection{数据记录处理（续）}
\noindent 直径零点修正 $c_d=\Field{diameter_zero_mm}$ mm；直径、质量、周期、压强、容积的仪器误差依次为
$\Field{diameter_error_mm}$ mm、$\Field{mass_error_g}$ g、$\Field{period_error_s}$ s、
$\Field{pressure_error_kpa}$ kPa、$\Field{volume_error_l}$ L。
\[\bar d=(\MathField{diameter_mean_mm}\pm\MathField{diameter_mean_u_mm})\,\mathrm{mm},\quad
\bar T=(\MathField{period_mean_s}\pm\MathField{period_mean_u_s})\,\mathrm{s}.\]
\[\bar P_L=(\MathField{pressure_mean_kpa}\pm\MathField{pressure_mean_u_kpa})\,\mathrm{kPa}.\]
\[P=\MathField{pressure_inside_pa}\,\mathrm{Pa},\qquad
\gamma=\MathField{gamma_result}.\]
\[u_\gamma=\gamma\sqrt{\left(\frac{u_m}{m}\right)^2+
\left(\frac{u_V}{V}\right)^2+
\left(\frac{2u_T}{T}\right)^2+
\left(\frac{u_P}{P}\right)^2+
\left(\frac{4u_d}{d}\right)^2}
=\MathField{gamma_uncertainty}.\]
\noindent 结果：$\gamma=\MathField{gamma_result}\pm\MathField{gamma_uncertainty}$；
与参考值百分差 $\Field{gamma_error_percent}\%$。
\ReportSection{讨论与分析}
直径在公式中为四次方，直径零点和玻璃管摩擦是主要误差来源；若相对偏差较大，应复查直径读数、气压换算及装置密封性。
\ReportSection{实验结论}
通过测量小球振动周期与相关参数，可用绝热振动模型求得空气比热容比；测量值应结合不确定度与参考值比较。""")


def millikan() -> str:
    raw_rows = [[str(i), f(f"voltage_{i:02d}"), *[f(f"time_{i:02d}_{j}") for j in range(1, 5)]]
                for i in range(1, 9)]
    result_rows = [[str(i), f(f"time_mean_{i:02d}"), mf(f"charge_{i:02d}"),
                    f(f"electron_count_{i:02d}")] for i in range(1, 9)]
    return build("密立根油滴实验", r"""\ReportSection{实验目的}
测量油滴电荷量，验证电荷量子化，并用反向验证、图解和最小二乘法估计元电荷。
\ReportSection{实验原理}
静态平衡时油滴重力与电场力平衡；结合自由下落速度、斯托克斯阻力及坎宁安修正，可由下降时间与平衡电压求出电荷量。
本仪器给定参数化简为
\[q_i=\frac{0.928\times10^{-14}}{U_i\bar t_i(1+0.0226\sqrt{\bar t_i})^{3/2}}\,\mathrm{C},
\qquad q_i\approx n_i e.\]
注意 $\bar t_i$ 为固定路程的下降时间，$U_i$ 为平衡电压。
\ReportSection{实验内容}
对不同油滴测量平衡电压和四次下降时间，求各滴电荷量，判断 $n_i$ 并作 $q_i$--$n_i$ 关系图。
\ReportSection{实验仪器}
密立根油滴仪、计时器、平衡电压测量装置。
\ReportSection{数据记录处理}
""" + tab(["$i$", "$U$/V", "$t_1$/s", "$t_2$/s", "$t_3$/s", "$t_4$/s"], raw_rows,
              "|c|c|c|c|c|c|", fit=True) + r"""
\noindent 由四次下降时间求均值并计算电荷量：
""" + tab(["$i$", r"$\bar t$/s", "$q$/C", "$n$"], result_rows) + r"""
\ReportSection{数据处理方法}
\noindent 反向验证法：$e_{\rm rev}=\MathField{electron_charge_reverse}\,\mathrm C$，
$u_e=\MathField{electron_charge_reverse_u}\,\mathrm C$，百分差 $\Field{reverse_error_percent}\%$。
\par\noindent 图解法：由 $q_i$--$n_i$ 图拟合斜率，
$e_{\rm graph}=(\MathField{electron_charge_graph}\pm\MathField{electron_charge_graph_u})\,\mathrm C$。
\par\noindent 最小二乘法：过原点拟合 $e=\frac{\sum_i n_iq_i}{\sum_i n_i^2}$，
$e_{\rm ls}=\MathField{electron_charge_ls}\,\mathrm C$，
$u_e=\MathField{electron_charge_ls_u}\,\mathrm C$，百分差 $\Field{ls_error_percent}\%$。
\ReportSection{讨论与分析}
油滴蒸发、布朗运动、平衡判断和计时反应会改变下降时间；电荷量接近整数倍只是模型检验，$n_i$ 的判定也应结合散点图复核。
\ReportSection{实验结论}
根据多颗油滴的电荷量和整数倍关系，可估计元电荷，并与公认值比较。""")


def torsion() -> str:
    rows = [[label, *[f(f"time_{key}_{i:02d}") for i in range(1, 4)], f(f"period_{key}")]
            for key, label in [("disk", "载物圆盘"), ("cylinder", "实心圆柱"),
                               ("tube", "空心圆筒"), ("ball", "木球"), ("rod", "金属细杆")]]
    objects = [[label, mf(f"theory_{key}"), mf(f"experiment_{key}"),
                mf(f"experiment_{key}_u"), f(f"error_{key}")]
               for key, label in [("cylinder", "实心圆柱"), ("tube", "空心圆筒"),
                                  ("ball", "木球"), ("rod", "金属细杆")]]
    sliders = [[str(x), f(f"slider_time_{x}_01"), f(f"slider_time_{x}_02"), f(f"slider_time_{x}_03"),
                f(f"slider_period_{x}"), mf(f"slider_theory_{x}"), mf(f"slider_experiment_{x}")]
               for x in (5, 10, 15, 20)]
    return build("用扭摆法测定物体转动惯量", r"""\ReportSection{实验目的}
标定扭转常数，测定规则物体的转动惯量，并验证平行轴定理。
\ReportSection{实验原理}
小角度扭摆的周期为 $T=2\pi\sqrt{I/\kappa}$。以圆盘空载周期 $T_0$ 和已知圆柱体惯量 $I'_1$ 标定
\[\kappa=\frac{4\pi^2 I'_1}{T_1^2-T_0^2},\qquad
I_0=\frac{\kappa T_0^2}{4\pi^2},\qquad
I_{j,\rm exp}=\frac{\kappa T_j^2}{4\pi^2}-I_0.\]
\noindent 不计标定圆柱质量和直径的仪器误差时，令 $D=T_1^2-T_0^2$，
由独立重复计时的不确定度传递得到参考公式
\[u_\kappa=\kappa\sqrt{\left(\frac{2T_0u_{T_0}}{D}\right)^2+
\left(\frac{2T_1u_{T_1}}{D}\right)^2}.\]
\[\begin{aligned}
u_{I_0}^2={}&\left(\frac{2I'_1T_0T_1^2u_{T_0}}{D^2}\right)^2+
\left(\frac{2I'_1T_1T_0^2u_{T_1}}{D^2}\right)^2,\\
u_{I_j}^2={}&\left(\frac{2I'_1T_ju_{T_j}}{D}\right)^2+
\left(\frac{2I'_1T_0(T_j^2-T_1^2)u_{T_0}}{D^2}\right)^2\\
&+\left(\frac{2I'_1T_1(T_j^2-T_0^2)u_{T_1}}{D^2}\right)^2\quad(j\ne1).
\end{aligned}\]
\noindent 对标定圆柱本身，按同一周期数据代入实验惯量时计时项相关并相消；如需完整不确定度，还应计入质量和尺寸误差。
\ReportSection{实验内容}
分别测量空盘转动二十周期、四种物体转动十周期的时间，各重复三次；再改变两个对称滑块的位置，分别测量五周期的时间。
\ReportSection{实验仪器}
扭摆实验仪、秒表、电子天平、游标卡尺、刻度尺。
\ReportSection{数据记录处理}
空盘计时为二十周期、其余物体计时为十周期的总时长（s），各重复三次：
""" + tab(["物体", "计时周期数", "$t_1$/s", "$t_2$/s", "$t_3$/s", r"$\bar T$/s"],
           [[row[0], "20" if row[0] == "载物圆盘" else "10", *row[1:]] for row in rows]) + r"""
\noindent 单周期的计时标准不确定度 $u_{\bar T}$（空盘、圆柱、圆筒、木球、细杆依次为）
$\Field{period_disk_u}$、$\Field{period_cylinder_u}$、$\Field{period_tube_u}$、
$\Field{period_ball_u}$、$\Field{period_rod_u}$ s。
\noindent 几何量：圆柱 $m_1=\Field{mass_cylinder_g}$ g、$D_1=\Field{diameter_cylinder_mm}$ mm；
圆筒 $m_2=\Field{mass_tube_g}$ g、$D_o=\Field{diameter_tube_outer_mm}$ mm、$D_i=\Field{diameter_tube_inner_mm}$ mm；
木球 $m_3=\Field{mass_ball_g}$ g、$D_3=\Field{diameter_ball_mm}$ mm；
细杆 $m_4=\Field{mass_rod_g}$ g、$l_4=\Field{length_rod_mm}$ mm。
\[\kappa=(\MathField{torsion_constant}\pm\MathField{torsion_constant_u})\,\mathrm{N\,m}.\]
\[I_0=(\MathField{empty_inertia}\pm\MathField{empty_inertia_u})\,\mathrm{kg\,m^2}.\]
""" + tab(["物体", "$I_{\rm th}$/kg m$^2$", "$I_{\rm exp}$/kg m$^2$", "$u_I$/kg m$^2$", r"百分差/\%"], objects) + r"""
\noindent 表中 $u_I$ 仅由重复计时传播；标定圆柱的计时贡献与其标准惯量相消，几何量和质量的仪器不确定度未计入。
\clearpage\ReportSection{平行轴定理验证}
\noindent 单滑块质量 $m_s=\Field{slider_mass_g}$ g；单滑块自身惯量 $I_s=\Field{slider_self_inertia}$ kg m$^2$。
\noindent 滑块计时为五周期的总时长（s），各重复三次。
""" + tab(["$x$/cm", "$t_1$/s", "$t_2$/s", "$t_3$/s", r"$\bar T$/s", r"$I_{\rm th}$", r"$I_{\rm exp}$"], sliders) + r"""
\noindent 滑块单周期的计时标准不确定度（按 $x=5,10,15,20$ cm 顺序）：
$\Field{slider_period_5_u}$、$\Field{slider_period_10_u}$、
$\Field{slider_period_15_u}$、$\Field{slider_period_20_u}$ s。
\noindent 滑块实验惯量的计时标准不确定度（按 $x=5,10,15,20$ cm 顺序）：
$\Field{slider_experiment_5_u}$、$\Field{slider_experiment_10_u}$、
$\Field{slider_experiment_15_u}$、$\Field{slider_experiment_20_u}$ kg m$^2$。
\noindent 理论模型 $I_{\rm th}(x)=I'_{\rm rod}+2I_s+2m_sx^2$；
滑块的位移应按其质心到转轴的距离计。
\ReportSection{讨论与分析}
比较理论与实验惯量时均须扣除载物圆盘惯量 $I_0$。扭摆轴摩擦、计时起止误差和物体偏心安装会使周期及惯量出现系统偏差。
\ReportSection{实验结论}
利用周期差可标定扭转常数；随滑块离轴距离增大，转动惯量按平方规律增加。""")


def young() -> str:
    rows = [[str(i-1), f(f"load_up_{i:02d}"), f(f"load_down_{i:02d}"), f(f"load_mean_{i:02d}")]
            for i in range(1, 11)]
    diam = [[str(i), f(f"diameter_{i:02d}")] for i in range(1, 6)]
    diffs = [[str(i + 1), f(f"load_difference_{i:02d}")] for i in range(5)]
    return build("金属丝杨氏模量的测定", r"""\ReportSection{实验目的}
用光杠杆测量金属丝的微小伸长，采用逐差法处理加载和卸载读数，求杨氏模量及不确定度。
\ReportSection{实验原理}
胡克定律 $E=4mgL/(\pi d^2\Delta L)$；光杠杆将伸长量转换为标尺像位移
$\Delta L=Kl/(2D)$，故
\[E=\frac{8LDg}{\pi d^2K}\frac{m}{l}.\]
\ReportSection{实验内容}
逐级加卸砝码，记录十级标尺像位置；测金属丝长度、直径、光杠杆臂长及镜尺距离。
\ReportSection{实验仪器}
杨氏模量仪、光杠杆、望远镜、米尺、砝码、螺旋测微计、游标卡尺。
\ReportSection{数据记录处理}
逐级载荷下的标尺像位置（cm）：
""" + tab(["级数", "加载", "卸载", "均值"], rows) + r"""
\noindent 每级质量增量 $\delta m=\Field{mass_step_kg}$ kg；预载质量 $\Field{preload_kg}$ kg。
\par\noindent 金属丝直径（mm）：
""" + tab(["序号", "直径"], diam) + r"""
\clearpage\ReportSection{数据记录处理（续）}
\noindent $L=\Field{wire_length_cm}$ cm，$D=\Field{mirror_distance_cm}$ cm，
$K=\Field{lever_arm_cm}$ cm；当地 $g=\Field{gravity_ms2}$ m/s$^2$。
\par\noindent 逐差 $l_i=|x_{i+5}-x_i|$（cm）：
""" + tab(["$i$", "$l_i$"], diffs) + r"""
\[\bar d=(\MathField{diameter_mean_mm}\pm\MathField{diameter_mean_u_mm})\,\mathrm{mm},\quad
\bar l=(\MathField{difference_mean_cm}\pm\MathField{difference_mean_u_cm})\,\mathrm{cm},\quad
E=(\MathField{young_modulus_pa}\pm\MathField{young_uncertainty_pa})\,\mathrm{Pa}.\]
\noindent 与参考值 $\MathField{reference_modulus_pa}$ Pa 的百分差为 $\Field{young_error_percent}\%$。
\ReportSection{讨论与分析}
金属丝预载、望远镜视差及直径测量会影响结果；直径以平方进入公式，须在不同方位重复测量并检查零点。
\ReportSection{实验结论}
光杠杆与逐差法可将微小伸长转化为可读的标尺位移，并据此求出金属丝的杨氏模量。""")


def resonance() -> str:
    free = [[str(i), f(f"free_angle_{i:02d}"), f(f"free_period_{i:02d}")] for i in range(1, 11)]
    damp = [[str(i), f(f"damped_peak_{i:02d}")] for i in range(1, 11)]
    forced = [[str(i), f(f"drive_period_{i:02d}"), f(f"amplitude_{i:02d}"),
               f(f"phase_{i:02d}"), f(f"frequency_ratio_{i:02d}")]
              for i in range(1, 16)]
    return build("用波尔共振仪研究物体受迫振动", r"""\ReportSection{实验目的}
测量自由振动、阻尼振动和受迫振动的周期、振幅与相位，绘制幅频及相频特性曲线。
\ReportSection{实验原理}
受迫阻尼振动满足 $\ddot\theta+2\beta\dot\theta+\omega_0^2\theta=m\cos\omega t$。
稳定振幅为 $\displaystyle\theta_m=\frac{m}{\sqrt{(\omega_0^2-\omega^2)^2+4\beta^2\omega^2}}$；
阻尼峰值按 $\theta_k\propto e^{-\beta kT}$ 衰减。
\ReportSection{实验内容}
记录不同摆幅的自由周期；记录连续十个阻尼峰值及计时；改变驱动周期，记录稳定振幅与相位差。
\ReportSection{实验仪器}
波尔共振仪、数字计时器、角度盘与光电门。
\ReportSection{数据记录处理}
自由振动：
""" + tab(["序号", "角度/°", "周期/s"], free) + r"""
\clearpage\ReportSection{阻尼振动与受迫振动}
\noindent 阻尼档位 $\Field{damping_setting}$；阻尼振动单周期 $T_d=\Field{damped_period_s}$ s。
""" + tab(["峰值序号", "振幅/°"], damp) + r"""
\noindent 受迫振动：
""" + tab(["序号", "$T$/s", "振幅/°", "相位差/°", r"$\omega/\omega_0$"], forced) + r"""
\[\begin{aligned}
\bar T_0&=(\MathField{free_period_mean_s}\pm\MathField{free_period_u_s})\,\mathrm{s},\\
\omega_0&=(\MathField{natural_omega_rad_s}\pm\MathField{natural_omega_u_rad_s})\,\mathrm{rad/s},\\
\beta&=(\MathField{damping_beta_s_inv}\pm\MathField{damping_beta_u_s_inv})\,\mathrm{s^{-1}}.
\end{aligned}\]
\noindent 上述不确定度仅反映重复自由周期与五组阻尼峰值比的统计分散，不包含单次驱动设定的仪器误差。
\noindent 最大幅值 $\Field{peak_amplitude_deg}$°，对应驱动周期 $\Field{resonance_period_s}$ s。
\ReportSection{讨论与分析}
共振附近的驱动周期步长应减小，待瞬态衰减后读取稳定振幅；相位零点及光电门触发误差也会影响曲线。
\ReportSection{实验结论}
系统在驱动频率接近固有频率时出现振幅峰值；阻尼使幅频曲线变宽，并改变相位随频率的变化。""")


def lens() -> str:
    single = [[str(i), f(f"object_distance_{i:02d}"), f(f"image_distance_{i:02d}"), f(f"single_focus_{i:02d}")]
              for i in range(1, 4)]
    bessel = [[str(i), f(f"bessel_length_{i:02d}"), f(f"bessel_separation_{i:02d}"), f(f"bessel_focus_{i:02d}")]
              for i in range(1, 6)]
    auto = [[str(i), f(f"auto_object_{i:02d}"), f(f"auto_lens_{i:02d}"), f(f"auto_focus_{i:02d}")]
            for i in range(1, 6)]
    concave = [[str(i), f(f"concave_object_{i:02d}"), f(f"concave_lens_{i:02d}"),
                f(f"concave_image_{i:02d}"), f(f"concave_focus_{i:02d}")]
               for i in range(1, 6)]
    return build("透镜焦距的测量", r"""\ReportSection{实验目的}
理解薄透镜成像公式，分别用单次成像法、共轭法、自准直法测凸透镜焦距，并测凹透镜焦距。
\ReportSection{实验原理}
薄透镜满足 $\frac1u+\frac1v=\frac1f$。共轭法在物屏间距 $L>4f$ 时，两次清晰像的透镜位置间距为 $D$，
$f=\frac{L^2-D^2}{4L}$。自准直法中物位于焦平面。凹透镜与凸透镜配合时应使用有符号物距和像距。
\ReportSection{实验内容}
调节物屏及光轴，分别记录单次成像、共轭、自准直和辅助成像的读数。
\ReportSection{实验仪器}
光学导轨、光源、物屏、凸透镜、凹透镜、平面镜及滑座。
\ReportSection{数据记录处理}
单次成像（mm）：
""" + tab(["次数", "$u$", "$v$", "$f$"], single) + r"""
\noindent 共轭法（mm）：
""" + tab(["次数", "$L$", "$D$", "$f$"], bessel) + r"""
\noindent 自准直法（位置读数，mm）：
""" + tab(["次数", "物位", "凸透镜位", "$f$"], auto) + r"""
\clearpage\ReportSection{凹透镜辅助成像}
\noindent 凹透镜辅助成像（位置读数，mm）：
""" + tab(["次数", "虚物位", "凹透镜位", "像位", "$f$"], concave) + r"""
\[\begin{aligned}
\bar f_{\rm single}&=(\MathField{focus_single_mean_mm}\pm\MathField{focus_single_u_mm})\,\mathrm{mm},\\
\bar f_{\rm Bessel}&=(\MathField{focus_bessel_mean_mm}\pm\MathField{focus_bessel_u_mm})\,\mathrm{mm},\\
\bar f_{\rm auto}&=(\MathField{focus_auto_mean_mm}\pm\MathField{focus_auto_u_mm})\,\mathrm{mm},\\
\bar f_{\rm concave}&=(\MathField{focus_concave_mean_mm}\pm\MathField{focus_concave_u_mm})\,\mathrm{mm}.
\end{aligned}\]
\noindent $u_f$ 为各方法重复测量的 A 类标准不确定度，未计入导轨读数和成像判断的系统误差。
\ReportSection{讨论与分析}
各法的主要误差来自光轴未对准、像清晰位置的判断和透镜厚度；共轭法应检查 $L>4f$，凹透镜计算须保留距离符号。
\ReportSection{实验结论}
通过不同成像方法可交叉核对凸透镜焦距，并利用辅助实像测出凹透镜焦距。""")


def sound() -> str:
    sections = []
    for prefix, label in (("res", "共振干涉法"), ("phase", "相位比较法")):
        rows = [[str(i), f(f"{prefix}_l{i:02d}"), f(f"{prefix}_l{i+10:02d}"), f(f"{prefix}_lambda{i:02d}")]
                for i in range(1, 11)]
        page_break = r"\clearpage\ReportSection{数据记录处理（续）}" if prefix == "phase" else ""
        sections.append(page_break + rf"\par\noindent {{\heiti {label}}}：$f=\Field{{{prefix}_frequency}}$ kHz，"
                        rf"$\Delta f=\Field{{{prefix}_frequency_error}}$ kHz；"
                        rf"室温始末值 $\Field{{{prefix}_t_start}}$、$\Field{{{prefix}_t_end}}$ °C，"
                        rf"均值 $\Field{{{prefix}_t_avg}}$ °C。" + "\n"
                        + tab(["$i$", "$l_i$/mm", "$l_{i+10}$/mm", r"$\lambda_i$/mm"], rows)
                        + rf"\[\bar\lambda=\MathField{{{prefix}_lambda_avg}}\,\mathrm{{mm}},\quad "
                          rf"u_A=\MathField{{{prefix}_u_a}},\quad u_B=\MathField{{{prefix}_u_b}},\quad "
                          rf"u_\lambda=\MathField{{{prefix}_u_lambda}},\quad "
                          rf"u_{{r\lambda}}=\MathField{{{prefix}_u_r_lambda}}.\]"
                        + rf"\[u_f=\MathField{{{prefix}_u_f}},\quad u_{{rf}}=\MathField{{{prefix}_u_r_f}},\quad "
                          rf"v=\MathField{{{prefix}_speed}}\,\mathrm{{m/s}},\quad "
                          rf"u_v=\MathField{{{prefix}_u_v}},\quad u_{{rv}}=\MathField{{{prefix}_u_r_v}}.\]"
                        + rf"\noindent 结果 $v=(\MathField{{{prefix}_speed_result}}\pm\MathField{{{prefix}_u_v_result}})$ m/s，"
                          rf"相对不确定度 $\Field{{{prefix}_u_r_v_percent}}\%$，"
                          rf"理论声速 $\Field{{{prefix}_speed_theory}}$ m/s，"
                          rf"百分差 $\Field{{{prefix}_error_percent}}\%$。")
    return build("声速测定", r"""\ReportSection{实验目的}
用共振干涉法和相位比较法测量空气中的声速，练习逐差法及不确定度合成。
\ReportSection{实验原理}
连续相邻共振位置相差半个波长；由相隔十个位置的读数可得
$\lambda_i=(l_{i+10}-l_i)/5$，声速 $v=f\bar\lambda$。
按室温估计的理论值为 $v_0=331\sqrt{1+t/273}$ m/s。
\ReportSection{实验内容}
分别测量两种方法各二十个位置，记录室温与频率，计算波长、声速及误差。
\ReportSection{实验仪器}
声速测定仪、信号发生器、示波器、游标卡尺、温度计。
\ReportSection{数据记录处理}
游标卡尺误差 $\Delta l=\Field{caliper_error}$ mm。
""" + "\n".join(sections) + r"""
\par\noindent 两法声速差 $\Field{method_difference}$ m/s；与理论值更接近的方法：\Field{closer_method}；
两法均值 $\Field{final_speed}$ m/s。
\ReportSection{讨论与分析}
共振峰位置判断、换能器对准及室温变化会影响结果；比较两法的速度和不确定度可检查读数的一致性。
\ReportSection{实验结论}
两种声学方法均可由波长与频率求声速，应结合理论值与不确定度评价实验结果。""")


TEMPLATES = {
    "heat-capacity-ratio": heat,
    "millikan": millikan,
    "moment-of-inertia": torsion,
    "young-modulus": young,
    "forced-vibration": resonance,
    "focal-length": lens,
    "oscilloscope": lambda: build("阴极射线示波器", oscilloscope_body(f, tab)),
}


def main() -> None:
    ARCHIVE.mkdir(parents=True, exist_ok=True)
    ZIPPED.mkdir(parents=True, exist_ok=True)
    (ARCHIVE / "physics_report_base.tex").write_text(BASE, encoding="utf-8")
    shutil.copyfile(ROOT / "tongji_logo.jpeg", ARCHIVE / "tongji_logo.jpeg")
    for experiment_id, factory in TEMPLATES.items():
        name = f"{experiment_id}.tex"
        # These tracked templates follow the official DOCX table layouts.
        # Preserve their extended explanations and figures when packaging.
        if experiment_id in ("millikan", "moment-of-inertia"):
            source = (ARCHIVE / name).read_text(encoding="utf-8")
        else:
            source = factory()
            (ARCHIVE / name).write_text(source, encoding="utf-8")
        (ZIPPED / name).write_text(source, encoding="utf-8")
        with zipfile.ZipFile(ZIPPED / f"{experiment_id}.zip", "w", zipfile.ZIP_DEFLATED) as bundle:
            bundle.write(ARCHIVE / name, name)
            bundle.write(ARCHIVE / "physics_report_base.tex", "physics_report_base.tex")
            bundle.write(ARCHIVE / "tongji_logo.jpeg", "tongji_logo.jpeg")
            for figure in sorted((ARCHIVE / "figures").glob("*.png")):
                bundle.write(figure, f"figures/{figure.name}")
    speed_source = ARCHIVE / "speed-of-sound.tex"
    name = "speed-of-sound.tex"
    shutil.copyfile(speed_source, ZIPPED / name)
    with zipfile.ZipFile(ZIPPED / "speed-of-sound.zip", "w", zipfile.ZIP_DEFLATED) as bundle:
        bundle.write(speed_source, name)
        bundle.write(ARCHIVE / "tongji_logo.jpeg", "tongji_logo.jpeg")


if __name__ == "__main__":
    main()
