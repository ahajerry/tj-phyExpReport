import * as React from "react"
import { NavLink } from "react-router"
import { FlaskConical } from "lucide-react"

import { experimentGroups } from "@/experiments"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { isMobile, setOpenMobile } = useSidebar()
  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false)
  }

  return (
    <Sidebar {...props}>
      <SidebarHeader className="border-b p-3">
        <div className="flex items-center gap-2 px-2 py-1 font-semibold">
          <span className="rounded-lg bg-primary p-2 text-primary-foreground">
            <FlaskConical className="size-4" />
          </span>
          全自动大雾实验
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <NavLink to="/" end onClick={closeOnMobile} className="block">
                {({ isActive }) => (
                  <SidebarMenuButton isActive={isActive} render={<span />}>
                    首页
                  </SidebarMenuButton>
                )}
              </NavLink>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <NavLink to="/reports" onClick={closeOnMobile} className="block">
                {({ isActive }) => (
                  <SidebarMenuButton isActive={isActive} render={<span />}>
                    我的报告
                  </SidebarMenuButton>
                )}
              </NavLink>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        {experimentGroups.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <NavLink to={`/experiments/${item.id}`} onClick={closeOnMobile} className="block">
                      {({ isActive }) => (
                        <SidebarMenuButton isActive={isActive} render={<span />}>
                          {item.title}
                        </SidebarMenuButton>
                      )}
                    </NavLink>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
