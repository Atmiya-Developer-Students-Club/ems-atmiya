"use client";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import * as React from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ChevronDown } from "lucide-react";

interface DataTableSearch {
  column: string;
  placeholder: string;
}

interface DataTableFilter {
  column: string;
  placeholder: string;
  options: { value: string; label: string }[];
}

interface DataTableNoData {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  search?: DataTableSearch;
  filter?: DataTableFilter | null;
  noData?: DataTableNoData;
  actions?: {
    onRowClick?: (row: TData) => void;
    onRowDoubleClick?: (row: TData) => void;
  };
}

export function DataTable<TData, TValue>({
  columns,
  data,
  search,
  filter,
  noData,
  actions,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  return (
    <div className="w-full min-w-0 overflow-hidden">
      <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
        {search && (
          <Input
            placeholder={search.placeholder}
            value={
              (table.getColumn(search.column)?.getFilterValue() as string) ?? ""
            }
            onChange={(event) =>
              table.getColumn(search.column)?.setFilterValue(event.target.value)
            }
            className="w-full sm:max-w-sm"
          />
        )}
        {filter && (
          <Select
            value={
              (table.getColumn(filter.column)?.getFilterValue() as string) ??
              filter.options[0]?.value ??
              "all"
            }
            onValueChange={(value) =>
              table
                .getColumn(filter.column)
                ?.setFilterValue(value === "all" ? "" : value)
            }
          >
            <SelectTrigger className="w-full sm:ml-4 sm:w-[180px]">
              <SelectValue placeholder={filter.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {filter.options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto sm:ml-auto">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ScrollArea className="h-[calc(80vh-220px)] rounded-lg border md:h-[calc(80dvh-200px)]">
        <Table className="relative">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>{headerGroup.headers.map((header) => (
                  <TableHead 
                    key={header.id}
                    className="whitespace-nowrap px-4 py-3 text-left"
                    style={{ 
                      width: header.getSize(),
                      minWidth: header.column.columnDef.minSize || header.getSize(),
                      maxWidth: header.column.columnDef.maxSize || 'auto'
                    }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={actions ? "cursor-pointer" : ""}
                  onClick={() =>
                    actions &&
                    actions.onRowClick &&
                    actions.onRowClick(row.original)
                  }
                  onDoubleClick={() =>
                    actions &&
                    actions.onRowDoubleClick &&
                    actions.onRowDoubleClick(row.original)
                  }
                >{row.getVisibleCells().map((cell) => (
                    <TableCell 
                      key={cell.id} 
                      className="px-4 py-3 whitespace-nowrap overflow-hidden text-ellipsis"
                      style={{ 
                        width: cell.column.getSize(),
                        minWidth: cell.column.columnDef.minSize || cell.column.getSize(),
                        maxWidth: cell.column.columnDef.maxSize || 'auto'
                      }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-full text-center"
                >
                  <div className="flex flex-col items-center justify-center space-y-2">
                    {noData?.icon}
                    <div className="text-lg font-medium">
                      {noData?.title ?? "No results found"}
                    </div>
                    {noData?.description && (
                      <div className="text-sm text-muted-foreground">
                        {noData.description}
                      </div>
                    )}
                    {noData?.action}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      <div className="flex flex-col-reverse gap-3 py-4 sm:flex-row sm:items-center sm:justify-end">
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
