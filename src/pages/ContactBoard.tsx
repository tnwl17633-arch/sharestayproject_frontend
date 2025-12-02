import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  Chip,
} from "@mui/material";
import { AccessTime, Email, Phone } from "@mui/icons-material";

// 임시 유저 문의 목록 데이터
const mockInquiries = [
  { id: 1, title: "입주 날짜 문의드립니다", date: "2025-01-20" },
  { id: 2, title: "환불 절차가 궁금합니다", date: "2025-01-18" },
  { id: 3, title: "룸메이트 매칭 관련 문의", date: "2025-01-15" },
];

// FAQ 데이터
const faqList = [
  { id: 1, question: "입주 날짜를 변경할 수 있나요?", answer: "입주 날짜는 최소 3일 전까지 변경 가능합니다." },
  { id: 2, question: "환불 절차는 어떻게 되나요?", answer: "환불은 결제 수단에 따라 영업일 기준 3~5일 이내 처리됩니다." },
  { id: 3, question: "룸메이트 매칭은 어떻게 진행되나요?", answer: "성향, 생활습관 등을 기반으로 매칭을 진행합니다." },
];

const ContactBoard: React.FC = () => {
  const navigate = useNavigate();

  // 카드 정보 배열
  const contactCards = [
    {
      icon: <Phone sx={{ fontSize: 50, color: "#0d47a1" }} />,
      title: "전화 문의",
      content: (
        <>
          010-1234-5678 <br />
          <Chip label="평일 09:00~18:00" color="primary" size="primary" sx={{ mt: 1 }} />
        </>
      ),
      color: "#e3f2fd",
    },
    {
      icon: <Email sx={{ fontSize: 50, color: "#0d47a1" }} />,
      title: "이메일 문의",
      content: (
        <>
          24시간 접수 가능 <br />
          영업일 기준 24시간 내 답변 <br />
          <Chip label="support@sharestay.com" color="secondary" size="primary" sx={{ mt: 1 }} />
        </>
      ),
      color: "#f3e5f5",
    },
    {
      icon: <AccessTime sx={{ fontSize: 50, color: "#0d47a1" }} />,
      title: "응답 시간",
      content: (
        <>
          일반 문의: 24시간 내 <br />
          긴급 문의: 2시간 내 <br />
          <Chip label="빠른 답변 보장" color="success" size="primary" sx={{ mt: 1 }} />
        </>
      ),
      color: "#fff3e0",
    },
  ];

  return (
    <Box>
      {/* 헤더 */}
      <Box
        sx={{
          width: "100%",
          backgroundColor: "#0d47a1",
          color: "white",
          py: 13,
          textAlign: "center",
        }}
      >
        <Typography sx={{ fontSize: 42}}variant="h4" fontWeight="bold" gutterBottom>
          무엇을 도와드릴까요?
        </Typography>
        <Typography sx={{ opacity: 0.9, mt: 1, fontSize: 22 }}>
          ShareStay+ 이용 중 궁금한 점이 있으시면 언제든지 연락해주세요.
        </Typography>
      </Box>

      {/* 카드 섹션 */}
      <Box sx={{ maxWidth: 1100, mx: "auto", mt: 6, px: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 4, flexWrap: "wrap" }}>
          {contactCards.map((card, idx) => (
            <Card
              key={idx}
              sx={{
                flex: "1 1 30%",
                minWidth: 260,
                textAlign: "center",
                py: 4,
                borderRadius: 3,
                boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
                transition: "0.3s",
                backgroundColor: card.color,
                "&:hover": {
                  transform: "translateY(-6px)",
                  boxShadow: "0 12px 25px rgba(0,0,0,0.15)",
                },
              }}
            >
              <CardContent>
                {card.icon}
                <Typography variant="h6" fontWeight="bold" my={1.5}>
                  {card.title}
                </Typography>
                <Typography sx={{ color: "#555", fontSize: 16, lineHeight: 1.6 }}>
                  {card.content}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>

      {/* 최근 문의 */}
      <Box sx={{ maxWidth: 800, mx: "auto", mt: 10, px: 2 }}>
        <Typography variant="h5" fontWeight={600} sx={{ mb: 2 }}>
          📌 최근 문의 목록
        </Typography>
        <Card sx={{ boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}>
          <List>
            {mockInquiries.map((item, index) => (
              <React.Fragment key={item.id}>
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => alert(`문의 ID: ${item.id} (상세 페이지 연동 가능)`)}
                  >
                    <ListItemText
                      primary={item.title}
                      secondary={item.date}
                      primaryTypographyProps={{ fontSize: 16, fontWeight: 500 }}
                    />
                  </ListItemButton>
                </ListItem>
                {index < mockInquiries.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Card>
      </Box>

      {/* FAQ */}
      <Box sx={{ maxWidth: 800, mx: "auto", mt: 8 }}>
        <Typography variant="h5" fontWeight={600} sx={{ mb: 2 }}>
          ❓ 자주 묻는 질문
        </Typography>
        <Card sx={{ boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}>
          {faqList.map((item, index) => (
            <Box
              key={item.id}
              sx={{
                px: 3,
                py: 2,
                borderBottom: index < faqList.length - 1 ? "1px solid #eee" : "none",
                backgroundColor: index % 2 === 0 ? "#fafafa" : "#fff",
              }}
            >
              <Typography fontWeight="bold" sx={{ mb: 1 }}>
                Q. {item.question}
              </Typography>
              <Typography sx={{ color: "#555" }}>A. {item.answer}</Typography>
            </Box>
          ))}
        </Card>
      </Box>

      {/* 문의하기 버튼 */}
      <Box sx={{ textAlign: "center", mt: 6, mb: 10 }}>
        <Button
          variant="contained"
          size="large"
          color="primary"
          onClick={() => navigate("/contact/inquiry")}
        >
          문의하기
        </Button>
      </Box>
    </Box>
  );
};

export default ContactBoard;
