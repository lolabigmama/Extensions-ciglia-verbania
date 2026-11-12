/**
 * Google Apps Script bridge for Extensions Ciglia Verbania.
 *
 * Deploy as a Web App executing as the script owner.
 * Store GOOGLE_BRIDGE_TOKEN and GOOGLE_CALENDAR_ID in Script Properties.
 */
const TZ = "Europe/Rome";
const BOOKING_ID_PREFIX = "EXTENSIONS_BOOKING_ID=";

function doPost(e) {
  try {
    const props = PropertiesService.getScriptProperties();
    const expectedToken = props.getProperty("GOOGLE_BRIDGE_TOKEN") || "";
    const calendarId = props.getProperty("GOOGLE_CALENDAR_ID") || "";
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");

    if (!expectedToken || !calendarId || !body.token ||
        !constantTimeEquals_(String(body.token), expectedToken)) {
      return json_({ ok: false, error: "Unauthorized or bridge not configured." });
    }

    const action = String(body.action || "");
    const bookingId = String(body.bookingId || "");
    if (!bookingId || !/^[0-9a-f-]{36}$/i.test(bookingId)) {
      return json_({ ok: false, error: "Invalid bookingId." });
    }

    const calendar = CalendarApp.getCalendarById(calendarId);
    if (!calendar) return json_({ ok: false, error: "Target calendar not found." });

    const propsKey = "booking_" + bookingId;
    const eventId = props.getProperty(propsKey);

    if (action === "delete") {
      if (eventId) {
        const existing = calendar.getEventById(eventId);
        if (existing) existing.deleteEvent();
        props.deleteProperty(propsKey);
      }
      return json_({ ok: true, action: "delete", bookingId: bookingId });
    }

    if (action !== "upsert") {
      return json_({ ok: false, error: "Unsupported action." });
    }

    const start = new Date(String(body.startsAt || ""));
    const end = new Date(String(body.endsAt || ""));
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      return json_({ ok: false, error: "Invalid event date/time." });
    }

    const title = String(body.title || "Prenotazione Extensions Ciglia").slice(0, 250);
    const description = String(body.description || "").slice(0, 8000) +
      "\n\n" + BOOKING_ID_PREFIX + bookingId;

    let event = eventId ? calendar.getEventById(eventId) : null;
    if (event) {
      event.setTitle(title);
      event.setTime(start, end);
      event.setDescription(description);
    } else {
      // Recover safely if the script property was lost after a successful create.
      const matches = calendar.getEvents(
        new Date(start.getTime() - 86400000),
        new Date(end.getTime() + 86400000)
      ).filter(function (candidate) {
        return (candidate.getDescription() || "").indexOf(BOOKING_ID_PREFIX + bookingId) !== -1;
      });
      if (matches.length) {
        event = matches[0];
        event.setTitle(title);
        event.setTime(start, end);
        event.setDescription(description);
        // Remove any accidental duplicates for the same booking id.
        matches.slice(1).forEach(function (duplicate) { duplicate.deleteEvent(); });
      } else {
        event = calendar.createEvent(title, start, end, { description: description });
      }
    }

    props.setProperty(propsKey, event.getId());
    return json_({ ok: true, action: "upsert", bookingId: bookingId, eventId: event.getId() });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function constantTimeEquals_(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
