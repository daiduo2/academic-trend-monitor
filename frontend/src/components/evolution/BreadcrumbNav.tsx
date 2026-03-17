import React from 'react';

interface BreadcrumbNavProps {
  path: string[];
}

export function BreadcrumbNav({ path }: BreadcrumbNavProps) {
  return (
    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200 text-sm">
      {path.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span className="text-gray-300">/</span>}
          <span className={index === path.length - 1 ? 'text-gray-900 font-medium' : 'text-gray-500'}>
            {item}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}
