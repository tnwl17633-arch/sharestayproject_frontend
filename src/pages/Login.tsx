// src/pages/Login.tsx
import {
  Box,
  Button,
  InputAdornment,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../auth/useAuth";
import { Link as RouterLink, useNavigate } from "react-router-dom";
//======= 구글 관련 추가 import =======
import axios from "axios"; 
import { setStoredUsername } from "../lib/api"; 
import { useEffect } from "react"; 

const GOOGLE_OAUTH2_URL = "http://localhost:8080/oauth2/authorization/google";

const schema = z.object({
  username: z
    .string()
    .min(1, "이메일을 입력해주세요.")
    .email("올바른 이메일 형식을 입력해주세요."),
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다."),
});

type FormValues = z.infer<typeof schema>;

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    handleSubmit,
    register,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await login(values.username, values.password);
      window.location.href = "/";
    } catch (err: any) {
      console.error("[Login] 로그인 실패:", err);

      if (err?.response?.status === 403) {
        const message = err.response.data?.message ?? "정지된 계정입니다.";
        alert(message);
        window.location.href = "/login";
        return;
      }

      if (err?.response) {
        console.error("[Login] status:", err.response.status);
        console.error("[Login] data:", err.response.data);
        alert(`로그인 실패 (${err.response.status})`);
      } else {
        alert("로그인 중 오류가 발생했습니다. 콘솔을 확인해 주세요.");
      }
    }
  };

  //===== 구글 로그인 redirect 처리
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code"); // 백엔드에서 보내는 code

    if (code) {
      // 백엔드가 쿠키에 access/refresh 넣어주므로 프론트에서 토큰 직접 처리 불필요
      axios
        .get("/api/me", { withCredentials: true }) // 쿠키 포함 요청
        .then((res) => {
          setStoredUsername(res.data.username); // 사용자 정보 저장
        })
        .finally(() => {
          navigate("/", { replace: true }); // 홈으로 이동
        });
    }
  }, [navigate]);

  //===== 구글 로그인 버튼 클릭
  const handleGoogleLogin = () => {
    window.location.href = GOOGLE_OAUTH2_URL;
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#f4f6fb",
        display: "grid",
        placeItems: "center",
        px: 2,
      }}
    >
      <Paper
        sx={{
          width: "100%",
          maxWidth: 420,
          p: 4,
          borderRadius: 4,
          boxShadow:
            "0px 8px 20px rgba(15, 23, 42, 0.08), 0px 2px 6px rgba(15, 23, 42, 0.12)",
        }}
      >
        <Stack spacing={3} component="form" onSubmit={handleSubmit(onSubmit)}>
          <Box textAlign="center">
            <Typography
              component={RouterLink}
              to="/"
              variant="h4"
              fontWeight={800}
              color="primary.main"
              sx={{ textDecoration: "none" }}
            >
              ShareStay+
            </Typography>
          </Box>

          <Stack spacing={1}>
            <TextField
              label="이메일"
              placeholder="이메일을 입력하세요"
              {...register("username")}
              error={!!errors.username}
              helperText={errors.username?.message}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutlineOutlinedIcon color="disabled" />
                  </InputAdornment>
                ),
              }}
            />
          </Stack>

          <Stack spacing={1}>
            <TextField
              label="비밀번호"
              type="password"
              placeholder="비밀번호를 입력하세요"
              {...register("password")}
              error={!!errors.password}
              helperText={errors.password?.message}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon color="disabled" />
                  </InputAdornment>
                ),
              }}
            />
          </Stack>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="body2" color="text.secondary">
              계정이 없으신가요?{" "}
              <Link component={RouterLink} to="/signup" underline="hover">
                회원가입
              </Link>
            </Typography>
            <Link
              component={RouterLink}
              to="/forgot-password"
              variant="body2"
              underline="hover"
            >
              비밀번호를 잊으셨나요?
            </Link>
          </Stack>

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={isSubmitting}
            sx={{ borderRadius: 2, py: 1.4, fontWeight: 700 }}
          >
            {isSubmitting ? "로그인 중..." : "로그인"}
          </Button>

          <Button
            variant="outlined"
            size="large"
            onClick={handleGoogleLogin} // 구글 로그인 버튼 이벤트
            sx={{
              borderRadius: 2,
              py: 1.4,
              fontWeight: 700,
              borderColor: "#040505ff",
              color: "#4285F4",
            }}
          >
            구글 로그인
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}