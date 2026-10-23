do $$
begin
  if exists (
    select lower(trim(org.name))
    from public.organizations as org
    group by lower(trim(org.name))
    having count(*) > 1
  ) then
    raise exception 'Duplicate organization names already exist; rename duplicates before applying this migration';
  end if;
end;
$$;

create unique index if not exists organizations_name_normalized_key
  on public.organizations (lower(trim(name)));

create or replace function public.create_organization(
  p_name text,
  p_join_as_player boolean default true
)
returns table (organization_id uuid, organization_name text, invite_code text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_name text := trim(p_name);
  new_code text;
  new_id uuid;
  account_name text;
  violated_constraint text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if char_length(clean_name) < 2 or char_length(clean_name) > 80 then
    raise exception 'Organization name must contain 2 to 80 characters';
  end if;
  if exists (
    select 1
    from public.organizations as org
    where lower(trim(org.name)) = lower(clean_name)
  ) then
    raise exception 'Organization name is already taken';
  end if;

  select coalesce(
    nullif(trim(users.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(users.email, '@', 1), ''),
    'Joueur'
  )
  into account_name
  from auth.users as users
  where users.id = auth.uid();

  loop
    new_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
    exit when not exists (
      select 1 from public.organizations as org where org.invite_code = new_code
    );
  end loop;

  begin
    insert into public.organizations (name, invite_code, created_by)
    values (clean_name, new_code, auth.uid())
    returning id into new_id;
  exception
    when unique_violation then
      get stacked diagnostics violated_constraint = constraint_name;
      if violated_constraint = 'organizations_name_normalized_key' then
        raise exception 'Organization name is already taken';
      end if;
      raise;
  end;

  insert into public.organization_members (
    organization_id,
    user_id,
    display_name,
    role,
    is_player
  ) values (
    new_id,
    auth.uid(),
    account_name,
    'owner',
    p_join_as_player
  );

  return query select new_id, clean_name, new_code;
end;
$$;

revoke all on function public.create_organization(text, boolean) from public;
grant execute on function public.create_organization(text, boolean) to authenticated;