import React from "react";
import { Link, useLocation } from "wouter";
import { BarChart2, Home, Package, PlusCircle, Truck, Bell, FileText } from "lucide-react";
import { useAuth } from "../hooks/use-auth";

export function BottomNavigation() {
  const { user } = useAuth();
  const isCompany = user?.role === "company";
  const [location] = useLocation();

  return (
    <nav className="bg-white shadow-md border-t border-neutral-200 md:hidden fixed bottom-0 left-0 right-0 z-10">
      <div className="flex justify-around">
        {isCompany ? (
          <>
            <NavItem href="/" icon={<Home />} label="Painel" isActive={location === '/'} />
            <NavItem href="/company/clients" icon={<Package />} label="Clientes" isActive={location.startsWith('/company/clients')} />
            <NavItem href="/company/active-requests" icon={<Truck />} label="Fretes" isActive={location.includes('requests')} />
            <NavItem href="/" icon={<BarChart2 />} label="Relatórios" isActive={location.includes('reports')} />
          </>
        ) : (
          <>
            <NavItem href="/" icon={<Home />} label="Painel" isActive={location === '/'} />
            <NavItem href="/requests" icon={<Package />} label="Solicitações" isActive={location === '/requests' || location.includes('/requests/')} />
            <NavItem href="/requests/new" icon={<PlusCircle />} label="Novo" isActive={location === '/requests/new'} />
            <NavItem href="/reports" icon={<FileText />} label="Relatórios" isActive={location === '/reports'} />
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
        <div className={`flex flex-col items-center py-2 px-4 ${isActive ? 'text-primary font-medium' : 'text-neutral-500 hover:text-primary'} cursor-pointer`}>
          <div className="text-current">
            {icon}
          </div>
          <span className="text-xs mt-1">{label}</span>
        </div>
      </Link>
    </div>
  );
}
