-- Optional default seed data for lookups

insert into game_types (name) values
  ('EDH'),
  ('Pentagram'),
  ('Archenemy'),
  ('Planechase')
on conflict (name) do nothing;

insert into win_conditions (name) values
  ('Combat Damage'),
  ('Commander Damage'),
  ('Infect'),
  ('Combo'),
  ('Mill'),
  ('Concession')
on conflict (name) do nothing;
