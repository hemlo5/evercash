import { LayoutDashboard, Wallet, Receipt, BarChart3, Target, Users, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Budgets", url: "/budgets", icon: Wallet },
  { title: "Transactions", url: "/transactions", icon: Receipt },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Goals", url: "/goals", icon: Target },
  { title: "Sharing", url: "/sharing", icon: Users },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  return (
    <Sidebar className="border-r border-border/50">
      <SidebarContent>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-emerald flex items-center justify-center font-bold text-lg">
              MB
            </div>
            <div>
              <h2 className="font-bold text-lg">MyBudget</h2>
              <p className="text-xs text-muted-foreground">Pro</p>
            </div>
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="px-6 text-muted-foreground uppercase text-xs tracking-wider">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="mx-3">
                    <NavLink
                      to={item.url}
                      end
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                          isActive
                            ? "bg-accent/20 text-accent border border-accent/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        }`
                      }
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-6">
          <div className="glass-card p-4 rounded-xl border-accent/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-emerald flex items-center justify-center">
                <span className="text-sm font-bold">JD</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">John Doe</p>
                <p className="text-xs text-muted-foreground">Premium</p>
              </div>
            </div>
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
