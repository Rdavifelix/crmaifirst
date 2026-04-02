import { Link, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  Link as LinkIcon,
  MessageCircle,
  Kanban,
  BarChart3,
  Settings,
  LogOut,
  Users,
  Target,
  UserCog,
  ClipboardList,
  Megaphone,
  CalendarDays,
  Flag,
  TableProperties,
} from 'lucide-react';
import { WhatsAppStatusBadge } from '@/components/whatsapp/WhatsAppStatusBadge';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { Badge } from '@/components/ui/badge';

const menuItems = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: BarChart3,
  },
  {
    title: 'Metas',
    url: '/metas',
    icon: Flag,
  },
  {
    title: 'Gerador UTM',
    url: '/utm-generator',
    icon: LinkIcon,
  },
  {
    title: 'WhatsApp CRM',
    url: '/whatsapp',
    icon: MessageCircle,
  },
  {
    title: 'Pipeline Vendas',
    url: '/pipeline-vendas',
    icon: TableProperties,
  },
  {
    title: 'Funil de Vendas',
    url: '/funnel',
    icon: Kanban,
  },
  {
    title: 'Pós-Venda',
    url: '/post-sale',
    icon: Target,
  },
  {
    title: 'Leads',
    url: '/leads',
    icon: Users,
  },
  {
    title: 'Agenda',
    url: '/agenda',
    icon: CalendarDays,
  },
  {
    title: 'Comerciais',
    url: '/sellers',
    icon: UserCog,
  },
  {
    title: 'Entrevistas',
    url: '/interviews',
    icon: ClipboardList,
  },
  {
    title: 'Marketing',
    url: '/marketing',
    icon: Megaphone,
  },
];

export function AppSidebar() {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const unreadCount = useUnreadMessages();

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-sidebar-primary rounded-lg">
            <LinkIcon className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-sidebar-foreground">Lead Tracker</h2>
            <p className="text-xs text-sidebar-foreground/60">CRM + UTM</p>
          </div>
        </div>
        {/* WhatsApp Status Badge */}
        <div className="mt-3">
          <WhatsAppStatusBadge />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                  >
                    <Link to={item.url} className="relative">
                      <item.icon />
                      <span>{item.title}</span>
                      {item.url === '/whatsapp' && unreadCount > 0 && (
                        <Badge variant="destructive" className="ml-auto h-5 min-w-5 px-1.5 text-[10px] font-bold">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Definições</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === '/settings'}>
                   <Link to="/settings">
                    <Settings />
                    <span>Definições</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.email}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            className="text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}