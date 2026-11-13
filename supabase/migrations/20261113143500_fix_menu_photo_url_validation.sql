-- Correct the trusted menu-photo URL expression used by the owner menu builder.

create or replace function public.update_restaurant_menu(p_restaurant_id uuid, p_menu jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  menu_item jsonb;
  item_name text;
  item_category text;
  item_description text;
  item_image_url text;
  item_price numeric;
  seen_names text[] := array[]::text[];
begin
  if auth.uid() is null or not (
    exists(select 1 from public.admin_users a where a.user_id = auth.uid())
    or exists(
      select 1 from public.restaurant_members rm
      where rm.restaurant_id = p_restaurant_id
        and rm.user_id = auth.uid()
        and rm.member_role in ('owner', 'manager')
    )
  ) then
    raise exception 'Not authorised to update this restaurant menu';
  end if;
  if jsonb_typeof(p_menu) <> 'array' or jsonb_array_length(p_menu) < 1 or jsonb_array_length(p_menu) > 50 then
    raise exception 'Menu must contain between 1 and 50 food items';
  end if;
  for menu_item in select value from jsonb_array_elements(p_menu) loop
    if jsonb_typeof(menu_item) <> 'object' then
      raise exception 'Each menu item must include its name, category and price';
    end if;
    item_name := btrim(coalesce(menu_item->>'name', ''));
    item_category := btrim(coalesce(menu_item->>'category', ''));
    item_description := btrim(coalesce(menu_item->>'description', ''));
    item_image_url := btrim(coalesce(menu_item->>'image_url', ''));
    if char_length(item_name) < 1 or char_length(item_name) > 120 then
      raise exception 'Each food item needs a name between 1 and 120 characters';
    end if;
    if char_length(item_category) < 1 or char_length(item_category) > 40 then
      raise exception 'Each food item needs a category between 1 and 40 characters';
    end if;
    if char_length(item_description) > 400 then
      raise exception 'Food descriptions may not exceed 400 characters';
    end if;
    if lower(item_name) = any(seen_names) then
      raise exception 'Each food item must have a different name';
    end if;
    seen_names := array_append(seen_names, lower(item_name));
    if jsonb_typeof(menu_item->'price') <> 'number' then
      raise exception 'Each food item needs a numeric price';
    end if;
    item_price := (menu_item->>'price')::numeric;
    if item_price < 0 or item_price > 99999.99 then
      raise exception 'Food prices must be between R0 and R99999.99';
    end if;
    if item_image_url <> '' and item_image_url !~ (
      '^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/restaurant-menu-items/'
      || p_restaurant_id::text || '/'
    ) then
      raise exception 'Food photo URL is not from this restaurant''s approved photo storage';
    end if;
  end loop;
  update public.restaurants set menu = p_menu, updated_at = now() where id = p_restaurant_id;
  if not found then
    raise exception 'Restaurant not found';
  end if;
end;
$$;

revoke execute on function public.update_restaurant_menu(uuid, jsonb) from public, anon;
grant execute on function public.update_restaurant_menu(uuid, jsonb) to authenticated;

