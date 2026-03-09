"use client";

import { DataTable } from "@/components/global/data-table/DataTable";
import useSWR from "swr";
import { fetcher } from "@/fetcher";
import DataTableSkeleton from "@/components/global/data-table/DataTableSkeleton";
import { useEffect } from "react";
import { sidebarBreadcrumbs } from "@/store/sidebar";
import { useSetAtom } from "jotai";
import { CircleQuestionMark, Plus } from "lucide-react";
import { createMasterDialogAtom } from "@/store/form-dialog";
import { Heading } from "@/components/global/heading/Heading";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { columns, Master } from "./columns";

export default function Page() {
  const { data, isLoading, error } = useSWR<Master[]>("/api/master", fetcher);
  const setCurrentBreadcrumbs = useSetAtom(sidebarBreadcrumbs);
  const setCreateDialog = useSetAtom(createMasterDialogAtom);

  useEffect(() => {
    setCurrentBreadcrumbs([
      { label: "Dashboard", href: "/master" },
      { label: "Users", href: "/master/users" },
      { label: "Masters", href: "/master/users/masters" },
    ]);
  });

  if (error) return <p>Error: {error}</p>;

  return (
    <>
      <div className="flex items-start justify-between">
        <Heading title={`Masters - ${data?.length || 0}`} description="Manage Master Details" />
        <Button onClick={() => setCreateDialog((prev) => !prev)} className="mb-4">
          <Plus className="mr-2 h-4 w-4" /> Add New Master
        </Button>
      </div>
      <Separator />
      {!isLoading && data ? (
        <DataTable
          data={data}
          columns={columns}
          search={{ column: "email", placeholder: "Search Master" }}
          noData={{
            icon: <CircleQuestionMark size={40} />,
            title: "No results found",
            description: "There are no masters matching your search criteria.",
          }}
        />
      ) : (
        <DataTableSkeleton />
      )}
    </>
  );
}
