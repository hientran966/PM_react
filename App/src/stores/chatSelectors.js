export const selectChatByChannel = (state, channelId) =>
  state.chat.chatByChannel[channelId] || [];

export const selectChannels = (state) => state.chat.channels;

export const selectMembersByChannel = (state, channelId) =>
  state.chat.membersByChannel[channelId] || [];
