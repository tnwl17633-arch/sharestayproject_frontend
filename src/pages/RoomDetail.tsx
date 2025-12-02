import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { api } from "../lib/api";
import type {
  RoomDetailApiResponse,
  RoomImage,
  RoomSummary,
} from "../types/room";
import { mapRoomFromApi, resolveRoomImageUrl } from "../types/room";
import fallbackImageSrc from "../img/no_img.jpg";
import ShareIcon from "@mui/icons-material/Share";

const fallbackImage = fallbackImageSrc;

const formatCurrency = (amount?: number) => {
  if (typeof amount !== "number" || Number.isNaN(amount)) return "-";
  return `${amount.toLocaleString()}원/월`;
};

export default function RoomDetail() {
  const { roomId } = useParams<{ roomId: string }>();

  const [room, setRoom] = useState<RoomSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState<string>(fallbackImage);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [isShareGenerating, setIsShareGenerating] = useState(false);

  const shareButtonLabel = useMemo(
    () => (shareLink ? "공유" : "공유 복사"),
    [shareLink]
  );

  useEffect(() => {
    if (!roomId) {
      setError("잘못된 접근입니다.");
      setIsLoading(false);
      return;
    }

    const fetchRoom = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data } = await api.get<RoomDetailApiResponse>(
          `/rooms/${roomId}`
        );

        const images: RoomImage[] =
          data.images?.map((img, index) => ({
            id: img.id ?? index,
            imageId: img.id ?? index,
            roomId: data.id,
            imageUrl: resolveRoomImageUrl(img.imageUrl) ?? fallbackImage,
          })) ??
          data.imageUrls?.map((url, index) => ({
            id: index,
            imageId: index,
            roomId: data.id,
            imageUrl: resolveRoomImageUrl(url) ?? fallbackImage,
          })) ??
          [];

        const mapped: RoomSummary = {
          ...mapRoomFromApi(data),  // <- 여기서 shareLinkUrl 포함
          images,
        };
        setRoom(mapped);
        setActiveImage(images[0]?.imageUrl ?? fallbackImage);


        // 🔴 공유 링크 state에도 저장
      // 1순위: DTO에 있는 shareLinkUrl
      // 2순위: 혹시 shareLink 객체 안에 linkUrl 로 왔을 경우 대비
      // 🔥 이 줄만 이렇게 고쳐 두기
      setShareLink(data.shareLinkUrl ?? null);
    } catch (err) {
    const message =
        err instanceof Error
          ? err.message
          : "방 정보를 불러오는 중 오류가 발생했습니다.";
      setError(message);
      setRoom(null);
    } finally {
      setIsLoading(false);
    }
  };

    fetchRoom();
  }, [roomId]);

  // ✅ 수정본
const handleShareLink = async () => {
  // roomId 없어도 사실 복사엔 상관 없지만, 안전하게 체크
  if (!roomId) return;

  // 디버깅용 (브라우저 콘솔에서 확인)
  console.log(">>> shareLink state:", shareLink);
  console.log(">>> room.shareLinkUrl:", room?.shareLinkUrl);

  // 1순위: state 에 저장된 shareLink
  // 2순위: roomSummary 안에 있는 shareLinkUrl
  const link = shareLink ?? room?.shareLinkUrl ?? null;

  if (!link) {
    alert("공유 링크를 불러올 수 없습니다. 관리자에게 문의해 주세요.");
    return;
  }

  setIsShareGenerating(true);
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(link);
      alert("공유 링크가 클립보드에 복사되었습니다.");
    } else {
      window.prompt("이 링크를 복사해 주세요.", link);
    }
  } catch {
    window.prompt("이 링크를 복사해 주세요.", link);
  } finally {
    setIsShareGenerating(false);
  }
};


  return (
    <Box sx={{ bgcolor: "#f4f6fb", minHeight: "100vh" }}>
      <SiteHeader activePath="/rooms" />
      <Container maxWidth="md" sx={{ py: { xs: 6, md: 8 } }}>
        {isLoading ? (
          <Stack alignItems="center" spacing={2} py={12}>
            <CircularProgress />
            <Typography color="text.secondary">
              방 정보를 불러오는 중입니다...
            </Typography>
          </Stack>
        ) : error ? (
          <Paper sx={{ p: { xs: 4, md: 6 }, borderRadius: 4 }}>
            <Stack spacing={2} alignItems="center">
              <Typography variant="h6" color="error" fontWeight={700}>
                데이터를 가져오지 못했어요
              </Typography>
              <Typography color="text.secondary" textAlign="center">
                {error}
              </Typography>
              <Button
                variant="contained"
                component={RouterLink}
                to="/rooms"
                sx={{ borderRadius: 999 }}
              >
                방 목록으로 돌아가기
              </Button>
            </Stack>
          </Paper>
        ) : room ? (
          <Paper
            sx={{
              p: { xs: 4, md: 5 },
              borderRadius: 4,
              boxShadow: "0 32px 64px rgba(15, 40, 105, 0.12)",
            }}
          >
            <Stack spacing={3}>
              <Box
                component="img"
                src={activeImage}
                alt={room.title}
                sx={{
                  width: "100%",
                  height: 320,
                  objectFit: "cover",
                  borderRadius: 3,
                  bgcolor: "#e8ecf4",
                }}
              />

              {room.images && room.images.length > 1 && (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {room.images.map((img) => {
                    const thumbnail = img.imageUrl ?? fallbackImage;
                    const key = img.id ?? img.imageId ?? thumbnail;
                    const isActive = activeImage === thumbnail;
                    return (
                      <Box
                        key={key}
                        component="img"
                        src={thumbnail}
                        alt={room.title}
                        onClick={() => setActiveImage(thumbnail)}
                        sx={{
                          width: 72,
                          height: 72,
                          objectFit: "cover",
                          borderRadius: 2,
                          border: isActive
                            ? "2px solid #0c51ff"
                            : "1px solid rgba(0,0,0,0.08)",
                          cursor: "pointer",
                        }}
                      />
                    );
                  })}
                </Stack>
              )}

              <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="h4" fontWeight={800}>
                  {room.title}
                </Typography>
                <Chip
                  label={
                    room.type === "ONE_ROOM"
                      ? "원룸"
                      : room.type === "TWO_ROOM"
                      ? "투룸"
                      : room.type
                  }
                  color="primary"
                  sx={{ borderRadius: 999 }}
                />
              </Stack>

              <Typography variant="h5" color="primary" fontWeight={700}>
                {formatCurrency(room.rentPrice)}
              </Typography>

              <Stack spacing={1}>
                <Typography variant="subtitle2" color="text.secondary">
                  주소
                </Typography>
                <Typography>{room.address}</Typography>
              </Stack>

              {room.description && (
                <Stack spacing={1}>
                  <Typography variant="subtitle2" color="text.secondary">
                    상세 설명
                  </Typography>
                  <Typography whiteSpace="pre-line">
                    {room.description}
                  </Typography>
                </Stack>
              )}

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                alignItems={{ xs: "stretch", sm: "center" }}
              >
                <Button
                  variant="contained"
                  component={RouterLink}
                  to="/rooms"
                  sx={{ borderRadius: 999 }}
                >
                  방 목록으로 돌아가기
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleShareLink}
                  disabled={isShareGenerating}
                  sx={{ borderRadius: 999 }}
                  startIcon={<ShareIcon />}
                >
                  {shareButtonLabel}
                </Button>
              </Stack>

              {/* {shareLink && (
                <Typography variant="body2" color="text.secondary">
                  {shareLink}
                </Typography>
              )} */}
            </Stack>
          </Paper>
        ) : null}
      </Container>
      <SiteFooter />
    </Box>
  );
}
