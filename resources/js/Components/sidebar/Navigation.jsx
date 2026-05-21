import { usePage } from "@inertiajs/react";
import SidebarLink from "@/Components/sidebar/SidebarLink";
import Dropdown from "@/Components/sidebar/DropDown";
import { FileWarning, LayoutDashboard, Settings2 } from "lucide-react";

const ADMIN_LABELS = {
    hr:      "HR Action Items",
    hr_mngr: "HR Manager Items",
};

export default function NavLinks({ isSidebarOpen }) {
    const { emp_data, ir_admin_role, has_staff } = usePage().props;

    const irLinks = [
        { href: route("ir.index"),  label: "My IR" },
        ...(has_staff ? [{ href: route("ir.staff"), label: "Staff IR" }] : []),
        { href: route("ir.create"), label: "Create IR" },
    ];

    if (ir_admin_role) {
        // Insert before "Create IR" (always the last item)
        irLinks.splice(irLinks.length - 1, 0, {
            href:  route("ir.admin"),
            label: ADMIN_LABELS[ir_admin_role] ?? "Admin Items",
        });
    }

    const maintenanceLinks = ir_admin_role === "hr" ? [
        { href: route("ir.maintenance.admins"), label: "IR Admins" },
        { href: route("ir.maintenance.codes"),  label: "Code Numbers" },
    ] : null;

    return (
        <nav
            className="flex flex-col flex-grow space-y-1 overflow-y-auto"
            style={{ scrollbarWidth: "none" }}
        >
            <SidebarLink
                href={route("dashboard")}
                label="Dashboard"
                icon={<LayoutDashboard className="w-5 h-5" />}
                isSidebarOpen={isSidebarOpen}
            />
            <Dropdown
                label="Incident Report"
                icon={<FileWarning className="w-5 h-5" />}
                isSidebarOpen={isSidebarOpen}
                links={irLinks}
            />
            {maintenanceLinks && (
                <Dropdown
                    label="IR Maintenance"
                    icon={<Settings2 className="w-5 h-5" />}
                    isSidebarOpen={isSidebarOpen}
                    links={maintenanceLinks}
                />
            )}
        </nav>
    );
}
