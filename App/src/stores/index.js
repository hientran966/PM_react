import { configureStore } from "@reduxjs/toolkit";
import projectReducer from "@/stores/projectSlice";
import taskReducer from "@/stores/taskSlice";
import notiReducer from "@/stores/notificationSlice";
import inviteReducer from "@/stores/inviteSlice";
import chatReducer from "@/stores/chatSlice";
import commentReducer from "@/stores/commentSlice";
import fileReducer from "@/stores/fileSlice";
import activityReducer from "@/stores/activitySlice";

export const store = configureStore({
  reducer: {
    project: projectReducer,
    task: taskReducer,
    notification: notiReducer,
    invite: inviteReducer,
    chat: chatReducer,
    comment: commentReducer,
    file: fileReducer,
    activity: activityReducer,
  },
});