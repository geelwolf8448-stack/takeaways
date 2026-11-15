-- Keep the free 14-day pilot, but do not create an invoice or attach a payment provider.
-- Platform payment collection is paused until a replacement is deliberately set up.
CREATE OR REPLACE FUNCTION public.register_food_business(
  p_owner_id uuid,
  p_owner_name text,
  p_phone text,
  p_business_name text,
  p_business_type text,
  p_area text,
  p_province text,
  p_category text,
  p_whatsapp text,
  p_menu jsonb,
  p_latitude double precision DEFAULT NULL,
  p_longitude double precision DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_restaurant_id uuid;
  v_subscription_id uuid;
  v_started_at timestamptz := now();
  v_ends_at timestamptz := now() + interval '14 days';
BEGIN
  IF p_owner_id IS NULL
     OR length(trim(coalesce(p_owner_name,''))) NOT BETWEEN 2 AND 120
     OR length(trim(coalesce(p_business_name,''))) NOT BETWEEN 2 AND 120
     OR length(trim(coalesce(p_area,''))) NOT BETWEEN 2 AND 100
     OR p_business_type NOT IN ('restaurant','takeaway_shop','home_based_takeaway','inyama_shop','coffee_shop')
     OR length(trim(coalesce(p_category,''))) NOT BETWEEN 2 AND 60
     OR p_province NOT IN ('Eastern Cape','Free State','Gauteng','KwaZulu-Natal','Limpopo','Mpumalanga','Northern Cape','North West','Western Cape')
     OR p_whatsapp !~ '^27[0-9]{9}$'
     OR jsonb_typeof(p_menu) <> 'array'
     OR jsonb_array_length(p_menu) < 1
     OR jsonb_array_length(p_menu) > 100
     OR ((p_latitude IS NULL) <> (p_longitude IS NULL))
     OR (p_latitude IS NOT NULL AND (p_latitude < -90 OR p_latitude > 90))
     OR (p_longitude IS NOT NULL AND (p_longitude < -180 OR p_longitude > 180)) THEN
    RAISE EXCEPTION 'Please check the business registration details, menu and location.';
  END IF;

  INSERT INTO public.restaurants
    (name, area, province, business_type, category, whatsapp, description, menu, is_published, latitude, longitude)
  VALUES
    (trim(p_business_name), trim(p_area), p_province, p_business_type,
     trim(p_category), p_whatsapp, '', p_menu, true, p_latitude, p_longitude)
  RETURNING id INTO v_restaurant_id;

  INSERT INTO public.restaurant_members (restaurant_id, user_id, member_role)
  VALUES (v_restaurant_id, p_owner_id, 'owner');

  INSERT INTO public.marketplace_profiles (user_id, full_name, phone)
  VALUES (p_owner_id, trim(p_owner_name), p_phone)
  ON CONFLICT (user_id) DO UPDATE
    SET full_name = excluded.full_name, phone = excluded.phone, updated_at = now();

  INSERT INTO public.billing_subscriptions
    (restaurant_id, status, currency, admin_fee_amount_cents, monthly_amount_cents,
     pilot_started_at, pilot_ends_at, next_billing_at, updated_at)
  VALUES
    (v_restaurant_id, 'trialing', 'ZAR', 25000, 50000,
     v_started_at, v_ends_at, NULL, now())
  RETURNING id INTO v_subscription_id;

  RETURN jsonb_build_object(
    'restaurant_id', v_restaurant_id,
    'subscription_id', v_subscription_id,
    'pilot_started_at', v_started_at,
    'pilot_ends_at', v_ends_at
  );
END;
$function$;
