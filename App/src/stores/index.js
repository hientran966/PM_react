import { configureStore } from "@reduxjs/toolkit";
import projectReducer from "@/stores/projectSlice";
import taskReducer from "@/stores/taskSlice";
import notiReducer from "@/stores/notificationSlice";
import inviteReducer from "@/stores/inviteSlice";
import chatReducer from "@/stores/chatSlice"

export const store = configureStore({
  reducer: {
    project: projectReducer,
    task: taskReducer,
    notification: notiReducer,
    invite: inviteReducer,
    chat: chatReducer,
  },
});