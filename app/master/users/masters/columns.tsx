"use client";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import destroyMaster from "@/components/section/master/masters/deleteMasterAction";
import { KeyedMutator } from "swr";

export type Master = {
  id: string;
  user: { firstName: string; lastName: string; email: string };
};

export function getColumns(mutate: KeyedMutator<Master[]>): ColumnDef<Master>[] {
  return [
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
          if (!confirm(`Remove master access for ${master.user.firstName} ${master.user.lastName}? They will be demoted to a student account.`)) {
            return;
          }
          const result = await destroyMaster(master.id);
          if (result.error) {
            toast.error(result.error);
          } else {
            toast.success("Master access removed. User has been demoted to student.");
            mutate();
          }
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
                <Trash2 color="red" /> Remove Master Access
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
