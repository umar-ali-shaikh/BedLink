import React from 'react';
import { cn } from '../utils/cn';

/**
 * Admin/dispatcher table (DESIGN.md §5 Table): sticky header, row hover, small text,
 * right-aligned numbers. Below 768 px rows become stacked cards — no horizontal scroll.
 * columns: [{ key, header, render(row), align?: 'right'|'center', className?, hideOnMobile? }]
 */
export function ResponsiveTable({ columns, rows, rowKey = (r) => r.id, onRowClick, empty, className }) {
  if (!rows?.length) return empty ?? null;
  const alignCls = (a) => (a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left');

  return (
    <div className={className}>
      <table className="hidden md:table w-full text-small">
        <thead className="sticky top-0 bg-surface z-[1]">
          <tr className="border-b border-border">
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cn('px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-text-subtle', alignCls(c.align), c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={onRowClick ? (e) => e.key === 'Enter' && onRowClick(row) : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              className={cn('border-b border-border last:border-0 hover:bg-surface-muted transition-colors', onRowClick && 'cursor-pointer')}
            >
              {columns.map((c) => (
                <td key={c.key} className={cn('px-4 py-3 align-middle', alignCls(c.align), c.className)}>
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="md:hidden divide-y divide-border">
        {rows.map((row) => (
          <li key={rowKey(row)}>
            <div
              role={onRowClick ? 'button' : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn('px-4 py-3 grid grid-cols-2 gap-x-3 gap-y-1.5', onRowClick && 'active:bg-surface-muted')}
            >
              {columns
                .filter((c) => !c.hideOnMobile)
                .map((c, i) => (
                  <div key={c.key} className={cn('min-w-0 text-small', i === 0 && 'col-span-2')}>
                    {i > 0 && <span className="block text-[10px] font-semibold uppercase tracking-wider text-text-subtle">{c.header}</span>}
                    {c.render ? c.render(row) : row[c.key]}
                  </div>
                ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
