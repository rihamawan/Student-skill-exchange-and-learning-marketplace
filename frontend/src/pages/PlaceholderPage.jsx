export function PlaceholderPage({ title, description }) {
  return (
    <div className="card">
      <h1>{title}</h1>
      <p className="muted">{description || 'This screen will be implemented by your team.'}</p>
    </div>
  );
}
