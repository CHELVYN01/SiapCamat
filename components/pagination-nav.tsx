import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";

type Props = {
  page: number;
  totalPages: number;
  q: string;
  type: string;
};

function pageHref(page: number, q: string, type: string) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (type) params.set("type", type);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

function PageLink({
  disabled,
  href,
  children,
}: {
  disabled: boolean;
  href: string;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <Button variant="outline" size="sm" disabled>
        {children}
      </Button>
    );
  }
  return (
    <Link href={href} className={buttonVariants({ variant: "outline", size: "sm" })}>
      {children}
    </Link>
  );
}

export function PaginationNav({ page, totalPages, q, type }: Props) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Halaman {page} dari {totalPages}
      </p>
      <div className="flex gap-2">
        <PageLink disabled={page <= 1} href={pageHref(page - 1, q, type)}>
          Sebelumnya
        </PageLink>
        <PageLink disabled={page >= totalPages} href={pageHref(page + 1, q, type)}>
          Berikutnya
        </PageLink>
      </div>
    </div>
  );
}
