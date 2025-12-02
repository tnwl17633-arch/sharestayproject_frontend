import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Box, CircularProgress, Alert } from "@mui/material";
import SiteHeader from "../components/SiteHeader";
import { api } from "../lib/api";
import type { RoomSummary, RoomApiResponse } from "../types/room"; // ✅ 변경: RoomApiResponse 타입도 같이 import
import { mapRoomFromApi } from "../types/room";

declare global {
  interface Window {
    kakao: any;
  }
}

type KakaoLatLng = {
  getLat: () => number;
  getLng: () => number;
};

type KakaoMapInstance = {
  getCenter: () => KakaoLatLng;
  relayout: () => void;
};

type KakaoMarker = unknown;

type KakaoMarkerClusterer = {
  clear: () => void;
  addMarkers: (markers: KakaoMarker[]) => void;
};

const RoomMap: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<KakaoMapInstance | null>(null);
  const clustererRef = useRef<KakaoMarkerClusterer | null>(null);
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!window.kakao || !window.kakao.maps) {
      setError("카카오맵 SDK를 불러오지 못했습니다.");
      setIsLoading(false);
      return;
    }

    // ✅ 변경 1: fetchRoomsNearby를 가장 위에 function 선언으로 이동 (호이스팅 가능)
    async function fetchRoomsNearby(lat: number, lng: number) {
      setIsLoading(true);
      setError(null);
      try {
        // ✅ 변경 2: 백엔드 DTO 타입과 맞게 제네릭 지정
        const { data } = await api.get<RoomApiResponse[]>("/map/rooms/near", {
          params: { lat, lng, radiusKm: 2 },
        });

        const roomList: RoomSummary[] = Array.isArray(data)
          ? data.map(mapRoomFromApi)
          : [];

        // 마커 생성
        const markers = roomList
          .map((room) => {
            if (room.latitude != null && room.longitude != null) { // ✅ 살짝 안전하게 변경 (0도 허용)
              const markerPosition = new window.kakao.maps.LatLng(
                room.latitude,
                room.longitude
              );
              return new window.kakao.maps.Marker({
                position: markerPosition,
                title: room.title,
              });
            }
            return null;
          })
          .filter((marker): marker is KakaoMarker => marker !== null);

        if (clustererRef.current) {
          clustererRef.current.clear();
          clustererRef.current.addMarkers(markers);
        }
      } catch (err) {
        console.error(err);
        setError("주변 방 정보를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setIsLoading(false);
      }
    }

    // ✅ 변경 3: 이제 이 함수 안에서 fetchRoomsNearby를 안전하게 호출 가능
    const fetchRoomsForCurrentLocation = (map: KakaoMapInstance | null) => {
      if (!map) return;
      const center = map.getCenter();
      const lat = center.getLat();
      const lng = center.getLng();
      fetchRoomsNearby(lat, lng);
    };

    // 이미 지도 인스턴스가 있으면 재사용 + 데이터만 다시 로드
    if (mapInstanceRef.current) {
      fetchRoomsForCurrentLocation(mapInstanceRef.current);
      return;
    }

    window.kakao.maps.load(() => {
      const mapContainer = mapRef.current;
      if (!mapContainer) return;

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            const userPosition = new window.kakao.maps.LatLng(
              latitude,
              longitude
            );

            const map = new window.kakao.maps.Map(mapContainer, {
              center: userPosition,
              level: 5,
            });
            mapInstanceRef.current = map as unknown as KakaoMapInstance;

            clustererRef.current = new window.kakao.maps.MarkerClusterer({
              map,
              averageCenter: true,
              minLevel: 6,
            }) as unknown as KakaoMarkerClusterer;

            new window.kakao.maps.Marker({
              map,
              position: userPosition,
              title: "현재 위치",
            });

            fetchRoomsNearby(latitude, longitude); // ✅ 여기서도 안전
          },
          () => {
            setError(
              "위치 정보를 가져올 수 없습니다. 기본 위치로 지도를 표시합니다."
            );
            const defaultPosition = new window.kakao.maps.LatLng(
              37.5665,
              126.978
            );
            const map = new window.kakao.maps.Map(mapContainer, {
              center: defaultPosition,
              level: 5,
            });
            mapInstanceRef.current = map as unknown as KakaoMapInstance;

            clustererRef.current = new window.kakao.maps.MarkerClusterer({
              map,
              averageCenter: true,
              minLevel: 6,
            }) as unknown as KakaoMarkerClusterer;

            fetchRoomsNearby(37.5665, 126.978);
          }
        );
      } else {
        setError("이 브라우저에서는 위치 정보를 지원하지 않습니다.");
        setIsLoading(false);
      }
    });
  }, [location]); // location 변경 시 다시 실행

  // 지도 컨테이너 resize 대응
  useEffect(() => {
    const mapContainer = mapRef.current;
    if (!mapContainer) return;

    const observer = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.relayout();
      }
    });

    observer.observe(mapContainer);
    return () => observer.disconnect();
  }, []);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <SiteHeader activePath="/rooms" />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          position: "relative",
          width: "100%",
          height: "calc(100vh - 65px)",
        }}
      >
        <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
        {(isLoading || error) && (
          <Box position="absolute" top={0} left={0} right={0} p={2} zIndex={10}>
            {isLoading && <CircularProgress />}
            {error && <Alert severity="warning">{error}</Alert>}
          </Box>
        )}
      </Box>
      {/* 필요하면 나중에 지도 아래에 리스트 붙일 수 있음 */}
      {/* <SiteFooter /> */}
    </Box>
  );
};

export default RoomMap;
