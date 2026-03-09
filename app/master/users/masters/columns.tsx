"use client";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export type Master = {
  id: string;
  user: { firstName: string; lastName: string; email: string };
};

export const columns: ColumnDef<Master>[] = [
  {
    id: "firstName",
    accessorFn: (row) => row.user.firstName,
    header: "First Name",
  },
  {
    id: "lastName",
    accessorFn: (row) => row.user.lastName,
    header: "Last Name",
  },
  {
    id: "email",
    accessorFn: (row) => row.user.email,
    header: "Email",
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const master = row.original;
      async function handleDelete() {
        // TODO: Replace with actual deleteMaster action
        toast.success("Master deleted successfully");
      }
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => alert(`Edit master with ID: ${master.id}`)}>
              <Pencil /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-500" onClick={handleDelete}>
              <Trash2 color="red" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
