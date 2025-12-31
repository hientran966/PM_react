import { ElMessage } from "element-plus";

let activeMessage = false;

export const notify = ({
  message,
  type = "error",
  duration = 3000,
}) => {
  if (activeMessage) return;

  activeMessage = true;

  ElMessage({
    message,
    type,
    duration,
    onClose: () => {
      activeMessage = false;
    },
  });
};