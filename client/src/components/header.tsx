import { Menu, Package, LogOut, User, Truck, Settings } from "lucide-react";
import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { NotificationBell } from "@/components/notification-bell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type HeaderProps = {
  title?: string;
};

export function Header({ title = "LogMene" }: HeaderProps) {
  const { user, logoutMutation } = useAuth();
  const [, navigate] = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);

  const isCompany = user?.role === "company";

  const menuItems = isCompany 
    ? [
        { label: "Painel", href: "/", icon: <Truck className="h-5 w-5 mr-2" /> },
        { label: "Clientes", href: "/company/clients", icon: <User className="h-5 w-5 mr-2" /> },
        { label: "Configurações", href: "/settings", icon: <Settings className="h-5 w-5 mr-2" /> },
      ]
    : [
        { label: "Painel", href: "/", icon: <Truck className="h-5 w-5 mr-2" /> },
        { label: "Minhas Solicitações", href: "/", icon: <Package className="h-5 w-5 mr-2" /> },
        { label: "Configurações", href: "/settings", icon: <Settings className="h-5 w-5 mr-2" /> },
      ];

  return (
    <header className="sticky top-0 z-20 bg-primary text-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        {/* Logo e Menu para Mobile */}
        <div className="flex items-center">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white md:hidden mr-2">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[250px] sm:w-[300px] border-r bg-primary text-white">
              <SheetHeader className="text-left pb-6 border-b border-white/20">
                <div className="text-xl font-bold">{title}</div>
                <div className="text-sm opacity-80">{user?.fullName}</div>
              </SheetHeader>
              <div className="flex flex-col gap-1 py-4">
                {menuItems.map((item, index) => (
                  <SheetClose key={index} asChild>
                    <Link 
                      href={item.href}
                      className="flex items-center py-3 px-4 rounded-md hover:bg-white/10 transition"
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  </SheetClose>
                ))}
                <div className="mt-auto pt-6 border-t border-white/20">
                  <SheetClose asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-white hover:bg-white/10"
                      onClick={() => logoutMutation.mutate()}
                    >
                      <LogOut className="h-5 w-5 mr-2" />
                      Sair
                    </Button>
                  </SheetClose>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <h1 className="text-xl font-bold">
            <span className="flex items-center">
              <Truck className="h-5 w-5 mr-2 hidden sm:inline-block" />
              <span>{title}</span>
            </span>
          </h1>
        </div>

        {/* Menu de navegação horizontal para Desktop */}
        <div className="hidden md:flex items-center space-x-6">
          {menuItems.map((item, index) => (
            <Link 
              key={index}
              href={item.href}
              className="text-sm font-medium text-white hover:text-white/80 transition"
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Ações à direita */}
        <div className="flex items-center space-x-2">
          <ThemeSwitcher />
          
          {user && (
            <NotificationBell />
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center space-x-1 rounded-full text-white hover:bg-primary-light transition-colors"
              >
                <User className="h-5 w-5" />
                <span className="hidden md:inline">{isCompany ? "Empresa" : "Cliente"}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={() => logoutMutation.mutate()}
                className="flex items-center"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
