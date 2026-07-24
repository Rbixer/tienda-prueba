"use client";
import { SecurityRedirect } from "@/components/SecurityRedirect";

export default function AppSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SecurityRedirect>{children}</SecurityRedirect>;
}
