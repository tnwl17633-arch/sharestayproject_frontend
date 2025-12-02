﻿// src/pages/EditRoom.tsx
import {
  Alert,
  Box,
  Button,
  Container,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Typography,
  CircularProgress,
} from "@mui/material";
import Grid from "@mui/material/Unstable_Grid2";
import { HomeWork, LocationOn } from "@mui/icons-material";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useParams } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import FormTextField from "../components/FormTextField";
import { api } from "../lib/api";
import { useAuth } from "../auth/useAuth";
import type {
  RoomDetailApiResponse,
  RoomAvailabilityStatus,
  RoomRequestPayload,
} from "../types/room";

const roomSchema = z.object({
  title: z.string().min(1, "Please enter a title."),
  rentPrice: z
    .string()
    .min(1, "Please enter a monthly rent amount.")
    .refine((value) => !Number.isNaN(Number(value)), "Rent must be a number."),
  type: z.string().min(1, "Please select a room type."),
  availabilityStatus: z
    .string()
    .min(1, "Please select an availability status."),
  address: z.string().min(1, "Please enter an address."),
  latitude: z
    .string()
    .optional()
    .refine(
      (value) => !value || !Number.isNaN(Number(value)),
      "Latitude must be a number."
    ),
  longitude: z
    .string()
    .optional()
    .refine(
      (value) => !value || !Number.isNaN(Number(value)),
      "Longitude must be a number."
    ),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters.")
    .max(1000, "Description must be 1000 characters or less."),
});

type FormValues = z.infer<typeof roomSchema>;

const roomTypes = [
  { value: "ONE_ROOM", label: "One-room" },
  { value: "TWO_ROOM", label: "Two-room" },
  { value: "OFFICETEL", label: "Officetel" },
  { value: "APARTMENT", label: "Apartment" },
  { value: "ETC", label: "Other" },
];

const availabilityOptions = [
  { value: "AVAILABLE", label: "Available" },
  { value: "PENDING", label: "Pending" },
  { value: "UNAVAILABLE", label: "Unavailable" },
];

const availabilityStatusMap: Record<RoomAvailabilityStatus, number> = {
  AVAILABLE: 1,
  PENDING: 0,
  UNAVAILABLE: -1,
};

const reverseAvailabilityStatusMap: Record<number, RoomAvailabilityStatus> = {
  1: "AVAILABLE",
  0: "PENDING",
  [-1]: "UNAVAILABLE",
};

export default function EditRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const roleList = user?.roles ?? (user?.role ? [user.role] : []);
  const isAdmin = roleList.includes("ADMIN");

  const [roomHostId, setRoomHostId] = useState<number | null>(null);
  const [ownerUserId, setOwnerUserId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastValuesRef = useRef<FormValues | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      title: "",
      rentPrice: "",
      type: "ONE_ROOM",
      availabilityStatus: "AVAILABLE",
      address: "",
      latitude: "",
      longitude: "",
      description: "",
    },
  });

  const canManageRoom = useMemo(() => {
    if (!user) return false;
    if (isAdmin) return true;
    return ownerUserId != null && ownerUserId === user.id;
  }, [isAdmin, ownerUserId, user]);

  useEffect(() => {
    if (!roomId) {
      setError("Room not found.");
      setIsLoading(false);
      return;
    }

    const fetchRoom = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data } = await api.get<RoomDetailApiResponse>(`/rooms/${roomId}`);
        setRoomHostId(data.hostId ?? null);
        setOwnerUserId(data.hostUserId ?? null);

        const statusKey =
          reverseAvailabilityStatusMap[data.availabilityStatus ?? 1] ?? "AVAILABLE";

        const nextValues: FormValues = {
          title: data.title ?? "",
          rentPrice:
            typeof data.rentPrice === "number" ? String(data.rentPrice) : "",
          type: data.type ?? "ONE_ROOM",
          availabilityStatus: statusKey,
          address: data.address ?? "",
          latitude:
            typeof data.latitude === "number" ? String(data.latitude) : "",
          longitude:
            typeof data.longitude === "number" ? String(data.longitude) : "",
          description: data.description ?? "",
        };

        lastValuesRef.current = nextValues;
        reset(nextValues);
        setImages([]);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to load room information.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoom();
  }, [roomId, reset]);

  const canSubmit = Boolean(roomHostId && canManageRoom);

  const handleReset = () => {
    if (lastValuesRef.current) {
      reset(lastValuesRef.current);
    }
    setImages([]);
  };

  const handleImagePick = () => {
    fileInputRef.current?.click();
  };

  const handleImagesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).slice(0, 6);
    setImages(files);
  };

  const handleDeleteRoom = async () => {
    if (!roomId) return;
    if (!canManageRoom) {
      alert("You do not have permission to delete this room.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this room? This action cannot be undone.")) {
      return;
    }
    try {
      await api.delete(`/rooms/${roomId}`);
      alert("Room deleted.");
      navigate("/rooms", { replace: true });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "방을 삭제하는 중 오류가 발생했습니다.";
      alert(message);
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!roomId || !roomHostId) return;
    if (!canManageRoom) {
      alert("You do not have permission to update this room.");
      return;
    }

    try {
      const rentPrice = Number(values.rentPrice);
      const latitudeValue =
        values.latitude && values.latitude.trim().length > 0
          ? Number(values.latitude)
          : undefined;
      const longitudeValue =
        values.longitude && values.longitude.trim().length > 0
          ? Number(values.longitude)
          : undefined;

      if (Number.isNaN(rentPrice)) {
        throw new Error("월세 값이 올바르지 않습니다.");
      }
      if (latitudeValue !== undefined && Number.isNaN(latitudeValue)) {
        throw new Error("위도 값이 올바르지 않습니다.");
      }
      if (longitudeValue !== undefined && Number.isNaN(longitudeValue)) {
        throw new Error("경도 값이 올바르지 않습니다.");
      }

      const availabilityCode =
        availabilityStatusMap[
          values.availabilityStatus as RoomAvailabilityStatus
        ] ?? 0;

      const payload: RoomRequestPayload = {
        hostId: roomHostId,
        title: values.title,
        rentPrice,
        address: values.address,
        type: values.type,
        latitude: latitudeValue ?? 0,
        longitude: longitudeValue ?? 0,
        availabilityStatus: availabilityCode,
        description: values.description,
      };

      await api.put(`/rooms/${roomId}`, payload);

      if (images.length > 0) {
        const formData = new FormData();
        images.forEach((file) => formData.append("files", file));
        await api.post(`/rooms/${roomId}/images`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      alert("Room details updated.");
      navigate(`/rooms/${roomId}`, { replace: true });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "방 정보를 수정하는 중 오류가 발생했습니다.";
      alert(message);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ bgcolor: "#f4f6fb", minHeight: "100vh" }}>
        <SiteHeader activePath="/rooms" />
        <Container sx={{ py: 8 }}>
          <Stack alignItems="center" spacing={2}>
            <CircularProgress />
            <Typography color="text.secondary">방 정보를 불러오는 중입니다...</Typography>
          </Stack>
        </Container>
        <SiteFooter />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ bgcolor: "#f4f6fb", minHeight: "100vh" }}>
        <SiteHeader activePath="/rooms" />
        <Container sx={{ py: 8 }} maxWidth="sm">
          <Paper sx={{ p: 4, borderRadius: 4 }}>
            <Stack spacing={2} alignItems="center">
              <Typography variant="h6" color="error" fontWeight={700}>
                방 정보를 가져오지 못했습니다
              </Typography>
              <Typography color="text.secondary" textAlign="center">
                {error}
              </Typography>
              <Button variant="contained" onClick={() => navigate("/rooms")}>
                방 목록으로 돌아가기
              </Button>
            </Stack>
          </Paper>
        </Container>
        <SiteFooter />
      </Box>
    );
  }

  if (!canManageRoom) {
    return (
      <Box sx={{ bgcolor: "#f4f6fb", minHeight: "100vh" }}>
        <SiteHeader activePath="/rooms" />
        <Container sx={{ py: 8 }} maxWidth="sm">
          <Alert severity="warning">
            방 수정 권한이 없습니다. 호스트 본인 또는 관리자만 수정할 수 있습니다.
          </Alert>
          <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate("/rooms")}>
            방 목록으로 돌아가기
          </Button>
        </Container>
        <SiteFooter />
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: "#f4f6fb", minHeight: "100vh" }}>
      <SiteHeader activePath="/rooms" />
      <Container maxWidth="md" sx={{ py: { xs: 6, md: 8 } }}>
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Typography variant="h4" fontWeight={800}>
              방 정보 수정
            </Typography>
            <Typography color="text.secondary">
              방 제목, 가격, 주소 및 상세 설명을 수정할 수 있습니다.
            </Typography>
          </Stack>

          <Paper
            sx={{
              p: { xs: 3, md: 4 },
              borderRadius: 4,
              boxShadow: "0 24px 48px rgba(15, 40, 105, 0.08)",
            }}
          >
            <Box component="form" onSubmit={handleSubmit(onSubmit)}>
              <Stack spacing={4}>
                <SectionTitle icon={<HomeWork color="primary" />} title="기본 정보" />
                <Grid container spacing={3}>
                  <Grid xs={12}>
                    <FormTextField
                      name="title"
                      control={control}
                      label="방 제목"
                      placeholder="예: 홍대입구역 도보 3분 원룸"
                    />
                  </Grid>
                  <Grid xs={12} sm={6}>
                    <FormTextField
                      name="rentPrice"
                      control={control}
                      label="월세"
                      placeholder="예: 550000"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">₩</InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid xs={12} sm={6}>
                    <FormTextField
                      name="type"
                      control={control}
                      label="방 유형"
                      select
                    >
                      {roomTypes.map((item) => (
                        <MenuItem key={item.value} value={item.value}>
                          {item.label}
                        </MenuItem>
                      ))}
                    </FormTextField>
                  </Grid>
                  <Grid xs={12} sm={6}>
                    <FormTextField
                      name="availabilityStatus"
                      control={control}
                      label="모집 상태"
                      select
                    >
                      {availabilityOptions.map((item) => (
                        <MenuItem key={item.value} value={item.value}>
                          {item.label}
                        </MenuItem>
                      ))}
                    </FormTextField>
                  </Grid>
                  <Grid xs={12} sm={6}>
                    <FormTextField
                      name="address"
                      control={control}
                      label="주소"
                      placeholder="예: 서울 마포구 양화로 45"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LocationOn />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid xs={12} sm={6}>
                    <FormTextField
                      name="latitude"
                      control={control}
                      label="위도"
                      placeholder="37.12345"
                    />
                  </Grid>
                  <Grid xs={12} sm={6}>
                    <FormTextField
                      name="longitude"
                      control={control}
                      label="경도"
                      placeholder="126.98765"
                    />
                  </Grid>
                </Grid>

                <SectionTitle title="상세 설명" />
                <FormTextField
                  name="description"
                  control={control}
                  label="상세 설명"
                  placeholder="방 구조, 주변 환경, 생활 규칙 등을 자세히 작성해주세요."
                  multiline
                  minRows={6}
                />

                <SectionTitle title="이미지 업로드" />
                <Stack spacing={2}>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: "none" }}
                    ref={fileInputRef}
                    onChange={handleImagesChange}
                  />
                  <Button variant="outlined" onClick={handleImagePick}>
                    이미지 선택 ({images.length}/6)
                  </Button>
                  {images.length > 0 && (
                    <Stack spacing={0.5}>
                      {images.map((file) => (
                        <Typography variant="caption" key={file.name}>
                          {file.name}
                        </Typography>
                      ))}
                    </Stack>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    최대 6장까지 업로드할 수 있습니다. (JPG, PNG)
                  </Typography>
                </Stack>

                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  justifyContent="flex-end"
                  flexWrap="wrap"
                >
                  <Button variant="text" onClick={handleReset}
                  >
                    변경 취소
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    sx={{ minWidth: 180 }}
                    disabled={isSubmitting || !canSubmit}
                  >
                    {isSubmitting ? "수정 중..." : "방 정보 저장"}
                  </Button>
                  {canManageRoom && (
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={handleDeleteRoom}
                      disabled={isSubmitting}
                    >
                      삭제
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Box>
          </Paper>
        </Stack>
      </Container>
      <SiteFooter />
    </Box>
  );
}

function SectionTitle({
  icon,
  title,
}: {
  icon?: React.ReactNode;
  title: string;
}) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      {icon}
      <Typography variant="h6" fontWeight={700}>
        {title}
      </Typography>
    </Stack>
  );
}
