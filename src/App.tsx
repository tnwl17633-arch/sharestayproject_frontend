// src/App.tsx
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";

import Home from "./pages/Home";
import Contact from "./pages/Contact";
import ContactBoard from "./pages/ContactBoard";
import { AuthProvider } from "./context/AuthContext"; // 경로 수정 필요할 수도 있음

const theme = createTheme({
  palette: {
    primary: { main: "#0c51ff", contrastText: "#ffffff" },
    secondary: { main: "#0c51ff" },
  },
  components: {
    MuiButton: { styleOverrides: { root: { textTransform: "none" } } },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/contact" element={<ContactBoard />} />
            <Route path="/contact/inquiry" element={<Contact />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
