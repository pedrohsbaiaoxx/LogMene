import { Bell, Menu, User } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { ThemeSwitcher } from "@/components/theme-switcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type HeaderProps = {
  title?: string;
};

export function Header({ title = "FreteApp" }: HeaderProps) {
  const { user, logoutMutation } = useAuth();
  const [, navigate] = useLocation();

  const isCompany = user?.role === "company";

  return (
    <header className="bg-primary text-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <h1 className="text-xl font-bold">
          {isCompany ? `${title} - Transportadora` : title}
        </h1>
        <div className="flex items-center space-x-2">
          <ThemeSwitcher />
          
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-white hover:bg-primary-light transition-colors"
          >
            <Bell className="h-5 w-5" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center space-x-1 rounded-full text-white hover:bg-primary-light transition-colors"
              >
                <User className="h-5 w-5 md:mr-2" />
                <span className="hidden md:inline">{user?.fullName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Perfil</DropdownMenuItem>
              <DropdownMenuItem>Configurações</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => logoutMutation.mutate()}
                className="text-destructive focus:text-destructive"
              >
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
