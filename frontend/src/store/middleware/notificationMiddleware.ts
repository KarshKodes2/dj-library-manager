// frontend/src/store/middleware/notificationMiddleware.ts
import { Middleware } from "@reduxjs/toolkit";
import { toast } from "sonner";
import { addNotification } from "../slices/uiSlice";

// Create the notification middleware
export const notificationMiddleware: Middleware =
  (store) => (next) => (action) => {
    const result = next(action);

    // Listen for Redux notification actions and show Sonner toasts
    if (action.type === addNotification.type) {
      const notification = action.payload;

      switch (notification.type) {
        case "success":
          toast.success(notification.title, {
            description: notification.message,
            duration: 4000,
          });
          break;
        case "error":
          toast.error(notification.title, {
            description: notification.message,
            duration: 6000, // Longer for errors
          });
          break;
        case "warning":
          toast.warning(notification.title, {
            description: notification.message,
            duration: 5000,
          });
          break;
        case "info":
        default:
          toast.info(notification.title, {
            description: notification.message,
            duration: 4000,
          });
          break;
      }
    }

    return result;
  };
