-- Velmeir Supabase schema

create table profiles (
  id uuid primary key,
  name text,
  email text unique not null,
  created_at timestamp with time zone default timezone('utc', now())
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  priority text,
  completed boolean default false,
  created_at timestamp with time zone default timezone('utc', now())
);

create table events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  title text not null,
  description text,
  date date not null,
  time text,
  type text,
  created_at timestamp with time zone default timezone('utc', now())
);

create table goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  title text not null,
  description text,
  progress integer default 0,
  target_date date,
  milestones text[],
  created_at timestamp with time zone default timezone('utc', now())
);

create table habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  title text not null,
  frequency text not null,
  streak integer default 0,
  completion_rate integer default 0,
  created_at timestamp with time zone default timezone('utc', now())
);

create table memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  content text not null,
  category text,
  created_at timestamp with time zone default timezone('utc', now())
);

create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  title text not null,
  content text,
  tags text[],
  created_at timestamp with time zone default timezone('utc', now())
);
