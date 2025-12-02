// src/pages/Rooms.tsx  방검색
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardActionArea,
  Chip,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Slider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  Favorite,
  FavoriteBorder,
  GridView,
  ListAlt,
  LocationOn,
  Search,
} from "@mui/icons-material";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { api } from "../lib/api";
import { fetchFavoriteRooms, toggleFavoriteRoom } from "../lib/favorites";
import type { RoomApiResponse, RoomSummary } from "../types/room";
import { mapRoomFromApi } from "../types/room";
import fallbackImageSrc from "../img/no_img.jpg";
// ✅ 1) Grid는 따로 디폴트 import
import Grid from "@mui/material/Unstable_Grid2";

const filterFacilities = [
  "에어컨",
  "냉장고",
  "세탁기",
  "인터넷",
  "와이파이",
  "엘리베이터",
  "TV",
  "침대",
  "책상",
  "보안시설",
  "주차장",
  "헬스장",
  "베란다",
  "반려동물 가능",
];

const districts = [
  { value: "", label: "전체 지역" },
  { value: "강남구", label: "강남구" },
  { value: "마포구", label: "마포구" },
  { value: "광진구", label: "광진구" },
  { value: "송파구", label: "송파구" },
  { value: "용산구", label: "용산구" },
];

const roomTypes = [
  { value: "", label: "전체 유형" },
  { value: "원룸", label: "원룸" },
  { value: "투룸", label: "투룸" },
  { value: "오피스텔", label: "오피스텔" },
  { value: "아파트", label: "아파트" },
];

const fallbackImage = fallbackImageSrc;


const formatCurrency = (amount?: number) => {
  if (typeof amount !== "number" || Number.isNaN(amount)) return "-";
  return `${amount.toLocaleString()}원/월`;
};

const extractTags = (room: RoomSummary): string[] => {
  if (Array.isArray(room.tags) && room.tags.length > 0) return room.tags;
  if (Array.isArray(room.options)) return room.options;
  if (typeof room.options === "string") {
    return room.options
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const ensureArray = <T,>(value: T | T[]): T[] =>
  Array.isArray(value) ? value : [value];

const availabilityLabel = (status: RoomSummary["availabilityStatus"]) => {
  if (typeof status === "number") {
    if (status === 0) return "모집중";
    if (status === 1) return "예약중";
    if (status === 2) return "마감"; 
    return "오류";
  }
  if (typeof status === "string") {
    switch (status.toUpperCase()) {
      case "AVAILABLE":
        return "모집중";
      case "PENDING":
        return "예약중";
      default:
        return "마감";
    }
  }
  return "모집중";
};


const getRoomId = (room: RoomSummary) => room.roomId ?? room.id ?? null;

type RoomSearchOverrides = {
  keyword?: string;
  district?: string;
  roomType?: string;
  priceRange?: number[];
  useSearchEndpoint?: boolean;   // ⭐ 추가: /rooms vs /rooms/search 구분용
  facility?: string;        // ⭐ 추가
};

export default function Rooms() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightParam = searchParams.get("highlight");
  const highlightedRoomId = (() => {
    if (!highlightParam) return null;
    const parsed = Number(highlightParam);
    return Number.isNaN(parsed) ? null : parsed;
  })();
  const highlightedCardRef = useRef<HTMLDivElement | null>(null);
  const defaultPriceRange: [number, number] = [0, 5000000];
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [keyword, setKeyword] = useState("");
  const [district, setDistrict] = useState("");
  const [roomType, setRoomType] = useState("");
  const [priceRange, setPriceRange] = useState<number[]>(defaultPriceRange);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  // ⭐ 추가: 현재 선택된 편의시설 (없으면 빈 문자열)
  const [selectedFacility, setSelectedFacility] = useState<string>("");

  const priceLabel = useMemo(
    () =>
      `${priceRange[0].toLocaleString()}원 ~ ${priceRange[1].toLocaleString()}원`,
    [priceRange]
  );

  const fetchRooms = useCallback(async (overrides?: RoomSearchOverrides) => {
  setIsLoading(true);
  setError(null);
  try {
    const keywordValue = overrides?.keyword ?? keyword;
    const districtValue = overrides?.district ?? district;
    const roomTypeValue = overrides?.roomType ?? roomType;
    const priceRangeValue = overrides?.priceRange ?? priceRange;
    const [minPrice, maxPrice] = priceRangeValue;
    const regionParam = districtValue || "";
    // ⭐ 추가: override로 들어온 facility가 있으면 그걸 우선 사용
    const facilityValue = overrides?.facility ?? selectedFacility;

    const hasCustomPriceRange =
      priceRangeValue[0] !== defaultPriceRange[0] ||
      priceRangeValue[1] !== defaultPriceRange[1];

    const optionParam =
      (facilityValue && facilityValue.trim().length > 0
        ? facilityValue
        : undefined) ||
      (keywordValue && keywordValue.trim().length > 0
        ? keywordValue
        : undefined);

    const hasAnyFilter =
      (regionParam && regionParam.trim().length > 0) ||
      (roomTypeValue && roomTypeValue.trim().length > 0) ||
      (keywordValue && keywordValue.trim().length > 0) ||
      (facilityValue && facilityValue.trim().length > 0) ||  // ⭐ 추가
      hasCustomPriceRange;
      

    let data: RoomApiResponse[] = [];

    if (!hasAnyFilter) {
      const res = await api.get<RoomApiResponse[]>("/rooms");
      data = res.data;
    } else {
      const res = await api.get<RoomApiResponse[]>("/rooms/search", {
        params: {
          region: regionParam || undefined,
          type: roomTypeValue || undefined,
          minPrice:
            hasCustomPriceRange && Number.isFinite(minPrice)
              ? minPrice
              : undefined,
          maxPrice:
            hasCustomPriceRange && Number.isFinite(maxPrice)
              ? maxPrice
              : undefined,
          option: optionParam,
        },
      });
      data = res.data;
    }

    const list = Array.isArray(data) ? data.map(mapRoomFromApi) : [];
    const normalized = list.map((room) => {
      const roomId = getRoomId(room);
      return {
        ...room,
        isFavorite: roomId ? favorites.has(roomId) : false,
      };
    });

    setRooms(normalized);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "방 정보를 불러오는 중 오류가 발생했습니다.";
    setError(message);
    setRooms([]);
  } finally {
    setIsLoading(false);
  }
}, [keyword, district, roomType, priceRange,selectedFacility, favorites]);

  useEffect(() => {
    const initialKeyword = searchParams.get("keyword") ?? "";
    const initialDistrict = searchParams.get("district") ?? "";
    const initialType = searchParams.get("type") ?? "";
    const minParam = searchParams.get("minPrice");
    const maxParam = searchParams.get("maxPrice");
    const parsedMin = minParam ? Number(minParam) : NaN;
    const parsedMax = maxParam ? Number(maxParam) : NaN;
    const hasCustomRange =
      !Number.isNaN(parsedMin) && !Number.isNaN(parsedMax);
    const nextRange = hasCustomRange ? [parsedMin, parsedMax] : undefined;

    if (initialKeyword) setKeyword(initialKeyword);
    if (initialDistrict) setDistrict(initialDistrict);
    if (initialType) setRoomType(initialType);
    if (nextRange) setPriceRange(nextRange);

    fetchRooms({
      keyword: initialKeyword || undefined,
      district: initialDistrict || undefined,
      roomType: initialType || undefined,
      priceRange: nextRange,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!highlightedRoomId) return;
    const timer = window.setTimeout(() => {
      highlightedCardRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [rooms, highlightedRoomId]);

  const handleSearch = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const params = new URLSearchParams();
    if (keyword.trim()) params.set("keyword", keyword.trim());
    if (district) params.set("district", district);
    if (roomType) params.set("type", roomType);
    if (
      priceRange[0] !== defaultPriceRange[0] ||
      priceRange[1] !== defaultPriceRange[1]
    ) {
      params.set("minPrice", String(priceRange[0]));
      params.set("maxPrice", String(priceRange[1]));
    }
    if (params.toString()) setSearchParams(params, { replace: true });
    else setSearchParams({}, { replace: true });
    await fetchRooms();
  };

    // 왼쪽 필터바 "방 종류" 버튼 클릭 핸들러
  const handleFilterTypeClick = async (clickedType: string) => {
    // "전체" 버튼이면 필터 해제 -> 빈 문자열
    const nextType = clickedType === "전체" ? "" : clickedType;

    // 상태 업데이트
    setRoomType(nextType);

    // URL 쿼리스트링도 같이 맞춰주기 (위 검색창이랑 동일 로직)
    const params = new URLSearchParams();
    if (keyword.trim()) params.set("keyword", keyword.trim());
    if (district) params.set("district", district);
    if (nextType) params.set("type", nextType);
    if (
      priceRange[0] !== defaultPriceRange[0] ||
      priceRange[1] !== defaultPriceRange[1]
    ) {
      params.set("minPrice", String(priceRange[0]));
      params.set("maxPrice", String(priceRange[1]));
    }

    if (params.toString()) setSearchParams(params, { replace: true });
    else setSearchParams({}, { replace: true });

    // 실제 방 목록 다시 가져오기
    await fetchRooms({
      roomType: nextType,
    });
  };

  const loadFavorites = useCallback(async () => {
    if (!user?.id) {
      setFavorites(new Set());
      setRooms((prev) =>
        prev.map((room) => ({ ...room, isFavorite: false }))
      );
      return;
    }
    try {
      const favoriteRooms = await fetchFavoriteRooms(user.id);
      const next = new Set<number>();
      favoriteRooms.forEach((item) => {
        if (typeof item.roomId === "number") {
          next.add(item.roomId);
        }
      });
      setFavorites(next);
      setRooms((prev) =>
        prev.map((room) => {
          const roomId = getRoomId(room);
          return roomId ? { ...room, isFavorite: next.has(roomId) } : room;
        })
      );
    } catch (error) {
      console.error("Failed to load favorites", error);
    }
  }, [user?.id]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const toggleFavorite = async (room: RoomSummary) => {
    const roomId = getRoomId(room);
    // if (!roomId) return;
    if (!user?.id) {
      alert("로그인이 필요한 기능입니다.");
      return;
    }
    // const currentlyFavorite = favorites.has(roomId);
    // 여기 두 줄이 추가된 부분임. 나중에 재수정할 수도 있음.
    if (!roomId) return;
    const currentlyFavorite = favorites.has(roomId); // user.id 체크 후 roomId 체크
    setFavorites((prev) => {
      const next = new Set(prev);
      if (currentlyFavorite) {
        next.delete(roomId);
      } else {
        next.add(roomId);
      }
      return next;
    });
    setRooms((prev) =>
      prev.map((item) =>
        getRoomId(item) === roomId ? { ...item, isFavorite: !currentlyFavorite } : item
      )
    );
    try {
      await toggleFavoriteRoom(user.id, roomId);
      await loadFavorites();
    } catch (error: any) {
      const status = error?.response?.status;
      const message =
        error?.response?.data?.message ||
        (status ? `요청 실패 (status: ${status})` : "찜하기 요청에 실패했습니다.");
      console.error("Failed to toggle favorite", error);
      setFavorites((prev) => {
        const next = new Set(prev);
        if (currentlyFavorite) {
          next.add(roomId);
        } else {
          next.delete(roomId);
        }
        return next;
      });
      setRooms((prev) =>
        prev.map((item) =>
          getRoomId(item) === roomId ? { ...item, isFavorite: currentlyFavorite } : item
        )
      );
      alert(message);
    }
  };

  const handleShareLink = async (room: RoomSummary) => {
    const link = room.shareLinkUrl;

    if (!link) {
      alert("공유 링크가 준비되지 않았습니다. 관리자에게 문의해 주세요.");
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
        alert(`공유 링크가 클립보드에 복사되었습니다.`);  // \n${link}
      } else {
        // 구형 브라우저 대비
        window.prompt("이 링크를 복사해 주세요.", link);
      }
    } catch {
      window.prompt("이 링크를 복사해 주세요.", link);
    }
  };

  return (
    <Box sx={{ bgcolor: "#f4f6fb", minHeight: "100vh" }}>
      <SiteHeader activePath="/rooms" />
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
        <Stack spacing={3}>
          <Paper
            sx={{
              p: { xs: 3, md: 4 },
              borderRadius: 4,
              boxShadow: "0 24px 40px rgba(15, 40, 105, 0.12)",
            }}
          >
            <Box component="form" onSubmit={handleSearch}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2}
                alignItems={{ xs: "stretch", md: "center" }}
              >
                <TextField
                  fullWidth
                  label="지역명 또는 역명을 입력하세요"
                  placeholder="예: 강남역, 홍대입구"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                />
                <Select
                  value={district}
                  onChange={(event) =>
                    setDistrict(event.target.value as string)
                  }
                  sx={{ minWidth: 160, borderRadius: 3 }}
                >
                  {districts.map((item) => (
                    <MenuItem key={item.value} value={item.value}>
                      {item.label}
                    </MenuItem>
                  ))}
                </Select>
                <Select
                  value={roomType}
                  onChange={(event) =>
                    setRoomType(event.target.value as string)
                  }
                  sx={{ minWidth: 160, borderRadius: 3 }}
                >
                  {roomTypes.map((item) => (
                    <MenuItem key={item.value} value={item.value}>
                      {item.label}
                    </MenuItem>
                  ))}
                </Select>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<Search />}
                  sx={{ borderRadius: 3, px: 4, py: 1.5 }}
                  disabled={isLoading}
                >
                  {isLoading ? "검색 중..." : "검색"}
                </Button>
              </Stack>
            </Box>
          </Paper>

          <Grid container spacing={4}>
            <Grid xs={12} md={3}>
              <Paper
              sx={{
                p: 3,
                borderRadius: 4,
                boxShadow: "0 18px 32px rgba(15, 40, 105, 0.08)",
              }}
              >
              <Stack spacing={3}>
                <Typography variant="h6" fontWeight={700}>
                필터
                </Typography>
                <Divider />

                <Stack spacing={1}>
                  <Typography variant="subtitle2" color="text.secondary">
                    방 종류
                  </Typography>
                  {["전체", "원룸", "투룸", "오피스텔", "아파트"].map((typeLabel) => {
                    // "전체"는 roomType === "" 일 때 선택된 상태
                    const isSelected =
                      (typeLabel === "전체" && !roomType) || roomType === typeLabel;

                    return (
                      <Button
                        key={typeLabel}
                        variant={isSelected ? "contained" : "text"}
                        sx={{ justifyContent: "flex-start", borderRadius: 2 }}
                        onClick={() => handleFilterTypeClick(typeLabel)}
                      >
                        {typeLabel}
                      </Button>
                    );
                  })}
                </Stack>


                <Stack spacing={1}>
                <Typography variant="subtitle2" color="text.secondary">
                  가격 범위
                </Typography>
                <Slider
                  value={priceRange}
                  min={200000}
                  max={2000000}
                  step={50000}
                  valueLabelDisplay="auto"
                  onChange={(_, value) =>
                  setPriceRange(ensureArray(value as number[]))
                  }
                  onChangeCommitted={() => fetchRooms()}
                />
                <Typography variant="caption" color="text.secondary">
                  {priceLabel}
                </Typography>
                </Stack>

                <RouterLink to="/RoomMap">지도로 찾기</RouterLink>

                <Stack spacing={1}>
                <Typography variant="subtitle2" color="text.secondary">
                  편의시설
                </Typography>
                <Stack
                  spacing={1}
                  flexWrap="wrap"
                  direction="row"
                  useFlexGap
                >
                  {filterFacilities.map((facility) => (
                  <Chip
                    key={facility}
                    label={facility}
                    variant="outlined"
                    sx={{ borderRadius: 2 }}
                  />
                  ))}
                </Stack>
                </Stack>
              </Stack>
              </Paper>
            </Grid>
            <Grid xs={12} md={9}>
              <Stack spacing={3}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  spacing={2}
                >
                  <Stack spacing={0.5}>
                    <Typography variant="h6" fontWeight={700}>
                      검색 결과
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {rooms.length}개의 매물을 찾았습니다
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <Select
                      defaultValue="추천순"
                      size="small"
                      sx={{ borderRadius: 999 }}
                    >
                      <MenuItem value="추천순">추천순</MenuItem>
                      <MenuItem value="가격낮은순">가격 낮은 순</MenuItem>
                      <MenuItem value="가격높은순">가격 높은 순</MenuItem>
                    </Select>
                    <IconButton>
                      <GridView />
                    </IconButton>
                    <IconButton>
                      <ListAlt />
                    </IconButton>
                  </Stack>
                </Stack>

                {error && (
                  <Paper sx={{ p: 3, borderRadius: 3, bgcolor: "#fff5f5" }}>
                    <Typography color="error">{error}</Typography>
                  </Paper>
                )}

                {isLoading ? (
                  <Box
                    sx={{
                      display: "grid",
                      placeItems: "center",
                      minHeight: 240,
                    }}
                  >
                    <CircularProgress />
                  </Box>
                ) : rooms.length === 0 ? (
                  <Paper sx={{ p: 4, borderRadius: 3 }}>
                    <Typography color="text.secondary" textAlign="center">
                      표시할 매물이 없습니다. 검색 조건을 변경해보세요.
                    </Typography>
                  </Paper>
                ) : (
                  <Grid container spacing={3}>
                    {rooms.map((room) => {
                      const roomId = getRoomId(room);
                      const isFavorite = roomId ? favorites.has(roomId) : false;
                      const isHighlighted =
                        roomId !== null && highlightedRoomId === roomId;
                      const tags = extractTags(room);
                      const imageUrl =
                        room.images?.[0]?.imageUrl ?? fallbackImage;
                      return (
                        <Grid
                          xs={12}
                          sm={6}
                          key={roomId ?? `${room.title}-${room.address}`}
                          ref={
                            isHighlighted ? highlightedCardRef : undefined
                          }
                        >
                          <Card
                            sx={{
                              borderRadius: 4,
                              overflow: "hidden",
                              boxShadow: isHighlighted
                                ? "0 0 0 2px #0c51ff, 0 24px 48px rgba(12, 81, 255, 0.2)"
                                : "0 20px 40px rgba(15, 40, 105, 0.12)",
                              height: "100%",
                              display: "flex",
                              flexDirection: "column",
                              transition: "box-shadow 0.2s ease, transform 0.2s ease",
                              "&:hover": {
                                boxShadow:
                                  "0 0 0 2px #0c51ff, 0 30px 60px rgba(12, 81, 255, 0.25)",
                                transform: "translateY(-4px)",       // ⭐ 살짝 떠오르는 효과
                              },
                            }}
                          >
                            {/* 🔹 카드 전체를 클릭하면 상세로 가게 하는 부분 */}
                            <CardActionArea
                              component={RouterLink}
                              to={roomId ? `/rooms/${roomId}` : "/rooms"}
                              sx={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "stretch",
                                height: "100%",
                              }}
                            >   
                            {/* ⭐️ 추가된 부분 */}
                              <Box
                                component="img"
                                src={imageUrl}
                                alt={room.title}
                                sx={{
                                  height: 200,
                                  width: "100%",
                                  objectFit: "cover",
                                }}
                              />

                              {/* 🔹 원래 CardActionArea 밖에 있던 내용 전부 여기로 옮김 */}
                            <CardContent sx={{ display: "grid", gap: 1.5, flexGrow: 1 }}>
                              <Stack direction="row" spacing={1}>
                              {typeof room.safetyScore === "number" && (
                                <Chip
                                  label={`안전도 ${Math.round(room.safetyScore)}`}
                                  color="primary"
                                  size="small"
                                  sx={{ borderRadius: 999 }}
                                />
                              )}
                              {typeof room.trustScore === "number" && (
                                <Chip
                                  label={`신뢰도 ${Math.round(room.trustScore)}`}
                                  color="success"
                                  size="small"
                                  sx={{ borderRadius: 999 }}
                                />
                              )}
                              <Chip
                                label={availabilityLabel(room.availabilityStatus)}
                                size="small"
                                sx={{ borderRadius: 999 }}
                              />
                            </Stack>

                            <Typography variant="h6" fontWeight={700}>
                              {room.title}
                            </Typography>

                            <Stack direction="row" spacing={1} alignItems="center">
                            <LocationOn fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                              {room.address}
                            </Typography>
                          </Stack>

                          <Typography variant="body1" fontWeight={700} color="primary">
                            {formatCurrency(room.rentPrice)}
                          </Typography>

                          {room.description && (
                            <Typography variant="body2" color="text.secondary">
                              {room.description}
                            </Typography>
                          )}

                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {tags.slice(0, 4).map((tag) => (
                              <Chip
                                key={tag}
                                label={tag}
                                size="small"
                                sx={{ borderRadius: 999 }}
                              />
                            ))}
                          </Stack>
                            </CardContent>
                            </CardActionArea>
                            {/* 🔹 액션 영역은 그대로 Card 밖에 둠 (즐겨찾기 클릭 시 이동 막기 유지) */}
                            <CardActions
                              sx={{
                                px: 3,
                                pb: 3,
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <Button
                                variant="text"
                                component={RouterLink}
                                to={roomId ? `/rooms/${roomId}` : "/rooms"}
                              >
                                자세히 보기
                              </Button>
                              <Button
                                variant="outlined"
                                size="small"
                                sx={{ borderRadius: 999 }}
                                onClick={() => handleShareLink(room)}
                              >
                                공유 링크
                              </Button>
                              <IconButton
                                onClick={(event) => {
                                  event.stopPropagation(); // 카드 클릭으로 인한 네비게이션 막기
                                  toggleFavorite(room);
                                }}
                                color={isFavorite ? "error" : "default"}
                                aria-label="즐겨찾기"
                              >
                                {isFavorite ? <Favorite /> : <FavoriteBorder />}
                              </IconButton>
                            </CardActions>
                          </Card>
                        </Grid>
                      );
                    })}
                  </Grid>
                )}

                <Stack direction="row" justifyContent="center" spacing={1}>
                  {[1, 2, 3].map((page) => (
                    <Button
                      key={page}
                      variant={page === 1 ? "contained" : "outlined"}
                      sx={{ borderRadius: 999, minWidth: 44 }}
                    >
                      {page}
                    </Button>
                  ))}
                </Stack>
              </Stack>
            </Grid>
          </Grid>
        </Stack>
      </Container>
      <SiteFooter />
    </Box>
  );
}