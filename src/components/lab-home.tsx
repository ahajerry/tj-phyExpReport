import { CharacterOceanHome } from "./home-variants/character-ocean"
import { SerifGlowHome } from "./home-variants/serif-glow"

// 新方案注册在这里，修改 activeHomeVariant 即可切换首页。
const homeVariants = {
  "serif-glow": SerifGlowHome,
  "character-ocean": CharacterOceanHome,
} as const

const activeHomeVariant: keyof typeof homeVariants = "character-ocean"

export function LabHome() {
  const HomeVariant = homeVariants[activeHomeVariant]
  return <HomeVariant />
}
