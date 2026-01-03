import defaultAvatar from "@/assets/default-avatar.png";

export const selectInviteCount = (state) =>
  state.invite.invites.length;

export const selectInvitesWithAvatar = (state) => {
  const { invites, inviterAvatars } = state.invite;

  return invites.map(item => ({
    ...item,
    inviterAvatar:
      inviterAvatars[item.invited_by] || defaultAvatar,
  }));
};
