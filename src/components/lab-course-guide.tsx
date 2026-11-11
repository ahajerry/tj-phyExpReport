import { Link } from "react-router"
import { Callout } from "@/components/callout"

const courseGuideSections = [
  { id: "materials-platforms", title: "课程平台与用途" },
  { id: "materials-preparation", title: "预习与虚拟实验" },
  { id: "materials-makeup", title: "必做实验补做预约" },
  { id: "materials-grading", title: "报告提交与 AI 评阅" },
  { id: "materials-review", title: "教师复核与成绩查看" },
] as const

const [platforms, preparation, makeup, grading, review] = courseGuideSections

export function LabCourseGuide() {
  return (
    <>
      <nav aria-label="资料页目录" className="grid gap-x-6 gap-y-2 rounded-lg border bg-muted/40 px-5 py-4 sm:grid-cols-2">
        {courseGuideSections.map(({ id, title }) => (
          <Link key={id} to={{ hash: `#${id}` }}>{title}</Link>
        ))}
        <Link to={{ hash: "#materials-indicators" }}>各实验三级指标</Link>
      </nav>

      <section aria-labelledby={platforms.id}>
        <h2 id={platforms.id} tabIndex={-1} className="materials-heading">{platforms.title}</h2>
        <ul>
          <li><strong>Canvas</strong>用于查看通知公告、课程日历和虚拟仿真实验操作手册。</li>
          <li><strong>超星学习通</strong>提供线上课程、八个必做实验的预习相关内容、操作视频和资料模板。</li>
          <li>
            <a href="http://202.120.171.159/index">实验数据管理系统</a>（校园网）用于提交 <code>.txt</code> 实验数据、查询 AI 评分和上传课后计算结果。
            <br />账号为学号，初始密码为 <code>Tj@123456</code>。
          </li>
          <li>
            <a href="http://phyvr.tongji.edu.cn/Page/BI/BI0000.aspx">同济大学物理实验中心</a>是虚拟仿真实验入口。
            <br />用户名和密码均为学号。
          </li>
          <li>
            <a href="http://mphylab.tongji.edu.cn/sysindex">教学资源管理系统（mphylab）</a>用于提交实验报告、查看实验任务、题库成绩、虚拟仿真成绩和学习进度，也可预约开放实验和参加自选实验。
            <br />账号为学号，课程资料所列密码为 <code>TONGJIPhylab#1</code>。
          </li>
          <li><strong>同济大学物理实验教学示范中心服务号</strong>可查看课程表、自选实验、成绩、微课程、自测题、实验仪器和学习资料。</li>
          <li>
            <a href="http://192.168.60.88">实验数据收集系统</a>用于收集实验数据和下载 <code>.txt</code>、<code>.xlsx</code> 文件。请在实验室内连接所在实验室的 Wi-Fi 后访问。
            <br />用户名为学号，初始密码为 <code>12345678</code>。
          </li>
        </ul>
      </section>

      <section aria-labelledby={preparation.id}>
        <h2 id={preparation.id} tabIndex={-1} className="materials-heading">{preparation.title}</h2>
        <p>实验预习包括学习通线上课程、虚拟仿真实验和预习自测。</p>
        <ul>
          <li><strong>虚拟仿真实验</strong>共需完成三个，其中「误差」必做，另外两个任选。</li>
          <li><strong>预习自测</strong>可在服务号或 mphylab 完成。各次自测先取平均分，再按权重计入总分。目前已确认会影响 AI 评阅分数的预习环节是预习自测。</li>
        </ul>
        <Callout color="amber" title="待确认">
          据收集到的答疑，两个任选实验均达到「80 分以上」可获得虚拟实验部分的 5 分。是否包含 80 分、「误差」是否另有达标要求，以及学习通上的预习内容是否仅为题库，均待确认。
        </Callout>
      </section>

      <section aria-labelledby={makeup.id}>
        <h2 id={makeup.id} tabIndex={-1} className="materials-heading">{makeup.title}</h2>
        <ol>
          <li>打开<a href="http://mphylab.tongji.edu.cn/">教学资源管理系统</a>，进入「学生功能」→「开放实验预约」。在页面上方搜索栏的「项目」中输入必做实验名称，再选择周次、星期和节次完成预约。</li>
          <li>大学物理实验必做项目可约周一至周五 11:50–13:20，医用物理实验必做项目可约周四 11:50–13:20。</li>
          <li>因病假或事假申请补做，携带病假单或班主任签字的事假单。任课教师要求或允许补做时，携带原数据记录单，单上须有任课教师写明的「允许安排补做」及签名。缺少其中任一项时，联系任课教师。</li>
          <li>补做完成后，将实验数据单交当日值班教师签字，并在一周内将实验报告提交至 mphylab。</li>
        </ol>
      </section>

      <section aria-labelledby={grading.id}>
        <h2 id={grading.id} tabIndex={-1} className="materials-heading">{grading.title}</h2>
        <p>评阅及复核流程依据目前收集到的答疑整理，具体操作以课程通知和任课教师要求为准。</p>
        <ol>
          <li>报告提交后需排队等待评分。在 mphylab 的「外围系统」→「AI 评阅」查看报告的 AI 评分。若 AI 尚未评分而教师已审批，请联系任课教师。</li>
          <li>超过期限仍未交齐报告和数据单时，可以补交，AI 会重新评分。</li>
          <li>查看评价结果时，先检查「附件」里的材料。发现错交、缺页、无法打开或下载失败时，联系任课教师确认。</li>
          <li>材料已交齐并正常评分后，再次上传不会自动重评。需要换件时，请任课教师确认是否撤销或打回成绩。处理后，按教师要求在 mphylab 重新提交正确材料，系统才会重新处理。</li>
        </ol>
        <p>教师联系方式可在服务号的「我的空间」→「课程表」中查看。</p>
      </section>

      <section aria-labelledby={review.id}>
        <h2 id={review.id} tabIndex={-1} className="materials-heading">{review.title}</h2>
        <ol>
          <li><strong>首次复核前</strong>，总成绩暂不显示。可以查看三级指标等级、评分原因和依据，并申请教师复核。</li>
          <li><strong>首次复核后</strong>，可以查看成绩。如仍有异议，可再申请一轮复核。</li>
          <li><strong>第二轮复核后</strong>，可以查看最终成绩，复核申请随之关闭。</li>
        </ol>
        <p>此前答疑称首次复核预计在第 15 周内完成，具体时间取决于各实验评分细则的制定进度。部分同学较早完成复核，是因为相应实验的评分细则已确定。</p>
      </section>
    </>
  )
}
