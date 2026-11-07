"use client";
import NextLink from "next/link";
import {
  usePathname,
  useRouter,
  useParams as nextParams,
} from "next/navigation";
import { useEffect, type AnchorHTMLAttributes } from "react";

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string };
export function Link({ to, ...props }: LinkProps) {
  return <NextLink href={to} {...props} />;
}
export function NavLink({
  to,
  end = false,
  className = "",
  ...props
}: LinkProps & { end?: boolean }) {
  const pathname = usePathname();
  const active = end
    ? pathname === to
    : pathname === to || pathname.startsWith(to + "/");
  return (
    <Link
      to={to}
      className={className + (active ? " active" : "")}
      aria-current={active ? "page" : undefined}
      {...props}
    />
  );
}
export function useNavigate() {
  const router = useRouter();
  return (to: string) => router.push(to);
}
export function Navigate({ to }: { to: string; replace?: boolean }) {
  const router = useRouter();
  useEffect(() => router.replace(to), [router, to]);
  return null;
}
export function useLocation() {
  return { pathname: usePathname() };
}
export function useParams() {
  return nextParams() as Record<string, string>;
}
