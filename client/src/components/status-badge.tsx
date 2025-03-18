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
          text: "Pendente",
          bgColor: "bg-warning/20",
          textColor: "text-warning",
        };
      case "quoted":
        return {
          text: "Cotado",
          bgColor: "bg-info/20",
          textColor: "text-info",
        };
      case "accepted":
        return {
          text: "Aceito",
          bgColor: "bg-primary/20",
          textColor: "text-primary",
        };
      case "rejected":
        return {
          text: "Recusado",
          bgColor: "bg-destructive/20",
          textColor: "text-destructive",
        };
      case "completed":
        return {
          text: "Concluído",
          bgColor: "bg-success/20",
          textColor: "text-success",
        };
      default:
        return {
          text: status,
          bgColor: "bg-neutral-200",
          textColor: "text-neutral-700",
        };
    }
  };

  const { text, bgColor, textColor } = getStatusConfig(status);

  return (
    <span
      className={cn(
        "px-2 py-1 rounded-md text-xs font-medium",
        bgColor,
        textColor,
        className
      )}
    >
      {text}
    </span>
  );
}
