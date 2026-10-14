"""Create FitBuddy's public event snapshot from OneIllinois calendar data."""

import json
import quopri
import re
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo


ROOT = Path(__file__).parent
SOURCE = "https://one.illinois.edu/ical/urbanachampaign/ical_urbanachampaign.ics"
CHICAGO = ZoneInfo("America/Chicago")
GROUP_CATEGORIES = {"Athletic & Recreation", "Club Sports", "Health & Wellness"}


def properties(block):
    result = {}
    for line in re.sub(r"\r?\n[ \t]", "", block).splitlines():
        if line.startswith("ORGANIZER;CN="):
            host = re.match(r'ORGANIZER;CN=(?:"([^"]+)"|([^:]+)):', line)
            if host:
                result["HOST"] = host.group(1) or host.group(2)
        if ":" in line:
            key, value = line.split(":", 1)
            result[key.split(";", 1)[0]] = value
    return result


def event_time(value):
    if re.fullmatch(r"\d{8}", value):
        return datetime.strptime(value, "%Y%m%d").replace(tzinfo=CHICAGO), True
    if value.endswith("Z"):
        return datetime.strptime(value, "%Y%m%dT%H%M%SZ").replace(tzinfo=timezone.utc).astimezone(CHICAGO), False
    return datetime.strptime(value, "%Y%m%dT%H%M%S").replace(tzinfo=CHICAGO), False


def main():
    raw_directory = (ROOT / "club-directory.js").read_text()
    directory = json.loads(raw_directory[raw_directory.index("{"):].rstrip(";\n"))
    clubs = {
        club["name"].casefold(): club["name"]
        for club in directory["clubs"]
        if GROUP_CATEGORIES.intersection(club["categories"])
    }
    request = urllib.request.Request(SOURCE, headers={"User-Agent": "FitBuddy public-event-calendar/1.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        calendar = response.read().decode("utf-8-sig")
    today = datetime.now(CHICAGO).date()
    cutoff = today + timedelta(days=120)
    events = []
    seen = set()
    for block in calendar.split("BEGIN:VEVENT")[1:]:
        item = properties(block.split("END:VEVENT", 1)[0])
        host = item.get("HOST", "")
        if host.casefold() not in clubs or not item.get("DTSTART") or not item.get("URL"):
            continue
        start, all_day = event_time(item["DTSTART"])
        end, _ = event_time(item.get("DTEND", item["DTSTART"]))
        if not today <= start.date() <= cutoff:
            continue
        url = item["URL"].strip()
        if not url.startswith("https://one.illinois.edu/") or url in seen:
            continue
        seen.add(url)
        title = quopri.decodestring(item.get("SUMMARY", "Event")).decode("utf-8", "replace")
        category = re.search(r"CATEGORIES;X-CG-CATEGORY=event_type:(.*)", block)
        event_type = category.group(1).strip() if category else "Club event"
        time = "All day" if all_day else start.strftime("%-I:%M %p") + "–" + end.strftime("%-I:%M %p")
        events.append({
            "date": start.date().isoformat(), "title": title, "host": clubs[host.casefold()],
            "time": time, "start": start.strftime("%H:%M"), "end": end.strftime("%H:%M"),
            "type": event_type, "url": url,
        })
    events.sort(key=lambda event: (event["date"], event["start"], event["title"]))
    output = {"updated": today.isoformat(), "source": SOURCE, "events": events}
    (ROOT / "public-events.js").write_text("window.fitBuddyPublicEvents = " + json.dumps(output, ensure_ascii=False, separators=(",", ":")) + ";\n")
    print(f"Saved {len(events)} upcoming public events")


if __name__ == "__main__":
    main()
