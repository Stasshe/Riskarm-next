"use client";

import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

interface TableProps extends HTMLAttributes<HTMLTableElement> {
  className?: string;
}

interface TableHeaderProps extends HTMLAttributes<HTMLTableSectionElement> {
  className?: string;
}

interface TableBodyProps extends HTMLAttributes<HTMLTableSectionElement> {
  className?: string;
}

interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  className?: string;
}

interface TableHeaderCellProps extends ThHTMLAttributes<HTMLTableCellElement> {
  className?: string;
}

interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  className?: string;
}

const Table = ({ className = "", children, ...props }: TableProps) => {
  const combinedStyles = `min-w-full divide-y divide-dark-border ${className}`;
  return (
    <div className="overflow-x-auto rounded-md border border-dark-border shadow-md">
      <table className={combinedStyles} {...props}>
        {children}
      </table>
    </div>
  );
};

const TableHeader = ({ className = "", children, ...props }: TableHeaderProps) => {
  const combinedStyles = `bg-dark-card ${className}`;
  return (
    <thead className={combinedStyles} {...props}>
      {children}
    </thead>
  );
};

const TableBody = ({ className = "", children, ...props }: TableBodyProps) => {
  const combinedStyles = `bg-dark-bg divide-y divide-dark-border ${className}`;
  return (
    <tbody className={combinedStyles} {...props}>
      {children}
    </tbody>
  );
};

const TableRow = ({ className = "", children, ...props }: TableRowProps) => {
  const combinedStyles = `hover:bg-dark-border ${className}`;
  return (
    <tr className={combinedStyles} {...props}>
      {children}
    </tr>
  );
};

const TableHeaderCell = ({ className = "", children, ...props }: TableHeaderCellProps) => {
  const combinedStyles = `px-6 py-3 text-left text-xs font-medium text-medium-text uppercase tracking-wider ${className}`;
  return (
    <th scope="col" className={combinedStyles} {...props}>
      {children}
    </th>
  );
};

const TableCell = ({ className = "", children, ...props }: TableCellProps) => {
  const combinedStyles = `px-6 py-4 text-sm text-light-text ${className}`;
  return (
    <td className={combinedStyles} {...props}>
      {children}
    </td>
  );
};

export { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow };
