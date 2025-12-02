import { api } from "./api";
import type { FavoriteRoom } from "../types/favorite";

export const fetchFavoriteRooms = async (userId: number) => {
  const { data } = await api.get<FavoriteRoom[]>("/favorites/list", {
    params: { userId },
  });
  return Array.isArray(data) ? data : [];
};

export const toggleFavoriteRoom = async (userId: number, roomId: number) => {
  // 일부 백엔드 구현이 query param을 필수로 요구하는 경우를 위해 params와 body를 모두 전송
  await api.post(
    "/favorites/toggle",
    { userId, roomId },
    { params: { userId, roomId } }
  );
};
