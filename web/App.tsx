import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router";
import Chat from "./Chat";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="chat" element={<Chat />} />
      </Routes>
    </BrowserRouter>
  );
}
