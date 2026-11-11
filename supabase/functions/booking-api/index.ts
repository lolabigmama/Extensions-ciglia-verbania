import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { fromZonedTime, toZonedTime } from "npm:date-fns-tz@3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const OWNER_KEY = Deno.env.get("OWNER_ACTION_API_KEY") ?? "";
const ORIGIN = Deno.env.get("SITE_ORIGIN") ?? "https://lolabigmama.github.io";
const TZ = "Europe/Rome";
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const json = (body: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", ...headers } });
const cors = (req: Request) => ({
  "access-control-allow-origin": req.headers.get("origin") === ORIGIN || req.headers.get("origin") === ORIGIN + "/"
    ? req.headers.get("origin")! : ORIGIN,
  "access-control-allow-headers": "authorization, apikey, content-type, x-owner-api-key",
  "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "vary": "Origin",
});
const validDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + "T12:00:00Z"));
function dayRange(date: string) {
  const start = fromZonedTime(date + "T00:00:00", TZ);
  const d = new Date(date + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + 1);
  return { start, end: fromZonedTime(d.toISOString().slice(0,10) + "T00:00:00", TZ) };
}
function owner(req: Request) {
  const provided = req.headers.get("x-owner-api-key") ?? "";
  return !!OWNER_KEY && provided.length === OWNER_KEY.length && provided === OWNER_KEY;
}
async function notifyCalendar() {
  try { await db.channel("calendar").send({ type: "broadcast", event: "calendar_changed", payload: { changed_at: new Date().toISOString() } }); } catch { /* best effort */ }
}
async function syncGoogleCalendar(payload: Record<string, unknown>) {
  const scriptUrl = Deno.env.get("GOOGLE_APPS_SCRIPT_URL") ?? "";
  const scriptToken = Deno.env.get("GOOGLE_APPS_SCRIPT_TOKEN") ?? "";
  if (!scriptUrl || !scriptToken) return { ok: false, configured: false };
  const response = await fetch(scriptUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...payload, token: scriptToken }),
    redirect: "follow",
  });
  const raw = await response.text();
  let result: Record<string, unknown> = {};
  try { result = JSON.parse(raw); } catch { /* Apps Script may return a plain response */ }
  if (!response.ok || result.ok === false || result.error) {
    throw new Error(String(result.error ?? result.message ?? `Google Calendar bridge error (${response.status})`));
  }
  return { ok: true, result };
}

async function availability(serviceId: string, date: string) {
  if (!validDate(date)) throw new Error("Data non valida.");
  const { data: service, error: se } = await db.from("services").select("id,name,price_cents,duration_minutes").eq("id", serviceId).eq("is_active", true).single();
  if (se || !service) throw new Error("Trattamento non disponibile.");
  const { start, end } = dayRange(date);
  const weekday = new Date(date + "T12:00:00Z").getUTCDay();
  const [{ data: hours, error: he }, { data: specialSlots, error: se2 }, { data: appts, error: ae }, { data: blocks, error: be }, { data: settings }] = await Promise.all([
    db.from("business_hours").select("opens_at,closes_at").eq("weekday", weekday).eq("is_active", true).order("opens_at"),
    db.from("special_slots").select("starts_at").eq("slot_date", date).order("starts_at"),
    db.from("appointments").select("starts_at,ends_at").lt("starts_at", end.toISOString()).gt("ends_at", start.toISOString()).in("status", ["pending","confirmed"]),
    db.from("blocked_dates").select("starts_at,ends_at").lt("starts_at", end.toISOString()).gt("ends_at", start.toISOString()),
    db.from("booking_settings").select("timezone,slot_interval_minutes,maximum_booking_days,minimum_advance_hours").eq("id",1).maybeSingle()
  ]);
  if (he || se2 || ae || be) throw new Error("Errore nella lettura del calendario.");
  const cfg = settings ?? { slot_interval_minutes: 15, maximum_booking_days: 90, minimum_advance_hours: 2 };
  const now = Date.now();
  const maxDate = now + Number(cfg.maximum_booking_days) * 86400000;
  const minTime = now + Number(cfg.minimum_advance_hours) * 3600000;
  const busy = [...(appts ?? []), ...(blocks ?? [])].map(x => [new Date(x.starts_at).getTime(),new Date(x.ends_at).getTime()]);
  const duration = Number(service.duration_minutes) * 60000;
  const slots: { starts_at: string; ends_at: string }[] = [];
  const candidates: number[] = (specialSlots?.length
    ? specialSlots.map(x => fromZonedTime(date + "T" + x.starts_at, TZ).getTime())
    : (hours ?? []).flatMap(h => {
        const opens = fromZonedTime(date + "T" + h.opens_at, TZ).getTime();
        const closes = fromZonedTime(date + "T" + h.closes_at, TZ).getTime();
        const starts: number[] = [];
        for (let t=opens; t+duration<=closes; t+=Number(cfg.slot_interval_minutes)*60000) starts.push(t);
        return starts;
      }));
  for (const t of candidates) {
    if (t < minTime || t > maxDate || t+duration > end.getTime()) continue;
    if (busy.some(([a,b]) => t < b && a < t+duration)) continue;
    slots.push({ starts_at:new Date(t).toISOString(), ends_at:new Date(t+duration).toISOString() });
  }
  return { date, timezone: TZ, service, slots };
}
Deno.serve(async (req: Request) => {
  const headers = cors(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  const url = new URL(req.url);
  const path = url.pathname.split("/").filter(Boolean).slice(-1)[0] ?? "";
  try {
    if (req.method === "GET" && path === "services") {
      const { data, error } = await db.from("services").select("id,name,price_cents,duration_minutes").eq("is_active",true).order("sort_order");
      if (error) throw error;
      return json({ services:data ?? [] },200,headers);
    }
    if (req.method === "GET" && path === "availability") {
      return json(await availability(url.searchParams.get("service_id") ?? "",url.searchParams.get("date") ?? ""),200,headers);
    }
    if (req.method === "POST" && path === "appointments") {
      const body = await req.json();
      const name = String(body.customer_name ?? "").trim();
      const instagram = String(body.customer_instagram ?? "").trim().replace(/^@/, "");
      const serviceId = String(body.service_id ?? "");
      const startsAt = new Date(String(body.starts_at ?? ""));
      if (name.length < 2 || name.length > 120 || instagram.length < 1 || instagram.length > 40 || !/^[A-Za-z0-9._]+$/.test(instagram) || Number.isNaN(startsAt.getTime())) return json({error:"Inserisci nome, nickname Instagram e orario validi."},400,headers);
      const localDate = toZonedTime(startsAt,TZ).getFullYear()+"-"+String(toZonedTime(startsAt,TZ).getMonth()+1).padStart(2,"0")+"-"+String(toZonedTime(startsAt,TZ).getDate()).padStart(2,"0");
      const data = await availability(serviceId,localDate);
      const chosen = data.slots.find(x => x.starts_at === startsAt.toISOString());
      if (!chosen) return json({error:"Questo orario non è più disponibile. Aggiorna il calendario."},409,headers);
      const { data: inserted, error } = await db.from("appointments").insert({
        service_id:serviceId,customer_name:name,customer_instagram:instagram,
        customer_notes:String(body.notes ?? "").slice(0,1000),
        starts_at:chosen.starts_at,ends_at:chosen.ends_at,status:"pending",source:"website"
      }).select("id,status,starts_at,ends_at").single();
      if (error) return json({error:error.code==="23P01"?"Questo orario è appena stato prenotato. Scegline un altro.":"Impossibile salvare la richiesta."},409,headers);
      let calendarSync: { ok: boolean; configured?: boolean; error?: string } = { ok: false, configured: false };
      try {
        const customerNotes = String(body.notes ?? "").trim();
        const description = [
          "Richiesta dal sito Extensions Ciglia Verbania",
          `Cliente: ${name}`,
          `Instagram: @${instagram}`,
          customerNotes ? `Note: ${customerNotes}` : "",
          `ID prenotazione: ${inserted.id}`,
        ].filter(Boolean).join("\\n");
        const synced = await syncGoogleCalendar({
          action: "upsert",
          bookingId: inserted.id,
          startsAt: chosen.starts_at,
          endsAt: chosen.ends_at,
          title: `IN ATTESA · ${name} · ${data.service.name}`,
          description,
        });
        calendarSync = { ok: synced.ok, configured: true };
      } catch (e) {
        calendarSync = { ok: false, configured: true, error: e instanceof Error ? e.message : "Sincronizzazione Google Calendar non riuscita." };
        console.error("Google Calendar create sync failed", e);
      }
      await notifyCalendar();
      return json({appointment:inserted,message:"Richiesta ricevuta, in attesa di conferma.",calendar_sync:calendarSync},201,headers);
    }
    if (url.pathname.includes("/owner/") || path === "hours" || path === "blocks") {
      if (!owner(req)) return json({error:"Accesso titolare non configurato o non autorizzato."},401,headers);
      if (req.method === "POST" && (path === "confirm" || path === "cancel")) {
        const body = await req.json();
        const id = String(body.id ?? "").trim();
        if (!id) return json({ error: "ID prenotazione mancante." }, 400, headers);
        const { data: appointment, error: ae } = await db.from("appointments")
          .select("id,customer_name,customer_instagram,customer_notes,starts_at,ends_at,status,services(name)")
          .eq("id", id).single();
        if (ae || !appointment) return json({ error: "Prenotazione non trovata." }, 404, headers);
        if (path === "confirm" && appointment.status === "cancelled") return json({ error: "Una richiesta annullata non può essere confermata." }, 409, headers);
        const nextStatus = path === "confirm" ? "confirmed" : "cancelled";
        if (appointment.status === nextStatus) return json({ appointment, message: "Stato già aggiornato." }, 200, headers);
        const { data: updated, error: ue } = await db.from("appointments").update({ status: nextStatus, updated_at: new Date().toISOString() }).eq("id", id).select().single();
        if (ue || !updated) throw ue ?? new Error("Impossibile aggiornare la prenotazione.");
        try {
          if (nextStatus === "cancelled") {
            await syncGoogleCalendar({ action: "delete", bookingId: id });
          } else {
            const serviceName = Array.isArray(appointment.services) ? appointment.services[0]?.name : (appointment.services as {name?:string} | null)?.name;
            const description = [
              "Prenotazione Extensions Ciglia Verbania",
              `Cliente: ${appointment.customer_name}`,
              appointment.customer_instagram ? `Instagram: @${appointment.customer_instagram}` : "",
              appointment.customer_notes ? `Note: ${appointment.customer_notes}` : "",
              `ID prenotazione: ${id}`,
            ].filter(Boolean).join("\\n");
            await syncGoogleCalendar({
              action: "upsert",
              bookingId: id,
              startsAt: appointment.starts_at,
              endsAt: appointment.ends_at,
              title: `CONFERMATO · ${appointment.customer_name}${serviceName ? " · " + serviceName : ""}`,
              description,
            });
          }
        } catch (e) {
          await db.from("appointments").update({ status: appointment.status, updated_at: new Date().toISOString() }).eq("id", id);
          throw new Error("Stato non modificato: sincronizzazione Google Calendar non riuscita. " + (e instanceof Error ? e.message : ""));
        }
        await notifyCalendar();
        return json({ appointment: updated, message: nextStatus === "confirmed" ? "Prenotazione confermata." : "Prenotazione rifiutata ed evento eliminato." }, 200, headers);
      }
      if (req.method === "GET" && path === "hours") {
        const {data,error}=await db.from("business_hours").select("*").order("weekday").order("opens_at"); if(error) throw error; return json({hours:data},200,headers);
      }
      if (req.method === "GET" && path === "special-slots") {
        const from=url.searchParams.get("from") ?? ""; const to=url.searchParams.get("to") ?? "";
        if(!validDate(from)||!validDate(to)) return json({error:"Intervallo date non valido."},400,headers);
        const {data,error}=await db.from("special_slots").select("*").gte("slot_date",from).lte("slot_date",to).order("slot_date").order("starts_at");
        if(error) throw error; return json({special_slots:data},200,headers);
      }
      if (req.method === "POST" && path === "special-slots") {
        const b=await req.json(); const date=String(b.slot_date??""); const time=String(b.starts_at??"");
        if(!validDate(date)||!/^([01]\\d|2[0-3]):[0-5]\\d(:[0-5]\\d)?$/.test(time)) return json({error:"Data o orario non valido."},400,headers);
        const {data,error}=await db.from("special_slots").upsert({slot_date:date,starts_at:time},{onConflict:"slot_date,starts_at"}).select().single();
        if(error) throw error; await notifyCalendar(); return json({special_slot:data},201,headers);
      }
      if (req.method === "DELETE" && path === "special-slots") {
        const id=url.searchParams.get("id"); if(!id) return json({error:"ID mancante."},400,headers);
        const {error}=await db.from("special_slots").delete().eq("id",id); if(error) throw error; await notifyCalendar(); return json({ok:true},200,headers);
      }
      if (req.method === "POST" && path === "hours") {
        const b=await req.json(); const weekday=Number(b.weekday);
        if(!Number.isInteger(weekday)||weekday<0||weekday>6||!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(String(b.opens_at))||!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(String(b.closes_at))||b.opens_at>=b.closes_at) return json({error:"Orario non valido."},400,headers);
        const {data,error}=await db.from("business_hours").insert({weekday,opens_at:b.opens_at,closes_at:b.closes_at,is_active:b.is_active!==false}).select().single(); if(error) throw error; await notifyCalendar(); return json({hour:data},201,headers);
      }
      if (req.method === "DELETE" && path === "hours") {
        const id=url.searchParams.get("id"); if(!id) return json({error:"ID mancante."},400,headers);
        const {error}=await db.from("business_hours").delete().eq("id",id); if(error) throw error; await notifyCalendar(); return json({ok:true},200,headers);
      }
      if (req.method === "GET" && path === "appointments") {
        const from=url.searchParams.get("from") ?? ""; const to=url.searchParams.get("to") ?? "";
        if(!validDate(from)||!validDate(to)) return json({error:"Intervallo date non valido."},400,headers);
        const a=dayRange(from), b=dayRange(to);
        const {data,error}=await db.from("appointments").select("id,customer_name,customer_instagram,customer_phone,customer_notes,starts_at,ends_at,status,source,services(name,price_cents)").gte("starts_at",a.start.toISOString()).lt("starts_at",b.end.toISOString()).order("starts_at");
        if(error) throw error; return json({appointments:data},200,headers);
      }
      if (req.method === "POST" && path === "blocks") {
        const b=await req.json(); const start=new Date(b.starts_at),end=new Date(b.ends_at);
        if(Number.isNaN(start.getTime())||Number.isNaN(end.getTime())||start>=end) return json({error:"Intervallo non valido."},400,headers);
        const {data,error}=await db.from("blocked_dates").insert({starts_at:start.toISOString(),ends_at:end.toISOString(),reason:String(b.reason??"Non disponibile").slice(0,240)}).select().single();
        if(error) throw error; await notifyCalendar(); return json({block:data},201,headers);
      }
    }
    return json({error:"Endpoint non trovato."},404,headers);
  } catch (e) {
    return json({error:e instanceof Error?e.message:"Errore interno."},500,headers);
  }
});