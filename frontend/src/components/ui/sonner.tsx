import React from "react";
import { Toaster as SonnerToaster } from "sonner";
import { useThemeStore } from "../../store/themeStore";

type ToasterProps = React.ComponentProps<typeof SonnerToaster>;

export const Toaster = ({ ...props }: ToasterProps) => {
  const theme = useThemeStore((state: any) => state.theme) || "dark";

  return (
    <SonnerToaster
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      closeButton={true}
      duration={4500}
      offset={20}
      gap={10}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border-border group-[.toaster]:shadow-2xl",
          title: "text-foreground font-bold tracking-tight text-sm",
          description: "text-muted-foreground text-xs leading-relaxed mt-0.5",
          actionButton:
            "bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs px-3 py-1.5 rounded-lg",
          cancelButton:
            "bg-muted hover:bg-muted/80 text-foreground font-semibold text-xs px-3 py-1.5 rounded-lg",
          closeButton: "sonner-close-button",
        },
      }}
      {...props}
    />
  );
};
