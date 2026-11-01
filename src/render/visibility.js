/**
 * Tanks the current player is allowed to see.
 *
 * Online games: show only tanks controlled by this client.
 * Hot-seat games: show only the active human's tank, so the next player must
 * infer the opponent's position from shots and impacts.
 * AI demos (no local players) keep all tanks visible.
 */
export function visibleTankIds(state, session) {
  const localPlayers = session?.localPlayers;
  if (!localPlayers || localPlayers.size === 0) return null;

  if (session.online) return new Set([...localPlayers]);

  if (localPlayers.size > 1) {
    return state.active >= 0 && localPlayers.has(state.active)
      ? new Set([state.active])
      : new Set();
  }

  return new Set([...localPlayers]);
}

export function canSeeTank(id, visibleIds) {
  return visibleIds === null || visibleIds.has(id);
}
