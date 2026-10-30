import { useEffect } from "react"
// import { Stardust } from "./stardust"
import "./serif-glow.css"

export function SerifGlowHome() {
  useEffect(() => { window.scrollTo(0, 0) }, [])
  return <section className="minimal-home" aria-labelledby="home-title" lang="zh-CN">
    {/* 星空暂时关闭；恢复时取消 Stardust 的导入与下方组件注释。 */}
    {/* <Stardust /> */}
    <h1 id="home-title">全自动大物实验</h1>
  </section>
}
