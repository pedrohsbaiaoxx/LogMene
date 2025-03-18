import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";

type Theme = "dark" | "light" | "system";

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem("theme") as Theme) || "system"
  );

  // Aplicar tema no carregamento e quando mudar
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remover classes antigas
    root.classList.remove("light", "dark");
    
    // Salvar no localStorage
    localStorage.setItem("theme", theme);
    
    // Aplicar tema com base na escolha
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  // Alternar entre light, dark e system
  const toggleTheme = () => {
    if (theme === "dark") {
      setTheme("light");
    } else if (theme === "light") {
      setTheme("system");
    } else {
      setTheme("dark");
    }
  };

  const getThemeIcon = () => {
    switch(theme) {
      case "dark":
        return <Sun className="h-[1.2rem] w-[1.2rem]" />;
      case "light":
        return <Moon className="h-[1.2rem] w-[1.2rem]" />;
      case "system":
        return (
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="1.2rem" 
            height="1.2rem" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
            <line x1="8" x2="16" y1="21" y2="21"/>
            <line x1="12" x2="12" y1="17" y2="21"/>
          </svg>
        );
    }
  };

  const getThemeTitle = () => {
    switch(theme) {
      case "dark":
        return "Mudar para modo claro";
      case "light":
        return "Mudar para modo sistema";
      case "system":
        return "Mudar para modo escuro";
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      title={getThemeTitle()}
      className="rounded-full text-white hover:bg-primary-light transition-colors"
    >
      {getThemeIcon()}
      <span className="sr-only">Alternar tema</span>
    </Button>
  );
}