-- Migration 008: In-app chat and reviews tables
-- Run after 007_profile_settings_and_order_timing.sql

-- ─── Chat Messages ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_name     TEXT NOT NULL DEFAULT '',
  sender_role     TEXT NOT NULL DEFAULT 'customer' CHECK (sender_role IN ('customer','rider','vendor','admin')),
  text            TEXT NOT NULL,
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_order_id ON chat_messages(order_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_is_read ON chat_messages(is_read, sender_id);

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: users can see messages on orders they are part of
DROP POLICY IF EXISTS "chat_messages_select" ON chat_messages;
CREATE POLICY "chat_messages_select" ON chat_messages
  FOR SELECT USING (
    sender_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = chat_messages.order_id
      AND (
        o.customer_id = auth.uid()
        OR o.rider_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM restaurants r
          WHERE r.id = o.restaurant_id
            AND r.owner_id = auth.uid()
        )
      )
    )
  );

-- Policy: authenticated users can insert their own messages
DROP POLICY IF EXISTS "chat_messages_insert" ON chat_messages;
CREATE POLICY "chat_messages_insert" ON chat_messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

-- Policy: sender or participant can update (mark read)
DROP POLICY IF EXISTS "chat_messages_update" ON chat_messages;
CREATE POLICY "chat_messages_update" ON chat_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = chat_messages.order_id
      AND (
        o.customer_id = auth.uid()
        OR o.rider_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM restaurants r
          WHERE r.id = o.restaurant_id
            AND r.owner_id = auth.uid()
        )
      )
    )
  );

-- Enable Realtime for chat
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── Reviews ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  restaurant_id   UUID REFERENCES restaurants(id) ON DELETE SET NULL,
  restaurant_name TEXT NOT NULL DEFAULT '',
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating          INTEGER NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  food_rating     INTEGER NOT NULL DEFAULT 5 CHECK (food_rating BETWEEN 1 AND 5),
  delivery_rating INTEGER NOT NULL DEFAULT 5 CHECK (delivery_rating BETWEEN 1 AND 5),
  comment         TEXT DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (order_id, user_id)  -- one review per order per customer
);

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS food_rating INTEGER NOT NULL DEFAULT 5 CHECK (food_rating BETWEEN 1 AND 5);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS delivery_rating INTEGER NOT NULL DEFAULT 5 CHECK (delivery_rating BETWEEN 1 AND 5);
CREATE INDEX IF NOT EXISTS idx_reviews_restaurant_id ON reviews(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);

-- Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Policy: anyone can read reviews
DROP POLICY IF EXISTS "reviews_select" ON reviews;
CREATE POLICY "reviews_select" ON reviews
  FOR SELECT USING (TRUE);

-- Policy: customers can insert their own reviews
DROP POLICY IF EXISTS "reviews_insert" ON reviews;
CREATE POLICY "reviews_insert" ON reviews
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Policy: customers can update their own reviews (within 24h window enforced by app)
DROP POLICY IF EXISTS "reviews_update" ON reviews;
CREATE POLICY "reviews_update" ON reviews
  FOR UPDATE USING (user_id = auth.uid());
