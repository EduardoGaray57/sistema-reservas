import { BrowserRouter, Link, Route, Routes } from "react-router-dom";

import BookingPage from "@/routes/BookingPage";
import Home from "@/routes/Home";

/**
 * Application routing. `/` renders the resource directory; `/book/:id`
 * renders the booking flow for one resource.
 */
export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4">
          <header className="flex items-center justify-between border-b py-4">
            <Link to="/" className="text-lg font-semibold">
              Sistema de Reservas
            </Link>
          </header>
          <main className="flex-1 py-6">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/book/:id" element={<BookingPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}