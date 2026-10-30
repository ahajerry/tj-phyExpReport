import * as React from "react"
import { Link, useLocation } from "react-router"
import { experimentGroups } from "@/experiments"
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar"

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { isMobile, setOpenMobile } = useSidebar()
  const { pathname } = useLocation()
  const contentRef = React.useRef<HTMLDivElement>(null)

  React.useLayoutEffect(() => {
    const container = contentRef.current
    const active = container?.querySelector<HTMLElement>('[data-active]')
    if (!container || !active) return
    const bounds = container.getBoundingClientRect()
    const item = active.getBoundingClientRect()
    if (item.top < bounds.top + 24 || item.bottom > bounds.bottom - 24) {
      container.scrollTop += item.top - bounds.top - (container.clientHeight - item.height) / 2
    }
  }, [pathname, isMobile])
  const groups = [
    { title: "导航", items: [
      { to: "/", title: "首页" },
      { to: "/about", title: "关于" },
      { to: "/reports", title: "我的报告" },
    ] },
    ...experimentGroups.map((group) => ({
      title: group.title,
      items: group.items.map((item) => ({ to: `/experiments/${item.id}`, title: item.title })),
    })),
  ]
  return (
    <Sidebar {...props}>
      <div aria-hidden="true" className="docs-navigation-divider" />
      <SidebarContent ref={contentRef} className="docs-navigation overflow-x-hidden overscroll-none">
        <nav aria-label="主导航">
          {groups.map((group) => (
            <SidebarGroup key={group.title} className="first:pt-6 last:pb-6">
              <SidebarGroupLabel className="font-medium text-muted-foreground">{group.title}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        isActive={pathname === item.to || (item.to !== "/" && pathname.startsWith(`${item.to}/`))}
                        className="relative h-[30px] w-fit max-w-full overflow-visible border border-transparent text-[0.8rem] font-medium after:absolute after:inset-x-0 after:-inset-y-1 after:z-0 after:rounded-md data-active:border-accent data-active:bg-accent"
                        render={<Link to={item.to} aria-current={pathname === item.to || (item.to !== "/" && pathname.startsWith(`${item.to}/`)) ? "page" : undefined} onClick={() => { if (isMobile) setOpenMobile(false) }} />}
                      >
                        <span aria-hidden="true" className="absolute inset-0 flex w-[calc(var(--sidebar-width)-3rem)] bg-transparent" />
                        {item.title}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </nav>
      </SidebarContent>
    </Sidebar>
  )
}
