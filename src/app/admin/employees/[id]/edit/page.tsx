import { getEmployee } from "@/actions/employees";
import { notFound } from "next/navigation";
import EditEmployeeForm from "./EditEmployeeForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEmployeePage({ params }: PageProps) {
  const { id } = await params;
  const employee = await getEmployee(id);

  if (!employee) {
    notFound();
  }

  return (
    <EditEmployeeForm
      employee={{
        id: employee.id,
        name: employee.name,
        role: employee.role,
        email: employee.email,
        avatarUrl: employee.avatarUrl,
        isAdmin: employee.isAdmin,
      }}
    />
  );
}
