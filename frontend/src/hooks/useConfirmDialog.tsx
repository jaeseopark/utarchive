import { useState, useCallback } from "react";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";

interface ConfirmDialogConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

export function useConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<ConfirmDialogConfig>({
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const open = useCallback((newConfig: ConfirmDialogConfig) => {
    setConfig(newConfig);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleCancel = useCallback(() => {
    config.onCancel?.();
    close();
  }, [config, close]);

  function Component() {
    return (
      <ConfirmDialog
        isOpen={isOpen}
        title={config.title}
        message={config.message}
        confirmText={config.confirmText}
        cancelText={config.cancelText}
        variant={config.variant}
        isLoading={config.isLoading}
        onConfirm={config.onConfirm}
        onCancel={handleCancel}
      />
    );
  }

  return {
    isOpen,
    open,
    close,
    Component,
  };
}
