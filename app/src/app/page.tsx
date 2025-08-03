/* /app/page.tsx */
"use client";

import { useState, useEffect, FormEvent } from "react";

interface Order {
  id: number;
  price: number;
  type: "bid" | "ask";
  status: string;
  quantity: number;
  filled_quantity: number;
  created_at: string;
}

interface Trade {
  id: number;
  execution_price: number;
  quantity: number;
  created_at: string;
}

interface BookState {
  orders: Order[];
  trades: Trade[];
}

export default function HomePage() {
  const [bookState, setBookState] = useState<BookState>({
    orders: [],
    trades: [],
  });
  const [form, setForm] = useState({
    spec_id: "123",
    grade: "10",
    grading_company: "PSA",
    price: "100.00",
    type: "bid" as "bid" | "ask",
    quantity: "1",
  });
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const fetchBookState = async () => {
    try {
      const res = await fetch("/api/orders");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setBookState(data);
    } catch (error) {
      console.error(error);
      setMessage("Error: Could not connect to the server.");
    }
  };

  useEffect(() => {
    fetchBookState();
    const interval = setInterval(fetchBookState, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price: parseFloat(form.price),
          spec_id: parseInt(form.spec_id, 10),
          quantity: parseInt(form.quantity, 10),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      setMessage("An unexpected error occurred.");
    } finally {
      await fetchBookState();
      setIsLoading(false);
    }
  };

  const cardIdentifier = `${form.spec_id} | ${form.grading_company} | ${form.grade}`;
  const bids = bookState.orders
    .filter((o) => o.type === "bid")
    .sort((a, b) => b.price - a.price);
  const asks = bookState.orders
    .filter((o) => o.type === "ask")
    .sort((a, b) => a.price - b.price);

  return (
    <main className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold text-center mb-8">
        Order Book Matching Engine
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Column 1: Order Placement */}
        <div className="md:col-span-1 bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold mb-4 border-b border-gray-600 pb-2">
            Place Order
          </h2>
          <p className="text-sm text-gray-400 mb-4">Card: {cardIdentifier}</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="price"
                className="block text-sm font-medium text-gray-300"
              >
                Price ($)
              </label>
              <input
                id="price"
                name="price"
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                step="0.01"
                required
                className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label
                htmlFor="quantity"
                className="block text-sm font-medium text-gray-300"
              >
                Quantity
              </label>
              <input
                id="quantity"
                name="quantity"
                type="number"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                min="1"
                step="1"
                required
                className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label
                htmlFor="type"
                className="block text-sm font-medium text-gray-300"
              >
                Order Type
              </label>
              <select
                id="type"
                name="type"
                value={form.type}
                onChange={(e) =>
                  setForm({ ...form, type: e.target.value as "bid" | "ask" })
                }
                className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="bid">Bid (Buy)</option>
                <option value="ask">Ask (Sell)</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-500"
            >
              {isLoading ? "Placing..." : "Place Order"}
            </button>
          </form>
          {message && (
            <p className="mt-4 text-center font-semibold text-yellow-300">
              {message}
            </p>
          )}
        </div>

        {/* Column 2: Order Book */}
        <div className="md:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4 text-green-400">
              Bids (Buyers)
            </h3>
            <div className="font-mono text-xs space-y-2">
              <div className="flex justify-between text-gray-400">
                <span>QTY @ PRICE</span>
                <span>STATUS</span>
              </div>
              {bids.map((order) => (
                <div key={order.id} className="flex justify-between">
                  <span>
                    {order.quantity - order.filled_quantity} @ $
                    {order.price.toFixed(2)}
                  </span>
                  <span className="text-gray-500 uppercase">
                    {order.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4 text-red-400">
              Asks (Sellers)
            </h3>
            <div className="font-mono text-xs space-y-2">
              <div className="flex justify-between text-gray-400">
                <span>QTY @ PRICE</span>
                <span>STATUS</span>
              </div>
              {asks.map((order) => (
                <div key={order.id} className="flex justify-between">
                  <span>
                    {order.quantity - order.filled_quantity} @ $
                    {order.price.toFixed(2)}
                  </span>
                  <span className="text-gray-500 uppercase">
                    {order.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Recent Trades */}
      <div className="mt-8 bg-gray-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-semibold mb-4 border-b border-gray-600 pb-2">
          Recent Trades
        </h2>
        <div className="font-mono text-sm space-y-2">
          {bookState.trades.map((trade) => (
            <div key={trade.id} className="flex justify-between items-center">
              <span>
                Trade:{" "}
                <span className="font-bold text-yellow-400">
                  {trade.quantity}
                </span>{" "}
                cards @{" "}
                <span className="font-bold text-cyan-400">
                  ${trade.execution_price.toFixed(2)}
                </span>
              </span>
              <span className="text-xs text-gray-500">
                {new Date(trade.created_at).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
