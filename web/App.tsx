import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router";
import Dashboard from "./Dashboard";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="chat" element={<Dashboard />} />
        <Route
          path="/"
          element={
            <>
              <meta
                http-equiv="refresh"
                content="0; url=https://chat-hackers.github.io"
              ></meta>
            </>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
