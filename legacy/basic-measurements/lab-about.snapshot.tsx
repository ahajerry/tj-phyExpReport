// export function LabAbout({ children }: { children: React.ReactNode }) {
//   return (
//     <article className="about-prose">
//       <header>
//         <p className="about-kicker">关于</p>
//         <h1>让好奇，有迹可循。</h1>
//         <p className="about-lead">从真实的实验读数出发，理解规律，记录探索。</p>
//       </header>
//       <p><strong>测试阶段。</strong>请使用自己的实验数据。报告模板仍在完善，提交作业前请逐项核对。</p>
//       <section id="experiment-catalog" aria-labelledby="catalog-title">
//         <h2 id="catalog-title">选择你的实验</h2>
//         <p>目前提供 8 项自主实验与 2 项基础测量。选择实验后，即可录入读数并查看结果。</p>
//         {experimentGroups.map((group) => (
//           <section key={group.title}>
//             <h3>{group.title}</h3>
//             <ul>{group.items.map((item) => <li key={item.id}><Link to={`/experiments/${item.id}`}>{item.title}</Link></li>)}</ul>
//           </section>
//         ))}
//       </section>
//       <section aria-labelledby="workflow-title">
//         <h2 id="workflow-title">使用流程</h2>
//         <ol>
//           <li><strong>记录真实读数。</strong>手动录入，或通过实验页面下方的 JSON 输入框导入原始数据。</li>
//           <li><strong>理解实验结果。</strong>查看计算结果、图表与不确定度，核对每一项测量。</li>
//           <li><strong>整理实验报告。</strong>提交生成任务，在「我的报告」查看进度并下载 PDF。</li>
//         </ol>
//       </section>
//       {children}
//       <footer>济了！ / 让测量回归探索</footer>
//     </article>
//   )
// }

export function LabAbout({ children }: { children: React.ReactNode }) {
  return (
    <article className="about-prose">
      {children}
    </article>
  )}