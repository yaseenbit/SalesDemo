import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

interface SidebarNavProps {
  isOpen: boolean;
}

const navGroups = [
  {
    id: 'workspace',
    label: 'Workspace',
    items: [
      { to: '/', label: 'Overview', end: true },
      { to: '/pos', label: 'POS Screen' },
      { to: '/table-demo', label: 'Table Demo' },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    items: [{ to: '/products', label: 'Products' }],
  },
  {
    id: 'sales',
    label: 'Sales',
    items: [
      { to: '/customers', label: 'Customer' },
      { to: '/orders', label: 'Sales Order' },
      { to: '/sales-invoices', label: 'Sales Invoice' },
      { to: '/cash-bills', label: 'Cash Bill' },
      { to: '/sales-returns', label: 'Sales Return' },
    ],
  },
];

const matchesRoute = (pathname: string, target: string, end?: boolean) =>
  end ? pathname === target : pathname === target || pathname.startsWith(`${target}/`);

export const SidebarNav = ({ isOpen }: SidebarNavProps) => {
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    workspace: true,
    inventory: true,
    sales: true,
  });

  const toggleGroup = (id: string) =>
    setExpandedGroups((prev) => ({ ...prev, [id]: !prev[id] }));

  const renderedGroups = navGroups.map((group) => {
    const isExpanded = expandedGroups[group.id];

    return (
      <div key={group.id} className="sidebar__group">
        <button
          className="sidebar__group-header"
          type="button"
          onClick={() => toggleGroup(group.id)}
          aria-expanded={isExpanded}
        >
          <span>{group.label}</span>
          <span className={`sidebar__chevron ${isExpanded ? 'sidebar__chevron--open' : ''}`}>›</span>
        </button>

        {isExpanded && (
          <div className="sidebar__group-links">
            {group.items.map((link) => {
              const active = matchesRoute(location.pathname, link.to, link.end);
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={`sidebar__link ${active ? 'sidebar__link--active' : ''}`}
                >
                  {link.label}
                </NavLink>
              );
            })}
          </div>
        )}
      </div>
    );
  });

  return (
    <aside className={`sidebar ${isOpen ? '' : 'sidebar--hidden'}`}>
      <nav className="sidebar__nav" aria-label="Main navigation">
        {renderedGroups}
      </nav>
    </aside>
  );
};
