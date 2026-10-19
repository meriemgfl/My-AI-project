import { useEffect, useState } from 'react';
import { addInventoryProduct, getHealth, getInventory, getProducts, getProfile, getRoutine, getRoutines, getSuggestion, removeInventoryProduct, saveProfile, saveRoutine } from './api/client.js';

const concerns = [
  { id: 'dry-skin', label: 'Dry skin' },
  { id: 'aging', label: 'Aging skin' },
  { id: 'fine-lines', label: 'Fine lines' },
  { id: 'rosacea', label: 'Rosacea' },
  { id: 'sun-damage', label: 'Sun damage' },
  { id: 'dark-spots', label: 'Dark spots' },
  { id: 'uneven-tone', label: 'Uneven tone' },
  { id: 'blackheads', label: 'Blackheads' },
];

const initialAnswers = {
  selectedConcernIds: [],
  selectedProductIds: [],
  period: 'day',
  preferredTime: '08:00',
  usesPerWeek: 7,
};

function formatTime(value) {
  const [rawHour, rawMinute] = value.split(':').map(Number);
  const suffix = rawHour < 12 ? 'AM' : 'PM';
  const hour = rawHour % 12 || 12;
  return `${hour}:${String(rawMinute).padStart(2, '0')} ${suffix}`;
}

function Header({ onHome, demoMode }) {
  return (
    <header className="topbar">
      <button className="wordmark" onClick={onHome} aria-label="Go to home">
        <span className="mark">s</span><span>skin notes</span>
      </button>
      <span className={`header-tag ${demoMode ? 'demo-tag' : ''}`}>{demoMode ? 'DEMO · FICTIONAL SAMPLE DATA' : 'YOUR SKIN, YOUR PACE'}</span>
    </header>
  );
}

function ProductCard({ product, selected, onToggle }) {
  const detailsMissing = !product.ingredients || !product.sourceUrl;
  return (
    <label className={`product-card ${selected ? 'is-selected' : ''}`}>
      <input type="checkbox" checked={selected} onChange={() => onToggle(product.id)} />
      <span className="checkmark" aria-hidden="true">✓</span>
      <span className="product-content">
        <span className="product-topline"><span className="category">{product.categoryLabel}</span><span className="price">{product.priceLabel}</span></span>
        <strong>{product.name}</strong>
        <span className="brand">{product.brand}</span>
        <span className="benefits">{product.benefits.join(' · ')}</span>
        {detailsMissing && <span className="source-note">Some product details are not verified yet</span>}
        {product.sourceUrl && <a className="source-link" href={product.sourceUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>Official product details ↗</a>}
      </span>
    </label>
  );
}

function App() {
  const [screen, setScreen] = useState('home');
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [selectedRoutine, setSelectedRoutine] = useState(null);
  const [savedRoutineId, setSavedRoutineId] = useState(null);
  const [savingRoutine, setSavingRoutine] = useState(false);
  const [search, setSearch] = useState('');
  const [expiryDates, setExpiryDates] = useState({});
  const [answers, setAnswers] = useState(initialAnswers);
  const [suggestion, setSuggestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getProducts(), getInventory(), getProfile(), getRoutines(), getHealth()])
      .then(([catalog, shelf, savedProfile, savedRoutines, health]) => {
        setProducts(catalog.products);
        setInventory(shelf.products);
        setRoutines(savedRoutines.routines);
        setDemoMode(health.demoMode);
        setAnswers((current) => ({ ...savedProfile.profile, selectedProductIds: shelf.products.filter((product) => !product.expiryDate || product.expiryDate >= new Date().toISOString().slice(0, 10)).map((product) => product.id) }));
      })
      .catch((problem) => setError(problem.message))
      .finally(() => setLoading(false));
  }, []);

  function toggleConcern(id) {
    setAnswers((current) => ({
      ...current,
      selectedConcernIds: current.selectedConcernIds.includes(id)
        ? current.selectedConcernIds.filter((item) => item !== id)
        : [...current.selectedConcernIds, id],
    }));
  }

  function toggleProduct(id) {
    setAnswers((current) => ({
      ...current,
      selectedProductIds: current.selectedProductIds.includes(id)
        ? current.selectedProductIds.filter((item) => item !== id)
        : [...current.selectedProductIds, id],
    }));
  }

  async function createSuggestion(event) {
    event.preventDefault();
    setError('');
    setSavedRoutineId(null);
    setSubmitting(true);
    try {
      await saveProfile({ selectedConcernIds: answers.selectedConcernIds, period: answers.period, preferredTime: answers.preferredTime, usesPerWeek: answers.usesPerWeek });
      setSuggestion(await getSuggestion(answers));
      setScreen('results');
    } catch (problem) {
      setError(problem.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function persistRoutine() {
    setError('');
    setSavingRoutine(true);
    try {
      const result = await saveRoutine(answers);
      setRoutines((current) => current.some((routine) => routine.id === result.routine.id) ? current : [result.routine, ...current]);
      setSavedRoutineId(result.routine.id);
    } catch (problem) { setError(problem.message); }
    finally { setSavingRoutine(false); }
  }

  async function openRoutine(id) {
    setError('');
    try {
      const result = await getRoutine(id);
      setSelectedRoutine(result.routine);
      setScreen('routine-detail');
    } catch (problem) { setError(problem.message); }
  }

  async function addProduct(productId) {
    try {
      await addInventoryProduct(productId, expiryDates[productId] || null);
      const result = await getInventory();
      setInventory(result.products);
      setAnswers((current) => ({ ...current, selectedProductIds: [...new Set([...current.selectedProductIds, productId])] }));
      setError('');
    } catch (problem) { setError(problem.message); }
  }

  async function removeProduct(productId) {
    try {
      await removeInventoryProduct(productId);
      setInventory((current) => current.filter((product) => product.id !== productId));
      setAnswers((current) => ({ ...current, selectedProductIds: current.selectedProductIds.filter((id) => id !== productId) }));
    } catch (problem) { setError(problem.message); }
  }

  function goHome() {
    setScreen('home');
    setError('');
  }

  return (
    <div className="app-shell">
      <Header onHome={goHome} demoMode={demoMode} />
      <main className="phone-frame">
        {screen === 'home' && (
          <section className="welcome-screen">
            <div className="dashboard-greeting">
              <div><p className="eyebrow">A LITTLE CARE, EVERY DAY</p><p className="greeting-copy">Let’s make skincare<br />feel simple.</p></div>
              <button type="button" className="profile-bubble" aria-label="Edit your skin profile" title="Edit your skin profile" onClick={() => setScreen('questionnaire')}>S</button>
            </div>
            <article className="daily-hero">
              <div className="hero-art" aria-hidden="true"><span className="hero-orbit orbit-one"/><span className="hero-orbit orbit-two"/><span className="hero-face">✳</span></div>
              <div className="hero-copy"><span className="hero-kicker">YOUR DAILY PLAN</span><h1>Today’s routine<br /><em>to protect your skin.</em></h1><p>A few thoughtful steps, built around your products.</p></div>
              <button className="hero-cta" onClick={() => setScreen('questionnaire')} aria-label="Create your routine">Start my routine <span>↗</span></button>
            </article>
            {routines.length > 0 && <section className="saved-routines-section">
              <div className="dashboard-section-heading"><h2>Your routines</h2><span>{routines.length} SAVED</span></div>
              <div className="saved-routines-list">
                {routines.map((routine) => <button className="saved-routine-card" key={routine.id} onClick={() => openRoutine(routine.id)}>
                  <span className="routine-card-icon">{routine.period === 'day' ? '☼' : '☾'}</span>
                  <span className="saved-routine-copy"><strong>{routine.title}</strong><small>{routine.matchedConcerns.join(' · ') || 'Personal routine'}</small><small>{formatTime(routine.preferredTime)} <span>·</span> {routine.usesPerWeek} days / week</small></span>
                  <span className="saved-routine-arrow">›</span>
                </button>)}
              </div>
            </section>}
            <div className="dashboard-section-heading"><h2>Your skincare space</h2><span>JUST FOR YOU</span></div>
            <div className="dashboard-actions">
              <button className="dashboard-action" onClick={() => setScreen('questionnaire')}><span className="action-icon icon-routine">✳</span><span><strong>Build a routine</strong><small>Find a rhythm that works for you</small></span><b>›</b></button>
              <button className="dashboard-action" onClick={() => setScreen('products')}><span className="action-icon icon-products">▧</span><span><strong>My products</strong><small>{inventory.length ? `${inventory.length} products on your shelf` : 'Add products from your shelf'}</small></span><b>›</b></button>
              <button className="dashboard-action" onClick={() => setScreen('questionnaire')}><span className="action-icon icon-concerns">♡</span><span><strong>Skin concerns</strong><small>Choose what you’d like to focus on</small></span><b>›</b></button>
            </div>
            <p className="home-note"><span className="note-dot" /> Gentle suggestions, based on what you own</p>
          </section>
        )}

        {screen === 'questionnaire' && (
          <form className="flow-screen" onSubmit={createSuggestion}>
            <button type="button" className="back-link" onClick={goHome}>← <span>Home</span></button>
            <div className="progress"><span style={{ width: '100%' }} /></div>
            <p className="eyebrow">YOUR ROUTINE · 1 OF 1</p>
            <h1>What would you<br /><em>like to focus on?</em></h1>
            <p className="intro">Choose all that feel relevant. We’ll use your products and preferences to shape a routine.</p>

            <fieldset>
              <legend>Skin concerns <span>Select any</span></legend>
              <div className="concern-grid">
                {concerns.map((concern) => (
                  <button
                    key={concern.id}
                    type="button"
                    className={`chip ${answers.selectedConcernIds.includes(concern.id) ? 'active' : ''}`}
                    aria-pressed={answers.selectedConcernIds.includes(concern.id)}
                    onClick={() => toggleConcern(concern.id)}
                  >{concern.label}</button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend>Your products <span>{answers.selectedProductIds.length} selected</span></legend>
              <div className="product-list">
                {loading ? <p className="small-note">Loading the product shelf…</p> : inventory.filter((product) => !product.expiryDate || product.expiryDate >= new Date().toISOString().slice(0, 10)).map((product) => (
                  <ProductCard key={product.id} product={product} selected={answers.selectedProductIds.includes(product.id)} onToggle={toggleProduct} />
                ))}
              </div>
              <p className="small-note">Expired products are left out. Check product labels when details are missing.</p>
            </fieldset>

            <fieldset>
              <legend>When works for you?</legend>
              <div className="schedule-row">
                <label className="field-label">Routine time
                  <select value={answers.period} onChange={(event) => setAnswers({ ...answers, period: event.target.value })}>
                    <option value="day">Daytime</option><option value="night">Nighttime</option>
                  </select>
                </label>
                <label className="field-label">Start around
                  <input type="time" value={answers.preferredTime} onChange={(event) => setAnswers({ ...answers, preferredTime: event.target.value })} />
                </label>
              </div>
              <label className="field-label frequency-label">How many days a week?
                <select value={answers.usesPerWeek} onChange={(event) => setAnswers({ ...answers, usesPerWeek: Number(event.target.value) })}>
                  {[1, 2, 3, 4, 5, 6, 7].map((days) => <option key={days} value={days}>{days} {days === 1 ? 'day' : 'days'}</option>)}
                </select>
              </label>
            </fieldset>

            {error && <p className="error-message" role="alert">{error}</p>}
            <button className="button button-dark full-width" type="submit" disabled={submitting || loading}>
              {submitting ? 'Finding a fit…' : 'Show my suggestion'} <span>→</span>
            </button>
          </form>
        )}

        {screen === 'products' && (
          <section className="flow-screen">
            <button type="button" className="back-link" onClick={goHome}>← <span>Home</span></button>
            <p className="eyebrow">YOUR STARTER CATALOG</p>
            <h1>Products to<br /><em>build with.</em></h1>
            <p className="intro">Keep your shelf in one place. Add expiry dates when you know them; blank dates stay labelled as missing.</p>
            <label className="field-label search-label">Search products
              <input type="search" placeholder="Name or brand" value={search} onChange={(event) => setSearch(event.target.value)} />
            </label>
            <h2 className="section-title">My products <span>{inventory.length}</span></h2>
            {inventory.length === 0 && <p className="small-note">Your shelf is empty. Add products from the catalog below.</p>}
            {inventory.map((product) => <article className="inventory-card" key={product.id}><div><strong>{product.name}</strong><span>{product.brand}</span><small>{product.expiryDate ? `Expires ${product.expiryDate}` : 'Missing expiry date'}</small></div><button className="text-button" onClick={() => removeProduct(product.id)}>Remove</button></article>)}
            <h2 className="section-title">Browse catalog <span>{products.filter((product) => `${product.name} ${product.brand}`.toLowerCase().includes(search.toLowerCase())).length}</span></h2>
            {loading ? <p className="small-note">Loading products…</p> : products.filter((product) => `${product.name} ${product.brand}`.toLowerCase().includes(search.toLowerCase())).map((product) => (
              <div className="catalog-add" key={product.id}>
                <ProductCard product={product} selected={false} onToggle={() => {}} />
                <label className="expiry-entry">Expiry date (optional)<input type="date" value={expiryDates[product.id] || ''} onChange={(event) => setExpiryDates((current) => ({ ...current, [product.id]: event.target.value }))} /></label>
                <button className="button button-light full-width" onClick={() => addProduct(product.id)}>{inventory.some((item) => item.id === product.id) ? 'Update my product' : 'Add to my products'} <span>＋</span></button>
              </div>
            ))}
            {error && <p className="error-message" role="alert">{error}</p>}
            <button className="button button-dark full-width" onClick={() => setScreen('questionnaire')}>Continue to questionnaire <span>→</span></button>
          </section>
        )}

        {screen === 'results' && suggestion && (
          <section className="flow-screen result-screen">
            <button type="button" className="back-link" onClick={() => setScreen('questionnaire')}>← <span>Edit answers</span></button>
            <p className="eyebrow">A SUGGESTED ROUTINE FOR YOU</p>
            <h1>A routine that<br /><em>fits your shelf.</em></h1>
            {suggestion.options.length === 0 ? (
              <div className="empty-match">
                <div className="empty-symbol">✳</div><h2>No close match yet</h2>
                <p>{suggestion.message}</p>
                <button className="button button-light full-width" onClick={() => setScreen('questionnaire')}>Adjust my choices</button>
              </div>
            ) : suggestion.options.map((option, index) => (
              <article className="routine-card" key={`${option.period}-${index}`}>
                <div className="routine-card-top"><span className="routine-label">{option.period === 'day' ? 'DAY ROUTINE' : 'NIGHT ROUTINE'}</span><span className="fit-score">{option.fitScore}% fit</span></div>
                <h2>{option.title}</h2>
                <p className="target-line">For {option.matchedConcerns.join(' and ')}</p>
                <div className="routine-meta"><span>◷ {formatTime(option.timeLabel)}</span><span>↻ {option.usesPerWeek}× / week</span></div>
                <div className="steps-heading">YOUR STEPS <span>{option.steps.length} products</span></div>
                <ol className="routine-steps">
                  {option.steps.map((step) => (
                    <li key={step.id}>
                      <span className="step-number">{step.order}</span>
                      <div><span className="category">{step.categoryLabel}</span><strong>{step.name}</strong><p>{step.purpose}</p>{step.usageNote && <small>{step.usageNote}</small>}</div>
                    </li>
                  ))}
                </ol>
                {option.excludedProducts?.length > 0 && <p className="caution-note">{option.excludedProducts.map((product) => product.name).join(', ')} isn’t included because its catalog guidance says to use it in a {option.excludedProducts[0].usagePeriod}time routine.</p>}
                {option.combinationStatus === 'not-assessed' && <p className="caution-note">Product combinations are not assessed yet. Check the product labels if you’re unsure.</p>}
                <div className="score-explainer"><span>WHY THIS FITS</span><p>{option.matchedConcerns.join(' · ') || 'No selected concerns matched'} matched in the product information. This score is a catalog match, not a clinical result.</p></div>
                {savedRoutineId === null
                  ? <button className="button button-dark full-width save-routine-button" onClick={persistRoutine} disabled={savingRoutine}>{savingRoutine ? 'Saving your routine…' : 'Save this routine'} <span>♡</span></button>
                  : <p className="saved-confirmation">✓ Saved to your routines on Home</p>}
              </article>
            ))}
            {error && <p className="error-message" role="alert">{error}</p>}
            <button className="button button-light full-width" onClick={() => setScreen('questionnaire')}>Adjust my answers</button>
          </section>
        )}
        {screen === 'routine-detail' && selectedRoutine && (
          <section className="flow-screen result-screen">
            <button type="button" className="back-link" onClick={goHome}>← <span>All routines</span></button>
            <p className="eyebrow">YOUR SAVED ROUTINE</p>
            <h1>{selectedRoutine.title}<br /><em>made for you.</em></h1>
            <p className="target-line">For {selectedRoutine.matchedConcerns.join(' and ') || 'your skincare goals'}</p>
            <div className="routine-meta"><span>◷ {formatTime(selectedRoutine.preferredTime)}</span><span>↻ {selectedRoutine.usesPerWeek}× / week</span></div>
            <article className="routine-card saved-detail-card">
              <div className="steps-heading">YOUR STEPS <span>{selectedRoutine.steps.length} products</span></div>
              <ol className="routine-steps">
                {selectedRoutine.steps.map((step) => <li key={`${step.order}-${step.id}`}>
                  <span className="step-number">{step.order}</span>
                  <div><span className="category">{step.categoryLabel}</span><strong>{step.name}</strong><p>{step.purpose}</p>{step.usageNote && <small>{step.usageNote}</small>}</div>
                </li>)}
              </ol>
            </article>
            <p className="small-note">Saved routine steps stay here even if you remove a product from your shelf.</p>
            {error && <p className="error-message" role="alert">{error}</p>}
          </section>
        )}
      </main>
      <nav className="bottom-nav" aria-label="Main navigation">
        <button className={screen === 'home' ? 'nav-item active' : 'nav-item'} onClick={goHome}><span>⌂</span><small>Home</small></button>
        <button className={screen === 'questionnaire' || screen === 'results' || screen === 'routine-detail' ? 'nav-item active' : 'nav-item'} onClick={() => setScreen(suggestion ? 'results' : 'questionnaire')}><span>✳</span><small>Routine</small></button>
        <button className={screen === 'products' ? 'nav-item active' : 'nav-item'} onClick={() => setScreen('products')}><span>▧</span><small>Products</small></button>
        <button className="nav-item" onClick={() => setScreen('questionnaire')}><span>◉</span><small>Profile</small></button>
      </nav>
      <footer className="app-footer">A thoughtful routine, one step at a time <span>✳</span></footer>
    </div>
  );
}

export default App;
