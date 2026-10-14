const activities = (window.fitBuddyDirectory?.clubs || []).map(club => {
  const categories = club.categories || [];
  let emoji = '✳', color = 'sage';
  if (categories.includes('Athletic & Recreation') || categories.includes('Club Sports')) { emoji = '⚽'; color = 'lime'; }
  else if (categories.includes('Health & Wellness')) { emoji = '💪'; color = 'blue'; }
  else if (categories.includes('Performance Arts') || categories.includes('Media Arts')) { emoji = '🎨'; color = 'lavender'; }
  else if (categories.includes('Social & Leisure')) { emoji = '✦'; color = 'peach'; }
  return {
    ...club, emoji, color,
    description: club.mission || 'Explore this UIUC student group on OneIllinois.',
    detail: club.mission || 'This group has not added a public mission to the directory.',
    tags: categories.length ? categories.slice(0, 2) : [club.type],
    url: 'https://one.illinois.edu/club_signup?search=' + encodeURIComponent(club.name)
  };
});

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[character]));
}

// Curated listings remain available alongside the wider public OneIllinois feed.
const curatedEvents = [
  { date:'2026-10-16', title:'Badminton for Fun practice', host:'Badminton For Fun', time:'6–8 PM', start:'18:00', end:'20:00', type:'Member practice', emoji:'🏸', url:'https://one.illinois.edu/badmintonforfun/rsvp_boot?id=480258' },
  { date:'2026-10-17', title:'Going the Distance 5K', host:'AMSA Pre-Med', time:'7–11 AM', start:'07:00', end:'11:00', type:'Run or walk', emoji:'🏃', url:'https://one.illinois.edu/americanmedicalstudentassociationpremed/rsvp_boot?id=479807' },
  { date:'2026-10-17', title:'Men’s Club Soccer vs DePaul', host:'Illinois Men’s Soccer Club', time:'1–4 PM', start:'13:00', end:'16:00', type:'Club match', emoji:'⚽', url:'https://one.illinois.edu/illinoismenssoccerclub/rsvp_boot?id=491223' },
  { date:'2026-10-17', title:'Badminton for Fun practice', host:'Badminton For Fun', time:'6–8 PM', start:'18:00', end:'20:00', type:'Member practice', emoji:'🏸', url:'https://one.illinois.edu/badmintonforfun/rsvp_boot?id=480259' },
  { date:'2026-10-18', title:'Men’s Club Soccer vs UIC', host:'Illinois Men’s Soccer Club', time:'12–3 PM', start:'12:00', end:'15:00', type:'Club match', emoji:'⚽', url:'https://one.illinois.edu/illinoismenssoccerclub/rsvp_boot?id=491226' },
  { date:'2026-10-23', title:'Badminton for Fun practice', host:'Badminton For Fun', time:'6–8 PM', start:'18:00', end:'20:00', type:'Member practice', emoji:'🏸', url:'https://one.illinois.edu/badmintonforfun/rsvp_boot?id=480260' },
  { date:'2026-10-24', title:'Badminton for Fun practice', host:'Badminton For Fun', time:'6–8 PM', start:'18:00', end:'20:00', type:'Member practice', emoji:'🏸', url:'https://one.illinois.edu/badmintonforfun/rsvp_boot?id=480261' },
  { date:'2026-10-28', title:'Illini CHAARG workout', host:'Illini CHAARG', time:'6–7 PM', start:'18:00', end:'19:00', type:'Workout', emoji:'🧘', url:'https://one.illinois.edu/illinichaarg/rsvp_boot?id=480577' },
  { date:'2026-10-28', title:'K-pop dance workshop', host:'Re: verie', time:'7–8 PM', start:'19:00', end:'20:00', type:'Dance', emoji:'💃', url:'https://one.illinois.edu/reverie/rsvp_boot?id=479330' },
  { date:'2026-10-30', title:'Badminton for Fun practice', host:'Badminton For Fun', time:'6–8 PM', start:'18:00', end:'20:00', type:'Member practice', emoji:'🏸', url:'https://one.illinois.edu/badmintonforfun/rsvp_boot?id=480262' },
  { date:'2026-10-31', title:'Badminton for Fun practice', host:'Badminton For Fun', time:'6–8 PM', start:'18:00', end:'20:00', type:'Member practice', emoji:'🏸', url:'https://one.illinois.edu/badmintonforfun/rsvp_boot?id=480263' }
];
const publicEvents = window.fitBuddyPublicEvents?.events || [];
const eventKey = event => new URL(event.url).searchParams.get('id') || event.url;
const events = [...new Map([...curatedEvents, ...publicEvents].map(event => [eventKey(event), event])).values()]
  .sort((a, b) => (a.date + a.start + a.title).localeCompare(b.date + b.start + b.title));

const grid = document.querySelector('#activity-grid');
const search = document.querySelector('#search');
const savedOnly = document.querySelector('#saved-only');
const dialog = document.querySelector('#details-dialog');
let activeInterest = 'All';
let activeView = 'calendar';
let displayLimit = 30;
let saved = new Set();
try { saved = new Set(JSON.parse(localStorage.getItem('fitbuddy-uiuc-saved') || '[]')); } catch { saved = new Set(); }

const todayKey = new Intl.DateTimeFormat('sv-SE', { timeZone:'America/Chicago', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date());
const initialMonth = todayKey.slice(0, 7);
let calendarMonth = initialMonth;
let selectedDate = null;
let eventLimit = 20;
let busyBlocks = [];
try { busyBlocks = JSON.parse(localStorage.getItem('fitbuddy-busy-times') || '[]').filter(block => block && block.date && block.start && block.end); } catch { busyBlocks = []; }

function eventConflicts(event) {
  if (event.time === 'All day') return busyBlocks.some(block => block.date === event.date);
  return busyBlocks.some(block => block.date === event.date && event.start < block.end && event.end > block.start);
}

function saveBusyBlocks() {
  try { localStorage.setItem('fitbuddy-busy-times', JSON.stringify(busyBlocks)); } catch { /* Calendar remains usable without storage. */ }
}

function renderBusyBlocks() {
  const count = busyBlocks.length;
  document.querySelector('#availability-note').textContent = count
    ? `${count} busy ${count === 1 ? 'time' : 'times'} saved. Event labels check against these times only.`
    : 'Add class or work times to check for overlaps.';
  document.querySelector('#busy-list').innerHTML = count
    ? [...busyBlocks].sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)).map(block => `<div class="busy-item"><div><strong>${escapeHTML(block.label || 'Busy')}</strong><span>${escapeHTML(fullDate(block.date))} · ${escapeHTML(block.start)}–${escapeHTML(block.end)} CT</span></div><button type="button" data-remove-busy="${escapeHTML(block.id)}" aria-label="Remove busy time">×</button></div>`).join('')
    : '<p class="no-busy-times">No busy times added yet.</p>';
}

function saveFavorites() {
  try { localStorage.setItem('fitbuddy-uiuc-saved', JSON.stringify([...saved])); } catch { /* Browsing still works without storage. */ }
}

function monthName(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { month:'long', year:'numeric', timeZone:'UTC' }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function fullDate(dateKey) {
  return new Intl.DateTimeFormat('en-US', { weekday:'long', month:'short', day:'numeric', timeZone:'UTC' }).format(new Date(dateKey + 'T12:00:00Z'));
}

function shiftMonth(monthKey, amount) {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + amount, 1));
  return date.toISOString().slice(0, 7);
}

function renderCalendar() {
  const [year, month] = calendarMonth.split('-').map(Number);
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const numberOfDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthEvents = events.filter(event => event.date.startsWith(calendarMonth) && event.date >= todayKey);
  document.querySelector('#calendar-month').textContent = monthName(calendarMonth);
  document.querySelector('#previous-month').disabled = calendarMonth <= initialMonth;
  document.querySelector('#calendar-grid').innerHTML =
    Array.from({ length:firstWeekday }, () => '<span class="calendar-blank" aria-hidden="true"></span>').join('') +
    Array.from({ length:numberOfDays }, (_, index) => {
      const day = index + 1;
      const key = calendarMonth + '-' + String(day).padStart(2, '0');
      const count = monthEvents.filter(event => event.date === key).length;
      const past = key < todayKey;
      return `<button class="calendar-day ${count ? 'has-event' : ''} ${key === todayKey ? 'is-today' : ''} ${key === selectedDate ? 'is-selected' : ''}" type="button" data-date="${key}" ${past ? 'disabled' : ''} aria-label="${fullDate(key)}${count ? ', ' + count + ' event' + (count === 1 ? '' : 's') : ''}" aria-pressed="${key === selectedDate}"><span>${day}</span>${count ? '<i aria-hidden="true"></i>' : ''}</button>`;
    }).join('');

  const visible = monthEvents.filter(event => (!selectedDate || event.date === selectedDate) && (!document.querySelector('#fit-only').checked || !eventConflicts(event)));
  document.querySelector('#event-list-title').textContent = selectedDate ? fullDate(selectedDate) : 'Upcoming events';
  document.querySelector('#show-all-events').hidden = !selectedDate;
  document.querySelector('#event-list').innerHTML = visible.slice(0, selectedDate ? undefined : eventLimit).map(event => {
    const day = event.date.slice(-2);
    const shortMonth = new Intl.DateTimeFormat('en-US', { month:'short', timeZone:'UTC' }).format(new Date(event.date + 'T12:00:00Z'));
    const fitLabel = busyBlocks.length ? (eventConflicts(event) ? '<span class="event-fit conflict">Time conflict</span>' : '<span class="event-fit available">Fits your busy times</span>') : '';
    return `<article class="event-card"><div class="event-date"><span>${shortMonth}</span><strong>${Number(day)}</strong></div><div class="event-card-main"><span class="event-type">${escapeHTML(event.type)}</span><h3>${escapeHTML(event.title)}</h3><p>${escapeHTML(event.host)}</p><span class="event-time">◷ ${escapeHTML(event.time)}${event.time === 'All day' ? '' : ' CT'}</span>${fitLabel}<a class="event-join" href="${event.url}" target="_blank" rel="noopener noreferrer" aria-label="View and join ${escapeHTML(event.title)} on OneIllinois">View &amp; join on OneIllinois ↗</a></div></article>`;
  }).join('');
  const moreEvents = document.querySelector('#show-more-events');
  moreEvents.hidden = !!selectedDate || visible.length <= eventLimit;
  moreEvents.textContent = `Show more events (${visible.length - eventLimit} left)`;
  document.querySelector('#event-empty').hidden = visible.length !== 0;
  document.querySelector('#event-empty h3').textContent = document.querySelector('#fit-only').checked && monthEvents.length ? 'No events fit this schedule' : 'No events shown';
  document.querySelector('#event-empty p').textContent = document.querySelector('#fit-only').checked && monthEvents.length ? 'Try a different date or turn off the schedule filter.' : 'Browse OneIllinois for the latest activities.';
}

function setView(view) {
  activeView = view;
  document.querySelector('[data-screen="calendar"]').hidden = view !== 'calendar';
  document.querySelector('[data-screen="clubs"]').hidden = view === 'calendar';
  savedOnly.checked = view === 'saved';
  displayLimit = 30;
  if (view === 'saved') {
    search.value = '';
    document.querySelector('[data-interest="All"]').click();
  }
  render();
  document.querySelector('.app-content').scrollTo({ top:0, behavior:'smooth' });
}

function matches(activity) {
  const query = search.value.trim().toLowerCase();
  const text = [activity.name, activity.type, activity.description, ...activity.categories].join(' ').toLowerCase();
  const categoryMatch = activeInterest === 'All' ||
    (activeInterest === 'Sports' && (activity.categories.includes('Athletic & Recreation') || activity.categories.includes('Club Sports'))) ||
    (activeInterest === 'Wellness' && (activity.categories.includes('Health & Wellness') || activity.categories.includes('Health & Human Sciences'))) ||
    (activeInterest === 'Arts' && (activity.categories.includes('Performance Arts') || activity.categories.includes('Media Arts'))) ||
    (activeInterest === 'Social' && activity.categories.includes('Social & Leisure'));
  return (!query || text.includes(query)) &&
    categoryMatch &&
    (!savedOnly.checked || saved.has(activity.id));
}

function render() {
  const visible = activities.filter(matches);
  grid.innerHTML = visible.slice(0, displayLimit).map(activity => `
    <article class="activity-card">
      <div class="card-visual ${activity.color}"><span class="card-emoji" aria-hidden="true">${activity.emoji}</span></div>
      <div class="card-body"><div class="card-title-row"><h4>${escapeHTML(activity.name)}</h4><button class="save-button ${saved.has(activity.id) ? 'is-saved' : ''}" type="button" data-save="${activity.id}" aria-label="${saved.has(activity.id) ? 'Remove' : 'Save'} ${escapeHTML(activity.name)}" aria-pressed="${saved.has(activity.id)}">${saved.has(activity.id) ? '♥' : '♡'}</button></div>
      <p>${escapeHTML(activity.description)}</p><div class="tag-list">${activity.tags.map(tag => `<span>${escapeHTML(tag)}</span>`).join('')}</div>
      <div class="card-bottom-row"><span>${escapeHTML(activity.type)}</span><button class="details-button" type="button" data-details="${activity.id}" aria-label="View details for ${escapeHTML(activity.name)}">↗</button></div></div>
    </article>`).join('');
  document.querySelector('#result-count').textContent = visible.length;
  document.querySelector('#results-title').textContent = savedOnly.checked ? 'Saved clubs' : 'UIUC groups';
  document.querySelector('#results-status').textContent = `Showing ${Math.min(displayLimit, visible.length)} of ${visible.length}`;
  document.querySelector('#load-more').hidden = visible.length <= displayLimit;
  document.querySelector('#empty-state').hidden = visible.length !== 0;
  document.querySelector('#empty-title').textContent = savedOnly.checked ? 'No saved clubs yet' : 'No clubs found';
  document.querySelector('#empty-message').textContent = savedOnly.checked ? 'Tap the heart on a club to save it here.' : 'Try a different search or clear a filter.';
  document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === activeView)));
}

function showDetails(activity) {
  document.querySelector('#dialog-content').innerHTML = `
    <div class="dialog-visual ${activity.color}"><span aria-hidden="true">${activity.emoji}</span></div>
    <span class="section-kicker">${escapeHTML(activity.type)}</span><h2 id="dialog-title">${escapeHTML(activity.name)}</h2>
    <div class="detail-tags">${activity.categories.map(category => `<span>${escapeHTML(category)}</span>`).join('')}</div>
    <h3>About this group</h3><p>${escapeHTML(activity.detail)}</p>
    <p class="demo-note">Directory information was captured October 14, 2026. Check OneIllinois for current details.</p>
    <a class="primary-button official-link" href="${activity.url}" target="_blank" rel="noopener noreferrer">View &amp; join on OneIllinois ↗</a>
    <button class="secondary-button dialog-save" type="button" data-save="${activity.id}">${saved.has(activity.id) ? 'Saved ♥' : 'Save club ♡'}</button>`;
  if (!dialog.open) dialog.showModal();
}

document.querySelectorAll('[data-interest]').forEach(button => button.addEventListener('click', () => {
  activeInterest = button.dataset.interest;
  displayLimit = 30;
  document.querySelectorAll('[data-interest]').forEach(chip => {
    const active = chip === button;
    chip.classList.toggle('active', active);
    chip.setAttribute('aria-pressed', String(active));
  });
  render();
}));

search.addEventListener('input', () => { displayLimit = 30; render(); });
document.querySelector('#load-more').addEventListener('click', () => { displayLimit += 30; render(); });
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
document.querySelector('#fit-only').addEventListener('change', renderCalendar);
const availabilityDialog = document.querySelector('#availability-dialog');
const busyDate = document.querySelector('#busy-date');
busyDate.min = todayKey;
busyDate.value = todayKey;
document.querySelector('#add-busy-time').addEventListener('click', () => availabilityDialog.showModal());
document.querySelector('.availability-close').addEventListener('click', () => availabilityDialog.close());
availabilityDialog.addEventListener('click', event => { if (event.target === availabilityDialog) availabilityDialog.close(); });
document.querySelector('#busy-form').addEventListener('submit', event => {
  event.preventDefault();
  const date = busyDate.value;
  const start = document.querySelector('#busy-start').value;
  const end = document.querySelector('#busy-end').value;
  const error = document.querySelector('#busy-error');
  if (date < todayKey || end <= start) {
    error.textContent = 'Choose a future date and an end time after the start time.';
    return;
  }
  busyBlocks.push({ id:String(Date.now()) + Math.random().toString(36).slice(2, 6), date, start, end, label:document.querySelector('#busy-label').value.trim() || 'Busy' });
  saveBusyBlocks();
  renderBusyBlocks();
  renderCalendar();
  error.textContent = '';
  event.target.reset();
  busyDate.value = todayKey;
});
document.querySelector('#busy-list').addEventListener('click', event => {
  const button = event.target.closest('[data-remove-busy]');
  if (!button) return;
  busyBlocks = busyBlocks.filter(block => block.id !== button.dataset.removeBusy);
  saveBusyBlocks();
  renderBusyBlocks();
  renderCalendar();
});
document.querySelector('#calendar-grid').addEventListener('click', event => {
  const button = event.target.closest('[data-date]');
  if (!button) return;
  selectedDate = button.dataset.date;
  renderCalendar();
});
document.querySelector('#show-all-events').addEventListener('click', () => { selectedDate = null; renderCalendar(); });
document.querySelector('#show-more-events').addEventListener('click', () => { eventLimit += 20; renderCalendar(); });
document.querySelector('#previous-month').addEventListener('click', () => { calendarMonth = shiftMonth(calendarMonth, -1); selectedDate = null; renderCalendar(); });
document.querySelector('#next-month').addEventListener('click', () => { calendarMonth = shiftMonth(calendarMonth, 1); selectedDate = null; renderCalendar(); });
document.querySelector('#clear-filters').addEventListener('click', () => {
  search.value = ''; savedOnly.checked = false;
  document.querySelector('[data-interest="All"]').click();
  setView('explore');
  search.focus();
});

document.addEventListener('click', event => {
  const saveButton = event.target.closest('[data-save]');
  const detailsButton = event.target.closest('[data-details]');
  if (saveButton) {
    const id = saveButton.dataset.save;
    if (saved.has(id)) saved.delete(id); else saved.add(id);
    saveFavorites(); render();
    if (dialog.open) showDetails(activities.find(activity => activity.id === id));
  }
  if (detailsButton) showDetails(activities.find(activity => activity.id === detailsButton.dataset.details));
});
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
document.addEventListener('keydown', event => { if (event.key === '/' && document.activeElement !== search && !dialog.open) { event.preventDefault(); search.focus(); } });
render();
renderCalendar();
renderBusyBlocks();
