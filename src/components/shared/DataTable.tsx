import type { ReactNode } from "react";

type DataTableProps = {
  headers: string[];
  children: ReactNode;
};

type TableCellProps = {
  children: ReactNode;
  className?: string;
};

type ActionCellProps = {
  children: ReactNode;
};

const BASE_CELL_CLASS = "px-4 py-3 border-b border-gray-100";

export function TableCell({ children, className = "" }: TableCellProps) {
  return <td className={`${BASE_CELL_CLASS} ${className}`.trim()}>{children}</td>;
}

export function ActionCell({ children }: ActionCellProps) {
  return <TableCell>{children}</TableCell>;
}

export function DataTable({ headers, children }: DataTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm text-left border-collapse">
        <thead>
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                className="px-4 py-3 bg-gray-50 font-semibold text-gray-700 border-b border-gray-200 text-xs uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
