import { useEffect, useMemo, useState } from "react";
import { supabase } from "./services/supabase";
import {
  Layers3, Eye, EyeOff, Mail, Lock, ArrowRight, ShieldCheck,
  LogOut, Sparkles, Package, CalendarCheck, Share2, Search,
  MapPin, X, RefreshCw, ArrowLeft, SlidersHorizontal, Clock,
  Info, CalendarDays, CheckCircle2, XCircle, Plus, Pencil,
  Trash2, ClipboardList, Bell, CheckCheck, UserRound, Save, GraduationCap, Users, Shield
} from "lucide-react";

function ResourceImage({ src, alt = "Campus resource", compact = false }) {
  const [failed, setFailed] = useState(false);
  const showFallback = !src || failed;
  return (
    <div className={compact ? "image-placeholder compact-image-placeholder" : "image-placeholder"}>
      {showFallback ? (
        <>
          <Package size={compact ? 30 : 42} />
          <span>ACCESSLOOP RESOURCE</span>
          <small>Image unavailable</small>
        </>
      ) : (
        <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />
      )}
    </div>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const [page, setPage] = useState("home");

  const [resources, setResources] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [categories, setCategories] = useState([]);

  const [resourceLoading, setResourceLoading] = useState(false);
  const [resourceError, setResourceError] = useState("");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [resourceSort, setResourceSort] = useState("newest");

  const [selectedResource, setSelectedResource] = useState(null);
  const [editingResource, setEditingResource] = useState(null);
  const [deletingResource, setDeletingResource] = useState(null);

  const emptyResourceForm = {
    title: "",
    description: "",
    location: "",
    category_id: "",
    image_url: "",
    availability_status: "available",
    usage_rules: "",
    eligibility_requirements: "",
    max_active_bookings: "2",
    max_booking_hours: "4"
  };

  const [resourceForm, setResourceForm] = useState(emptyResourceForm);
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [formMessage, setFormMessage] = useState("");

  const [bookings, setBookings] = useState([]);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingBusy, setBookingBusy] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingMessage, setBookingMessage] = useState("");

  const [bookingDate, setBookingDate] = useState("");
  const [bookingStart, setBookingStart] = useState("09:00");
  const [bookingEnd, setBookingEnd] = useState("10:00");
  const [bookingNotes, setBookingNotes] = useState("");
  const [lifecycleCondition, setLifecycleCondition] = useState({});
  const [incidentDrafts, setIncidentDrafts] = useState({});
  const [waitlistBusy, setWaitlistBusy] = useState(false);
  const [waitlistRequests, setWaitlistRequests] = useState([]);
  const [bookingActivity, setBookingActivity] = useState([]);
  const [incidentReports, setIncidentReports] = useState([]);
  const [eligibilityReviews, setEligibilityReviews] = useState([]);
  const [eligibilityEvidence, setEligibilityEvidence] = useState("");

  // NOTIFICATIONS
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");
  const [notificationOpen, setNotificationOpen] = useState(false);

  // USER PROFILE
  const emptyProfile = {
    full_name: "",
    department: "",
    year_of_study: "",
    bio: "",
    avatar_url: "",
    role: "student"
  };
  const [profile, setProfile] = useState(emptyProfile);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileMessage, setProfileMessage] = useState("");

  // ADMIN DASHBOARD
  const [adminResources, setAdminResources] = useState([]);
  const [adminUserCount, setAdminUserCount] = useState(0);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [adminFilter, setAdminFilter] = useState("pending");
  const [adminBusyId, setAdminBusyId] = useState(null);

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  // AUTHENTICATION
  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setError(error.message);
      setSession(data?.session ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // FETCH THE SIGNED-IN USER PROFILE
  const fetchProfile = async () => {
    if (!session?.user?.id) return;
    setProfileLoading(true);
    setProfileError("");
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, role, department, year_of_study, bio, avatar_url")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (error) {
      setProfileError(error.message);
    } else if (data) {
      setProfile({ ...emptyProfile, ...data, email: data.email || session.user.email || "" });
    } else {
      setProfile({ ...emptyProfile, email: session.user.email || "" });
    }
    setProfileLoading(false);
  };

  useEffect(() => {
    if (session?.user?.id) fetchProfile();
    else setProfile(emptyProfile);
  }, [session?.user?.id]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile((current) => ({ ...current, [name]: value }));
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileError("");
    setProfileMessage("");
    if (!profile.full_name.trim()) {
      setProfileError("Please enter your full name.");
      return;
    }
    setProfileSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name.trim(),
        department: profile.department.trim() || null,
        year_of_study: profile.year_of_study || null,
        bio: profile.bio.trim() || null,
        avatar_url: profile.avatar_url.trim() || null
      })
      .eq("user_id", session.user.id);
    if (error) setProfileError(error.message);
    else setProfileMessage("Your profile has been saved successfully.");
    setProfileSaving(false);
  };

  // ADMIN: LOAD ALL RESOURCES AND USER COUNT
  const fetchAdminData = async () => {
    if (profile.role !== "admin") return;
    setAdminLoading(true);
    setAdminError("");
    const [resourceResult, userResult] = await Promise.all([
      supabase.from("resources").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id", { count: "exact", head: true })
    ]);
    if (resourceResult.error) setAdminError(resourceResult.error.message);
    else setAdminResources(resourceResult.data || []);
    if (userResult.error) {
      setAdminError((current) => current ? `${current} | ${userResult.error.message}` : userResult.error.message);
    } else setAdminUserCount(userResult.count || 0);
    setAdminLoading(false);
  };

  useEffect(() => {
    if (session && profile.role === "admin" && page === "admin") fetchAdminData();
  }, [session, profile.role, page]);

  const updateResourceApproval = async (resource, status) => {
    setAdminBusyId(resource.id);
    setAdminError("");
    setAdminMessage("");
    const { error } = await supabase
      .from("resources")
      .update({ approval_status: status })
      .eq("id", resource.id);
    if (error) setAdminError(error.message);
    else {
      setAdminMessage(`“${resource.title}” was ${status}.`);
      await fetchAdminData();
    }
    setAdminBusyId(null);
  };

  // FETCH CATEGORIES
  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name");

    if (!error) setCategories(data || []);
  };

  useEffect(() => {
    if (session) fetchCategories();
  }, [session]);

  // FETCH APPROVED RESOURCES
  const fetchResources = async () => {
    setResourceLoading(true);
    setResourceError("");

    const { data, error } = await supabase
      .from("resources")
      .select("*")
      .eq("approval_status", "approved")
      .order("created_at", { ascending: false });

    if (error) {
      setResourceError(error.message);
    } else {
      setResources(data || []);
    }

    setResourceLoading(false);
  };

  // FETCH MY LISTINGS
  const fetchMyListings = async () => {
    setResourceLoading(true);
    setResourceError("");

    const { data, error } = await supabase
      .from("resources")
      .select("*")
      .eq("owner_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setResourceError(error.message);
    } else {
      setMyListings(data || []);
    }

    setResourceLoading(false);
  };

  useEffect(() => {
    if (!session) return;

    if (page === "discover") fetchResources();
    if (page === "mylistings") fetchMyListings();
  }, [session, page]);

  // FETCH BOOKINGS
  const fetchBookings = async () => {
    setBookingLoading(true);
    setBookingError("");

    const { data, error } = await supabase
      .from("bookings")
      .select("*, resources(id, title, location, owner_id)")
      .order("created_at", { ascending: false });

    if (error) {
      setBookingError(error.message);
    } else {
      const rows = data || [];
      setBookings(rows);

      const bookingIds = rows.map((item) => item.id);
      if (bookingIds.length) {
        const [activityResult, incidentResult, eligibilityResult] = await Promise.all([
          supabase.from("booking_activity")
            .select("id, booking_id, actor_id, action, details, created_at")
            .in("booking_id", bookingIds)
            .order("created_at", { ascending: false }),
          supabase.from("incident_reports")
            .select("id, booking_id, reported_by, incident_type, description, status, resolution_notes, resolved_at, created_at")
            .in("booking_id", bookingIds)
            .order("created_at", { ascending: false }),
          supabase.from("eligibility_reviews")
            .select("id, booking_id, user_id, evidence_notes, status, reviewed_by, review_notes, created_at, reviewed_at")
            .in("booking_id", bookingIds)
            .order("created_at", { ascending: false })
        ]);
        if (!activityResult.error) setBookingActivity(activityResult.data || []);
        if (!incidentResult.error) setIncidentReports(incidentResult.data || []);
        if (!eligibilityResult.error) setEligibilityReviews(eligibilityResult.data || []);
      } else {
        setBookingActivity([]);
        setIncidentReports([]);
        setEligibilityReviews([]);
      }

      const { data: waitlistData, error: waitlistError } = await supabase
        .from("booking_waitlist")
        .select("id, resource_id, user_id, start_time, end_time, notes, status, created_at, resources(id, title, location, owner_id)")
        .order("created_at", { ascending: true });
      if (!waitlistError) setWaitlistRequests(waitlistData || []);
    }

    setBookingLoading(false);
  };

  useEffect(() => {
    if (session && page === "bookings") fetchBookings();
  }, [session, page]);

  // NOTIFICATIONS: fetch, mark as read and listen for real-time changes
  const fetchNotifications = async () => {
    if (!session?.user?.id) return;

    setNotificationsLoading(true);
    setNotificationsError("");

    const { data, error } = await supabase
      .from("notifications")
      .select("id, user_id, title, message, is_read, created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      setNotificationsError(error.message);
    } else {
      setNotifications(data || []);
    }

    setNotificationsLoading(false);
  };

  useEffect(() => {
    if (!session?.user?.id) {
      setNotifications([]);
      return;
    }

    fetchNotifications();

    const channel = supabase
      .channel(`notifications-${session.user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${session.user.id}`
        },
        () => fetchNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  const markNotificationRead = async (notificationId) => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("user_id", session.user.id);

    if (error) {
      setNotificationsError(error.message);
      return;
    }

    setNotifications((current) =>
      current.map((item) =>
        item.id === notificationId ? { ...item, is_read: true } : item
      )
    );
  };

  const markAllNotificationsRead = async () => {
    if (unreadCount === 0) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", session.user.id)
      .eq("is_read", false);

    if (error) {
      setNotificationsError(error.message);
      return;
    }

    setNotifications((current) =>
      current.map((item) => ({ ...item, is_read: true }))
    );
  };

  const formatNotificationTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short"
    });
  };

  // AUTH FUNCTIONS
  const handleAuth = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    setBusy(true);

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password
        });

        if (error) throw error;

        setMessage(
          data.session
            ? "Account created successfully!"
            : "Account created. Please confirm your email."
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });

        if (error) throw error;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) setError(error.message);
    setPage("home");
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError("");
    setMessage("");
    setPassword("");
  };

  // RESOURCE FUNCTIONS
  const openShare = () => {
    setResourceForm(emptyResourceForm);
    setFormError("");
    setFormMessage("");
    setPage("share");
  };

  const handleResourceFormChange = (e) => {
    const { name, value } = e.target;

    setResourceForm((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const submitResource = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormMessage("");

    if (
      !resourceForm.title.trim() ||
      !resourceForm.location.trim()
    ) {
      setFormError("Please enter a resource name and location.");
      return;
    }

    setFormBusy(true);

    try {
      const { error } = await supabase
        .from("resources")
        .insert({
          owner_id: session.user.id,
          title: resourceForm.title.trim(),
          description: resourceForm.description.trim() || null,
          location: resourceForm.location.trim(),
          category_id: resourceForm.category_id || null,
          image_url: resourceForm.image_url.trim() || null,
          source: "student",
          approval_status: "pending",
          availability_status: resourceForm.availability_status,
          usage_rules: resourceForm.usage_rules.trim() || null,
          eligibility_requirements: resourceForm.eligibility_requirements.trim() || null,
          max_active_bookings: Math.max(1, Number(resourceForm.max_active_bookings) || 2),
          max_booking_hours: Math.max(1, Number(resourceForm.max_booking_hours) || 4)
        });

      if (error) throw error;

      setFormMessage(
        "Your resource has been submitted and is awaiting admin approval."
      );

      setResourceForm(emptyResourceForm);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormBusy(false);
    }
  };

  // EDIT LISTING
  const openEdit = (resource) => {
    if (resource.approval_status === "rejected") {
      alert("Rejected listings cannot be edited.");
      return;
    }

    setEditingResource(resource);

    setResourceForm({
      title: resource.title || "",
      description: resource.description || "",
      location: resource.location || "",
      category_id: resource.category_id || "",
      image_url: resource.image_url || "",
      availability_status: resource.availability_status || "available",
      usage_rules: resource.usage_rules || "",
      eligibility_requirements: resource.eligibility_requirements || "",
      max_active_bookings: String(resource.max_active_bookings ?? 2),
      max_booking_hours: String(resource.max_booking_hours ?? 4)
    });

    setFormError("");
    setFormMessage("");
  };

  const saveEditedResource = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!resourceForm.title.trim() || !resourceForm.location.trim()) {
      setFormError("Resource name and location are required.");
      return;
    }

    setFormBusy(true);

    try {
      const { error } = await supabase
        .from("resources")
        .update({
          title: resourceForm.title.trim(),
          description: resourceForm.description.trim() || null,
          location: resourceForm.location.trim(),
          category_id: resourceForm.category_id || null,
          image_url: resourceForm.image_url.trim() || null,
          availability_status: resourceForm.availability_status,
          usage_rules: resourceForm.usage_rules.trim() || null,
          eligibility_requirements: resourceForm.eligibility_requirements.trim() || null,
          max_active_bookings: Math.max(1, Number(resourceForm.max_active_bookings) || 2),
          max_booking_hours: Math.max(1, Number(resourceForm.max_booking_hours) || 4),
          approval_status: "pending"
        })
        .eq("id", editingResource.id)
        .eq("owner_id", session.user.id);

      if (error) throw error;

      setEditingResource(null);
      setResourceForm(emptyResourceForm);
      fetchMyListings();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormBusy(false);
    }
  };

  // DELETE LISTING
  const deleteResource = async () => {
    if (!deletingResource) return;

    setFormBusy(true);
    setFormError("");

    const { error } = await supabase
      .from("resources")
      .delete()
      .eq("id", deletingResource.id)
      .eq("owner_id", session.user.id);

    if (error) {
      setFormError(error.message);
    } else {
      setDeletingResource(null);
      fetchMyListings();
    }

    setFormBusy(false);
  };

  // BOOKING FUNCTIONS
  const todayLocal = () => {
    const now = new Date();
    const local = new Date(
      now.getTime() - now.getTimezoneOffset() * 60000
    );

    return local.toISOString().slice(0, 10);
  };

  const validateBooking = () => {
    if (!bookingDate || !bookingStart || !bookingEnd) {
      return "Choose a date, start time and end time.";
    }

    if (bookingDate < todayLocal()) {
      return "You cannot book a past date.";
    }

    const date = new Date(`${bookingDate}T00:00:00`);

    if (date.getDay() === 0) {
      return "Bookings are available Monday to Saturday only.";
    }

    if (
      bookingStart < "09:00" ||
      bookingStart >= "15:00" ||
      bookingEnd <= "09:00" ||
      bookingEnd > "15:00"
    ) {
      return "Choose a time between 9 AM and 3 PM.";
    }

    if (bookingEnd <= bookingStart) {
      return "End time must be later than start time.";
    }
    const durationHours = (new Date(`2000-01-01T${bookingEnd}:00`) - new Date(`2000-01-01T${bookingStart}:00`)) / 3600000;
    if (selectedResource?.max_booking_hours && durationHours > Number(selectedResource.max_booking_hours)) {
      return `This resource allows bookings up to ${selectedResource.max_booking_hours} hour(s).`;
    }

    const start = new Date(`${bookingDate}T${bookingStart}:00`);

    if (start.getTime() <= Date.now()) {
      return "Choose a future start time.";
    }

    return "";
  };

  const submitBooking = async (e) => {
    e.preventDefault();
    setBookingError("");
    setBookingMessage("");

    const validation = validateBooking();

    if (validation) {
      setBookingError(validation);
      return;
    }

    if (!selectedResource) return;
    if (selectedResource.eligibility_requirements?.trim() && !eligibilityEvidence.trim()) {
      setBookingError("Please provide the required eligibility information.");
      return;
    }

    setBookingBusy(true);

    try {
      const { data: createdBooking, error } = await supabase
        .from("bookings")
        .insert({
          resource_id: selectedResource.id,
          user_id: session.user.id,
          start_time: new Date(
            `${bookingDate}T${bookingStart}:00`
          ).toISOString(),
          end_time: new Date(
            `${bookingDate}T${bookingEnd}:00`
          ).toISOString(),
          status: "pending",
          notes: bookingNotes.trim() || null
        })
        .select("id")
        .single();

      if (error) throw error;

      if (selectedResource.eligibility_requirements?.trim()) {
        if (!eligibilityEvidence.trim()) throw new Error("Please provide eligibility information for this resource.");
        const { error: eligibilityError } = await supabase.rpc("submit_booking_eligibility", {
          p_booking_id: createdBooking.id,
          p_evidence_notes: eligibilityEvidence.trim()
        });
        if (eligibilityError) throw eligibilityError;
      }

      setBookingMessage("Booking request sent successfully!");
      setBookingDate("");
      setBookingStart("09:00");
      setBookingEnd("10:00");
      setBookingNotes("");
      setEligibilityEvidence("");
      await fetchBookings();
      await fetchNotifications();
    } catch (err) {
      setBookingError(err.message);
    } finally {
      setBookingBusy(false);
    }
  };

  const updateBookingStatus = async (booking, nextStatus) => {
    setBookingError("");
    setBookingMessage("");
    setBookingBusy(true);

    try {
      const { error } = await supabase.rpc("respond_to_booking", {
        p_booking_id: booking.id,
        p_status: nextStatus
      });
      if (error) throw error;

      setBookingMessage(`Booking ${nextStatus}.`);
      await fetchBookings();
      await fetchNotifications();
    } catch (err) {
      setBookingError(err.message || "Could not update this booking.");
    } finally {
      setBookingBusy(false);
    }
  };

  // RESOURCE LIFECYCLE, WAITLIST AND INCIDENT ACTIONS
  const joinWaitlist = async (resource) => {
    setWaitlistBusy(true); setBookingError(""); setBookingMessage("");
    const { error } = await supabase.rpc("join_resource_waitlist", {
      p_resource_id: resource.id,
      p_start_time: new Date(`${bookingDate}T${bookingStart}:00`).toISOString(),
      p_end_time: new Date(`${bookingDate}T${bookingEnd}:00`).toISOString(),
      p_notes: bookingNotes.trim() || null
    });
    if (error) setBookingError(error.message);
    else setBookingMessage("You have joined the waitlist for this time slot.");
    setWaitlistBusy(false);
  };

  const manageWaitlist = async (request, action) => {
    setWaitlistBusy(true);
    setBookingError("");
    setBookingMessage("");
    try {
      const rpcName = action === "offer" ? "offer_waitlist_slot"
        : action === "accept" ? "accept_waitlist_offer"
        : "cancel_waitlist_request";
      const { error } = await supabase.rpc(rpcName, { p_waitlist_id: request.id });
      if (error) throw error;
      setBookingMessage(
        action === "offer" ? "A waitlist offer has been sent."
        : action === "accept" ? "Waitlist offer accepted. A booking request has been created."
        : "Waitlist request cancelled."
      );
      await fetchBookings();
      await fetchNotifications();
    } catch (err) {
      setBookingError(err.message || "Could not update the waitlist request.");
    } finally {
      setWaitlistBusy(false);
    }
  };

  const reviewEligibility = async (reviewId, decision) => {
    const notes = window.prompt(decision === "verified" ? "Add verification notes (optional):" : "Explain why eligibility was not verified:");
    if (decision === "rejected" && !notes?.trim()) return;
    setBookingBusy(true);
    const { error } = await supabase.rpc("review_booking_eligibility", {
      p_review_id: reviewId,
      p_status: decision,
      p_review_notes: notes?.trim() || null
    });
    if (error) setBookingError(error.message);
    else {
      setBookingMessage(decision === "verified" ? "Eligibility verified." : "Eligibility not verified.");
      await fetchBookings();
      await fetchNotifications();
    }
    setBookingBusy(false);
  };

  const runBookingLifecycle = async (booking, action) => {
    const draft = lifecycleCondition[booking.id] || {};
    const condition = action === "check_in" ? draft.initial : draft.returning;
    if (!condition?.trim()) { setBookingError("Please describe the resource condition before continuing."); return; }
    setBookingBusy(true); setBookingError(""); setBookingMessage("");
    const { error } = await supabase.rpc(action === "check_in" ? "check_in_booking" : "check_out_booking", {
      p_booking_id: booking.id,
      [action === "check_in" ? "p_initial_condition" : "p_return_condition"]: condition.trim(),
      p_notes: draft.notes?.trim() || null
    });
    if (error) setBookingError(error.message);
    else { setBookingMessage(action === "check_in" ? "Check-in recorded." : "Return condition recorded."); await fetchBookings(); }
    setBookingBusy(false);
  };

  const reportIncident = async (booking) => {
    const draft = incidentDrafts[booking.id] || {};
    if (!draft.description?.trim()) { setBookingError("Describe the issue before submitting the report."); return; }
    setBookingBusy(true); setBookingError(""); setBookingMessage("");
    const { error } = await supabase.from("incident_reports").insert({
      booking_id: booking.id, reported_by: session.user.id,
      incident_type: draft.type || "other", description: draft.description.trim(), status: "open"
    });
    if (error) setBookingError(error.message);
    else { setBookingMessage("Incident report submitted for review."); setIncidentDrafts(prev => ({ ...prev, [booking.id]: { type: "other", description: "" } })); }
    setBookingBusy(false);
  };

  const resolveIncident = async (incidentId, status = "resolved") => {
    const notes = window.prompt("Add resolution notes (required):");
    if (!notes?.trim()) return;
    const { error } = await supabase.rpc("resolve_incident", {
      p_incident_id: incidentId, p_resolution_notes: notes.trim(), p_status: status
    });
    if (error) setBookingError(error.message);
    else { setBookingMessage(`Incident ${status}.`); fetchBookings(); }
  };

  // SEARCH, FILTER, CATEGORY AND SORT
  const filteredResources = useMemo(() => {
    const filtered = resources.filter((resource) => {
      const categoryName = categories.find((category) => category.id === resource.category_id)?.name || "";
      const text = (
        (resource.title || "") + " " +
        (resource.description || "") + " " +
        (resource.location || "") + " " + categoryName
      ).toLowerCase();
      const matchesSearch = text.includes(search.toLowerCase());
      const status = (resource.availability_status || "").toLowerCase();
      const matchesFilter = filter === "all" ||
        (filter === "available" && status === "available") ||
        (filter === "unavailable" && status !== "available");
      const matchesCategory = categoryFilter === "all" || resource.category_id === categoryFilter;
      return matchesSearch && matchesFilter && matchesCategory;
    });

    return filtered.sort((a, b) => {
      if (resourceSort === "title") return (a.title || "").localeCompare(b.title || "");
      if (resourceSort === "oldest") return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
  }, [resources, categories, search, filter, categoryFilter, resourceSort]);

  const isAvailable = (status) =>
    (status || "").toLowerCase() === "available";

  // LOADING
  if (loading) {
    return (
      <>
        <style>{styles}</style>
        <div className="loading-screen">
          <Layers3 size={40} />
          <p>Preparing AccessLoop...</p>
        </div>
      </>
    );
  }

  // LOGIN / SIGNUP
  if (!session) {
    return (
      <>
        <style>{styles}</style>

        <div className="auth-page">
          <nav className="navbar">
            <div className="brand">
              <Layers3 size={27} />
              <span>Access<span className="teal">Loop</span></span>
            </div>
            <span className="nav-label">CAMPUS RESOURCE NETWORK</span>
          </nav>

          <main className="auth-layout">
            <section className="hero-section">
              <div className="eyebrow">
                <Sparkles size={15} /> THE CAMPUS SHARING REVOLUTION
              </div>

              <h1>
                Your campus has more.
                <br />
                <span>Discover it.</span>
              </h1>

              <p className="hero-description">
                Find, reserve and share underused campus equipment
                and spaces. Everything your campus community needs,
                connected in one place.
              </p>

              <div className="feature-list">
                <div><ShieldCheck /> Trusted campus community</div>
                <div><Package /> Discover useful resources</div>
                <div><CalendarCheck /> Simple reservation requests</div>
              </div>

              <div className="hero-bottom">
                BUILT FOR STUDENTS. POWERED BY COMMUNITY.
              </div>
            </section>

            <section className="form-section">
              <div className="auth-card">
                <div className="form-icon"><Layers3 size={27} /></div>

                <h2>{mode === "login" ? "Welcome back" : "Join AccessLoop"}</h2>

                <p className="form-subtitle">
                  {mode === "login"
                    ? "Sign in to continue to your campus network."
                    : "Create your account and explore your campus."}
                </p>

                <div className="auth-tabs">
                  <button
                    className={mode === "login" ? "active-tab" : ""}
                    onClick={() => switchMode("login")}
                    type="button"
                  >
                    Sign In
                  </button>

                  <button
                    className={mode === "signup" ? "active-tab" : ""}
                    onClick={() => switchMode("signup")}
                    type="button"
                  >
                    Create Account
                  </button>
                </div>

                <form onSubmit={handleAuth}>
                  <label>Email address</label>
                  <div className="input-wrap">
                    <Mail size={18} />
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <label>Password</label>
                  <div className="input-wrap">
                    <Lock size={18} />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimum 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      className="eye-button"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {error && <div className="error-box">{error}</div>}
                  {message && <div className="success-box">{message}</div>}

                  <button className="submit-button" disabled={busy}>
                    {busy ? "Please wait..." :
                      mode === "login" ? "Sign In" : "Create Account"}
                    {!busy && <ArrowRight size={19} />}
                  </button>
                </form>

                <div className="secure-note">
                  <ShieldCheck size={16} />
                  Secure authentication powered by Supabase
                </div>
              </div>
            </section>
          </main>

          <footer className="footer">
            © 2026 AccessLoop · Making campus resources accessible.
          </footer>
        </div>
      </>
    );
  }

  // MAIN APP
  return (
    <>
      <style>{styles}</style>

      <div className="app-shell">
        <nav className="navbar">
          <button className="brand brand-button" onClick={() => setPage("home")}>
            <Layers3 size={27} />
            <span>Access<span className="teal">Loop</span></span>
          </button>

          <div className="nav-right">
            <div className="notification-wrap">
              <button
                className={`notification-bell ${notificationOpen ? "active" : ""}`}
                type="button"
                aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
                aria-expanded={notificationOpen}
                onClick={() => {
                  setNotificationOpen((open) => !open);
                  if (!notificationOpen) fetchNotifications();
                }}
              >
                <Bell size={19} />
                {unreadCount > 0 && (
                  <span className="notification-count">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {notificationOpen && (
                <section className="notification-panel">
                  <div className="notification-panel-header">
                    <div>
                      <h3>Notifications</h3>
                      <span>{unreadCount} unread</span>
                    </div>
                    <button
                      type="button"
                      className="mark-all-button"
                      onClick={markAllNotificationsRead}
                      disabled={unreadCount === 0}
                    >
                      <CheckCheck size={15} /> Mark all read
                    </button>
                  </div>

                  {notificationsError && (
                    <div className="notification-error">{notificationsError}</div>
                  )}

                  {notificationsLoading ? (
                    <div className="notification-empty">Loading notifications...</div>
                  ) : notifications.length === 0 ? (
                    <div className="notification-empty">
                      <Bell size={25} />
                      <strong>You're all caught up</strong>
                      <span>New booking updates will appear here.</span>
                    </div>
                  ) : (
                    <div className="notification-list">
                      {notifications.map((item) => (
                        <article
                          key={item.id}
                          className={`notification-item ${item.is_read ? "read" : "unread"}`}
                        >
                          <div className="notification-item-top">
                            <strong>{item.title}</strong>
                            {!item.is_read && <span className="unread-dot" />}
                          </div>
                          <p>{item.message}</p>
                          <div className="notification-item-bottom">
                            <time>{formatNotificationTime(item.created_at)}</time>
                            {!item.is_read && (
                              <button
                                type="button"
                                onClick={() => markNotificationRead(item.id)}
                              >
                                Mark as read
                              </button>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </div>

            <button
              className={`profile-nav-button ${page === "profile" ? "active" : ""}`}
              onClick={() => {
                setPage("profile");
                setNotificationOpen(false);
              }}
              type="button"
            >
              <UserRound size={17} /> Profile
            </button>
            {profile.role === "admin" && (
              <button
                className={`profile-nav-button ${page === "admin" ? "active" : ""}`}
                onClick={() => {
                  setPage("admin");
                  setNotificationOpen(false);
                }}
                type="button"
              >
                <Shield size={17} /> Admin
              </button>
            )}
            <span className="user-email">{session.user.email}</span>
            <button className="logout-button" onClick={handleLogout}>
              <LogOut size={17} /> Sign Out
            </button>
          </div>
        </nav>

        {/* DASHBOARD */}
        {page === "home" && (
          <main className="dashboard-content">
            <div className="welcome-tag">
              <Sparkles size={15} /> YOUR CAMPUS, CONNECTED
            </div>

            <h1>Welcome to <span className="teal">AccessLoop.</span></h1>

            <p className="dashboard-subtitle">
              Discover resources. Make connections. Share more.
            </p>

            <div className="dashboard-grid">
              <button className="dashboard-card" onClick={() => setPage("discover")}>
                <Package size={31} />
                <h3>Discover</h3>
                <p>Explore equipment and spaces available on campus.</p>
                <span className="card-link">Explore resources <ArrowRight size={16} /></span>
              </button>

              <button className="dashboard-card" onClick={openShare}>
                <Share2 size={31} />
                <h3>Share</h3>
                <p>List your unused equipment and make it useful to others.</p>
                <span className="card-link">Share a resource <ArrowRight size={16} /></span>
              </button>

              <button className="dashboard-card" onClick={() => setPage("mylistings")}>
                <ClipboardList size={31} />
                <h3>My Listings</h3>
                <p>View, edit and manage the resources you have shared.</p>
                <span className="card-link">Manage listings <ArrowRight size={16} /></span>
              </button>

              <button className="dashboard-card" onClick={() => setPage("bookings")}>
                <CalendarCheck size={31} />
                <h3>My Bookings</h3>
                <p>Track requests and manage reservations for your resources.</p>
                <span className="card-link">View bookings <ArrowRight size={16} /></span>
              </button>
 
              <button className="dashboard-card" onClick={() => setPage("profile")}>
                <UserRound size={31} />
                <h3>My Profile</h3>
                <p>Manage your campus identity and personal details.</p>
                <span className="card-link">View profile <ArrowRight size={16} /></span>
              </button>

              {profile.role === "admin" && (
                <button className="dashboard-card admin-dashboard-card" onClick={() => setPage("admin")}>
                  <Shield size={31} />
                  <h3>Admin Dashboard</h3>
                  <p>Review submissions, manage resources and monitor AccessLoop.</p>
                  <span className="card-link">Open admin centre <ArrowRight size={16} /></span>
                </button>
              )}
            </div>

            <div className="coming-soon">
              <Sparkles size={19} />
              Your campus resources, connected in one place.
            </div>
          </main>
        )}

        {/* DISCOVER */}
        {page === "discover" && (
          <main className="marketplace">
            <button className="back-button" onClick={() => setPage("home")}>
              <ArrowLeft size={17} /> Back to Home
            </button>

            <div className="market-heading">
              <div>
                <div className="welcome-tag">
                  <Sparkles size={15} /> CAMPUS MARKETPLACE
                </div>
                <h1>Discover <span className="teal">Resources.</span></h1>
                <p className="dashboard-subtitle">
                  Find equipment and spaces your campus has to offer.
                </p>
              </div>

              <div className="resource-count">
                <Package size={21} />
                {resources.length} resources
              </div>
            </div>

            <div className="search-panel">
              <div className="search-box">
                <Search size={20} />
                <input
                  placeholder="Search equipment, spaces or locations..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button onClick={() => setSearch("")} className="clear-search">
                    <X size={17} />
                  </button>
                )}
              </div>

              <div className="filter-row">
                <span className="filter-label">
                  <SlidersHorizontal size={16} /> Filter:
                </span>

                {["all", "available", "unavailable"].map((item) => (
                  <button
                    key={item}
                    className={`filter-chip ${filter === item ? "selected" : ""}`}
                    onClick={() => setFilter(item)}
                  >
                    {item === "all" ? "All resources" :
                      item === "available" ? "Available" : "Unavailable"}
                  </button>
                ))}

                <select
                  className="market-select"
                  aria-label="Filter by category"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="all">All categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
                <select
                  className="market-select"
                  aria-label="Sort resources"
                  value={resourceSort}
                  onChange={(e) => setResourceSort(e.target.value)}
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="title">Name A–Z</option>
                </select>
                <button className="refresh-button" onClick={fetchResources}>
                  <RefreshCw size={16} /> Refresh
                </button>
              </div>
            </div>

            {resourceLoading && <div className="state-message">Loading resources...</div>}

            {resourceError && <div className="error-box">{resourceError}</div>}

            {!resourceLoading && !resourceError && filteredResources.length === 0 && (
              <div className="empty-panel">
                No matching resources found.
              </div>
            )}

            <div className="resource-grid">
              {filteredResources.map((resource) => (
                <article className="resource-card" key={resource.id}>
                  <div className="resource-image">
                    <ResourceImage src={resource.image_url} alt={resource.title} />

                    <span className={`status-badge ${
                      isAvailable(resource.availability_status)
                        ? "available" : "unavailable"
                    }`}>
                      {resource.availability_status}
                    </span>
                  </div>

                  <div className="resource-info">
                    <h3>{resource.title}</h3>
                    <p className="resource-description">
                      {resource.description || "No description provided."}
                    </p>

                    <div className="resource-location">
                      <MapPin size={15} /> {resource.location}
                    </div>
                    <p className="booking-hint">Up to {resource.max_booking_hours || 4}h · {resource.eligibility_requirements ? "Eligibility applies" : "Open eligibility"}</p>

                    <button
                      className="details-button"
                      onClick={() => {
                        setSelectedResource(resource);
                        setBookingError("");
                        setBookingMessage("");
                      }}
                    >
                      View details <ArrowRight size={16} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </main>
        )}

        {/* SHARE */}
        {page === "share" && (
          <main className="marketplace">
            <button className="back-button" onClick={() => setPage("home")}>
              <ArrowLeft size={17} /> Back to Home
            </button>

            <div className="welcome-tag">
              <Share2 size={15} /> COMMUNITY CONTRIBUTION
            </div>

            <h1>Share a <span className="teal">Resource.</span></h1>

            <p className="dashboard-subtitle">
              Help other students access equipment and spaces you can share.
            </p>

            <form className="resource-form" onSubmit={submitResource}>
              <h2>Resource details</h2>

              <label>Resource name *</label>
              <input
                name="title"
                value={resourceForm.title}
                onChange={handleResourceFormChange}
                placeholder="e.g. Arduino Uno Starter Kit"
                required
              />

              <label>Description</label>
              <textarea
                name="description"
                rows="4"
                value={resourceForm.description}
                onChange={handleResourceFormChange}
                placeholder="Describe the resource and how students can use it..."
              />

              <label>Category</label>
              <select
                name="category_id"
                value={resourceForm.category_id}
                onChange={handleResourceFormChange}
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              <label>Location *</label>
              <input
                name="location"
                value={resourceForm.location}
                onChange={handleResourceFormChange}
                placeholder="e.g. CSE Department, Lab 2"
                required
              />

              <label>Image URL (optional)</label>
              <input
                name="image_url"
                type="url"
                value={resourceForm.image_url}
                onChange={handleResourceFormChange}
                placeholder="https://example.com/image.jpg"
              />

              <label>Availability</label>
              <select
                name="availability_status"
                value={resourceForm.availability_status}
                onChange={handleResourceFormChange}
              >
                <option value="available">Available</option>
                <option value="unavailable">Unavailable</option>
              </select>

              <label>Usage rules</label>
              <textarea name="usage_rules" rows="2" value={resourceForm.usage_rules} onChange={handleResourceFormChange} placeholder="Care instructions, supervision, return expectations..." />
              <label>Eligibility requirements</label>
              <textarea name="eligibility_requirements" rows="2" value={resourceForm.eligibility_requirements} onChange={handleResourceFormChange} placeholder="e.g. GCET students, faculty approval required..." />
              <div className="time-fields">
                <div><label>Max active bookings per user</label><input type="number" min="1" max="20" name="max_active_bookings" value={resourceForm.max_active_bookings} onChange={handleResourceFormChange} /></div>
                <div><label>Maximum booking hours</label><input type="number" min="1" max="24" name="max_booking_hours" value={resourceForm.max_booking_hours} onChange={handleResourceFormChange} /></div>
              </div>

              <div className="approval-note">
                <ShieldCheck size={18} />
                Your listing will be reviewed by an admin before appearing in Discover.
              </div>

              {formError && <div className="error-box">{formError}</div>}
              {formMessage && <div className="success-box">{formMessage}</div>}

              <button className="submit-button" disabled={formBusy}>
                {formBusy ? "Submitting..." : "Submit resource for approval"}
                <ArrowRight size={17} />
              </button>
            </form>
          </main>
        )}

        {/* MY LISTINGS */}
        {page === "mylistings" && (
          <main className="marketplace">
            <button className="back-button" onClick={() => setPage("home")}>
              <ArrowLeft size={17} /> Back to Home
            </button>

            <div className="market-heading">
              <div>
                <div className="welcome-tag">
                  <ClipboardList size={15} /> YOUR CONTRIBUTIONS
                </div>
                <h1>My <span className="teal">Listings.</span></h1>
                <p className="dashboard-subtitle">
                  Manage resources you have shared with your campus.
                </p>
              </div>

              <button className="refresh-button" onClick={fetchMyListings}>
                <RefreshCw size={16} /> Refresh
              </button>
            </div>

            <button className="details-button share-another" onClick={openShare}>
              <Plus size={17} /> Share another resource
            </button>

            {resourceLoading && (
              <div className="state-message">Loading your listings...</div>
            )}

            {resourceError && <div className="error-box">{resourceError}</div>}

            {!resourceLoading && !resourceError && myListings.length === 0 && (
              <div className="empty-panel">
                You haven't shared any resources yet.
                <button className="inline-link" onClick={openShare}>
                  Share your first resource
                </button>
              </div>
            )}

            <div className="resource-grid">
              {myListings.map((resource) => (
                <article className="resource-card" key={resource.id}>
                  <div className="resource-image">
                    <ResourceImage src={resource.image_url} alt={resource.title} />

                    <span className={`status-badge ${
                      resource.approval_status === "approved"
                        ? "available"
                        : resource.approval_status === "rejected"
                          ? "unavailable" : "pending"
                    }`}>
                      {resource.approval_status || "pending"}
                    </span>
                  </div>

                  <div className="resource-info">
                    <h3>{resource.title}</h3>

                    <p className="resource-description">
                      {resource.description || "No description provided."}
                    </p>

                    <div className="resource-location">
                      <MapPin size={15} /> {resource.location}
                    </div>

                    <p className="listing-availability">
                      Availability: {resource.availability_status}
                    </p>

                    <div className="listing-actions">
                      <button
                        className="edit-button"
                        disabled={resource.approval_status === "rejected"}
                        onClick={() => openEdit(resource)}
                      >
                        <Pencil size={15} /> Edit
                      </button>

                      <button
                        className="delete-button"
                        onClick={() => setDeletingResource(resource)}
                      >
                        <Trash2 size={15} /> Delete
                      </button>
                    </div>

                    {resource.approval_status === "rejected" && (
                      <p className="rejected-note">
                        This listing was rejected and cannot be edited.
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </main>
        )}

        {/* BOOKINGS */}
        {page === "bookings" && (
          <main className="marketplace">
            <button className="back-button" onClick={() => setPage("home")}>
              <ArrowLeft size={17} /> Back to Home
            </button>

            <div className="market-heading">
              <div>
                <div className="welcome-tag">
                  <CalendarDays size={15} /> RESERVATION CENTRE
                </div>
                <h1>My <span className="teal">Bookings.</span></h1>
                <p className="dashboard-subtitle">
                  Track your requests and manage requests for your resources.
                </p>
              </div>

              <button className="refresh-button" onClick={fetchBookings}>
                <RefreshCw size={16} /> Refresh
              </button>
            </div>

            {bookingError && <div className="error-box">{bookingError}</div>}
            {bookingMessage && <div className="success-box">{bookingMessage}</div>}

            {bookingLoading ? (
              <div className="state-message">Loading bookings...</div>
            ) : (
              <>
                <div className="results-heading">
                  <h2>Requests I made</h2>
                  <span>
                    {bookings.filter(b => b.user_id === session.user.id).length} requests
                  </span>
                </div>

                {bookings.filter(b => b.user_id === session.user.id).length === 0 ? (
                  <div className="empty-panel">
                    You haven't requested any resources yet.
                  </div>
                ) : (
                  bookings
                    .filter(b => b.user_id === session.user.id)
                    .map(booking => (
                      <article className="booking-card" key={booking.id}>
                        <div>
                          <h3>{booking.resources?.title || "Campus resource"}</h3>
                          <p>{booking.resources?.location || "Location unavailable"}</p>
                          <span>
                            {new Date(booking.start_time).toLocaleString()} –{" "}
                            {new Date(booking.end_time).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </span>
                          {booking.notes && (
                            <p className="booking-notes">“{booking.notes}”</p>
                          )}
                          {booking.status === "approved" && (
                            <div className="resource-form compact-form" style={{ marginTop: 14 }}>
                              {!booking.check_in_at ? (
                                <>
                                  <label>Condition before use</label>
                                  <textarea rows="2" value={lifecycleCondition[booking.id]?.initial || ""} onChange={e => setLifecycleCondition(prev => ({ ...prev, [booking.id]: { ...prev[booking.id], initial: e.target.value } }))} placeholder="Describe existing condition, visible damage or missing parts..." />
                                  <button type="button" className="approve-button" disabled={bookingBusy} onClick={() => runBookingLifecycle(booking, "check_in")}>Record check-in</button>
                                </>
                              ) : !booking.check_out_at ? (
                                <>
                                  <p className="booking-hint">Checked in: {new Date(booking.check_in_at).toLocaleString()}</p>
                                  <label>Condition on return</label>
                                  <textarea rows="2" value={lifecycleCondition[booking.id]?.returning || ""} onChange={e => setLifecycleCondition(prev => ({ ...prev, [booking.id]: { ...prev[booking.id], returning: e.target.value } }))} placeholder="Describe the condition when returning..." />
                                  <button type="button" className="approve-button" disabled={bookingBusy} onClick={() => runBookingLifecycle(booking, "check_out")}>Record return</button>
                                </>
                              ) : <p className="booking-hint">Returned: {new Date(booking.check_out_at).toLocaleString()}</p>}
                              <label>Report a delay, damage or issue</label>
                              <select value={incidentDrafts[booking.id]?.type || "other"} onChange={e => setIncidentDrafts(prev => ({ ...prev, [booking.id]: { ...prev[booking.id], type: e.target.value } }))}>
                                <option value="other">Other issue</option><option value="damage">Damage</option><option value="delay">Late return</option><option value="conflict">Conflict</option><option value="safety">Safety concern</option>
                              </select>
                              <textarea rows="2" value={incidentDrafts[booking.id]?.description || ""} onChange={e => setIncidentDrafts(prev => ({ ...prev, [booking.id]: { ...prev[booking.id], description: e.target.value } }))} placeholder="Explain the issue..." />
                              <button type="button" className="refresh-button" disabled={bookingBusy} onClick={() => reportIncident(booking)}>Submit incident report</button>
                            </div>
                          )}
                        </div>

                        <span className={`booking-status ${booking.status}`}>
                          {booking.status}
                        </span>
                        {eligibilityReviews.filter(item => item.booking_id === booking.id).map(review => (
                          <div key={review.id} style={{ width: "100%", marginTop: 10 }}>
                            <strong>Eligibility: {review.status}</strong>
                            {review.review_notes && <p className="booking-hint">Review notes: {review.review_notes}</p>}
                          </div>
                        ))}
                        <div style={{ width: "100%", marginTop: 10 }}>
                          <strong>Transaction history</strong>
                          {bookingActivity.filter(item => item.booking_id === booking.id).map(item => (
                            <p className="booking-hint" key={item.id}>
                              {new Date(item.created_at).toLocaleString()} · {item.action.replaceAll("_", " ")}
                              {item.details ? ` — ${item.details}` : ""}
                            </p>
                          ))}
                          {eligibilityReviews.filter(item => item.booking_id === booking.id).map(review => (
                            <div key={review.id} style={{ marginTop: 12, padding: 12, border: "1px solid var(--border, #dbe4e8)", borderRadius: 12 }}>
                              <strong>Eligibility review · {review.status}</strong>
                              <p>{review.evidence_notes}</p>
                              {review.review_notes && <p className="booking-hint">Review notes: {review.review_notes}</p>}
                              {review.status === "pending" && (
                                <div className="booking-actions">
                                  <button type="button" className="approve-button" disabled={bookingBusy} onClick={() => reviewEligibility(review.id, "verified")}>Verify eligibility</button>
                                  <button type="button" className="reject-button" disabled={bookingBusy} onClick={() => reviewEligibility(review.id, "rejected")}>Reject eligibility</button>
                                </div>
                              )}
                            </div>
                          ))}
                          {incidentReports.filter(item => item.booking_id === booking.id).map(incident => (
                            <p className="booking-hint" key={incident.id}>
                              Incident: {incident.incident_type} · {incident.status}
                              {incident.resolution_notes ? ` — ${incident.resolution_notes}` : ""}
                            </p>
                          ))}
                        </div>
                        {booking.status === "pending" && (
                          <button type="button" className="reject-button" onClick={() => updateBookingStatus(booking, "cancelled")}>Cancel request</button>
                        )}
                      </article>
                    ))
                )}

                <section className="waitlist-panel" style={{ margin: "24px 0", padding: 20, border: "1px solid var(--border, #dbe4e8)", borderRadius: 18, background: "var(--card, #fff)" }}>
                  <div className="results-heading">
                    <h2>Resource waitlists</h2>
                    <span>{waitlistRequests.length} entries</span>
                  </div>
                  {waitlistRequests.filter(item => item.user_id === session.user.id || item.resources?.owner_id === session.user.id || profile.role === "admin").length === 0 ? (
                    <p className="booking-hint">No waitlist requests yet. If a resource is unavailable for your preferred slot, you can join its waitlist from Discover.</p>
                  ) : waitlistRequests
                    .filter(item => item.user_id === session.user.id || item.resources?.owner_id === session.user.id || profile.role === "admin")
                    .map(item => {
                      const isRequester = item.user_id === session.user.id;
                      const isManager = profile.role === "admin" || item.resources?.owner_id === session.user.id;
                      return (
                        <article key={item.id} className="booking-card" style={{ marginTop: 12 }}>
                          <div>
                            <h3>{item.resources?.title || "Campus resource"}</h3>
                            <p>{item.resources?.location || "Location unavailable"}</p>
                            <p>{new Date(item.start_time).toLocaleString()} – {new Date(item.end_time).toLocaleString()}</p>
                            {item.notes && <p className="booking-notes">{item.notes}</p>}
                            <span className={`booking-status ${item.status}`}>{item.status}</span>
                          </div>
                          <div className="booking-actions">
                            {isManager && item.status === "waiting" && (
                              <button type="button" className="approve-button" disabled={waitlistBusy} onClick={() => manageWaitlist(item, "offer")}>Offer this slot</button>
                            )}
                            {isRequester && item.status === "offered" && (
                              <button type="button" className="approve-button" disabled={waitlistBusy} onClick={() => manageWaitlist(item, "accept")}>Accept offer</button>
                            )}
                            {isRequester && ["waiting", "offered"].includes(item.status) && (
                              <button type="button" className="reject-button" disabled={waitlistBusy} onClick={() => manageWaitlist(item, "cancel")}>Cancel waitlist</button>
                            )}
                          </div>
                        </article>
                      );
                    })}
                </section>

                <div className="results-heading">
                  <h2>Requests for my resources</h2>
                  <span>
                    {bookings.filter(
                      b => b.resources?.owner_id === session.user.id
                    ).length} requests
                  </span>
                </div>

                {bookings.filter(
                  b => b.resources?.owner_id === session.user.id
                ).length === 0 ? (
                  <div className="empty-panel">
                    No one has requested your resources yet.
                  </div>
                ) : (
                  bookings
                    .filter(b => b.resources?.owner_id === session.user.id)
                    .map(booking => (
                      <article className="booking-card" key={`owner-${booking.id}`}>
                        <div>
                          <h3>{booking.resources?.title || "Your resource"}</h3>
                          <p>
                            Requested by{" "}
                            {booking.user_id.slice(0, 8)}…
                          </p>
                          <span>
                            {new Date(booking.start_time).toLocaleString()} –{" "}
                            {new Date(booking.end_time).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </span>
                          {booking.notes && (
                            <p className="booking-notes">“{booking.notes}”</p>
                          )}
                          {incidentReports.filter(item => item.booking_id === booking.id).map(incident => (
                            <div className="incident-history-item" key={incident.id} style={{ marginTop: 12, padding: 12, border: "1px solid var(--border, #dbe4e8)", borderRadius: 12 }}>
                              <strong>{incident.incident_type} · {incident.status}</strong>
                              <p>{incident.description}</p>
                              {incident.resolution_notes && <p className="booking-hint">Resolution: {incident.resolution_notes}</p>}
                              {(profile.role === "admin" || booking.resources?.owner_id === session.user.id) && incident.status === "open" && (
                                <div className="booking-actions">
                                  <button type="button" className="approve-button" onClick={() => resolveIncident(incident.id, "resolved")}>Resolve report</button>
                                  <button type="button" className="reject-button" onClick={() => resolveIncident(incident.id, "rejected")}>Reject report</button>
                                </div>
                              )}
                            </div>
                          ))}
                          <div style={{ marginTop: 12 }}>
                            <strong>Transaction history</strong>
                            {bookingActivity.filter(item => item.booking_id === booking.id).length ? (
                              bookingActivity.filter(item => item.booking_id === booking.id).map(item => (
                                <p className="booking-hint" key={item.id}>
                                  {new Date(item.created_at).toLocaleString()} · {item.action.replaceAll("_", " ")}
                                  {item.details ? ` — ${item.details}` : ""}
                                </p>
                              ))
                            ) : <p className="booking-hint">No activity recorded yet.</p>}
                          </div>
                        </div>

                        <div className="booking-actions">
                          <span className={`booking-status ${booking.status}`}>
                            {booking.status}
                          </span>

                          {booking.status === "pending" && (
                            <>
                              <button
                                className="approve-button"
                                onClick={() => updateBookingStatus(booking, "approved")}
                              >
                                <CheckCircle2 size={15} /> Approve
                              </button>

                              <button
                                className="reject-button"
                                onClick={() => updateBookingStatus(booking, "rejected")}
                              >
                                <XCircle size={15} /> Reject
                              </button>
                            </>
                          )}
                        </div>
                      </article>
                    ))
                )}
              </>
            )}
          </main>
        )}

        {/* ADMIN DASHBOARD */}
        {page === "admin" && (
          profile.role === "admin" ? (
            <main className="marketplace admin-page">
              <button className="back-button" onClick={() => setPage("home")}>
                <ArrowLeft size={17} /> Back to Home
              </button>
              <div className="welcome-tag"><Shield size={15} /> ACCESSLOOP CONTROL CENTRE</div>
              <h1>Admin <span className="teal">Dashboard.</span></h1>
              <p className="dashboard-subtitle">Review campus resource submissions and monitor the sharing network.</p>

              <div className="admin-stats-grid">
                <div className="admin-stat-card"><Package size={22} /><span>Total resources</span><strong>{adminResources.length}</strong></div>
                <div className="admin-stat-card"><Clock size={22} /><span>Pending review</span><strong>{adminResources.filter(r => r.approval_status === "pending").length}</strong></div>
                <div className="admin-stat-card"><CheckCircle2 size={22} /><span>Approved</span><strong>{adminResources.filter(r => r.approval_status === "approved").length}</strong></div>
                <div className="admin-stat-card"><Users size={22} /><span>Registered users</span><strong>{adminUserCount}</strong></div>
              </div>

              <div className="admin-list-heading">
                <div><h2>Resource submissions</h2><p>Approve suitable listings or reject submissions that should not appear in the marketplace.</p></div>
                <button className="refresh-button" onClick={fetchAdminData}><RefreshCw size={16} /> Refresh</button>
              </div>
              <div className="filter-row admin-filter-row">
                {["pending", "approved", "rejected", "all"].map(status => (
                  <button key={status} className={`filter-chip ${adminFilter === status ? "selected" : ""}`} onClick={() => setAdminFilter(status)}>
                    {status === "all" ? "All resources" : status[0].toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
              {adminError && <div className="error-box">{adminError}</div>}
              {adminMessage && <div className="success-box">{adminMessage}</div>}
              {adminLoading ? <div className="state-message">Loading admin data...</div> : (
                <div className="admin-resource-list">
                  {adminResources.filter(r => adminFilter === "all" || r.approval_status === adminFilter).length === 0 ? (
                    <div className="empty-panel">No {adminFilter === "all" ? "resources" : adminFilter + " submissions"} found.</div>
                  ) : adminResources.filter(r => adminFilter === "all" || r.approval_status === adminFilter).map(resource => (
                    <article className="admin-resource-card" key={resource.id}>
                      <div className="admin-resource-image">
                        <ResourceImage src={resource.image_url} alt={resource.title} compact />
                      </div>
                      <div className="admin-resource-details">
                        <div className="admin-resource-title-row"><h3>{resource.title}</h3><span className={`status-badge ${resource.approval_status === "approved" ? "available" : resource.approval_status === "rejected" ? "unavailable" : "pending"}`}>{resource.approval_status}</span></div>
                        <p>{resource.description || "No description provided."}</p>
                        <span className="admin-resource-meta"><MapPin size={14} /> {resource.location} · {resource.source || "community"}</span>
                        <span className="admin-resource-meta">Submitted {resource.created_at ? new Date(resource.created_at).toLocaleDateString() : "date unavailable"}</span>
                        <div className="admin-resource-actions">
                          {resource.approval_status !== "approved" && <button className="approve-button" disabled={adminBusyId === resource.id} onClick={() => updateResourceApproval(resource, "approved")}><CheckCircle2 size={15} /> Approve</button>}
                          {resource.approval_status !== "rejected" && <button className="reject-button" disabled={adminBusyId === resource.id} onClick={() => updateResourceApproval(resource, "rejected")}><XCircle size={15} /> Reject</button>}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </main>
          ) : (
            <main className="marketplace"><div className="error-box">You do not have permission to access the admin dashboard.</div><button className="back-button" onClick={() => setPage("home")}>Back to Home</button></main>
          )
        )}

        {/* USER PROFILE */}
        {page === "profile" && (
          <main className="marketplace profile-page">
            <button className="back-button" onClick={() => setPage("home")}>
              <ArrowLeft size={17} /> Back to Home
            </button>

            <div className="welcome-tag">
              <UserRound size={15} /> YOUR CAMPUS IDENTITY
            </div>
            <h1>My <span className="teal">Profile.</span></h1>
            <p className="dashboard-subtitle">
              Keep your campus details up to date so your community knows who you are.
            </p>

            {profileLoading ? (
              <div className="state-message">Loading your profile...</div>
            ) : (
              <div className="profile-layout">
                <section className="profile-summary">
                  <div className="profile-avatar">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="Profile avatar" />
                    ) : (
                      <UserRound size={42} />
                    )}
                  </div>
                  <h2>{profile.full_name || "Your name"}</h2>
                  <p>{session.user.email}</p>
                  <span className="profile-role">{profile.role || "student"}</span>
                  <div className="profile-summary-detail">
                    <GraduationCap size={17} />
                    {profile.department || "Department not added"}
                  </div>
                  <div className="profile-summary-detail">
                    <CalendarDays size={17} />
                    {profile.year_of_study || "Year not added"}
                  </div>
                </section>

                <form className="resource-form profile-form" onSubmit={saveProfile}>
                  <h2>Edit profile</h2>
                  <p className="profile-form-note">
                    Your email and account role are managed securely and cannot be edited here.
                  </p>

                  <label>Full name *</label>
                  <input
                    name="full_name"
                    value={profile.full_name}
                    onChange={handleProfileChange}
                    placeholder="Enter your full name"
                    maxLength="100"
                    required
                  />

                  <label>Email address</label>
                  <input value={session.user.email || ""} disabled />

                  <label>Department</label>
                  <input
                    name="department"
                    value={profile.department}
                    onChange={handleProfileChange}
                    placeholder="e.g. Computer Science and Engineering"
                    maxLength="100"
                  />

                  <label>Year of study</label>
                  <select
                    name="year_of_study"
                    value={profile.year_of_study}
                    onChange={handleProfileChange}
                  >
                    <option value="">Select your year</option>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                    <option value="Postgraduate">Postgraduate</option>
                    <option value="Other">Other</option>
                  </select>

                  <label>Short bio</label>
                  <textarea
                    name="bio"
                    rows="4"
                    value={profile.bio}
                    onChange={handleProfileChange}
                    placeholder="A little about yourself and your interests..."
                    maxLength="300"
                  />

                  <label>Profile picture URL</label>
                  <input
                    name="avatar_url"
                    type="url"
                    value={profile.avatar_url}
                    onChange={handleProfileChange}
                    placeholder="https://example.com/your-photo.jpg"
                  />

                  {profileError && <div className="error-box">{profileError}</div>}
                  {profileMessage && <div className="success-box">{profileMessage}</div>}

                  <button className="submit-button" disabled={profileSaving}>
                    {profileSaving ? "Saving profile..." : "Save profile"}
                    {!profileSaving && <Save size={17} />}
                  </button>
                </form>
              </div>
            )}
          </main>
        )}

        {/* RESOURCE DETAILS + BOOKING FORM */}
        {selectedResource && (
          <div className="modal-backdrop" onClick={() => setSelectedResource(null)}>
            <div className="resource-modal" onClick={e => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setSelectedResource(null)}>
                <X size={21} />
              </button>

              <div className="modal-image-wrap">
                <ResourceImage src={selectedResource.image_url} alt={selectedResource.title} />
              </div>

              <div className="modal-content">
                <h2>{selectedResource.title}</h2>
                <p>{selectedResource.description || "No description provided."}</p>

                <div className="modal-detail">
                  <MapPin size={17} /> {selectedResource.location}
                </div>

                <div className="approval-note">
                  <ShieldCheck size={17} />
                  Approval status: {selectedResource.approval_status}
                </div>
                {selectedResource.usage_rules && <div className="approval-note"><Info size={17} /><span><strong>Usage rules:</strong> {selectedResource.usage_rules}</span></div>}
                {selectedResource.eligibility_requirements && <div className="approval-note"><ShieldCheck size={17} /><span><strong>Eligibility:</strong> {selectedResource.eligibility_requirements}</span></div>}
                <p className="booking-hint">Maximum duration: {selectedResource.max_booking_hours || 4} hour(s) · Active bookings per user: {selectedResource.max_active_bookings || 2}</p>

                {selectedResource.approval_status === "approved" &&
                isAvailable(selectedResource.availability_status) &&
                selectedResource.owner_id !== session.user.id ? (
                  <form className="booking-form" onSubmit={submitBooking}>
                    <h3><CalendarCheck size={19} /> Request this resource</h3>
                    <p className="booking-hint">
                      Monday–Saturday, 9 AM–3 PM.
                    </p>

                    <label>Booking date</label>
                    <input
                      type="date"
                      min={todayLocal()}
                      value={bookingDate}
                      onChange={e => setBookingDate(e.target.value)}
                      required
                    />

                    <div className="time-fields">
                      <div>
                        <label>Start time</label>
                        <input
                          type="time"
                          min="09:00"
                          max="14:59"
                          value={bookingStart}
                          onChange={e => setBookingStart(e.target.value)}
                          required
                        />
                      </div>

                      <div>
                        <label>End time</label>
                        <input
                          type="time"
                          min="09:01"
                          max="15:00"
                          value={bookingEnd}
                          onChange={e => setBookingEnd(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    {selectedResource.eligibility_requirements?.trim() && (
                      <>
                        <label>Eligibility information (required)</label>
                        <p className="booking-hint">Explain how you meet the resource requirements. The owner or administrator will review this before approval.</p>
                        <textarea rows="3" value={eligibilityEvidence} onChange={e => setEligibilityEvidence(e.target.value)} placeholder="Describe your qualification, training, membership or authorisation..." required />
                      </>
                    )}

                    <label>Message to owner (optional)</label>
                    <textarea
                      rows="3"
                      value={bookingNotes}
                      onChange={e => setBookingNotes(e.target.value)}
                      placeholder="Tell the owner what you need it for..."
                    />

                    {bookingError && <div className="error-box">{bookingError}</div>}
                    {bookingMessage && <div className="success-box">{bookingMessage}</div>}

                    <button className="submit-button" disabled={bookingBusy}>
                      {bookingBusy ? "Sending..." : "Send booking request"}
                      <ArrowRight size={17} />
                    </button>
                    <button type="button" className="refresh-button" disabled={waitlistBusy || !bookingDate || !bookingStart || !bookingEnd} onClick={() => joinWaitlist(selectedResource)}>
                      {waitlistBusy ? "Joining..." : "Join waitlist for this slot"}
                    </button>
                  </form>
                ) : (
                  <p className="reservation-note">
                    {selectedResource.owner_id === session.user.id
                      ? "You cannot book your own resource."
                      : "This resource is not currently available for booking."}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* EDIT LISTING MODAL */}
        {editingResource && (
          <div className="modal-backdrop" onClick={() => setEditingResource(null)}>
            <div className="resource-modal edit-modal" onClick={e => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setEditingResource(null)}>
                <X size={21} />
              </button>

              <div className="modal-content">
                <h2>Edit listing</h2>
                <p>Changes to an approved listing will require admin review again.</p>

                <form className="resource-form compact-form" onSubmit={saveEditedResource}>
                  <label>Resource name *</label>
                  <input name="title" value={resourceForm.title} onChange={handleResourceFormChange} required />

                  <label>Description</label>
                  <textarea name="description" rows="3" value={resourceForm.description} onChange={handleResourceFormChange} />

                  <label>Category</label>
                  <select name="category_id" value={resourceForm.category_id} onChange={handleResourceFormChange}>
                    <option value="">Select a category</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>

                  <label>Location *</label>
                  <input name="location" value={resourceForm.location} onChange={handleResourceFormChange} required />

                  <label>Image URL</label>
                  <input name="image_url" value={resourceForm.image_url} onChange={handleResourceFormChange} />

                  <label>Availability</label>
                  <select name="availability_status" value={resourceForm.availability_status} onChange={handleResourceFormChange}>
                    <option value="available">Available</option>
                    <option value="unavailable">Unavailable</option>
                  </select>
                  <label>Usage rules</label>
                  <textarea name="usage_rules" rows="2" value={resourceForm.usage_rules} onChange={handleResourceFormChange} />
                  <label>Eligibility requirements</label>
                  <textarea name="eligibility_requirements" rows="2" value={resourceForm.eligibility_requirements} onChange={handleResourceFormChange} />
                  <div className="time-fields">
                    <div><label>Max active bookings per user</label><input type="number" min="1" max="20" name="max_active_bookings" value={resourceForm.max_active_bookings} onChange={handleResourceFormChange} /></div>
                    <div><label>Maximum booking hours</label><input type="number" min="1" max="24" name="max_booking_hours" value={resourceForm.max_booking_hours} onChange={handleResourceFormChange} /></div>
                  </div>

                  {formError && <div className="error-box">{formError}</div>}

                  <button className="submit-button" disabled={formBusy}>
                    {formBusy ? "Saving..." : "Save changes"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION */}
        {deletingResource && (
          <div className="modal-backdrop" onClick={() => setDeletingResource(null)}>
            <div className="confirm-modal" onClick={e => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setDeletingResource(null)}>
                <X size={21} />
              </button>

              <Trash2 size={35} className="delete-icon" />
              <h2>Delete this listing?</h2>
              <p>
                Are you sure you want to delete
                <strong> {deletingResource.title}</strong>?
                This action cannot be undone.
              </p>

              {formError && <div className="error-box">{formError}</div>}

              <div className="confirm-actions">
                <button className="cancel-button" onClick={() => setDeletingResource(null)}>
                  Cancel
                </button>

                <button className="delete-button" onClick={deleteResource} disabled={formBusy}>
                  {formBusy ? "Deleting..." : "Delete listing"}
                </button>
              </div>
            </div>
          </div>
        )}

        <footer className="footer">
          © 2026 AccessLoop · Making campus resources accessible.
        </footer>
      </div>
    </>
  );
}

const styles = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap');

* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: 'DM Sans', sans-serif;
  background: #071426;
  color: #f8fafc;
}

button, input, textarea, select { font: inherit; }
button { cursor: pointer; }
.teal { color: #20dcc5; }

.auth-page, .app-shell {
  min-height: 100vh;
  background:
    radial-gradient(ellipse at 15% 35%, rgba(32,220,197,.08), transparent 40%),
    radial-gradient(ellipse at 85% 75%, rgba(167,139,250,.09), transparent 40%),
    #071426;
}

.navbar {
  min-height: 78px;
  padding: 0 7%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255,255,255,.08);
}

.brand {
  display: flex;
  align-items: center;
  gap: 11px;
  color: #20dcc5;
  font: 700 23px 'Space Grotesk', sans-serif;
}

.brand span { color: #f8fafc; }
.brand span .teal { color: #20dcc5; }

.brand-button {
  border: 0;
  background: none;
  padding: 0;
}

.nav-label, .hero-bottom {
  color: #8295ad;
  font-size: 11px;
  letter-spacing: 2px;
  font-weight: 700;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.user-email {
  color: #9aabc1;
  font-size: 13px;
}

.logout-button {
  background: #142a40;
  border: 1px solid #30435a;
  color: #dbe5f1;
  padding: 10px 15px;
  border-radius: 9px;
  display: flex;
  gap: 8px;
  align-items: center;
}

.auth-layout {
  width: min(1100px, 90%);
  min-height: 720px;
  margin: auto;
  display: grid;
  grid-template-columns: 1.1fr .9fr;
  align-items: center;
  gap: 70px;
  padding: 55px 0;
}

.eyebrow, .welcome-tag {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #20dcc5;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.5px;
}

.hero-section h1, .dashboard-content h1, .marketplace h1 {
  font: 700 clamp(42px,5vw,62px)/1.15 'Space Grotesk', sans-serif;
  letter-spacing: -2.5px;
  margin: 27px 0 20px;
}

.hero-section h1 span { color: #20dcc5; }

.hero-description, .dashboard-subtitle {
  color: #9aabc1;
  line-height: 1.9;
  font-size: 16px;
  max-width: 490px;
}

.feature-list {
  display: grid;
  gap: 22px;
  margin-top: 40px;
  color: #d6e0ed;
  font-size: 14px;
}

.feature-list div {
  display: flex;
  align-items: center;
  gap: 13px;
}

.feature-list svg { color: #20dcc5; width: 20px; }
.hero-bottom { margin-top: 65px; font-size: 10px; }

.auth-card {
  background: rgba(17,32,54,.88);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 22px;
  padding: 36px;
  box-shadow: 0 25px 80px rgba(0,0,0,.3);
}

.form-icon {
  width: 54px;
  height: 54px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  color: #20dcc5;
  background: rgba(32,220,197,.12);
  margin-bottom: 24px;
}

.auth-card h2 {
  font: 700 28px 'Space Grotesk', sans-serif;
  margin: 0 0 9px;
}

.form-subtitle {
  color: #91a2b9;
  font-size: 13px;
  line-height: 1.7;
}

.auth-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 5px;
  background: #09182a;
  border-radius: 11px;
  margin: 28px 0;
}

.auth-tabs button {
  border: 0;
  padding: 12px 5px;
  border-radius: 8px;
  color: #8fa1b8;
  background: transparent;
  font-size: 13px;
  font-weight: 600;
}

.auth-tabs .active-tab {
  color: #20dcc5;
  background: #193447;
}

.auth-card label, .resource-form label, .booking-form label {
  display: block;
  color: #dbe5f1;
  font-size: 13px;
  font-weight: 600;
  margin: 19px 0 9px;
}

.input-wrap {
  height: 51px;
  border: 1px solid #30435a;
  background: #0b1b30;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 14px;
  color: #8295ad;
}

.input-wrap:focus-within {
  border-color: #20dcc5;
  box-shadow: 0 0 0 3px rgba(32,220,197,.1);
}

.input-wrap input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: white;
  font-size: 14px;
}

.input-wrap input::placeholder { color: #63768d; }

.eye-button, .clear-search {
  border: 0;
  background: transparent;
  color: #8295ad;
  display: flex;
}

.submit-button {
  width: 100%;
  min-height: 52px;
  margin-top: 25px;
  border: 0;
  border-radius: 10px;
  background: #20dcc5;
  color: #061624;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.submit-button:hover { background: #53edda; }
.submit-button:disabled { opacity: .6; cursor: wait; }

.error-box, .success-box {
  padding: 12px;
  margin-top: 15px;
  border-radius: 9px;
  font-size: 12px;
  line-height: 1.6;
}

.error-box { background: #451d2a; color: #ffb5c1; }
.success-box { background: #123c37; color: #7cf3d9; }

.secure-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #8094aa;
  font-size: 11px;
  margin-top: 26px;
}

.secure-note svg { color: #20dcc5; }

.footer {
  text-align: center;
  padding: 25px 15px;
  color: #71849b;
  font-size: 11px;
}

.loading-screen {
  min-height: 100vh;
  background: #071426;
  color: #20dcc5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.dashboard-content, .marketplace {
  width: min(1050px, 90%);
  margin: 70px auto;
}

.dashboard-content h1, .marketplace h1 {
  font-size: clamp(36px,5vw,55px);
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(2,1fr);
  gap: 20px;
  margin-top: 45px;
}

.dashboard-card {
  text-align: left;
  padding: 30px;
  background: #112036;
  border: 1px solid #273951;
  border-radius: 17px;
  color: white;
  transition: .2s;
}

button.dashboard-card:hover {
  transform: translateY(-5px);
  border-color: #20dcc5;
}

.dashboard-card > svg { color: #20dcc5; }

.dashboard-card h3 {
  font: 600 21px 'Space Grotesk', sans-serif;
  margin: 12px 0 5px;
}

.dashboard-card p {
  color: #9aabc1;
  line-height: 1.8;
  font-size: 13px;
}

.card-link {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #20dcc5;
  font-size: 13px;
  font-weight: 700;
  margin-top: 22px;
}

.coming-soon {
  margin-top: 35px;
  padding: 20px;
  border-radius: 12px;
  background: rgba(32,220,197,.07);
  border: 1px solid rgba(32,220,197,.2);
  color: #a9c9ca;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
}

.admin-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 15px;
  margin: 30px 0 38px;
}
.admin-stat-card {
  background: #112036;
  border: 1px solid #273951;
  border-radius: 14px;
  padding: 20px;
  display: grid;
  gap: 9px;
}
.admin-stat-card svg { color: #20dcc5; }
.admin-stat-card span { color: #9aabc1; font-size: 12px; }
.admin-stat-card strong { font: 700 29px 'Space Grotesk', sans-serif; }
.admin-list-heading { display: flex; justify-content: space-between; align-items: center; gap: 18px; margin-bottom: 17px; }
.admin-list-heading h2 { font: 700 24px 'Space Grotesk', sans-serif; margin: 0 0 6px; }
.admin-list-heading p { color: #9aabc1; font-size: 13px; margin: 0; line-height: 1.6; }
.admin-resource-list { display: grid; gap: 15px; margin-top: 18px; }
.admin-resource-card { display: grid; grid-template-columns: 145px 1fr; gap: 20px; padding: 17px; background: #112036; border: 1px solid #273951; border-radius: 15px; }
.admin-resource-image { min-height: 125px; border-radius: 10px; background: #0b1b30; display: grid; place-items: center; color: #20dcc5; overflow: hidden; }
.admin-resource-image img { width: 100%; height: 100%; min-height: 125px; object-fit: cover; }
.admin-resource-details { min-width: 0; }
.admin-resource-title-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.admin-resource-title-row h3 { margin: 0; font: 700 18px 'Space Grotesk', sans-serif; }
.admin-resource-details > p { color: #a8b7c9; font-size: 13px; line-height: 1.6; margin: 9px 0; }
.admin-resource-meta { display: flex; align-items: center; gap: 6px; color: #91a2b9; font-size: 11px; margin-top: 6px; }
.admin-resource-actions { display: flex; gap: 9px; margin-top: 13px; }
.admin-resource-actions button:disabled { opacity: .55; cursor: wait; }
@media (max-width: 760px) {
  .admin-stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .admin-resource-card { grid-template-columns: 1fr; }
  .admin-resource-image { max-height: 180px; }
  .admin-list-heading { align-items: flex-start; flex-direction: column; }
}

.profile-nav-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 9px;
  border: 1px solid #30435a;
  background: #142a40;
  color: #dbe5f1;
}
.profile-nav-button:hover, .profile-nav-button.active {
  border-color: #20dcc5;
  color: #20dcc5;
}
.profile-layout {
  display: grid;
  grid-template-columns: .8fr 1.2fr;
  gap: 24px;
  align-items: start;
  margin-top: 35px;
}
.profile-summary {
  background: #112036;
  border: 1px solid #273951;
  border-radius: 17px;
  padding: 30px;
  text-align: center;
}
.profile-avatar {
  width: 108px;
  height: 108px;
  border-radius: 50%;
  margin: 0 auto 18px;
  display: grid;
  place-items: center;
  overflow: hidden;
  color: #20dcc5;
  background: rgba(32,220,197,.12);
  border: 2px solid rgba(32,220,197,.35);
}
.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.profile-summary h2 {
  font: 700 23px 'Space Grotesk', sans-serif;
  margin: 0 0 7px;
  overflow-wrap: anywhere;
}
.profile-summary > p {
  color: #9aabc1;
  font-size: 13px;
  overflow-wrap: anywhere;
}
.profile-role {
  display: inline-block;
  margin: 10px 0 20px;
  padding: 6px 12px;
  border-radius: 20px;
  background: rgba(32,220,197,.12);
  color: #20dcc5;
  text-transform: capitalize;
  font-size: 11px;
  font-weight: 700;
}
.profile-summary-detail {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  color: #b8c6d8;
  font-size: 13px;
  margin-top: 13px;
}
.profile-summary-detail svg { color: #20dcc5; flex-shrink: 0; }
.profile-form { margin: 0; }
.profile-form h2 {
  font: 700 23px 'Space Grotesk', sans-serif;
  margin: 0 0 8px;
}
.profile-form-note {
  color: #91a2b9;
  font-size: 12px;
  line-height: 1.7;
  margin: 0 0 18px;
}
.profile-form input:disabled {
  opacity: .65;
  cursor: not-allowed;
}

.back-button {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #9aabc1;
  background: transparent;
  border: 0;
  padding: 0;
  margin-bottom: 35px;
}

.back-button:hover { color: #20dcc5; }

.market-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
}

.market-heading h1 { margin-top: 20px; }

.resource-count {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 17px;
  border: 1px solid #30435a;
  background: #112036;
  border-radius: 12px;
  color: #a9c9ca;
  font-size: 13px;
  white-space: nowrap;
}

.resource-count svg { color: #20dcc5; }

.search-panel {
  margin: 35px 0;
  padding: 20px;
  background: #112036;
  border: 1px solid #273951;
  border-radius: 16px;
}

.search-box {
  height: 53px;
  padding: 0 15px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid #30435a;
  background: #09182a;
  border-radius: 10px;
  color: #8295ad;
}

.search-box:focus-within { border-color: #20dcc5; }

.search-box input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: 0;
  outline: 0;
  color: white;
  font-size: 14px;
}

.search-box input::placeholder { color: #63768d; }

.filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 17px;
}

.filter-label {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #9aabc1;
  font-size: 12px;
}

.filter-chip {
  border: 1px solid #30435a;
  border-radius: 20px;
  padding: 8px 14px;
  background: transparent;
  color: #9aabc1;
  font-size: 12px;
}

.filter-chip.selected {
  background: rgba(32,220,197,.12);
  border-color: #20dcc5;
  color: #20dcc5;
}

.refresh-button {
  display: flex;
  align-items: center;
  gap: 7px;
  background: #1b3449;
  border: 1px solid #30435a;
  border-radius: 9px;
  color: #c8d5e4;
  padding: 9px 13px;
  font-size: 12px;
}

.results-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 35px 0 18px;
}

.results-heading h2 {
  font: 600 22px 'Space Grotesk', sans-serif;
  margin: 0;
}

.results-heading span {
  color: #8295ad;
  font-size: 12px;
}

.resource-grid {
  display: grid;
  grid-template-columns: repeat(3,minmax(0,1fr));
  gap: 22px;
  margin-top: 25px;
}

.resource-card {
  overflow: hidden;
  background: #112036;
  border: 1px solid #273951;
  border-radius: 16px;
  transition: .2s;
}

.resource-card:hover {
  transform: translateY(-4px);
  border-color: #20dcc5;
}

.resource-image {
  height: 190px;
  position: relative;
  background: #0b1b30;
  overflow: hidden;
}

.resource-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #20dcc5;
  background: linear-gradient(135deg,#102a3d,#15213b);
}

.image-placeholder span {
  color: #8295ad;
  font-size: 10px;
  letter-spacing: 2px;
}

.status-badge {
  display: inline-flex;
  padding: 6px 10px;
  border-radius: 20px;
  font-size: 10px;
  font-weight: 700;
  text-transform: capitalize;
}

.resource-image .status-badge {
  position: absolute;
  top: 13px;
  right: 13px;
}

.status-badge.available {
  background: #123e37;
  color: #7cf3d9;
}

.status-badge.unavailable {
  background: #462c32;
  color: #ffb4bf;
}

.status-badge.pending {
  background: #4b3b1c;
  color: #f6d58b;
}

.resource-info { padding: 19px; }

.resource-info h3 {
  font: 600 19px 'Space Grotesk', sans-serif;
  margin: 0 0 9px;
}

.resource-description {
  color: #9aabc1;
  font-size: 12px;
  line-height: 1.7;
  min-height: 42px;
}

.resource-location {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #8295ad;
  font-size: 12px;
  margin: 17px 0;
}

.resource-location svg { color: #20dcc5; flex-shrink: 0; }

.details-button {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  border: 1px solid #20dcc5;
  background: rgba(32,220,197,.08);
  color: #20dcc5;
  border-radius: 9px;
  padding: 11px;
  font-weight: 700;
  font-size: 12px;
}

.details-button:hover {
  background: #20dcc5;
  color: #071426;
}

.state-message {
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #9aabc1;
}

.empty-panel {
  padding: 25px;
  border: 1px dashed #30435a;
  border-radius: 12px;
  color: #9aabc1;
  font-size: 13px;
  margin: 20px 0;
}

.inline-link {
  display: block;
  border: 0;
  background: transparent;
  color: #20dcc5;
  padding: 12px 0 0;
}

.resource-form {
  width: min(650px,100%);
  margin: 30px auto;
  padding: 30px;
  background: #112036;
  border: 1px solid #273951;
  border-radius: 17px;
}

.resource-form h2 {
  font: 600 23px 'Space Grotesk', sans-serif;
  margin: 0 0 20px;
}

.resource-form input, .resource-form textarea,
.resource-form select, .booking-form input,
.booking-form textarea {
  width: 100%;
  border: 1px solid #30435a;
  background: #09182a;
  color: #fff;
  border-radius: 9px;
  padding: 12px;
  outline: none;
}

.resource-form input:focus, .resource-form textarea:focus,
.resource-form select:focus, .booking-form input:focus,
.booking-form textarea:focus {
  border-color: #20dcc5;
}

.resource-form textarea, .booking-form textarea { resize: vertical; }

.resource-form select, .booking-form input {
  color-scheme: dark;
}

.approval-note {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 13px;
  margin-top: 20px;
  border-radius: 9px;
  background: #0b1b30;
  color: #a9c9ca;
  font-size: 12px;
  line-height: 1.6;
}

.approval-note svg { color: #20dcc5; flex-shrink: 0; }

.listing-availability {
  color: #9aabc1;
  font-size: 11px;
}

.listing-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.edit-button, .delete-button, .cancel-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 9px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
}

.edit-button {
  flex: 1;
  color: #20dcc5;
  background: #123b3b;
  border: 1px solid #24645e;
}

.edit-button:disabled { opacity: .4; cursor: not-allowed; }

.delete-button {
  color: #ffb4bf;
  background: #462c32;
  border: 1px solid #81424f;
}

.rejected-note {
  color: #ffb4bf;
  font-size: 11px;
}

.share-another {
  max-width: 240px;
  margin-top: 20px;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10;
  padding: 20px;
  background: rgba(0,0,0,.75);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-y: auto;
}

.resource-modal {
  width: min(520px,100%);
  max-height: 90vh;
  overflow-y: auto;
  background: #112036;
  border: 1px solid #30435a;
  border-radius: 18px;
  position: relative;
}

.edit-modal { width: min(650px,100%); }

.modal-close {
  position: absolute;
  top: 13px;
  right: 13px;
  z-index: 2;
  width: 37px;
  height: 37px;
  border: 0;
  border-radius: 50%;
  background: #071426;
  color: white;
  display: grid;
  place-items: center;
}

.modal-image {
  width: 100%;
  height: 230px;
  object-fit: cover;
}

.modal-content { padding: 25px; }

.modal-content h2 {
  font: 700 27px 'Space Grotesk', sans-serif;
  margin: 15px 0 10px;
}

.modal-content p {
  color: #9aabc1;
  line-height: 1.8;
  font-size: 13px;
}

.modal-detail {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 15px 0;
  color: #cbd7e5;
  font-size: 13px;
}

.modal-detail svg { color: #20dcc5; }

.booking-form {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #30435a;
  display: grid;
  gap: 10px;
}

.booking-form h3 {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #20dcc5;
  font: 600 19px 'Space Grotesk', sans-serif;
  margin: 0;
}

.booking-hint { margin: 0 !important; }

.time-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.time-fields > div { display: grid; gap: 8px; }

.reservation-note {
  border-top: 1px solid #30435a;
  padding-top: 17px;
  margin-top: 20px;
}

.booking-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 18px;
  margin: 12px 0;
  padding: 20px;
  border: 1px solid #273951;
  border-radius: 13px;
  background: #112036;
}

.booking-card h3 {
  margin: 0 0 7px;
  font: 600 17px 'Space Grotesk', sans-serif;
}

.booking-card p, .booking-card span {
  color: #9aabc1;
  font-size: 12px;
  line-height: 1.7;
}

.booking-card p { margin: 3px 0; }
.booking-notes { color: #cbd7e5 !important; }

.booking-status {
  display: inline-flex;
  border-radius: 20px;
  padding: 7px 11px;
  font-size: 11px;
  font-weight: 700;
  text-transform: capitalize;
  white-space: nowrap;
  background: #29394b;
  color: #cbd7e5;
}

.booking-status.pending {
  background: #4b3b1c;
  color: #f6d58b;
}

.booking-status.approved {
  background: #123e37;
  color: #7cf3d9;
}

.booking-status.rejected, .booking-status.cancelled {
  background: #462c32;
  color: #ffb4bf;
}

.booking-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.approve-button, .reject-button {
  display: flex;
  align-items: center;
  gap: 6px;
  border-radius: 8px;
  padding: 8px 11px;
  font-size: 11px;
  font-weight: 700;
}

.approve-button {
  background: #123e37;
  border: 1px solid #247c6d;
  color: #7cf3d9;
}

.reject-button {
  background: #462c32;
  border: 1px solid #81424f;
  color: #ffb4bf;
}

.confirm-modal {
  width: min(420px,100%);
  padding: 30px;
  border-radius: 17px;
  border: 1px solid #30435a;
  background: #112036;
  position: relative;
  text-align: center;
}

.confirm-modal h2 {
  font: 600 23px 'Space Grotesk', sans-serif;
}

.confirm-modal p {
  color: #9aabc1;
  line-height: 1.7;
  font-size: 13px;
}

.delete-icon { color: #ffb4bf; }

.confirm-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 22px;
}

.cancel-button {
  color: #dbe5f1;
  background: #1b3449;
  border: 1px solid #30435a;
}

.confirm-actions .delete-button { border: 1px solid #81424f; }



/* NOTIFICATION CENTRE */
.notification-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.notification-bell {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  position: relative;
  border: 1px solid #30435a;
  border-radius: 11px;
  background: #142a40;
  color: #dbe5f1;
}

.notification-bell:hover,
.notification-bell.active {
  border-color: #20dcc5;
  color: #20dcc5;
}

.notification-count {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 19px;
  height: 19px;
  padding: 0 5px;
  display: grid;
  place-items: center;
  border: 2px solid #071426;
  border-radius: 20px;
  background: #20dcc5;
  color: #061624;
  font-size: 10px;
  font-weight: 800;
}

.notification-panel {
  position: absolute;
  z-index: 20;
  top: calc(100% + 13px);
  right: 0;
  width: min(390px, calc(100vw - 30px));
  max-height: min(560px, calc(100vh - 110px));
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #112036;
  border: 1px solid #30435a;
  border-radius: 15px;
  box-shadow: 0 20px 55px rgba(0,0,0,.45);
}

.notification-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 17px;
  border-bottom: 1px solid #30435a;
}

.notification-panel-header h3 {
  margin: 0 0 4px;
  font: 600 17px 'Space Grotesk', sans-serif;
}

.notification-panel-header span {
  color: #91a2b9;
  font-size: 11px;
}

.mark-all-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 9px;
  border: 1px solid #30435a;
  border-radius: 8px;
  background: #0b1b30;
  color: #20dcc5;
  font-size: 10px;
  white-space: nowrap;
}

.mark-all-button:disabled {
  opacity: .4;
  cursor: not-allowed;
}

.notification-list {
  overflow-y: auto;
}

.notification-item {
  padding: 15px 17px;
  border-bottom: 1px solid rgba(255,255,255,.06);
}

.notification-item.unread {
  background: rgba(32,220,197,.055);
}

.notification-item-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.notification-item-top strong {
  color: #f1f5f9;
  font-size: 12px;
}

.unread-dot {
  width: 8px;
  height: 8px;
  flex: 0 0 8px;
  border-radius: 50%;
  background: #20dcc5;
}

.notification-item p {
  margin: 7px 0 10px;
  color: #a9b8ca;
  font-size: 12px;
  line-height: 1.6;
}

.notification-item-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.notification-item-bottom time {
  color: #71849b;
  font-size: 10px;
}

.notification-item-bottom button {
  border: 0;
  background: transparent;
  color: #20dcc5;
  font-size: 10px;
  font-weight: 700;
}

.notification-empty {
  min-height: 150px;
  padding: 25px 15px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 9px;
  color: #8295ad;
  text-align: center;
  font-size: 12px;
}

.notification-empty svg { color: #20dcc5; }
.notification-empty strong { color: #dbe5f1; font-size: 13px; }
.notification-error {
  margin: 10px;
  padding: 10px;
  border-radius: 8px;
  background: #451d2a;
  color: #ffb5c1;
  font-size: 11px;
}

@media(max-width:850px) {
  .auth-layout {
    grid-template-columns: 1fr;
    gap: 35px;
    padding: 55px 0;
  }

  .hero-section h1 { font-size: 43px; }
  .hero-bottom { margin-top: 30px; }

  .dashboard-grid, .resource-grid {
    grid-template-columns: repeat(2,minmax(0,1fr));
  }

  .market-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .booking-card { flex-direction: column; }
  .booking-actions { justify-content: flex-start; }
}

@media(max-width:560px) {
  .navbar { padding: 0 5%; min-height: 70px; }
  .nav-label, .user-email { display: none; }
  .nav-right { gap: 10px; }
  .notification-panel { right: -55px; }
  .brand { font-size: 21px; }
  .auth-card { padding: 25px; }

  .dashboard-content, .marketplace {
    margin: 45px auto;
  }

  .dashboard-grid, .resource-grid {
    grid-template-columns: 1fr;
  }

  .profile-layout { grid-template-columns: 1fr; }
  .profile-nav-button { padding: 9px 10px; font-size: 12px; }

  .resource-image { height: 210px; }

  .filter-row { gap: 8px; }
  .search-panel { padding: 13px; }

  .marketplace h1 { font-size: 39px; }

  .time-fields { grid-template-columns: 1fr; }
  .resource-form { padding: 20px; }
}

/* PHASE 7 — PRODUCT POLISH */
:root { color-scheme: dark; }
html { scroll-behavior: smooth; }
body { min-width: 320px; }
button, input, textarea, select { transition: border-color .18s ease, background .18s ease, transform .18s ease, box-shadow .18s ease; }
button:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible { outline: 2px solid #20dcc5; outline-offset: 3px; }
button:disabled { opacity: .58; cursor: not-allowed; transform: none !important; }
.navbar { position: sticky; top: 0; z-index: 50; backdrop-filter: blur(18px); background: rgba(7,20,38,.92); }
.nav-right { gap: 12px; }
.marketplace { width: min(1180px, 90%); }
.dashboard-content { width: min(1180px, 90%); }
.dashboard-grid { gap: 18px; }
.dashboard-card { min-height: 162px; padding: 26px; border-radius: 18px; background: linear-gradient(145deg, rgba(20,39,64,.98), rgba(15,31,52,.98)); border: 1px solid rgba(120,157,190,.19); text-align: left; }
.dashboard-card:hover { border-color: rgba(32,220,197,.65); box-shadow: 0 16px 36px rgba(0,0,0,.2); transform: translateY(-4px); }
.market-heading { margin-bottom: 26px; }
.search-panel { border: 1px solid rgba(120,157,190,.2); box-shadow: 0 14px 34px rgba(0,0,0,.12); }
.search-box input { min-width: 0; }
.market-select { min-height: 38px; padding: 0 12px; border-radius: 9px; border: 1px solid #30435a; color: #dbe5f1; background: #0b1b30; font-size: 12px; }
.market-select:focus { border-color: #20dcc5; }
.resource-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 22px; }
.resource-card { border-radius: 17px; box-shadow: 0 10px 28px rgba(0,0,0,.12); }
.resource-image { height: 205px; }
.resource-image > .image-placeholder { height: 100%; }
.image-placeholder { min-height: 100%; }
.image-placeholder img { display: block; width: 100%; height: 100%; min-height: 100%; object-fit: cover; }
.image-placeholder small { color: #71869e; font-size: 10px; letter-spacing: .4px; }
.compact-image-placeholder { min-height: 125px; }
.resource-info { display: flex; flex-direction: column; min-height: 205px; }
.resource-info h3 { line-height: 1.35; }
.resource-description { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.resource-info .details-button { margin-top: auto; }
.resource-location { gap: 8px; }
.details-button, .submit-button, .approve-button, .reject-button, .refresh-button { min-height: 40px; }
.details-button:hover, .submit-button:hover, .refresh-button:hover { filter: brightness(1.12); transform: translateY(-1px); }
.admin-page { max-width: 1180px; }
.admin-stats-grid { gap: 16px; }
.admin-stat-card { border-radius: 16px; background: linear-gradient(145deg,#142740,#101f35); }
.admin-resource-card { border-radius: 16px; }
.admin-resource-image { width: 160px; min-width: 160px; }
.admin-resource-image .image-placeholder { min-height: 125px; }
.admin-resource-image .image-placeholder span { display: none; }
.admin-resource-details { min-width: 0; }
.booking-card, .profile-summary, .profile-form { border-radius: 16px; }
.booking-status { white-space: nowrap; }
.notification-panel { box-shadow: 0 22px 60px rgba(0,0,0,.38); border-color: rgba(120,157,190,.25); }
.modal-backdrop { padding: 20px; overflow-y: auto; }
.resource-modal { max-height: calc(100vh - 40px); overflow-y: auto; }
.modal-image-wrap { height: 220px; overflow: hidden; background: #0b1b30; }
.modal-image-wrap .image-placeholder { height: 220px; }
.modal-image-wrap .image-placeholder img { height: 220px; }
.empty-panel { border: 1px dashed #38516b; background: rgba(15,31,52,.55); }
.footer { padding: 32px 16px; }

@media (max-width: 1000px) {
  .marketplace, .dashboard-content { width: min(920px, 92%); }
  .resource-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .admin-stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 700px) {
  .navbar { padding: 10px 4%; align-items: flex-start; gap: 12px; }
  .nav-right { flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
  .marketplace, .dashboard-content { width: 92%; margin: 32px auto; }
  .marketplace h1, .dashboard-content h1 { letter-spacing: -1.4px; }
  .resource-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
  .resource-image { height: 160px; }
  .resource-info { padding: 14px; min-height: 210px; }
  .filter-row { flex-wrap: wrap; }
  .market-select { flex: 1 1 145px; }
  .admin-resource-card { flex-direction: column; }
  .admin-resource-image { width: 100%; min-width: 0; max-height: 180px; }
}
@media (max-width: 480px) {
  .navbar { align-items: center; }
  .brand { font-size: 19px; }
  .nav-right { gap: 6px; }
  .user-email { display: none; }
  .profile-nav-button, .logout-button { padding: 8px 9px; font-size: 11px; }
  .resource-grid, .dashboard-grid, .admin-stats-grid { grid-template-columns: 1fr; }
  .resource-image { height: 205px; }
  .resource-info { min-height: auto; }
  .resource-info .details-button { margin-top: 12px; }
  .market-heading { gap: 14px; }
  .marketplace h1, .dashboard-content h1 { font-size: 36px; }
  .notification-panel { position: fixed; top: 75px; left: 4%; right: 4%; width: auto; max-height: 70vh; }
  .auth-layout { width: 92%; }
  .auth-card { padding: 22px; }
  .time-fields { grid-template-columns: 1fr; }
}

`;

export default App;