import { Heart, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import "./content-blocks.css"

const groups = [
  { id: "administrators", title: "群管理员", icon: Users, names: ["阿！尔！及！利！亚！", "怀梦", "机械 金龙鱼", "PPh3_O", "Herbst", "月", "yiming564", "nor"] },
  { id: "sponsors", title: "赞助者", icon: Heart, names: ["H*t", "l*n", "*🤯", "*韶", "*鱼", "大*n", "*泡", "*子", "*晴", "s*h", "b*n", "L*e", "*刘"] },
]

export function ContributorCredits() {
  return <div className="contributor-groups">
    {groups.map(({ id, title, icon: Icon, names }) => <Card key={id} className="contributor-card ring-0" role="group" aria-labelledby={`credits-${id}`}>
      <h3 id={`credits-${id}`}><Icon aria-hidden="true" />{title}<span className="contributor-count">{names.length} 位</span></h3>
      <ul className="contributor-list">
        {names.map((name) => <li key={name}><Badge variant="secondary">{name}</Badge></li>)}
      </ul>
    </Card>)}
  </div>
}
