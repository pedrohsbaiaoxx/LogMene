import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  const parsedDate = typeof date === 'string' ? new Date(date) : date;
  return format(parsedDate, "dd/MM/yyyy", {
    locale: ptBR,
  })
}

export function formatDateTime(date: Date | string): string {
  const parsedDate = typeof date === 'string' ? new Date(date) : date;
  return format(parsedDate, "dd/MM/yyyy 'às' HH:mm", {
    locale: ptBR,
  })
}

export function formatISODateToDisplay(isoDate: string | null | undefined): string {
  if (!isoDate) return '';
  return formatDate(new Date(isoDate));
}
