import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google"; // 🌟 Import provider Google OAuth
import "./index.css"; 
import App from "./App.jsx";

// 🔐 Taruh Client ID Google Anda di sini (Sangat disarankan menggunakan variabel environment .env)
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "MOHON_GANTI_DENGAN_GOOGLE_CLIENT_ID_ANDA.apps.googleusercontent.com";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {/* Bungkus komponen App agar seluruh halaman (termasuk Login) bisa menggunakan fitur Google */}
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>
);