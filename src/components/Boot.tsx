export function Boot() {
  return (
    <section id="boot" className="boot" aria-busy="true">
      <p className="muted" role="status">Loading your data…</p>
      <div className="skel-row">
        <i className="card skel" />
        <i className="card skel" />
        <i className="card skel" />
        <i className="card skel" />
      </div>
      <i className="card skel tall" />
    </section>
  );
}
