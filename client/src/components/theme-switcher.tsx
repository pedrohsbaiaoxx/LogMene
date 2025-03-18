import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Monitor } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    
    // Aplicar tema com base na escolha, forçando o tema escuro em todo o documento
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
      
      // Força a aplicação do tema em todos os elementos
      document.body.className = systemTheme;
    } else {
      root.classList.add(theme);
      
      // Força a aplicação do tema em todos os elementos
      document.body.className = theme;
    }
    
    // Força a atualização de todas as propriedades CSS
    if (theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.body.style.backgroundColor = "#0f172a"; // bg-slate-900
      document.body.style.color = "#f8fafc"; // text-slate-50
    } else {
      document.body.style.backgroundColor = "";
      document.body.style.color = "";
    }
  }, [theme]);

  // Removido o getThemeIcon que não é mais usado na versão simplificada

  // Versão simplificada com apenas toggle claro/escuro
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="rounded-full text-white hover:bg-white/20 transition-colors"
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
      <span className="sr-only">Alternar tema</span>
    </Button>
  );
}