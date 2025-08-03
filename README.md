# Order Book Matching Engine

This project is a **Order Book Matching Engine** demonstrating a robust, database-centric solution for a real-time marketplace **order book**. It is built using **Next.js (App Router)** and **PostgreSQL**, containerized with **Docker**.

The core of the system is a **sophisticated PostgreSQL function** that acts as an atomic **matching engine**, capable of handling:

- Concurrent order placements
- Quantity & partial fills
- Market-standard **Price-Time Priority** rules

## For more details on the core architecture and functions, please refer to doc.md.

## Tech Stack

| Layer              | Technology                       |
| ------------------ | -------------------------------- |
| Frontend & Backend | Next.js (App Router, API Routes) |
| Database           | PostgreSQL                       |
| Containerization   | Docker, Docker Compose           |
| Styling            | Tailwind CSS                     |

## Getting Started

### Prerequisites

- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)

### 1. Build and Run the Application

With Docker running, start the entire stack using:

```bash
docker-compose up --build
```

This command will:

- Build the Docker image for the **Next.js app**
- Start the **PostgreSQL container** and run `sql/init.sql` to initialize schema + match engine
- Start the **Next.js application container**

---

### Services

| Service       | URL / Port                                     |
| ------------- | ---------------------------------------------- |
| Frontend App  | [http://localhost:3000](http://localhost:3000) |
| PostgreSQL DB | localhost:5432                                 |

---

### 2. How to Use the Demo

Navigate to `http://localhost:3000` — the UI consists of:

- **Place Order**: Submit new `bids` (buy) and `asks` (sell) with price and quantity
- **Order Book**: Shows active orders sorted by Price-Time priority
- **Recent Trades**: Displays trades that occurred from matches

#### Example Test Flow

1. Place an **ask** (sell) order for quantity **5** at price **\$105**
2. Place a **bid** (buy) order for quantity **10** at price **\$100**
   → _No match occurs_
3. Place a new **bid** for quantity **3** at price **\$105**
   → _A trade for quantity 3 is executed_

You’ll observe that the **original ask** is now **partially filled**, with **2 remaining**.

---

## Project Structure

```
.
├── app/                      # Next.js source
│   ├── api/orders/route.ts   # API logic
│   ├── page.tsx              # UI
│   └── ...
├── sql/
│   └── init.sql              # DB schema + matching engine
├── .env                      # Environment variables (optional)
|── docker-compose.yml        # Docker orchestration

```
