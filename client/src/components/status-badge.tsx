import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  status: string;
  className?: string;
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "pending":
        return {
          label: "Pendente",
          variant: "outline",
          className: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
        };
      case "quoted":
        return {
          label: "Orçamento Enviado",
          variant: "outline",
          className: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
        };
      case "accepted":
        return {
          label: "Aceito",
          variant: "outline",
          className: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
        };
      case "rejected":
        return {
          label: "Recusado",
          variant: "outline",
          className: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
        };
      case "completed":
        return {
          label: "Concluído",
          variant: "outline",
          className: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800",
        };
      default:
        return {
          label: status,
          variant: "outline",
          className: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
        };
    }
  };

  const { label, className: statusClassName } = getStatusConfig(status);

  return (
    <Badge 
      variant="outline" 
      className={cn("font-medium capitalize", statusClassName, className)}
    >
      {label}
    </Badge>
  );
}