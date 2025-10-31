// frontend/src/components/common/NotificationContainer.tsx
import React from "react";
import { X } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store";
import { removeNotification } from "../../store/slices/uiSlice";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const NotificationContainer: React.FC = () => {
  const dispatch = useAppDispatch();
  const { notifications } = useAppSelector((state) => state.ui);

  const getNotificationStyles = (type: string) => {
    switch (type) {
      case "success":
        return "border-green-500/50 bg-green-500/10 text-green-500";
      case "error":
        return "border-red-500/50 bg-red-500/10 text-red-500";
      case "warning":
        return "border-yellow-500/50 bg-yellow-500/10 text-yellow-500";
      case "info":
      default:
        return "border-blue-500/50 bg-blue-500/10 text-blue-500";
    }
  };

  const handleDismiss = (id: string) => {
    dispatch(removeNotification(id));
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <Card
          key={notification.id}
          className={cn(
            "p-4 shadow-lg transition-all duration-300 ease-in-out",
            getNotificationStyles(notification.type)
          )}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-medium">{notification.title}</h4>
              <p className="text-sm opacity-90 mt-1">{notification.message}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDismiss(notification.id)}
              className="ml-2 h-6 w-6 opacity-70 hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default NotificationContainer;
