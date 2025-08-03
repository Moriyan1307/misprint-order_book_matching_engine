// /app/api/orders/route.ts
import { Pool } from "pg";
import { NextResponse } from "next/server";

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

// Handler for GET requests to fetch the order book state
export async function GET() {
  try {
    const ordersResult = await pool.query(
      "SELECT * FROM order_book WHERE status IN ('active', 'pending_fulfillment') ORDER BY created_at DESC"
    );
    const tradesResult = await pool.query(
      "SELECT * FROM trades ORDER BY created_at DESC LIMIT 20"
    );

    const orders = ordersResult.rows.map((order) => ({
      ...order,
      price: parseFloat(order.price),
    }));
    const trades = tradesResult.rows.map((trade) => ({
      ...trade,
      execution_price: parseFloat(trade.execution_price),
    }));

    return NextResponse.json({ orders, trades });
  } catch (error: any) {
    console.error("Error fetching book state:", error);
    return NextResponse.json(
      { error: "Failed to fetch book state", details: error.message },
      { status: 500 }
    );
  }
}

// handler for POST requests to place a new order
export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const { spec_id, grade, grading_company, price, type, quantity } =
      await request.json();

    // 1. Insert the new order with its quantity
    const insertResult = await client.query(
      "INSERT INTO order_book (spec_id, grade, grading_company, price, type, quantity) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
      [spec_id, grade, grading_company, price, type, quantity]
    );
    const newOrderId = insertResult.rows[0].id;

    // 2. call the matching engine RPC. it returns a set of trade IDs.
    const matchResult = await client.query(
      "SELECT * FROM match_order($1::bigint)",
      [newOrderId]
    );

    // the result is an array of rows, each containing a trade_id
    const tradeIds = matchResult.rows.map((r) => r.trade_id);

    if (tradeIds.length > 0) {
      //iIf trades were created, fetch their full details to return to the client
      const tradesResult = await client.query(
        "SELECT * FROM trades WHERE id = ANY($1::bigint[])",
        [tradeIds]
      );
      return NextResponse.json({
        message: `${tradeIds.length} trade(s) executed!`,
        trades: tradesResult.rows,
      });
    } else {
      // No match was found, so the order is now resting on the book.
      const newOrderResult = await client.query(
        "SELECT * FROM order_book WHERE id = $1",
        [newOrderId]
      );
      return NextResponse.json({
        message: "Order placed on book.",
        order: newOrderResult.rows[0],
      });
    }
  } catch (error: any) {
    console.error("Error placing order:", error);
    return NextResponse.json(
      { error: "Failed to place order", details: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
