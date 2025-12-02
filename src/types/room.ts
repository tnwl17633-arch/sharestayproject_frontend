// 이미지 URL 앞에 베이스 URL 붙여주는 유틸
const assetBaseUrl = (import.meta.env.VITE_BASE_URL ?? "").replace(/\/$/, "");

export const resolveRoomImageUrl = (value?: string | null) => {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  if (!assetBaseUrl) return value;
  const trimmed = value.startsWith("/") ? value.slice(1) : value;
  return `${assetBaseUrl}/${trimmed}`;
};

/**
 * 🔹 백엔드 RoomImageResponse 와 1:1 매칭
 *  - { id: number, imageUrl: string }
 */
export interface RoomImageResponse {
  id: number;
  imageUrl: string;
}

/**
 * 프론트에서 내부적으로 쓰는 이미지 타입
 *  - isPrimary, roomId 같은 추가 정보도 넣을 수 있게 별도로 둠
 */
export interface RoomImage {
  id?: number;
  imageId?: number;
  roomId?: number;
  imageUrl: string;
  isPrimary?: boolean;
}

/**
 * availabilityStatus: 백엔드는 int지만
 *  - 프론트에서 enum 스타일로도 쓸 수 있게 union 유지
 */
export type RoomAvailabilityStatus = "AVAILABLE" | "UNAVAILABLE" | "PENDING";

/**
 * 프론트에서 화면 그릴 때 쓰는 요약 타입
 *  - API 응답을 map 해서 이 타입으로 변환해서 사용
 */
export interface RoomSummary {
  roomId?: number;
  id?: number;
  hostId?: number;
  title: string;
  rentPrice: number;
  address: string;
  type: string;
  latitude?: number;
  longitude?: number;
  availabilityStatus: RoomAvailabilityStatus | number;
  description?: string;
  safetyScore?: number;
  trustScore?: number;
  tags?: string[];
  isFavorite?: boolean;
  favoriteId?: number;
  options?: string[] | string | null;
  images?: RoomImage[];
  shareLinkUrl?: string;
}

/**
 * 🔹 백엔드 RoomRequest 와 1:1 매칭
 *  - JSON body / FormData 로 보낼 때 이 구조 기반
 */
export interface RoomRequestPayload {
  hostId: number;
  title: string;
  rentPrice: number;
  address: string;
  type: string;
  availabilityStatus: number;
  description: string;
  latitude: number;
  longitude: number;
}

/**
 * 🔹 백엔드 RoomResponse 와 1:1 매칭
 *  - GET /api/rooms, POST /api/rooms 응답 타입
 */
export interface RoomApiResponse {
  id: number;
  title: string;
  rentPrice: number;
  address: string;
  type: string;
  availabilityStatus: number;
  description: string;
  images: RoomImageResponse[];
  imageUrls?: string[];      // optional fallback list of URLs
  shareLinkUrl?: string | null;
  shareLink?: { linkUrl?: string | null }; // 일부 백엔드 응답이 객체를 줄 수 있음
}

/**
 * 🔹 백엔드 RoomDetailResponse 와 1:1 매칭
 *  - GET /api/rooms/{roomId} 응답 타입
 *  - RoomResponse 를 상속하진 않고, 명시적으로 분리
 *    (백엔드도 DTO를 따로 쓰니까)
 */
export interface RoomDetailApiResponse {
  id: number;
  title: string;
  rentPrice: number;
  address: string;
  type: string;
  availabilityStatus: number;
  description: string;
  latitude: number;
  longitude: number;
  images?: RoomImageResponse[];  // List<RoomImageResponse> (optional for compatibility)
  imageUrls?: string[];          // List<String> (optional fallback)
  shareLinkUrl?: string | null;
  shareLink?: { linkUrl?: string | null };
}

/**
 * 공유 링크 조회 응답 (백엔드 ShareLinkResponse 와 맞춰서 사용)
 */
export interface ShareLinkResponse {
  linkUrl: string;
}

/**
 * 🔁 RoomApiResponse → 프론트에서 쓰는 RoomSummary 로 변환
 *  - 리스트 / 검색 결과 등에 사용
 *  - RoomResponse.images(List<RoomImageResponse>) 를
 *    프론트 내부 RoomImage[] 로 변환
 */
export const mapRoomFromApi = (
  room: RoomApiResponse | RoomDetailApiResponse,
): RoomSummary => {
  const normalizedImages: RoomImage[] =
    room.images?.map((image) => ({
      id: image.id,
      imageId: image.id,
      roomId: room.id,
      imageUrl: resolveRoomImageUrl(image.imageUrl) ?? image.imageUrl ?? "",
    })) ??
    room.imageUrls?.map((url, index) => ({
      id: index,
      imageId: index,
      roomId: room.id,
      imageUrl: resolveRoomImageUrl(url) ?? url ?? "",
    })) ??
    [];

  return {
    roomId: room.id,
    id: room.id,
    title: room.title,
    rentPrice: room.rentPrice,
    address: room.address,
    type: room.type,
    availabilityStatus: room.availabilityStatus,
    description: room.description,
    images: normalizedImages,
    shareLinkUrl: room.shareLinkUrl ?? room.shareLink?.linkUrl ?? undefined,
  };
};
