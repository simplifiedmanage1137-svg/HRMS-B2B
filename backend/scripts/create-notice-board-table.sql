-- Run this in your Supabase SQL editor
-- Notice Board table for global navbar notices

CREATE TABLE IF NOT EXISTS notice_board (
    id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title            TEXT NOT NULL,
    message          TEXT NOT NULL,
    display_type     TEXT NOT NULL DEFAULT 'marquee',   -- 'static' | 'marquee'
    direction        TEXT NOT NULL DEFAULT 'right_to_left', -- 'right_to_left' | 'left_to_right'
    text_color       TEXT NOT NULL DEFAULT '#2B2B2B',
    background_color TEXT NOT NULL DEFAULT '#FFF8E7',
    font_style       TEXT NOT NULL DEFAULT 'normal',    -- 'normal' | 'italic' | 'bold' | 'bold italic'
    is_active        BOOLEAN NOT NULL DEFAULT FALSE,
    created_by       TEXT,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Only one active notice enforced at app level, but index helps fast lookup
CREATE INDEX IF NOT EXISTS idx_notice_board_active ON notice_board (is_active);
