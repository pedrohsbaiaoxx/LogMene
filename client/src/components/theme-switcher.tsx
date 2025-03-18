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

  // Alternar entre light e dark
  const toggleTheme = () => {
    if (theme === "dark") {
      setTheme("light");
    } else {
      setTheme("dark");
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      title={`Mudar para modo ${theme === "dark" ? "claro" : "escuro"}`}
      className="rounded-full text-white hover:bg-primary-light transition-colors"
    >
      {theme === "dark" ? (
        <Sun className="h-[1.2rem] w-[1.2rem]" />
      ) : (
        <Moon className="h-[1.2rem] w-[1.2rem]" />
      )}
      <span className="sr-only">Alternar tema</span>
    </Button>
  );
}