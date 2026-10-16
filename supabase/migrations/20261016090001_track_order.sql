-- RBMS — Milestone 3: guest order tracking.
-- Anon cannot read the orders table (RLS). track_order() is a SECURITY DEFINER
-- lookup that returns a single order ONLY when the caller knows both the order
-- number AND the matching customer contact — a light privacy guard for guests.
create or replace function public.track_order(p_order_no text, p_contact text)
returns table (
  order_no         text,
  status           text,
  payment_status   text,
  order_date       date,
  fulfillment_type text,
  delivery_address text,
  delivery_date    date,
  time_slot        text,
  mill_by          date,
  kg_ordered       numeric,
  price_per_kg     numeric,
  rice_amount      numeric,
  delivery_fee     numeric,
  total_due        numeric,
  amount_paid      numeric,
  balance          numeric,
  milled_on        date,
  delivered_on     date,
  customer_name    text
)
language sql stable security definer set search_path = public as $$
  select
    o.order_no, o.status, o.payment_status, o.order_date,
    o.fulfillment_type, o.delivery_address, o.delivery_date, o.time_slot,
    o.mill_by, o.kg_ordered, o.price_per_kg, o.rice_amount,
    o.delivery_fee, o.total_due, o.amount_paid, o.balance,
    o.milled_on, o.delivered_on, c.name
  from public.orders o
  join public.customers c on c.id = o.customer_id
  where o.order_no = trim(p_order_no)
    and c.contact_no = trim(p_contact);
$$;

grant execute on function public.track_order(text, text) to anon, authenticated;
