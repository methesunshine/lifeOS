-- LifeOS Database Schema

-- Enable RLS
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;

-- 1. Profiles (Extends Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Life Scores (Daily/Weekly snapshots)
CREATE TABLE IF NOT EXISTS public.life_scores (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  area TEXT NOT NULL, -- 'mental', 'physical', 'finance', 'skills', 'goals', 'habits', 'relationships', 'productivity', 'reflection'
  score INTEGER CHECK (score >= 0 AND score <= 100),
  calculated_at DATE DEFAULT CURRENT_DATE NOT NULL,
  UNIQUE(user_id, area, calculated_at)
);

-- 3. Mental & Emotional Health
CREATE TABLE IF NOT EXISTS public.mental_health (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  mood INTEGER CHECK (mood >= 1 AND mood <= 10),
  stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 10),
  focus_level INTEGER CHECK (focus_level >= 1 AND focus_level <= 10),
  gratitude_note TEXT,
  daily_reflection TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Physical Health
CREATE TABLE IF NOT EXISTS public.physical_health (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  sleep_hours NUMERIC(4,2),
  workout_completed BOOLEAN DEFAULT FALSE,
  water_intake_ml INTEGER,
  steps INTEGER,
  weight NUMERIC(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Habits
CREATE TABLE IF NOT EXISTS public.habits (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS public.habit_logs (
  id BIGSERIAL PRIMARY KEY,
  habit_id BIGINT REFERENCES public.habits ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  completed_at DATE DEFAULT CURRENT_DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(habit_id, completed_at)
);

-- 6. Finance
CREATE TABLE IF NOT EXISTS public.finance (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  category TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('expense', 'income', 'savings')),
  description TEXT,
  transaction_date DATE DEFAULT CURRENT_DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Skills
CREATE TABLE IF NOT EXISTS public.skills (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS public.skill_logs (
  id BIGSERIAL PRIMARY KEY,
  skill_id BIGINT REFERENCES public.skills ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  hours_invested NUMERIC(10,2) DEFAULT 0,
  skill_level INTEGER CHECK (skill_level >= 1 AND skill_level <= 10),
  projects_completed INTEGER DEFAULT 0,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Goals
CREATE TABLE IF NOT EXISTS public.goals (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  deadline DATE,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  status TEXT DEFAULT 'in-progress' CHECK (status IN ('in-progress', 'completed', 'overdue', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.subtasks (
  id BIGSERIAL PRIMARY KEY,
  goal_id BIGINT REFERENCES public.goals ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

ALTER TABLE public.life_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own life scores" ON public.life_scores FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.mental_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own mental health data" ON public.mental_health FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.physical_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own physical health data" ON public.physical_health FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own habit data" ON public.habits FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.finance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own finance data" ON public.finance FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own skills" ON public.skills FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.skill_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own skill logs" ON public.skill_logs FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own goals" ON public.goals FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own subtasks" ON public.subtasks
  FOR ALL USING (auth.uid() = user_id);

-- 9. Relationships
CREATE TABLE IF NOT EXISTS public.relationships (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  interaction_type TEXT NOT NULL, -- 'Family', 'Friends', 'Colleagues', 'Social'
  time_spent_mins INTEGER DEFAULT 0,
  satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 10),
  description TEXT,
  occurred_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.relationships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own relationships data" ON public.relationships
  FOR ALL USING (auth.uid() = user_id);

-- 10. Productivity
CREATE TABLE IF NOT EXISTS public.productivity (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  top_priority TEXT,
  tasks_completed INTEGER DEFAULT 0,
  focus_hours NUMERIC(4,2) DEFAULT 0,
  distraction_level INTEGER CHECK (distraction_level >= 1 AND distraction_level <= 10),
  created_at DATE DEFAULT CURRENT_DATE NOT NULL,
  logged_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, created_at)
);

ALTER TABLE public.productivity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own productivity data" ON public.productivity
  FOR ALL USING (auth.uid() = user_id);

-- 11. Reflection
CREATE TABLE IF NOT EXISTS public.reflections (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  daily_win TEXT,
  daily_lesson TEXT,
  monthly_self_rating INTEGER CHECK (monthly_self_rating >= 1 AND monthly_self_rating <= 10),
  reflection_note TEXT,
  entry_type TEXT DEFAULT 'daily' CHECK (entry_type IN ('daily', 'monthly')),
  created_at DATE DEFAULT CURRENT_DATE NOT NULL,
  logged_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, created_at, entry_type)
);

ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own reflection data" ON public.reflections
  FOR ALL USING (auth.uid() = user_id);
