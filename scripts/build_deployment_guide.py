"""生成服务器部署与测试手册。"""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import PageBreak, Paragraph, Preformatted, SimpleDocTemplate, Spacer, Table, TableStyle


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output/pdf/物理实验报告系统_部署与测试流程.pdf"
pdfmetrics.registerFont(TTFont("SimHei", "C:/Windows/Fonts/simhei.ttf"))
INK = colors.HexColor("#18334A")
BLUE = colors.HexColor("#156F9C")
PALE = colors.HexColor("#EBF4F8")
MUTED = colors.HexColor("#5A7180")
S = {
    "title": ParagraphStyle("title", fontName="SimHei", fontSize=22, leading=31, textColor=INK, spaceAfter=10),
    "sub": ParagraphStyle("sub", fontName="SimHei", fontSize=10, leading=17, textColor=MUTED, wordWrap="CJK", spaceAfter=7),
    "h1": ParagraphStyle("h1", fontName="SimHei", fontSize=14, leading=21, textColor=BLUE, spaceBefore=14, spaceAfter=7),
    "h2": ParagraphStyle("h2", fontName="SimHei", fontSize=10.5, leading=17, textColor=INK, spaceBefore=10, spaceAfter=4),
    "body": ParagraphStyle("body", fontName="SimHei", fontSize=9.3, leading=16, textColor=INK, wordWrap="CJK", spaceAfter=6),
    "cell": ParagraphStyle("cell", fontName="SimHei", fontSize=8.1, leading=13.3, textColor=INK, wordWrap="CJK"),
    "code": ParagraphStyle("code", fontName="SimHei", fontSize=7.5, leading=11.3, textColor=INK),
}


def p(value, style="body"):
    return Paragraph(value, S[style])


def h(value):
    return p(value, "h1")


def sh(value):
    return p(value, "h2")


def bullet(value):
    return p("- " + value)


def table(rows, widths):
    result = Table([[p(str(cell), "cell") for cell in row] for row in rows], colWidths=widths, repeatRows=1)
    result.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PALE),
        ("LINEBELOW", (0, 0), (-1, 0), 0.8, BLUE),
        ("LINEBELOW", (0, 1), (-1, -2), 0.25, colors.HexColor("#D9E5EC")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return result


def code(value):
    result = Table([[Preformatted(value, S["code"])]], colWidths=[168 * mm])
    result.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PALE),
        ("BOX", (0, 0), (-1, -1), 0.4, colors.HexColor("#C6DDE8")),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return result


def page_frame(canvas, doc):
    width, height = A4
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#C4D8E3"))
    canvas.line(21 * mm, height - 19 * mm, width - 21 * mm, height - 19 * mm)
    canvas.line(21 * mm, 17 * mm, width - 21 * mm, 17 * mm)
    canvas.setFont("SimHei", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(21 * mm, height - 15 * mm, "物理实验报告系统 / 部署与测试流程")
    canvas.drawString(21 * mm, 12 * mm, "版本：2026-09-30")
    canvas.drawRightString(width - 21 * mm, 12 * mm, f"第 {doc.page} 页")
    canvas.restoreState()


story = [
    Spacer(1, 6 * mm),
    p("物理实验报告系统", "title"),
    p("服务器部署与测试流程", "title"),
    p("适用范围：当前 phyExpCal 工作区。示例从 Windows 上传到 Linux 服务器，使用现有 root 账号、systemd、Nginx 和 HTTPS；服务器地址、域名和证书路径请替换为实际值。", "sub"),
    h("1. 功能流程"),
    bullet("用户输入声速测定的两组位置读数、温度、频率、仪器误差与封面信息，可附原始数据图片。系统不内置 OCR，照片只进入报告原始记录页。"),
    bullet("通用后端校验请求、识别 Cookie 身份、检查每日额度，并将任务保存到 SQLite 队列；上传原图按任务编号永久归档。"),
    bullet("单个工作线程依次计算数据、转换图片、填充模板、运行两轮 XeLaTeX、保存 PDF。前端显示排队人数和阶段进度。"),
    bullet("浏览器离开后，回到“我的报告”可继续查看任务和下载。"),
    h("2. 代码结构"),
    table([
        ["文件", "职责"],
        ["backend/main.py", "通用 HTTP 入口、Cookie、图片上传、状态和下载。"],
        ["backend/report_queue.py", "SQLite 排队、每日 50 次限额、单工作线程、文件归档。"],
        ["backend/experiment_registry.py", "根据 experimentId 选择实验模块。"],
        ["backend/speed_of_sound_exp.py", "声速实验的校验、物理计算与 LaTeX 编译。"],
        ["backend/report_images.py", "校验原图并转换临时 JPEG；不改动归档原图。"],
        ["声速测定.tex", "完整声速报告模板；上传图片插入末尾原始记录页。"],
    ], [62 * mm, 106 * mm]),
    Spacer(1, 5 * mm),
    p("目前七个实验均已注册报告模块；部署包必须包含 tex/templates 下的七份模板、公共版式与全部插图。", "sub"),

    PageBreak(),
    h("3. 从 Windows 上传项目到服务器"),
    p("以下命令在本机 Windows PowerShell 执行。把 SERVER_IP 换成服务器 IP 或域名；先打包项目，再用本机 SSH 私钥上传。服务器必须已为 root 配置这把私钥对应的公钥；首次连接时按提示核对服务器指纹。"),
    code('cd D:\\Develop\\phyExpCal\npython scripts/package_deployment.py\n$key = "$env:USERPROFILE\\.ssh\\key1.pem"\nscp -i $key -o IdentitiesOnly=yes .\\output\\phyExpCal-upload.tar.gz root@SERVER_IP:/root/'),
    p("接着在本机 PowerShell 登录服务器；以下 mkdir、tar、cd 命令在服务器的 Linux 终端执行。"),
    code("ssh -i $key -o IdentitiesOnly=yes root@SERVER_IP\nmkdir -p /srv/phyExpCal\ntar -xzf /root/phyExpCal-upload.tar.gz -C /srv/phyExpCal\ncd /srv/phyExpCal\nls backend/main.py package-lock.json tex/templates/millikan.tex tex/templates/physics_report_base.tex"),
    p("若仍出现 Permission denied (publickey)，说明服务器尚未授权这把密钥，或 root 登录使用的是另一把私钥。需要在服务器控制台核对 root 的 SSH 公钥配置；不要上传或公开 .pem 私钥文件。"),
    p("看到 main.py 和 package-lock.json 后，继续下一节安装依赖。以后更新代码时可重新打包、上传并解压；压缩包不包含 node_modules、dist 或 .report-data。服务器上的 .report-data 保存已有报告和原图，更新时不要清空。"),
    sh("区分两种“上传”"),
    p("本节上传的是整套项目文件。实验原始照片不需要用 scp 上传：网站上线后，用户在“声速测定”页面填写读数，选择“上传声速测定原始数据图片”，再点击“生成报告”，图片会随任务提交到服务器。"),

    PageBreak(),
    h("4. 准备服务器与安装依赖"),
    p("项目文件应已解压到 /srv/phyExpCal。以下命令以 root 在 Debian / Ubuntu 服务器上执行；其他发行版请使用对应软件包。"),
    code("apt-get update\napt-get install python3 python3-venv nodejs npm nginx \\\n  texlive-xetex texlive-lang-chinese texlive-latex-extra texlive-pictures\ncd /srv/phyExpCal\npython3 -m venv .venv\n.venv/bin/python -m pip install -r backend/requirements.txt\nnpm ci\nnpm run build"),
    p("用 xelatex --version 和 kpsewhich FandolSong-Regular.otf 检查编译器与中文字体。两份模板均采用 TeX Live 自带 Fandol 字体集。若构建提示 Node 版本不符，按项目依赖要求升级 Node。"),
    sh("准备持久化文件"),
    code("mkdir -p /srv/phyExpCal/.report-data"),
    table([
        ["位置", "内容"],
        [".report-data/reports.sqlite3", "任务、排队顺序、状态、身份关联和当天额度。"],
        [".report-data/reports/*.pdf", "生成好的报告，供同一 Cookie 下载。"],
        [".report-data/original-images/<任务 ID>/", "永久归档上传的原始图片。"],
    ], [76 * mm, 92 * mm]),
    p("备份与迁移时需完整保留 .report-data。不要将该目录放入公开静态文件根目录。", "sub"),
    sh("运行模式"),
    p("后端默认监听 127.0.0.1:8000；可用 REPORT_HOST、REPORT_PORT 修改。生产环境只启动一个后端进程，避免多个工作线程争抢同一队列。"),

    PageBreak(),
    h("5. 启动服务并通过 IP 验证"),
    p("当前只有服务器 IP 101.133.172.222。以下是 HTTP 测试配置，供上线前联调；正式对外使用需要域名和 HTTPS 证书。先完成第 4 节，确认虚拟环境、依赖和前端构建已就绪。"),
    sh("第一段：启动后端"),
    p("以 root 登录服务器，将整段代码复制到 Linux 终端。脚本会等待后端最多约 10 秒；如果仍无法访问，会直接打印服务状态和最近日志。"),
    code("""bash <<'SCRIPT'
set -e
cd /srv/phyExpCal
test -f backend/main.py
test -f .venv/bin/python
test -f dist/index.html
mkdir -p .report-data

cat > /etc/systemd/system/phyexpcal.service <<'SERVICE'
[Unit]
Description=Physics experiment report service
After=network.target

[Service]
Type=simple
User=root
Group=root
WorkingDirectory=/srv/phyExpCal
Environment=REPORT_HOST=127.0.0.1
Environment=REPORT_PORT=8000
Environment=REPORT_COOKIE_SECURE=0
ExecStart=/srv/phyExpCal/.venv/bin/python backend/main.py --environment production
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable --now phyexpcal
systemctl restart phyexpcal
ok=0
for i in 1 2 3 4 5 6 7 8 9 10; do
    if curl -fsS http://127.0.0.1:8000/api/health; then
        ok=1
        break
    fi
    sleep 1
done
if [ "$ok" -ne 1 ]; then
    systemctl status phyexpcal --no-pager -l || true
    journalctl -u phyexpcal -n 60 --no-pager || true
    exit 1
fi
SCRIPT"""),
    p("成功时会看到 {\"service\":\"report-generator\"}。如果失败，先根据脚本输出的服务日志修复，再运行第二段。"),

    PageBreak(),
    sh("第二段：配置 Nginx"),
    p("后端检查成功后，在同一个 root 终端复制整段代码。Nginx 将网站和 /api 放在同一个 IP 下；无需删除系统默认站点。"),
    code("""bash <<'SCRIPT'
set -e
cat > /etc/nginx/sites-available/phyexpcal <<'NGINX'
server {
    listen 80;
    server_name 101.133.172.222;
    client_max_body_size 32m;

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        root /srv/phyExpCal/dist;
        try_files $uri $uri/ /index.html;
    }
}
NGINX

ln -sfn /etc/nginx/sites-available/phyexpcal \
  /etc/nginx/sites-enabled/phyexpcal
nginx -t
systemctl enable --now nginx
systemctl reload nginx
curl -fsSI http://127.0.0.1/
curl -fsS http://127.0.0.1/api/health
SCRIPT"""),
    p("两条 curl 均成功后，在电脑浏览器打开 http://101.133.172.222/。若服务器本机能访问、电脑却打不开，检查云平台安全组是否放行 TCP 80；如启用了服务器防火墙，也检查 80 端口。"),
    sh("正式切换 HTTPS"),
    p("当前 HTTP 配置仅用于验证。取得指向这台服务器的域名和有效证书后，把 Nginx 改为 443 ssl 并配置证书、HTTP 跳转；同时将服务中的 REPORT_COOKIE_SECURE 改为 1，再运行 systemctl daemon-reload、systemctl restart phyexpcal 和 nginx -t。域名与证书信息未确定前，不能把 HTTPS 命令写成可直接执行的固定值。"),

    PageBreak(),
    h("6. 上线后的逐项验收"),
    table([
        ["步骤", "操作", "预期结果"],
        ["1", "打开首页与七个实验报告页，刷新页面。", "页面加载正常；前端路由不出现 404。"],
        ["2", "填学号、两法各 20 个位置读数、温度、频率、误差；上传 1 张原始图并提交。", "跳转生成页，可看到排队数或进度。"],
        ["3", "刷新、关闭并重新进入“我的报告”。", "任务仍可找到，最终显示可下载。"],
        ["4", "下载 PDF 并检查。", "封面学号正确；第二页页头无文字；计算、讨论和思考题有内容；图片在末尾，原占位提示消失。"],
        ["5", "检查 original-images/<任务 ID>/。", "归档原图与上传文件一致。"],
        ["6", "查看“我的报告”今日提交额度。", "每日上限显示为 50；失败任务也计入额度。"],
        ["7", "重启服务，再查看已有任务。", "已完成 PDF 可下载，运行中的任务重新排队。"],
        ["8", "换测试浏览器，不上传图片提交。", "报告正常生成，原始数据记录页保留空白粘贴区。"],
    ], [14 * mm, 74 * mm, 80 * mm]),
    h("7. 接口与提交数据"),
    table([
        ["接口", "作用"],
        ["GET /api/health", "探活。"],
        ["POST /api/reports/jobs", "提交 JSON；带图片时使用 multipart/form-data：payload 放 JSON、images 放图片，并带 X-Report-Request: 1。"],
        ["GET /api/reports/session", "当前 Cookie 对应的任务和当天额度。"],
        ["GET /api/reports/jobs/{ID}", "任务状态、排队数、进度、错误、实验类型。"],
        ["GET /api/reports/jobs/{ID}/download", "下载已完成 PDF。"],
    ], [72 * mm, 96 * mm]),
    p("声速报告使用 experimentId=speed-of-sound；data 包含 resonance 和 phase 两个数组，各至少 20 个有效读数；parameters 包含两法起止温度、频率、频率误差及 caliper_error；reportInfo 可填 student、student_id、group、date。旧请求中的 partner 仍可被接收，但不会改变原模板版式。"),

    PageBreak(),
    h("8. 限制与故障排查"),
    bullet("report_user 是匿名 Cookie，有效期 1 年，带 HttpOnly 和 SameSite=Lax；HTTPS 时需设置 REPORT_COOKIE_SECURE=1。"),
    bullet("每天最多提交 50 份，按北京时间及 Cookie 身份计数。清除 Cookie 或换浏览器可取得新身份；若要严格按人限制，需要增加登录。"),
    bullet("最多 5 张图片，每张不超过 8 MiB；multipart 请求体上限 30 MiB。支持 PNG、JPEG、GIF、TIFF、WebP、HEIC、AVIF；HEIC 需要 pillow-heif。"),
    bullet("PDF 和原图不会自动删除。监控磁盘空间，定期备份并演练恢复整个 .report-data。"),
    table([
        ["现象", "检查方向"],
        ["缺少 student_id 字段", "确认部署了新版 fill_sound_speed.py；旧版字段扫描漏识别封面嵌套花括号。"],
        ["找不到 XeLaTeX 或编译失败", "检查服务进程 PATH、TeX Live 宏包和 Fandol 字体；查看 journalctl -u phyexpcal。"],
        ["部署缺少报告模板资源", "旧压缩包漏了 tex/templates；运行 python scripts/package_deployment.py，重新上传并解包。"],
        ["上传失败或 HTTP 413", "检查单图 8 MiB、请求 30 MiB、Nginx 32m 设置，以及 HEIC 解码依赖。"],
        ["刷新后找不到任务", "检查 Cookie 是否被清除、域名与 HTTPS 设置，并确认 SQLite 文件仍在。"],
        ["图片未进入 PDF", "检查归档原图、Pillow 依赖，确认下载的是新任务生成的 PDF。"],
    ], [57 * mm, 111 * mm]),
    h("9. 增加新实验报告"),
    p("为新实验编写独立模块，实现 report_fields(payload) 以校验和计算数据，实现 render_report(payload, progress, image_dir) 以返回 PDF 字节；准备相应模板，并在 experiment_registry.py 中登记 experimentId。队列、Cookie、额度与下载接口保持复用。前端增加该实验的报告表单和提交入口。"),
    h("10. 本次本地验证"),
    p("七种实验均以样例数据通过 HTTP、排队和 XeLaTeX 编译；另从实际部署压缩包解包后重新生成密立根 PDF，确认模板和插图都随包交付。正式上线仍应按第 6 节在服务器逐项验收。"),
]

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
doc = SimpleDocTemplate(
    str(OUTPUT), pagesize=A4, leftMargin=21 * mm, rightMargin=21 * mm,
    topMargin=24 * mm, bottomMargin=23 * mm,
    title="物理实验报告系统 - 部署与测试流程", author="phyExpCal",
)
doc.build(story, onFirstPage=page_frame, onLaterPages=page_frame)
print(OUTPUT)
