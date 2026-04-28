export default function BreadcrumbNav({ path, onNavigate }) {
  if (!path || path.length === 0) return null;

  return (
    <nav className="flex items-center space-x-2 text-sm text-slate-400">
      {path.map((item, index) => (
        <div key={item} className="flex items-center">
          {index > 0 && <span className="mx-2 text-slate-600">&gt;</span>}
          {index < path.length - 1 ? (
            <button
              onClick={() => onNavigate(index)}
              className="hover:text-sky-300 hover:underline transition-colors"
            >
              {item}
            </button>
          ) : (
            <span className="font-medium text-slate-100">{item}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
