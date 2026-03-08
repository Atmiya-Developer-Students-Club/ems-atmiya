import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/global/sidebar/Sidebar";
import { masterSidebarLinks } from "@/components/section/master/sidebar/links";
import { Breadcrumb, BreadcrumbList } from "@/components/ui/breadcrumb";
import { BreadcrumbsItems } from "@/components/global/breadcrumbs/BreadcrumbsItems";
import FormDialogContainer from "@/components/global/form-dialog/FormDialogContainer";
import { ModeToggle } from "@/components/global/mode-toggle/ModelToggler";
import QuickActionToggle from "@/components/global/quick-action-toggle/QuickActionToggle";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar role="master" links={masterSidebarLinks} />
      <SidebarInset className="min-w-0 overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4 sticky p-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbsItems />
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <QuickActionToggle />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 min-w-0 overflow-hidden">{children}</div>
        <FormDialogContainer />
      </SidebarInset>
    </SidebarProvider>
  );
}
