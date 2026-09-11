import { BrowserRouter, Link, Route, Routes } from "react-router-dom";

import Home from "@/routes/Home";

/**
 * Application routing. The `/` route renders the resource directory; the
 * booking flow replaces the placeholder in a later work unit.
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
              <Route
                path="/book/:id"
                element={
                  <p className="text-muted-foreground">
                    Booking flow landing here in a later work unit.
                  </p>
                }
              />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}