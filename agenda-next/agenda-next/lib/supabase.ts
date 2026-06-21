import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://cxmvzuaaqgbmiueeSgkx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4bXZ6dWFhcWdibWl1ZWVzZ2t4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwMjc5NDQsImV4cCI6MjA5NzYwMzk0NH0.2vygd2igDfdnhG3c_hLC1ZXfTbfQy-BxRt7YzO9PVDo'
)
