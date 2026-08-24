-- Drop tables if they exist
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS incomes;
DROP TABLE IF EXISTS budgets;

-- Create expenses table
CREATE TABLE expenses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  month text NOT NULL,
  date date NOT NULL,
  category text NOT NULL,
  "subCategory" text NOT NULL,
  amount integer NOT NULL,
  memo text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create incomes table
CREATE TABLE incomes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  month text NOT NULL,
  date date NOT NULL,
  category text NOT NULL,
  "subCategory" text NOT NULL,
  amount integer NOT NULL,
  memo text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create budgets table
CREATE TABLE budgets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL,
  bank text NOT NULL,
  account text NOT NULL,
  "subCategory" text NOT NULL,
  amount integer NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);
