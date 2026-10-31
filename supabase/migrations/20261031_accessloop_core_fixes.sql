-- ============================================================================
-- AccessLoop — Core Hackathon Migration
-- File: supabase/migrations/20261031_accessloop_core_fixes.sql
-- Description:
-- 1. Updates booking lifecycle transition guard to allow 'approved' -> 'completed'.
-- 2. Fixes check_out_booking to transition booking status to 'completed'.
-- 3. Prevents borrowers from approving/rejecting their own bookings (even if admin).
-- 4. Prevents borrowers from reviewing/verifying their own eligibility (even if admin).
-- 5. Implements missing waitlist RPCs: offer_waitlist_slot, accept_waitlist_offer, cancel_waitlist_request.
-- 6. Tightens bookings update security to protect lifecycle fields.
-- ============================================================================

-- 1. Allow 'approved' -> 'completed' transition
CREATE OR REPLACE FUNCTION public.guard_booking_status_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
    (OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected', 'cancelled'))
    OR
    (OLD.status = 'approved' AND NEW.status IN ('cancelled', 'completed'))
  ) THEN
    RAISE EXCEPTION 'Invalid booking status transition: % -> %.', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$function$;

-- 2. Fix check_out_booking to update status to 'completed'
CREATE OR REPLACE FUNCTION public.check_out_booking(
    p_booking_id uuid,
    p_return_condition text,
    p_notes text DEFAULT NULL::text
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'You must be logged in';
    END IF;

    IF p_return_condition IS NULL OR trim(p_return_condition) = '' THEN
        RAISE EXCEPTION 'Return condition is required';
    END IF;

    UPDATE public.bookings
    SET
        check_out_at = NOW(),
        return_condition = p_return_condition,
        check_out_notes = p_notes,
        status = 'completed'
    WHERE id = p_booking_id
      AND user_id = auth.uid()
      AND status = 'approved'
      AND check_in_at IS NOT NULL
      AND check_out_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not eligible for check-out';
    END IF;
END;
$function$;

-- 3. Prevent self-approval in respond_to_booking
CREATE OR REPLACE FUNCTION public.respond_to_booking(p_booking_id uuid, p_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_user UUID := auth.uid();
  v_resource_id UUID;
  v_owner_id UUID;
  v_borrower_id UUID;
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
  v_current_status TEXT;
  v_max_active INTEGER;
  v_max_hours INTEGER;
  v_role TEXT;
  v_conflicts INTEGER;
  v_active INTEGER;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'You must be logged in.';
  END IF;

  IF p_status NOT IN ('approved', 'rejected', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid booking status.';
  END IF;

  SELECT role INTO v_role
  FROM public.profiles
  WHERE user_id = v_user;

  SELECT
    b.resource_id,
    r.owner_id,
    b.user_id,
    b.start_time,
    b.end_time,
    b.status,
    COALESCE(r.max_active_bookings, 2),
    COALESCE(r.max_booking_hours, 4)
  INTO
    v_resource_id,
    v_owner_id,
    v_borrower_id,
    v_start,
    v_end,
    v_current_status,
    v_max_active,
    v_max_hours
  FROM public.bookings b
  JOIN public.resources r ON r.id = b.resource_id
  WHERE b.id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.';
  END IF;

  -- Serialize approval decisions for this resource.
  PERFORM 1
  FROM public.resources
  WHERE id = v_resource_id
  FOR UPDATE;

  IF p_status = 'cancelled' THEN
    IF v_user <> v_borrower_id THEN
      RAISE EXCEPTION 'Only the requester can cancel this booking.';
    END IF;

    IF v_current_status NOT IN ('pending', 'approved') THEN
      RAISE EXCEPTION 'This booking cannot be cancelled.';
    END IF;
  ELSE
    -- Critical Security Fix: Prevent borrowers from approving or rejecting their own booking
    IF v_user = v_borrower_id THEN
      RAISE EXCEPTION 'Borrowers cannot approve or reject their own booking requests.';
    END IF;

    IF v_user <> v_owner_id AND COALESCE(v_role, '') <> 'admin' THEN
      RAISE EXCEPTION 'Only the resource owner or an admin can review this request.';
    END IF;

    IF v_current_status <> 'pending' THEN
      RAISE EXCEPTION 'Only pending bookings can be reviewed.';
    END IF;
  END IF;

  IF p_status = 'approved' THEN
    IF v_start <= now() OR v_end <= v_start THEN
      RAISE EXCEPTION 'The requested time is invalid or has already passed.';
    END IF;

    IF EXTRACT(EPOCH FROM (v_end - v_start)) / 3600 > v_max_hours THEN
      RAISE EXCEPTION 'This booking exceeds the resource time limit of % hours.', v_max_hours;
    END IF;

    SELECT COUNT(*) INTO v_conflicts
    FROM public.bookings
    WHERE resource_id = v_resource_id
      AND status = 'approved'
      AND id <> p_booking_id
      AND start_time < v_end
      AND end_time > v_start;

    IF v_conflicts > 0 THEN
      RAISE EXCEPTION 'Another approved booking overlaps this time slot.';
    END IF;

    SELECT COUNT(*) INTO v_active
    FROM public.bookings
    WHERE resource_id = v_resource_id
      AND user_id = v_borrower_id
      AND status = 'approved'
      AND end_time > now()
      AND id <> p_booking_id;

    IF v_active >= v_max_active THEN
      RAISE EXCEPTION 'This requester has reached the active booking limit for this resource.';
    END IF;
  END IF;

  UPDATE public.bookings
  SET status = p_status
  WHERE id = p_booking_id;
END;
$function$;

-- 4. Prevent self-verification in review_booking_eligibility
CREATE OR REPLACE FUNCTION public.review_booking_eligibility(
    p_review_id uuid,
    p_status text,
    p_review_notes text DEFAULT NULL::text
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_user UUID := auth.uid();
  v_owner UUID;
  v_borrower UUID;
  v_booking UUID;
  v_role TEXT;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'You must be logged in.';
  END IF;

  IF p_status NOT IN ('verified', 'rejected') THEN
    RAISE EXCEPTION 'Invalid eligibility decision.';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE user_id = v_user;

  SELECT er.booking_id, er.user_id, r.owner_id
  INTO v_booking, v_borrower, v_owner
  FROM public.eligibility_reviews er
  JOIN public.bookings b ON b.id = er.booking_id
  JOIN public.resources r ON r.id = b.resource_id
  WHERE er.id = p_review_id AND er.status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending eligibility review not found.';
  END IF;

  -- Critical Security Fix: Prevent borrowers from verifying their own eligibility
  IF v_user = v_borrower THEN
    RAISE EXCEPTION 'Borrowers cannot review or verify their own eligibility.';
  END IF;

  IF v_user <> v_owner AND COALESCE(v_role, '') <> 'admin' THEN
    RAISE EXCEPTION 'Only the resource owner or an administrator can review eligibility.';
  END IF;

  IF p_status = 'rejected' AND COALESCE(trim(p_review_notes), '') = '' THEN
    RAISE EXCEPTION 'A reason is required when rejecting eligibility.';
  END IF;

  UPDATE public.eligibility_reviews
  SET status = p_status,
      reviewed_by = v_user,
      review_notes = NULLIF(trim(p_review_notes), ''),
      reviewed_at = now()
  WHERE id = p_review_id;

  INSERT INTO public.notifications (user_id, title, message, is_read)
  VALUES (
    v_borrower,
    CASE WHEN p_status = 'verified' THEN 'Eligibility verified' ELSE 'Eligibility needs attention' END,
    CASE WHEN p_status = 'verified'
      THEN 'Your eligibility has been verified. The owner can now review your booking.'
      ELSE 'Your eligibility was not verified. Review the owner notes and contact them if needed.'
    END,
    false
  );

  INSERT INTO public.booking_activity (booking_id, actor_id, action, details)
  VALUES (v_booking, v_user, 'eligibility_' || p_status,
          COALESCE(NULLIF(trim(p_review_notes), ''), 'Eligibility decision recorded.'));
END;
$function$;

-- 5. Missing Waitlist RPCs: offer_waitlist_slot, accept_waitlist_offer, cancel_waitlist_request

-- 5A. offer_waitlist_slot
CREATE OR REPLACE FUNCTION public.offer_waitlist_slot(p_waitlist_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_user UUID := auth.uid();
  v_owner UUID;
  v_requester UUID;
  v_resource UUID;
  v_resource_title TEXT;
  v_current_status TEXT;
  v_role TEXT;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Please sign in first.';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE user_id = v_user;

  SELECT w.user_id, w.resource_id, w.status, r.owner_id, r.title
  INTO v_requester, v_resource, v_current_status, v_owner, v_resource_title
  FROM public.booking_waitlist w
  JOIN public.resources r ON r.id = w.resource_id
  WHERE w.id = p_waitlist_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Waitlist request not found.';
  END IF;

  IF v_current_status <> 'waiting' THEN
    RAISE EXCEPTION 'Only requests currently waiting can be offered a slot.';
  END IF;

  IF v_user <> v_owner AND COALESCE(v_role, '') <> 'admin' THEN
    RAISE EXCEPTION 'Only the resource owner or an administrator can offer a waitlist slot.';
  END IF;

  -- Update status to 'offered' (enforce_waitlist_fifo trigger validates FIFO order)
  UPDATE public.booking_waitlist
  SET status = 'offered'
  WHERE id = p_waitlist_id;

  -- Notify the waiting borrower
  INSERT INTO public.notifications (user_id, title, message, is_read)
  VALUES (
    v_requester,
    'Waitlist slot available!',
    'A slot has opened for "' || v_resource_title || '". Open My Bookings to accept the offer.',
    false
  );
END;
$function$;

-- 5B. accept_waitlist_offer
CREATE OR REPLACE FUNCTION public.accept_waitlist_offer(p_waitlist_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_user UUID := auth.uid();
  v_waitlist_user UUID;
  v_resource UUID;
  v_resource_title TEXT;
  v_owner UUID;
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
  v_notes TEXT;
  v_status TEXT;
  v_new_booking_id UUID;
  v_conflicts INTEGER;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Please sign in first.';
  END IF;

  SELECT w.user_id, w.resource_id, w.start_time, w.end_time, w.notes, w.status, r.owner_id, r.title
  INTO v_waitlist_user, v_resource, v_start, v_end, v_notes, v_status, v_owner, v_resource_title
  FROM public.booking_waitlist w
  JOIN public.resources r ON r.id = w.resource_id
  WHERE w.id = p_waitlist_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Waitlist entry not found.';
  END IF;

  IF v_user <> v_waitlist_user THEN
    RAISE EXCEPTION 'Only the waitlisted user can accept this offer.';
  END IF;

  IF v_status <> 'offered' THEN
    RAISE EXCEPTION 'This waitlist entry is not currently offered.';
  END IF;

  IF v_start <= now() OR v_end <= v_start THEN
    RAISE EXCEPTION 'The requested time slot has already passed.';
  END IF;

  -- Check conflict with existing approved bookings
  SELECT COUNT(*) INTO v_conflicts
  FROM public.bookings
  WHERE resource_id = v_resource
    AND status = 'approved'
    AND start_time < v_end
    AND end_time > v_start;

  IF v_conflicts > 0 THEN
    RAISE EXCEPTION 'Another approved booking now overlaps this time slot.';
  END IF;

  -- Create the booking request
  INSERT INTO public.bookings (
    resource_id,
    user_id,
    start_time,
    end_time,
    status,
    notes
  )
  VALUES (
    v_resource,
    v_user,
    v_start,
    v_end,
    'pending',
    COALESCE(v_notes, 'Converted from accepted waitlist offer')
  )
  RETURNING id INTO v_new_booking_id;

  -- Mark waitlist as fulfilled
  UPDATE public.booking_waitlist
  SET status = 'fulfilled'
  WHERE id = p_waitlist_id;

  -- Notify the resource owner
  INSERT INTO public.notifications (user_id, title, message, is_read)
  VALUES (
    v_owner,
    'Waitlist offer accepted',
    'A waitlisted borrower has accepted your offer for "' || v_resource_title || '". A pending booking is ready for review.',
    false
  );

  RETURN v_new_booking_id;
END;
$function$;

-- 5C. cancel_waitlist_request
CREATE OR REPLACE FUNCTION public.cancel_waitlist_request(p_waitlist_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_user UUID := auth.uid();
  v_requester UUID;
  v_owner UUID;
  v_status TEXT;
  v_role TEXT;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Please sign in first.';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE user_id = v_user;

  SELECT w.user_id, w.status, r.owner_id
  INTO v_requester, v_status, v_owner
  FROM public.booking_waitlist w
  JOIN public.resources r ON r.id = w.resource_id
  WHERE w.id = p_waitlist_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Waitlist request not found.';
  END IF;

  IF v_user <> v_requester AND v_user <> v_owner AND COALESCE(v_role, '') <> 'admin' THEN
    RAISE EXCEPTION 'You are not authorised to cancel this waitlist request.';
  END IF;

  IF v_status NOT IN ('waiting', 'offered') THEN
    RAISE EXCEPTION 'Only active or offered waitlist requests can be cancelled.';
  END IF;

  UPDATE public.booking_waitlist
  SET status = 'cancelled'
  WHERE id = p_waitlist_id;
END;
$function$;

-- Grant execute permissions to authenticated users on new RPCs
GRANT EXECUTE ON FUNCTION public.offer_waitlist_slot(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_waitlist_offer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_waitlist_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.guard_booking_status_transition() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_out_booking(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_booking(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_booking_eligibility(uuid, text, text) TO authenticated;
