CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name TEXT NOT NULL,
    session_id TEXT NOT NULL,
    path TEXT,
    event_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable insert for all users" ON public.analytics_events
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable select for authenticated users only" ON public.analytics_events
    FOR SELECT USING (true);
