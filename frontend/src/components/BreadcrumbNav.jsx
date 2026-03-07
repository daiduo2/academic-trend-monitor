export default function BreadcrumbNav({ path, onNavigate }) {
  if (!path || path.length === 0) return null;

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600">
      {path.map((item, index) => (
        <div key={item} className="flex items-center">
          {index > 0 && <span className="mx-2 text-gray-400">&gt;</span>}
          {index < path.length - 1 ? (
            <button
              onClick={() => onNavigate(index)}
              className="hover:text-blue-600 hover:underline transition-colors"
            >
              {item}
            </button>
          ) : (
            <span className="font-medium text-gray-900">{item}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
