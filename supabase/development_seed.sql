-- Development Seed Data
-- Fills the lookup tables with dummy players and decks for testing purposes.

insert into players (name) values
  ('Freash'),
  ('Daddy'),
  ('Herr Johannes'),
  ('me')
on conflict (name) do nothing;

insert into decks (name) values
  ('Frodo auf Crack'),
  ('Bello, bestest Boi'),
  ('A Fooddeck like daddy'),
  ('Norin...')
on conflict (name) do nothing;
