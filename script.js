const activities = [
  { id: 'badminton', name: 'Illini Badminton Intercollegiate Sports Club', category: 'Racket sports', emoji: '🏸', color: 'lime', description: 'Badminton in a competitive but friendly setting for amateur players.', detail: 'This club says it aims to help badminton grow in the community while giving amateur players a place to play and challenge themselves.', tags: ['Badminton', 'Competitive'], url: 'https://one.illinois.edu/illinibadmintonintercollegiatesportsclub/home/' },
  { id: 'fitness', name: 'Barbells and Scalpels Fitness Club', category: 'Fitness', emoji: '💪', color: 'blue', description: 'Find workout partners and learn more about fitness, anatomy, and nutrition.', detail: 'The club focuses on social support for fitness goals and learning about training. Its profile lists workout partners and help with personal fitness plans among the benefits.', tags: ['Workout partners', 'Wellness'], url: 'https://one.illinois.edu/barbellsandscalpelsfitnessclub/home/' },
  { id: 'gymnastics', name: "Flippin' Illini Gymnastics Club", category: 'Movement', emoji: '🤸', color: 'lavender', description: 'A co-ed gymnastics club welcoming newcomers and experienced athletes.', detail: 'The student-run club says no experience is needed to join. Members practice gymnastics and can take part in meets and social events.', tags: ['Beginners welcome', 'Gymnastics'], url: 'https://one.illinois.edu/flippinillinigymnasticsclub/home/' },
  { id: 'climbing', name: 'Climbing Club at UIUC', category: 'Outdoors', emoji: '🧗', color: 'sage', description: 'Meet climbers, learn the sport, and explore club hours and outdoor trips.', detail: 'The club says it introduces climbing to new people. Its profile mentions weekly hours at the ARC wall, social events, outdoor trips, and shared gear.', tags: ['New climbers', 'Outdoor trips'], url: 'https://one.illinois.edu/climbingclub/home/' },
  { id: 'quadball', name: 'Illini Ridgebacks Quadball Team', category: 'Team sports', emoji: '🏐', color: 'sky', description: 'Try a mixed-gender team sport with no prior experience required.', detail: 'Quadball mixes elements of basketball, dodgeball, and rugby. The club describes itself as open to all genders and abilities and says no prior experience is necessary.', tags: ['Beginners welcome', 'Teamwork'], url: 'https://one.illinois.edu/illiniridgebacksquadballteam/home/' },
  { id: 'table-tennis', name: 'Illini Table Tennis Club', category: 'Racket sports', emoji: '🏓', color: 'peach', description: 'Play table tennis and improve your skills with other students.', detail: 'The club says it welcomes experienced and new players to play in a competitive environment and work on their skills.', tags: ['New players', 'Table tennis'], url: 'https://one.illinois.edu/illinitabletennisclub/home/' },
  { id: 'cricket', name: 'Cricket Club of Illinois', category: 'Team sports', emoji: '🏏', color: 'gold', description: 'Play cricket recreationally or competitively around UIUC.', detail: 'The club’s purpose includes building awareness of cricket and offering both recreational and competitive opportunities. Its profile points students to its Instagram for practice and tryout information.', tags: ['Cricket', 'Teamwork'], url: 'https://one.illinois.edu/cricketclub/home/' },
  { id: 'dodgeball', name: 'Illinois Club Dodgeball', category: 'Team sports', emoji: '🔴', color: 'pink', description: 'Play dodgeball with peers through practices and scrimmages.', detail: 'The club describes a friendly, competitive environment. Its profile mentions practices, weekly scrimmages, tournaments, and team bonding.', tags: ['Dodgeball', 'Teamwork'], url: 'https://one.illinois.edu/illinoisclubdodgeball/home/' }
];

const grid = document.querySelector('#activity-grid');
const search = document.querySelector('#search');
const savedOnly = document.querySelector('#saved-only');
const dialog = document.querySelector('#details-dialog');
let activeInterest = 'All';
let saved = new Set();
try { saved = new Set(JSON.parse(localStorage.getItem('fitbuddy-uiuc-saved') || '[]')); } catch { saved = new Set(); }

function saveFavorites() {
  try { localStorage.setItem('fitbuddy-uiuc-saved', JSON.stringify([...saved])); } catch { /* Browsing still works without storage. */ }
}

function matches(activity) {
  const query = search.value.trim().toLowerCase();
  const text = [activity.name, activity.category, activity.description, ...activity.tags].join(' ').toLowerCase();
  return (!query || text.includes(query)) &&
    (activeInterest === 'All' || activity.category === activeInterest) &&
    (!savedOnly.checked || saved.has(activity.id));
}

function render() {
  const visible = activities.filter(matches);
  grid.innerHTML = visible.map(activity => `
    <article class="activity-card">
      <div class="card-visual ${activity.color}"><span class="card-emoji" aria-hidden="true">${activity.emoji}</span><span class="category-label">${activity.category}</span></div>
      <div class="card-body"><div class="card-title-row"><h4>${activity.name}</h4><button class="save-button ${saved.has(activity.id) ? 'is-saved' : ''}" type="button" data-save="${activity.id}" aria-label="${saved.has(activity.id) ? 'Remove' : 'Save'} ${activity.name}" aria-pressed="${saved.has(activity.id)}">${saved.has(activity.id) ? '♥' : '♡'}</button></div>
      <p>${activity.description}</p><div class="tag-list"><span>${activity.tags[0]}</span><span>${activity.tags[1]}</span></div>
      <div class="card-bottom-row"><span>Listed on OneIllinois</span><button class="details-button" type="button" data-details="${activity.id}" aria-label="View details for ${activity.name}">↗</button></div></div>
    </article>`).join('');
  document.querySelector('#result-count').textContent = visible.length;
  document.querySelector('#results-title').textContent = savedOnly.checked ? 'Saved clubs' : 'Clubs for you';
  document.querySelector('#results-status').textContent = `${visible.length} ${visible.length === 1 ? 'club' : 'clubs'} shown`;
  document.querySelector('#empty-state').hidden = visible.length !== 0;
  document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String((button.dataset.view === 'saved') === savedOnly.checked)));
}

function showDetails(activity) {
  document.querySelector('#dialog-content').innerHTML = `
    <div class="dialog-visual ${activity.color}"><span aria-hidden="true">${activity.emoji}</span></div>
    <span class="section-kicker">${activity.category}</span><h2 id="dialog-title">${activity.name}</h2><p class="dialog-description">${activity.description}</p>
    <h3>About this club</h3><p>${activity.detail}</p>
    <p class="demo-note">Meeting times and joining details may change. Check the official club page before you go.</p>
    <a class="primary-button official-link" href="${activity.url}" target="_blank" rel="noopener noreferrer">Open on OneIllinois ↗</a>
    <button class="secondary-button dialog-save" type="button" data-save="${activity.id}">${saved.has(activity.id) ? 'Saved ♥' : 'Save activity ♡'}</button>`;
  dialog.showModal();
}

document.querySelectorAll('[data-interest]').forEach(button => button.addEventListener('click', () => {
  activeInterest = button.dataset.interest;
  document.querySelectorAll('[data-interest]').forEach(chip => {
    const active = chip === button;
    chip.classList.toggle('active', active);
    chip.setAttribute('aria-pressed', String(active));
  });
  render();
}));

[search, savedOnly].forEach(control => control.addEventListener(control === search ? 'input' : 'change', render));
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
  savedOnly.checked = button.dataset.view === 'saved';
  if (savedOnly.checked) {
    search.value = '';
    document.querySelector('[data-interest="All"]').click();
  }
  render();
  document.querySelector('#explore').scrollIntoView({ behavior: 'smooth' });
}));
document.querySelector('#clear-filters').addEventListener('click', () => {
  search.value = ''; savedOnly.checked = false;
  document.querySelector('[data-interest="All"]').click();
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
