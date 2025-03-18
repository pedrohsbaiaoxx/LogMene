import { Link } from "wouter";
import { BarChart2, Home, Package, PlusCircle, Truck, Bell } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function BottomNavigation() {
  const { user } = useAuth();
  const isCompany = user?.role === "company";

  return (
    <nav className="bg-white shadow-md border-t border-neutral-200 md:hidden fixed bottom-0 left-0 right-0 z-10">
      <div className="flex justify-around">
        {isCompany ? (
          <>
            <NavItem href="/" icon={<Home />} label="Painel" />
            <NavItem href="/company/clients" icon={<Package />} label="Clientes" />
            <NavItem href="/" icon={<Truck />} label="Fretes" />
            <NavItem href="/" icon={<BarChart2 />} label="Relatórios" />
          </>
        ) : (
          <>
            <NavItem href="/" icon={<Home />} label="Painel" />
            <NavItem href="/requests" icon={<Package />} label="Solicitações" />
            <NavItem href="/requests/new" icon={<PlusCircle />} label="Novo" />
            <NavItem href="/" icon={<Bell />} label="Avisos" />
          </>
        )}
      </div>
    </nav>
  );
}

type NavItemProps = {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
};

function NavItem({ href, icon, label, isActive = false }: NavItemProps) {
  return (
    <div className="flex-1">
      <Link href={href}>
        <div className={`flex flex-col items-center py-2 px-4 ${isActive ? 'text-primary' : 'text-neutral-500 hover:text-primary'} cursor-pointer`}>
          <div className="text-current">
            {icon}
          </div>
          <span className="text-xs mt-1">{label}</span>
        </div>
      </Link>
    </div>
  );
}
