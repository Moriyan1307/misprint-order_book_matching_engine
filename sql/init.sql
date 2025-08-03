

CREATE TYPE public.order_type AS ENUM ('bid', 'ask');
CREATE TYPE public.order_status AS ENUM ('active', 'cancelled', 'expired', 'completed', 'pending_fulfillment');

-- The main table for storing all buy and sell orders
CREATE TABLE public.order_book (
  id bigserial PRIMARY KEY,
  spec_id bigint NOT NULL,
  grade text NOT NULL,
  grading_company text NOT NULL,
  price numeric(10, 2) NOT NULL,
  type public.order_type NOT NULL,
  status public.order_status NOT NULL DEFAULT 'active',
  quantity integer NOT NULL DEFAULT 1,
  filled_quantity integer NOT NULL DEFAULT 0, -- Tracks partial fills
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- An immutable log of all successful trades
CREATE TABLE public.trades (
    id bigserial PRIMARY KEY,
    ask_order_id bigint NOT NULL REFERENCES public.order_book(id),
    bid_order_id bigint NOT NULL REFERENCES public.order_book(id),
    execution_price numeric(10, 2) NOT NULL,
    quantity integer NOT NULL, -- The quantity filled in this specific trade
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    fulfillment_status text NOT NULL DEFAULT 'pending'
);

-- Index for faster lookups during matching
CREATE INDEX idx_order_book_matching ON public.order_book (spec_id, grade, grading_company, type, status, price, created_at);


--- matching engine  ---
CREATE OR REPLACE FUNCTION match_order(p_order_id bigint)
RETURNS TABLE(trade_id bigint) AS $$
DECLARE
    v_order RECORD;
    v_match RECORD;
    v_trade_id_temp bigint;
    v_quantity_to_fill integer;
    v_cumulative_filled integer := 0;
BEGIN
    -- Lock the incoming order to prevent concurrent modifications
    SELECT * INTO v_order FROM public.order_book
    WHERE id = p_order_id AND status = 'active'
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN; 
    END IF;

    -- loop through potential matches
    FOR v_match IN
        SELECT * FROM public.order_book
        WHERE
            spec_id = v_order.spec_id AND
            grade = v_order.grade AND
            grading_company = v_order.grading_company AND
            type != v_order.type AND
            status = 'active' AND
            (
                (v_order.type = 'bid' AND price <= v_order.price) OR
                (v_order.type = 'ask' AND price >= v_order.price)
            )
        ORDER BY
            CASE WHEN v_order.type = 'bid' THEN price END ASC, 
            CASE WHEN v_order.type = 'ask' THEN price END DESC,
            created_at ASC
        FOR UPDATE SKIP LOCKED -- handles concurrency
    LOOP
        -- calculate how much of the order can be filled by this match
        v_quantity_to_fill := LEAST(
            v_order.quantity - (v_order.filled_quantity + v_cumulative_filled),
            v_match.quantity - v_match.filled_quantity
        );

        IF v_quantity_to_fill > 0 THEN
            -- create a trade record for this partial fill
            INSERT INTO trades (bid_order_id, ask_order_id, execution_price, quantity)
            VALUES (
                CASE WHEN v_order.type = 'bid' THEN v_order.id ELSE v_match.id END,
                CASE WHEN v_order.type = 'ask' THEN v_order.id ELSE v_match.id END,
                -- execution price is the price of the resting (older) order
                CASE WHEN v_match.created_at < v_order.created_at
                     THEN v_match.price ELSE v_order.price END,
                v_quantity_to_fill
            ) RETURNING id INTO v_trade_id_temp;

            -- update filled quantities for both orders separately for correctness
            UPDATE public.order_book
            SET filled_quantity = filled_quantity + v_quantity_to_fill
            WHERE id = v_order.id;

            UPDATE public.order_book
            SET filled_quantity = filled_quantity + v_quantity_to_fill
            WHERE id = v_match.id;

            -- track the cumulative amount filled for the incoming order in this session
            v_cumulative_filled := v_cumulative_filled + v_quantity_to_fill;
            trade_id := v_trade_id_temp;
            RETURN NEXT;

        END IF;

        -- exit the loop if the incoming order has been fully filled
        IF (v_order.filled_quantity + v_cumulative_filled) >= v_order.quantity THEN
            EXIT;
        END IF;
    END LOOP;

    -- we now set the status to 'pending_fulfillment' to hand off to the async worker.
    UPDATE public.order_book
    SET status = 'pending_fulfillment'
    WHERE status = 'active' AND quantity <= filled_quantity;

    RETURN;
END;
$$ LANGUAGE plpgsql;
